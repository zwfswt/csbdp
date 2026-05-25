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

export type ShpProjectionOverride =
  | 'auto'
  | 'cgcs2000-gk3-120-zone'
  | 'cgcs2000-gk3-120'
  | 'cgcs2000-gk3-120-zone-swapped'
  | 'cgcs2000-gk3-120-swapped'

export type ParseShapefileOptions = {
  projectionOverride?: ShpProjectionOverride
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
  priority?: number
}

export const SHP_PROJECTION_OPTIONS: { value: ShpProjectionOverride; label: string; description: string }[] = [
  {
    value: 'auto',
    label: '自动识别',
    description: '根据项目区域自动尝试常见投影坐标系',
  },
  {
    value: 'cgcs2000-gk3-120-zone',
    label: 'CGCS2000 GK 3度带 120E（带号）',
    description: '适用于 X 坐标带 40/405 前缀的高斯-克吕格坐标',
  },
  {
    value: 'cgcs2000-gk3-120',
    label: 'CGCS2000 GK 3度带 120E',
    description: '适用于不带分带号前缀的高斯-克吕格坐标',
  },
  {
    value: 'cgcs2000-gk3-120-zone-swapped',
    label: 'CGCS2000 GK 3度带 120E（带号，坐标反序）',
    description: '适用于坐标顺序为北坐标、东坐标的数据',
  },
  {
    value: 'cgcs2000-gk3-120-swapped',
    label: 'CGCS2000 GK 3度带 120E（坐标反序）',
    description: '适用于不带分带号且坐标顺序为北坐标、东坐标的数据',
  },
]

const WGS84 = 'EPSG:4326'
const WEB_MERCATOR_MAX = 20037508.342789244
const PROJECT_BOUNDS = {
  west: 118.2,
  south: 36.8,
  east: 120.2,
  north: 38.6,
}
const PROJECT_CENTER = {
  lng: (PROJECT_BOUNDS.west + PROJECT_BOUNDS.east) / 2,
  lat: (PROJECT_BOUNDS.south + PROJECT_BOUNDS.north) / 2,
}
const MAX_PROJECT_FALLBACK_DISTANCE = 3
const PROJECTION_DEFS: Record<string, string> = {
  'AUTO:CGCS2000_GK_3_120': createGaussKrugerDefinition(120, 500000),
  'AUTO:CGCS2000_GK_3_120_ZONE': createGaussKrugerDefinition(120, 40500000),
  'AUTO:WGS84_UTM_50N': createUtmDefinition(50, 'WGS84'),
  'AUTO:CGCS2000_UTM_50N': createUtmDefinition(50, 'CGCS2000'),
}

for (let centralMeridian = 75; centralMeridian <= 135; centralMeridian += 3) {
  const zone = Math.round(centralMeridian / 3)
  PROJECTION_DEFS[`AUTO:CGCS2000_GK_3_${centralMeridian}`] = createGaussKrugerDefinition(centralMeridian, 500000)
  PROJECTION_DEFS[`AUTO:CGCS2000_GK_3_${centralMeridian}_ZONE`] = createGaussKrugerDefinition(centralMeridian, zone * 1000000 + 500000)
  PROJECTION_DEFS[`AUTO:WGS84_GK_3_${centralMeridian}`] = createGaussKrugerDefinition(centralMeridian, 500000, 'WGS84')
  PROJECTION_DEFS[`AUTO:WGS84_GK_3_${centralMeridian}_ZONE`] = createGaussKrugerDefinition(centralMeridian, zone * 1000000 + 500000, 'WGS84')
}

for (let zone = 43; zone <= 53; zone += 1) {
  PROJECTION_DEFS[`AUTO:WGS84_UTM_${zone}N`] = createUtmDefinition(zone, 'WGS84')
  PROJECTION_DEFS[`AUTO:CGCS2000_UTM_${zone}N`] = createUtmDefinition(zone, 'CGCS2000')
}

Object.entries(PROJECTION_DEFS).forEach(([name, definition]) => {
  proj4.defs(name, definition)
})

function createGaussKrugerDefinition(centralMeridian: number, falseEasting: number, datum: 'CGCS2000' | 'WGS84' = 'CGCS2000') {
  const ellipsoid = datum === 'CGCS2000' ? '+ellps=GRS80' : '+datum=WGS84'
  return `+proj=tmerc +lat_0=0 +lon_0=${centralMeridian} +k=1 +x_0=${falseEasting} +y_0=0 ${ellipsoid} +units=m +no_defs`
}

