<template>
  <div class="dashboard-root">
    <div class="header map2d-header">
      <div class="map2d-header-left">
        <button id="sidebarToggle" class="map-directory-toggle" title="打开/关闭数据目录" @click="toggleSidebar">
          <i class="fa-solid fa-bars"></i>
        </button>

        <div class="map2d-title-group">
          <h1>海岸带时空水深数据平台</h1>
          <button type="button" class="map2d-mode-btn" @click="switchTo3D">切换到三维地图</button>
        </div>
      </div>

      <div class="header-user map2d-header-actions">
        <span id="loginUserText">{{ loginUserText }}</span>
        <button id="logoutBtn" title="退出登录" @click="handleLogout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <div class="main">
      <div id="map" ref="mapElement" :class="{ 'freehand-cursor': currentTool === 'freehand' }"></div>

      <aside id="sidebar" class="sidebar" :class="{ open: sidebarOpen }">
        <h2>数据目录</h2>
        <div id="layerList">
          <div v-for="(layer, index) in uiLayers" :key="layer.name" class="layer-item">
            <label>
              <input v-model="layer.visible" type="checkbox" :data-index="index" @change="toggleLayer(index)" />
              {{ layer.name }}
            </label>
            <div class="layer-desc">类型：{{ layer.type }}</div>
            <div v-if="layer.isArcGISServer" class="layer-desc">来源：ArcGIS Server / MapServer/export</div>
            <div class="layer-desc">透明度</div>
            <input
              v-model.number="layer.opacity"
              type="range"
              :data-opacity-index="index"
              min="0"
              max="1"
              step="0.05"
              @input="updateOpacity(index)"
            />
          </div>
        </div>

        <div class="legend">
          <div class="legend-title">水深图例</div>
          <div class="legend-row">
            <span class="legend-color" style="background:#38bdf8"></span>
            0 - 3 m
          </div>
          <div class="legend-row">
            <span class="legend-color" style="background:#0ea5e9"></span>
            3 - 6 m
          </div>
          <div class="legend-row">
            <span class="legend-color" style="background:#2563eb"></span>
            6 - 10 m
          </div>
          <div class="legend-row">
            <span class="legend-color" style="background:#1e3a8a"></span>
            &gt; 10 m
          </div>
        </div>
      </aside>

      <div class="toolbar">
        <button id="homeBtn" class="tool-btn" title="回到全国视图" @click="goHome">
          <i class="fa-solid fa-house"></i>
        </button>

        <button id="basemapBtn" class="tool-btn" :class="{ active: activePanel === 'basemap' }" title="底图切换" @click="togglePanel('basemap')">
          <i class="fa-solid fa-layer-group"></i>
        </button>

        <button id="bookmarkBtn" class="tool-btn" :class="{ active: activePanel === 'bookmark' }" title="空间书签" @click="togglePanel('bookmark')">
          <i class="fa-regular fa-bookmark"></i>
        </button>

        <button id="shpLoadBtn" class="tool-btn" title="加载 SHP 数据" :disabled="isLoadingShp" @click="openShpFilePicker">
          <i class="fa-solid fa-file-import"></i>
        </button>
        <input ref="shpFileInput" class="shp-file-input" type="file" accept=".zip,.shp,.shx,.dbf,.prj,.cpg" multiple @change="handleShpFileChangeWithProjection" />

        <div v-if="shpProjectionDialogOpen" class="shp-projection-mask" @click.self="cancelShpProjectionDialog">
          <div class="shp-projection-dialog">
            <div class="shp-projection-header">
              <h3>SHP 坐标系</h3>
              <button type="button" class="shp-projection-close" @click="cancelShpProjectionDialog">×</button>
            </div>
            <div class="shp-projection-body">
              <label v-for="option in shpProjectionOptions" :key="option.value" class="shp-projection-option">
                <input v-model="shpProjectionChoice" type="radio" name="shpProjection2d" :value="option.value" />
                <span>
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </span>
              </label>
            </div>
            <div class="shp-projection-actions">
              <button type="button" class="shp-projection-secondary" @click="cancelShpProjectionDialog">取消</button>
              <button type="button" class="shp-projection-primary" @click="confirmShpProjectionDialog">加载</button>
            </div>
          </div>
        </div>

        <button id="drawingBtn" class="tool-btn" :class="{ active: drawingToolsOpen || isDrawingToolActive }" title="绘图工具" @click="toggleDrawingTools">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>

        <button id="freehandBtn" class="tool-btn" :class="{ active: currentTool === 'freehand' }" title="自由画笔" @click="setTool('freehand')">
          <i class="fa-solid fa-pencil"></i>
        </button>

        <button id="measurementBtn" class="tool-btn" :class="{ active: measurementToolsOpen || isMeasurementToolActive }" title="测量工具" @click="toggleMeasurementTools">
          <i class="fa-solid fa-ruler-combined"></i>
        </button>

        <button id="clearBtn" class="tool-btn" title="清除标注" @click="clearDrawings">
          <i class="fa-solid fa-trash-can"></i>
        </button>

        <button id="printBtn" class="tool-btn" title="打印当前地图" @click="printMap">
          <i class="fa-solid fa-print"></i>
        </button>
      </div>

      <div class="drawing-tool-panel" :style="{ display: drawingToolsOpen ? 'grid' : 'none' }">
        <button class="drawing-tool-option" :class="{ active: currentTool === 'marker' }" title="点标注" @click="setTool('marker')">
          <i class="fa-solid fa-location-dot"></i>
        </button>
        <button class="drawing-tool-option" :class="{ active: currentTool === 'text' }" title="文字标注" @click="setTool('text')">
          <i class="fa-solid fa-font"></i>
        </button>
        <button class="drawing-tool-option" :class="{ active: currentTool === 'line' }" title="线标注" @click="setTool('line')">
          <i class="fa-solid fa-route"></i>
        </button>
        <button class="drawing-tool-option" :class="{ active: currentTool === 'polygon' }" title="面标注" @click="setTool('polygon')">
          <i class="fa-regular fa-square"></i>
        </button>
      </div>

      <div class="measurement-tool-panel" :style="{ display: measurementToolsOpen ? 'grid' : 'none' }">
        <button class="measurement-tool-option" :class="{ active: currentTool === 'measure' }" title="距离测量" @click="setTool('measure')">
          <i class="fa-solid fa-ruler"></i>
        </button>
        <button class="measurement-tool-option" :class="{ active: currentTool === 'areaMeasure' }" title="面积测量" @click="setTool('areaMeasure')">
          <i class="fa-solid fa-vector-square"></i>
        </button>
      </div>

      <div class="freehand-color-panel" :style="{ display: currentTool === 'freehand' ? 'grid' : 'none' }" aria-label="自由画笔颜色">
        <button
          v-for="color in freehandColorOptions"
          :key="color"
          type="button"
          class="freehand-color-option"
          :class="{ active: freehandColor === color }"
          :style="{ backgroundColor: color }"
          :title="`选择画笔颜色 ${color}`"
          @click="freehandColor = color"
        ></button>
      </div>

      <div id="basemapPanel" class="basemap-panel" :style="{ display: activePanel === 'basemap' ? 'block' : 'none' }">
        <h3>底图切换</h3>
        <label v-for="option in basemapOptions" :key="option.value">
          <input v-model="selectedBasemap" type="radio" name="basemap" :value="option.value" @change="changeBaseLayer(option.value)" />
          {{ option.label }}
        </label>
      </div>

      <div id="bookmarkPanel" class="bookmark-panel" :style="{ display: activePanel === 'bookmark' ? 'block' : 'none' }">
        <div class="bookmark-title">空间书签</div>
        <div id="bookmarkList">
          <button v-for="bookmark in mapConfig?.bookmarks ?? []" :key="bookmark.name" class="bookmark-item" @click="goToBookmark(bookmark)">
            <i class="fa-regular fa-bookmark"></i>
            <span>{{ bookmark.name }}</span>
          </button>
        </div>
      </div>

      <div id="tip" class="tip" :style="{ display: toolTip ? 'block' : 'none' }">{{ toolTip }}</div>

      <div id="coordBox" class="coord-box">
        {{ coordText }}
      </div>

      <div id="notice" class="notice" :style="{ display: noticeMessage ? 'block' : 'none' }">{{ noticeMessage }}</div>

      <div v-if="activeFieldSurvey" class="survey-dialog-mask" @click.self="closeFieldSurveyDialog">
        <div class="survey-dialog">
          <button type="button" class="survey-dialog-close" @click="closeFieldSurveyDialog">×</button>
          <div class="survey-dialog-header">
            <div>
              <div class="survey-dialog-badge">野外考察</div>
              <h3>{{ activeFieldSurvey.name }}</h3>
            </div>
            <div class="survey-dialog-serial">{{ activeFieldSurvey.serialNo }}</div>
          </div>

          <div class="survey-dialog-grid">
            <div class="survey-dialog-item">
              <span>时间</span>
              <strong>{{ activeFieldSurvey.surveyTime }}</strong>
            </div>
            <div class="survey-dialog-item">
              <span>经度</span>
              <strong>{{ activeFieldSurvey.longitude.toFixed(6) }}</strong>
            </div>
            <div class="survey-dialog-item">
              <span>纬度</span>
              <strong>{{ activeFieldSurvey.latitude.toFixed(6) }}</strong>
            </div>
            <div class="survey-dialog-item survey-dialog-item-wide">
              <span>简介</span>
              <strong>{{ activeFieldSurvey.description || '暂无简介' }}</strong>
            </div>
          </div>

          <div class="survey-gallery-section">
            <div class="survey-gallery-title">现场图片</div>
            <div v-if="activeFieldSurvey.images.length" ref="fieldSurveyGalleryRef" class="survey-gallery-grid">
              <button
                v-for="(image, index) in activeFieldSurvey.images"
                :key="image.id"
                type="button"
                class="survey-gallery-card"
                @click="openFieldSurveyImage(index)"
              >
                <img :src="image.url" :alt="image.originalName" />
                <span>{{ image.originalName }}</span>
              </button>
            </div>
            <div v-else class="survey-empty-images">暂无现场图片</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Viewer from 'viewerjs'
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  clearLoginState,
  clearToken,
  fetchFieldSurveys,
  type FieldSurvey,
  fetchMapConfig,
  getStoredLoginUser,
  type Bookmark,
  type BusinessLayerConfig,
  type MapConfigResponse,
} from '../services/api'
import {
  clearMapViewState,
  derive2DStateFrom3D,
  mergeLayerSnapshots,
  read2DViewState,
  read3DViewState,
  readLastMapSource,
  save2DViewState,
  saveLastMapSource,
  snapshotLayers,
  type Map2DPointDrawing,
  type Map2DTextDrawing,
  type Map2DViewState,
} from '../utils/mapViewState'
import { normalizeLayerConfigs } from '../utils/layerConfig'
import { createUniqueShpLayerName, parseShapefileFiles, SHP_PROJECTION_OPTIONS, type GeoJsonFeature, type GeoJsonFeatureCollection, type ShpProjectionOverride } from '../utils/shapefile'

