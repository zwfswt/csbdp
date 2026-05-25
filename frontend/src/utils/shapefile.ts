import shp from 'shpjs'
import proj4 from 'proj4'

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

type GeoJsonPosition = [number, number, ...number[]]

type CoordinateTransform = {
  name: string
  transform: (position: GeoJsonPosition) => GeoJsonPosition | null
}

const WGS84 = 'EPSG:4326'
const WEB_MERCATOR_MAX = 20037508.342789244
const PROJECTION_DEFS: Record<string, string> = {
  'AUTO:CGCS2000_GK_3_120': '+proj=tmerc +lat_0=0 +lon_0=120 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
  'AUTO:CGCS2000_GK_3_120_ZONE': '+proj=tmerc +lat_0=0 +lon_0=120 +k=1 +x_0=40500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
  'AUTO:WGS84_UTM_50N': '+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs',
  'AUTO:CGCS2000_UTM_50N': '+proj=utm +zone=50 +ellps=GRS80 +units=m +no_defs',
}

Object.entries(PROJECTION_DEFS).forEach(([name, definition]) => {
  proj4.defs(name, definition)
})

function getExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').split('/').pop() || 'SHP 图层'
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  return Boolean(value && typeof value === 'object' && (value as GeoJsonFeatureCollection).type === 'FeatureCollection' && Array.isArray((value as GeoJsonFeatureCollection).features))
}

function isFinitePosition(value: unknown): value is GeoJsonPosition {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number' && Number.isFinite(value[0]) && Number.isFinite(value[1])
}

function isWgs84Position(position: GeoJsonPosition) {
  return position[0] >= -180 && position[0] <= 180 && position[1] >= -90 && position[1] <= 90
}

function collectPositionsFromCoordinates(coordinates: unknown, output: GeoJsonPosition[] = []) {
  if (isFinitePosition(coordinates)) {
    output.push(coordinates)
    return output
  }

  if (Array.isArray(coordinates)) {
    coordinates.forEach((item) => collectPositionsFromCoordinates(item, output))
  }

  return output
}

function collectFeatureCollectionPositions(collection: GeoJsonFeatureCollection) {
  return collection.features.flatMap((feature) => collectPositionsFromCoordinates(feature.geometry?.coordinates))
}

function mapCoordinates(coordinates: unknown, transform: (position: GeoJsonPosition) => GeoJsonPosition | null): unknown {
  if (isFinitePosition(coordinates)) {
    return transform(coordinates)
  }

  if (Array.isArray(coordinates)) {
    return coordinates.map((item) => mapCoordinates(item, transform))
  }

  return coordinates
}

function mapFeatureCollectionCoordinates(collection: GeoJsonFeatureCollection, transform: (position: GeoJsonPosition) => GeoJsonPosition | null): GeoJsonFeatureCollection {
  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      geometry: feature.geometry?.coordinates
        ? {
            ...feature.geometry,
            coordinates: mapCoordinates(feature.geometry.coordinates, transform),
          }
        : feature.geometry,
    })),
  }
}

function scoreTransform(positions: GeoJsonPosition[], transform: CoordinateTransform) {
  let validCount = 0
  let west = Number.POSITIVE_INFINITY
  let south = Number.POSITIVE_INFINITY
  let east = Number.NEGATIVE_INFINITY
  let north = Number.NEGATIVE_INFINITY

  for (const position of positions) {
    const transformed = transform.transform(position)

    if (!transformed || !isWgs84Position(transformed)) {
      continue
    }

    validCount += 1
    west = Math.min(west, transformed[0])
    south = Math.min(south, transformed[1])
    east = Math.max(east, transformed[0])
    north = Math.max(north, transformed[1])
  }

  const validRatio = positions.length ? validCount / positions.length : 0
  const width = Number.isFinite(west) && Number.isFinite(east) ? east - west : Number.POSITIVE_INFINITY
  const height = Number.isFinite(south) && Number.isFinite(north) ? north - south : Number.POSITIVE_INFINITY

  return {
    ...transform,
    validRatio,
    width,
    height,
  }
}

function fromProj4(projection: string): CoordinateTransform['transform'] {
  return (position) => {
    try {
      const [lng, lat] = proj4(projection, WGS84, [position[0], position[1]])

      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null
      }

      return [lng, lat, ...position.slice(2)]
    } catch {
      return null
    }
  }
}

function stripGaussKrugerZonePrefix(value: number) {
  const absValue = Math.abs(value)

  if (absValue < 10000000) {
    return value
  }

  const sign = value < 0 ? -1 : 1
  return sign * (absValue % 1000000)
}