function createUtmDefinition(zone: number, datum: 'CGCS2000' | 'WGS84' = 'CGCS2000') {
  const ellipsoid = datum === 'CGCS2000' ? '+ellps=GRS80' : '+datum=WGS84'
  return `+proj=utm +zone=${zone} ${ellipsoid} +units=m +no_defs`
}

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

function areAllPositionsWgs84(positions: GeoJsonPosition[]) {
  return positions.every(isWgs84Position)
}

function hasProjectedLikePositions(positions: GeoJsonPosition[]) {
  return positions.some((position) => !isWgs84Position(position))
}

function getDistanceToProjectCenter(west: number, south: number, east: number, north: number) {
  if (!Number.isFinite(west) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(north)) {
    return Number.POSITIVE_INFINITY
  }

  const lng = (west + east) / 2
  const lat = (south + north) / 2
  return Math.hypot(lng - PROJECT_CENTER.lng, lat - PROJECT_CENTER.lat)
}

function getProjectOverlapRatio(west: number, south: number, east: number, north: number) {
  if (!Number.isFinite(west) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(north)) {
    return 0
  }

  const overlapWidth = Math.max(0, Math.min(east, PROJECT_BOUNDS.east) - Math.max(west, PROJECT_BOUNDS.west))
  const overlapHeight = Math.max(0, Math.min(north, PROJECT_BOUNDS.north) - Math.max(south, PROJECT_BOUNDS.south))
  const area = Math.max((east - west) * (north - south), 0)

  return area > 0 ? (overlapWidth * overlapHeight) / area : 0
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
  const area = width * height

  return {
    ...transform,
    validRatio,
    width,
    height,
    area,
    projectOverlapRatio: getProjectOverlapRatio(west, south, east, north),
    projectDistance: getDistanceToProjectCenter(west, south, east, north),
  }
}

function assertFeatureCollectionIsWgs84(collection: GeoJsonFeatureCollection, layerName: string, expectedPositionCount?: number) {
  const positions = collectFeatureCollectionPositions(collection)

  if (expectedPositionCount !== undefined && positions.length !== expectedPositionCount) {
    throw new Error(`${layerName} 的部分坐标无法完成投影转换，请检查 .prj 文件或坐标系。`)
  }

  if (!positions.length || areAllPositionsWgs84(positions)) {
    return
  }

  throw new Error(`${layerName} 的坐标仍为投影坐标或无法识别的坐标系，请确认已选择正确的 .prj 文件。`)
}

