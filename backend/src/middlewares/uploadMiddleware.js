const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { badRequest } = require('../errors/AppError')
const { getUploadsDir } = require('../data/fieldSurveyStore')

const imageTypes = new Map([
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']],
  ['.gif', ['image/gif']],
  ['.webp', ['image/webp']],
])
const spreadsheetTypes = new Map([
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']],
  ['.xls', ['application/vnd.ms-excel', 'application/octet-stream']],
])

function sanitizeFileBaseName(originalname) {
  const extension = path.extname(originalname)
  return path.basename(originalname, extension).replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '-')
}

function validateAllowedFile(file, allowedTypes, label) {
  const extension = path.extname(file.originalname).toLowerCase()
  const mimeTypes = allowedTypes.get(extension)

  if (!mimeTypes || !mimeTypes.includes(file.mimetype)) {
    throw badRequest(`${label}格式不支持。`)
  }
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, getUploadsDir())
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${Date.now()}-${sanitizeFileBaseName(file.originalname)}${extension}`)
  },
})

const imageUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 15 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, callback) => {
    try {
      validateAllowedFile(file, imageTypes, '图片')
      callback(null, true)
    } catch (error) {
      callback(error)
    }
  },
})

const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    try {
      validateAllowedFile(file, spreadsheetTypes, 'Excel 文件')
      callback(null, true)
    } catch (error) {
      callback(error)
    }
  },
})

function hasValidImageSignature(filePath) {
  const buffer = fs.readFileSync(filePath)

  if (buffer.length < 12) {
    return false
  }

  const hex = buffer.subarray(0, 12).toString('hex')
  const ascii = buffer.subarray(0, 12).toString('ascii')

  return (
    hex.startsWith('ffd8ff') ||
    hex.startsWith('89504e470d0a1a0a') ||
    hex.startsWith('474946383761') ||
    hex.startsWith('474946383961') ||
    (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP')
  )
}

function validateUploadedImages(req, _res, next) {
  const files = req.files || []

  try {
    for (const file of files) {
      if (!hasValidImageSignature(file.path)) {
        throw badRequest('图片内容与文件格式不匹配。')
      }
    }

    next()
  } catch (error) {
    files.forEach((file) => {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })
    next(error)
  }
}

function hasValidSpreadsheetSignature(buffer, originalname) {
  const extension = path.extname(originalname).toLowerCase()

  if (extension === '.xlsx') {
    return buffer.subarray(0, 4).toString('hex') === '504b0304'
  }

  if (extension === '.xls') {
    return buffer.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1'
  }

  return false
}

function validateUploadedSpreadsheet(req, _res, next) {
  if (!req.file?.buffer) {
    next()
    return
  }

  if (!hasValidSpreadsheetSignature(req.file.buffer, req.file.originalname)) {
    next(badRequest('Excel 文件内容与格式不匹配。'))
    return
  }

  next()
}

module.exports = {
  imageUpload,
  spreadsheetUpload,
  validateUploadedImages,
  validateUploadedSpreadsheet,
}
