const multer = require('multer')
const { AppError } = require('../errors/AppError')

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

function notFoundHandler(_req, res) {
  res.status(404).json({ message: '接口不存在。' })
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ message: `文件上传失败：${error.message}` })
    return
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ message: '请求 JSON 格式无效。' })
    return
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  if (error instanceof Error && error.message) {
    res.status(400).json({ message: error.message })
    return
  }

  res.status(500).json({ message: '服务器内部错误。' })
}

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
}
