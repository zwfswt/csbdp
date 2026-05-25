<template>
  <div class="map3d-root">
    <div class="header map3d-header">
      <div class="map3d-header-left">
        <button id="sidebarToggle3d" class="map-directory-toggle" title="打开/关闭数据目录" @click="toggleSidebar">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="map3d-title-group">
          <h1>海岸带时空水深数据平台</h1>
          <button type="button" class="map3d-mode-btn" @click="switchTo2D">切换到二维地图</button>
        </div>
      </div>

      <div class="header-user map3d-header-actions">
        <span id="loginUserText3d">{{ loginUserText }}</span>
        <button id="logoutBtn3d" title="退出登录" @click="handleLogout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <div class="main map3d-main">
      <div id="map3d" ref="viewerElement" class="map3d-canvas" :class="{ 'map3d-canvas-hidden': sceneUnavailable }"></div>

      <div v-if="sceneUnavailable" class="map3d-fallback">
        <div class="map3d-fallback-card">
          <div class="map3d-fallback-kicker">3D Compatibility</div>
          <h2>当前设备无法渲染三维场景</h2>
          <p>{{ sceneUnavailableReason }}</p>
          <div class="map3d-fallback-actions">
            <button type="button" class="map3d-text-btn" @click="switchTo2D">切换到二维地图</button>
          </div>
        </div>
      </div>

      <aside v-if="!sceneUnavailable" id="sidebar3d" class="sidebar map3d-sidebar" :class="{ open: sidebarOpen }">
        <h2>数据目录</h2>
        <div class="map3d-sidebar-section">
          <div id="layerList3d">
            <div v-for="(layer, index) in uiLayers" :key="layer.name" class="layer-item">
              <label>
                <input v-model="layer.visible" type="checkbox" :data-index="index" @change="toggleLayer(index)" />
                {{ layer.name }}
              </label>
              <div class="layer-desc">类型：{{ layer.type }}</div>
              <div v-if="layer.isArcGISServer" class="layer-desc">来源：ArcGIS Server / MapServer</div>
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
        </div>

        <div class="legend map3d-legend">
          <div class="legend-title">三维说明</div>
          <div class="legend-row">蓝色点表示测深点</div>
          <div class="legend-row">红色点表示监测位置</div>
          <div class="legend-row">金色点表示野外考察</div>
          <div class="legend-row">书签可直接飞行定位</div>
        </div>
      </aside>

      <div v-if="!sceneUnavailable" class="toolbar map3d-toolbar">
        <button id="homeBtn3d" class="tool-btn" title="回到全国视图" @click="goHome">
          <i class="fa-solid fa-house"></i>
        </button>

        <button
          id="basemapBtn3d"
          class="tool-btn"
          :class="{ active: activePanel === 'basemap' }"
          title="底图切换"
          @click="togglePanel('basemap')"
        >
          <i class="fa-solid fa-layer-group"></i>
        </button>

        <button
          id="bookmarkBtn3d"
          class="tool-btn"
          :class="{ active: activePanel === 'bookmark' }"
          title="空间书签"
          @click="togglePanel('bookmark')"
        >
          <i class="fa-regular fa-bookmark"></i>
        </button>

        <button id="markerBtn3d" class="tool-btn" :class="{ active: currentTool === 'marker' }" title="点标注" @click="setTool('marker')">
          <i class="fa-solid fa-location-dot"></i>
        </button>

        <button id="textBtn3d" class="tool-btn" :class="{ active: currentTool === 'text' }" title="文字标注" @click="setTool('text')">
          <i class="fa-solid fa-font"></i>
        </button>

        <button id="lineBtn3d" class="tool-btn" :class="{ active: currentTool === 'line' }" title="线标注" @click="setTool('line')">
          <i class="fa-solid fa-route"></i>
        </button>

        <button id="polygonBtn3d" class="tool-btn" :class="{ active: currentTool === 'polygon' }" title="面标注" @click="setTool('polygon')">
          <i class="fa-regular fa-square"></i>
        </button>

        <button id="clearBtn3d" class="tool-btn" title="清除标注" @click="clearDrawings">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      <div v-if="!sceneUnavailable" id="basemapPanel3d" class="basemap-panel" :style="{ display: activePanel === 'basemap' ? 'block' : 'none' }">
        <h3>三维底图</h3>
        <label v-for="option in basemapOptions" :key="option.value">
          <input v-model="selectedBasemap" type="radio" name="basemap3d" :value="option.value" @change="changeBaseLayer(option.value)" />
          {{ option.label }}
        </label>
      </div>

      <div v-if="!sceneUnavailable" id="bookmarkPanel3d" class="bookmark-panel" :style="{ display: activePanel === 'bookmark' ? 'block' : 'none' }">
        <div class="bookmark-title">空间书签</div>
        <div id="bookmarkList3d">
          <button v-for="bookmark in mapConfig?.bookmarks ?? []" :key="bookmark.name" class="bookmark-item" @click="goToBookmark(bookmark)">
            <i class="fa-regular fa-bookmark"></i>
            <span>{{ bookmark.name }}</span>
          </button>
        </div>
      </div>

      <div v-if="toolTip && !sceneUnavailable" class="tip map3d-tip">{{ toolTip }}</div>

      <div v-if="textPanelOpen && !sceneUnavailable" class="map3d-text-panel">
        <div class="map3d-text-panel-title">文字标注</div>
        <div v-if="pendingTextAnchor" class="map3d-text-panel-coord">
          经度：{{ pendingTextAnchor.lng.toFixed(6) }}，纬度：{{ pendingTextAnchor.lat.toFixed(6) }}
        </div>
        <textarea v-model="textDraft" class="map3d-text-panel-input" rows="3" maxlength="120" placeholder="请输入标注文字"></textarea>
        <div class="map3d-text-panel-actions">
          <button type="button" class="map3d-text-btn map3d-text-btn-secondary" @click="cancelTextInput">取消</button>
          <button type="button" class="map3d-text-btn" @click="confirmTextInput">确认</button>
        </div>
      </div>

      <div v-if="!sceneUnavailable" id="coordBox3d" class="coord-box">{{ coordText }}</div>
      <div id="notice3d" class="notice" :style="{ display: noticeMessage ? 'block' : 'none' }">{{ noticeMessage }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AMapImageryProvider } from '@cesium-china/cesium-map'
