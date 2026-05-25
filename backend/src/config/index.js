const crypto = require('crypto')
const path = require('path')

const isProduction = process.env.NODE_ENV === 'production'
const fallbackSecret = crypto.createHash('sha256').update(`${process.cwd()}-csbdp-dev-secret`).digest('hex')
const jwtSecret = process.env.JWT_SECRET || fallbackSecret

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('生产环境必须配置 JWT_SECRET。')
}

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const dataDir = path.resolve(__dirname, '..', '..', 'data')
const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads')

module.exports = {
  allowedOrigins,
  authCookieName: 'csbdp_session',
  csrfHeaderName: 'x-csrf-token',
  dataDir,
  isProduction,
  jwtSecret,
  port: Number(process.env.PORT || 3000),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '1mb',
  uploadsRoot,
}