type ToolName = 'marker' | 'text' | 'line' | 'polygon' | 'freehand' | 'measure' | 'areaMeasure' | null
type UiLayerConfig = BusinessLayerConfig & { isTemporaryShp?: boolean }
type ArcGISLayer = L.Layer & { setOpacity?: (opacity: number) => void }
type MutableLayer = L.Layer & {
  setOpacity?: (opacity: number) => void
  setStyle?: (style: { opacity: number; fillOpacity: number }) => void
  eachLayer?: (handler: (subLayer: L.Layer) => void) => void
}

const router = useRouter()
const mapElement = ref<HTMLDivElement | null>(null)
const shpFileInput = ref<HTMLInputElement | null>(null)
const mapConfig = ref<MapConfigResponse | null>(null)
const uiLayers = ref<UiLayerConfig[]>([])
const sidebarOpen = ref(false)
const activePanel = ref<'basemap' | 'bookmark' | null>(null)
const selectedBasemap = ref('osm')
const currentTool = ref<ToolName>(null)
const drawingToolsOpen = ref(false)
const measurementToolsOpen = ref(false)
const freehandColor = ref('#0f766e')
const toolTip = ref('')
const coordText = ref('经度：--，纬度：--，缩放级别：--')
const noticeMessage = ref('')
const isLoadingShp = ref(false)
const shpProjectionDialogOpen = ref(false)
const shpProjectionChoice = ref<ShpProjectionOverride>('auto')
const pendingShpFiles = ref<File[]>([])
const loginUserText = ref(getStoredLoginUser() ?? 'admin')
const fieldSurveys = ref<FieldSurvey[]>([])
const activeFieldSurvey = ref<FieldSurvey | null>(null)
const fieldSurveyGalleryRef = ref<HTMLElement | null>(null)
const pointDrawings = ref<Map2DPointDrawing[]>([])
const textDrawings = ref<Map2DTextDrawing[]>([])

