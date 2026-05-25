const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config')
const { getUserByUsername, touchUserLastLogin } = require('../data/userStore')
const { badRequest, unauthorized } = require('../errors/AppError')

function createToken(user, csrfToken = crypto.randomBytes(24).toString('hex')) {
  return {
    csrfToken,
    token: jwt.sign(
      {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        csrfToken,
      },
      jwtSecret,
      { expiresIn: '12h' },
    ),
  }
}

async function login(usernameValue, password) {
  const username = String(usernameValue ?? '').trim()

  if (!username || !password) {
    throw badRequest('用户名和密码不能为空。')
  }

  const user = getUserByUsername(username)

  if (!user || user.status !== 'active') {
    throw unauthorized('用户名或密码错误。')
  }

  const matched = await bcrypt.compare(password, user.passwordHash)

  if (!matched) {
    throw unauthorized('用户名或密码错误。')
  }

  const publicUser = touchUserLastLogin(user.id)
  return {
    ...createToken(publicUser),
    user: publicUser,
  }
}

module.exports = {
  createToken,
  login,
}
