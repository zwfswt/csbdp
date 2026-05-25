<template>
  <div class="map3d-rebuild-root">
    <div class="header map3d-header">
      <div class="map3d-header-left">
        <div class="map3d-title-group">
          <h1>海岸带时空水深数据平台</h1>
          <p>三维模块重建版</p>
        </div>
      </div>

      <div class="header-user map3d-header-actions">
        <button type="button" class="map3d-action-btn" @click="switchTo2D">切换到二维地图</button>
        <span>{{ loginUserText }}</span>
        <button type="button" class="map3d-icon-btn" title="退出登录" @click="handleLogout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <div class="main map3d-main">
      <aside class="map3d-side-panel">
        <div class="map3d-panel-card">
          <div class="map3d-panel-kicker">Rebuild Status</div>
          <h2>第一阶段骨架</h2>
          <p>当前版本先恢复三维场景、底图切换、Home 视角和书签飞行，后续再逐步补回图层、业务覆盖物和标注工具。</p>
        </div>

        <div class="map3d-panel-card">
          <div class="map3d-panel-title">底图</div>
          <div class="map3d-basemap-list">
            <button
              v-for="option in basemapOptions"
              :key="option.value"
              type="button"
              class="map3d-basemap-btn"
              :class="{ active: selectedBasemap === option.value }"
              @click="changeBasemap(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="map3d-panel-card">
          <div class="map3d-panel-title">业务图层</div>
          <div class="map3d-layer-list">
            <div v-for="(layer, index) in uiLayers" :key="layer.name" class="map3d-layer-item">
              <label class="map3d-layer-toggle">
                <input v-model="layer.visible" type="checkbox" @change="toggleLayer(index)" />
                <span>{{ layer.name }}</span>
              </label>
              <div class="map3d-layer-meta">类型：{{ layer.type }}</div>
              <div v-if="layer.isArcGISServer" class="map3d-layer-meta">来源：ArcGIS Server / MapServer</div>
              <input v-model.number="layer.opacity" type="range" min="0" max="1" step="0.05" @input="updateOpacity(index)" />
            </div>
          </div>
        </div>

        <div class="map3d-panel-card">
          <div class="map3d-panel-title">空间书签</div>
          <div v-if="bookmarks.length" class="map3d-bookmark-list">
            <button v-for="bookmark in bookmarks" :key="bookmark.id" type="button" class="map3d-bookmark-btn" @click="flyToBookmark(bookmark)">
              {{ bookmark.name }}
            </button>
          </div>
          <p v-else class="map3d-empty-text">当前暂无书签数据。</p>
        </div>

        <div class="map3d-panel-card">
          <button type="button" class="map3d-action-btn map3d-action-btn-full" @click="goHome">回到研究区</button>
        </div>
      </aside>

      <section class="map3d-stage">
        <div ref="viewerElement" class="map3d-canvas" :class="{ 'map3d-canvas-hidden': Boolean(sceneError) }"></div>

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

        <div v-if="!sceneError" class="map3d-info-panel">
          <div class="map3d-info-row">{{ coordText }}</div>
          <div v-if="selectedInfoHtml" class="map3d-info-card">
            <div class="map3d-info-title">{{ selectedInfoTitle }}</div>
            <div class="map3d-info-content" v-html="selectedInfoHtml"></div>
          </div>
        </div>

        <div v-if="!sceneError" class="map3d-toolbar">
          <button type="button" class="map3d-tool-btn" :class="{ active: currentTool === 'marker' }" :disabled="!supportsPointEntities" @click="setTool('marker')">点标注</button>
          <button type="button" class="map3d-tool-btn" :class="{ active: currentTool === 'text' }" :disabled="!supportsPointEntities" @click="setTool('text')">文字标注</button>
          <button type="button" class="map3d-tool-btn" :class="{ active: currentTool === 'line' }" @click="setTool('line')">线标注</button>
          <button type="button" class="map3d-tool-btn" :class="{ active: currentTool === 'polygon' }" @click="setTool('polygon')">面标注</button>
          <button type="button" class="map3d-tool-btn map3d-tool-btn-danger" @click="clearDrawings">清除标注</button>
        </div>

        <div v-if="toolTip && !sceneError" class="map3d-tool-tip">{{ toolTip }}</div>

        <div v-if="textPanelOpen && pendingTextAnchor && !sceneError" class="map3d-text-panel">
          <div class="map3d-text-panel-title">文字标注</div>
          <div class="map3d-text-panel-coord">经度：{{ pendingTextAnchor.lng.toFixed(6) }}，纬度：{{ pendingTextAnchor.lat.toFixed(6) }}</div>
          <textarea v-model="textDraft" class="map3d-text-panel-input" rows="3" maxlength="120" placeholder="请输入标注文字"></textarea>
          <div class="map3d-text-panel-actions">
            <button type="button" class="map3d-action-btn map3d-action-btn-secondary" @click="cancelTextInput">取消</button>
            <button type="button" class="map3d-action-btn" @click="confirmTextInput">确认</button>
          </div>
        </div>

        <div v-if="statusText && !sceneError" class="map3d-status-chip">{{ statusText }}</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import {
  ArcGisMapServerImageryProvider,
  Cartesian2,
  Cartesian3,
  Color,
  CustomDataSource,
  EllipsoidTerrainProvider,
  HeightReference,
  ImageryLayer,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  Viewer,
  WebMercatorTilingScheme,
} from 'cesium'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
  mergeLayerSnapshots,
  read3DViewState,
  save3DViewState,
  saveLastMapSource,
  snapshotLayers,
  type Map3DDrawingFeature,
  type MapDrawingPoint,
  type Map3DViewState,
} from '../utils/mapViewState'
import { normalizeLayerConfigs } from '../utils/layerConfig'

