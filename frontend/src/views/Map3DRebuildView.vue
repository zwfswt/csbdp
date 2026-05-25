<template>
  <div class="map3d-rebuild-root">
    <div class="header map3d-header">
      <div class="map3d-header-left">
        <button id="sidebarToggle3d" class="map-directory-toggle" title="打开/关闭数据目录" @click="toggleSidebar">
          <i class="fa-solid fa-bars"></i>
        </button>

        <div class="map3d-title-group">
          <h1>海岸带时空水深数据平台</h1>
          <button type="button" class="map2d-mode-btn" @click="switchTo2D">切换到二维地图</button>
        </div>
      </div>

      <div class="header-user map3d-header-actions">
        <span id="loginUserText">{{ loginUserText }}</span>
        <button id="logoutBtn" title="退出登录" @click="handleLogout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <div class="main map3d-main">
      <div
        ref="viewerElement"
        class="map3d-canvas"
        :class="{ 'map3d-canvas-hidden': Boolean(sceneError), 'freehand-cursor': currentTool === 'freehand' }"
      ></div>

      <aside id="sidebar" class="sidebar map3d-sidebar" :class="{ open: sidebarOpen }">
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

      <div v-if="isLoading" class="map3d-overlay">
        <div class="map3d-overlay-card">
          <div class="map3d-panel-kicker">Loading</div>
          <h2>正在初始化三维场景</h2>
          <p>正在加载基础配置与底图资源。</p>
        </div>
      </div>

      <div v-else-if="sceneError" class="map3d-overlay">
        <div class="map3d-overlay-card">
          <div class="map3d-panel-kicker">Fallback</div>
          <h2>三维场景暂时不可用</h2>
          <p>{{ sceneError }}</p>
          <div class="map3d-overlay-actions">
            <button type="button" class="map3d-action-btn" @click="switchTo2D">切换到二维地图</button>
            <button type="button" class="map3d-action-btn map3d-action-btn-secondary" @click="loadScene">重新尝试</button>
          </div>
        </div>
      </div>

      <div v-if="!sceneError" class="toolbar map3d-toolbar">
        <button id="homeBtn" class="tool-btn map3d-tool-btn" title="回到研究区" @click="goHome">
          <i class="fa-solid fa-house"></i>
        </button>

        <button id="basemapBtn" class="tool-btn map3d-tool-btn" :class="{ active: activePanel === 'basemap' }" title="底图切换" @click="togglePanel('basemap')">
          <i class="fa-solid fa-layer-group"></i>
        </button>

        <button id="bookmarkBtn" class="tool-btn map3d-tool-btn" :class="{ active: activePanel === 'bookmark' }" title="空间书签" @click="togglePanel('bookmark')">
          <i class="fa-regular fa-bookmark"></i>
        </button>

        <button id="shpLoadBtn3d" class="tool-btn map3d-tool-btn" title="加载 SHP 数据" :disabled="isLoadingShp" @click="openShpFilePicker">
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
                <input v-model="shpProjectionChoice" type="radio" name="shpProjection3d" :value="option.value" />
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

        <button id="drawingBtn3d" class="tool-btn map3d-tool-btn" :class="{ active: drawingToolsOpen || isDrawingToolActive }" title="绘图工具" @click="toggleDrawingTools">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>

        <button id="freehandBtn" class="tool-btn map3d-tool-btn" :class="{ active: currentTool === 'freehand' }" title="自由画笔" @click="setTool('freehand')">
          <i class="fa-solid fa-pencil"></i>
        </button>

        <button id="measurementBtn3d" class="tool-btn map3d-tool-btn" :class="{ active: measurementToolsOpen || isMeasurementToolActive }" title="测量工具" @click="toggleMeasurementTools">
          <i class="fa-solid fa-ruler-combined"></i>
        </button>

        <button id="clearBtn" class="tool-btn map3d-tool-btn" title="清除标注" @click="clearDrawings">
          <i class="fa-solid fa-trash-can"></i>
        </button>

        <button id="printBtn" class="tool-btn map3d-tool-btn" title="打印当前地图" @click="printMap">
          <i class="fa-solid fa-print"></i>
        </button>
      </div>

      <div class="drawing-tool-panel map3d-drawing-tool-panel" :style="{ display: drawingToolsOpen ? 'grid' : 'none' }">
        <button class="drawing-tool-option" :class="{ active: currentTool === 'marker' }" title="点标注" :disabled="!supportsPointEntities" @click="setTool('marker')">
          <i class="fa-solid fa-location-dot"></i>
        </button>
        <button class="drawing-tool-option" :class="{ active: currentTool === 'text' }" title="文字标注" :disabled="!supportsPointEntities" @click="setTool('text')">
          <i class="fa-solid fa-font"></i>
        </button>
        <button class="drawing-tool-option" :class="{ active: currentTool === 'line' }" title="线标注" @click="setTool('line')">
          <i class="fa-solid fa-route"></i>
        </button>
        <button class="drawing-tool-option" :class="{ active: currentTool === 'polygon' }" title="面标注" @click="setTool('polygon')">
          <i class="fa-regular fa-square"></i>
        </button>
      </div>

      <div class="measurement-tool-panel map3d-measurement-tool-panel" :style="{ display: measurementToolsOpen ? 'grid' : 'none' }">
        <button class="measurement-tool-option" :class="{ active: currentTool === 'measure' }" title="距离测量" @click="setTool('measure')">
          <i class="fa-solid fa-ruler"></i>
        </button>
        <button class="measurement-tool-option" :class="{ active: currentTool === 'areaMeasure' }" title="面积测量" @click="setTool('areaMeasure')">
          <i class="fa-solid fa-vector-square"></i>
        </button>
      </div>

      <div class="freehand-color-panel map3d-freehand-color-panel" :style="{ display: currentTool === 'freehand' ? 'grid' : 'none' }" aria-label="自由画笔颜色">
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

      <div id="basemapPanel" class="basemap-panel map3d-basemap-panel" :style="{ display: activePanel === 'basemap' ? 'block' : 'none' }">
        <h3>底图切换</h3>
        <label v-for="option in basemapOptions" :key="option.value">
          <input v-model="selectedBasemap" type="radio" name="basemap" :value="option.value" @change="changeBasemap(option.value)" />
          {{ option.label }}
        </label>
      </div>

      <div id="bookmarkPanel" class="bookmark-panel map3d-bookmark-panel" :style="{ display: activePanel === 'bookmark' ? 'block' : 'none' }">
        <div class="bookmark-title">空间书签</div>
        <div id="bookmarkList">
          <button v-for="bookmark in bookmarks" :key="bookmark.name" class="bookmark-item" @click="goToBookmark(bookmark)">
            <i class="fa-regular fa-bookmark"></i>
            <span>{{ bookmark.name }}</span>
          </button>
        </div>
      </div>

      <div
        v-if="selectedInfoHtml && !activeFieldSurvey && !sceneError"
        class="map3d-info-panel"
        :style="{ left: `${selectedInfoPosition.x}px`, top: `${selectedInfoPosition.y}px` }"
      >
        <div class="map3d-info-card">
          <button type="button" class="map3d-info-close" title="关闭" @click="clearSelectedInfo">×</button>
          <div class="map3d-info-title">{{ selectedInfoTitle }}</div>
          <div class="map3d-info-content" v-html="selectedInfoHtml"></div>
        </div>
      </div>

      <div id="tip" class="tip map3d-tool-tip" :style="{ display: toolTip && !sceneError ? 'block' : 'none' }">{{ toolTip }}</div>

      <div v-if="textPanelOpen && pendingTextAnchor && !sceneError" class="map3d-text-panel">
        <div class="map3d-text-panel-title">文字标注</div>
        <div class="map3d-text-panel-coord">经度：{{ pendingTextAnchor.lng.toFixed(6) }}，纬度：{{ pendingTextAnchor.lat.toFixed(6) }}</div>
        <textarea v-model="textDraft" class="map3d-text-panel-input" rows="3" maxlength="120" placeholder="请输入标注文字"></textarea>
        <div class="map3d-text-panel-actions">
          <button type="button" class="map3d-action-btn map3d-action-btn-secondary" @click="cancelTextInput">取消</button>
          <button type="button" class="map3d-action-btn" @click="confirmTextInput">确认</button>
        </div>
      </div>

      <div id="coordBox" class="coord-box map3d-coord-box">{{ coordText }}</div>
      <div id="notice" class="notice" :style="{ display: noticeMessage ? 'block' : 'none' }">{{ noticeMessage }}</div>
      <div v-if="statusText && !sceneError" class="map3d-status-chip">{{ statusText }}</div>

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
import html2canvas from 'html2canvas'
import { isAxiosError } from 'axios'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import {
  ArcGisMapServerImageryProvider,
  ArcGISTiledElevationTerrainProvider,
  Cartesian2,
  Cartesian3,
  Color,
  CustomDataSource,
  EllipsoidTerrainProvider,
  HeightReference,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  PolygonHierarchy,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  Viewer as CesiumViewer,
  WebMercatorTilingScheme,
  WebMapServiceImageryProvider,
  createWorldTerrainAsync,
} from 'cesium'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ViewerJs from 'viewerjs'
import {
  fetchFieldSurveys,
  clearLoginState,
  clearToken,
  fetchMapConfig,
  getStoredCurrentUser,
  getStoredLoginUser,
  type Bookmark,
  type BusinessLayerConfig,
  type FieldSurvey,
  type MapConfigResponse,
} from '../services/api'
import {
  derive3DStateFrom2D,
  mergeLayerSnapshots,
  read2DViewState,
  read3DViewState,
  readLastMapSource,
  save3DViewState,
  saveLastMapSource,
  snapshotLayers,
  type Map3DDrawingFeature,
  type MapDrawingPoint,
  type Map3DViewState,
} from '../utils/mapViewState'
import { normalizeLayerConfigs } from '../utils/layerConfig'
import { createUniqueShpLayerName, parseShapefileFiles, SHP_PROJECTION_OPTIONS, type GeoJsonFeature, type GeoJsonFeatureCollection, type GeoJsonGeometry, type ShpProjectionOverride } from '../utils/shapefile'