function createCoordinateTransforms(): CoordinateTransform[] {
  return [
    {
      name: 'wgs84',
      transform: (position) => position,
    },
    {
      name: 'swapped-wgs84',
      transform: (position) => [position[1], position[0], ...position.slice(2)],
    },
    {
      name: 'web-mercator',
      transform: (position) => {
        const [x, y] = position

        if (Math.abs(x) > WEB_MERCATOR_MAX || Math.abs(y) > WEB_MERCATOR_MAX) {
          return null
        }

        return fromProj4('EPSG:3857')(position)
      },
    },
    {
      name: 'swapped-web-mercator',
      transform: (position) => {
        const swapped: GeoJsonPosition = [position[1], position[0], ...position.slice(2)]
        const [x, y] = swapped

        if (Math.abs(x) > WEB_MERCATOR_MAX || Math.abs(y) > WEB_MERCATOR_MAX) {
          return null
        }

        return fromProj4('EPSG:3857')(swapped)
      },
    },
    {
      name: 'cgcs2000-gk-3-120',
      transform: fromProj4('AUTO:CGCS2000_GK_3_120'),
    },
    {
      name: 'swapped-cgcs2000-gk-3-120',
      transform: (position) => fromProj4('AUTO:CGCS2000_GK_3_120')([position[1], position[0], ...position.slice(2)]),
    },
    {
      name: 'cgcs2000-gk-3-120-zone',
      transform: fromProj4('AUTO:CGCS2000_GK_3_120_ZONE'),
    },
    {
      name: 'cgcs2000-gk-3-120-stripped-zone',
      transform: (position) => fromProj4('AUTO:CGCS2000_GK_3_120')([stripGaussKrugerZonePrefix(position[0]), position[1], ...position.slice(2)]),
    },
    {
      name: 'swapped-cgcs2000-gk-3-120-stripped-zone',
      transform: (position) => fromProj4('AUTO:CGCS2000_GK_3_120')([stripGaussKrugerZonePrefix(position[1]), position[0], ...position.slice(2)]),
    },
    {
      name: 'wgs84-utm-50n',
      transform: fromProj4('AUTO:WGS84_UTM_50N'),
    },
    {
      name: 'swapped-wgs84-utm-50n',
      transform: (position) => fromProj4('AUTO:WGS84_UTM_50N')([position[1], position[0], ...position.slice(2)]),
    },
    {
      name: 'cgcs2000-utm-50n',
      transform: fromProj4('AUTO:CGCS2000_UTM_50N'),
    },
    {
      name: 'swapped-cgcs2000-utm-50n',
      transform: (position) => fromProj4('AUTO:CGCS2000_UTM_50N')([position[1], position[0], ...position.slice(2)]),
    },
  ]
}

function normalizeFeatureCollectionCoordinates(collection: GeoJsonFeatureCollection) {
  const positions = collectFeatureCollectionPositions(collection).slice(0, 5000)

  if (!positions.length) {
    return collection
  }

  const scores = createCoordinateTransforms()
    .map((transform) => scoreTransform(positions, transform))
    .filter((score) => score.validRatio >= 0.9)
    .sort((a, b) => {
      if (b.validRatio !== a.validRatio) {
        return b.validRatio - a.validRatio
      }

      return a.width * a.height - b.width * b.height
    })

  const originalScore = scores.find((score) => score.name === 'wgs84')
  const bestScore = scores[0]

  if (!bestScore || (originalScore && originalScore.validRatio >= 0.9)) {
    return collection
  }

  return mapFeatureCollectionCoordinates(collection, bestScore.transform)
}

function normalizeParseResult(result: ShpParseResult, fallbackName: string): ParsedShapefileLayer[] {
  if (Array.isArray(result)) {
    return result.filter(isFeatureCollection).map((collection, index) => ({
      name: collection.fileName || `${fallbackName}${index > 0 ? ` ${index + 1}` : ''}`,
      geojson: normalizeFeatureCollectionCoordinates(collection),
    }))
  }

  if (isFeatureCollection(result)) {
    return [{ name: result.fileName || fallbackName, geojson: normalizeFeatureCollectionCoordinates(result) }]
  }

  return Object.entries(result)
    .filter((entry): entry is [string, GeoJsonFeatureCollection] => isFeatureCollection(entry[1]))
    .map(([name, collection]) => ({
      name: collection.fileName || name || fallbackName,
      geojson: normalizeFeatureCollectionCoordinates(collection),
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
