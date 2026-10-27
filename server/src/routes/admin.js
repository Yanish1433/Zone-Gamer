import { Router } from 'express'
import { GAMES } from '../config/games.js'
import { HttpError, parseId, requireAdmin, requireAuth, str, toInt, wrap } from '../middleware/index.js'
import { Challenge, GameProfile, Redeem, Registration, Topup, Transaction, Tournament, User } from '../models/index.js'
import { credit } from '../services/wallet.js'
import { settleChallenge } from './challenges.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const page = (req) => ({ limit: Math.min(toInt(req.query.limit) || 25, 100), skip: Math.max(toInt(req.query.skip) || 0, 0) })
const statusFilter = (req, allowed) => (allowed.includes(req.query.status) ? { status: req.query.status } : {})
const id = (doc) => String(doc._id)

router.get(
  '/stats',
  wrap(async (_req, res) => {
    const [users, pendingTopups, pendingRedeems, disputed, openChallenges, upcoming, money, balances] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Topup.countDocuments({ status: 'pending' }),
      Redeem.countDocuments({ status: 'pending' }),
      Challenge.countDocuments({ status: 'disputed' }),
      Challenge.countDocuments({ status: { $in: ['open', 'matched'] } }),
      Tournament.countDocuments({ status: 'upcoming' }),
      Promise.all([
        Topup.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, rs: { $sum: '$price' } } }]),
        Redeem.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, rs: { $sum: '$amount' } } }]),
        Challenge.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, fee: { $sum: { $subtract: [{ $multiply: ['$stake', 2] }, '$payout'] } }, n: { $sum: 1 } } }]),
      ]),
      User.aggregate([{ $group: { _id: null, points: { $sum: '$points' }, winnings: { $sum: '$winnings' } } }]),
    ])
    const [topups, redeems, matches] = money
    const signups = await GameProfile.aggregate([{ $group: { _id: '$gameId', n: { $sum: 1 } } }])
    res.json({
      users,
      pendingTopups,
      pendingRedeems,
      disputed,
      openChallenges,
      upcomingTournaments: upcoming,
      revenue: topups[0]?.rs ?? 0,
      paidOut: redeems[0]?.rs ?? 0,
      matchFees: matches[0]?.fee ?? 0,
      matchesPlayed: matches[0]?.n ?? 0,
      pointsInCirculation: balances[0]?.points ?? 0,
      redeemableWinnings: balances[0]?.winnings ?? 0,
      signupsByGame: Object.fromEntries(signups.map((s) => [s._id, s.n])),
    })
  }),
)