type BasemapKey = 'osm' | 'esriImg' | 'esriTopo'
type ToolName = 'marker' | 'text' | 'line' | 'polygon' | null

type BasemapOption = {
  value: BasemapKey
  label: string
}

const router = useRouter()
const viewerElement = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const sceneError = ref('')
const statusText = ref('')
const coordText = ref('经度：--，纬度：--，镜头高度：--')
const selectedInfoTitle = ref('')
const selectedInfoHtml = ref('')
const currentTool = ref<ToolName>(null)
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
const uiLayers = ref<BusinessLayerConfig[]>([])

let viewer: Viewer | null = null
let coordHandler: ScreenSpaceEventHandler | null = null
let drawingDataSource: CustomDataSource | null = null
let previewDataSource: CustomDataSource | null = null
let renderFrameId: number | null = null
const overlayRegistry = new Map<string, { setVisible: (visible: boolean) => void; setOpacity: (opacity: number) => void }>()
const arcGisOverlayLoads = new Map<string, Promise<void>>()

const basemapOptions: BasemapOption[] = [
  { value: 'osm', label: 'OpenStreetMap' },
  { value: 'esriImg', label: 'ArcGIS 影像' },
  { value: 'esriTopo', label: 'ArcGIS 地形' },
]

const loginUserText = computed(() => getStoredLoginUser() ?? 'admin')
const bookmarks = computed(() => mapConfig.value?.bookmarks ?? [])
const currentUserScope = computed(() => getStoredCurrentUser()?.username ?? null)

function setDebugViewer(nextViewer: Viewer | null) {
  if (!import.meta.env.DEV) {
    return
  }

  ;(window as Window & { __CSBDP_3D_VIEWER__?: Viewer | null }).__CSBDP_3D_VIEWER__ = nextViewer
}

function switchTo2D() {
  saveLastMapSource(currentUserScope.value, '2d')
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
  const savedState = read3DViewState(currentUserScope.value)

  if (savedState?.camera) {
    return savedState
  }

  return {
    camera: getDefaultCamera(),
    basemap: selectedBasemap.value,
    layers: snapshotLayers(uiLayers.value),
    sidebarOpen: true,
    activePanel: null,
  } satisfies Map3DViewState
}