const basemapOptions = [
  { label: 'OpenStreetMap', value: 'osm' },
  { label: '高德电子地图', value: 'gaode' },
  { label: '高德影像地图', value: 'gaodeImg' },
  { label: 'Esri 影像', value: 'esriImg' },
  { label: 'Esri 地形', value: 'esriTopo' },
  { label: 'CARTO 浅色', value: 'cartoLight' },
  { label: 'CARTO 深色', value: 'cartoDark' },
  { label: 'Esri 灰色画布', value: 'esriGray' },
  { label: 'Esri 海洋', value: 'esriOcean' },
  { label: 'Esri 街道', value: 'esriStreet' },
  { label: 'GEBCO 全球水深', value: 'gebcoBathymetry' },
  { label: 'EMODnet 水深（欧洲海域）', value: 'emodnetBathymetry' },
]

const freehandColorOptions = ['#0f766e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#2563eb', '#7c3aed', '#111827']
const shpProjectionOptions = SHP_PROJECTION_OPTIONS

const isDrawingToolActive = computed(() => currentTool.value === 'marker' || currentTool.value === 'text' || currentTool.value === 'line' || currentTool.value === 'polygon')
const isMeasurementToolActive = computed(() => currentTool.value === 'measure' || currentTool.value === 'areaMeasure')

function isGroupedDrawingTool(toolName: ToolName) {
  return toolName === 'marker' || toolName === 'text' || toolName === 'line' || toolName === 'polygon'
}

function isGroupedMeasurementTool(toolName: ToolName) {
  return toolName === 'measure' || toolName === 'areaMeasure'
}

const DEFAULT_2D_VIEW = {
  center: { lat: 35, lng: 104 },
  zoom: 5,
  basemap: 'osm',
} as const

let noticeTimer: number | null = null
let map: L.Map | null = null
let currentBaseLayer: L.Layer | null = null
let drawnLayer: L.LayerGroup | null = null
let tempLayer: L.Layer | null = null
let freehandPreviewLayer: L.Polyline | null = null
let tempPoints: L.LatLng[] = []
let fieldSurveyViewer: Viewer | null = null
let shouldPersistOnUnmount = true
let isFreehandDrawing = false
let temporaryShpLayerId = 0
const baseLayers: Record<string, L.Layer> = {}
const businessLayerInstances = new Map<string, L.Layer>()
const temporaryShpLayers = new Map<string, L.GeoJSON>()

const ArcGISDynamicLayer = (L.Layer as unknown as {
  extend: (definition: Record<string, unknown>) => new (...args: unknown[]) => ArcGISLayer
}).extend({
  initialize(url: string, options?: { opacity?: number }) {
    ;(this as Record<string, unknown>).url = url.replace(/\/$/, '')
    ;(this as Record<string, unknown>).opacity = options?.opacity ?? 0.85
    ;(this as Record<string, unknown>).container = null
    ;(this as Record<string, unknown>).image = null
    ;(this as Record<string, unknown>).map = null
  },

  onAdd(mapInstance: L.Map) {
    const self = this as Record<string, unknown>
    const container = L.DomUtil.create('div', 'leaflet-arcgis-dynamic-layer')

    container.style.position = 'absolute'
    container.style.left = '0'
    container.style.top = '0'
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.pointerEvents = 'none'

    self.map = mapInstance
    self.container = container
    mapInstance.getPanes().overlayPane.appendChild(container)
    mapInstance.on('moveend zoomend resize', self.update as L.LeafletEventHandlerFn, self)
    ;(self.update as () => void)()
  },

  onRemove(mapInstance: L.Map) {
    const self = this as Record<string, unknown>
    const container = self.container as HTMLDivElement | null

    mapInstance.off('moveend zoomend resize', self.update as L.LeafletEventHandlerFn, self)

    if (container?.parentNode) {
      container.parentNode.removeChild(container)
    }

    self.container = null
    self.image = null
    self.map = null
  },

  setOpacity(opacity: number) {
    const self = this as Record<string, unknown>
    const image = self.image as HTMLImageElement | null

    self.opacity = opacity

    if (image) {
      image.style.opacity = String(opacity)
    }
  },

  update() {
    const self = this as Record<string, unknown>
    const mapInstance = self.map as L.Map | null
    const container = self.container as HTMLDivElement | null

    if (!mapInstance || !container) {
      return
    }

    const bounds = mapInstance.getBounds()
    const size = mapInstance.getSize()

    if (size.x <= 0 || size.y <= 0) {
      return
    }

    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    const bbox = [sw.lng, sw.lat, ne.lng, ne.lat].join(',')
    const url = self.url as string
    const opacity = self.opacity as number
    const exportUrl = `${url}/export?f=image&format=png32&transparent=true&dpi=96&bboxSR=4326&imageSR=3857&bbox=${encodeURIComponent(bbox)}&size=${size.x},${size.y}`
    const image = new Image()

    image.style.position = 'absolute'
    image.style.width = `${size.x}px`
    image.style.height = `${size.y}px`
    image.style.opacity = String(opacity)
    image.style.pointerEvents = 'none'

    const topLeft = mapInstance.latLngToLayerPoint(bounds.getNorthWest())
    image.style.left = `${topLeft.x}px`
    image.style.top = `${topLeft.y}px`

    image.onload = () => {
      container.innerHTML = ''
      container.appendChild(image)
      self.image = image
    }

    image.onerror = () => {
      showArcgisLoadError(url)
    }

    image.src = exportUrl
  },
})

function showNotice(message: string) {
  noticeMessage.value = message

  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }

  noticeTimer = window.setTimeout(() => {
    noticeMessage.value = ''
  }, 5000)
}

function showArcgisLoadError(url: string) {
  showNotice(`ArcGIS Server 图层加载失败：${url}。请检查 HTTPS 证书、服务权限或 MapServer/export 是否可访问。`)
}

function destroyFieldSurveyViewer() {
  if (fieldSurveyViewer) {
    fieldSurveyViewer.destroy()
    fieldSurveyViewer = null
  }
}

async function openFieldSurveyDialog(survey: FieldSurvey) {
  activeFieldSurvey.value = survey
  await nextTick()

  if (fieldSurveyGalleryRef.value && survey.images.length) {
    destroyFieldSurveyViewer()
    fieldSurveyViewer = new Viewer(fieldSurveyGalleryRef.value, {
      navbar: true,
      title: true,
      toolbar: true,
      transition: true,
      zIndex: 5000,
    })
  }
}

function closeFieldSurveyDialog() {
  activeFieldSurvey.value = null
  destroyFieldSurveyViewer()
}

function openFieldSurveyImage(index: number) {
  fieldSurveyViewer?.view(index)
}

function getDepthColor(depth: number) {
  if (depth < 3) return '#38bdf8'
  if (depth < 6) return '#0ea5e9'
  if (depth < 10) return '#2563eb'
  return '#1e3a8a'
}

function escapeHtml(text: string) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function createDefaultPointName() {
  return `点标注 ${pointDrawings.value.length + 1}`
}