type BasemapKey =
  | 'osm'
  | 'esriImg'
  | 'esriTopo'
  | 'cartoLight'
  | 'cartoDark'
  | 'esriGray'
  | 'esriOcean'
  | 'esriStreet'
  | 'gebcoBathymetry'
  | 'emodnetBathymetry'
type ToolName = 'marker' | 'text' | 'line' | 'polygon' | 'freehand' | 'measure' | 'areaMeasure' | null
type UiLayerConfig = BusinessLayerConfig & { isTemporaryShp?: boolean }
type ShpBounds = {
  west: number
  south: number
  east: number
  north: number
}

type BasemapOption = {
  value: BasemapKey
  label: string
}

const router = useRouter()
const viewerElement = ref<HTMLElement | null>(null)
const shpFileInput = ref<HTMLInputElement | null>(null)
const isLoading = ref(false)
const isLoadingShp = ref(false)
const sceneError = ref('')
const statusText = ref('')
const coordText = ref('经度：--，纬度：--，镜头高度：--')
const selectedInfoTitle = ref('')
const selectedInfoHtml = ref('')
const selectedInfoPosition = ref({ x: 18, y: 18 })
const terrainStatus = ref('椭球地形')
const currentTool = ref<ToolName>(null)
const drawingToolsOpen = ref(false)
const measurementToolsOpen = ref(false)
const freehandColor = ref('#0f766e')
const supportsBusinessOverlays = ref(true)
const supportsPointEntities = ref(true)
const toolTip = ref('')
const textDraft = ref('')
const textPanelOpen = ref(false)
const pendingTextAnchor = ref<MapDrawingPoint | null>(null)
const drawingFeatures = ref<Map3DDrawingFeature[]>([])
const tempPoints = ref<MapDrawingPoint[]>([])
const mapConfig = ref<MapConfigResponse | null>(null)
const fieldSurveys = ref<FieldSurvey[]>([])
const selectedBasemap = ref<BasemapKey>('osm')
const uiLayers = ref<UiLayerConfig[]>([])
const sidebarOpen = ref(false)
const activePanel = ref<'basemap' | 'bookmark' | null>(null)
const noticeMessage = ref('')
const shpProjectionDialogOpen = ref(false)
const shpProjectionChoice = ref<ShpProjectionOverride>('auto')
const pendingShpFiles = ref<File[]>([])
const activeFieldSurvey = ref<FieldSurvey | null>(null)
const fieldSurveyGalleryRef = ref<HTMLElement | null>(null)

let viewer: CesiumViewer | null = null
let coordHandler: ScreenSpaceEventHandler | null = null
let drawingDataSource: CustomDataSource | null = null
let previewDataSource: CustomDataSource | null = null
let renderFrameId: number | null = null
let noticeTimer: number | null = null
let fieldSurveyViewer: ViewerJs | null = null

const shpProjectionOptions = SHP_PROJECTION_OPTIONS
let isFreehandDrawing = false
let draggingTextFeatureId: string | null = null
let temporaryShpLayerId = 0
const overlayRegistry = new Map<string, { setVisible: (visible: boolean) => void; setOpacity: (opacity: number) => void }>()
const arcGisOverlayLoads = new Map<string, Promise<void>>()
const temporaryShpDataSources = new Map<string, CustomDataSource>()

const basemapOptions: BasemapOption[] = [
  { value: 'osm', label: 'OpenStreetMap' },
  { value: 'esriImg', label: 'ArcGIS 影像' },
  { value: 'esriTopo', label: 'ArcGIS 地形' },
  { value: 'cartoLight', label: 'CARTO 浅色' },
  { value: 'cartoDark', label: 'CARTO 深色' },
  { value: 'esriGray', label: 'Esri 灰色画布' },
  { value: 'esriOcean', label: 'Esri 海洋' },
  { value: 'esriStreet', label: 'Esri 街道' },
  { value: 'gebcoBathymetry', label: 'GEBCO 全球水深' },
  { value: 'emodnetBathymetry', label: 'EMODnet 水深（欧洲海域）' },
]

const freehandColorOptions = ['#0f766e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#2563eb', '#7c3aed', '#111827']

const ARCGIS_TERRAIN_URL = 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
const TERRAIN_EXAGGERATION = 1.8
const BOOKMARK_FLIGHT_DURATION = 3.2

const loginUserText = computed(() => getStoredLoginUser() ?? 'admin')
const bookmarks = computed(() => mapConfig.value?.bookmarks ?? [])
const currentUserScope = computed(() => getStoredCurrentUser()?.username ?? null)
const isDrawingToolActive = computed(() => currentTool.value === 'marker' || currentTool.value === 'text' || currentTool.value === 'line' || currentTool.value === 'polygon')
const isMeasurementToolActive = computed(() => currentTool.value === 'measure' || currentTool.value === 'areaMeasure')

function isGroupedDrawingTool(toolName: ToolName) {
  return toolName === 'marker' || toolName === 'text' || toolName === 'line' || toolName === 'polygon'
}

function isGroupedMeasurementTool(toolName: ToolName) {
  return toolName === 'measure' || toolName === 'areaMeasure'
}

function setDebugViewer(nextViewer: CesiumViewer | null) {
  if (!import.meta.env.DEV) {
    return
  }

  ;(window as Window & { __CSBDP_3D_VIEWER__?: CesiumViewer | null }).__CSBDP_3D_VIEWER__ = nextViewer
}

function switchTo2D() {
  persistViewState()
  saveLastMapSource(currentUserScope.value, '3d')
  router.push('/map-2d')
}

function handleLogout() {
  clearToken()
  clearLoginState()
  router.push('/login')
}

function normalizeStudyAreaPoint(point: number[]) {
  if (point.length < 2) {
    return null
  }

  const [first, second] = point

  if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
    return { lat: first, lng: second }
  }

  return { lat: second, lng: first }
}

