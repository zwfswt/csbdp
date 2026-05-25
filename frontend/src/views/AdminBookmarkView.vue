<template>
  <AdminLayout title="书签管理" description="维护地图书签的名称、坐标、缩放级别、描述与排序值，保存后将同步用于前台书签面板。">
    <template #actions>
      <button class="admin-home-link" type="button" @click="openCreateModal">新增书签</button>
    </template>

    <div class="admin-home-page">
      <section class="admin-panel-card admin-panel-card-wide admin-page-intro-card">
        <div class="admin-page-intro-grid">
          <div class="admin-page-intro-copy">
            <div class="admin-section-kicker">Bookmark Views</div>
            <h2>书签视角摘要</h2>
            <p>先确认书签数量、视角层级和描述完整度，再进入排序、坐标和缩放范围的具体调整。</p>

            <div class="admin-page-tag-row">
              <span class="admin-page-tag">书签 {{ bookmarks.length }}</span>
              <span class="admin-page-tag">近景视角 {{ closeRangeBookmarkCount }}</span>
              <span class="admin-page-tag">含描述 {{ describedBookmarkCount }}</span>
              <span class="admin-page-tag">平均缩放 {{ averageZoomLabel }}</span>
            </div>
          </div>

          <div class="admin-page-intro-side">
            <article v-for="item in bookmarkInsightCards" :key="item.label" class="admin-page-insight-card" :class="item.tone">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-page-strip-card">
        <div class="admin-section-heading">
          <div>
            <div class="admin-section-kicker">Operation Zones</div>
            <h2>操作分区</h2>
          </div>
          <p>把书签页拆成基础资料、视角校正和地图选点三类工作区，方便统一维护前台快速定位入口。</p>
        </div>

        <div class="admin-operation-grid">
          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-bookmark"></i>
              <span>基础资料</span>
            </div>
            <strong>新增或调整书签条目</strong>
            <p>维护名称、描述和排序值，保证书签列表在前台的展示顺序稳定。</p>
            <button class="admin-home-link" type="button" @click="openCreateModal">新增书签</button>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-arrows-to-eye"></i>
              <span>视角校正</span>
            </div>
            <strong>缩放层级与视角分层</strong>
            <p>通过缩放级别区分广域概览和局部近景，避免多个书签视角过度重叠。</p>
            <small>近景视角 {{ closeRangeBookmarkCount }} 条。</small>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-map-location-dot"></i>
              <span>地图选点</span>
            </div>
            <strong>地图与经纬度联动</strong>
            <p>直接在地图上修正书签坐标，确保点击书签后能落到正确区域。</p>
            <small>平均缩放 {{ averageZoomLabel }}</small>
          </article>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-filter-panel">
        <div class="admin-filter-panel-head">
          <div>
            <div class="admin-section-kicker">Filter Console</div>
            <h2>筛选与排序检查</h2>
          </div>
          <p>先按缩放层级和描述完整度筛选书签，再决定优先检查哪些前台定位入口。</p>
        </div>

        <div class="admin-filter-toolbar">
          <div class="admin-filter-group">
            <span class="admin-filter-label">缩放层级</span>
            <button type="button" class="admin-filter-chip" :class="{ active: zoomFilter === 'all' }" @click="zoomFilter = 'all'">全部 {{ bookmarks.length }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: zoomFilter === 'close' }" @click="zoomFilter = 'close'">近景 {{ closeRangeBookmarkCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: zoomFilter === 'wide' }" @click="zoomFilter = 'wide'">广域 {{ bookmarks.length - closeRangeBookmarkCount }}</button>
          </div>

          <div class="admin-filter-group">
            <span class="admin-filter-label">描述完整度</span>
            <button type="button" class="admin-filter-chip" :class="{ active: descriptionFilter === 'all' }" @click="descriptionFilter = 'all'">全部</button>
            <button type="button" class="admin-filter-chip" :class="{ active: descriptionFilter === 'with-description' }" @click="descriptionFilter = 'with-description'">有描述 {{ describedBookmarkCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: descriptionFilter === 'without-description' }" @click="descriptionFilter = 'without-description'">无描述 {{ bookmarks.length - describedBookmarkCount }}</button>
          </div>
        </div>
      </section>

      <section class="admin-panel-card admin-survey-table-card">
        <div class="admin-table-toolbar">
          <div>
            <h2>书签列表</h2>
            <p>共 {{ filteredBookmarks.length }} 条记录</p>
          </div>

          <label class="admin-search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model.trim="keyword" type="search" placeholder="搜索名称、描述" />
          </label>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th>排序</th>
                <th>书签</th>
                <th>坐标</th>
                <th>视角状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="admin-empty-cell">正在加载数据...</td>
              </tr>
              <tr v-else-if="filteredBookmarks.length === 0">
                <td colspan="5" class="admin-empty-cell">暂无书签记录</td>
              </tr>
              <tr v-for="bookmark in filteredBookmarks" :key="bookmark.id">
                <td>
                  <div class="admin-table-primary">{{ bookmark.sortOrder }}</div>
                  <div class="admin-table-secondary">缩放 {{ bookmark.zoom }}</div>
                </td>
                <td>
                  <div class="admin-table-primary">{{ bookmark.name }}</div>
                  <div class="admin-table-secondary">{{ bookmark.description || '暂无描述' }}</div>
                </td>
                <td>
                  <div class="admin-table-primary">{{ bookmark.lng.toFixed(6) }}, {{ bookmark.lat.toFixed(6) }}</div>
                  <div class="admin-table-secondary">地图定位目标点</div>
                </td>
                <td>
                  <div class="admin-table-primary">
                    <span class="admin-status-tag" :class="bookmark.zoom >= 12 ? 'is-success' : 'is-info'">
                      {{ bookmark.zoom >= 12 ? '近景视角' : '广域视角' }}
                    </span>
                  </div>
                  <div class="admin-table-secondary">
                    <span class="admin-status-tag" :class="bookmark.description ? 'is-neutral' : 'is-warn'">
                      {{ bookmark.description ? '描述完整' : '待补描述' }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="admin-row-actions">
                    <button type="button" @click="openEditModal(bookmark)">编辑</button>
                    <button type="button" class="danger" @click="handleDelete(bookmark)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div v-if="modalVisible" class="admin-modal-mask" @click.self="closeModal">
        <div class="admin-modal admin-survey-modal">
          <div class="admin-modal-header">
            <div>
              <h2>{{ editingBookmark ? '编辑书签' : '新增书签' }}</h2>
              <p>填写书签基础信息，并可通过地图选点调整坐标。</p>
            </div>
            <button type="button" class="admin-modal-close" @click="closeModal">×</button>
          </div>

          <div class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">
            {{ errorMessage }}
          </div>

          <form class="admin-survey-form" @submit.prevent="handleSubmit">
            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>基础资料</h3>
                <p>先维护书签名称、排序值和描述，确定它在前台书签面板中的表达方式。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group">
                  <label for="bookmarkName">名称</label>
                  <input id="bookmarkName" v-model.trim="form.name" type="text" placeholder="请输入书签名称" />
                </div>

                <div class="form-group">
                  <label for="bookmarkSortOrder">排序值</label>
                  <input id="bookmarkSortOrder" v-model.trim="form.sortOrder" type="number" step="1" placeholder="1" />
                </div>

                <div class="form-group">
                  <label for="bookmarkZoom">缩放级别</label>
                  <input id="bookmarkZoom" v-model.trim="form.zoom" type="number" step="1" min="2" max="18" placeholder="10" />
                </div>

                <div class="form-group admin-form-group-wide">
                  <label for="bookmarkDescription">描述</label>
                  <textarea id="bookmarkDescription" v-model.trim="form.description" rows="4" placeholder="请输入书签描述"></textarea>
                </div>
              </div>
            </div>

            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>位置与视角</h3>
                <p>通过经纬度和地图联动校正书签落点，确保前台点击即可定位到目标区域。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group">
                  <label for="bookmarkLongitude">经度</label>
                  <input id="bookmarkLongitude" v-model.trim="form.lng" type="number" step="0.000001" placeholder="119.1526" @change="focusMapToCurrentCoordinates" />
                </div>

                <div class="form-group">
                  <label for="bookmarkLatitude">纬度</label>
                  <input id="bookmarkLatitude" v-model.trim="form.lat" type="number" step="0.000001" placeholder="37.7348" @change="focusMapToCurrentCoordinates" />
                </div>

                <div class="form-group admin-form-group-wide">
                  <div class="admin-coordinate-toolbar">
                    <label>地图选点</label>
                    <div class="admin-coordinate-actions">
                      <button type="button" @click="focusMapToCurrentCoordinates">按当前经纬度定位</button>
                      <button type="button" @click="resetMapToStudyArea">回到研究区中心</button>
                    </div>
                  </div>
                  <div class="admin-coordinate-hint">
                    点击地图可写入经纬度，拖动地图上的点可微调位置。当前坐标：{{ coordinateSummary }}
                  </div>
                  <div ref="coordinateMapElement" class="admin-coordinate-map"></div>
                </div>
              </div>
            </div>

            <div class="admin-modal-footer">
              <button type="button" class="admin-home-link" @click="closeModal">取消</button>
              <button type="submit" class="admin-home-logout" :disabled="submitting">
                {{ submitting ? '保存中...' : editingBookmark ? '保存修改' : '创建书签' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import {
  createBookmark,
  deleteBookmark,
  fetchAdminBookmarks,
  fetchMapConfig,
  type Bookmark,
  updateBookmark,
} from '../services/api'

type BookmarkFormState = {
  name: string
  lat: string
  lng: string
  zoom: string
  description: string
  sortOrder: string
}

const loading = ref(true)
const submitting = ref(false)
const keyword = ref('')
const zoomFilter = ref<'all' | 'close' | 'wide'>('all')
const descriptionFilter = ref<'all' | 'with-description' | 'without-description'>('all')
const modalVisible = ref(false)
const errorMessage = ref('')
const bookmarks = ref<Bookmark[]>([])
const editingBookmark = ref<Bookmark | null>(null)
const coordinateMapElement = ref<HTMLDivElement | null>(null)
const defaultMapCenter = ref<[number, number]>([37.77, 119.2])

const form = reactive<BookmarkFormState>({
  name: '',
  lat: '',
  lng: '',
  zoom: '10',
  description: '',
  sortOrder: '1',
})

let coordinateMap: L.Map | null = null
let coordinateMarker: L.Marker | null = null

const filteredBookmarks = computed(() => {
  const value = keyword.value.trim().toLowerCase()

  return bookmarks.value.filter((bookmark) => {
    const matchesKeyword = !value || [bookmark.name, bookmark.description].some((item) => item.toLowerCase().includes(value))
    const matchesZoom = zoomFilter.value === 'all' || (zoomFilter.value === 'close' ? bookmark.zoom >= 12 : bookmark.zoom < 12)
    const matchesDescription = descriptionFilter.value === 'all' || (descriptionFilter.value === 'with-description' ? Boolean(bookmark.description.trim()) : !bookmark.description.trim())
    return matchesKeyword && matchesZoom && matchesDescription
  })
})

const closeRangeBookmarkCount = computed(() => bookmarks.value.filter((bookmark) => bookmark.zoom >= 12).length)
const describedBookmarkCount = computed(() => bookmarks.value.filter((bookmark) => Boolean(bookmark.description.trim())).length)
const averageZoomLabel = computed(() => {
  if (!bookmarks.value.length) {
    return '--'
  }

  const total = bookmarks.value.reduce((sum, bookmark) => sum + bookmark.zoom, 0)
  return (total / bookmarks.value.length).toFixed(1)
})
const firstBookmarkLabel = computed(() => {
  const firstBookmark = [...bookmarks.value].sort((left, right) => left.sortOrder - right.sortOrder)[0]
  return firstBookmark ? firstBookmark.name : '--'
})
const bookmarkInsightCards = computed(() => [
  {
    label: '书签总量',
    value: `${bookmarks.value.length}`,
    detail: `含描述 ${describedBookmarkCount.value} 条`,
    tone: bookmarks.value.length > 0 ? 'is-good' : 'is-warn',
  },
  {
    label: '近景视角',
    value: `${closeRangeBookmarkCount.value}`,
    detail: '缩放级别大于等于 12 的书签更适合局部查看',
    tone: closeRangeBookmarkCount.value > 0 ? 'is-info' : 'is-neutral',
  },
  {
    label: '首位书签',
    value: firstBookmarkLabel.value,
    detail: `平均缩放 ${averageZoomLabel.value}`,
    tone: 'is-neutral',
  },
])

const coordinateSummary = computed(() => {
  const coordinates = getFormCoordinates()

  if (!coordinates) {
    return '未设置'
  }

  return `${coordinates.lng.toFixed(6)}, ${coordinates.lat.toFixed(6)}`
})

function getFormCoordinates() {
  const lat = Number(form.lat)
  const lng = Number(form.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return { lat, lng }
}

function updateFormCoordinates(lat: number, lng: number) {
  form.lat = lat.toFixed(6)
  form.lng = lng.toFixed(6)
}

function getMapTargetCoordinates() {
  const coordinates = getFormCoordinates()

  if (coordinates) {
    return L.latLng(coordinates.lat, coordinates.lng)
  }

  return L.latLng(defaultMapCenter.value[0], defaultMapCenter.value[1])
}

function ensureCoordinateMarker(latLng: L.LatLng, centerMap = false) {
  if (!coordinateMap) {
    return
  }

  if (!coordinateMarker) {
    coordinateMarker = L.marker(latLng, { draggable: true }).addTo(coordinateMap)
    coordinateMarker.on('dragend', () => {
      if (!coordinateMarker) {
        return
      }

      const position = coordinateMarker.getLatLng()
      updateFormCoordinates(position.lat, position.lng)
    })
  } else {
    coordinateMarker.setLatLng(latLng)
  }

  if (centerMap) {
    coordinateMap.setView(latLng, Math.max(coordinateMap.getZoom(), 9))
  }
}

function syncMarkerFromForm(centerMap = false) {
  const coordinates = getFormCoordinates()

  if (!coordinates || !coordinateMap) {
    return
  }

  ensureCoordinateMarker(L.latLng(coordinates.lat, coordinates.lng), centerMap)
}

function destroyCoordinateMap() {
  if (coordinateMarker) {
    coordinateMarker.off()
    coordinateMarker = null
  }

  if (coordinateMap) {
    coordinateMap.off()
    coordinateMap.remove()
    coordinateMap = null
  }
}

function focusMapToCurrentCoordinates() {
  syncMarkerFromForm(true)
}

function resetMapToStudyArea() {
  const center = L.latLng(defaultMapCenter.value[0], defaultMapCenter.value[1])

  if (coordinateMap) {
    coordinateMap.setView(center, 8)
  }

  ensureCoordinateMarker(center)
  updateFormCoordinates(center.lat, center.lng)
}

function initCoordinateMap() {
  if (!modalVisible.value || !coordinateMapElement.value || coordinateMap) {
    return
  }

  const initialCenter = getMapTargetCoordinates()

  coordinateMap = L.map(coordinateMapElement.value, {
    center: initialCenter,
    zoom: getFormCoordinates() ? 9 : 8,
    minZoom: 3,
    maxZoom: 18,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(coordinateMap)

  coordinateMap.on('click', (event: L.LeafletMouseEvent) => {
    ensureCoordinateMarker(event.latlng)
    updateFormCoordinates(event.latlng.lat, event.latlng.lng)
  })

  requestAnimationFrame(() => {
    coordinateMap?.invalidateSize()
    syncMarkerFromForm(true)
  })
}

async function loadStudyAreaCenter() {
  try {
    const config = await fetchMapConfig()
    const totals = config.studyArea.reduce(
      (accumulator, [latitude, longitude]) => ({
        latitude: accumulator.latitude + latitude,
        longitude: accumulator.longitude + longitude,
      }),
      { latitude: 0, longitude: 0 },
    )

    defaultMapCenter.value = [totals.latitude / config.studyArea.length, totals.longitude / config.studyArea.length]
  } catch {
    defaultMapCenter.value = [37.77, 119.2]
  }
}

function resetForm() {
  form.name = ''
  form.lat = ''
  form.lng = ''
  form.zoom = '10'
  form.description = ''
  form.sortOrder = String(bookmarks.value.length + 1)
  editingBookmark.value = null
  errorMessage.value = ''
}

async function loadBookmarks() {
  loading.value = true

  try {
    bookmarks.value = await fetchAdminBookmarks()
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  resetForm()
  modalVisible.value = true
}

function openEditModal(bookmark: Bookmark) {
  resetForm()
  editingBookmark.value = bookmark
  form.name = bookmark.name
  form.lat = String(bookmark.lat)
  form.lng = String(bookmark.lng)
  form.zoom = String(bookmark.zoom)
  form.description = bookmark.description
  form.sortOrder = String(bookmark.sortOrder)
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  resetForm()
}

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      name: form.name,
      lat: form.lat,
      lng: form.lng,
      zoom: form.zoom,
      description: form.description,
      sortOrder: form.sortOrder,
    }

    if (editingBookmark.value) {
      await updateBookmark(editingBookmark.value.id, payload)
    } else {
      await createBookmark(payload)
    }

    await loadBookmarks()
    closeModal()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message ?? '保存失败，请稍后重试。'
    } else {
      errorMessage.value = '保存失败，请稍后重试。'
    }
  } finally {
    submitting.value = false
  }
}

async function handleDelete(bookmark: Bookmark) {
  const confirmed = window.confirm(`确定删除书签“${bookmark.name}”吗？`)

  if (!confirmed) {
    return
  }

  await deleteBookmark(bookmark.id)
  await loadBookmarks()
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台 - 书签管理'
  await Promise.all([loadBookmarks(), loadStudyAreaCenter()])
})

watch(modalVisible, async (visible) => {
  if (visible) {
    await nextTick()
    initCoordinateMap()
    return
  }

  destroyCoordinateMap()
})

onBeforeUnmount(() => {
  destroyCoordinateMap()
})
</script>