function updatePointDrawing(id: string, patch: Partial<Omit<Map2DPointDrawing, 'id'>>) {
  pointDrawings.value = pointDrawings.value.map((item) =>
    item.id === id
      ? {
          ...item,
          ...patch,
        }
      : item,
  )
}

function createPointAnnotationMarker(drawing: Map2DPointDrawing) {
  const marker = L.marker([drawing.lat, drawing.lng], {
    draggable: true,
    interactive: true,
  })

  marker.bindTooltip(escapeHtml(drawing.name), {
    permanent: true,
    direction: 'top',
    offset: [0, -10],
    opacity: 0.95,
  })
  marker.bindPopup(`点标注：${escapeHtml(drawing.name)}`)

  marker.on('click', (event: L.LeafletMouseEvent) => {
    L.DomEvent.stop(event.originalEvent)
    const current = pointDrawings.value.find((item) => item.id === drawing.id)
    const nextName = window.prompt('请输入点名称：', current?.name ?? drawing.name)

    if (!nextName?.trim()) {
      return
    }

    const name = nextName.trim()
    updatePointDrawing(drawing.id, { name })
    marker.setTooltipContent(escapeHtml(name))
    marker.setPopupContent(`点标注：${escapeHtml(name)}`)
    persist2DState()
  })

  marker.on('dragend', () => {
    const nextPosition = marker.getLatLng()
    updatePointDrawing(drawing.id, {
      lat: nextPosition.lat,
      lng: nextPosition.lng,
    })
    persist2DState()
  })

  return marker
}