import { isAxiosError } from 'axios'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import {
  ArcGisMapServerImageryProvider,
  Cartesian2,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  CustomDataSource,
  EllipsoidTerrainProvider,
  Entity,
  HeightReference,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  Viewer,
  WebMercatorTilingScheme,
} from 'cesium'
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  clearLoginState,
  clearToken,
  fetchFieldSurveys,
  fetchMapConfig,
  getStoredLoginUser,
  type Bookmark,
  type BusinessLayerConfig,
  type FieldSurvey,
  type MapConfigResponse,
} from '../services/api'
import {
  clear3DViewState,
  clearMapViewState,
  derive3DStateFrom2D,
  mergeLayerSnapshots,
  map2DBasemapTo3D,
  map3DBasemapTo2D,
  read2DViewState,
  read3DViewState,
  readLastMapSource,
  save3DViewState,
  saveLastMapSource,
  snapshotLayers,
  type Map3DDrawingFeature,
  type MapDrawingPoint,
  type Map3DCameraState,
  type Map3DViewState,
} from '../utils/mapViewState'
import { normalizeLayerConfigs } from '../utils/layerConfig'

type PanelName = 'basemap' | 'bookmark' | null
type ToolName = 'marker' | 'text' | 'line' | 'polygon' | null

type OverlayController = {
  setVisible: (visible: boolean) => void
  setOpacity: (opacity: number) => void
}

const router = useRouter()
const viewerElement = ref<HTMLDivElement | null>(null)
const mapConfig = ref<MapConfigResponse | null>(null)
const fieldSurveys = ref<FieldSurvey[]>([])
const uiLayers = ref<BusinessLayerConfig[]>([])
const sidebarOpen = ref(false)
const activePanel = ref<PanelName>(null)
const selectedBasemap = ref('osm')
const currentTool = ref<ToolName>(null)
const toolTip = ref('')
const textDraft = ref('')
const textPanelOpen = ref(false)
const pendingTextAnchor = ref<MapDrawingPoint | null>(null)
const drawingFeatures = ref<Map3DDrawingFeature[]>([])
const tempPoints = ref<MapDrawingPoint[]>([])
const coordText = ref('经度：--，纬度：--，镜头高度：--')
const noticeMessage = ref('')
const loginUserText = computed(() => getStoredLoginUser() ?? 'admin')
const sceneUnavailable = ref(false)
const sceneUnavailableReason = ref('')

const basemapOptions = [
  { label: 'OpenStreetMap', value: 'osm' },
  { label: '高德电子地图', value: 'gaode' },
  { label: '高德影像地图', value: 'gaodeImg' },
  { label: 'Esri 影像', value: 'esriImg' },
  { label: 'Esri 地形', value: 'esriTopo' },
]

let viewer: Viewer | null = null
let basemapLayers: ImageryLayer[] = []
let currentBasemapKey = ''
let coordHandler: ScreenSpaceEventHandler | null = null
let noticeTimer: number | null = null
let shouldPersistOnUnmount = true
const overlayRegistry = new Map<string, OverlayController>()
let drawingDataSource: CustomDataSource | null = null
let previewDataSource: CustomDataSource | null = null
let supportsEntityOverlays = true
const arcGisOverlayLoads = new Map<string, Promise<void>>()

const entityOverlayNames = [
  '研究区范围',
  '水深测点',
  '无人船测深航线',
  '监测位置',
  '野外考察',
] as const

function normalizeBasemapKey(key: string) {
  return map2DBasemapTo3D(map3DBasemapTo2D(key))
}

function normalizeStudyAreaPoint(point: number[]) {
  const first = Number(point[0])
  const second = Number(point[1])

  if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
    return { lng: second, lat: first }
  }

  return { lng: first, lat: second }
}

function getNormalizedStudyAreaPoints(config: MapConfigResponse) {
  return config.studyArea.map(normalizeStudyAreaPoint)
}

function getStudyAreaBounds(config: MapConfigResponse) {
  const points = getNormalizedStudyAreaPoints(config)
  const longitudes = points.map((point) => point.lng)
  const latitudes = points.map((point) => point.lat)

  return {
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes),
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
  }
}

function getStudyAreaCenter(config: MapConfigResponse) {
  const bounds = getStudyAreaBounds(config)

  return {
    lng: (bounds.minLng + bounds.maxLng) / 2,
    lat: (bounds.minLat + bounds.maxLat) / 2,
  }
}

function isCameraNearStudyArea(camera: Map3DCameraState, config: MapConfigResponse) {
  const bounds = getStudyAreaBounds(config)
  const lngSpan = Math.max(0.5, bounds.maxLng - bounds.minLng)
  const latSpan = Math.max(0.5, bounds.maxLat - bounds.minLat)
  const lngPadding = Math.min(30, Math.max(6, lngSpan * 8))
  const latPadding = Math.min(20, Math.max(4, latSpan * 8))
  const focusLng = camera.focusLng ?? camera.lng
  const focusLat = camera.focusLat ?? camera.lat

  return (
    focusLng >= bounds.minLng - lngPadding
    && focusLng <= bounds.maxLng + lngPadding
    && focusLat >= bounds.minLat - latPadding
    && focusLat <= bounds.maxLat + latPadding
  )
}

