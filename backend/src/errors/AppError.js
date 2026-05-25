class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
  }
}

function badRequest(message) {
  return new AppError(message, 400, 'BAD_REQUEST')
}

function unauthorized(message) {
  return new AppError(message, 401, 'UNAUTHORIZED')
}

function forbidden(message) {
  return new AppError(message, 403, 'FORBIDDEN')
}

function notFound(message) {
  return new AppError(message, 404, 'NOT_FOUND')
}

module.exports = {
  AppError,
  badRequest,
  forbidden,
  notFound,
  unauthorized,
}
