const { database } = require('../db')
const { layers: seedLayers } = require('./platformData')

const ARCGIS_LAYER_TYPE = 'ArcGIS Server MapServer'
const SYSTEM_LAYER_KEY_BY_NAME = new Map([
  ['研究区范围', 'study-area'],
  ['水深测点', 'depth-points'],
  ['无人船测深航线', 'survey-line'],
  ['野外考察', 'field-surveys'],
  ['监测位置', 'monitoring-points'],
  ['绘制图层', 'draw-layer'],
])

database.exec(`
  CREATE TABLE IF NOT EXISTS layers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    visible INTEGER NOT NULL DEFAULT 1,
    opacity REAL NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system INTEGER NOT NULL DEFAULT 0,
    is_arcgis_server INTEGER NOT NULL DEFAULT 0,
    url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const countStatement = database.prepare('SELECT COUNT(*) AS count FROM layers')
const listLayerStatement = database.prepare(`
  SELECT id, layer_key, name, type, visible, opacity, sort_order, is_system, is_arcgis_server, url, created_at, updated_at
  FROM layers
  ORDER BY sort_order ASC, id ASC
`)
const getLayerStatement = database.prepare(`
  SELECT id, layer_key, name, type, visible, opacity, sort_order, is_system, is_arcgis_server, url, created_at, updated_at
  FROM layers
  WHERE id = ?
`)
const getLayerByKeyStatement = database.prepare(`
  SELECT id
  FROM layers
  WHERE layer_key = ?
`)
const getLayerByNameStatement = database.prepare(`
  SELECT id
  FROM layers
  WHERE lower(trim(name)) = ?
`)
const createLayerStatement = database.prepare(`
  INSERT INTO layers (layer_key, name, type, visible, opacity, sort_order, is_system, is_arcgis_server, url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const updateLayerStatement = database.prepare(`
  UPDATE layers
  SET name = ?,
      visible = ?,
      opacity = ?,
      sort_order = ?,
      url = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)
const deleteLayerStatement = database.prepare('DELETE FROM layers WHERE id = ?')

function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hasLayerKey(key, excludeId = null) {
  const existing = getLayerByKeyStatement.get(key)

  if (!existing) {
    return false
  }

  if (excludeId === null) {
    return true
  }

  return existing.id !== excludeId
}

function createUniqueKey(name, excludeId = null, fallbackPrefix = 'arcgis-layer') {
  const baseKey = slugify(name) || fallbackPrefix
  let nextKey = baseKey
  let index = 2

  while (hasLayerKey(nextKey, excludeId)) {
    nextKey = `${baseKey}-${index}`
    index += 1
  }

  return nextKey
}

function normalizeLayerName(name) {
  return String(name ?? '').trim().toLowerCase()
}

function hasLayerName(name, excludeId = null) {
  const normalizedName = normalizeLayerName(name)

  if (!normalizedName) {
    return false
  }

  const existing = getLayerByNameStatement.all(normalizedName)

  if (!existing.length) {
    return false
  }

  if (excludeId === null) {
    return true
  }

  return existing.some((item) => item.id !== excludeId)
}

function parseBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false
    }
  }

  throw new Error(`${fieldName}必须为布尔值。`)
}

function parseNumber(value, fieldName) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName}必须为有效数字。`)
  }

  return parsed
}

function parseOpacity(value) {
  const opacity = parseNumber(value, '透明度')

  if (opacity < 0 || opacity > 1) {
    throw new Error('透明度必须在0到1之间。')
  }

  return opacity
}