function createTextAnnotationMarker(drawing: Map2DTextDrawing) {
  const safeText = escapeHtml(drawing.text)
  const textIcon = L.divIcon({
    className: '',
    html: `<div class="text-marker-label">${safeText}</div>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  })

  const marker = L.marker([drawing.lat, drawing.lng], {
    draggable: true,
    icon: textIcon,
    interactive: true,
  }).bindPopup(`文字标注：${safeText}`)

  marker.on('dragend', () => {
    const nextPosition = marker.getLatLng()
    textDrawings.value = textDrawings.value.map((item) =>
      item.id === drawing.id
        ? {
            ...item,
            lat: nextPosition.lat,
            lng: nextPosition.lng,
          }
        : item,
    )
    persist2DState()
  })

  return marker
}

function formatDistance(points: L.LatLng[]) {
  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    total += points[index - 1].distanceTo(points[index])
  }

  return total >= 1000 ? `${(total / 1000).toFixed(3)} km` : `${total.toFixed(2)} m`
}

function calculateSphericalArea(points: Array<{ lat: number; lng: number }>) {
  if (points.length < 3) {
    return 0
  }

  const earthRadius = 6378137
  const toRadians = Math.PI / 180
  let total = 0

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    total += (next.lng - current.lng) * toRadians * (2 + Math.sin(current.lat * toRadians) + Math.sin(next.lat * toRadians))
  }

  return Math.abs((total * earthRadius * earthRadius) / 2)
}

function formatArea(points: Array<{ lat: number; lng: number }>) {
  const area = calculateSphericalArea(points)

  if (area >= 1000000) {
    return `${(area / 1000000).toFixed(3)} km²`
  }

  if (area >= 10000) {
    return `${(area / 10000).toFixed(3)} ha`
  }

  return `${area.toFixed(2)} m²`
}

function createBaseLayers() {
  baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  })

  baseLayers.gaode = L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      attribution: '© 高德地图',
    },
  )

  baseLayers.gaodeImg = L.layerGroup([
    L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
    }),
    L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
    }),
  ])

  baseLayers.esriImg = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: '© Esri',
    },
  )

  baseLayers.esriTopo = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: '© Esri',
    },
  )

  baseLayers.cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors © CARTO',
  })

  baseLayers.cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors © CARTO',
  })

  baseLayers.esriGray = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 16,
      attribution: '© Esri',
    },
  )

  baseLayers.esriOcean = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 16,
      attribution: '© Esri',
    },
  )

  baseLayers.esriStreet = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: '© Esri',
    },
  )

  baseLayers.gebcoBathymetry = L.tileLayer.wms('https://wms.gebco.net/mapserv', {
    layers: 'GEBCO_LATEST',
    styles: 'default',
    format: 'image/png',
    transparent: false,
    version: '1.3.0',
    attribution: '© GEBCO',
  })

  baseLayers.emodnetBathymetry = L.tileLayer(
    'https://tiles.emodnet-bathymetry.eu/latest/mean_multicolour/web_mercator/{z}/{x}/{y}.png',
    {
      maxZoom: 15,
      attribution: '© EMODnet Bathymetry Consortium',
    },
  )
}

function setLayerOpacity(layer: L.Layer, opacity: number) {
  const mutableLayer = layer as MutableLayer

  mutableLayer.setOpacity?.(opacity)
  mutableLayer.setStyle?.({ opacity, fillOpacity: Math.min(opacity, 0.6) })
  mutableLayer.eachLayer?.((subLayer) => {
    const item = subLayer as MutableLayer

    item.setStyle?.({ opacity, fillOpacity: Math.min(opacity, 0.8) })
    item.setOpacity?.(opacity)
  })
}

function isTemporaryShpLayer(layer: { isTemporaryShp?: boolean }) {
  return Boolean(layer.isTemporaryShp)
}

function getPersistentUiLayers() {
  return uiLayers.value.filter((layer) => !isTemporaryShpLayer(layer))
}

function formatPropertiesHtml(properties: Record<string, unknown> | null | undefined) {
  const entries = Object.entries(properties ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== '')

  if (!entries.length) {
    return '<div>暂无属性</div>'
  }

  return entries
    .map(([key, value]) => `<div><b>${escapeHtml(key)}</b>：${escapeHtml(String(value))}</div>`)
    .join('')
}

function createTemporaryShpLeafletLayer(geojson: GeoJsonFeatureCollection, opacity: number) {
  return L.geoJSON(geojson as Parameters<typeof L.geoJSON>[0], {
    style() {
      return {
        color: '#0f766e',
        weight: 1.5,
        opacity,
        fillColor: '#14b8a6',
        fillOpacity: Math.min(opacity, 0.18),
      }
    },
    pointToLayer(_feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 1,
        color: '#ffffff',
        weight: 0,
        opacity,
        fillColor: '#f97316',
        fillOpacity: Math.min(opacity, 0.9),
      })
    },
    onEachFeature(feature, layer) {
      const typedFeature = feature as GeoJsonFeature
      layer.bindPopup(formatPropertiesHtml(typedFeature.properties))
    },
  })
}

function createTemporaryShpLayerConfig(name: string): UiLayerConfig {
  temporaryShpLayerId += 1

  return {
    id: -temporaryShpLayerId,
    key: `temporary-shp-${temporaryShpLayerId}`,
    name,
    type: '本地 SHP',
    visible: true,
    opacity: 0.85,
    sortOrder: 10000 + temporaryShpLayerId,
    isSystem: false,
    isTemporaryShp: true,
  }
}

function fitTemporaryShpLayer(layer: L.GeoJSON) {
  if (!map) {
    return false
  }

  const bounds = layer.getBounds()

  if (!bounds.isValid()) {
    return false
  }

  map.fitBounds(bounds.pad(0.12), { maxZoom: 14 })
  return true
}

function shouldAskShpProjection(files: File[]) {
  const extensions = files.map((file) => file.name.split('.').pop()?.toLowerCase() ?? '')
  return extensions.includes('shp') && !extensions.includes('zip') && !extensions.includes('prj')
}

function cancelShpProjectionDialog() {
  shpProjectionDialogOpen.value = false
  pendingShpFiles.value = []
  shpProjectionChoice.value = 'auto'

  if (shpFileInput.value) {
    shpFileInput.value.value = ''
  }
}

async function confirmShpProjectionDialog() {
  const files = pendingShpFiles.value
  shpProjectionDialogOpen.value = false
  pendingShpFiles.value = []

  isLoadingShp.value = true

  try {
    await loadSelectedShpFiles(files, shpProjectionChoice.value)
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'SHP 数据解析失败。')
  } finally {
    isLoadingShp.value = false
  }

  if (shpFileInput.value) {
    shpFileInput.value.value = ''
  }
}

async function handleShpFileChangeWithProjection(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  if (!files.length || !map) {
    return
  }

  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  closeActiveTool()

  if (shouldAskShpProjection(files)) {
    pendingShpFiles.value = files
    shpProjectionChoice.value = 'auto'
    shpProjectionDialogOpen.value = true
    showNotice('请选择无 .prj SHP 数据的坐标系。')
    return
  }

  isLoadingShp.value = true

  try {
    await loadSelectedShpFiles(files)
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'SHP 数据解析失败。')
  } finally {
    isLoadingShp.value = false
    input.value = ''
  }
}

async function loadSelectedShpFiles(files: FileList | File[], projectionOverride: ShpProjectionOverride = 'auto') {
  const parsedLayers = await parseShapefileFiles(files, { projectionOverride })
  let fitted = false

  for (const parsedLayer of parsedLayers) {
    const name = createUniqueShpLayerName(parsedLayer.name, uiLayers.value.map((layer) => layer.name))
    const layerConfig = createTemporaryShpLayerConfig(name)
    const leafletLayer = createTemporaryShpLeafletLayer(parsedLayer.geojson, layerConfig.opacity)

    temporaryShpLayers.set(name, leafletLayer)
    businessLayerInstances.set(name, leafletLayer)
    uiLayers.value = uiLayers.value.concat(layerConfig)
    leafletLayer.addTo(map!)

    if (!fitted) {
      fitted = fitTemporaryShpLayer(leafletLayer)
    }
  }

  showNotice(fitted ? 'SHP 鏁版嵁宸插姞杞藉苟瀹氫綅鍒板浘灞傝寖鍥淬€?' : 'SHP 鏁版嵁宸插姞杞斤紝浣嗘湭鎵惧埌鍙畾浣嶈寖鍥淬€?')
}

async function handleShpFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files?.length || !map) {
    return
  }

  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  closeActiveTool()
  isLoadingShp.value = true
  showNotice('正在解析 SHP 数据...')

  try {
    const parsedLayers = await parseShapefileFiles(files)
    let fitted = false

    for (const parsedLayer of parsedLayers) {
      const name = createUniqueShpLayerName(parsedLayer.name, uiLayers.value.map((layer) => layer.name))
      const layerConfig = createTemporaryShpLayerConfig(name)
      const leafletLayer = createTemporaryShpLeafletLayer(parsedLayer.geojson, layerConfig.opacity)

      temporaryShpLayers.set(name, leafletLayer)
      businessLayerInstances.set(name, leafletLayer)
      uiLayers.value = uiLayers.value.concat(layerConfig)
      leafletLayer.addTo(map)

      if (!fitted) {
        fitted = fitTemporaryShpLayer(leafletLayer)
      }
    }

    showNotice(fitted ? 'SHP 数据已加载并定位到图层范围。' : 'SHP 数据已加载，但未找到可定位范围。')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'SHP 数据解析失败。')
  } finally {
    isLoadingShp.value = false
    input.value = ''
  }
}

function openShpFilePicker() {
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  shpFileInput.value?.click()
}

function createBusinessLayers(config: MapConfigResponse) {
  if (!map) {
    return
  }

  drawnLayer = L.layerGroup().addTo(map)

  const studyAreaLayer = L.polygon(config.studyArea as L.LatLngExpression[], {
    color: '#f97316',
    weight: 2,
    fillColor: '#fb923c',
    fillOpacity: 0.18,
  }).bindPopup('黄河三角洲近岸水深研究区')

  const depthPointLayer = L.layerGroup(
    config.depthData.map((item) =>
      L.circleMarker([item.lat, item.lng], {
        radius: 7,
        color: '#fff',
        weight: 1,
        fillColor: getDepthColor(item.depth),
        fillOpacity: 0.9,
      }).bindPopup(`<b>水深测点：${item.id}</b><br>经度：${item.lng}<br>纬度：${item.lat}<br>水深：${item.depth} m`),
    ),
  )

  const surveyLineLayer = L.polyline(
    config.depthData.map((item) => [item.lat, item.lng]),
    {
      color: '#22c55e',
      weight: 3,
      dashArray: '8,8',
    },
  ).bindPopup('无人船单波束测深航线')

  const fieldSurveyLayer = L.markerClusterGroup({
    chunkedLoading: true,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 15,
  })

  fieldSurveys.value.forEach((survey) => {
    const marker = L.marker([survey.latitude, survey.longitude])
    marker.on('click', () => openFieldSurveyDialog(survey))
    fieldSurveyLayer.addLayer(marker)
  })

  const monitoringPointLayer = L.layerGroup(
    config.monitoringPoints.map((point) =>
      L.circleMarker([point.latitude, point.longitude], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.88,
      }).bindPopup(
        `<b>${escapeHtml(point.pointName)}</b><br>监测时间：${escapeHtml(point.monitoredAt)}<br>地下水高程：${point.elevation.toFixed(3)} m<br>经度：${point.longitude.toFixed(6)}<br>纬度：${point.latitude.toFixed(6)}${point.sourceFile ? `<br>来源文件：${escapeHtml(point.sourceFile)}` : ''}`,
      ),
    ),
  )

  businessLayerInstances.set('研究区范围', studyAreaLayer)
  businessLayerInstances.set('水深测点', depthPointLayer)
  businessLayerInstances.set('无人船测深航线', surveyLineLayer)
  businessLayerInstances.set('野外考察', fieldSurveyLayer)
  businessLayerInstances.set('监测位置', monitoringPointLayer)

  if (drawnLayer) {
    businessLayerInstances.set('绘制图层', drawnLayer)
  }

  config.layers.forEach((layer) => {
    if (businessLayerInstances.has(layer.name) || !layer.isArcGISServer || !layer.url) {
      return
    }

    businessLayerInstances.set(layer.name, new ArcGISDynamicLayer(layer.url, { opacity: layer.opacity }))
  })

  config.layers.forEach((layer) => {
    const instance = businessLayerInstances.get(layer.name)

    if (!instance || !map) {
      return
    }

    if (layer.visible) {
      instance.addTo(map)
    }

    setLayerOpacity(instance, layer.opacity)
  })
}

function changeBaseLayer(layerName: string) {
  if (!map) {
    return
  }

  const nextLayer = baseLayers[layerName]

  if (!nextLayer || nextLayer === currentBaseLayer) {
    return
  }

  if (currentBaseLayer) {
    map.removeLayer(currentBaseLayer)
  }

  currentBaseLayer = nextLayer
  selectedBasemap.value = layerName
  currentBaseLayer.addTo(map)

  window.setTimeout(() => {
    map?.invalidateSize()
  }, 100)
}

function toggleLayer(index: number) {
  if (!map) {
    return
  }

  const layer = uiLayers.value[index]
  const instance = businessLayerInstances.get(layer.name)

  if (!instance) {
    return
  }

  if (layer.visible) {
    instance.addTo(map)
  } else {
    map.removeLayer(instance)
  }
}

function updateOpacity(index: number) {
  const layer = uiLayers.value[index]
  const instance = businessLayerInstances.get(layer.name)

  if (!instance) {
    return
  }

  setLayerOpacity(instance, layer.opacity)
}

function clearTempLayerOnly() {
  if (map && tempLayer) {
    map.removeLayer(tempLayer)
    tempLayer = null
  }

  if (map && freehandPreviewLayer) {
    map.removeLayer(freehandPreviewLayer)
    freehandPreviewLayer = null
  }
}

function finishCurrentDrawing() {
  if (!drawnLayer || !currentTool.value) {
    return
  }

  if (currentTool.value === 'line' && tempPoints.length >= 2) {
    clearTempLayerOnly()
    L.polyline(tempPoints, { color: '#ef4444', weight: 3 }).bindPopup('自定义线标注').addTo(drawnLayer)
  }

  if (currentTool.value === 'polygon' && tempPoints.length >= 3) {
    clearTempLayerOnly()
    L.polygon(tempPoints, { color: '#9333ea', weight: 2, fillColor: '#c084fc', fillOpacity: 0.25 })
      .bindPopup('自定义面标注')
      .addTo(drawnLayer)
  }

  if (currentTool.value === 'measure' && tempPoints.length >= 2) {
    clearTempLayerOnly()
    L.polyline(tempPoints, { color: '#f97316', weight: 3 })
      .bindPopup(`测距结果：${formatDistance(tempPoints)}`)
      .addTo(drawnLayer)
  }

  if (currentTool.value === 'areaMeasure' && tempPoints.length >= 3) {
    clearTempLayerOnly()
    L.polygon(tempPoints, { color: '#f97316', weight: 2, fillColor: '#fdba74', fillOpacity: 0.22 })
      .bindPopup(`面积测量结果：${formatArea(tempPoints)}`)
      .addTo(drawnLayer)
  }

  if (currentTool.value === 'freehand' && tempPoints.length >= 2) {
    clearTempLayerOnly()
    L.polyline(tempPoints, {
      color: freehandColor.value,
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    })
      .bindPopup('自由画笔')
      .addTo(drawnLayer)
  }

  tempPoints = []
}

function stopTool() {
  currentTool.value = null
  toolTip.value = ''
  tempPoints = []
  isFreehandDrawing = false
  freehandPreviewLayer = null
  map?.dragging.enable()
  clearTempLayerOnly()
}

function closeActiveTool() {
  if ((currentTool.value === 'line' || currentTool.value === 'polygon' || currentTool.value === 'measure' || currentTool.value === 'areaMeasure' || currentTool.value === 'freehand') && tempPoints.length > 0) {
    finishCurrentDrawing()
  }

  stopTool()
}

function setTool(toolName: Exclude<ToolName, null>) {
  if (currentTool.value === toolName) {
    finishCurrentDrawing()
    stopTool()
    return
  }

  if ((currentTool.value === 'line' || currentTool.value === 'polygon' || currentTool.value === 'measure' || currentTool.value === 'areaMeasure') && tempPoints.length > 0) {
    finishCurrentDrawing()
  } else {
    clearTempLayerOnly()
  }

  currentTool.value = toolName
  tempPoints = []
  activePanel.value = null
  drawingToolsOpen.value = isGroupedDrawingTool(toolName) ? drawingToolsOpen.value : false
  measurementToolsOpen.value = isGroupedMeasurementTool(toolName) ? measurementToolsOpen.value : false

  const messages: Record<Exclude<ToolName, null>, string> = {
    marker: '点击地图添加点标注；再次点击点标注按钮关闭。',
    text: '点击地图添加文字标注；再次点击文字标注按钮关闭。',
    line: '连续点击绘制线，双击结束；再次点击线标注按钮关闭并保留当前线。',
    polygon: '连续点击绘制面，双击结束；再次点击面标注按钮关闭并保留当前面。',
    freehand: '按住鼠标拖动绘制自由线条，松开结束；再次点击自由画笔按钮关闭。',
    measure: '连续点击测距，双击结束；再次点击测距按钮关闭并保留结果。',
    areaMeasure: '连续点击绘制测量范围，双击结束；再次点击面积测量按钮关闭并保留结果。',
  }

  toolTip.value = messages[toolName]
}

function toggleDrawingTools() {
  drawingToolsOpen.value = !drawingToolsOpen.value
  measurementToolsOpen.value = false
  activePanel.value = null
}

function toggleMeasurementTools() {
  measurementToolsOpen.value = !measurementToolsOpen.value
  drawingToolsOpen.value = false
  activePanel.value = null
}

function togglePanel(panelName: 'basemap' | 'bookmark') {
  const nextPanel = activePanel.value === panelName ? null : panelName

  if (nextPanel) {
    closeActiveTool()
    drawingToolsOpen.value = false
    measurementToolsOpen.value = false
  }

  activePanel.value = nextPanel
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value

  window.setTimeout(() => {
    map?.invalidateSize()
  }, 300)
}

function goHome() {
  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  closeActiveTool()
  map?.setView([35, 104], 5)
}

function getMapStateScope() {
  return loginUserText.value || getStoredLoginUser() || 'anonymous'
}

function createDefault2DState(config: MapConfigResponse): Map2DViewState {
  return {
    center: { ...DEFAULT_2D_VIEW.center },
    zoom: DEFAULT_2D_VIEW.zoom,
    basemap: DEFAULT_2D_VIEW.basemap,
    layers: snapshotLayers(
      config.layers.map((layer) => ({
        name: layer.name,
        visible: layer.visible,
        opacity: Number(layer.opacity ?? 1),
      })),
    ),
    pointDrawings: [],
    textDrawings: [],
    sidebarOpen: false,
    activePanel: null,
  }
}

function createCurrent2DState(): Map2DViewState | null {
  if (!map) {
    return null
  }

  const center = map.getCenter()

  return {
    center: {
      lat: center.lat,
      lng: center.lng,
    },
    zoom: map.getZoom(),
    basemap: selectedBasemap.value,
    layers: snapshotLayers(getPersistentUiLayers()),
    pointDrawings: pointDrawings.value.map((drawing) => ({ ...drawing })),
    textDrawings: textDrawings.value.map((drawing) => ({ ...drawing })),
    sidebarOpen: sidebarOpen.value,
    activePanel: activePanel.value,
  }
}

function persist2DState() {
  const state = createCurrent2DState()

  if (!state) {
    return
  }

  save2DViewState(getMapStateScope(), state)
}

function resolveInitial2DState(config: MapConfigResponse) {
  const scope = getMapStateScope()
  const stored2D = read2DViewState(scope)

  if (readLastMapSource(scope) === '3d') {
    const stored3D = read3DViewState(scope)

    if (stored3D) {
      return {
        ...derive2DStateFrom3D(stored3D),
        pointDrawings: stored2D?.pointDrawings?.map((drawing) => ({ ...drawing })) ?? [],
        textDrawings: stored2D?.textDrawings?.map((drawing) => ({ ...drawing })) ?? [],
      }
    }
  }

  if (stored2D) {
    return stored2D
  }

  return createDefault2DState(config)
}

function switchTo3D() {
  persist2DState()
  saveLastMapSource(getMapStateScope(), '2d')
  router.push('/map-3d')
}

function clearDrawings() {
  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  drawnLayer?.clearLayers()
  pointDrawings.value = []
  textDrawings.value = []
  stopTool()
  persist2DState()
}

async function printMap() {
  if (!mapElement.value || !map) {
    return
  }

  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  finishCurrentDrawing()
  stopTool()
  map.invalidateSize()

  const cleanupPrintMode = () => {
    document.body.classList.remove('map-print-mode')
    window.removeEventListener('afterprint', cleanupPrintMode)
    window.setTimeout(() => {
      map?.invalidateSize()
    }, 0)
  }

  document.body.classList.add('map-print-mode')
  window.addEventListener('afterprint', cleanupPrintMode)

  window.setTimeout(() => {
    map?.invalidateSize()
    window.print()
    window.setTimeout(cleanupPrintMode, 1200)
  }, 250)
}

function goToBookmark(bookmark: Bookmark) {
  map?.setView([bookmark.lat, bookmark.lng], bookmark.zoom)
  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
}

function handleLogout() {
  shouldPersistOnUnmount = false
  clearMapViewState(getMapStateScope())
  clearToken()
  clearLoginState()
  router.push('/login')
}

function activateDashboardPage() {
  document.body.classList.add('page-dashboard')

  window.setTimeout(() => {
    map?.invalidateSize()
  }, 0)
}

function deactivateDashboardPage() {
  if (shouldPersistOnUnmount) {
    persist2DState()
  }

  document.body.classList.remove('page-dashboard')
}

async function loadMap() {
  if (!mapElement.value) {
    return
  }

  const [config, surveys] = await Promise.all([fetchMapConfig(), fetchFieldSurveys()])
  const normalizedConfig = {
    ...config,
    layers: normalizeLayerConfigs(config.layers),
  }
  const initialViewState = resolveInitial2DState(normalizedConfig)

  mapConfig.value = normalizedConfig
  fieldSurveys.value = surveys
  loginUserText.value = mapConfig.value.user.displayName
  selectedBasemap.value = initialViewState.basemap
  sidebarOpen.value = initialViewState.sidebarOpen
  activePanel.value = initialViewState.activePanel
  uiLayers.value = mergeLayerSnapshots(
    mapConfig.value.layers.map((layer) => ({
      ...layer,
      opacity: Number(layer.opacity ?? 1),
    })),
    initialViewState.layers,
  )
  createBaseLayers()

  map = L.map(mapElement.value, {
    center: [initialViewState.center.lat, initialViewState.center.lng],
    zoom: initialViewState.zoom,
    minZoom: 2,
    maxZoom: 18,
    doubleClickZoom: false,
  })

  currentBaseLayer = baseLayers[selectedBasemap.value] ?? baseLayers.osm
  currentBaseLayer.addTo(map)
  createBusinessLayers(mapConfig.value)
  pointDrawings.value = initialViewState.pointDrawings?.map((drawing) => ({ ...drawing })) ?? []
  pointDrawings.value.forEach((drawing) => {
    createPointAnnotationMarker(drawing).addTo(drawnLayer as L.LayerGroup)
  })
  textDrawings.value = initialViewState.textDrawings?.map((drawing) => ({ ...drawing })) ?? []
  textDrawings.value.forEach((drawing) => {
    createTextAnnotationMarker(drawing).addTo(drawnLayer as L.LayerGroup)
  })

  map.on('click', (event: L.LeafletMouseEvent) => {
    if (!currentTool.value || !drawnLayer) {
      return
    }

    if (currentTool.value === 'freehand') {
      return
    }

    if (currentTool.value === 'marker') {
      const drawing = {
        id: `point-${Date.now()}`,
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        name: createDefaultPointName(),
      }

      pointDrawings.value = pointDrawings.value.concat(drawing)
      createPointAnnotationMarker(drawing).addTo(drawnLayer)
      persist2DState()
      return
    }

    if (currentTool.value === 'text') {
      const text = window.prompt('请输入文字标注内容：')

      if (!text || !text.trim()) {
        return
      }

      const drawing = {
        id: `text-${Date.now()}`,
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        text: text.trim(),
      }

      textDrawings.value = textDrawings.value.concat(drawing)
      createTextAnnotationMarker(drawing).addTo(drawnLayer)
      persist2DState()
      return
    }

    tempPoints.push(event.latlng)
    clearTempLayerOnly()

    if (currentTool.value === 'line' || currentTool.value === 'measure') {
      tempLayer = L.polyline(tempPoints, {
        color: currentTool.value === 'measure' ? '#f97316' : '#ef4444',
        weight: 3,
      }).addTo(map as L.Map)

      if (currentTool.value === 'measure' && tempPoints.length > 1) {
        toolTip.value = `当前距离：${formatDistance(tempPoints)}；双击结束`
      }
    }

    if (currentTool.value === 'polygon' || currentTool.value === 'areaMeasure') {
      tempLayer = L.polygon(tempPoints, {
        color: currentTool.value === 'areaMeasure' ? '#f97316' : '#9333ea',
        weight: 2,
        fillColor: currentTool.value === 'areaMeasure' ? '#fdba74' : '#c084fc',
        fillOpacity: 0.18,
      }).addTo(map as L.Map)

      if (currentTool.value === 'areaMeasure' && tempPoints.length > 2) {
        toolTip.value = `当前面积：${formatArea(tempPoints)}；双击结束`
      }
    }
  })

  map.on('dblclick', () => {
    finishCurrentDrawing()
    stopTool()
  })

  map.on('mousedown', (event: L.LeafletMouseEvent) => {
    if (currentTool.value !== 'freehand' || !drawnLayer || !map) {
      return
    }

    isFreehandDrawing = true
    tempPoints = [event.latlng]
    clearTempLayerOnly()
    map.dragging.disable()
    freehandPreviewLayer = L.polyline(tempPoints, {
      color: freehandColor.value,
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)
    toolTip.value = '拖动绘制自由线条，松开结束'
  })

  map.on('mousemove', (event: L.LeafletMouseEvent) => {
    coordText.value = `经度：${event.latlng.lng.toFixed(6)}，纬度：${event.latlng.lat.toFixed(6)}，缩放级别：${map?.getZoom() ?? '--'}`

    if (currentTool.value !== 'freehand' || !isFreehandDrawing || !map) {
      return
    }

    const lastPoint = tempPoints[tempPoints.length - 1]

    if (lastPoint && lastPoint.distanceTo(event.latlng) < 3) {
      return
    }

    tempPoints.push(event.latlng)
    freehandPreviewLayer?.setLatLngs(tempPoints)
  })

  map.on('mouseup', () => {
    if (currentTool.value !== 'freehand' || !isFreehandDrawing) {
      return
    }

    isFreehandDrawing = false
    map?.dragging.enable()
    finishCurrentDrawing()
  })

  L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map)
  await nextTick()
  map.invalidateSize()
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台'
  activateDashboardPage()

  try {
    await loadMap()
  } catch {
    clearToken()
    router.push('/login')
  }
})

onActivated(() => {
  document.title = '海岸带时空水深数据平台'
  activateDashboardPage()
})

onDeactivated(() => {
  deactivateDashboardPage()
})

onBeforeUnmount(() => {
  deactivateDashboardPage()
  destroyFieldSurveyViewer()

  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }

  map?.remove()
})
</script>

<style scoped>
.map2d-header {
  gap: 16px;
}

.map2d-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.map2d-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.map2d-title-group h1 {
  margin: 0;
}

.map2d-header-actions {
  gap: 10px;
  flex-wrap: wrap;
}

.map2d-mode-btn {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
}

#map.freehand-cursor,
#map.freehand-cursor :deep(.leaflet-pane),
#map.freehand-cursor :deep(.leaflet-overlay-pane),
#map.freehand-cursor :deep(.leaflet-marker-pane),
#map.freehand-cursor :deep(.leaflet-interactive) {
  cursor: crosshair !important;
}

.shp-file-input {
  display: none;
}

.shp-projection-mask {
  position: fixed;
  inset: 0;
  z-index: 4200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.42);
}

.shp-projection-dialog {
  width: min(520px, 100%);
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32);
  overflow: hidden;
}

.shp-projection-header,
.shp-projection-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
}

.shp-projection-header h3 {
  margin: 0;
  font-size: 18px;
}

.shp-projection-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #334155;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.shp-projection-body {
  display: grid;
  gap: 10px;
  max-height: min(54vh, 440px);
  overflow-y: auto;
  padding: 16px 18px;
}

.shp-projection-option {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
}

.shp-projection-option strong,
.shp-projection-option small {
  display: block;
}

.shp-projection-option small {
  margin-top: 4px;
  color: #64748b;
  line-height: 1.4;
}

.shp-projection-actions {
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
  border-bottom: none;
}

.shp-projection-primary,
.shp-projection-secondary {
  min-width: 76px;
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}

.shp-projection-primary {
  background: #2563eb;
  color: #ffffff;
}

.shp-projection-secondary {
  background: #e2e8f0;
  color: #0f172a;
}

.drawing-tool-panel,
.measurement-tool-panel,
.freehand-color-panel {
  position: absolute;
  top: 144px;
  right: 74px;
  z-index: 1600;
  grid-template-columns: repeat(2, 42px);
  gap: 8px;
  width: 108px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.28);
}

.measurement-tool-panel {
  top: 228px;
  grid-template-columns: repeat(2, 42px);
}

.freehand-color-panel {
  top: 186px;
  grid-template-columns: repeat(4, 28px);
  gap: 8px;
  width: auto;
  padding: 10px;
}

.freehand-color-option {
  width: 28px;
  height: 28px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.2);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.freehand-color-option:hover,
.freehand-color-option.active {
  transform: scale(1.08);
  box-shadow: 0 0 0 3px #2563eb;
}

.drawing-tool-option,
.measurement-tool-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.18s ease;
}

.drawing-tool-option:hover,
.drawing-tool-option.active,
.measurement-tool-option:hover,
.measurement-tool-option.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.drawing-tool-option:disabled,
.measurement-tool-option:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

:global(.map-print-mode) {
  background: #fff !important;
}

:global(.map-print-mode .header),
:global(.map-print-mode .sidebar),
:global(.map-print-mode .toolbar),
:global(.map-print-mode .drawing-tool-panel),
:global(.map-print-mode .measurement-tool-panel),
:global(.map-print-mode .freehand-color-panel),
:global(.map-print-mode .basemap-panel),
:global(.map-print-mode .bookmark-panel),
:global(.map-print-mode .tip),
:global(.map-print-mode .coord-box),
:global(.map-print-mode .notice),
:global(.map-print-mode .shp-projection-mask),
:global(.map-print-mode .survey-dialog-mask) {
  display: none !important;
}

:global(.map-print-mode .dashboard-root),
:global(.map-print-mode .main) {
  width: 100vw !important;
  height: 100vh !important;
  min-height: 100vh !important;
  background: #fff !important;
}

:global(.map-print-mode #map) {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 1 !important;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  :global(html),
  :global(body),
  :global(#app) {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
    background: #fff !important;
  }
}

@media (max-width: 960px) {
  .map2d-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .map2d-header-left {
    width: 100%;
    align-items: flex-start;
  }

  .map2d-title-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
