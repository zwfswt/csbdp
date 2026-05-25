const { database } = require('../db')
const { bookmarks: seedBookmarks } = require('./platformData')

database.exec(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    zoom INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const countStatement = database.prepare('SELECT COUNT(*) AS count FROM bookmarks')

if (countStatement.get().count === 0) {
  const seedStatement = database.prepare(`
    INSERT INTO bookmarks (name, lat, lng, zoom, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  seedBookmarks.forEach((bookmark, index) => {
    seedStatement.run(bookmark.name, bookmark.lat, bookmark.lng, bookmark.zoom, '', index + 1)
  })
}

const listBookmarkStatement = database.prepare(`
  SELECT id, name, lat, lng, zoom, description, sort_order, created_at, updated_at
  FROM bookmarks
  ORDER BY sort_order ASC, id ASC
`)

const getBookmarkStatement = database.prepare(`
  SELECT id, name, lat, lng, zoom, description, sort_order, created_at, updated_at
  FROM bookmarks
  WHERE id = ?
`)

const createBookmarkStatement = database.prepare(`
  INSERT INTO bookmarks (name, lat, lng, zoom, description, sort_order)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const updateBookmarkStatement = database.prepare(`
  UPDATE bookmarks
  SET name = ?,
      lat = ?,
      lng = ?,
      zoom = ?,
      description = ?,
      sort_order = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const deleteBookmarkStatement = database.prepare('DELETE FROM bookmarks WHERE id = ?')

function parseNumber(value, fieldName) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName}必须为有效数字。`)
  }

  return parsed
}

function normalizeBookmarkPayload(payload) {
  const name = String(payload.name ?? '').trim()
  const description = String(payload.description ?? '').trim()
  const lat = parseNumber(payload.lat, '纬度')
  const lng = parseNumber(payload.lng, '经度')
  const zoom = Math.round(parseNumber(payload.zoom, '缩放级别'))
  const sortOrder = Math.round(parseNumber(payload.sortOrder ?? 0, '排序值'))

  if (!name) {
    throw new Error('书签名称不能为空。')
  }

  return {
    name,
    lat,
    lng,
    zoom,
    description,
    sortOrder,
  }
}

function mapBookmark(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    zoom: row.zoom,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function listBookmarks() {
  return listBookmarkStatement.all().map(mapBookmark)
}

function getBookmarkById(id) {
  return mapBookmark(getBookmarkStatement.get(id))
}

function createBookmark(payload) {
  const bookmark = normalizeBookmarkPayload(payload)
  const result = createBookmarkStatement.run(
    bookmark.name,
    bookmark.lat,
    bookmark.lng,
    bookmark.zoom,
    bookmark.description,
    bookmark.sortOrder,
  )

  return getBookmarkById(Number(result.lastInsertRowid))
}

function updateBookmark(id, payload) {
  const existing = getBookmarkById(id)

  if (!existing) {
    return null
  }

  const bookmark = normalizeBookmarkPayload(payload)
  updateBookmarkStatement.run(
    bookmark.name,
    bookmark.lat,
    bookmark.lng,
    bookmark.zoom,
    bookmark.description,
    bookmark.sortOrder,
    id,
  )

  return getBookmarkById(id)
}

function deleteBookmark(id) {
  const existing = getBookmarkById(id)

  if (!existing) {
    return false
  }

  deleteBookmarkStatement.run(id)
  return true
}

module.exports = {
  createBookmark,
  deleteBookmark,
  getBookmarkById,
  listBookmarks,
  updateBookmark,
}
