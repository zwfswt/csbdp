const { database } = require('./index')

const migrations = [
  {
    id: '001_base_indexes',
    run() {
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_layers_sort_order ON layers(sort_order);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_sort_order ON bookmarks(sort_order);
        CREATE INDEX IF NOT EXISTS idx_dev_logs_log_date ON dev_logs(log_date);
        CREATE INDEX IF NOT EXISTS idx_monitoring_points_monitored_at ON monitoring_points(monitored_at);
        CREATE INDEX IF NOT EXISTS idx_field_surveys_survey_time ON field_surveys(survey_time);
        CREATE INDEX IF NOT EXISTS idx_field_survey_images_survey_id ON field_survey_images(survey_id);
      `)
    },
  },
]

function ensureMigrationTable() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

function runMigrations() {
  ensureMigrationTable()
  const hasMigration = database.prepare('SELECT id FROM schema_migrations WHERE id = ?')
  const insertMigration = database.prepare('INSERT INTO schema_migrations (id) VALUES (?)')

  for (const migration of migrations) {
    if (hasMigration.get(migration.id)) {
      continue
    }

    migration.run()
    insertMigration.run(migration.id)
  }
}

if (require.main === module) {
  require('../data/userStore')
  require('../data/layerStore')
  require('../data/bookmarkStore')
  require('../data/devLogStore')
  require('../data/monitoringPointStore')
  require('../data/fieldSurveyStore')
  runMigrations()
  console.log('Database migrations applied.')
}

module.exports = {
  runMigrations,
}
