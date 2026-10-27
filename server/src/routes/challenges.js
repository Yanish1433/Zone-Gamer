import { Router } from 'express'
import { GAMES, MIN_STAKE, PLATFORM_FEE } from '../config/games.js'
import { HttpError, parseId, requireAuth, str, toInt, wrap } from '../middleware/index.js'
import { Challenge, GameProfile } from '../models/index.js'
import { ownedUpload } from '../services/uploads.js'
import { credit, debit } from '../services/wallet.js'

const router = Router()
router.use(requireAuth)

export const payoutFor = (stake) => Math.round(stake * 2 * (1 - PLATFORM_FEE))

const RANKS = [
  [0, 'Rookie'],
  [5, 'Challenger'],
  [15, 'Veteran'],
  [40, 'Elite'],
  [100, 'Legend'],
]

// Rank and win rate come from the player's finished 1v1 matches.
async function recordOf(userId, gameId) {
  const done = await Challenge.find({ gameId, status: 'completed', $or: [{ creator: userId }, { opponent: userId }] }, 'winner').lean()
  const wins = done.filter((c) => String(c.winner) === String(userId)).length
  const rank = [...RANKS].reverse().find(([min]) => wins >= min)[1]
  return { rank, winRate: done.length ? Math.round((wins / done.length) * 100) : 0 }
}

const iAm = (c, userId) => (String(c.creator._id ?? c.creator) === String(userId) ? 'creator' : 'opponent')

// What a participant may see about a challenge (room details only once matched).
async function view(c, userId) {
  const me = iAm(c, userId)
  const otherUser = me === 'creator' ? c.opponent : c.creator
  const base = {
    id: String(c._id),
    gameId: c.gameId,
    stake: c.stake,
    teamSize: c.teamSize,
    mode: c.mode,
    status: c.status,
    me,
    myReport: c.reports[me],
    payout: c.payout,
    won: c.status === 'completed' ? String(c.winner) === String(userId) : undefined,
  }
  if (c.status === 'open') return { ...base, room: c.room, pass: c.pass }
  if (!otherUser) return base
  const [profile, record] = await Promise.all([
    GameProfile.findOne({ user: otherUser._id ?? otherUser, gameId: c.gameId }).lean(),
    recordOf(otherUser._id ?? otherUser, c.gameId),
  ])
  const name = profile?.name ?? otherUser.name ?? 'Player'
  return { ...base, room: c.room, pass: c.pass, opp: { name, sub: `${record.rank} · ${record.winRate}% win rate` } }
}

// Open challenges from other players in this game.
router.get(
  '/',
  wrap(async (req, res) => {
    const gameId = req.query.gameId
    if (!GAMES[gameId]) throw new HttpError(400, 'Unknown game')
    const open = await Challenge.find({ gameId, status: 'open', creator: { $ne: req.user._id } }).sort({ createdAt: -1 }).limit(50).lean()
    const out = await Promise.all(
      open.map(async (c) => {
        const [profile, record] = await Promise.all([GameProfile.findOne({ user: c.creator, gameId }).lean(), recordOf(c.creator, gameId)])
        return { id: String(c._id), name: profile?.name ?? 'Player', ...record, stake: c.stake, mode: `${c.teamSize}v${c.teamSize} · ${c.mode}` }
      }),
    )
    res.json(out)
  }),
)

