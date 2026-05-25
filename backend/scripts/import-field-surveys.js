const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const exifr = require('exifr')
const { studyArea } = require('../src/data/platformData')
const { createFieldSurvey, getUploadsDir, listFieldSurveys } = require('../src/data/fieldSurveyStore')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'])
const IMPORT_SERIAL_PREFIX = 'KF'

function parseArguments(argv) {
  const options = {
    source: '',
    allowDuplicates: false,
    dryRun: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--source' || value === '-s') {
      options.source = argv[index + 1] ?? ''
      index += 1
      continue
    }

    if (value === '--allow-duplicates') {
      options.allowDuplicates = true
      continue
    }

    if (value === '--dry-run') {
      options.dryRun = true
    }
  }

  return options
}

function ensureSourceDirectory(sourceDir) {
  if (!sourceDir) {
    throw new Error('请通过 --source 指定待导入的根目录。')
  }

  const resolved = path.resolve(sourceDir)

  if (!fs.existsSync(resolved)) {
    throw new Error(`目录不存在：${resolved}`)
  }

  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`路径不是目录：${resolved}`)
  }

  return resolved
}

function formatDatePart(value) {
  return String(value).padStart(2, '0')
}

function toSurveyTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return `${date.getFullYear()}-${formatDatePart(date.getMonth() + 1)}-${formatDatePart(date.getDate())} ${formatDatePart(date.getHours())}:${formatDatePart(date.getMinutes())}:${formatDatePart(date.getSeconds())}`
}

function getStudyAreaCenter() {
  const totals = studyArea.reduce(
    (accumulator, [latitude, longitude]) => ({
      latitude: accumulator.latitude + latitude,
      longitude: accumulator.longitude + longitude,
    }),
    { latitude: 0, longitude: 0 },
  )

  return {
    latitude: totals.latitude / studyArea.length,
    longitude: totals.longitude / studyArea.length,
  }
}

function sanitizeBaseName(value) {
  return value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '-')
}

async function listRecordDirectories(sourceDir) {
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(sourceDir, entry.name)).sort((left, right) => left.localeCompare(right, 'zh-CN'))
}

async function listImages(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
}

async function copyImageToUploads(sourceFile, uploadsDir) {
  const extension = path.extname(sourceFile)
  const baseName = sanitizeBaseName(path.basename(sourceFile, extension))
  const targetPath = path.join(uploadsDir, `${Date.now()}-${baseName}${extension}`)
  await fsp.copyFile(sourceFile, targetPath)

  return {
    path: targetPath,
    originalname: path.basename(sourceFile),
  }
}

function getNextSerialNumber(existingSerials, offset) {
  const maxValue = existingSerials.reduce((currentMax, serialNo) => {
    const match = /^KF-(\d+)$/i.exec(serialNo)
    if (!match) {
      return currentMax
    }

    return Math.max(currentMax, Number(match[1]))
  }, 0)

  return `${IMPORT_SERIAL_PREFIX}-${String(maxValue + offset + 1).padStart(3, '0')}`
}

async function readFirstImageMetadata(imagePath) {
  try {
    const metadata = await exifr.parse(imagePath, { gps: true, tiff: true, exif: true })

    return {
      latitude: typeof metadata?.latitude === 'number' ? metadata.latitude : null,
      longitude: typeof metadata?.longitude === 'number' ? metadata.longitude : null,
      surveyTime: toSurveyTime(metadata?.DateTimeOriginal ?? metadata?.CreateDate ?? metadata?.ModifyDate),
    }
  } catch {
    return {
      latitude: null,
      longitude: null,
      surveyTime: null,
    }
  }
}

async function readFallbackTime(imagePath) {
  const stats = await fsp.stat(imagePath)
  return toSurveyTime(stats.birthtime) ?? toSurveyTime(stats.mtime) ?? toSurveyTime(new Date())
}

async function importRecord(options) {
  const { directory, serialNo, centerPoint, uploadsDir, dryRun } = options
  const name = path.basename(directory)
  const images = await listImages(directory)

  if (!images.length) {
    return {
      status: 'skipped',
      name,
      reason: '文件夹内没有可导入图片。',
    }
  }

  const [firstImage] = images
  const metadata = await readFirstImageMetadata(firstImage)
  const surveyTime = metadata.surveyTime ?? (await readFallbackTime(firstImage))
  const usedFallbackCoordinates = metadata.latitude == null || metadata.longitude == null
  const longitude = usedFallbackCoordinates ? centerPoint.longitude : metadata.longitude
  const latitude = usedFallbackCoordinates ? centerPoint.latitude : metadata.latitude

  if (dryRun) {
    return {
      status: 'dry-run',
      name,
      imageCount: images.length,
      usedFallbackCoordinates,
      serialNo,
      longitude,
      latitude,
      surveyTime,
    }
  }

  const copiedFiles = []

  try {
    for (const imagePath of images) {
      copiedFiles.push(await copyImageToUploads(imagePath, uploadsDir))
    }

    const survey = createFieldSurvey(
      {
        serialNo,
        name,
        surveyTime,
        longitude,
        latitude,
        description: `批量导入自目录：${name}`,
      },
      copiedFiles,
    )

    return {
      status: 'created',
      id: survey.id,
      name,
      serialNo,
      imageCount: copiedFiles.length,
      usedFallbackCoordinates,
    }
  } catch (error) {
    copiedFiles.forEach((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })

    return {
      status: 'failed',
      name,
      reason: error instanceof Error ? error.message : '未知错误',
    }
  }
}

async function main() {
  const { source, allowDuplicates, dryRun } = parseArguments(process.argv.slice(2))
  const sourceDir = ensureSourceDirectory(source)
  const uploadsDir = getUploadsDir()
  const centerPoint = getStudyAreaCenter()
  const directories = await listRecordDirectories(sourceDir)
  const existingSurveys = listFieldSurveys()
  const existingNames = new Set(existingSurveys.map((survey) => survey.name))
  const existingSerials = existingSurveys.map((survey) => survey.serialNo)

  if (!directories.length) {
    console.log('未找到可导入的一级子文件夹。')
    return
  }

  const results = []
  let createdCount = 0
  let skippedCount = 0
  let failedCount = 0
  let fallbackCoordinateCount = 0

  for (let index = 0; index < directories.length; index += 1) {
    const directory = directories[index]
    const name = path.basename(directory)

    if (!allowDuplicates && existingNames.has(name)) {
      results.push({ status: 'skipped', name, reason: '数据库中已存在同名记录。' })
      skippedCount += 1
      continue
    }

    const serialNo = getNextSerialNumber(existingSerials, createdCount)
    const result = await importRecord({
      directory,
      serialNo,
      centerPoint,
      uploadsDir,
      dryRun,
    })

    results.push(result)

    if (result.usedFallbackCoordinates) {
      fallbackCoordinateCount += 1
    }

    if (result.status === 'created' || result.status === 'dry-run') {
      createdCount += 1
      existingNames.add(name)
      existingSerials.push(serialNo)
      continue
    }

    if (result.status === 'skipped') {
      skippedCount += 1
      continue
    }

    failedCount += 1
  }

  console.log(JSON.stringify({
    sourceDir,
    dryRun,
    centerPoint,
    totalDirectories: directories.length,
    createdCount,
    skippedCount,
    failedCount,
    fallbackCoordinateCount,
    results,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})