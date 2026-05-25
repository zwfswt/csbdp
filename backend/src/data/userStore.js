const bcrypt = require('bcryptjs')
const { database } = require('../db')
const { demoUser } = require('./platformData')

const USER_ROLES = ['admin', 'user']
const USER_STATUSES = ['active', 'disabled']

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const countStatement = database.prepare('SELECT COUNT(*) AS count FROM users')

if (countStatement.get().count === 0) {
  const seedStatement = database.prepare(`
    INSERT INTO users (username, display_name, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?)
  `)

  seedStatement.run(demoUser.username, demoUser.displayName, demoUser.passwordHash, 'admin', 'active')
}

const listUsersStatement = database.prepare(`
  SELECT id, username, display_name, role, status, last_login_at, created_at, updated_at
  FROM users
  ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END ASC, id ASC
`)

const getUserByIdStatement = database.prepare(`
  SELECT id, username, display_name, password_hash, role, status, last_login_at, created_at, updated_at
  FROM users
  WHERE id = ?
`)

const getUserByUsernameStatement = database.prepare(`
  SELECT id, username, display_name, password_hash, role, status, last_login_at, created_at, updated_at
  FROM users
  WHERE username = ?
`)

const createUserStatement = database.prepare(`
  INSERT INTO users (username, display_name, password_hash, role, status)
  VALUES (?, ?, ?, ?, ?)
`)

const updateUserStatement = database.prepare(`
  UPDATE users
  SET username = ?,
      display_name = ?,
      role = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const updateUserStatusStatement = database.prepare(`
  UPDATE users
  SET status = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const updateUserPasswordStatement = database.prepare(`
  UPDATE users
  SET password_hash = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const updateUserLastLoginStatement = database.prepare(`
  UPDATE users
  SET last_login_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const countActiveAdminsStatement = database.prepare(`
  SELECT COUNT(*) AS count
  FROM users
  WHERE role = 'admin' AND status = 'active'
`)

function mapUser(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPublicUser(user) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function normalizeRole(value, fallback = 'user') {
  const role = String(value ?? fallback).trim().toLowerCase()

  if (!USER_ROLES.includes(role)) {
    throw new Error('用户角色不合法。')
  }

  return role
}

function normalizeStatus(value, fallback = 'active') {
  const status = String(value ?? fallback).trim().toLowerCase()

  if (!USER_STATUSES.includes(status)) {
    throw new Error('用户状态不合法。')
  }

  return status
}

function normalizeUsername(value) {
  const username = String(value ?? '').trim()

  if (!username) {
    throw new Error('用户名不能为空。')
  }

  return username
}

function normalizeDisplayName(value, fallback) {
  const displayName = String(value ?? fallback ?? '').trim()

  if (!displayName) {
    throw new Error('显示名称不能为空。')
  }

  return displayName
}

function normalizePassword(value) {
  const password = String(value ?? '')

  if (password.length < 6) {
    throw new Error('密码长度不能少于6位。')
  }

  return password
}

function ensureUniqueUsername(username, excludeId = null) {
  const existing = mapUser(getUserByUsernameStatement.get(username))

  if (!existing) {
    return
  }

  if (excludeId !== null && existing.id === excludeId) {
    return
  }

  throw new Error('用户名已存在，请更换。')
}

function ensureNotRemovingLastActiveAdmin(existing, nextRole, nextStatus) {
  if (existing.role !== 'admin' || existing.status !== 'active') {
    return
  }

  if (nextRole === 'admin' && nextStatus === 'active') {
    return
  }

  if (countActiveAdminsStatement.get().count <= 1) {
    throw new Error('系统至少需要保留一个启用中的管理员账号。')
  }
}

function listUsers() {
  return listUsersStatement.all().map((row) => toPublicUser(mapUser(row)))
}

function getUserById(id) {
  return mapUser(getUserByIdStatement.get(id))
}

function getPublicUserById(id) {
  return toPublicUser(getUserById(id))
}

function getUserByUsername(username) {
  return mapUser(getUserByUsernameStatement.get(username))
}

function createUser(payload) {
  const username = normalizeUsername(payload.username)
  const displayName = normalizeDisplayName(payload.displayName, username)
  const password = normalizePassword(payload.password)
  const role = normalizeRole(payload.role)
  const status = normalizeStatus(payload.status)

  ensureUniqueUsername(username)

  const result = createUserStatement.run(
    username,
    displayName,
    bcrypt.hashSync(password, 10),
    role,
    status,
  )

  return getPublicUserById(Number(result.lastInsertRowid))
}

function updateUser(id, payload) {
  const existing = getUserById(id)

  if (!existing) {
    return null
  }

  const username = normalizeUsername(payload.username ?? existing.username)
  const displayName = normalizeDisplayName(payload.displayName ?? existing.displayName, username)
  const role = normalizeRole(payload.role ?? existing.role, existing.role)

  ensureUniqueUsername(username, id)
  ensureNotRemovingLastActiveAdmin(existing, role, existing.status)

  updateUserStatement.run(username, displayName, role, id)
  return getPublicUserById(id)
}

function updateUserPassword(id, password) {
  const existing = getUserById(id)

  if (!existing) {
    return null
  }

  const normalizedPassword = normalizePassword(password)
  updateUserPasswordStatement.run(bcrypt.hashSync(normalizedPassword, 10), id)
  return getPublicUserById(id)
}

function updateUserStatus(id, status) {
  const existing = getUserById(id)

  if (!existing) {
    return null
  }

  const normalizedStatus = normalizeStatus(status, existing.status)
  ensureNotRemovingLastActiveAdmin(existing, existing.role, normalizedStatus)
  updateUserStatusStatement.run(normalizedStatus, id)
  return getPublicUserById(id)
}

function touchUserLastLogin(id) {
  updateUserLastLoginStatement.run(id)
  return getPublicUserById(id)
}

module.exports = {
  createUser,
  getPublicUserById,
  getUserById,
  getUserByUsername,
  listUsers,
  touchUserLastLogin,
  toPublicUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
}
