const express = require('express')
const { depthData, studyArea } = require('../data/platformData')
const { createBookmark, deleteBookmark, getBookmarkById, listBookmarks, updateBookmark } = require('../data/bookmarkStore')
const { createLayer, deleteLayer, getLayerById, listLayers, updateLayer } = require('../data/layerStore')
const {
  createUser,
  getPublicUserById,
  listUsers,
  updateUser,
  updateUserPassword,
  updateUserStatus,
} = require('../data/userStore')
const {
  createFieldSurvey,
  deleteFieldSurvey,
  getFieldSurveyById,
  listFieldSurveys,
  updateFieldSurvey,
} = require('../data/fieldSurveyStore')
const {
  createDevLog,
  deleteDevLog,
  getDevLogById,
  listDevLogs,
  updateDevLog,
} = require('../data/devLogStore')
const {
  createMonitoringPoint,
  deleteMonitoringPoint,
  getMonitoringPointById,
  listMonitoringPoints,
  replaceMonitoringPoints,
  updateMonitoringPoint,
} = require('../data/monitoringPointStore')
const { parseMonitoringWorkbookFromBuffer } = require('../data/monitoringPointImport')
const { authCookieName } = require('../config')
const { notFound } = require('../errors/AppError')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware')
const { asyncHandler } = require('../middlewares/errorMiddleware')
const { getCookieOptions, loginRateLimit } = require('../middlewares/securityMiddleware')
const {
  imageUpload,
  spreadsheetUpload,
  validateUploadedImages,
  validateUploadedSpreadsheet,
} = require('../middlewares/uploadMiddleware')
const { login } = require('../services/authService')

const router = express.Router()

function serializeFieldSurvey(survey) {
  return {
    id: survey.id,
    serialNo: survey.serialNo,
    name: survey.name,
    surveyTime: survey.surveyTime,
    longitude: survey.longitude,
    latitude: survey.latitude,
    description: survey.description,
    images: survey.images,
    createdAt: survey.createdAt,
    updatedAt: survey.updatedAt,
  }
}

function serializeMonitoringPoint(point) {
  return {
    id: point.id,
    pointName: point.pointName,
    northing: point.northing,
    easting: point.easting,
    elevation: point.elevation,
    latitude: point.latitude,
    longitude: point.longitude,
    ellipsoidHeight: point.ellipsoidHeight,
    monitorDate: point.monitorDate,
    monitorTime: point.monitorTime,
    monitoredAt: point.monitoredAt,
    antennaHeight: point.antennaHeight,
    sourceFile: point.sourceFile,
    createdAt: point.createdAt,
    updatedAt: point.updatedAt,
  }
}

function requireFound(value, message) {
  if (!value) {
    throw notFound(message)
  }

  return value
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.post('/auth/login', loginRateLimit, asyncHandler(async (req, res) => {
  const result = await login(req.body?.username, req.body?.password)
  res.cookie(authCookieName, result.token, getCookieOptions())
  res.json(result)
}))

router.post('/auth/logout', requireAuth, (req, res) => {
  res.clearCookie(authCookieName, { path: '/' })
  res.status(204).send()
})

router.get('/auth/me', requireAuth, (req, res) => {
  const { csrfToken, ...user } = req.user
  res.json({ user })
})

router.get('/map/config', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.displayName,
      role: req.user.role,
      status: req.user.status,
    },
    studyArea,
    depthData,
    bookmarks: listBookmarks(),
    layers: listLayers(),
    monitoringPoints: listMonitoringPoints().map(serializeMonitoringPoint),
  })
})

router.get('/monitoring-points', requireAuth, (_req, res) => {
  res.json({ items: listMonitoringPoints().map(serializeMonitoringPoint) })
})

router.get('/field-surveys', requireAuth, (_req, res) => {
  res.json({ items: listFieldSurveys().map(serializeFieldSurvey) })
})

router.use('/admin', requireAuth, requireAdmin)

router.get('/admin/users', (_req, res) => {
  res.json({ items: listUsers() })
})

router.get('/admin/users/:id', (req, res) => {
  res.json(requireFound(getPublicUserById(Number(req.params.id)), '未找到该用户。'))
})

router.post('/admin/users', (req, res) => {
  res.status(201).json(createUser(req.body))
})

router.put('/admin/users/:id', (req, res) => {
  res.json(requireFound(updateUser(Number(req.params.id), req.body), '未找到该用户。'))
})

router.put('/admin/users/:id/password', (req, res) => {
  res.json(requireFound(updateUserPassword(Number(req.params.id), req.body?.password), '未找到该用户。'))
})

router.put('/admin/users/:id/status', (req, res) => {
  res.json(requireFound(updateUserStatus(Number(req.params.id), req.body?.status), '未找到该用户。'))
})