function assertFeatureCollectionNearProject(collection: GeoJsonFeatureCollection, layerName: string) {
  const positions = collectFeatureCollectionPositions(collection)

  if (!positions.length) {
    return
  }

  let west = Number.POSITIVE_INFINITY
  let south = Number.POSITIVE_INFINITY
  let east = Number.NEGATIVE_INFINITY
  let north = Number.NEGATIVE_INFINITY

  for (const position of positions) {
    if (!isWgs84Position(position)) {
      continue
    }

    west = Math.min(west, position[0])
    south = Math.min(south, position[1])
    east = Math.max(east, position[0])
    north = Math.max(north, position[1])
  }

  if (getProjectOverlapRatio(west, south, east, north) > 0 || getDistanceToProjectCenter(west, south, east, north) <= MAX_PROJECT_FALLBACK_DISTANCE) {
    return
  }

  throw new Error(`${layerName} 的投影坐标转换结果不在项目区域附近，请重新选择坐标系。`)
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

function createNamedProj4Transform(name: string, projection: string, priority = 0): CoordinateTransform {
  return {
    name,
    priority,
    transform: fromProj4(projection),
  }
}

function createSwappedProj4Transform(name: string, projection: string, priority = 0): CoordinateTransform {
  return {
    name,
    priority,
    transform: (position) => fromProj4(projection)([position[1], position[0], ...position.slice(2)]),
  }
}

function createStrippedGaussKrugerTransform(name: string, projection: string, priority = 0): CoordinateTransform {
  return {
    name,
    priority,
    transform: (position) => fromProj4(projection)([stripGaussKrugerZonePrefix(position[0]), position[1], ...position.slice(2)]),
  }
}

function getProjectionOverrideTransform(projectionOverride: ShpProjectionOverride): CoordinateTransform | null {
  switch (projectionOverride) {
    case 'cgcs2000-gk3-120-zone':
      return createNamedProj4Transform('cgcs2000-gk3-120-zone-manual', 'AUTO:CGCS2000_GK_3_120_ZONE', 10)
    case 'cgcs2000-gk3-120':
      return createNamedProj4Transform('cgcs2000-gk3-120-manual', 'AUTO:CGCS2000_GK_3_120', 10)
    case 'cgcs2000-gk3-120-zone-swapped':
      return createSwappedProj4Transform('cgcs2000-gk3-120-zone-swapped-manual', 'AUTO:CGCS2000_GK_3_120_ZONE', 10)
    case 'cgcs2000-gk3-120-swapped':
      return createSwappedProj4Transform('cgcs2000-gk3-120-swapped-manual', 'AUTO:CGCS2000_GK_3_120', 10)
    case 'auto':
    default:
      return null
  }
}

function createCoordinateTransforms(): CoordinateTransform[] {
  const transforms: CoordinateTransform[] = [
    {
      name: 'wgs84',
      priority: 5,
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
      priority: 6,
      transform: fromProj4('AUTO:CGCS2000_GK_3_120'),
    },
    {
      name: 'swapped-cgcs2000-gk-3-120',
      transform: (position) => fromProj4('AUTO:CGCS2000_GK_3_120')([position[1], position[0], ...position.slice(2)]),
    },
    {
      name: 'cgcs2000-gk-3-120-zone',
      priority: 6,
      transform: fromProj4('AUTO:CGCS2000_GK_3_120_ZONE'),
    },
    {
      name: 'cgcs2000-gk-3-120-stripped-zone',
      priority: 6,
      transform: (position) => fromProj4('AUTO:CGCS2000_GK_3_120')([stripGaussKrugerZonePrefix(position[0]), position[1], ...position.slice(2)]),
    },
    {
      name: 'swapped-cgcs2000-gk-3-120-stripped-zone',
      transform: (position) => fromProj4('AUTO:CGCS2000_GK_3_120')([stripGaussKrugerZonePrefix(position[1]), position[0], ...position.slice(2)]),
    },
    {
      name: 'wgs84-utm-50n',
      priority: 4,
      transform: fromProj4('AUTO:WGS84_UTM_50N'),
    },
    {
      name: 'swapped-wgs84-utm-50n',
      transform: (position) => fromProj4('AUTO:WGS84_UTM_50N')([position[1], position[0], ...position.slice(2)]),
    },
    {
      name: 'cgcs2000-utm-50n',
      priority: 4,
      transform: fromProj4('AUTO:CGCS2000_UTM_50N'),
    },
    {
      name: 'swapped-cgcs2000-utm-50n',
      transform: (position) => fromProj4('AUTO:CGCS2000_UTM_50N')([position[1], position[0], ...position.slice(2)]),
    },
  ]

  for (let centralMeridian = 75; centralMeridian <= 135; centralMeridian += 3) {
    const cgcsProjection = `AUTO:CGCS2000_GK_3_${centralMeridian}`
    const cgcsZoneProjection = `AUTO:CGCS2000_GK_3_${centralMeridian}_ZONE`
    const wgsProjection = `AUTO:WGS84_GK_3_${centralMeridian}`
    const wgsZoneProjection = `AUTO:WGS84_GK_3_${centralMeridian}_ZONE`
    const priority = centralMeridian === 120 ? 6 : 2

    transforms.push(createNamedProj4Transform(`cgcs2000-gk-3-${centralMeridian}`, cgcsProjection, priority))
    transforms.push(createNamedProj4Transform(`cgcs2000-gk-3-${centralMeridian}-zone`, cgcsZoneProjection, priority))
    transforms.push(createStrippedGaussKrugerTransform(`cgcs2000-gk-3-${centralMeridian}-stripped-zone`, cgcsProjection, priority))
    transforms.push(createNamedProj4Transform(`wgs84-gk-3-${centralMeridian}`, wgsProjection, priority - 1))
    transforms.push(createNamedProj4Transform(`wgs84-gk-3-${centralMeridian}-zone`, wgsZoneProjection, priority - 1))
  }

  for (let zone = 43; zone <= 53; zone += 1) {
    const priority = zone === 50 ? 4 : 1
    transforms.push(createNamedProj4Transform(`wgs84-utm-${zone}n`, `AUTO:WGS84_UTM_${zone}N`, priority))
    transforms.push(createNamedProj4Transform(`cgcs2000-utm-${zone}n`, `AUTO:CGCS2000_UTM_${zone}N`, priority))
    transforms.push(createSwappedProj4Transform(`swapped-wgs84-utm-${zone}n`, `AUTO:WGS84_UTM_${zone}N`))
    transforms.push(createSwappedProj4Transform(`swapped-cgcs2000-utm-${zone}n`, `AUTO:CGCS2000_UTM_${zone}N`))
  }

  const seen = new Set<string>()
  return transforms.filter((transform) => {
    if (seen.has(transform.name)) {
      return false
    }

    seen.add(transform.name)
    return true
  })
}

function normalizeFeatureCollectionCoordinates(collection: GeoJsonFeatureCollection, layerName: string, projectionOverride: ShpProjectionOverride = 'auto') {
  const allPositions = collectFeatureCollectionPositions(collection)
  const positions = allPositions.slice(0, 5000)

  if (!allPositions.length) {
    return collection
  }

  if (areAllPositionsWgs84(allPositions)) {
    return collection
  }

  const overrideTransform = getProjectionOverrideTransform(projectionOverride)

  if (overrideTransform) {
    const normalizedCollection = mapFeatureCollectionCoordinates(collection, overrideTransform.transform)
    assertFeatureCollectionIsWgs84(normalizedCollection, layerName, allPositions.length)
    assertFeatureCollectionNearProject(normalizedCollection, layerName)
    return normalizedCollection
  }

  const scores = createCoordinateTransforms()
    .map((transform) => scoreTransform(positions, transform))
    .filter((score) => score.validRatio >= 0.9)
    .sort((a, b) => {
      if (b.validRatio !== a.validRatio) {
        return b.validRatio - a.validRatio
      }

      if (b.projectOverlapRatio !== a.projectOverlapRatio) {
        return b.projectOverlapRatio - a.projectOverlapRatio
      }

      if (a.projectDistance !== b.projectDistance) {
        return a.projectDistance - b.projectDistance
      }

      if ((b.priority ?? 0) !== (a.priority ?? 0)) {
        return (b.priority ?? 0) - (a.priority ?? 0)
      }

      return a.area - b.area
    })

  const originalScore = scores.find((score) => score.name === 'wgs84')
  const bestScore = scores[0]

  if (!bestScore || !hasProjectedLikePositions(allPositions)) {
    throw new Error(`${layerName} 的投影坐标系无法自动识别，请同时选择 .prj 文件后重试。`)
  }

  if (bestScore.projectOverlapRatio <= 0 && bestScore.projectDistance > MAX_PROJECT_FALLBACK_DISTANCE) {
    throw new Error(`${layerName} 的投影坐标转换结果不在项目区域附近，请检查 .prj 文件或坐标系。`)
  }

  if (
    originalScore
    && originalScore.validRatio >= 0.9
    && originalScore.projectDistance <= bestScore.projectDistance + 0.25
  ) {
    assertFeatureCollectionIsWgs84(collection, layerName, allPositions.length)
    return collection
  }

  const normalizedCollection = mapFeatureCollectionCoordinates(collection, bestScore.transform)
  assertFeatureCollectionIsWgs84(normalizedCollection, layerName, allPositions.length)
  return normalizedCollection
}

function normalizeParseResult(result: ShpParseResult, fallbackName: string, projectionOverride: ShpProjectionOverride = 'auto'): ParsedShapefileLayer[] {
  if (Array.isArray(result)) {
    return result.filter(isFeatureCollection).map((collection, index) => ({
      name: collection.fileName || `${fallbackName}${index > 0 ? ` ${index + 1}` : ''}`,
      geojson: normalizeFeatureCollectionCoordinates(collection, collection.fileName || `${fallbackName}${index > 0 ? ` ${index + 1}` : ''}`, projectionOverride),
    }))
  }

  if (isFeatureCollection(result)) {
    return [{ name: result.fileName || fallbackName, geojson: normalizeFeatureCollectionCoordinates(result, result.fileName || fallbackName, projectionOverride) }]
  }

  return Object.entries(result)
    .filter((entry): entry is [string, GeoJsonFeatureCollection] => isFeatureCollection(entry[1]))
    .map(([name, collection]) => ({
      name: collection.fileName || name || fallbackName,
      geojson: normalizeFeatureCollectionCoordinates(collection, collection.fileName || name || fallbackName, projectionOverride),
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

export async function parseShapefileFiles(files: FileList | File[], options: ParseShapefileOptions = {}): Promise<ParsedShapefileLayer[]> {
  const selectedFiles = Array.from(files)
  const projectionOverride = options.projectionOverride ?? 'auto'

  if (!selectedFiles.length) {
    throw new Error('请选择 SHP 文件或 zip 压缩包。')
  }

  const zipFiles = selectedFiles.filter((file) => getExtension(file) === 'zip')

  if (zipFiles.length === 1 && selectedFiles.length === 1) {
    const zipFile = zipFiles[0]
    const result = await shp(await zipFile.arrayBuffer()) as ShpParseResult
    const layers = normalizeParseResult(result, getBaseName(zipFile.name), projectionOverride)

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
  const layers = normalizeParseResult(result, getBaseName(shpFile.name), projectionOverride)

  if (!layers.length) {
    throw new Error('未解析到可显示的 SHP 要素。')
  }

  return layers
}