function getStudyAreaCenter() {
  const points = (mapConfig.value?.studyArea ?? [])
    .map((point) => normalizeStudyAreaPoint(point))
    .filter((point): point is { lat: number; lng: number } => Boolean(point))

  if (!points.length) {
    return { lat: 37.77, lng: 119.2 }
  }

  const total = points.reduce(
    (accumulator, point) => ({
      lat: accumulator.lat + point.lat,
      lng: accumulator.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  )

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  }
}

function getDefaultCamera() {
  const center = getStudyAreaCenter()

  return {
    lat: center.lat,
    lng: center.lng,
    height: 1800000,
    heading: 0,
    pitch: -75,
    roll: 0,
  }
}

function getStoredOrDefaultViewState() {
  if (readLastMapSource(currentUserScope.value) === '2d') {
    const saved2DState = read2DViewState(currentUserScope.value)

    if (saved2DState) {
      return derive3DStateFrom2D(saved2DState)
    }
  }

  const savedState = read3DViewState(currentUserScope.value)

  if (savedState?.camera) {
    return savedState
  }

  return {
    camera: getDefaultCamera(),
    basemap: selectedBasemap.value,
    layers: snapshotLayers(getPersistentUiLayers()),
    sidebarOpen: false,
    activePanel: null,
  } satisfies Map3DViewState
}

function persistViewState() {
  if (!viewer) {
    return
  }

  const cartographic = viewer.camera.positionCartographic
  const focusPoint = pickSceneCenterPoint()
  const state: Map3DViewState = {
    camera: {
      lat: CesiumMath.toDegrees(cartographic.latitude),
      lng: CesiumMath.toDegrees(cartographic.longitude),
      height: cartographic.height,
      heading: CesiumMath.toDegrees(viewer.camera.heading),
      pitch: CesiumMath.toDegrees(viewer.camera.pitch),
      roll: CesiumMath.toDegrees(viewer.camera.roll),
      focusLat: focusPoint?.lat,
      focusLng: focusPoint?.lng,
    },
    basemap: selectedBasemap.value,
    layers: snapshotLayers(getPersistentUiLayers()),
    drawings: drawingFeatures.value.map((feature) => ({
      ...feature,
      positions: feature.positions.map((point) => ({ ...point })),
    })),
    sidebarOpen: sidebarOpen.value,
    activePanel: activePanel.value,
  }

  save3DViewState(currentUserScope.value, state)
  saveLastMapSource(currentUserScope.value, '3d')
}

function updateStatusText() {
  if (!viewer) {
    statusText.value = ''
    return
  }

  const height = Math.round(viewer.camera.positionCartographic.height)
  const basemapLabel = basemapOptions.find((option) => option.value === selectedBasemap.value)?.label ?? selectedBasemap.value
  const businessOverlayNotice = supportsBusinessOverlays.value ? '' : ' | 当前环境已禁用业务覆盖物'
  const pointOverlayNotice = supportsPointEntities.value ? '' : ' | 当前环境已禁用点状覆盖物'
  statusText.value = `当前底图：${basemapLabel} | ${terrainStatus.value} | 镜头高度：${height.toLocaleString()} m${businessOverlayNotice}${pointOverlayNotice}`
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

function calculateDistance(first: { lat: number; lng: number }, second: { lat: number; lng: number }) {
  const earthRadius = 6378137
  const toRadians = Math.PI / 180
  const deltaLat = (second.lat - first.lat) * toRadians
  const deltaLng = (second.lng - first.lng) * toRadians
  const firstLat = first.lat * toRadians
  const secondLat = second.lat * toRadians
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLng / 2) ** 2

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(points: Array<{ lat: number; lng: number }>) {
  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    total += calculateDistance(points[index - 1], points[index])
  }

  return total >= 1000 ? `${(total / 1000).toFixed(3)} km` : `${total.toFixed(2)} m`
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

function onCameraMoveEnd() {
  persistViewState()
  updateStatusText()
}

function stopTool() {
  currentTool.value = null
  toolTip.value = ''
  pendingTextAnchor.value = null
  textPanelOpen.value = false
  textDraft.value = ''
  tempPoints.value = []
  isFreehandDrawing = false
  draggingTextFeatureId = null
  if (viewer) {
    viewer.scene.screenSpaceCameraController.enableInputs = true
  }
  syncPreviewEntities()
}

function closeActiveTool() {
  if ((currentTool.value === 'line' || currentTool.value === 'polygon' || currentTool.value === 'measure' || currentTool.value === 'areaMeasure' || currentTool.value === 'freehand') && tempPoints.value.length > 0) {
    finishCurrentDrawing()
  }

  stopTool()
}

function setTool(toolName: Exclude<ToolName, null>) {
  if (!supportsPointEntities.value && (toolName === 'marker' || toolName === 'text')) {
    toolTip.value = '当前环境不支持点标注和文字标注，请使用线标注或面标注。'
    return
  }

  if (currentTool.value === toolName) {
    finishCurrentDrawing()
    stopTool()
    return
  }

  if ((currentTool.value === 'line' || currentTool.value === 'polygon' || currentTool.value === 'measure' || currentTool.value === 'areaMeasure' || currentTool.value === 'freehand') && tempPoints.value.length > 0) {
    finishCurrentDrawing()
  }

  activePanel.value = null
  currentTool.value = toolName
  drawingToolsOpen.value = isGroupedDrawingTool(toolName) ? drawingToolsOpen.value : false
  measurementToolsOpen.value = isGroupedMeasurementTool(toolName) ? measurementToolsOpen.value : false
  pendingTextAnchor.value = null
  textPanelOpen.value = false
  textDraft.value = ''
  tempPoints.value = []

  const messages: Record<Exclude<ToolName, null>, string> = {
    marker: '点击三维场景添加点标注；再次点击按钮关闭。',
    text: '点击三维场景放置文字锚点，然后输入文字。',
    line: '连续点击绘制线，双击结束；再次点击按钮关闭。',
    polygon: '连续点击绘制面，双击结束；再次点击按钮关闭。',
    freehand: '按住三维场景拖动绘制自由线条，松开结束。',
    measure: '连续点击测量距离，双击结束；再次点击按钮关闭。',
    areaMeasure: '连续点击绘制测量范围，双击结束；再次点击按钮关闭。',
  }

  toolTip.value = messages[toolName]
  syncPreviewEntities()
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

function clearDrawings() {
  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  drawingFeatures.value = []
  syncDrawingEntities()
  stopTool()
  persistViewState()
}

function showNotice(message: string) {
  noticeMessage.value = message

  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }

  noticeTimer = window.setTimeout(() => {
    noticeMessage.value = ''
  }, 5000)
}

function destroyFieldSurveyViewer() {
  if (fieldSurveyViewer) {
    fieldSurveyViewer.destroy()
    fieldSurveyViewer = null
  }
}

async function openFieldSurveyDialog(survey: FieldSurvey) {
  activeFieldSurvey.value = survey
  clearSelectedInfo()
  await nextTick()

  if (fieldSurveyGalleryRef.value && survey.images.length) {
    destroyFieldSurveyViewer()
    fieldSurveyViewer = new ViewerJs(fieldSurveyGalleryRef.value, {
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

function cancelTextInput() {
  pendingTextAnchor.value = null
  textPanelOpen.value = false
  textDraft.value = ''
}

function confirmTextInput() {
  if (!pendingTextAnchor.value || !textDraft.value.trim()) {
    cancelTextInput()
    return
  }

  drawingFeatures.value = drawingFeatures.value.concat({
    id: `text-${Date.now()}`,
    type: 'text',
    positions: [{ ...pendingTextAnchor.value }],
    text: textDraft.value.trim(),
  })
  syncDrawingEntities()
  cancelTextInput()
  persistViewState()
}

async function getBasemapLayer(key: BasemapKey) {
  switch (key) {
    case 'esriImg': {
      const provider = await ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer')
      return new ImageryLayer(provider)
    }
    case 'esriTopo': {
      const provider = await ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer')
      return new ImageryLayer(provider)
    }
    case 'cartoLight':
      return new ImageryLayer(
        new UrlTemplateImageryProvider({
          url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          credit: '© OpenStreetMap contributors © CARTO',
          maximumLevel: 20,
          tilingScheme: new WebMercatorTilingScheme(),
        }),
      )
    case 'cartoDark':
      return new ImageryLayer(
        new UrlTemplateImageryProvider({
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          credit: '© OpenStreetMap contributors © CARTO',
          maximumLevel: 20,
          tilingScheme: new WebMercatorTilingScheme(),
        }),
      )
    case 'esriGray': {
      const provider = await ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer')
      return new ImageryLayer(provider)
    }
    case 'esriOcean': {
      const provider = await ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer')
      return new ImageryLayer(provider)
    }
    case 'esriStreet': {
      const provider = await ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer')
      return new ImageryLayer(provider)
    }
    case 'gebcoBathymetry':
      return new ImageryLayer(
        new WebMapServiceImageryProvider({
          url: 'https://wms.gebco.net/mapserv',
          layers: 'GEBCO_LATEST',
          parameters: {
            service: 'WMS',
            version: '1.3.0',
            styles: 'default',
            format: 'image/png',
            transparent: false,
          },
          credit: '© GEBCO',
        }),
      )
    case 'emodnetBathymetry':
      return new ImageryLayer(
        new UrlTemplateImageryProvider({
          url: 'https://tiles.emodnet-bathymetry.eu/latest/mean_multicolour/web_mercator/{z}/{x}/{y}.png',
          credit: '© EMODnet Bathymetry Consortium',
          maximumLevel: 15,
          tilingScheme: new WebMercatorTilingScheme(),
        }),
      )
    case 'osm':
    default:
      return new ImageryLayer(
        new UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          credit: '© OpenStreetMap',
          maximumLevel: 19,
          tilingScheme: new WebMercatorTilingScheme(),
        }),
      )
  }
}

function createDataSourceController(dataSource: CustomDataSource) {
  return {
    setVisible(visible: boolean) {
      dataSource.show = visible
    },
    setOpacity(opacity: number) {
      const alpha = Math.min(Math.max(Number(opacity ?? 1), 0), 1)

      dataSource.entities.values.forEach((entity) => {
        const point = entity.point

        if (point?.color) {
          const currentColor = point.color.getValue()

          if (currentColor) {
            point.color = currentColor.withAlpha(alpha)
          }
        }

        const polyline = entity.polyline

        if (polyline?.material && polyline.material instanceof Color) {
          ;(polyline as unknown as { material: Color }).material = polyline.material.withAlpha(alpha)
        }

        const polygon = entity.polygon

        if (polygon?.material && polygon.material instanceof Color) {
          ;(polygon as unknown as { material: Color }).material = polygon.material.withAlpha(alpha)
        }
      })
    },
  }
}

function ensureDrawingSource() {
  if (!viewer) {
    return
  }

  if (!drawingDataSource) {
    drawingDataSource = new CustomDataSource('用户绘制')
    viewer.dataSources.add(drawingDataSource)
  }

  if (!previewDataSource) {
    previewDataSource = new CustomDataSource('绘制预览')
    viewer.dataSources.add(previewDataSource)
  }
}

function stopRenderLoop() {
  if (renderFrameId !== null) {
    window.cancelAnimationFrame(renderFrameId)
    renderFrameId = null
  }
}

function handleSceneFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '未知渲染错误')
  sceneError.value = `三维渲染错误，已停止渲染：${message}`
  stopRenderLoop()

  if (viewer) {
    viewer.destroy()
    viewer = null
  }

  setDebugViewer(null)
  drawingDataSource = null
  previewDataSource = null
  overlayRegistry.clear()
  arcGisOverlayLoads.clear()
  temporaryShpDataSources.clear()
  coordText.value = '经度：--，纬度：--，镜头高度：--'
  clearSelectedInfo()
  statusText.value = ''
  stopTool()
}

function startRenderLoop() {
  stopRenderLoop()

  const renderFrame = () => {
    if (!viewer) {
      renderFrameId = null
      return
    }

    try {
      viewer.resize()
      viewer.render()
      renderFrameId = window.requestAnimationFrame(renderFrame)
    } catch (error) {
      handleSceneFailure(error)
    }
  }

  renderFrameId = window.requestAnimationFrame(renderFrame)
}

function probePointEntitySupport(activeViewer: CesiumViewer) {
  if (typeof document === 'undefined') {
    return false
  }

  const center = getStudyAreaCenter()
  const probeDataSource = new CustomDataSource('__point-probe__')
  activeViewer.dataSources.add(probeDataSource)

  try {
    for (let index = 0; index < 96; index += 1) {
      probeDataSource.entities.add({
        position: Cartesian3.fromDegrees(center.lng + index * 0.001, center.lat + index * 0.001, 0),
        point: {
          pixelSize: 6,
          color: Color.WHITE,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      })
    }

    activeViewer.resize()
    activeViewer.render()
    return true
  } catch {
    return false
  } finally {
    activeViewer.dataSources.remove(probeDataSource, true)
  }
}

function attachRenderErrorListener(activeViewer: CesiumViewer) {
  ;(activeViewer.cesiumWidget as { renderError?: { addEventListener: (listener: (_widget: unknown, error: unknown) => void) => void } }).renderError?.addEventListener((_widget, error) => {
    if (viewer !== activeViewer) {
      return
    }

    handleSceneFailure(error)
  })
}

async function applyTerrainProvider(activeViewer: CesiumViewer) {
  activeViewer.scene.globe.enableLighting = true
  activeViewer.scene.globe.depthTestAgainstTerrain = false
  activeViewer.scene.verticalExaggeration = TERRAIN_EXAGGERATION

  try {
    activeViewer.terrainProvider = await ArcGISTiledElevationTerrainProvider.fromUrl(ARCGIS_TERRAIN_URL)
    terrainStatus.value = `ArcGIS 全球地形 x${TERRAIN_EXAGGERATION}`
    activeViewer.scene.requestRender()
    return
  } catch {
    try {
      activeViewer.terrainProvider = await createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: true,
      })
      terrainStatus.value = `Cesium World Terrain x${TERRAIN_EXAGGERATION}`
      activeViewer.scene.requestRender()
      return
    } catch {
      activeViewer.terrainProvider = new EllipsoidTerrainProvider()
      activeViewer.scene.verticalExaggeration = 1
      terrainStatus.value = '椭球地形'
      showNotice('地形数据加载失败，已回退为默认椭球地形。')
    }
  }
}

async function populateViewerScene(viewState: Map3DViewState, includeBusinessOverlays = true) {
  await applyBasemap((viewState.basemap as BasemapKey) ?? 'osm')

  if (includeBusinessOverlays) {
    await createBusinessLayers(mapConfig.value as MapConfigResponse, fieldSurveys.value)
  } else {
    viewer?.dataSources.removeAll(true)
    overlayRegistry.clear()
    arcGisOverlayLoads.clear()
    temporaryShpDataSources.clear()
  }

  ensureDrawingSource()
  syncDrawingEntities()
  syncPreviewEntities()
  flyToCamera(viewState.camera)
  viewer?.camera.moveEnd.addEventListener(onCameraMoveEnd)
  attachInteractionListeners()
  updateStatusText()
}

function createDefaultPointName() {
  return `点标注 ${drawingFeatures.value.filter((feature) => feature.type === 'point').length + 1}`
}

function updatePointFeatureName(featureId: string, name: string) {
  drawingFeatures.value = drawingFeatures.value.map((feature) =>
    feature.id === featureId && feature.type === 'point'
      ? {
          ...feature,
          text: name,
          description: `<b>${escapeHtml(name)}</b>`,
        }
      : feature,
  )
  syncDrawingEntities()
  viewer?.scene.requestRender()
  persistViewState()
}

function addDrawingFeatureEntity(feature: Map3DDrawingFeature, dataSource: CustomDataSource) {
  const pointColor = Color.fromCssColorString('#f97316')
  const lineColor = Color.fromCssColorString(feature.color ?? (feature.id.startsWith('freehand-') ? '#0f766e' : '#ef4444'))
  const polygonFill = Color.fromCssColorString('#c084fc').withAlpha(0.24)
  const polygonOutline = Color.fromCssColorString('#9333ea')

  if (feature.type === 'point') {
    if (!supportsPointEntities.value) {
      return
    }

    const point = feature.positions[0]

    if (!point) {
      return
    }

    const pointName = feature.text?.trim() || '点标注'

    dataSource.entities.add({
      id: feature.id,
      name: pointName,
      position: Cartesian3.fromDegrees(point.lng, point.lat, point.height ?? 0),
      properties: {
        kind: 'drawing-point',
        featureId: feature.id,
      },
      label: {
        text: pointName,
        font: '15px sans-serif',
        fillColor: Color.fromCssColorString('#f8fafc'),
        outlineColor: Color.fromCssColorString('#0f172a'),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        pixelOffset: new Cartesian2(0, -22),
      },
      point: {
        pixelSize: 12,
        color: pointColor,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: feature.description ?? `<b>${escapeHtml(pointName)}</b>`,
    })
    return
  }

  if (feature.type === 'text') {
    if (!supportsPointEntities.value) {
      return
    }

    const point = feature.positions[0]

    if (!point || !feature.text) {
      return
    }

    dataSource.entities.add({
      id: feature.id,
      position: Cartesian3.fromDegrees(point.lng, point.lat, point.height ?? 0),
      properties: {
        kind: 'drawing-text',
        featureId: feature.id,
      },
      label: {
        text: feature.text,
        font: '16px sans-serif',
        fillColor: Color.fromCssColorString('#f8fafc'),
        outlineColor: Color.fromCssColorString('#0f172a'),
        outlineWidth: 3,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        pixelOffset: new Cartesian2(0, -18),
      },
      point: {
        pixelSize: 8,
        color: pointColor,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>文字标注</b><br>${escapeHtml(feature.text)}`,
    })
    return
  }

  if (feature.type === 'line' && feature.positions.length >= 2) {
    dataSource.entities.add({
      id: feature.id,
      polyline: {
        positions: Cartesian3.fromDegreesArray(feature.positions.flatMap((point) => [point.lng, point.lat])),
        width: 4,
        material: lineColor,
        clampToGround: true,
      },
      description: feature.description ?? '<b>自定义线标注</b>',
    })
    return
  }

  if (feature.type === 'polygon' && feature.positions.length >= 3) {
    dataSource.entities.add({
      id: feature.id,
      polygon: {
        hierarchy: Cartesian3.fromDegreesArray(feature.positions.flatMap((point) => [point.lng, point.lat])),
        material: polygonFill,
        outline: true,
        outlineColor: polygonOutline,
        perPositionHeight: false,
        height: 0,
      },
      description: feature.description ?? '<b>自定义面标注</b>',
    })
  }
}

function syncDrawingEntities() {
  if (!drawingDataSource) {
    return
  }

  drawingDataSource.entities.removeAll()

  for (const feature of drawingFeatures.value) {
    addDrawingFeatureEntity(feature, drawingDataSource)
  }
}

function syncPreviewEntities(cursorPoint?: MapDrawingPoint | null) {
  if (!previewDataSource) {
    return
  }

  previewDataSource.entities.removeAll()

  if (!currentTool.value || (currentTool.value !== 'line' && currentTool.value !== 'polygon' && currentTool.value !== 'measure' && currentTool.value !== 'areaMeasure' && currentTool.value !== 'freehand')) {
    return
  }

  const previewPoints = cursorPoint ? [...tempPoints.value, cursorPoint] : [...tempPoints.value]

  if (previewPoints.length < 1) {
    return
  }

  tempPoints.value.forEach((point) => {
    previewDataSource?.entities.add({
      position: Cartesian3.fromDegrees(point.lng, point.lat, point.height ?? 0),
      point: {
        pixelSize: 7,
        color: Color.fromCssColorString('#f8fafc'),
        outlineColor: Color.fromCssColorString('#0f172a'),
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    })
  })

  if ((currentTool.value === 'line' || currentTool.value === 'measure' || currentTool.value === 'freehand') && previewPoints.length >= 2) {
    previewDataSource.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArrayHeights(previewPoints.flatMap((point) => [point.lng, point.lat, currentTool.value === 'freehand' ? 8 : (point.height ?? 0)])),
        width: currentTool.value === 'freehand' ? 5 : 3,
        material: Color.fromCssColorString(currentTool.value === 'freehand' ? freehandColor.value : currentTool.value === 'measure' ? '#f97316' : '#fb7185'),
        clampToGround: currentTool.value !== 'freehand',
      },
    })

    if (currentTool.value === 'measure') {
      toolTip.value = `当前距离：${formatDistance(previewPoints)}；双击结束`
    }
  }

  if ((currentTool.value === 'polygon' || currentTool.value === 'areaMeasure') && previewPoints.length >= 2) {
    const outlineColor = currentTool.value === 'areaMeasure' ? '#f97316' : '#c084fc'
    const fillColor = currentTool.value === 'areaMeasure' ? '#fdba74' : '#c084fc'

    previewDataSource.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArray(previewPoints.concat(previewPoints[0]).flatMap((point) => [point.lng, point.lat])),
        width: 2,
        material: Color.fromCssColorString(outlineColor),
        clampToGround: true,
      },
    })

    if (previewPoints.length >= 3) {
      previewDataSource.entities.add({
        polygon: {
          hierarchy: Cartesian3.fromDegreesArray(previewPoints.flatMap((point) => [point.lng, point.lat])),
          material: Color.fromCssColorString(fillColor).withAlpha(0.16),
          outline: false,
          perPositionHeight: false,
          height: 0,
        },
      })
    }

    if (currentTool.value === 'areaMeasure' && previewPoints.length >= 3) {
      toolTip.value = `当前面积：${formatArea(previewPoints)}；双击结束`
    }
  }
}

function finishCurrentDrawing() {
  if (currentTool.value === 'line' && tempPoints.value.length >= 2) {
    drawingFeatures.value = drawingFeatures.value.concat({
      id: `line-${Date.now()}`,
      type: 'line',
      positions: tempPoints.value.map((point) => ({ ...point })),
    })
    syncDrawingEntities()
    persistViewState()
  }

  if (currentTool.value === 'polygon' && tempPoints.value.length >= 3) {
    drawingFeatures.value = drawingFeatures.value.concat({
      id: `polygon-${Date.now()}`,
      type: 'polygon',
      positions: tempPoints.value.map((point) => ({ ...point })),
    })
    syncDrawingEntities()
    persistViewState()
  }

  if (currentTool.value === 'measure' && tempPoints.value.length >= 2) {
    drawingFeatures.value = drawingFeatures.value.concat({
      id: `measure-${Date.now()}`,
      type: 'line',
      positions: tempPoints.value.map((point) => ({ ...point })),
      description: `<b>距离测量结果</b><br>${escapeHtml(formatDistance(tempPoints.value))}`,
    })
    syncDrawingEntities()
    persistViewState()
  }

  if (currentTool.value === 'areaMeasure' && tempPoints.value.length >= 3) {
    const areaText = formatArea(tempPoints.value)

    drawingFeatures.value = drawingFeatures.value.concat({
      id: `area-measure-${Date.now()}`,
      type: 'polygon',
      positions: tempPoints.value.map((point) => ({ ...point })),
      description: `<b>面积测量结果</b><br>${escapeHtml(areaText)}`,
    })
    syncDrawingEntities()
    persistViewState()
  }

  if (currentTool.value === 'freehand' && tempPoints.value.length >= 2) {
    drawingFeatures.value = drawingFeatures.value.concat({
      id: `freehand-${Date.now()}`,
      type: 'line',
      color: freehandColor.value,
      positions: tempPoints.value.map((point) => ({ ...point, height: 8 })),
    })
    syncDrawingEntities()
    persistViewState()
  }

  tempPoints.value = []
  syncPreviewEntities()
}

function createStudyAreaOverlay(config: MapConfigResponse) {
  if (!viewer) {
    return
  }

  const dataSource = new CustomDataSource('研究区范围')
  const points = config.studyArea.map(normalizeStudyAreaPoint).filter((point): point is { lat: number; lng: number } => Boolean(point))

  if (!points.length) {
    return
  }

  dataSource.entities.add({
    name: '研究区范围',
    polygon: {
      hierarchy: Cartesian3.fromDegreesArray(points.flatMap((point) => [point.lng, point.lat])),
      material: Color.fromCssColorString('#fb923c').withAlpha(0.18),
      outline: true,
      outlineColor: Color.fromCssColorString('#f97316'),
      heightReference: HeightReference.CLAMP_TO_GROUND,
    },
  })

  viewer.dataSources.add(dataSource)
  overlayRegistry.set('研究区范围', createDataSourceController(dataSource))
}

function getDepthColor(depth: number) {
  if (depth < 2) {
    return Color.fromCssColorString('#38bdf8')
  }

  if (depth < 5) {
    return Color.fromCssColorString('#22c55e')
  }

  if (depth < 10) {
    return Color.fromCssColorString('#f59e0b')
  }

  return Color.fromCssColorString('#ef4444')
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCoordinate(value: number) {
  return Number(value).toFixed(6)
}

function isTemporaryShpLayer(layer: { isTemporaryShp?: boolean }) {
  return Boolean(layer.isTemporaryShp)
}

function getPersistentUiLayers() {
  return uiLayers.value.filter((layer) => !isTemporaryShpLayer(layer))
}

function createEmptyShpBounds(): ShpBounds {
  return {
    west: Number.POSITIVE_INFINITY,
    south: Number.POSITIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
  }
}

function isValidLngLat(value: unknown): value is [number, number, ...number[]] {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === 'number'
    && typeof value[1] === 'number'
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
    && value[0] >= -180
    && value[0] <= 180
    && value[1] >= -90
    && value[1] <= 90
}

function extendShpBounds(bounds: ShpBounds, coordinate: [number, number, ...number[]]) {
  const [lng, lat] = coordinate

  bounds.west = Math.min(bounds.west, lng)
  bounds.south = Math.min(bounds.south, lat)
  bounds.east = Math.max(bounds.east, lng)
  bounds.north = Math.max(bounds.north, lat)
}

function collectGeometryCoordinates(coordinates: unknown, bounds: ShpBounds, output: [number, number, ...number[]][] = []) {
  if (isValidLngLat(coordinates)) {
    output.push(coordinates)
    extendShpBounds(bounds, coordinates)
    return output
  }

  if (Array.isArray(coordinates)) {
    coordinates.forEach((item) => collectGeometryCoordinates(item, bounds, output))
  }

  return output
}

function hasValidShpBounds(bounds: ShpBounds) {
  return Number.isFinite(bounds.west) && Number.isFinite(bounds.south) && Number.isFinite(bounds.east) && Number.isFinite(bounds.north)
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

function readFeatureName(feature: GeoJsonFeature, fallback: string) {
  const properties = feature.properties ?? {}
  const name = properties.name ?? properties.Name ?? properties.NAME ?? properties.id ?? properties.ID

  return name === null || name === undefined || name === '' ? fallback : String(name)
}

function addPointEntity(dataSource: CustomDataSource, coordinate: [number, number, ...number[]], feature: GeoJsonFeature, fallbackName: string) {
  dataSource.entities.add({
    name: readFeatureName(feature, fallbackName),
    position: Cartesian3.fromDegrees(coordinate[0], coordinate[1], 0),
    point: {
      pixelSize: 2,
      color: Color.fromCssColorString('#f97316'),
      outlineColor: Color.WHITE,
      outlineWidth: 0,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    },
    description: formatPropertiesHtml(feature.properties),
  })
}

function addLineEntity(dataSource: CustomDataSource, coordinates: unknown, feature: GeoJsonFeature, fallbackName: string, bounds: ShpBounds) {
  const points = collectGeometryCoordinates(coordinates, bounds)

  if (points.length < 2) {
    return
  }

  dataSource.entities.add({
    name: readFeatureName(feature, fallbackName),
    polyline: {
      positions: Cartesian3.fromDegreesArray(points.flatMap((point) => [point[0], point[1]])),
      width: 1.5,
      material: Color.fromCssColorString('#0f766e'),
      clampToGround: true,
    },
    description: formatPropertiesHtml(feature.properties),
  })
}

function addPolygonEntity(dataSource: CustomDataSource, rings: unknown, feature: GeoJsonFeature, fallbackName: string, bounds: ShpBounds) {
  if (!Array.isArray(rings) || !rings.length) {
    return
  }

  const outerRing = collectGeometryCoordinates(rings[0], bounds)
  const holes = rings
    .slice(1)
    .map((ring) => collectGeometryCoordinates(ring, bounds))
    .filter((ring) => ring.length >= 3)
    .map((ring) => new PolygonHierarchy(Cartesian3.fromDegreesArray(ring.flatMap((point) => [point[0], point[1]]))))

  if (outerRing.length < 3) {
    return
  }

  dataSource.entities.add({
    name: readFeatureName(feature, fallbackName),
    polygon: {
      hierarchy: new PolygonHierarchy(
        Cartesian3.fromDegreesArray(outerRing.flatMap((point) => [point[0], point[1]])),
        holes,
      ),
      material: Color.fromCssColorString('#14b8a6').withAlpha(0.18),
      outline: true,
      outlineColor: Color.fromCssColorString('#0f766e'),
      perPositionHeight: false,
      height: 0,
    },
    description: formatPropertiesHtml(feature.properties),
  })
}

function addGeoJsonFeatureEntity(dataSource: CustomDataSource, feature: GeoJsonFeature, layerName: string, bounds: ShpBounds) {
  const geometry = feature.geometry as GeoJsonGeometry | null

  if (!geometry || !geometry.coordinates) {
    return
  }

  switch (geometry.type) {
    case 'Point':
      if (isValidLngLat(geometry.coordinates)) {
        extendShpBounds(bounds, geometry.coordinates)
        addPointEntity(dataSource, geometry.coordinates, feature, layerName)
      }
      break
    case 'MultiPoint':
      collectGeometryCoordinates(geometry.coordinates, bounds).forEach((coordinate) => addPointEntity(dataSource, coordinate, feature, layerName))
      break
    case 'LineString':
      addLineEntity(dataSource, geometry.coordinates, feature, layerName, bounds)
      break
    case 'MultiLineString':
      if (Array.isArray(geometry.coordinates)) {
        geometry.coordinates.forEach((line) => addLineEntity(dataSource, line, feature, layerName, bounds))
      }
      break
    case 'Polygon':
      addPolygonEntity(dataSource, geometry.coordinates, feature, layerName, bounds)
      break
    case 'MultiPolygon':
      if (Array.isArray(geometry.coordinates)) {
        geometry.coordinates.forEach((polygon) => addPolygonEntity(dataSource, polygon, feature, layerName, bounds))
      }
      break
  }
}

function createTemporaryShpDataSource(name: string, geojson: GeoJsonFeatureCollection) {
  const dataSource = new CustomDataSource(name)
  const bounds = createEmptyShpBounds()

  geojson.features.forEach((feature) => addGeoJsonFeatureEntity(dataSource, feature, name, bounds))

  return {
    dataSource,
    bounds: hasValidShpBounds(bounds) ? bounds : null,
  }
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

function flyToShpBounds(bounds: ShpBounds | null) {
  if (!viewer || !bounds) {
    return false
  }

  viewer.camera.flyTo({
    destination: Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north),
    duration: 1.4,
  })
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

async function loadSelectedShpFiles(files: FileList | File[], projectionOverride: ShpProjectionOverride = 'auto') {
  if (!viewer) {
    return
  }

  const parsedLayers = await parseShapefileFiles(files, { projectionOverride })
  let fitted = false

  for (const parsedLayer of parsedLayers) {
    const name = createUniqueShpLayerName(parsedLayer.name, uiLayers.value.map((layer) => layer.name))
    const layerConfig = createTemporaryShpLayerConfig(name)
    const { dataSource, bounds } = createTemporaryShpDataSource(name, parsedLayer.geojson)

    await viewer.dataSources.add(dataSource)
    temporaryShpDataSources.set(name, dataSource)
    overlayRegistry.set(name, createDataSourceController(dataSource))
    uiLayers.value = uiLayers.value.concat(layerConfig)
    overlayRegistry.get(name)?.setOpacity(layerConfig.opacity)

    if (!fitted) {
      fitted = flyToShpBounds(bounds)
    }
  }

  viewer.scene.requestRender()
  showNotice(fitted ? 'SHP 鏁版嵁宸插姞杞藉苟瀹氫綅鍒板浘灞傝寖鍥淬€?' : 'SHP 鏁版嵁宸插姞杞斤紝浣嗘湭鎵惧埌鍙畾浣嶈寖鍥淬€?')
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

  if (!files.length || !viewer) {
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

async function handleShpFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files?.length || !viewer) {
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
      const { dataSource, bounds } = createTemporaryShpDataSource(name, parsedLayer.geojson)

      await viewer.dataSources.add(dataSource)
      temporaryShpDataSources.set(name, dataSource)
      overlayRegistry.set(name, createDataSourceController(dataSource))
      uiLayers.value = uiLayers.value.concat(layerConfig)
      overlayRegistry.get(name)?.setOpacity(layerConfig.opacity)

      if (!fitted) {
        fitted = flyToShpBounds(bounds)
      }
    }

    viewer.scene.requestRender()
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

function createDepthPointOverlay(config: MapConfigResponse) {
  if (!viewer) {
    return
  }

  if (!supportsPointEntities.value) {
    return
  }

  const dataSource = new CustomDataSource('水深测点')

  config.depthData.forEach((point) => {
    dataSource.entities.add({
      name: point.id,
      position: Cartesian3.fromDegrees(point.lng, point.lat, 0),
      point: {
        pixelSize: 9,
        color: getDepthColor(point.depth),
        outlineColor: Color.WHITE,
        outlineWidth: 1,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>水深测点：${escapeHtml(point.id)}</b><br>经度：${formatCoordinate(point.lng)}<br>纬度：${formatCoordinate(point.lat)}<br>水深：${escapeHtml(point.depth)} m`,
    })
  })

  viewer.dataSources.add(dataSource)
  overlayRegistry.set('水深测点', createDataSourceController(dataSource))
}

function createRouteOverlay(config: MapConfigResponse) {
  if (!viewer || !config.depthData.length) {
    return
  }

  const dataSource = new CustomDataSource('无人船测深航线')

  dataSource.entities.add({
    name: '无人船测深航线',
    polyline: {
      positions: Cartesian3.fromDegreesArrayHeights(config.depthData.flatMap((point) => [point.lng, point.lat, 1])),
      width: 4,
      material: Color.fromCssColorString('#22c55e'),
      clampToGround: false,
    },
  })

  viewer.dataSources.add(dataSource)
  overlayRegistry.set('无人船测深航线', createDataSourceController(dataSource))
}

function createMonitoringOverlay(config: MapConfigResponse) {
  if (!viewer) {
    return
  }

  if (!supportsPointEntities.value) {
    return
  }

  const dataSource = new CustomDataSource('监测位置')

  config.monitoringPoints.forEach((point) => {
    dataSource.entities.add({
      name: point.pointName,
      position: Cartesian3.fromDegrees(point.longitude, point.latitude, 0),
      point: {
        pixelSize: 10,
        color: Color.fromCssColorString('#ef4444'),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>${escapeHtml(point.pointName)}</b><br>监测时间：${escapeHtml(point.monitoredAt)}<br>地下水高程：${point.elevation.toFixed(3)} m<br>经度：${formatCoordinate(point.longitude)}<br>纬度：${formatCoordinate(point.latitude)}${point.sourceFile ? `<br>来源文件：${escapeHtml(point.sourceFile)}` : ''}`,
    })
  })

  viewer.dataSources.add(dataSource)
  overlayRegistry.set('监测位置', createDataSourceController(dataSource))
}

function createFieldSurveyOverlay(surveys: FieldSurvey[]) {
  if (!viewer) {
    return
  }

  if (!supportsPointEntities.value) {
    return
  }

  const dataSource = new CustomDataSource('野外考察')

  surveys.forEach((survey) => {
    dataSource.entities.add({
      name: survey.name,
      position: Cartesian3.fromDegrees(survey.longitude, survey.latitude, 0),
      properties: {
        kind: 'field-survey',
        surveyId: survey.id,
      },
      point: {
        pixelSize: 11,
        color: Color.fromCssColorString('#f59e0b'),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>${escapeHtml(survey.name)}</b><br>编号：${escapeHtml(survey.serialNo)}<br>时间：${escapeHtml(survey.surveyTime)}<br>经度：${formatCoordinate(survey.longitude)}<br>纬度：${formatCoordinate(survey.latitude)}<br>简介：${escapeHtml(survey.description || '暂无简介')}`,
    })
  })

  viewer.dataSources.add(dataSource)
  overlayRegistry.set('野外考察', createDataSourceController(dataSource))
}

async function createArcGisOverlay(layer: BusinessLayerConfig) {
  if (!viewer || !layer.url) {
    return
  }

  const existingOverlay = overlayRegistry.get(layer.name)

  if (existingOverlay) {
    existingOverlay.setVisible(layer.visible)
    existingOverlay.setOpacity(layer.opacity)
    return
  }

  const pendingLoad = arcGisOverlayLoads.get(layer.name)

  if (pendingLoad) {
    return pendingLoad
  }

  const activeViewer = viewer
  let loadPromise!: Promise<void>

  loadPromise = (async () => {
    try {
      const provider = await ArcGisMapServerImageryProvider.fromUrl(layer.url as string)

      if (!viewer || viewer !== activeViewer || activeViewer.isDestroyed()) {
        return
      }

      const imageryLayer = activeViewer.imageryLayers.addImageryProvider(provider)
      imageryLayer.show = layer.visible
      imageryLayer.alpha = layer.opacity

      overlayRegistry.set(layer.name, {
        setVisible(visible: boolean) {
          imageryLayer.show = visible
        },
        setOpacity(opacity: number) {
          imageryLayer.alpha = Math.min(Math.max(Number(opacity ?? 1), 0), 1)
        },
      })
    } finally {
      if (arcGisOverlayLoads.get(layer.name) === loadPromise) {
        arcGisOverlayLoads.delete(layer.name)
      }
    }
  })()

  arcGisOverlayLoads.set(layer.name, loadPromise)
  return loadPromise
}

async function createBusinessLayers(config: MapConfigResponse, surveys: FieldSurvey[]) {
  if (!viewer) {
    return
  }

  viewer.dataSources.removeAll(true)
  overlayRegistry.clear()
  arcGisOverlayLoads.clear()
  temporaryShpDataSources.clear()

  createStudyAreaOverlay(config)
  createDepthPointOverlay(config)
  createRouteOverlay(config)
  createMonitoringOverlay(config)
  createFieldSurveyOverlay(surveys)

  for (const layer of uiLayers.value) {
    if (layer.isArcGISServer && layer.url) {
      if (layer.visible) {
        await createArcGisOverlay(layer)
      }

      continue
    }

    const overlay = overlayRegistry.get(layer.name)

    if (!overlay) {
      continue
    }

    overlay.setVisible(layer.visible)
    overlay.setOpacity(layer.opacity)
  }
}

async function applyBasemap(key: BasemapKey) {
  if (!viewer) {
    return
  }

  const layer = await getBasemapLayer(key)
  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.add(layer)
  selectedBasemap.value = key
  updateStatusText()
  viewer.scene.requestRender()
  persistViewState()
}

async function changeBasemap(key: BasemapKey) {
  try {
    await applyBasemap(key)
  } catch (error) {
    sceneError.value = error instanceof Error ? error.message : '底图切换失败。'
  }
}

function flyToCamera(camera: Map3DViewState['camera']) {
  if (!viewer) {
    return
  }

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(camera.lng, camera.lat, camera.height),
    orientation: {
      heading: CesiumMath.toRadians(camera.heading),
      pitch: CesiumMath.toRadians(camera.pitch),
      roll: CesiumMath.toRadians(camera.roll),
    },
    duration: 1.6,
  })
}

function goHome() {
  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  closeActiveTool()
  flyToCamera(getDefaultCamera())
  persistViewState()
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
  persistViewState()
}

function togglePanel(panelName: 'basemap' | 'bookmark') {
  const nextPanel = activePanel.value === panelName ? null : panelName

  if (nextPanel) {
    closeActiveTool()
    drawingToolsOpen.value = false
    measurementToolsOpen.value = false
  }

  activePanel.value = nextPanel
  persistViewState()
}

function flyToBookmark(bookmark: Bookmark) {
  if (!viewer) {
    return
  }

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(bookmark.lng, bookmark.lat, Math.max(1200, 24000000 / 2 ** bookmark.zoom)),
    duration: BOOKMARK_FLIGHT_DURATION,
  })
}