// ---- users ----
router.get(
  '/users',
  wrap(async (req, res) => {
    const q = str(req.query.q, 60)
    const filter = q ? { $or: [{ email: new RegExp(esc(q), 'i') }, { name: new RegExp(esc(q), 'i') }] } : {}
    const { limit, skip } = page(req)
    const [rows, total] = await Promise.all([User.find(filter, '-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), User.countDocuments(filter)])
    const profiles = await GameProfile.find({ user: { $in: rows.map((u) => u._id) } }).lean()
    res.json({
      total,
      rows: rows.map((u) => ({
        id: id(u),
        name: u.name,
        email: u.email,
        role: u.role,
        banned: u.banned,
        points: u.points,
        winnings: u.winnings,
        createdAt: u.createdAt,
        games: profiles.filter((p) => String(p.user) === id(u)).map((p) => ({ gameId: p.gameId, name: p.name, uid: p.uid })),
      })),
    })
  }),
)

router.patch(
  '/users/:id',
  wrap(async (req, res) => {
    const uid = parseId(req.params.id)
    if (typeof req.body.banned !== 'boolean') throw new HttpError(400, 'Nothing to update')
    if (String(uid) === String(req.user._id)) throw new HttpError(400, 'You cannot suspend yourself')
    const user = await User.findByIdAndUpdate(uid, { banned: req.body.banned }, { new: true })
    if (!user) throw new HttpError(404, 'User not found')
    res.json({ ok: true })
  }),
)

// Manual correction: positive adds bought points, negative removes them (never below zero).
router.post(
  '/users/:id/adjust',
  wrap(async (req, res) => {
    const uid = parseId(req.params.id)
    const amount = toInt(req.body.amount)
    const reason = str(req.body.reason, 100)
    if (!amount) throw new HttpError(400, 'Enter a non-zero whole number')
    if (!reason) throw new HttpError(400, 'Give a reason')
    if (amount > 0) {
      if (!(await credit(uid, amount, { type: 'admin', label: `Admin: ${reason}` }))) throw new HttpError(404, 'User not found')
    } else {
      const user = await User.findOneAndUpdate({ _id: uid, points: { $gte: -amount } }, [{ $set: { points: { $add: ['$points', amount] }, winnings: { $min: ['$winnings', { $add: ['$points', amount] }] } } }], { new: true })
      if (!user) throw new HttpError(400, 'User has too few points')
      await Transaction.create({ user: uid, type: 'admin', delta: amount, label: `Admin: ${reason}` })
    }
    res.json({ ok: true })
  }),
)

// ---- top-ups ----
const withUser = (list, field = 'user') => User.populate(list, { path: field, select: 'name email' })

router.get(
  '/topups',
  wrap(async (req, res) => {
    const filter = statusFilter(req, ['pending', 'approved', 'rejected'])
    const { limit, skip } = page(req)
    const [rows, total] = await Promise.all([Topup.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Topup.countDocuments(filter)])
    await withUser(rows)
    res.json({ total, rows: rows.map((t) => ({ id: id(t), user: t.user, points: t.points, price: t.price, method: t.method, reference: t.reference, screenshot: t.screenshot && String(t.screenshot), gameId: t.gameId, status: t.status, note: t.note, createdAt: t.createdAt })) })
  }),
)

router.post(
  '/topups/:id/:action(approve|reject)',
  wrap(async (req, res) => {
    const approve = req.params.action === 'approve'
    const t = await Topup.findOneAndUpdate({ _id: parseId(req.params.id), status: 'pending' }, { status: approve ? 'approved' : 'rejected', note: str(req.body.note, 200) })
    if (!t) throw new HttpError(409, 'Already processed')
    if (approve) await credit(t.user, t.points, { type: 'topup', label: `Top-up · Rs ${t.price}`, gameId: t.gameId, ref: t._id })
    res.json({ ok: true })
  }),
)

// ---- redeems ----
router.get(
  '/redeems',
  wrap(async (req, res) => {
    const filter = statusFilter(req, ['pending', 'paid', 'rejected'])
    const { limit, skip } = page(req)
    const [rows, total] = await Promise.all([Redeem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Redeem.countDocuments(filter)])
    await withUser(rows)
    res.json({ total, rows: rows.map((r) => ({ id: id(r), user: r.user, points: r.points, amount: r.amount, method: r.method, account: r.account, status: r.status, note: r.note, createdAt: r.createdAt })) })
  }),
)

router.post(
  '/redeems/:id/:action(paid|reject)',
  wrap(async (req, res) => {
    const paid = req.params.action === 'paid'
    const r = await Redeem.findOneAndUpdate({ _id: parseId(req.params.id), status: 'pending' }, { status: paid ? 'paid' : 'rejected', note: str(req.body.note, 200) })
    if (!r) throw new HttpError(409, 'Already processed')
    // a rejected payout goes back as redeemable winnings
    if (!paid) await credit(r.user, r.points, { type: 'refund', label: 'Redeem rejected, points returned', ref: r._id }, true)
    res.json({ ok: true })
  }),
)

// ---- 1v1 challenges ----
router.get(
  '/challenges',
  wrap(async (req, res) => {
    const filter = statusFilter(req, ['open', 'matched', 'completed', 'disputed', 'cancelled'])
    const { limit, skip } = page(req)
    const [rows, total] = await Promise.all([Challenge.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Challenge.countDocuments(filter)])
    await User.populate(rows, [{ path: 'creator', select: 'name email' }, { path: 'opponent', select: 'name email' }])
    res.json({ total, rows: rows.map((c) => ({ id: id(c), gameId: c.gameId, creator: c.creator, opponent: c.opponent, stake: c.stake, mode: c.mode, room: c.room, status: c.status, reports: c.reports, shots: { creator: c.shots?.creator && String(c.shots.creator), opponent: c.shots?.opponent && String(c.shots.opponent) }, winner: c.winner && String(c.winner), payout: c.payout, createdAt: c.createdAt })) })
  }),
)

router.post(
  '/challenges/:id/resolve',
  wrap(async (req, res) => {
    if (!['creator', 'opponent', 'refund'].includes(req.body.outcome)) throw new HttpError(400, 'Choose creator, opponent or refund')
    await settleChallenge(parseId(req.params.id), req.body.outcome)
    res.json({ ok: true })
  }),
)

// ---- tournaments ----
function tournamentInput(body, partial = false) {
  const out = {}
  const need = (k) => !partial || body[k] !== undefined
  if (need('gameId')) {
    if (!GAMES[body.gameId]?.hasTournament) throw new HttpError(400, 'Choose a game that has tournaments')
    out.gameId = body.gameId
  }
  if (need('name')) {
    out.name = str(body.name, 60)
    if (!out.name) throw new HttpError(400, 'Enter a name')
  }
  if (body.map !== undefined) out.map = str(body.map, 40)
  if (body.mode !== undefined) out.mode = str(body.mode, 40)
  if (body.roomInfo !== undefined) out.roomInfo = str(body.roomInfo, 200)
  if (need('startsAt')) {
    const d = new Date(body.startsAt)
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Enter a valid start date')
    out.startsAt = d
  }
  for (const k of ['prize', 'entry', 'slots']) {
    if (!need(k)) continue
    const n = toInt(body[k])
    if (n === null || n < (k === 'slots' ? 1 : 0)) throw new HttpError(400, `Invalid ${k}`)
    out[k] = n
  }
  return out
}

router.get(
  '/tournaments',
  wrap(async (_req, res) => {
    const rows = await Tournament.find().sort({ startsAt: -1 }).limit(100).lean()
    res.json(rows.map((t) => ({ ...t, id: id(t) })))
  }),
)

router.post(
  '/tournaments',
  wrap(async (req, res) => {
    const t = await Tournament.create(tournamentInput(req.body))
    res.status(201).json({ id: id(t) })
  }),
)

router.patch(
  '/tournaments/:id',
  wrap(async (req, res) => {
    const patch = tournamentInput(req.body, true)
    if (req.body.status !== undefined) {
      if (!['upcoming', 'live', 'completed'].includes(req.body.status)) throw new HttpError(400, 'Use the cancel action to cancel')
      patch.status = req.body.status
    }
    const current = await Tournament.findById(parseId(req.params.id))
    if (!current) throw new HttpError(404, 'Not found')
    if (current.status === 'cancelled') throw new HttpError(409, 'Cancelled tournaments cannot be edited')
    if (patch.slots !== undefined && patch.slots < current.filled) throw new HttpError(400, 'Slots cannot be lower than registered squads')
    await Tournament.updateOne({ _id: current._id }, patch, { runValidators: true })
    res.json({ ok: true })
  }),
)

// Cancel and refund every entry fee (once each).
router.post(
  '/tournaments/:id/cancel',
  wrap(async (req, res) => {
    const t = await Tournament.findOneAndUpdate({ _id: parseId(req.params.id), status: { $in: ['upcoming', 'live'] } }, { status: 'cancelled' })
    if (!t) throw new HttpError(409, 'Tournament is already finished or cancelled')
    const regs = await Registration.find({ tournament: t._id, refunded: false })
    for (const r of regs) {
      const claimed = await Registration.findOneAndUpdate({ _id: r._id, refunded: false }, { refunded: true })
      if (claimed && t.entry > 0) await credit(r.user, t.entry, { type: 'refund', label: `Entry refunded · ${t.name}`, gameId: t.gameId, ref: t._id })
    }
    res.json({ ok: true, refunded: regs.length })
  }),
)

router.get(
  '/tournaments/:id/registrations',
  wrap(async (req, res) => {
    const rows = await Registration.find({ tournament: parseId(req.params.id) }).sort({ createdAt: 1 }).lean()
    await withUser(rows)
    res.json(rows.map((r) => ({ id: id(r), user: r.user, team: r.team, prizeAwarded: r.prizeAwarded, refunded: r.refunded, createdAt: r.createdAt })))
  }),
)

// Pay a winning squad's prize into the captain's redeemable winnings.
router.post(
  '/registrations/:id/prize',
  wrap(async (req, res) => {
    const amount = toInt(req.body.amount)
    if (!amount || amount < 1) throw new HttpError(400, 'Enter a prize amount')
    const reg = await Registration.findOneAndUpdate({ _id: parseId(req.params.id), prizeAwarded: 0, refunded: false }, { prizeAwarded: amount })
    if (!reg) throw new HttpError(409, 'Prize already awarded or entry refunded')
    const t = await Tournament.findById(reg.tournament)
    await credit(reg.user, amount, { type: 'prize', label: `Prize · ${t?.name ?? 'Tournament'}`, gameId: reg.gameId, ref: reg._id }, true)
    res.json({ ok: true })
  }),
)

// ---- transactions ----
router.get(
  '/transactions',
  wrap(async (req, res) => {
    const filter = mongooseUserFilter(req)
    const { limit, skip } = page(req)
    const [rows, total] = await Promise.all([Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Transaction.countDocuments(filter)])
    await withUser(rows)
    res.json({ total, rows: rows.map((t) => ({ id: id(t), user: t.user, type: t.type, delta: t.delta, label: t.label, gameId: t.gameId, createdAt: t.createdAt })) })
  }),
)

function mongooseUserFilter(req) {
  return req.query.type ? { type: str(req.query.type, 20) } : {}
}

export default router
