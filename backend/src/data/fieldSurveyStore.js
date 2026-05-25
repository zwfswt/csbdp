const fs = require('fs')
const path = require('path')
const { database, runInTransaction } = require('../db')
const { uploadsRoot } = require('../config')

const uploadsDir = path.join(uploadsRoot, 'field-surveys')

fs.mkdirSync(uploadsDir, { recursive: true })

database.exec(`
  CREATE TABLE IF NOT EXISTS field_surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_no TEXT NOT NULL,
    name TEXT NOT NULL,
    survey_time TEXT NOT NULL,
    longitude REAL NOT NULL,
    latitude REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS field_survey_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES field_surveys(id) ON DELETE CASCADE
  );
`)

const countStatement = database.prepare('SELECT COUNT(*) AS count FROM field_surveys')

if (countStatement.get().count === 0) {
  const seedSurvey = database.prepare(`
    INSERT INTO field_surveys (serial_no, name, survey_time, longitude, latitude, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  seedSurvey.run(
    'KF-001',
    '黄河口近岸无人机样点',
    '2026-05-01 10:30:00',
    119.1526,
    37.7348,
    '示例野外考察点。可在后台管理中心继续新增、修改或删除，并上传现场照片。',
  )
}

const listSurveyStatement = database.prepare(`
  SELECT id, serial_no, name, survey_time, longitude, latitude, description, created_at, updated_at
  FROM field_surveys
  ORDER BY datetime(survey_time) DESC, id DESC
`)

const getSurveyStatement = database.prepare(`
  SELECT id, serial_no, name, survey_time, longitude, latitude, description, created_at, updated_at
  FROM field_surveys
  WHERE id = ?
`)

const listImagesStatement = database.prepare(`
  SELECT id, survey_id, image_path, original_name, created_at
  FROM field_survey_images
  WHERE survey_id = ?
  ORDER BY id ASC
`)

const createSurveyStatement = database.prepare(`
  INSERT INTO field_surveys (serial_no, name, survey_time, longitude, latitude, description)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const updateSurveyStatement = database.prepare(`
  UPDATE field_surveys
  SET serial_no = ?,
      name = ?,
      survey_time = ?,
      longitude = ?,
      latitude = ?,
      description = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const deleteSurveyStatement = database.prepare('DELETE FROM field_surveys WHERE id = ?')
const insertImageStatement = database.prepare(`
  INSERT INTO field_survey_images (survey_id, image_path, original_name)
  VALUES (?, ?, ?)
`)
const deleteImagesBySurveyStatement = database.prepare('DELETE FROM field_survey_images WHERE survey_id = ?')
const deleteImagesExceptStatement = database.prepare(`
  DELETE FROM field_survey_images
  WHERE survey_id = ?
    AND id NOT IN (SELECT value FROM json_each(?))
`)
const listRemovedImagesStatement = database.prepare(`
  SELECT image_path FROM field_survey_images
  WHERE survey_id = ?
    AND id NOT IN (SELECT value FROM json_each(?))
`)
const listAllImagePathsStatement = database.prepare('SELECT image_path FROM field_survey_images WHERE survey_id = ?')

function toImageUrl(imagePath) {
  return `/uploads/field-surveys/${path.basename(imagePath)}`
}

function mapImages(surveyId) {
  return listImagesStatement.all(surveyId).map((image) => ({
    id: image.id,
    surveyId: image.survey_id,
    originalName: image.original_name,
    imagePath: image.image_path,
    url: toImageUrl(image.image_path),
    createdAt: image.created_at,
  }))
}

function mapSurvey(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    serialNo: row.serial_no,
    name: row.name,
    surveyTime: row.survey_time,
    longitude: row.longitude,
    latitude: row.latitude,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: mapImages(row.id),
  }
}

function parseNumber(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error('经纬度必须为有效数字。')
  }

  return parsed
}

function normalizeSurveyPayload(payload) {
  const serialNo = String(payload.serialNo ?? '').trim()
  const name = String(payload.name ?? '').trim()
  const surveyTime = String(payload.surveyTime ?? '').trim()
  const description = String(payload.description ?? '').trim()
  const longitude = parseNumber(payload.longitude)
  const latitude = parseNumber(payload.latitude)

  if (!serialNo || !name || !surveyTime) {
    throw new Error('序号、名称、时间不能为空。')
  }

  return {
    serialNo,
    name,
    surveyTime,
    longitude,
    latitude,
    description,
  }
}

function parseRetainedImageIds(value) {
  if (!value) {
    return []
  }

  const parsed = Array.isArray(value) ? value : JSON.parse(value)
  return parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
}

function removeImageFile(imagePath) {
  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath)
  }
}

function listFieldSurveys() {
  return listSurveyStatement.all().map(mapSurvey)
}

function getFieldSurveyById(id) {
  return mapSurvey(getSurveyStatement.get(id))
}

function createFieldSurvey(payload, files = []) {
  const survey = normalizeSurveyPayload(payload)
  const surveyId = runInTransaction(() => {
    const result = createSurveyStatement.run(
      survey.serialNo,
      survey.name,
      survey.surveyTime,
      survey.longitude,
      survey.latitude,
      survey.description,
    )

    for (const file of files) {
      insertImageStatement.run(result.lastInsertRowid, file.path, file.originalname)
    }

    return Number(result.lastInsertRowid)
  })

  return getFieldSurveyById(surveyId)
}

function updateFieldSurvey(id, payload, retainedImageIds, files = []) {
  const existing = getFieldSurveyById(id)

  if (!existing) {
    return null
  }

  const survey = normalizeSurveyPayload(payload)
  const retainedIds = parseRetainedImageIds(retainedImageIds)
  const removedImages = retainedIds.length
    ? listRemovedImagesStatement.all(id, JSON.stringify(retainedIds))
    : listAllImagePathsStatement.all(id)

  runInTransaction(() => {
    updateSurveyStatement.run(
      survey.serialNo,
      survey.name,
      survey.surveyTime,
      survey.longitude,
      survey.latitude,
      survey.description,
      id,
    )

    if (retainedIds.length) {
      deleteImagesExceptStatement.run(id, JSON.stringify(retainedIds))
    } else {
      deleteImagesBySurveyStatement.run(id)
    }

    for (const file of files) {
      insertImageStatement.run(id, file.path, file.originalname)
    }
  })

  removedImages.forEach((image) => removeImageFile(image.image_path))
  return getFieldSurveyById(id)
}

function deleteFieldSurvey(id) {
  const existing = getFieldSurveyById(id)

  if (!existing) {
    return false
  }

  const imagePaths = listAllImagePathsStatement.all(id)
  deleteSurveyStatement.run(id)
  imagePaths.forEach((image) => removeImageFile(image.image_path))
  return true
}

function getUploadsDir() {
  return uploadsDir
}

module.exports = {
  createFieldSurvey,
  deleteFieldSurvey,
  getFieldSurveyById,
  getUploadsDir,
  listFieldSurveys,
  updateFieldSurvey,
}