function goToBookmark(bookmark: Bookmark) {
  flyToBookmark(bookmark)
  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  persistViewState()
}

async function printMap() {
  if (!viewerElement.value || !viewer) {
    return
  }

  activePanel.value = null
  drawingToolsOpen.value = false
  measurementToolsOpen.value = false
  finishCurrentDrawing()
  stopTool()
  viewer.resize()
  viewer.render()

  try {
    const canvas = await html2canvas(viewerElement.value, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: null,
      scale: 2,
    })
    const imageData = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      showNotice('浏览器阻止了弹窗，请允许弹窗后重试。')
      return
    }

    printWindow.document.write(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>打印三维地图</title><style>html,body{margin:0;padding:0;width:100%;height:100%;background:#fff}.print-page{width:100vw;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:10mm;box-sizing:border-box}img{max-width:100%;max-height:100%;object-fit:contain}@media print{@page{size:A4 landscape;margin:8mm}.print-page{width:100%;height:100%;padding:0}img{width:100%;height:auto}}</style></head><body><div class="print-page"><img src="${imageData}" /></div><script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script></body></html>`)
    printWindow.document.close()
  } catch {
    showNotice('三维地图截图打印失败，请检查底图跨域限制或浏览器权限。')
  } finally {
    persistViewState()
  }
}