function getDefaultHomeCamera() {
  if (!mapConfig.value) {
    return {
      lng: 118.9,
      lat: 37.8,
      height: 1800000,
      heading: 0,
      pitch: -82,
      roll: 0,
    }
  }

  const center = getStudyAreaCenter(mapConfig.value)

  return {
    lng: center.lng,
    lat: center.lat,
    height: 1800000,
    heading: 0,
    pitch: -82,
    roll: 0,
  }
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

function activateSceneUnavailableMode(reason: string) {
  sceneUnavailable.value = true
  sceneUnavailableReason.value = reason
  sidebarOpen.value = false
  activePanel.value = null
  stopTool()
  coordHandler?.destroy()
  coordHandler = null

  if (viewer) {
    viewer.useDefaultRenderLoop = false
  }
}

async function waitForViewerLayout(element: HTMLElement) {
  await nextTick()

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rect = element.getBoundingClientRect()

    if (rect.width > 0 && rect.height > 0) {
      return true
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  }

  return false
}

function disposeViewer() {
  coordHandler?.destroy()
  coordHandler = null
  arcGisOverlayLoads.clear()

  if (viewer) {
    viewer.useDefaultRenderLoop = false
    viewer.destroy()
  }

  viewer = null
  basemapLayers = []
  drawingDataSource = null
  previewDataSource = null
  overlayRegistry.clear()
}

function isAuthError(error: unknown) {
  return isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)
}

function getSceneErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }

  return '未知错误'
}

function viewerSupportsSceneLabels() {
  if (!viewer) {
    return false
  }

  const sceneContext = (viewer.scene as unknown as {
    context?: {
      webgl2?: boolean
      _gl?: WebGLRenderingContext | WebGL2RenderingContext
    }
  }).context

  if (!sceneContext) {
    return false
  }

  if (sceneContext.webgl2) {
    return true
  }

  const gl = sceneContext._gl

  if (!gl) {
    return false
  }

  return Boolean(gl.getExtension('ANGLE_instanced_arrays')) && Number(gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)) > 0
}

function registerDisabledEntityOverlays() {
  for (const name of entityOverlayNames) {
    overlayRegistry.set(name, {
      setVisible() {},
      setOpacity() {},
    })
  }
}

function stopTool() {
  currentTool.value = null
  toolTip.value = ''
  tempPoints.value = []
  pendingTextAnchor.value = null
  textPanelOpen.value = false
  textDraft.value = ''
  syncPreviewEntities()
}

function setTool(toolName: Exclude<ToolName, null>) {
  if (currentTool.value === toolName) {
    finishCurrentDrawing()
    stopTool()
    return
  }

  if ((currentTool.value === 'line' || currentTool.value === 'polygon') && tempPoints.value.length > 0) {
    finishCurrentDrawing()
  }

  currentTool.value = toolName
  activePanel.value = null
  tempPoints.value = []
  pendingTextAnchor.value = null
  textPanelOpen.value = false
  textDraft.value = ''
  syncPreviewEntities()

  const messages: Record<Exclude<ToolName, null>, string> = {
    marker: '点击三维场景添加点标注；再次点击点标注按钮关闭。',
    text: '点击三维场景放置文字锚点，然后在面板中输入文字。',
    line: '连续点击绘制线，双击结束；再次点击线标注按钮关闭。',
    polygon: '连续点击绘制面，双击结束；再次点击面标注按钮关闭。',
  }

  toolTip.value = messages[toolName]
}

function clearDrawings() {
  drawingFeatures.value = []
  syncDrawingEntities()
  stopTool()
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
    positions: [pendingTextAnchor.value],
    text: textDraft.value.trim(),
  })
  syncDrawingEntities()
  cancelTextInput()
}

