import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zonegamer',
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','),
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  autoApproveTopups: process.env.AUTO_APPROVE_TOPUPS === 'true',
}

if (!config.jwtSecret) throw new Error('JWT_SECRET is not set (see .env.example)')