function pickScenePoint(position: { x: number; y: number }) {
  if (!viewer) {
    return null
  }

  const cartesian = viewer.camera.pickEllipsoid(new Cartesian2(position.x, position.y), viewer.scene.globe.ellipsoid)

  if (!cartesian) {
    return null
  }

  const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian)

  return {
    lng: CesiumMath.toDegrees(cartographic.longitude),
    lat: CesiumMath.toDegrees(cartographic.latitude),
    height: Math.max(0, cartographic.height),
  }
}

function pickSceneCenterPoint() {
  if (!viewerElement.value) {
    return null
  }

  const rect = viewerElement.value.getBoundingClientRect()
  return pickScenePoint({
    x: rect.width / 2,
    y: rect.height / 2,
  })
}

function clearSelectedInfo() {
  selectedInfoTitle.value = ''
  selectedInfoHtml.value = ''
}

function setSelectedInfoPosition(position: { x: number; y: number }) {
  if (!viewerElement.value) {
    selectedInfoPosition.value = { x: position.x + 14, y: Math.max(12, position.y - 24) }
    return
  }

  const rect = viewerElement.value.getBoundingClientRect()
  const popupWidth = 320
  const popupHeight = 180
  const offsetX = 16
  const offsetY = 22
  const maxX = Math.max(12, rect.width - popupWidth - 12)
  const maxY = Math.max(12, rect.height - popupHeight - 12)

  selectedInfoPosition.value = {
    x: Math.min(Math.max(12, position.x + offsetX), maxX),
    y: Math.min(Math.max(12, position.y - offsetY), maxY),
  }
}

