import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { config } from '../config/index.js'
import { User } from '../models/index.js'

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Wrap async handlers so rejections reach the error handler.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export const signToken = (user) => jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: '30d' })

export const requireAuth = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new HttpError(401, 'Please log in')
  let payload
  try {
    payload = jwt.verify(token, config.jwtSecret)
  } catch {
    throw new HttpError(401, 'Session expired, please log in again')
  }
  const user = await User.findById(payload.sub)
  if (!user) throw new HttpError(401, 'Account not found')
  if (user.banned) throw new HttpError(403, 'This account has been suspended')
  req.user = user
  next()
})

export const requireAdmin = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(new HttpError(403, 'Admins only'))

export const validId = (id) => mongoose.isValidObjectId(id)

export const parseId = (id) => {
  if (!validId(id)) throw new HttpError(404, 'Not found')
  return id
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.status) return res.status(err.status).json({ error: err.message })
  if (err.code === 11000) return res.status(409).json({ error: 'Already exists' })
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
}

// Positive whole number from untrusted input, or null.
export const toInt = (v) => {
  const n = Number(v)
  return Number.isSafeInteger(n) ? n : null
}

export const str = (v, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
