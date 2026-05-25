const fs = require('fs')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')
const { dataDir } = require('../config')

const dbPath = path.join(dataDir, 'csbdp.sqlite')

fs.mkdirSync(dataDir, { recursive: true })

const database = new DatabaseSync(dbPath)
database.exec('PRAGMA foreign_keys = ON')
database.exec('PRAGMA journal_mode = WAL')

function runInTransaction(work) {
  database.exec('BEGIN')

  try {
    const result = work()
    database.exec('COMMIT')
    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

module.exports = {
  database,
  dbPath,
  runInTransaction,
}