function readEntityDescription(description: unknown) {
  if (typeof description === 'string') {
    return description
  }

  if (description && typeof description === 'object' && 'getValue' in description && typeof description.getValue === 'function') {
    const value = description.getValue(viewer?.clock.currentTime)
    return typeof value === 'string' ? value : String(value ?? '')
  }

  return ''
}

function readEntityProperty(entity: unknown, propertyName: string) {
  if (!entity || typeof entity !== 'object' || !('properties' in entity)) {
    return null
  }

  const properties = (entity as { properties?: Record<string, unknown> & { getValue?: (time?: unknown) => Record<string, unknown> } }).properties
  const property = properties?.[propertyName] ?? properties?.getValue?.(viewer?.clock.currentTime)?.[propertyName]

  if (property && typeof property === 'object' && 'getValue' in property && typeof property.getValue === 'function') {
    return property.getValue(viewer?.clock.currentTime)
  }

  return property ?? null
}

function appendFreehandPoint(point: MapDrawingPoint) {
  const lastPoint = tempPoints.value[tempPoints.value.length - 1]

  if (lastPoint && Math.hypot(lastPoint.lng - point.lng, lastPoint.lat - point.lat) < 0.00003) {
    return
  }

  tempPoints.value = tempPoints.value.concat({ ...point })
  syncPreviewEntities()
  viewer?.scene.requestRender()
}