function ensureDrawingSources() {
  if (!viewer || !supportsEntityOverlays) {
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

function getDegreesArray(points: MapDrawingPoint[]) {
  return points.flatMap((point) => [point.lng, point.lat])
}

function addDrawingFeatureEntity(feature: Map3DDrawingFeature, dataSource: CustomDataSource) {
  const pointColor = Color.fromCssColorString('#f97316')
  const lineColor = Color.fromCssColorString('#ef4444')
  const polygonFill = Color.fromCssColorString('#c084fc').withAlpha(0.24)
  const polygonOutline = Color.fromCssColorString('#9333ea')

  if (feature.type === 'point') {
    const point = feature.positions[0]

    if (!point) {
      return
    }

    dataSource.entities.add({
      id: feature.id,
      position: Cartesian3.fromDegrees(point.lng, point.lat, point.height ?? 0),
      point: {
        pixelSize: 12,
        color: pointColor,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: '<b>自定义点标注</b>',
    })
    return
  }

  if (feature.type === 'text') {
    const point = feature.positions[0]

    if (!point || !feature.text) {
      return
    }

    if (!viewerSupportsSceneLabels()) {
      dataSource.entities.add({
        id: feature.id,
        position: Cartesian3.fromDegrees(point.lng, point.lat, point.height ?? 0),
        point: {
          pixelSize: 8,
          color: pointColor,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
        description: `<b>文字标注</b><br>${feature.text}`,
      })
      return
    }

    dataSource.entities.add({
      id: feature.id,
      position: Cartesian3.fromDegrees(point.lng, point.lat, point.height ?? 0),
      label: {
        text: feature.text,
        font: '16px sans-serif',
        fillColor: Color.fromCssColorString('#f8fafc'),
        outlineColor: Color.fromCssColorString('#0f172a'),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -18),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      point: {
        pixelSize: 8,
        color: pointColor,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>文字标注</b><br>${feature.text}`,
    })
    return
  }

  if (feature.type === 'line' && feature.positions.length >= 2) {
    dataSource.entities.add({
      id: feature.id,
      polyline: {
        positions: Cartesian3.fromDegreesArray(getDegreesArray(feature.positions)),
        width: 4,
        material: lineColor,
        clampToGround: true,
      },
      description: '<b>自定义线标注</b>',
    })
    return
  }

  if (feature.type === 'polygon' && feature.positions.length >= 3) {
    dataSource.entities.add({
      id: feature.id,
      polygon: {
        hierarchy: Cartesian3.fromDegreesArray(getDegreesArray(feature.positions)),
        material: polygonFill,
        outline: true,
        outlineColor: polygonOutline,
        perPositionHeight: false,
        height: 0,
      },
      description: '<b>自定义面标注</b>',
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

  if (!currentTool.value || (currentTool.value !== 'line' && currentTool.value !== 'polygon')) {
    return
  }

  const previewPoints = cursorPoint ? [...tempPoints.value, cursorPoint] : [...tempPoints.value]

  if (previewPoints.length < 1) {
    return
  }

  for (const point of tempPoints.value) {
    previewDataSource.entities.add({
      position: Cartesian3.fromDegrees(point.lng, point.lat, point.height ?? 0),
      point: {
        pixelSize: 7,
        color: Color.fromCssColorString('#f8fafc'),
        outlineColor: Color.fromCssColorString('#0f172a'),
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    })
  }

  if (currentTool.value === 'line' && previewPoints.length >= 2) {
    previewDataSource.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArray(getDegreesArray(previewPoints)),
        width: 3,
        material: Color.fromCssColorString('#fb7185'),
        clampToGround: true,
      },
    })
  }

  if (currentTool.value === 'polygon' && previewPoints.length >= 2) {
    previewDataSource.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArray(getDegreesArray(previewPoints.concat(previewPoints[0]))),
        width: 2,
        material: Color.fromCssColorString('#c084fc'),
        clampToGround: true,
      },
    })

    if (previewPoints.length >= 3) {
      previewDataSource.entities.add({
        polygon: {
          hierarchy: Cartesian3.fromDegreesArray(getDegreesArray(previewPoints)),
          material: Color.fromCssColorString('#c084fc').withAlpha(0.16),
          outline: false,
          perPositionHeight: false,
          height: 0,
        },
      })
    }
  }
}

function finishCurrentDrawing() {
  if (currentTool.value === 'line' && tempPoints.value.length >= 2) {
    drawingFeatures.value = drawingFeatures.value.concat({
      id: `line-${Date.now()}`,
      type: 'line',
      positions: [...tempPoints.value],
    })
    syncDrawingEntities()
  }

  if (currentTool.value === 'polygon' && tempPoints.value.length >= 3) {
    drawingFeatures.value = drawingFeatures.value.concat({
      id: `polygon-${Date.now()}`,
      type: 'polygon',
      positions: [...tempPoints.value],
    })
    syncDrawingEntities()
  }

  tempPoints.value = []
  syncPreviewEntities()
}

function handleSceneLeftClick(position: { x: number; y: number }) {
  if (!currentTool.value) {
    return
  }

  const point = pickScenePoint(position)

  if (!point) {
    showNotice('当前视角无法拾取地图位置，请调整视角后重试。')
    return
  }

  if (currentTool.value === 'marker') {
    drawingFeatures.value = drawingFeatures.value.concat({
      id: `point-${Date.now()}`,
      type: 'point',
      positions: [point],
    })
    syncDrawingEntities()
    return
  }

  if (currentTool.value === 'text') {
    pendingTextAnchor.value = point
    textPanelOpen.value = true
    return
  }

  tempPoints.value = tempPoints.value.concat(point)
  syncPreviewEntities()
}

function handleSceneDoubleClick() {
  if (currentTool.value !== 'line' && currentTool.value !== 'polygon') {
    return
  }

  finishCurrentDrawing()
  stopTool()
}

function showNotice(message: string) {
  noticeMessage.value = message

  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }

  noticeTimer = window.setTimeout(() => {
    noticeMessage.value = ''
  }, 4500)
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function togglePanel(panel: Exclude<PanelName, null>) {
  activePanel.value = activePanel.value === panel ? null : panel
}

function handleLogout() {
  shouldPersistOnUnmount = false
  clearMapViewState(getMapStateScope())
  clearToken()
  clearLoginState()
  router.push('/login')
}

function activateMap3DPage() {
  document.body.classList.add('page-dashboard', 'page-map-3d')

  window.setTimeout(() => {
    viewer?.resize()
    viewer?.scene.requestRender()
  }, 0)
}

function deactivateMap3DPage() {
  if (shouldPersistOnUnmount) {
    persist3DState()
  }

  document.body.classList.remove('page-dashboard', 'page-map-3d')
}

function getMapStateScope() {
  return loginUserText.value || getStoredLoginUser() || 'anonymous'
}

function getCameraFocusPoint() {
  if (!viewer) {
    return null
  }

  const { canvas, globe } = viewer.scene
  const center = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
  const cartesian = viewer.camera.pickEllipsoid(center, globe.ellipsoid)

  if (!cartesian) {
    return null
  }

  const cartographic = globe.ellipsoid.cartesianToCartographic(cartesian)

  return {
    lat: CesiumMath.toDegrees(cartographic.latitude),
    lng: CesiumMath.toDegrees(cartographic.longitude),
  }
}

function createCurrent3DState(): Map3DViewState | null {
  if (!viewer) {
    return null
  }

  const position = viewer.camera.positionCartographic
  const focus = getCameraFocusPoint()

  return {
    camera: {
      lat: CesiumMath.toDegrees(position.latitude),
      lng: CesiumMath.toDegrees(position.longitude),
      height: position.height,
      heading: CesiumMath.toDegrees(viewer.camera.heading),
      pitch: CesiumMath.toDegrees(viewer.camera.pitch),
      roll: CesiumMath.toDegrees(viewer.camera.roll),
      focusLat: focus?.lat,
      focusLng: focus?.lng,
    },
    basemap: selectedBasemap.value,
    layers: snapshotLayers(uiLayers.value),
    drawings: drawingFeatures.value.map((feature) => ({
      ...feature,
      positions: feature.positions.map((point) => ({ ...point })),
    })),
    sidebarOpen: sidebarOpen.value,
    activePanel: activePanel.value,
  }
}

function persist3DState() {
  const state = createCurrent3DState()

  if (!state) {
    return
  }

  save3DViewState(getMapStateScope(), state)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function sanitizeCameraState(camera: Map3DCameraState | null | undefined) {
  if (!camera) {
    return null
  }

  const lat = Number(camera.lat)
  const lng = Number(camera.lng)
  const height = Number(camera.height)
  const heading = Number(camera.heading)
  const pitch = Number(camera.pitch)
  const roll = Number(camera.roll)

  if (
    !isFiniteNumber(lat)
    || !isFiniteNumber(lng)
    || !isFiniteNumber(height)
    || !isFiniteNumber(heading)
    || !isFiniteNumber(pitch)
    || !isFiniteNumber(roll)
  ) {
    return null
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || height <= 0) {
    return null
  }

  return {
    lat,
    lng,
    height,
    heading,
    pitch,
    roll,
    focusLat: isFiniteNumber(camera.focusLat) ? camera.focusLat : undefined,
    focusLng: isFiniteNumber(camera.focusLng) ? camera.focusLng : undefined,
  }
}

function sanitize3DViewState(state: Map3DViewState | null | undefined) {
  if (!state) {
    return null
  }

  const camera = sanitizeCameraState(state.camera)

  if (!camera) {
    return null
  }

  return {
    ...state,
    camera,
  }
}

function resolveInitial3DState() {
  const scope = getMapStateScope()
  const stored3D = read3DViewState(scope)

  if (stored3D) {
    const sanitizedStored3D = sanitize3DViewState(stored3D)

    if (sanitizedStored3D) {
      return sanitizedStored3D
    }

    clear3DViewState(scope)
  }

  if (readLastMapSource(scope) === '2d') {
    const stored2D = read2DViewState(scope)

    if (stored2D) {
      return derive3DStateFrom2D(stored2D)
    }
  }

  return null
}

function setCameraView(camera: Map3DCameraState) {
  const sanitizedCamera = sanitizeCameraState(camera)

  if (!viewer || !sanitizedCamera) {
    goHome()
    return
  }

  viewer?.camera.setView({
    destination: Cartesian3.fromDegrees(sanitizedCamera.lng, sanitizedCamera.lat, sanitizedCamera.height),
    orientation: {
      heading: CesiumMath.toRadians(sanitizedCamera.heading),
      pitch: CesiumMath.toRadians(sanitizedCamera.pitch),
      roll: CesiumMath.toRadians(sanitizedCamera.roll),
    },
  })
}

function switchTo2D() {
  persist3DState()
  saveLastMapSource(getMapStateScope(), '3d')
  router.push('/map-2d')
}

function goHome() {
  const camera = getDefaultHomeCamera()

  viewer?.camera.setView({
    destination: Cartesian3.fromDegrees(camera.lng, camera.lat, camera.height),
    orientation: {
      heading: CesiumMath.toRadians(camera.heading),
      pitch: CesiumMath.toRadians(camera.pitch),
      roll: CesiumMath.toRadians(camera.roll),
    },
  })

  viewer?.scene.requestRender()
}

function flyToLonLat(lng: number, lat: number, height: number) {
  viewer?.camera.flyTo({
    destination: Cartesian3.fromDegrees(lng, lat, height),
    duration: 1.2,
  })
}

function bookmarkHeightFromZoom(zoom: number) {
  const rawHeight = 24000000 / 2 ** zoom
  return Math.max(800, Math.min(rawHeight, 18000000))
}

function goToBookmark(bookmark: Bookmark) {
  flyToLonLat(bookmark.lng, bookmark.lat, bookmarkHeightFromZoom(bookmark.zoom))
  activePanel.value = null
}

function setEntityCollectionOpacity(entities: Entity[], opacity: number) {
  for (const entity of entities) {
    const rgba = entity.properties?.baseColor?.getValue()

    if (!rgba || !Array.isArray(rgba)) {
      continue
    }

    const color = Color.fromBytes(rgba[0], rgba[1], rgba[2], rgba[3] ?? 255).withAlpha(opacity)

    if (entity.point) {
      entity.point.color = new ConstantProperty(color)
    }

    if (entity.polyline) {
      entity.polyline.material = new ColorMaterialProperty(color)
    }

    if (entity.polygon) {
      entity.polygon.material = new ColorMaterialProperty(color)
    }

    if (entity.label) {
      entity.label.fillColor = new ConstantProperty(color)
    }
  }
}

function createDataSourceController(dataSource: CustomDataSource, baseOpacity = 1): OverlayController {
  return {
    setVisible(visible) {
      dataSource.show = visible
    },
    setOpacity(opacity) {
      setEntityCollectionOpacity(dataSource.entities.values, opacity * baseOpacity)
    },
  }
}

function createStudyAreaOverlay(config: MapConfigResponse) {
  const dataSource = new CustomDataSource('研究区范围')
  const positions = getNormalizedStudyAreaPoints(config).flatMap((point) => [point.lng, point.lat])
  const basePolygonColor = Color.fromCssColorString('#fb923c')
  const baseOutlineColor = Color.fromCssColorString('#f97316')

  dataSource.entities.add({
    name: '研究区范围',
    polygon: {
      hierarchy: Cartesian3.fromDegreesArray(positions),
      material: basePolygonColor.withAlpha(0.24),
      height: 0,
      perPositionHeight: false,
    },
    properties: {
      baseColor: [251, 146, 60, 255],
    },
    description: '<b>黄河三角洲近岸水深研究区</b>',
  })

  dataSource.entities.add({
    name: '研究区边界',
    polyline: {
      positions: Cartesian3.fromDegreesArray(positions.concat(positions.slice(0, 2))),
      width: 3,
      material: baseOutlineColor,
      clampToGround: true,
    },
    properties: {
      baseColor: [249, 115, 22, 255],
    },
  })

  viewer?.dataSources.add(dataSource)
  overlayRegistry.set('研究区范围', createDataSourceController(dataSource))
}

function createDepthPointOverlay(config: MapConfigResponse) {
  const dataSource = new CustomDataSource('水深测点')

  for (const point of config.depthData) {
    const color = point.depth < 3
      ? Color.fromCssColorString('#38bdf8')
      : point.depth < 6
        ? Color.fromCssColorString('#0ea5e9')
        : point.depth < 10
          ? Color.fromCssColorString('#2563eb')
          : Color.fromCssColorString('#1e3a8a')

    dataSource.entities.add({
      name: `水深测点 ${point.id}`,
      position: Cartesian3.fromDegrees(point.lng, point.lat, 0),
      point: {
        pixelSize: 10,
        color,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>水深测点：${point.id}</b><br>经度：${point.lng}<br>纬度：${point.lat}<br>水深：${point.depth} m`,
      properties: {
        baseColor: [Math.round(color.red * 255), Math.round(color.green * 255), Math.round(color.blue * 255), 255],
      },
    })
  }

  viewer?.dataSources.add(dataSource)
  overlayRegistry.set('水深测点', createDataSourceController(dataSource))
}

function createRouteOverlay(config: MapConfigResponse) {
  const dataSource = new CustomDataSource('无人船测深航线')
  const routePositions = config.depthData.flatMap((point) => [point.lng, point.lat, 1])

  dataSource.entities.add({
    name: '无人船测深航线',
    polyline: {
      positions: Cartesian3.fromDegreesArrayHeights(routePositions),
      width: 4,
      material: Color.fromCssColorString('#22c55e'),
      clampToGround: false,
    },
    description: '<b>无人船单波束测深航线</b>',
    properties: {
      baseColor: [34, 197, 94, 255],
    },
  })

  viewer?.dataSources.add(dataSource)
  overlayRegistry.set('无人船测深航线', createDataSourceController(dataSource))
}

function createMonitoringOverlay(config: MapConfigResponse) {
  const dataSource = new CustomDataSource('监测位置')

  for (const point of config.monitoringPoints) {
    dataSource.entities.add({
      name: point.pointName,
      position: Cartesian3.fromDegrees(point.longitude, point.latitude, 0),
      point: {
        pixelSize: 11,
        color: Color.fromCssColorString('#ef4444'),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>${point.pointName}</b><br>监测时间：${point.monitoredAt}<br>地下水高程：${point.elevation.toFixed(3)} m<br>经度：${point.longitude.toFixed(6)}<br>纬度：${point.latitude.toFixed(6)}`,
      properties: {
        baseColor: [239, 68, 68, 255],
      },
    })
  }

  viewer?.dataSources.add(dataSource)
  overlayRegistry.set('监测位置', createDataSourceController(dataSource))
}

function createFieldSurveyOverlay(surveys: FieldSurvey[]) {
  const dataSource = new CustomDataSource('野外考察')

  for (const survey of surveys) {
    const imageMarkup = survey.images.length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:10px;">${survey.images
          .map((image) => `<img src="${image.url}" alt="${image.originalName}" style="width:100%;height:72px;object-fit:cover;border-radius:8px;" />`)
          .join('')}</div>`
      : '<div style="margin-top:10px;">暂无现场图片</div>'

    dataSource.entities.add({
      name: survey.name,
      position: Cartesian3.fromDegrees(survey.longitude, survey.latitude, 0),
      point: {
        pixelSize: 12,
        color: Color.fromCssColorString('#f59e0b'),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>${survey.name}</b><br>编号：${survey.serialNo}<br>时间：${survey.surveyTime}<br>经度：${survey.longitude.toFixed(6)}<br>纬度：${survey.latitude.toFixed(6)}<br>简介：${survey.description || '暂无简介'}${imageMarkup}`,
      properties: {
        baseColor: [245, 158, 11, 255],
      },
    })
  }

  viewer?.dataSources.add(dataSource)
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

  const currentLoad = arcGisOverlayLoads.get(layer.name)

  if (currentLoad) {
    return currentLoad
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
        setVisible(visible) {
          imageryLayer.show = visible
        },
        setOpacity(opacity) {
          imageryLayer.alpha = opacity
        },
      })
    } catch {
      showNotice(`ArcGIS Server 图层加载失败：${layer.url}`)
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
  overlayRegistry.clear()
  arcGisOverlayLoads.clear()

  if (supportsEntityOverlays) {
    createStudyAreaOverlay(config)
    createDepthPointOverlay(config)
    createRouteOverlay(config)
    createMonitoringOverlay(config)
    createFieldSurveyOverlay(surveys)
  } else {
    registerDisabledEntityOverlays()
  }

  for (const layer of uiLayers.value) {
    if (layer.isArcGISServer && layer.url) {
      if (layer.visible) {
        void createArcGisOverlay(layer)
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

async function createBasemapLayers(key: string) {
  const normalizedKey = normalizeBasemapKey(key)

  switch (normalizedKey) {
    case 'gaode':
      return [
        new ImageryLayer(
          new AMapImageryProvider({
            style: 'elec',
            crs: 'WGS84',
          }),
        ),
      ]
    case 'gaodeImg':
      return [
        new ImageryLayer(
          new AMapImageryProvider({
            style: 'img',
            crs: 'WGS84',
          }),
        ),
        new ImageryLayer(
          new AMapImageryProvider({
            style: 'cva',
            crs: 'WGS84',
          }),
        ),
      ]
    case 'esriImg': {
      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
      )

      return [new ImageryLayer(provider)]
    }
    case 'esriTopo': {
      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
      )

      return [new ImageryLayer(provider)]
    }
    case 'osm':
    default:
      return [
        new ImageryLayer(
          new UrlTemplateImageryProvider({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            credit: '© OpenStreetMap',
            maximumLevel: 19,
            tilingScheme: new WebMercatorTilingScheme(),
          }),
        ),
      ]
  }
}

async function changeBaseLayer(key: string) {
  if (!viewer) {
    return
  }

  const normalizedKey = normalizeBasemapKey(key)

  if (currentBasemapKey === normalizedKey && basemapLayers.length > 0) {
    selectedBasemap.value = normalizedKey
    return
  }

  try {
    const nextLayers = await createBasemapLayers(normalizedKey)

    for (const layer of basemapLayers) {
      viewer.imageryLayers.remove(layer, true)
    }

    basemapLayers = []

    nextLayers.forEach((layer, index) => {
      viewer?.imageryLayers.add(layer, index)
    })

    basemapLayers = nextLayers
    currentBasemapKey = normalizedKey
    selectedBasemap.value = normalizedKey
    viewer.scene.requestRender()
  } catch {
    if (normalizedKey !== 'osm') {
      try {
        const fallbackLayers = await createBasemapLayers('osm')

        for (const layer of basemapLayers) {
          viewer.imageryLayers.remove(layer, true)
        }

        basemapLayers = []

        fallbackLayers.forEach((layer, index) => {
          viewer?.imageryLayers.add(layer, index)
        })

        basemapLayers = fallbackLayers
        currentBasemapKey = 'osm'
        selectedBasemap.value = 'osm'
        viewer.scene.requestRender()
        showNotice('当前三维底图加载失败，已自动切换为 OpenStreetMap。')
        return
      } catch {
        // Fall through to the generic failure notice below.
      }
    }

    showNotice('三维底图切换失败，请稍后重试。')
  }
}

function toggleLayer(index: number) {
  const layer = uiLayers.value[index]

  if (layer.isArcGISServer && layer.url && layer.visible && !overlayRegistry.has(layer.name)) {
    void createArcGisOverlay(layer)
    return
  }

  const overlay = overlayRegistry.get(layer.name)
  overlay?.setVisible(layer.visible)
}

function updateOpacity(index: number) {
  const layer = uiLayers.value[index]

  if (layer.isArcGISServer && layer.url && layer.visible && !overlayRegistry.has(layer.name)) {
    void createArcGisOverlay(layer)
    return
  }

  const overlay = overlayRegistry.get(layer.name)
  overlay?.setOpacity(layer.opacity)
}

function attachCoordListener() {
  if (!viewer) {
    return
  }

  coordHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)
  coordHandler.setInputAction((click: { position: { x: number; y: number } }) => {
    handleSceneLeftClick(click.position)
  }, ScreenSpaceEventType.LEFT_CLICK)

  coordHandler.setInputAction(() => {
    handleSceneDoubleClick()
  }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

  coordHandler.setInputAction((movement: { endPosition: { x: number; y: number } }) => {
    if (!viewer) {
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
    syncPreviewEntities(pickedPoint)
  }, ScreenSpaceEventType.MOUSE_MOVE)
}

async function loadScene() {
  if (!viewerElement.value) {
    return
  }

  const containerReady = await waitForViewerLayout(viewerElement.value)

  if (!containerReady) {
    activateSceneUnavailableMode('三维容器未获得有效尺寸，无法启动渲染。请刷新页面后重试。')
    return
  }

  const supportCheck = checkCesiumSupport()

  if (!supportCheck.supported) {
    activateSceneUnavailableMode(supportCheck.reason)
    return
  }

  disposeViewer()
  sceneUnavailable.value = false
  supportsEntityOverlays = true

  const [config, surveys] = await Promise.all([fetchMapConfig(), fetchFieldSurveys()])
  const normalizedConfig = {
    ...config,
    layers: normalizeLayerConfigs(config.layers),
  }
  mapConfig.value = normalizedConfig
  let initialViewState = resolveInitial3DState()

  if (initialViewState && !isCameraNearStudyArea(initialViewState.camera, normalizedConfig)) {
    clear3DViewState(getMapStateScope())
    initialViewState = null
  }

  fieldSurveys.value = surveys
  selectedBasemap.value = normalizeBasemapKey(initialViewState?.basemap ?? 'osm')
  sidebarOpen.value = initialViewState?.sidebarOpen ?? false
  activePanel.value = initialViewState?.activePanel ?? null
  drawingFeatures.value = initialViewState?.drawings?.map((feature) => ({
    ...feature,
    positions: feature.positions.map((point) => ({ ...point })),
  })) ?? []
  uiLayers.value = mergeLayerSnapshots(
    normalizedConfig.layers.map((layer) => ({
      ...layer,
      opacity: Number(layer.opacity ?? 1),
    })),
    initialViewState?.layers,
  )

  viewer = new Viewer(viewerElement.value, {
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    baseLayer: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    shouldAnimate: true,
    infoBox: false,
    selectionIndicator: false,
    useDefaultRenderLoop: false,
    showRenderLoopErrors: false,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(viewer.cesiumWidget as any).renderError?.addEventListener((_widget: unknown, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '未知渲染错误')
    activateSceneUnavailableMode(`三维渲染错误，已停止渲染：${message}`)
  })

  viewer.resize()
  viewer.scene.requestRender()
  viewer.useDefaultRenderLoop = true

  supportsEntityOverlays = viewerSupportsSceneLabels()
  viewer.scene.globe.depthTestAgainstTerrain = false
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  ensureDrawingSources()
  await changeBaseLayer(selectedBasemap.value)
  await createBusinessLayers(normalizedConfig, surveys)
  syncDrawingEntities()
  syncPreviewEntities()
  attachCoordListener()

  if (!supportsEntityOverlays) {
    stopTool()
    showNotice('当前设备 WebGL 能力有限，三维地图已切换为兼容模式，仅保留底图与影像图层显示。')
  }

  if (initialViewState) {
    setCameraView(initialViewState.camera)
  } else {
    goHome()
  }
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台 - 三维地图'
  activateMap3DPage()

  try {
    await loadScene()
  } catch (error) {
    if (!isAuthError(error)) {
      showNotice(`三维初始化失败：${getSceneErrorMessage(error)}`)
      return
    }

    clearToken()
    clearLoginState()
    router.push('/login')
  }
})

onActivated(() => {
  document.title = '海岸带时空水深数据平台 - 三维地图'
  activateMap3DPage()
})

onDeactivated(() => {
  deactivateMap3DPage()
})

onBeforeUnmount(() => {
  deactivateMap3DPage()

  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }

  disposeViewer()
  document.body.classList.remove('page-dashboard', 'page-map-3d')
})
</script>

<style scoped>
.map3d-root,
.map3d-main,
.map3d-canvas {
  height: 100%;
}

.map3d-main {
  position: relative;
  overflow: hidden;
}

.map3d-canvas-hidden {
  visibility: hidden;
}

.map3d-root {
  min-height: 100vh;
  background: #06111f;
}

.map3d-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(14, 116, 144, 0.18), transparent 42%),
    linear-gradient(180deg, rgba(3, 7, 18, 0.68), rgba(3, 7, 18, 0.9));
  z-index: 8;
}

.map3d-fallback-card {
  width: min(560px, 100%);
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 24px;
  background: rgba(9, 14, 27, 0.88);
  box-shadow: 0 24px 80px rgba(2, 8, 23, 0.45);
  padding: 28px;
  color: #e2e8f0;
}

.map3d-fallback-kicker {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #67e8f9;
  margin-bottom: 10px;
}

.map3d-fallback-card h2 {
  margin: 0 0 12px;
  font-size: 28px;
}

.map3d-fallback-card p {
  margin: 0 0 22px;
  line-height: 1.7;
  color: rgba(226, 232, 240, 0.82);
}

.map3d-fallback-actions {
  display: flex;
  gap: 10px;
}

.map3d-header {
  gap: 16px;
}

.map3d-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.map3d-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.map3d-header-left h1 {
  margin: 0;
}

.map3d-header-actions {
  gap: 10px;
  flex-wrap: wrap;
}

.map3d-mode-btn {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
}

.map3d-tip {
  max-width: 360px;
}

.map3d-text-panel {
  position: absolute;
  right: 22px;
  bottom: 88px;
  width: min(320px, calc(100vw - 44px));
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(7, 15, 28, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.34);
  z-index: 1200;
}

.map3d-text-panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.map3d-text-panel-coord {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.7);
}

.map3d-text-panel-input {
  width: 100%;
  resize: vertical;
  min-height: 88px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  padding: 10px 12px;
  box-sizing: border-box;
}

.map3d-text-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.map3d-text-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  color: #f8fafc;
  cursor: pointer;
}

.map3d-text-btn-secondary {
  background: rgba(51, 65, 85, 0.95);
}

.map3d-sidebar {
  max-height: calc(100vh - 110px);
  overflow: auto;
}

.map3d-sidebar-section {
  margin-bottom: 18px;
}

.map3d-canvas :deep(.cesium-viewer-toolbar),
.map3d-canvas :deep(.cesium-viewer-animationContainer),
.map3d-canvas :deep(.cesium-viewer-timelineContainer),
.map3d-canvas :deep(.cesium-viewer-bottom) {
  display: none;
}

.map3d-canvas :deep(.cesium-viewer),
.map3d-canvas :deep(.cesium-viewer-cesiumWidgetContainer),
.map3d-canvas :deep(.cesium-widget),
.map3d-canvas :deep(canvas) {
  width: 100%;
  height: 100%;
}

.map3d-legend {
  margin-bottom: 0;
}

@media (max-width: 960px) {
  .map3d-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .map3d-header-left {
    width: 100%;
    align-items: flex-start;
  }

  .map3d-title-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>