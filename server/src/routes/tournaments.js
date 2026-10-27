import { Router } from 'express'
import { GAMES, TOURNAMENT_TEAM_SIZE } from '../config/games.js'
import { HttpError, parseId, requireAuth, str, wrap } from '../middleware/index.js'
import { GameProfile, Registration, Tournament, User } from '../models/index.js'
import { credit, debit } from '../services/wallet.js'
import { accountState } from './auth.js'

const router = Router()
router.use(requireAuth)

const startLabel = (d) =>
  d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })

export const publicTournament = (t, reg) => ({
  id: String(t._id),
  name: t.name,
  map: t.map,
  mode: t.mode,
  start: startLabel(t.startsAt),
  startsAt: t.startsAt,
  prize: t.prize,
  entry: t.entry,
  slots: t.slots,
  filled: t.filled,
  status: t.status,
  roomInfo: reg ? t.roomInfo : undefined,
})

router.get(
  '/',
  wrap(async (req, res) => {
    const game = GAMES[req.query.gameId]
    if (!game?.hasTournament) return res.json([])
    const list = await Tournament.find({ gameId: req.query.gameId, status: { $in: ['upcoming', 'live'] } }).sort({ startsAt: 1 }).lean()
    const regs = await Registration.find({ user: req.user._id, tournament: { $in: list.map((t) => t._id) } }, 'tournament').lean()
    const mine = new Set(regs.map((r) => String(r.tournament)))
    res.json(list.map((t) => publicTournament(t, mine.has(String(t._id)))))
  }),
)

router.post(
  '/:id/register',
  wrap(async (req, res) => {
    const t = await Tournament.findById(parseId(req.params.id))
    if (!t || t.status !== 'upcoming') throw new HttpError(409, 'Registration is closed for this tournament')
    const game = GAMES[t.gameId]
    const profile = await GameProfile.findOne({ user: req.user._id, gameId: t.gameId }).lean()
    if (!profile) throw new HttpError(403, `Sign up for ${game.name} first`)

    const teamName = str(req.body.team?.name, 40)
    if (teamName.length < 3) throw new HttpError(400, 'Team name must be at least 3 characters')
    const members = Array.isArray(req.body.team?.players) ? req.body.team.players.map((p) => str(String(p), 20)) : []
    // the captain is always the registering player; they supply the other squad members
    const others = members.filter((p) => p.toLowerCase() !== profile.uid.toLowerCase()).slice(0, TOURNAMENT_TEAM_SIZE - 1)
    if (others.length !== TOURNAMENT_TEAM_SIZE - 1 || others.some((p) => !game.idPattern.test(p))) throw new HttpError(400, `Enter ${TOURNAMENT_TEAM_SIZE - 1} valid ${game.idLabel}s`)
    const players = [profile.uid, ...others]
    if (new Set(players.map((p) => p.toLowerCase())).size !== players.length) throw new HttpError(400, 'Each teammate needs a different ID')
    if (await Registration.exists({ tournament: t._id, user: req.user._id })) throw new HttpError(409, 'You are already registered')

    // Reserve a slot, then take the fee; undo the slot if the payment fails.
    const slot = await Tournament.findOneAndUpdate({ _id: t._id, status: 'upcoming', $expr: { $lt: ['$filled', '$slots'] } }, { $inc: { filled: 1 } })
    if (!slot) throw new HttpError(409, 'This tournament is full')
    const release = () => Tournament.updateOne({ _id: t._id }, { $inc: { filled: -1 } })
    try {
      if (t.entry > 0) {
        const paid = await debit(req.user._id, t.entry, { type: 'entry', label: `Entry · ${t.name}`, gameId: t.gameId, ref: t._id })
        if (!paid) throw new HttpError(400, `You need ${t.entry} points. Top up in the wallet.`)
      }
      try {
        await Registration.create({ tournament: t._id, user: req.user._id, gameId: t.gameId, team: { name: teamName, players } })
      } catch (e) {
        if (t.entry > 0) await credit(req.user._id, t.entry, { type: 'refund', label: `Entry refunded · ${t.name}`, gameId: t.gameId, ref: t._id })
        throw e
      }
    } catch (e) {
      await release()
      throw e
    }
    res.status(201).json(await accountState(await User.findById(req.user._id)))
  }),
)

export default router
