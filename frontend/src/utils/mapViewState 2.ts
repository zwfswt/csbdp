type MapMode = '2d' | '3d'

type LayerSnapshot = {
  name: string
  visible: boolean
  opacity: number
}

export type MapDrawingPoint = {
  lng: number
  lat: number
  height?: number
}

export type Map3DDrawingFeature = {
  id: string
  type: 'point' | 'line' | 'polygon' | 'text'
  positions: MapDrawingPoint[]
  text?: string
}

export type Map2DViewState = {
  center: {
    lat: number
    lng: number
  }
  zoom: number
  basemap: string
  layers: LayerSnapshot[]
  sidebarOpen: boolean
  activePanel: 'basemap' | 'bookmark' | null
}

export type Map3DCameraState = {
  lat: number
  lng: number
  height: number
  heading: number
  pitch: number
  roll: number
  focusLat?: number
  focusLng?: number
}

export type Map3DViewState = {
  camera: Map3DCameraState
  basemap: string
  layers: LayerSnapshot[]
  drawings?: Map3DDrawingFeature[]
  sidebarOpen: boolean
  activePanel: 'basemap' | 'bookmark' | null
}

const STORAGE_PREFIX = 'csbdp-map-view'
const MAP_2D_KEY = 'map-2d'
const MAP_3D_KEY = 'map-3d'
const LAST_SOURCE_KEY = 'last-source'

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getScopedKey(userScope: string | null | undefined, key: string) {
  const normalizedScope = userScope?.trim() ? encodeURIComponent(userScope.trim()) : 'anonymous'
  return `${STORAGE_PREFIX}:${normalizedScope}:${key}`
}

function readJson<T>(storageKey: string): T | null {
  if (!hasStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(storageKey: string, value: unknown) {
  if (!hasStorage()) {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function snapshotLayers(layers: Array<{ name: string; visible: boolean; opacity: number }>): LayerSnapshot[] {
  return layers.map((layer) => ({
    name: layer.name,
    visible: Boolean(layer.visible),
    opacity: clamp(Number(layer.opacity ?? 1), 0, 1),
  }))
}

export function save2DViewState(userScope: string | null | undefined, state: Map2DViewState) {
  writeJson(getScopedKey(userScope, MAP_2D_KEY), state)
}

export function read2DViewState(userScope: string | null | undefined) {
  return readJson<Map2DViewState>(getScopedKey(userScope, MAP_2D_KEY))
}

export function save3DViewState(userScope: string | null | undefined, state: Map3DViewState) {
  writeJson(getScopedKey(userScope, MAP_3D_KEY), state)
}

export function read3DViewState(userScope: string | null | undefined) {
  return readJson<Map3DViewState>(getScopedKey(userScope, MAP_3D_KEY))
}

export function clear3DViewState(userScope: string | null | undefined) {
  if (!hasStorage()) {
    return
  }

  window.localStorage.removeItem(getScopedKey(userScope, MAP_3D_KEY))
}

export function saveLastMapSource(userScope: string | null | undefined, mode: MapMode) {
  writeJson(getScopedKey(userScope, LAST_SOURCE_KEY), mode)
}

export function readLastMapSource(userScope: string | null | undefined) {
  return readJson<MapMode>(getScopedKey(userScope, LAST_SOURCE_KEY))
}

export function clearMapViewState(userScope: string | null | undefined) {
  if (!hasStorage()) {
    return
  }

  window.localStorage.removeItem(getScopedKey(userScope, MAP_2D_KEY))
  window.localStorage.removeItem(getScopedKey(userScope, MAP_3D_KEY))
  window.localStorage.removeItem(getScopedKey(userScope, LAST_SOURCE_KEY))
}

export function map2DBasemapTo3D(basemap: string) {
  switch (basemap) {
    case 'gaode':
      return 'gaode'
    case 'gaodeImg':
      return 'gaodeImg'
    case 'esriImg':
    case 'arcgisImage':
      return 'esriImg'
    case 'esriTopo':
    case 'arcgisTopo':
      return 'esriTopo'
    case 'osm':
      return 'osm'
    default:
      return 'osm'
  }
}

export function map3DBasemapTo2D(basemap: string) {
  switch (basemap) {
    case 'esriImg':
    case 'arcgisImage':
      return 'esriImg'
    case 'esriTopo':
    case 'arcgisTopo':
      return 'esriTopo'
    case 'gaode':
      return 'gaode'
    case 'gaodeImg':
      return 'gaodeImg'
    case 'osm':
    default:
      return 'osm'
  }
}

export function heightFrom2DZoom(zoom: number) {
  const rawHeight = 24000000 / 2 ** zoom
  return clamp(rawHeight, 800, 18000000)
}

export function zoomFrom3DHeight(height: number) {
  if (!Number.isFinite(height) || height <= 0) {
    return 5
  }

  const zoom = Math.log2(24000000 / height)
  return Math.round(clamp(zoom, 2, 18))
}

export function derive2DStateFrom3D(state: Map3DViewState): Map2DViewState {
  return {
    center: {
      lat: state.camera.focusLat ?? state.camera.lat,
      lng: state.camera.focusLng ?? state.camera.lng,
    },
    zoom: zoomFrom3DHeight(state.camera.height),
    basemap: map3DBasemapTo2D(state.basemap),
    layers: state.layers.map((layer) => ({ ...layer })),
    sidebarOpen: state.sidebarOpen,
    activePanel: state.activePanel,
  }
}

export function derive3DStateFrom2D(state: Map2DViewState): Map3DViewState {
  return {
    camera: {
      lat: state.center.lat,
      lng: state.center.lng,
      height: heightFrom2DZoom(state.zoom),
      heading: 0,
      pitch: -75,
      roll: 0,
    },
    basemap: map2DBasemapTo3D(state.basemap),
    layers: state.layers.map((layer) => ({ ...layer })),
    sidebarOpen: state.sidebarOpen,
    activePanel: state.activePanel,
  }
}

export function mergeLayerSnapshots<T extends { name: string; visible: boolean; opacity: number }>(
  baseLayers: T[],
  snapshots: LayerSnapshot[] | null | undefined,
) {
  if (!snapshots?.length) {
    return baseLayers.map((layer) => ({ ...layer }))
  }

  const snapshotMap = new Map(snapshots.map((layer) => [layer.name, layer]))

  return baseLayers.map((layer) => {
    const snapshot = snapshotMap.get(layer.name)

    if (!snapshot) {
      return { ...layer }
    }

    return {
      ...layer,
      visible: snapshot.visible,
      opacity: clamp(Number(snapshot.opacity ?? layer.opacity), 0, 1),
    }
  })
}