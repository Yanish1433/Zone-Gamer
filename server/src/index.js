import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config/index.js'
import { errorHandler } from './middleware/index.js'
import { User } from './models/index.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import challengeRoutes from './routes/challenges.js'
import { adminRouter as adminPaymentRoutes, publicRouter as paymentRoutes } from './routes/payment.js'
import playerRoutes from './routes/player.js'
import tournamentRoutes from './routes/tournaments.js'

const app = express()
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

// The dashboard shows proof screenshots from blob: URLs, which helmet's default img-src would block.
app.use(
  helmet({
    contentSecurityPolicy: { directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'img-src': ["'self'", 'data:', 'blob:'] } },
  }),
)
app.use(cors({ origin: config.clientOrigin }))
app.use(express.json({ limit: '50kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }))
app.use('/api/auth', authRoutes)
app.use('/api/challenges', challengeRoutes)
app.use('/api/tournaments', tournamentRoutes)
app.use('/api/admin', adminPaymentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', paymentRoutes)
app.use('/api', playerRoutes)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

// Admin dashboard (static, talks to /api/admin).
app.use('/admin', express.static(path.join(publicDir, 'admin')))
app.use(errorHandler)

// Make sure the dashboard has an admin to log in with.
async function ensureAdmin() {
  if (!config.adminEmail || !config.adminPassword) return
  const existing = await User.findOne({ email: config.adminEmail })
  if (existing) {
    if (existing.role !== 'admin') await User.updateOne({ _id: existing._id }, { role: 'admin' })
    return
  }
  await User.create({ name: 'Admin', email: config.adminEmail, role: 'admin', passwordHash: await bcrypt.hash(config.adminPassword, 10) })
  console.log(`Created admin account ${config.adminEmail}`)
}

await mongoose.connect(config.mongoUri)
await mongoose.syncIndexes()
await ensureAdmin()
app.listen(config.port, () => {
  console.log(`API      http://localhost:${config.port}/api/health`)
  console.log(`Dashboard http://localhost:${config.port}/admin`)
})
