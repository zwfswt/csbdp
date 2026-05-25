import shp from 'shpjs'

export type GeoJsonGeometry = {
  type: string
  coordinates?: unknown
}

export type GeoJsonFeature = {
  type: 'Feature'
  geometry: GeoJsonGeometry | null
  properties?: Record<string, unknown> | null
}

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
  fileName?: string
}

export type ParsedShapefileLayer = {
  name: string
  geojson: GeoJsonFeatureCollection
}

type ShpInputObject = {
  shp?: ArrayBuffer
  shx?: ArrayBuffer
  dbf?: ArrayBuffer
  prj?: ArrayBuffer
  cpg?: ArrayBuffer
}

type ShpParseResult =
  | GeoJsonFeatureCollection
  | (GeoJsonFeatureCollection & { fileName?: string })[]
  | Record<string, GeoJsonFeatureCollection>

function getExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').split('/').pop() || 'SHP 图层'
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  return Boolean(value && typeof value === 'object' && (value as GeoJsonFeatureCollection).type === 'FeatureCollection' && Array.isArray((value as GeoJsonFeatureCollection).features))
}

function normalizeParseResult(result: ShpParseResult, fallbackName: string): ParsedShapefileLayer[] {
  if (Array.isArray(result)) {
    return result.filter(isFeatureCollection).map((collection, index) => ({
      name: collection.fileName || `${fallbackName}${index > 0 ? ` ${index + 1}` : ''}`,
      geojson: collection,
    }))
  }

  if (isFeatureCollection(result)) {
    return [{ name: result.fileName || fallbackName, geojson: result }]
  }

  return Object.entries(result)
    .filter((entry): entry is [string, GeoJsonFeatureCollection] => isFeatureCollection(entry[1]))
    .map(([name, collection]) => ({
      name: collection.fileName || name || fallbackName,
      geojson: collection,
    }))
}

export function createUniqueShpLayerName(baseName: string, existingNames: Iterable<string>) {
  const normalizedBaseName = baseName.trim() || 'SHP 图层'
  const names = new Set(existingNames)

  if (!names.has(normalizedBaseName)) {
    return normalizedBaseName
  }

  let index = 2
  let nextName = `${normalizedBaseName} ${index}`

  while (names.has(nextName)) {
    index += 1
    nextName = `${normalizedBaseName} ${index}`
  }

  return nextName
}

export async function parseShapefileFiles(files: FileList | File[]): Promise<ParsedShapefileLayer[]> {
  const selectedFiles = Array.from(files)

  if (!selectedFiles.length) {
    throw new Error('请选择 SHP 文件或 zip 压缩包。')
  }

  const zipFiles = selectedFiles.filter((file) => getExtension(file) === 'zip')

  if (zipFiles.length === 1 && selectedFiles.length === 1) {
    const zipFile = zipFiles[0]
    const result = await shp(await zipFile.arrayBuffer()) as ShpParseResult
    const layers = normalizeParseResult(result, getBaseName(zipFile.name))

    if (!layers.length) {
      throw new Error('压缩包中未找到可用的 SHP 图层。')
    }

    return layers
  }

  if (zipFiles.length) {
    throw new Error('zip 压缩包请单独选择；多文件模式请选择 .shp/.shx/.dbf/.prj/.cpg。')
  }

  const input: ShpInputObject = {}
  let shpFile: File | null = null

  for (const file of selectedFiles) {
    const extension = getExtension(file)

    if (extension === 'shp') {
      shpFile = file
      input.shp = await file.arrayBuffer()
    } else if (extension === 'shx' || extension === 'dbf' || extension === 'prj' || extension === 'cpg') {
      input[extension] = await file.arrayBuffer()
    }
  }

  if (!input.shp || !shpFile) {
    throw new Error('多文件加载至少需要选择 .shp 文件。')
  }

  const result = await shp(input) as ShpParseResult
  const layers = normalizeParseResult(result, getBaseName(shpFile.name))

  if (!layers.length) {
    throw new Error('未解析到可显示的 SHP 要素。')
  }

  return layers
}