function startFreehandDrawing(position: { x: number; y: number }) {
  if (!viewer || currentTool.value !== 'freehand') {
    return
  }

  const point = pickScenePoint(position)

  if (!point) {
    return
  }

  isFreehandDrawing = true
  tempPoints.value = [{ ...point }]
  viewer.scene.screenSpaceCameraController.enableInputs = false
  syncPreviewEntities()
  viewer.scene.requestRender()
}

function finishFreehandDrawing() {
  if (currentTool.value !== 'freehand' || !isFreehandDrawing) {
    return
  }

  isFreehandDrawing = false

  if (viewer) {
    viewer.scene.screenSpaceCameraController.enableInputs = true
  }

  finishCurrentDrawing()
}

function startTextAnnotationDrag(position: { x: number; y: number }) {
  if (!viewer || currentTool.value) {
    return false
  }

  const picked = viewer.scene.pick(new Cartesian2(position.x, position.y)) as { id?: unknown } | undefined
  const entity = picked?.id

  if (readEntityProperty(entity, 'kind') !== 'drawing-text') {
    return false
  }

  const featureId = readEntityProperty(entity, 'featureId')

  if (typeof featureId !== 'string') {
    return false
  }

  draggingTextFeatureId = featureId
  clearSelectedInfo()
  viewer.scene.screenSpaceCameraController.enableInputs = false
  return true
}

function updateTextAnnotationDrag(position: { x: number; y: number }) {
  if (!viewer || !draggingTextFeatureId) {
    return false
  }

  const point = pickScenePoint(position)

  if (!point) {
    return true
  }

  drawingFeatures.value = drawingFeatures.value.map((feature) =>
    feature.id === draggingTextFeatureId && feature.type === 'text'
      ? {
          ...feature,
          positions: [{ ...point }],
        }
      : feature,
  )
  syncDrawingEntities()
  viewer.scene.requestRender()
  return true
}

function finishTextAnnotationDrag() {
  if (!draggingTextFeatureId) {
    return false
  }

  draggingTextFeatureId = null

  if (viewer) {
    viewer.scene.screenSpaceCameraController.enableInputs = true
  }

  persistViewState()
  return true
}

function handleScenePick(position: { x: number; y: number }) {
  if (!viewer) {
    return
  }

  const picked = viewer.scene.pick(new Cartesian2(position.x, position.y)) as { id?: { name?: string; description?: unknown; properties?: Record<string, unknown> } } | undefined
  const entity = picked?.id

  if ((!currentTool.value || currentTool.value === 'marker') && readEntityProperty(entity, 'kind') === 'drawing-point') {
    const featureId = readEntityProperty(entity, 'featureId')
    const feature = typeof featureId === 'string'
      ? drawingFeatures.value.find((item) => item.id === featureId && item.type === 'point')
      : null

    if (feature) {
      const nextName = window.prompt('请输入点名称：', feature.text?.trim() || '点标注')

      if (nextName?.trim()) {
        updatePointFeatureName(feature.id, nextName.trim())
      }

      return
    }
  }

  if (currentTool.value) {
    const point = pickScenePoint(position)

    if (!point) {
      return
    }

    if (currentTool.value === 'marker') {
      if (!supportsPointEntities.value) {
        return
      }

      drawingFeatures.value = drawingFeatures.value.concat({
        id: `point-${Date.now()}`,
        type: 'point',
        positions: [{ ...point }],
        text: createDefaultPointName(),
      })
      syncDrawingEntities()
      persistViewState()
      return
    }

    if (currentTool.value === 'text') {
      if (!supportsPointEntities.value) {
        return
      }

      pendingTextAnchor.value = { ...point }
      textPanelOpen.value = true
      return
    }

    if (currentTool.value === 'freehand') {
      return
    }

    if (currentTool.value === 'line' || currentTool.value === 'polygon' || currentTool.value === 'measure' || currentTool.value === 'areaMeasure') {
      tempPoints.value = tempPoints.value.concat({ ...point })
      syncPreviewEntities()
      return
    }
  }

  if (!entity) {
    clearSelectedInfo()
    return
  }

  if (readEntityProperty(entity, 'kind') === 'field-survey') {
    const surveyId = Number(readEntityProperty(entity, 'surveyId'))
    const survey = fieldSurveys.value.find((item) => item.id === surveyId)

    if (survey) {
      void openFieldSurveyDialog(survey)
      return
    }
  }

  setSelectedInfoPosition(position)
  selectedInfoTitle.value = entity.name ?? '选中对象'
  selectedInfoHtml.value = readEntityDescription(entity.description)
}

function attachInteractionListeners() {
  if (!viewer) {
    return
  }

  coordHandler?.destroy()
  coordHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)

  coordHandler.setInputAction((movement: { endPosition: { x: number; y: number } }) => {
    if (!viewer) {
      return
    }

    if (updateTextAnnotationDrag(movement.endPosition)) {
      return
    }

    const pickedPoint = pickScenePoint(movement.endPosition)

    if (!pickedPoint) {
      coordText.value = '经度：--，纬度：--，镜头高度：--'
      syncPreviewEntities()
      return
    }

    const height = Math.round(viewer.camera.positionCartographic.height)
    coordText.value = `经度：${pickedPoint.lng.toFixed(6)}，纬度：${pickedPoint.lat.toFixed(6)}，镜头高度：${height.toLocaleString()} m`

    if (currentTool.value === 'freehand' && isFreehandDrawing) {
      appendFreehandPoint(pickedPoint)
      return
    }

    syncPreviewEntities(pickedPoint)
  }, ScreenSpaceEventType.MOUSE_MOVE)

  coordHandler.setInputAction((click: { position: { x: number; y: number } }) => {
    if (startTextAnnotationDrag(click.position)) {
      return
    }

    startFreehandDrawing(click.position)
  }, ScreenSpaceEventType.LEFT_DOWN)

  coordHandler.setInputAction(() => {
    if (finishTextAnnotationDrag()) {
      return
    }

    finishFreehandDrawing()
  }, ScreenSpaceEventType.LEFT_UP)

  coordHandler.setInputAction((click: { position: { x: number; y: number } }) => {
    handleScenePick(click.position)
  }, ScreenSpaceEventType.LEFT_CLICK)

  coordHandler.setInputAction(() => {
    if (currentTool.value !== 'line' && currentTool.value !== 'polygon' && currentTool.value !== 'measure' && currentTool.value !== 'areaMeasure') {
      return
    }

    finishCurrentDrawing()
    stopTool()
  }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
}