// The user's current open or matched challenge in a game (to restore the screen after a reload).
router.get(
  '/active',
  wrap(async (req, res) => {
    const c = await Challenge.findOne({
      gameId: req.query.gameId,
      status: { $in: ['open', 'matched', 'disputed'] },
      $or: [{ creator: req.user._id }, { opponent: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate('creator opponent', 'name')
    res.json(c ? await view(c, req.user._id) : null)
  }),
)

router.get(
  '/:id',
  wrap(async (req, res) => {
    const c = await Challenge.findById(parseId(req.params.id)).populate('creator opponent', 'name')
    const mine = c && [c.creator?._id, c.opponent?._id].some((id) => String(id) === String(req.user._id))
    if (!mine) throw new HttpError(404, 'Not found')
    res.json(await view(c, req.user._id))
  }),
)

router.post(
  '/',
  wrap(async (req, res) => {
    const game = GAMES[req.body.gameId]
    if (!game) throw new HttpError(400, 'Unknown game')
    const gameId = req.body.gameId
    if (!(await GameProfile.exists({ user: req.user._id, gameId }))) throw new HttpError(403, `Sign up for ${game.name} first`)

    const stake = toInt(req.body.stake)
    if (stake === null || stake < MIN_STAKE) throw new HttpError(400, `Minimum stake is ${MIN_STAKE} points`)
    const teamSize = toInt(req.body.teamSize) ?? 1
    if (teamSize < 1 || teamSize > game.maxTeam) throw new HttpError(400, 'Invalid team size')

    let mode = game.customMode ? str(req.body.mode, 60) : game.modes[0]
    if (!mode) throw new HttpError(400, 'Enter a mode')
    if (game.matchTimes) {
      const t = toInt(req.body.matchTime)
      if (!game.matchTimes.includes(t)) throw new HttpError(400, 'Invalid match time')
      mode = `${mode} · ${t} min`
    }
    const room = str(req.body.room, 40)
    if (!room) throw new HttpError(400, 'Enter the room code')
    const pass = game.hasPassword ? str(req.body.pass, 40) : ''

    if (await Challenge.exists({ gameId, creator: req.user._id, status: 'open' })) throw new HttpError(409, 'You already have an open challenge')

    const paid = await debit(req.user._id, stake, { type: 'stake', label: `${teamSize}v${teamSize} stake (escrow) · ${mode}`, gameId })
    if (!paid) throw new HttpError(400, 'You do not have enough points')
    const c = await Challenge.create({ gameId, creator: req.user._id, stake, teamSize, mode, room, pass })
    await c.populate('creator opponent', 'name')
    res.status(201).json(await view(c, req.user._id))
  }),
)

// Cancel an open challenge and refund the escrowed stake.
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const c = await Challenge.findOneAndUpdate({ _id: parseId(req.params.id), creator: req.user._id, status: 'open' }, { status: 'cancelled' })
    if (!c) throw new HttpError(409, 'This challenge can no longer be cancelled')
    await credit(req.user._id, c.stake, { type: 'refund', label: '1v1 stake refunded', gameId: c.gameId, ref: c._id })
    res.json({ ok: true })
  }),
)

router.post(
  '/:id/accept',
  wrap(async (req, res) => {
    const c0 = await Challenge.findById(parseId(req.params.id))
    if (!c0 || c0.status !== 'open') throw new HttpError(409, 'This challenge is no longer open')
    if (String(c0.creator) === String(req.user._id)) throw new HttpError(400, 'You cannot accept your own challenge')
    if (!(await GameProfile.exists({ user: req.user._id, gameId: c0.gameId }))) throw new HttpError(403, 'Sign up for this game first')

    // Take the stake first, then claim the challenge; refund if someone else got there first.
    const paid = await debit(req.user._id, c0.stake, { type: 'stake', label: `1v1 stake · ${c0.mode}`, gameId: c0.gameId, ref: c0._id })
    if (!paid) throw new HttpError(400, 'Not enough points. Top up in the wallet.')
    const c = await Challenge.findOneAndUpdate({ _id: c0._id, status: 'open' }, { status: 'matched', opponent: req.user._id }, { new: true }).populate('creator opponent', 'name')
    if (!c) {
      await credit(req.user._id, c0.stake, { type: 'refund', label: '1v1 stake refunded', gameId: c0.gameId, ref: c0._id })
      throw new HttpError(409, 'Someone else just accepted this challenge')
    }
    res.json(await view(c, req.user._id))
  }),
)

// Each player reports the result. Matching reports settle the pot; conflicting ones go to an admin.
router.post(
  '/:id/report',
  wrap(async (req, res) => {
    if (typeof req.body.won !== 'boolean') throw new HttpError(400, 'Say whether you won or lost')
    const id = parseId(req.params.id)
    const shot = await ownedUpload(req.body.screenshotId, req.user._id, 'match')
    const c0 = await Challenge.findById(id)
    const mine = c0 && [c0.creator, c0.opponent].some((u) => String(u) === String(req.user._id))
    if (!mine) throw new HttpError(404, 'Not found')
    const me = iAm(c0, req.user._id)

    const c = await Challenge.findOneAndUpdate({ _id: id, status: 'matched', [`reports.${me}`]: null }, { [`reports.${me}`]: req.body.won ? 'won' : 'lost', [`shots.${me}`]: shot._id }, { new: true })
    if (!c) throw new HttpError(409, 'You already reported this match or it is closed')

    const { creator, opponent } = c.reports
    if (creator && opponent) {
      if (creator !== opponent) {
        const winner = creator === 'won' ? c.creator : c.opponent
        const payout = payoutFor(c.stake)
        const settled = await Challenge.findOneAndUpdate({ _id: id, status: 'matched' }, { status: 'completed', winner, payout })
        if (settled) await credit(winner, payout, { type: 'win', label: '1v1 win', gameId: c.gameId, ref: id }, true)
      } else {
        await Challenge.updateOne({ _id: id, status: 'matched' }, { status: 'disputed' })
      }
    }
    const fresh = await Challenge.findById(id).populate('creator opponent', 'name')
    res.json(await view(fresh, req.user._id))
  }),
)

export default router

// Used by the admin router to settle disputed matches.
export async function settleChallenge(id, outcome) {
  const c = await Challenge.findById(id)
  if (!c || !['matched', 'disputed'].includes(c.status)) throw new HttpError(409, 'Challenge is not in a state that can be resolved')
  if (outcome === 'refund') {
    const done = await Challenge.findOneAndUpdate({ _id: id, status: { $in: ['matched', 'disputed'] } }, { status: 'cancelled', resolvedByAdmin: true })
    if (!done) throw new HttpError(409, 'Already resolved')
    for (const u of [c.creator, c.opponent]) await credit(u, c.stake, { type: 'refund', label: '1v1 refunded by admin', gameId: c.gameId, ref: id })
    return
  }
  const winner = outcome === 'creator' ? c.creator : c.opponent
  const payout = payoutFor(c.stake)
  const done = await Challenge.findOneAndUpdate({ _id: id, status: { $in: ['matched', 'disputed'] } }, { status: 'completed', winner, payout, resolvedByAdmin: true })
  if (!done) throw new HttpError(409, 'Already resolved')
  await credit(winner, payout, { type: 'win', label: '1v1 win (admin ruling)', gameId: c.gameId, ref: id }, true)
}

