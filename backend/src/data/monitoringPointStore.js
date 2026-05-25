const { database, runInTransaction } = require('../db')

database.exec(`
  CREATE TABLE IF NOT EXISTS monitoring_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    point_name TEXT NOT NULL,
    northing REAL,
    easting REAL,
    elevation REAL NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    ellipsoid_height REAL,
    monitor_date TEXT NOT NULL,
    monitor_time TEXT NOT NULL,
    monitored_at TEXT NOT NULL,
    antenna_height REAL,
    source_file TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const listMonitoringPointsStatement = database.prepare(`
  SELECT id, point_name, northing, easting, elevation, latitude, longitude, ellipsoid_height, monitor_date, monitor_time, monitored_at, antenna_height, source_file, created_at, updated_at
  FROM monitoring_points
  ORDER BY datetime(monitored_at) DESC, id DESC
`)

const getMonitoringPointStatement = database.prepare(`
  SELECT id, point_name, northing, easting, elevation, latitude, longitude, ellipsoid_height, monitor_date, monitor_time, monitored_at, antenna_height, source_file, created_at, updated_at
  FROM monitoring_points
  WHERE id = ?
`)

const createMonitoringPointStatement = database.prepare(`
  INSERT INTO monitoring_points (
    point_name,
    northing,
    easting,
    elevation,
    latitude,
    longitude,
    ellipsoid_height,
    monitor_date,
    monitor_time,
    monitored_at,
    antenna_height,
    source_file
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const updateMonitoringPointStatement = database.prepare(`
  UPDATE monitoring_points
  SET point_name = ?,
      northing = ?,
      easting = ?,
      elevation = ?,
      latitude = ?,
      longitude = ?,
      ellipsoid_height = ?,
      monitor_date = ?,
      monitor_time = ?,
      monitored_at = ?,
      antenna_height = ?,
      source_file = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const deleteMonitoringPointStatement = database.prepare('DELETE FROM monitoring_points WHERE id = ?')
const clearMonitoringPointsStatement = database.prepare('DELETE FROM monitoring_points')

function parseNumber(value, fieldName, allowNull = false) {
  if (value == null || value === '') {
    if (allowNull) {
      return null
    }

    throw new Error(`${fieldName}不能为空。`)
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName}必须为有效数字。`)
  }

  return parsed
}

function normalizeDate(value) {
  const raw = String(value ?? '').trim()

  if (!raw) {
    throw new Error('监测日期不能为空。')
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const normalized = raw.replace(/\./g, '-').replace(/\//g, '-').replace(/^0{4}-/, '2022-')
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    throw new Error('监测日期格式无效。')
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normalizeTime(value) {
  const raw = String(value ?? '').trim()

  if (!raw) {
    throw new Error('监测时间不能为空。')
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (!match) {
    throw new Error('监测时间格式无效。')
  }

  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] ?? '00'}`
}

function normalizeMonitoringPointPayload(payload) {
  const pointName = String(payload.pointName ?? '').trim()
  const monitorDate = normalizeDate(payload.monitorDate)
  const monitorTime = normalizeTime(payload.monitorTime)
  const sourceFile = String(payload.sourceFile ?? '').trim()

  if (!pointName) {
    throw new Error('点位名称不能为空。')
  }

  return {
    pointName,
    northing: parseNumber(payload.northing, '北坐标', true),
    easting: parseNumber(payload.easting, '东坐标', true),
    elevation: parseNumber(payload.elevation, '地下水高程'),
    latitude: parseNumber(payload.latitude, '纬度'),
    longitude: parseNumber(payload.longitude, '经度'),
    ellipsoidHeight: parseNumber(payload.ellipsoidHeight, '椭球高', true),
    monitorDate,
    monitorTime,
    monitoredAt: `${monitorDate} ${monitorTime}`,
    antennaHeight: parseNumber(payload.antennaHeight, '天线高', true),
    sourceFile,
  }
}

function mapMonitoringPoint(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    pointName: row.point_name,
    northing: row.northing,
    easting: row.easting,
    elevation: row.elevation,
    latitude: row.latitude,
    longitude: row.longitude,
    ellipsoidHeight: row.ellipsoid_height,
    monitorDate: row.monitor_date,
    monitorTime: row.monitor_time,
    monitoredAt: row.monitored_at,
    antennaHeight: row.antenna_height,
    sourceFile: row.source_file,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function listMonitoringPoints() {
  return listMonitoringPointsStatement.all().map(mapMonitoringPoint)
}

function getMonitoringPointById(id) {
  return mapMonitoringPoint(getMonitoringPointStatement.get(id))
}

function createMonitoringPoint(payload) {
  const point = normalizeMonitoringPointPayload(payload)
  const result = createMonitoringPointStatement.run(
    point.pointName,
    point.northing,
    point.easting,
    point.elevation,
    point.latitude,
    point.longitude,
    point.ellipsoidHeight,
    point.monitorDate,
    point.monitorTime,
    point.monitoredAt,
    point.antennaHeight,
    point.sourceFile,
  )

  return getMonitoringPointById(Number(result.lastInsertRowid))
}

function updateMonitoringPoint(id, payload) {
  const existing = getMonitoringPointById(id)

  if (!existing) {
    return null
  }

  const point = normalizeMonitoringPointPayload({ ...existing, ...payload })

  updateMonitoringPointStatement.run(
    point.pointName,
    point.northing,
    point.easting,
    point.elevation,
    point.latitude,
    point.longitude,
    point.ellipsoidHeight,
    point.monitorDate,
    point.monitorTime,
    point.monitoredAt,
    point.antennaHeight,
    point.sourceFile,
    id,
  )

  return getMonitoringPointById(id)
}

function deleteMonitoringPoint(id) {
  deleteMonitoringPointStatement.run(id)
}

function replaceMonitoringPoints(items, sourceFile = '') {
  return runInTransaction(() => {
    clearMonitoringPointsStatement.run()

    items.forEach((item) => {
      const point = normalizeMonitoringPointPayload({ ...item, sourceFile })
      createMonitoringPointStatement.run(
        point.pointName,
        point.northing,
        point.easting,
        point.elevation,
        point.latitude,
        point.longitude,
        point.ellipsoidHeight,
        point.monitorDate,
        point.monitorTime,
        point.monitoredAt,
        point.antennaHeight,
        point.sourceFile,
      )
    })

    return listMonitoringPoints()
  })
}

module.exports = {
  listMonitoringPoints,
  getMonitoringPointById,
  createMonitoringPoint,
  updateMonitoringPoint,
  deleteMonitoringPoint,
  replaceMonitoringPoints,
}
