const fs = require('fs')
const path = require('path')
const { parseMonitoringWorkbookFromFile } = require('../src/data/monitoringPointImport')
const { replaceMonitoringPoints } = require('../src/data/monitoringPointStore')

function parseArguments(argv) {
  const options = {
    source: '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--source' || value === '-s') {
      options.source = argv[index + 1] ?? ''
      index += 1
    }
  }

  return options
}

function ensureFile(source) {
  if (!source) {
    throw new Error('请通过 --source 指定 Excel 文件路径。')
  }

  const resolved = path.resolve(source)

  if (!fs.existsSync(resolved)) {
    throw new Error(`文件不存在：${resolved}`)
  }

  return resolved
}

function main() {
  const options = parseArguments(process.argv.slice(2))
  const sourceFile = ensureFile(options.source)
  const items = parseMonitoringWorkbookFromFile(sourceFile)
  const imported = replaceMonitoringPoints(items, path.basename(sourceFile))

  console.log(
    JSON.stringify(
      {
        importedCount: imported.length,
        firstPoint: imported[0]?.pointName ?? null,
        sourceFile: path.basename(sourceFile),
      },
      null,
      2,
    ),
  )
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : '导入监测点失败。')
  process.exit(1)
}