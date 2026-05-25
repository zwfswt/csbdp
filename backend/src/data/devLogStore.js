const { database } = require('../db')

database.exec(`
  CREATE TABLE IF NOT EXISTS dev_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    log_date TEXT NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const listDevLogsStatement = database.prepare(`
  SELECT id, title, log_date, content_html, content_text, created_at, updated_at
  FROM dev_logs
  ORDER BY date(log_date) DESC, id DESC
`)

const getDevLogStatement = database.prepare(`
  SELECT id, title, log_date, content_html, content_text, created_at, updated_at
  FROM dev_logs
  WHERE id = ?
`)

const createDevLogStatement = database.prepare(`
  INSERT INTO dev_logs (title, log_date, content_html, content_text)
  VALUES (?, ?, ?, ?)
`)

const updateDevLogStatement = database.prepare(`
  UPDATE dev_logs
  SET title = ?,
      log_date = ?,
      content_html = ?,
      content_text = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const deleteDevLogStatement = database.prepare('DELETE FROM dev_logs WHERE id = ?')

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeHtml(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*data:[\s\S]*?\2/gi, '')
}

function normalizeDevLogPayload(payload) {
  const title = String(payload.title ?? '').trim()
  const logDate = String(payload.logDate ?? '').trim()
  const contentHtml = sanitizeHtml(payload.contentHtml).trim()
  const contentText = stripHtml(contentHtml)

  if (!title) {
    throw new Error('日志标题不能为空。')
  }

  if (!logDate) {
    throw new Error('日志日期不能为空。')
  }

  if (!contentText) {
    throw new Error('日志内容不能为空。')
  }

  return {
    title,
    logDate,
    contentHtml,
    contentText,
  }
}

function mapDevLog(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    title: row.title,
    logDate: row.log_date,
    contentHtml: row.content_html,
    contentText: row.content_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function listDevLogs() {
  return listDevLogsStatement.all().map(mapDevLog)
}

function getDevLogById(id) {
  return mapDevLog(getDevLogStatement.get(id))
}

function createDevLog(payload) {
  const normalized = normalizeDevLogPayload(payload)
  const result = createDevLogStatement.run(
    normalized.title,
    normalized.logDate,
    normalized.contentHtml,
    normalized.contentText,
  )

  return getDevLogById(Number(result.lastInsertRowid))
}

function updateDevLog(id, payload) {
  const existing = getDevLogById(id)

  if (!existing) {
    return null
  }

  const normalized = normalizeDevLogPayload(payload)
  updateDevLogStatement.run(
    normalized.title,
    normalized.logDate,
    normalized.contentHtml,
    normalized.contentText,
    id,
  )

  return getDevLogById(id)
}

function deleteDevLog(id) {
  return deleteDevLogStatement.run(id).changes > 0
}

module.exports = {
  createDevLog,
  deleteDevLog,
  getDevLogById,
  listDevLogs,
  updateDevLog,
}
