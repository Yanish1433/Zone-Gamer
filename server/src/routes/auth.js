import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { GameProfile, Registration, Transaction, User } from '../models/index.js'
import { HttpError, requireAuth, signToken, str, wrap } from '../middleware/index.js'

const router = Router()

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Everything the frontend keeps in its store for the signed-in account.
export async function accountState(user) {
  const [profiles, history, regs] = await Promise.all([
    GameProfile.find({ user: user._id }).lean(),
    Transaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(60).lean(),
    Registration.find({ user: user._id }).lean(),
  ])
  return {
    user: { email: user.email, name: user.name, role: user.role },
    points: user.points,
    winnings: user.winnings,
    players: Object.fromEntries(profiles.map((p) => [p.gameId, { name: p.name, uid: p.uid, joinedAt: p.createdAt.getTime() }])),
    history: history.map((h) => ({ id: String(h._id), at: h.createdAt.getTime(), gameId: h.gameId, label: h.label, delta: h.delta })),
    registrations: regs.map((r) => ({ gameId: r.gameId, tournamentId: String(r.tournament), team: r.team, at: r.createdAt.getTime() })),
  }
}

router.post(
  '/register',
  limiter,
  wrap(async (req, res) => {
    const name = str(req.body.name, 50)
    const email = str(req.body.email, 120).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (name.length < 2) throw new HttpError(400, 'Enter your name')
    if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email')
    if (password.length < 6 || password.length > 100) throw new HttpError(400, 'Password must be 6–100 characters')
    if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists')
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) })
    res.status(201).json({ token: signToken(user), ...(await accountState(user)) })
  }),
)

router.post(
  '/login',
  limiter,
  wrap(async (req, res) => {
    const email = str(req.body.email, 120).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    const user = await User.findOne({ email })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Wrong email or password')
    if (user.banned) throw new HttpError(403, 'This account has been suspended')
    res.json({ token: signToken(user), ...(await accountState(user)) })
  }),
)

router.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => res.json(await accountState(req.user))),
)

export default router