function mapLayer(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    key: row.layer_key,
    name: row.name,
    type: row.type,
    visible: Boolean(row.visible),
    opacity: Number(row.opacity),
    sortOrder: row.sort_order,
    isSystem: Boolean(row.is_system),
    isArcGISServer: Boolean(row.is_arcgis_server),
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildSeedLayer(layer, index) {
  const key = SYSTEM_LAYER_KEY_BY_NAME.get(layer.name) ?? createUniqueKey(layer.name, null, `layer-${index + 1}`)

  return {
    key,
    name: layer.name,
    type: layer.type,
    visible: Boolean(layer.visible),
    opacity: Number(layer.opacity ?? 1),
    sortOrder: index + 1,
    isSystem: SYSTEM_LAYER_KEY_BY_NAME.has(layer.name),
    isArcGISServer: Boolean(layer.isArcGISServer),
    url: String(layer.url ?? ''),
  }
}

function ensureSeedLayers() {
  seedLayers.forEach((layer, index) => {
    const item = buildSeedLayer(layer, index)

    if (getLayerByKeyStatement.get(item.key)) {
      return
    }

    createLayerStatement.run(
      item.key,
      item.name,
      item.type,
      item.visible ? 1 : 0,
      item.opacity,
      item.sortOrder,
      item.isSystem ? 1 : 0,
      item.isArcGISServer ? 1 : 0,
      item.url,
    )
  })
}

function getDuplicatePriority(layer) {
  const expectedSystemKey = SYSTEM_LAYER_KEY_BY_NAME.get(layer.name)

  if (expectedSystemKey && layer.key === expectedSystemKey) {
    return 3
  }

  if (layer.isSystem) {
    return 2
  }

  if (layer.isArcGISServer) {
    return 1
  }

  return 0
}

function dedupeLayersByName() {
  const groups = new Map()

  listLayers().forEach((layer) => {
    const normalizedName = normalizeLayerName(layer.name)

    if (!normalizedName) {
      return
    }

    const items = groups.get(normalizedName) ?? []
    items.push(layer)
    groups.set(normalizedName, items)
  })

  groups.forEach((items) => {
    if (items.length < 2) {
      return
    }

    items.sort((left, right) => {
      const priorityDiff = getDuplicatePriority(right) - getDuplicatePriority(left)

      if (priorityDiff !== 0) {
        return priorityDiff
      }

      const sortOrderDiff = left.sortOrder - right.sortOrder

      if (sortOrderDiff !== 0) {
        return sortOrderDiff
      }

      return left.id - right.id
    })

    const [, ...duplicates] = items
    duplicates.forEach((item) => {
      deleteLayerStatement.run(item.id)
    })
  })
}

if (countStatement.get().count === 0) {
  ensureSeedLayers()
} else {
  ensureSeedLayers()
}

dedupeLayersByName()

function listLayers() {
  return listLayerStatement.all().map(mapLayer)
}

function getLayerById(id) {
  return mapLayer(getLayerStatement.get(id))
}

function normalizeExternalLayerPayload(payload, existing = null) {
  const name = String(payload.name ?? existing?.name ?? '').trim()
  const url = String(payload.url ?? existing?.url ?? '').trim()
  const visible = parseBoolean(payload.visible ?? existing?.visible ?? true, '默认显示')
  const opacity = parseOpacity(payload.opacity ?? existing?.opacity ?? 1)
  const sortOrder = Math.round(parseNumber(payload.sortOrder ?? existing?.sortOrder ?? 0, '排序值'))

  if (!name) {
    throw new Error('图层名称不能为空。')
  }

  if (!url) {
    throw new Error('ArcGIS 图层地址不能为空。')
  }

  return {
    name,
    type: ARCGIS_LAYER_TYPE,
    visible,
    opacity,
    sortOrder,
    isSystem: false,
    isArcGISServer: true,
    url,
  }
}

function normalizeSystemLayerPayload(payload, existing) {
  return {
    name: existing.name,
    type: existing.type,
    visible: parseBoolean(payload.visible ?? existing.visible, '默认显示'),
    opacity: parseOpacity(payload.opacity ?? existing.opacity),
    sortOrder: Math.round(parseNumber(payload.sortOrder ?? existing.sortOrder, '排序值')),
    isSystem: true,
    isArcGISServer: existing.isArcGISServer,
    url: existing.url,
  }
}

function createLayer(payload) {
  const layer = normalizeExternalLayerPayload(payload)

  if (hasLayerName(layer.name)) {
    throw new Error('图层名称已存在，请使用不同的名称。')
  }

  const layerKey = createUniqueKey(layer.name)
  const result = createLayerStatement.run(
    layerKey,
    layer.name,
    layer.type,
    layer.visible ? 1 : 0,
    layer.opacity,
    layer.sortOrder,
    0,
    1,
    layer.url,
  )

  return getLayerById(Number(result.lastInsertRowid))
}

function updateLayer(id, payload) {
  const existing = getLayerById(id)

  if (!existing) {
    return null
  }

  const layer = existing.isSystem ? normalizeSystemLayerPayload(payload, existing) : normalizeExternalLayerPayload(payload, existing)

  if (hasLayerName(layer.name, id)) {
    throw new Error('图层名称已存在，请使用不同的名称。')
  }

  updateLayerStatement.run(
    layer.name,
    layer.visible ? 1 : 0,
    layer.opacity,
    layer.sortOrder,
    layer.url,
    id,
  )

  return getLayerById(id)
}

function deleteLayer(id) {
  const existing = getLayerById(id)

  if (!existing) {
    return false
  }

  if (existing.isSystem) {
    throw new Error('系统内置图层不允许删除。')
  }

  deleteLayerStatement.run(id)
  return true
}

module.exports = {
  ARCGIS_LAYER_TYPE,
  createLayer,
  deleteLayer,
  getLayerById,
  listLayers,
  updateLayer,
}