function persistViewState() {
  if (!viewer) {
    return
  }

  const cartographic = viewer.camera.positionCartographic
  const state: Map3DViewState = {
    camera: {
      lat: CesiumMath.toDegrees(cartographic.latitude),
      lng: CesiumMath.toDegrees(cartographic.longitude),
      height: cartographic.height,
      heading: CesiumMath.toDegrees(viewer.camera.heading),
      pitch: CesiumMath.toDegrees(viewer.camera.pitch),
      roll: CesiumMath.toDegrees(viewer.camera.roll),
    },
    basemap: selectedBasemap.value,
    layers: snapshotLayers(uiLayers.value),
    drawings: drawingFeatures.value.map((feature) => ({
      ...feature,
      positions: feature.positions.map((point) => ({ ...point })),
    })),
    sidebarOpen: true,
    activePanel: null,
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
  statusText.value = `当前底图：${basemapLabel} | 镜头高度：${height.toLocaleString()} m${businessOverlayNotice}${pointOverlayNotice}`
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
  syncPreviewEntities()
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

  if ((currentTool.value === 'line' || currentTool.value === 'polygon') && tempPoints.value.length > 0) {
    finishCurrentDrawing()
  }

  currentTool.value = toolName
  pendingTextAnchor.value = null
  textPanelOpen.value = false
  textDraft.value = ''
  tempPoints.value = []

  const messages: Record<Exclude<ToolName, null>, string> = {
    marker: '点击三维场景添加点标注；再次点击按钮关闭。',
    text: '点击三维场景放置文字锚点，然后输入文字。',
    line: '连续点击绘制线，双击结束；再次点击按钮关闭。',
    polygon: '连续点击绘制面，双击结束；再次点击按钮关闭。',
  }

  toolTip.value = messages[toolName]
  syncPreviewEntities()
}

function clearDrawings() {
  drawingFeatures.value = []
  syncDrawingEntities()
  stopTool()
  persistViewState()
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
          polyline.material = polyline.material.withAlpha(alpha)
        }

        const polygon = entity.polygon

        if (polygon?.material && polygon.material instanceof Color) {
          polygon.material = polygon.material.withAlpha(alpha)
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

function probePointEntitySupport(activeViewer: Viewer) {
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

function attachRenderErrorListener(activeViewer: Viewer) {
  ;(activeViewer.cesiumWidget as { renderError?: { addEventListener: (listener: (_widget: unknown, error: unknown) => void) => void } }).renderError?.addEventListener((_widget, error) => {
    if (viewer !== activeViewer) {
      return
    }

    handleSceneFailure(error)
  })
}

async function populateViewerScene(viewState: Map3DViewState, includeBusinessOverlays = true) {
  await applyBasemap((viewState.basemap as BasemapKey) ?? 'osm')

  if (includeBusinessOverlays) {
    await createBusinessLayers(mapConfig.value as MapConfigResponse, fieldSurveys.value)
  } else {
    viewer?.dataSources.removeAll(true)
    overlayRegistry.clear()
    arcGisOverlayLoads.clear()
  }

  ensureDrawingSource()
  syncDrawingEntities()
  syncPreviewEntities()
  flyToCamera(viewState.camera)
  viewer?.camera.moveEnd.addEventListener(onCameraMoveEnd)
  attachInteractionListeners()
  updateStatusText()
}

function addDrawingFeatureEntity(feature: Map3DDrawingFeature, dataSource: CustomDataSource) {
  const pointColor = Color.fromCssColorString('#f97316')
  const lineColor = Color.fromCssColorString('#ef4444')
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
      description: '<b>自定义线标注</b>',
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

  if (currentTool.value === 'line' && previewPoints.length >= 2) {
    previewDataSource.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArray(previewPoints.flatMap((point) => [point.lng, point.lat])),
        width: 3,
        material: Color.fromCssColorString('#fb7185'),
        clampToGround: true,
      },
    })
  }

  if (currentTool.value === 'polygon' && previewPoints.length >= 2) {
    previewDataSource.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArray(previewPoints.concat(previewPoints[0]).flatMap((point) => [point.lng, point.lat])),
        width: 2,
        material: Color.fromCssColorString('#c084fc'),
        clampToGround: true,
      },
    })

    if (previewPoints.length >= 3) {
      previewDataSource.entities.add({
        polygon: {
          hierarchy: Cartesian3.fromDegreesArray(previewPoints.flatMap((point) => [point.lng, point.lat])),
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
    const imageMarkup = survey.images.length
      ? `<div class="map3d-inline-gallery">${survey.images
          .map(
            (image) =>
              `<a class="map3d-inline-gallery-link" href="${escapeHtml(image.url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.originalName)}" /></a>`,
          )
          .join('')}</div>`
      : '<div class="map3d-inline-empty">暂无现场图片</div>'

    dataSource.entities.add({
      name: survey.name,
      position: Cartesian3.fromDegrees(survey.longitude, survey.latitude, 0),
      point: {
        pixelSize: 11,
        color: Color.fromCssColorString('#f59e0b'),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      description: `<b>${escapeHtml(survey.name)}</b><br>编号：${escapeHtml(survey.serialNo)}<br>时间：${escapeHtml(survey.surveyTime)}<br>经度：${formatCoordinate(survey.longitude)}<br>纬度：${formatCoordinate(survey.latitude)}<br>简介：${escapeHtml(survey.description || '暂无简介')}${imageMarkup}`,
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
  flyToCamera(getDefaultCamera())
}

function flyToBookmark(bookmark: Bookmark) {
  if (!viewer) {
    return
  }

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(bookmark.lng, bookmark.lat, Math.max(1200, 24000000 / 2 ** bookmark.zoom)),
    duration: 1.5,
  })
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

function clearSelectedInfo() {
  selectedInfoTitle.value = ''
  selectedInfoHtml.value = ''
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

function handleScenePick(position: { x: number; y: number }) {
  if (!viewer) {
    return
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

    if (currentTool.value === 'line' || currentTool.value === 'polygon') {
      tempPoints.value = tempPoints.value.concat({ ...point })
      syncPreviewEntities()
      return
    }
  }

  const picked = viewer.scene.pick(position) as { id?: { name?: string; description?: unknown } } | undefined
  const entity = picked?.id

  if (!entity) {
    clearSelectedInfo()
    return
  }

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

  coordHandler.setInputAction((click: { position: { x: number; y: number } }) => {
    handleScenePick(click.position)
  }, ScreenSpaceEventType.LEFT_CLICK)

  coordHandler.setInputAction(() => {
    if (currentTool.value !== 'line' && currentTool.value !== 'polygon') {
      return
    }

    finishCurrentDrawing()
    stopTool()
  }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
}

function disposeViewer() {
  stopRenderLoop()
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
  return new Viewer(element, {
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 26%),
    linear-gradient(180deg, #08111f 0%, #0b1730 52%, #0d2039 100%);
}

.map3d-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 24px;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(7, 15, 28, 0.82);
  backdrop-filter: blur(18px);
}

.map3d-header-left,
.map3d-title-group,
.map3d-header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.map3d-title-group {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.map3d-title-group h1,
.map3d-title-group p {
  margin: 0;
}

.map3d-title-group p {
  color: rgba(226, 232, 240, 0.72);
}

.map3d-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
}

.map3d-side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map3d-panel-card,
.map3d-overlay-card {
  padding: 20px;
  border-radius: 20px;
  color: #e2e8f0;
  background: rgba(7, 15, 28, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
}

.map3d-panel-kicker {
  margin-bottom: 8px;
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.map3d-panel-card h2,
.map3d-panel-card p,
.map3d-overlay-card h2,
.map3d-overlay-card p {
  margin: 0;
}

.map3d-panel-card h2,
.map3d-overlay-card h2 {
  margin-bottom: 10px;
}

.map3d-panel-title {
  margin-bottom: 12px;
  font-weight: 700;
}

.map3d-basemap-list,
.map3d-bookmark-list,
.map3d-layer-list {
  display: grid;
  gap: 10px;
}

.map3d-layer-item {
  padding: 12px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.58);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.map3d-layer-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.map3d-layer-meta {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.68);
}

.map3d-layer-item input[type='range'] {
  width: 100%;
  margin-top: 10px;
}

.map3d-stage {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: #020617;
}

.map3d-canvas,
.map3d-canvas :deep(.cesium-widget),
.map3d-canvas :deep(canvas) {
  width: 100%;
  height: 100%;
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
}

.map3d-toolbar {
  position: absolute;
  top: 18px;
  right: 18px;
  display: flex;
  gap: 10px;
  z-index: 2;
}

.map3d-tool-btn {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  padding: 10px 14px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
  cursor: pointer;
}

.map3d-tool-btn.active {
  color: #0f172a;
  background: linear-gradient(135deg, #7dd3fc, #bfdbfe);
}

.map3d-tool-btn-danger {
  background: rgba(127, 29, 29, 0.88);
}

.map3d-tool-tip {
  position: absolute;
  top: 66px;
  right: 18px;
  max-width: 300px;
  padding: 10px 14px;
  border-radius: 14px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.map3d-text-panel {
  position: absolute;
  top: 112px;
  right: 18px;
  width: min(340px, calc(100% - 36px));
  padding: 16px;
  border-radius: 18px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}

.map3d-text-panel-title {
  margin-bottom: 8px;
  font-weight: 700;
}

.map3d-text-panel-coord {
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.7);
}

.map3d-text-panel-input {
  width: 100%;
  min-height: 88px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: #e2e8f0;
  background: rgba(2, 6, 23, 0.72);
}

.map3d-text-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.map3d-info-panel {
  position: absolute;
  left: 18px;
  bottom: 18px;
  display: grid;
  gap: 12px;
  width: min(420px, calc(100% - 36px));
}

.map3d-info-row,
.map3d-info-card {
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(14px);
}

.map3d-info-row {
  padding: 10px 14px;
  border-radius: 999px;
}

.map3d-info-card {
  padding: 16px;
  border-radius: 18px;
}

.map3d-info-title {
  margin-bottom: 10px;
  font-weight: 700;
}

.map3d-info-content :deep(.map3d-inline-gallery) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.map3d-info-content :deep(.map3d-inline-gallery-link) {
  display: block;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.map3d-info-content :deep(.map3d-inline-gallery-link img) {
  display: block;
  width: 100%;
  height: 76px;
  object-fit: cover;
}

.map3d-info-content :deep(.map3d-inline-empty) {
  margin-top: 12px;
  color: rgba(226, 232, 240, 0.7);
}

.map3d-overlay-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.map3d-status-chip {
  position: absolute;
  right: 18px;
  bottom: 18px;
  padding: 10px 14px;
  border-radius: 999px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.map3d-action-btn,
.map3d-icon-btn,
.map3d-basemap-btn,
.map3d-bookmark-btn {
  border: none;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease;
}

.map3d-action-btn,
.map3d-basemap-btn,
.map3d-bookmark-btn {
  padding: 11px 14px;
  border-radius: 14px;
}

.map3d-action-btn {
  color: #0f172a;
  background: linear-gradient(135deg, #f8fafc, #cbd5e1);
}

.map3d-action-btn-secondary {
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.map3d-action-btn-full {
  width: 100%;
}

.map3d-icon-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #ef4444, #f97316);
}

.map3d-basemap-btn,
.map3d-bookmark-btn {
  text-align: left;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.map3d-basemap-btn.active {
  color: #0f172a;
  background: linear-gradient(135deg, #7dd3fc, #bfdbfe);
}

.map3d-empty-text {
  color: rgba(226, 232, 240, 0.72);
}

.map3d-action-btn:hover,
.map3d-icon-btn:hover,
.map3d-basemap-btn:hover,
.map3d-bookmark-btn:hover {
  transform: translateY(-1px);
}

@media (max-width: 980px) {
  .map3d-main {
    grid-template-columns: 1fr;
  }

  .map3d-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .map3d-header-actions {
    flex-wrap: wrap;
  }

  .map3d-stage {
    min-height: 60vh;
  }
}
</style>