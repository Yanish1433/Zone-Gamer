import { Router } from 'express'
import { GAMES, MIN_REDEEM, PAYMENT_METHODS, POINTS_PER_RS, TOPUP_PACKS } from '../config/games.js'
import { config } from '../config/index.js'
import { HttpError, requireAuth, str, toInt, wrap } from '../middleware/index.js'
import { GameProfile, Redeem, Topup, User } from '../models/index.js'
import { credit, debitWinnings } from '../services/wallet.js'
import { ownedUpload } from '../services/uploads.js'
import { accountState } from './auth.js'

const router = Router()
router.use(requireAuth)

// Sign up for a game with an in-game ID.
router.post(
  '/games/:gameId/signup',
  wrap(async (req, res) => {
    const game = GAMES[req.params.gameId]
    if (!game) throw new HttpError(404, 'Unknown game')
    const name = str(req.body.name, 40)
    const uid = str(req.body.uid, 20)
    if (name.length < 3) throw new HttpError(400, 'Gamer name must be at least 3 characters')
    if (!game.idPattern.test(uid)) throw new HttpError(400, `Enter a valid ${game.idLabel}`)
    if (await GameProfile.exists({ user: req.user._id, gameId: req.params.gameId })) throw new HttpError(409, 'You are already signed up')
    try {
      await GameProfile.create({ user: req.user._id, gameId: req.params.gameId, name, uid })
    } catch (e) {
      if (e.code === 11000) throw new HttpError(409, `That ${game.idLabel} is already used by another account`)
      throw e
    }
    res.status(201).json(await accountState(req.user))
  }),
)

// Top-up: the player pays to the QR, then sends the payment code and a screenshot. The server decides the
// price from the pack id. An admin checks the proof and approves (AUTO_APPROVE_TOPUPS skips that, dev only).
router.post(
  '/topups',
  wrap(async (req, res) => {
    const pack = TOPUP_PACKS.find((p) => p.id === req.body.packId)
    if (!pack) throw new HttpError(400, 'Unknown pack')
    if (!PAYMENT_METHODS.includes(req.body.method)) throw new HttpError(400, 'Unknown payment method')
    const reference = str(req.body.reference, 60)
    if (reference.length < 4) throw new HttpError(400, 'Enter the payment code from your transaction')
    const shot = await ownedUpload(req.body.screenshotId, req.user._id, 'topup')
    if (await Topup.exists({ screenshot: shot._id })) throw new HttpError(400, 'That screenshot was already used')
    if (await Topup.exists({ reference, status: { $ne: 'rejected' } }).collation({ locale: 'en', strength: 2 })) throw new HttpError(409, 'That payment code was already submitted')
    const gameId = GAMES[req.body.gameId] ? req.body.gameId : undefined
    const points = pack.points + pack.bonus
    const topup = await Topup.create({ user: req.user._id, gameId, packId: pack.id, points, price: pack.price, method: req.body.method, reference, screenshot: shot._id })
    if (config.autoApproveTopups) {
      await Topup.updateOne({ _id: topup._id }, { status: 'approved' })
      await credit(req.user._id, points, { type: 'topup', label: `Top-up · Rs ${pack.price}`, gameId, ref: topup._id })
    }
    res.status(201).json({ status: config.autoApproveTopups ? 'approved' : 'pending', credited: points, ...(await accountState(await User.findById(req.user._id))) })
  }),
)

router.get(
  '/topups',
  wrap(async (req, res) => {
    const list = await Topup.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean()
    res.json(list.map((t) => ({ id: String(t._id), points: t.points, price: t.price, method: t.method, status: t.status, at: t.createdAt.getTime() })))
  }),
)

// Redeem winnings. Points leave the balance immediately; an admin pays out (or rejects and refunds).
router.post(
  '/redeems',
  wrap(async (req, res) => {
    const points = toInt(req.body.amount)
    const method = req.body.method
    const account = str(req.body.account, 80)
    if (points === null || points < MIN_REDEEM) throw new HttpError(400, `Minimum redeem is ${MIN_REDEEM} points`)
    if (!PAYMENT_METHODS.includes(method)) throw new HttpError(400, 'Unknown payout method')
    if (account.length < 5) throw new HttpError(400, 'Enter your account / number for the payout')
    const redeem = await Redeem.create({ user: req.user._id, points, amount: points / POINTS_PER_RS, method, account })
    const user = await debitWinnings(req.user._id, points, { type: 'redeem', label: `Redeemed · ${method}`, ref: redeem._id })
    if (!user) {
      await Redeem.deleteOne({ _id: redeem._id })
      throw new HttpError(400, 'You can only redeem points you have won')
    }
    res.status(201).json(await accountState(user))
  }),
)

export default router