function disposeViewer() {
  stopRenderLoop()
  destroyFieldSurveyViewer()
  activeFieldSurvey.value = null

  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
    noticeTimer = null
  }

  coordHandler?.destroy()
  coordHandler = null

  if (!viewer) {
    return
  }

  viewer.camera.moveEnd.removeEventListener(onCameraMoveEnd)
  viewer.dataSources.removeAll(true)
  viewer.destroy()
  viewer = null
  setDebugViewer(null)
  drawingDataSource = null
  previewDataSource = null
  overlayRegistry.clear()
  arcGisOverlayLoads.clear()
  temporaryShpDataSources.clear()
  coordText.value = '经度：--，纬度：--，镜头高度：--'
  clearSelectedInfo()
  statusText.value = ''
  stopTool()
}

function toggleLayer(index: number) {
  const layer = uiLayers.value[index]

  if (!layer) {
    return
  }

  if (layer.isArcGISServer && layer.url && layer.visible && !overlayRegistry.has(layer.name)) {
    void createArcGisOverlay(layer)
    persistViewState()
    return
  }

  overlayRegistry.get(layer.name)?.setVisible(layer.visible)
  viewer?.scene.requestRender()
  persistViewState()
}

function updateOpacity(index: number) {
  const layer = uiLayers.value[index]

  if (!layer) {
    return
  }

  if (layer.isArcGISServer && layer.url && layer.visible && !overlayRegistry.has(layer.name)) {
    void createArcGisOverlay(layer)
    persistViewState()
    return
  }

  overlayRegistry.get(layer.name)?.setOpacity(layer.opacity)
  viewer?.scene.requestRender()
  persistViewState()
}

function checkCesiumSupport() {
  if (typeof document === 'undefined') {
    return { supported: false, reason: '当前环境不可用，无法初始化三维场景。' }
  }

  const canvas = document.createElement('canvas')
  const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null

  if (!gl) {
    return { supported: false, reason: '浏览器未启用 WebGL，无法显示三维地图。请检查浏览器硬件加速设置。' }
  }

  const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) ?? 0)

  if (!Number.isFinite(maxTextureSize) || maxTextureSize <= 0) {
    return {
      supported: false,
      reason: '当前设备的 WebGL 渲染能力异常（最大纹理尺寸为 0），无法初始化 Cesium 三维场景。请启用浏览器硬件加速，或在支持 GPU 渲染的设备上使用三维地图。',
    }
  }

  return { supported: true, reason: '' }
}

function createViewerInstance(element: HTMLElement) {
  return new CesiumViewer(element, {
    animation: false,
    timeline: false,
    baseLayer: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    fullscreenButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    infoBox: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    useDefaultRenderLoop: false,
    showRenderLoopErrors: false,
  })
}

async function waitForContainerReady() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await nextTick()
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))

    const element = viewerElement.value
    const rect = element?.getBoundingClientRect()

    if (element && rect && rect.width > 0 && rect.height > 0) {
      return element
    }
  }

  return null
}

async function loadScene() {
  isLoading.value = true
  sceneError.value = ''

  try {
    const element = await waitForContainerReady()

    if (!element) {
      throw new Error('三维容器尚未完成布局。')
    }

    const supportCheck = checkCesiumSupport()

    if (!supportCheck.supported) {
      sceneError.value = supportCheck.reason
      return
    }

    disposeViewer()
    const [config, surveys] = await Promise.all([fetchMapConfig(), fetchFieldSurveys()])
    mapConfig.value = {
      ...config,
      layers: normalizeLayerConfigs(config.layers),
    }
    fieldSurveys.value = surveys

    const savedState = read3DViewState(currentUserScope.value)
    selectedBasemap.value = (savedState?.basemap as BasemapKey | undefined) ?? selectedBasemap.value
    sidebarOpen.value = Boolean(savedState?.sidebarOpen)
    activePanel.value = savedState?.activePanel ?? null
    drawingFeatures.value = savedState?.drawings?.map((feature) => ({
      ...feature,
      positions: feature.positions.map((point) => ({ ...point })),
    })) ?? []
    uiLayers.value = mergeLayerSnapshots(
      mapConfig.value.layers.map((layer) => ({
        ...layer,
        opacity: Number(layer.opacity ?? 1),
      })),
      savedState?.layers,
    )

    viewer = createViewerInstance(element)
    const detectedPointEntitySupport = probePointEntitySupport(viewer)
    viewer.destroy()

    supportsBusinessOverlays.value = true
    supportsPointEntities.value = detectedPointEntitySupport
    viewer = createViewerInstance(element)
    setDebugViewer(viewer)
    attachRenderErrorListener(viewer)
    await applyTerrainProvider(viewer)

    viewer.resize()

    const viewState = getStoredOrDefaultViewState()
    await populateViewerScene(viewState)

    try {
      viewer.resize()
      viewer.render()
    } catch (error) {
      if (!supportsPointEntities.value) {
        viewer.camera.moveEnd.removeEventListener(onCameraMoveEnd)
        viewer.dataSources.removeAll(true)
        viewer.destroy()

        supportsBusinessOverlays.value = false
        viewer = createViewerInstance(element)
        setDebugViewer(viewer)
        attachRenderErrorListener(viewer)
        await applyTerrainProvider(viewer)
        await populateViewerScene(viewState, false)
        viewer.resize()
        viewer.render()
      } else {
        viewer.camera.moveEnd.removeEventListener(onCameraMoveEnd)
        viewer.dataSources.removeAll(true)
        viewer.destroy()

        supportsPointEntities.value = false
        viewer = createViewerInstance(element)
        setDebugViewer(viewer)
        attachRenderErrorListener(viewer)
        await applyTerrainProvider(viewer)
        await populateViewerScene(viewState)

        try {
          viewer.resize()
          viewer.render()
        } catch {
          viewer.camera.moveEnd.removeEventListener(onCameraMoveEnd)
          viewer.dataSources.removeAll(true)
          viewer.destroy()

          supportsBusinessOverlays.value = false
          viewer = createViewerInstance(element)
          setDebugViewer(viewer)
          attachRenderErrorListener(viewer)
          await applyTerrainProvider(viewer)
          await populateViewerScene(viewState, false)
          viewer.resize()
          viewer.render()
        }
      }
    }

    startRenderLoop()
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      clearToken()
      clearLoginState()
      router.push('/login')
      return
    }

    sceneError.value = error instanceof Error ? error.message : '三维场景初始化失败。'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - 三维地图'
  document.body.classList.add('page-map-3d')
  loadScene()
})

onBeforeUnmount(() => {
  document.body.classList.remove('page-map-3d')
  disposeViewer()
})
</script>

<style scoped>
.map3d-rebuild-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0b1728;
}

.map3d-header-left,
.map3d-title-group,
.map3d-header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.map3d-title-group h1 {
  margin: 0;
}

.map2d-mode-btn {
  border: none;
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.map2d-mode-btn:hover {
  background: rgba(255, 255, 255, 0.26);
}

.map3d-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #020617;
  z-index: 1;
}

.map3d-canvas :deep(.cesium-widget),
.map3d-canvas :deep(.cesium-widget canvas) {
  width: 100%;
  height: 100%;
}

.map3d-canvas.freehand-cursor,
.map3d-canvas.freehand-cursor :deep(.cesium-widget),
.map3d-canvas.freehand-cursor :deep(canvas) {
  cursor: crosshair !important;
}

.map3d-canvas-hidden {
  visibility: hidden;
}

.map3d-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 6, 23, 0.72);
}

.map3d-overlay-card {
  width: min(460px, 100%);
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
}

.map3d-panel-kicker {
  margin-bottom: 8px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.map3d-overlay-card h2,
.map3d-overlay-card p {
  margin: 0;
}

.map3d-overlay-card h2 {
  margin-bottom: 10px;
}

.map3d-text-panel {
  position: absolute;
  top: 112px;
  right: 18px;
  width: min(340px, calc(100% - 36px));
  padding: 16px;
  border-radius: 10px;
  color: #111827;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.28);
  z-index: 1600;
}

.map3d-text-panel-title {
  margin-bottom: 8px;
  font-weight: 700;
}

.map3d-text-panel-coord {
  margin-bottom: 10px;
  font-size: 12px;
  color: #64748b;
}

.map3d-text-panel-input {
  width: 100%;
  min-height: 88px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  color: #111827;
  background: #fff;
}

.map3d-text-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.map3d-info-panel {
  position: absolute;
  width: min(320px, calc(100% - 24px));
  z-index: 1600;
  transform: translateY(-50%);
  pointer-events: auto;
}

.map3d-info-card {
  position: relative;
  padding: 14px 36px 14px 14px;
  border-radius: 8px;
  color: #111827;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.28);
  border: 1px solid #d1d5db;
}

.map3d-info-card::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-left: 1px solid #d1d5db;
  border-bottom: 1px solid #d1d5db;
  transform: translateY(-50%) rotate(45deg);
}

.map3d-info-title {
  margin-bottom: 10px;
  font-weight: 700;
}

.map3d-info-close {
  position: absolute;
  top: 6px;
  right: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.map3d-info-content {
  max-height: 220px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
}

.map3d-overlay-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.map3d-status-chip {
  position: absolute;
  left: 18px;
  bottom: 20px;
  padding: 10px 14px;
  max-width: min(520px, calc(100% - 120px));
  border-radius: 6px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
  z-index: 1600;
  font-size: 12px;
}

.map3d-action-btn {
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease;
  padding: 11px 14px;
  border: none;
  border-radius: 8px;
}

.map3d-action-btn {
  color: #0f172a;
  background: linear-gradient(135deg, #f8fafc, #cbd5e1);
}

.map3d-action-btn-secondary {
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
}

.map3d-action-btn:hover {
  transform: translateY(-1px);
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
  background: rgba(15, 23, 42, 0.5);
}

.shp-projection-dialog {
  width: min(520px, 100%);
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.36);
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

@media (max-width: 980px) {
  .map3d-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .map3d-header-actions {
    flex-wrap: wrap;
  }

  .map3d-status-chip {
    display: none;
  }
}
</style>
