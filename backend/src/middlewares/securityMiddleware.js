const { allowedOrigins, csrfHeaderName, isProduction } = require('../config')

function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  next()
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  res.setHeader('Access-Control-Allow-Headers', `Content-Type, Authorization, ${csrfHeaderName}`)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).send()
    return
  }

  next()
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  }
}

const loginAttempts = new Map()

function loginRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const maxAttempts = 10
  const record = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs }

  if (record.resetAt <= now) {
    record.count = 0
    record.resetAt = now + windowMs
  }

  record.count += 1
  loginAttempts.set(key, record)

  if (record.count > maxAttempts) {
    res.status(429).json({ message: '登录尝试过于频繁，请稍后再试。' })
    return
  }

  next()
}

module.exports = {
  corsMiddleware,
  getCookieOptions,
  loginRateLimit,
  securityHeaders,
}
