const jwt = require('jsonwebtoken')
const { authCookieName, csrfHeaderName, jwtSecret } = require('../config')
const { getPublicUserById } = require('../data/userStore')

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const [rawKey, ...rest] = part.trim().split('=')

    if (!rawKey) {
      return cookies
    }

    cookies[rawKey] = decodeURIComponent(rest.join('=') || '')
    return cookies
  }, {})
}

function getRequestToken(req) {
  const cookies = parseCookies(req.headers.cookie)
  const cookieToken = cookies[authCookieName]

  if (cookieToken) {
    return cookieToken
  }

  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return null
}

function requireAuth(req, res, next) {
  const token = getRequestToken(req)

  if (!token) {
    res.status(401).json({ message: '未提供有效的身份令牌。' })
    return
  }

  try {
    const payload = jwt.verify(token, jwtSecret)
    const user = getPublicUserById(payload.id)

    if (!user || user.status !== 'active') {
      res.status(401).json({ message: '当前账号不可用，请重新登录。' })
      return
    }

    req.user = {
      ...user,
      csrfToken: payload.csrfToken,
    }

    if (unsafeMethods.has(req.method)) {
      const requestToken = String(req.headers[csrfHeaderName] || '')

      if (!requestToken || requestToken !== payload.csrfToken) {
        res.status(403).json({ message: 'CSRF 校验失败，请刷新页面后重试。' })
        return
      }
    }

    next()
  } catch {
    res.status(401).json({ message: '身份令牌已失效，请重新登录。' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: '当前账号无后台权限。' })
    return
  }

  next()
}

module.exports = {
  requireAdmin,
  requireAuth,
}
