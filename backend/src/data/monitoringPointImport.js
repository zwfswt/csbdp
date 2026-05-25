const path = require('path')
const XLSX = require('xlsx')

const HEADER_MAP = {
  pointName: '点名',
  northing: '北坐标',
  easting: '东坐标',
  elevation: '高程',
  latitude: '纬度',
  longitude: '经度',
  ellipsoidHeight: '椭球高',
  monitorDate: '日期',
  monitorTime: '时间',
  antennaHeight: '天线高',
}

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^[\s'"“”]+|[\s'"“”]+$/g, '')
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^[\s'"“”]+|[\s'"“”]+$/g, '')
    .trim()
}

function formatDateValue(value) {
  const text = String(value ?? '').trim()

  if (!text) {
    return ''
  }

  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split(/[/-]/)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return text
}

function formatTimeValue(value) {
  const text = String(value ?? '').trim()

  if (!text) {
    return ''
  }

  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (!match) {
    return text
  }

  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] ?? '00'}`
}

function getDefaultDate(sourceLabel = '') {
  const match = String(sourceLabel).match(/(20\d{2})(\d{2})(\d{2})/)

  if (!match) {
    return ''
  }

  return `${match[1]}-${match[2]}-${match[3]}`
}

function normalizeRow(row, defaultDate) {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  )

  const monitorDate = formatDateValue(normalizedRow[HEADER_MAP.monitorDate])
  const normalizedDate = monitorDate && !/^0{4}-/.test(monitorDate) ? monitorDate : defaultDate

  return {
    pointName: normalizeText(normalizedRow[HEADER_MAP.pointName]),
    northing: normalizedRow[HEADER_MAP.northing],
    easting: normalizedRow[HEADER_MAP.easting],
    elevation: normalizedRow[HEADER_MAP.elevation],
    latitude: normalizedRow[HEADER_MAP.latitude],
    longitude: normalizedRow[HEADER_MAP.longitude],
    ellipsoidHeight: normalizedRow[HEADER_MAP.ellipsoidHeight],
    monitorDate: normalizedDate,
    monitorTime: formatTimeValue(normalizedRow[HEADER_MAP.monitorTime]),
    antennaHeight: normalizedRow[HEADER_MAP.antennaHeight],
  }
}

function parseWorkbook(workbook, sourceLabel = '') {
  const [sheetName] = workbook.SheetNames

  if (!sheetName) {
    throw new Error('Excel 中未找到工作表。')
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  })

  if (!rows.length) {
    throw new Error('Excel 中没有可导入的数据行。')
  }

  const defaultDate = getDefaultDate(sourceLabel)

  return rows
    .map((row) => normalizeRow(row, defaultDate))
    .filter((item) => String(item.pointName ?? '').trim())
}

function parseMonitoringWorkbookFromFile(filePath) {
  const workbook = XLSX.readFile(filePath)
  return parseWorkbook(workbook, path.basename(filePath))
}

function parseMonitoringWorkbookFromBuffer(buffer, sourceLabel = '') {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  return parseWorkbook(workbook, sourceLabel)
}

module.exports = {
  parseMonitoringWorkbookFromFile,
  parseMonitoringWorkbookFromBuffer,
}