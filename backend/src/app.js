const express = require('express')
const path = require('path')
const apiRoutes = require('./routes')
const { requestBodyLimit, uploadsRoot } = require('./config')
const { runMigrations } = require('./db/migrate')
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware')
const { corsMiddleware, securityHeaders } = require('./middlewares/securityMiddleware')

const app = express()

runMigrations()

app.use(securityHeaders)
app.use(corsMiddleware)
app.use(express.json({ limit: requestBodyLimit }))
app.use('/uploads', express.static(path.resolve(uploadsRoot)))
app.use('/api', apiRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
