import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { HttpError, parseId, requireAdmin, requireAuth, wrap } from '../middleware/index.js'
import { Settings, Upload, getPaymentSettings } from '../models/index.js'
import { imageBody, removeUpload, saveImage, sendUpload } from '../services/uploads.js'

// Player-facing: upload a proof screenshot, read how to pay, fetch the QR image.
export const publicRouter = Router()

const uploadLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false })

publicRouter.post(
  '/uploads',
  requireAuth,
  uploadLimit,
  imageBody,
  wrap(async (req, res) => {
    const purpose = req.query.purpose
    if (!['topup', 'match'].includes(purpose)) throw new HttpError(400, 'Unknown upload type')
    const up = await saveImage(req.body, req.user._id, purpose)
    res.status(201).json({ id: String(up._id) })
  }),
)

publicRouter.get(
  '/payment/info',
  requireAuth,
  wrap(async (_req, res) => {
    const s = await getPaymentSettings()
    res.json({ payeeName: s.payeeName, instructions: s.instructions, hasQr: Boolean(s.qr) })
  }),
)

// The QR is meant to be scanned by anyone, so it needs no login. Only the QR is exposed here.
publicRouter.get(
  '/payment/qr',
  wrap(async (_req, res) => {
    const s = await getPaymentSettings()
    const up = s.qr && (await Upload.findById(s.qr))
    if (!up) throw new HttpError(404, 'No QR set')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    sendUpload(res, up)
  }),
)

// Admin: view any proof image, edit payment settings, replace the QR.
export const adminRouter = Router()
adminRouter.use(requireAuth, requireAdmin)

adminRouter.get(
  '/uploads/:id',
  wrap(async (req, res) => {
    const up = await Upload.findById(parseId(req.params.id))
    if (!up) throw new HttpError(404, 'Not found')
    sendUpload(res, up)
  }),
)

adminRouter.get(
  '/settings',
  wrap(async (_req, res) => {
    const s = await getPaymentSettings()
    res.json({ payeeName: s.payeeName, instructions: s.instructions, hasQr: Boolean(s.qr) })
  }),
)

adminRouter.put(
  '/settings',
  wrap(async (req, res) => {
    const payeeName = typeof req.body.payeeName === 'string' ? req.body.payeeName.trim().slice(0, 80) : ''
    const instructions = typeof req.body.instructions === 'string' ? req.body.instructions.trim().slice(0, 500) : ''
    await getPaymentSettings()
    await Settings.updateOne({ key: 'payment' }, { payeeName, instructions })
    res.json({ ok: true })
  }),
)

adminRouter.post(
  '/settings/qr',
  imageBody,
  wrap(async (req, res) => {
    const up = await saveImage(req.body, req.user._id, 'qr')
    const old = await getPaymentSettings()
    await Settings.updateOne({ key: 'payment' }, { qr: up._id })
    if (old.qr) await removeUpload(await Upload.findById(old.qr))
    res.json({ ok: true })
  }),
)