router.get('/admin/layers', (_req, res) => {
  res.json({ items: listLayers() })
})

router.get('/admin/layers/:id', (req, res) => {
  res.json(requireFound(getLayerById(Number(req.params.id)), '未找到该数据目录图层。'))
})

router.post('/admin/layers', (req, res) => {
  res.status(201).json(createLayer(req.body))
})

router.put('/admin/layers/:id', (req, res) => {
  res.json(requireFound(updateLayer(Number(req.params.id), req.body), '未找到该数据目录图层。'))
})

router.delete('/admin/layers/:id', (req, res) => {
  if (!deleteLayer(Number(req.params.id))) {
    throw notFound('未找到该数据目录图层。')
  }
  res.status(204).send()
})

router.get('/admin/bookmarks', (_req, res) => {
  res.json({ items: listBookmarks() })
})

router.get('/admin/bookmarks/:id', (req, res) => {
  res.json(requireFound(getBookmarkById(Number(req.params.id)), '未找到该书签。'))
})

router.post('/admin/bookmarks', (req, res) => {
  res.status(201).json(createBookmark(req.body))
})

router.put('/admin/bookmarks/:id', (req, res) => {
  res.json(requireFound(updateBookmark(Number(req.params.id), req.body), '未找到该书签。'))
})

router.delete('/admin/bookmarks/:id', (req, res) => {
  if (!deleteBookmark(Number(req.params.id))) {
    throw notFound('未找到该书签。')
  }
  res.status(204).send()
})

router.get('/admin/dev-logs', (_req, res) => {
  res.json({ items: listDevLogs() })
})

router.get('/admin/dev-logs/:id', (req, res) => {
  res.json(requireFound(getDevLogById(Number(req.params.id)), '未找到该开发日志。'))
})

router.post('/admin/dev-logs', (req, res) => {
  res.status(201).json(createDevLog(req.body))
})

router.put('/admin/dev-logs/:id', (req, res) => {
  res.json(requireFound(updateDevLog(Number(req.params.id), req.body), '未找到该开发日志。'))
})

router.delete('/admin/dev-logs/:id', (req, res) => {
  if (!deleteDevLog(Number(req.params.id))) {
    throw notFound('未找到该开发日志。')
  }
  res.status(204).send()
})

router.get('/admin/monitoring-points', (_req, res) => {
  res.json({ items: listMonitoringPoints().map(serializeMonitoringPoint) })
})

router.get('/admin/monitoring-points/:id', (req, res) => {
  res.json(serializeMonitoringPoint(requireFound(getMonitoringPointById(Number(req.params.id)), '未找到该监测点。')))
})

router.post('/admin/monitoring-points', (req, res) => {
  res.status(201).json(serializeMonitoringPoint(createMonitoringPoint(req.body)))
})

router.put('/admin/monitoring-points/:id', (req, res) => {
  res.json(serializeMonitoringPoint(requireFound(updateMonitoringPoint(Number(req.params.id), req.body), '未找到该监测点。')))
})

router.delete('/admin/monitoring-points/:id', (req, res) => {
  deleteMonitoringPoint(Number(req.params.id))
  res.status(204).send()
})

router.post(
  '/admin/monitoring-points/import',
  spreadsheetUpload.single('file'),
  validateUploadedSpreadsheet,
  (req, res) => {
    if (!req.file?.buffer) {
      res.status(400).json({ message: '请上传 Excel 文件。' })
      return
    }

    const items = parseMonitoringWorkbookFromBuffer(req.file.buffer, req.file.originalname)
    const imported = replaceMonitoringPoints(items, req.file.originalname)

    res.status(201).json({
      count: imported.length,
      items: imported.map(serializeMonitoringPoint),
    })
  },
)

router.get('/admin/field-surveys', (_req, res) => {
  res.json({ items: listFieldSurveys().map(serializeFieldSurvey) })
})

router.get('/admin/field-surveys/:id', (req, res) => {
  res.json(serializeFieldSurvey(requireFound(getFieldSurveyById(Number(req.params.id)), '未找到该野外考察记录。')))
})

router.post('/admin/field-surveys', imageUpload.array('images', 12), validateUploadedImages, (req, res) => {
  res.status(201).json(serializeFieldSurvey(createFieldSurvey(req.body, req.files ?? [])))
})

router.put('/admin/field-surveys/:id', imageUpload.array('images', 12), validateUploadedImages, (req, res) => {
  res.json(serializeFieldSurvey(requireFound(updateFieldSurvey(Number(req.params.id), req.body, req.body.retainedImageIds, req.files ?? []), '未找到该野外考察记录。')))
})

router.delete('/admin/field-surveys/:id', (req, res) => {
  if (!deleteFieldSurvey(Number(req.params.id))) {
    throw notFound('未找到该野外考察记录。')
  }
  res.status(204).send()
})

module.exports = router
