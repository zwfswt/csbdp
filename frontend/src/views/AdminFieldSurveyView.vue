<template>
  <AdminLayout
    title="野外考察管理"
    description="管理前台地图使用的野外考察编号、名称、时间、坐标、说明和现场照片。"
  >
    <template #actions>
      <button class="admin-home-link" type="button" @click="openCreateModal">新建记录</button>
    </template>

    <div class="admin-home-page">
      <section class="admin-panel-card admin-panel-card-wide admin-page-intro-card">
        <div class="admin-page-intro-grid">
          <div class="admin-page-intro-copy">
            <div class="admin-section-kicker">野外作业</div>
            <h2>考察概览</h2>
            <p>将记录数量、照片资料和最近采样时间放到页首，便于在编辑前快速判断外业覆盖情况。</p>

            <div class="admin-page-tag-row">
              <span class="admin-page-tag">记录 {{ surveys.length }}</span>
              <span class="admin-page-tag">照片 {{ totalImageCount }}</span>
              <span class="admin-page-tag">最新 {{ latestSurveyLabel }}</span>
              <span class="admin-page-tag">含照片 {{ surveyWithImagesCount }}</span>
            </div>
          </div>

          <div class="admin-page-intro-side">
            <article v-for="item in surveyInsightCards" :key="item.label" class="admin-page-insight-card" :class="item.tone">
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
            <div class="admin-section-kicker">操作分区</div>
            <h2>工作区</h2>
          </div>
          <p>按新建记录、坐标校正和照片资料管理拆分页面，更贴合野外回填流程。</p>
        </div>

        <div class="admin-operation-grid">
          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-location-dot"></i>
              <span>新建</span>
            </div>
            <strong>新建野外记录</strong>
            <p>在一个流程里完成编号、时间、位置、说明和现场照片的录入。</p>
            <button class="admin-home-link" type="button" @click="openCreateModal">新建记录</button>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-map"></i>
              <span>坐标</span>
            </div>
            <strong>地图辅助坐标校正</strong>
            <p>通过点击地图或拖动标记，让保存位置与实际观测点保持一致。</p>
            <small>适合对考察坐标做快速校验和修正。</small>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-images"></i>
              <span>照片</span>
            </div>
            <strong>已跟踪 {{ totalImageCount }} 张照片</strong>
            <p>在编辑过程中保留有效图片、上传新图片，并清理失效照片资料。</p>
            <small>{{ surveyWithImagesCount > 0 ? '当前已有带照片的考察记录。' : '当前还没有带照片的记录，可补充现场照片证据。' }}</small>
          </article>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-filter-panel">
        <div class="admin-filter-panel-head">
          <div>
            <div class="admin-section-kicker">筛选台</div>
            <h2>筛选与查看</h2>
          </div>
          <p>先按照片情况和时间区间缩小列表，再去编辑坐标、时间或野外说明。</p>
        </div>

        <div class="admin-filter-toolbar">
          <div class="admin-filter-group">
            <span class="admin-filter-label">照片</span>
            <button type="button" class="admin-filter-chip" :class="{ active: mediaFilter === 'all' }" @click="mediaFilter = 'all'">全部 {{ surveys.length }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: mediaFilter === 'with-images' }" @click="mediaFilter = 'with-images'">含照片 {{ surveyWithImagesCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: mediaFilter === 'without-images' }" @click="mediaFilter = 'without-images'">无照片 {{ surveys.length - surveyWithImagesCount }}</button>
          </div>

          <div class="admin-filter-group">
            <span class="admin-filter-label">时间</span>
            <button type="button" class="admin-filter-chip" :class="{ active: timeFilter === 'all' }" @click="timeFilter = 'all'">全部</button>
            <button type="button" class="admin-filter-chip" :class="{ active: timeFilter === 'recent' }" @click="timeFilter = 'recent'">较新一半</button>
            <button type="button" class="admin-filter-chip" :class="{ active: timeFilter === 'older' }" @click="timeFilter = 'older'">较早一半</button>
          </div>
        </div>
      </section>

      <section class="admin-panel-card admin-survey-table-card">
        <div class="admin-table-toolbar">
          <div>
            <h2>考察列表</h2>
            <p>{{ filteredSurveys.length }} 条记录</p>
          </div>

          <label class="admin-search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model.trim="keyword" type="search" placeholder="搜索编号、名称或说明" />
          </label>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>名称</th>
                <th>时间</th>
                <th>经度</th>
                <th>纬度</th>
                <th>照片</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="admin-empty-cell">正在加载数据...</td>
              </tr>
              <tr v-else-if="filteredSurveys.length === 0">
                <td colspan="7" class="admin-empty-cell">暂无野外考察记录</td>
              </tr>
              <tr v-for="survey in filteredSurveys" :key="survey.id">
                <td>
                  <div class="admin-table-primary">{{ survey.serialNo }}</div>
                  <div class="admin-table-secondary">记录 ID {{ survey.id }}</div>
                </td>
                <td>
                  <div class="admin-table-primary">{{ survey.name }}</div>
                  <div class="admin-table-secondary">{{ survey.description || '暂无说明' }}</div>
                </td>
                <td>{{ formatDateLabel(survey.surveyTime) }}</td>
                <td>{{ survey.longitude.toFixed(6) }}</td>
                <td>{{ survey.latitude.toFixed(6) }}</td>
                <td>
                  <span class="admin-status-tag" :class="survey.images.length > 0 ? 'is-success' : 'is-warn'">{{ survey.images.length }} 个文件</span>
                </td>
                <td>
                  <div class="admin-row-actions">
                    <button type="button" @click="openEditModal(survey)">编辑</button>
                    <button type="button" class="danger" @click="handleDelete(survey)">删除</button>
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
              <h2>{{ editingSurvey ? '编辑野外考察' : '新建野外考察' }}</h2>
              <p>填写基础信息并附加现场照片。</p>
            </div>
            <button type="button" class="admin-modal-close" @click="closeModal">x</button>
          </div>

          <div class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">
            {{ errorMessage }}
          </div>

          <form class="admin-survey-form" @submit.prevent="handleSubmit">
            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>基础信息</h3>
                <p>先填写编号、记录名称、时间和概要说明。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group">
                  <label for="surveySerialNo">编号</label>
                  <input id="surveySerialNo" v-model.trim="form.serialNo" type="text" placeholder="FS-001" />
                </div>

                <div class="form-group">
                  <label for="surveyName">名称</label>
                  <input id="surveyName" v-model.trim="form.name" type="text" placeholder="请输入考察名称" />
                </div>

                <div class="form-group">
                  <label for="surveyTime">时间</label>
                  <input id="surveyTime" v-model="form.surveyTime" type="datetime-local" />
                </div>

                <div class="form-group admin-form-group-wide">
                  <label for="surveyDescription">说明</label>
                  <textarea id="surveyDescription" v-model.trim="form.description" rows="4" placeholder="请输入野外记录说明"></textarea>
                </div>
              </div>
            </div>

            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>空间位置</h3>
                <p>可手动输入坐标，也可通过地图交互修正保存位置。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group">
                  <label for="surveyLongitude">经度</label>
                  <input
                    id="surveyLongitude"
                    v-model.trim="form.longitude"
                    type="number"
                    step="0.000001"
                    placeholder="119.1526"
                    @change="focusMapToCurrentCoordinates"
                  />
                </div>

                <div class="form-group">
                  <label for="surveyLatitude">纬度</label>
                  <input
                    id="surveyLatitude"
                    v-model.trim="form.latitude"
                    type="number"
                    step="0.000001"
                    placeholder="37.7348"
                    @change="focusMapToCurrentCoordinates"
                  />
                </div>

                <div class="form-group admin-form-group-wide">
                  <div class="admin-coordinate-toolbar">
                    <label>地图拾取</label>
                    <div class="admin-coordinate-actions">
                      <button type="button" @click="focusMapToCurrentCoordinates">定位到当前点</button>
                      <button type="button" @click="resetMapToStudyArea">返回研究区</button>
                    </div>
                  </div>
                  <div class="admin-coordinate-hint">
                    点击地图可写入坐标，也可拖动标记做微调。当前坐标：{{ coordinateSummary }}
                  </div>
                  <div ref="coordinateMapElement" class="admin-coordinate-map"></div>
                </div>
              </div>
            </div>

            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>照片资料</h3>
                <p>上传新图片、保留有效图片，并清理不再需要的照片资料。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group admin-form-group-wide">
                  <label for="surveyImages">上传图片</label>
                  <input id="surveyImages" type="file" accept="image/*" multiple @change="handleFileSelect" />
                  <div v-if="retainedImages.length || newImagePreviews.length" class="admin-image-grid">
                    <div v-for="image in retainedImages" :key="`existing-${image.id}`" class="admin-image-card">
                      <img :src="image.url" :alt="image.originalName" />
                      <div>{{ image.originalName }}</div>
                      <button type="button" class="danger" @click="removeExistingImage(image.id)">移除</button>
                    </div>
                    <div v-for="image in newImagePreviews" :key="image.key" class="admin-image-card admin-image-card-new">
                      <img :src="image.url" :alt="image.name" />
                      <div>{{ image.name }}</div>
                      <button type="button" class="danger" @click="removeNewImage(image.key)">移除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="admin-modal-footer">
              <button type="button" class="admin-home-link" @click="closeModal">取消</button>
              <button type="submit" class="admin-home-logout" :disabled="submitting">
                {{ submitting ? '保存中...' : editingSurvey ? '保存修改' : '创建记录' }}
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
  createFieldSurvey,
  deleteFieldSurvey,
  fetchMapConfig,
  fetchAdminFieldSurveys,
  type FieldSurvey,
  updateFieldSurvey,
} from '../services/api'

type SurveyFormState = {
  serialNo: string
  name: string
  surveyTime: string
  longitude: string
  latitude: string
  description: string
}

type NewImagePreview = {
  key: string
  name: string
  url: string
  file: File
}

const loading = ref(true)
const submitting = ref(false)
const keyword = ref('')
const mediaFilter = ref<'all' | 'with-images' | 'without-images'>('all')
const timeFilter = ref<'all' | 'recent' | 'older'>('all')
const modalVisible = ref(false)
const errorMessage = ref('')
const surveys = ref<FieldSurvey[]>([])
const editingSurvey = ref<FieldSurvey | null>(null)
const retainedImages = ref<FieldSurvey['images']>([])
const newImagePreviews = ref<NewImagePreview[]>([])
const coordinateMapElement = ref<HTMLDivElement | null>(null)
const defaultMapCenter = ref<[number, number]>([37.77, 119.2])

const form = reactive<SurveyFormState>({
  serialNo: '',
  name: '',
  surveyTime: '',
  longitude: '',
  latitude: '',
  description: '',
})

let coordinateMap: L.Map | null = null
let coordinateMarker: L.Marker | null = null

const filteredSurveys = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  const sortedTimes = [...surveys.value].map((survey) => survey.surveyTime).sort((left, right) => right.localeCompare(left))
  const splitPoint = sortedTimes[Math.max(0, Math.floor((sortedTimes.length - 1) / 2))] ?? ''

  return surveys.value.filter((survey) => {
    const matchesKeyword = !value || [survey.serialNo, survey.name, survey.description].some((item) => item.toLowerCase().includes(value))
    const matchesMedia = mediaFilter.value === 'all' || (mediaFilter.value === 'with-images' ? survey.images.length > 0 : survey.images.length === 0)
    const matchesTime = timeFilter.value === 'all' || (timeFilter.value === 'recent' ? survey.surveyTime >= splitPoint : survey.surveyTime < splitPoint)
    return matchesKeyword && matchesMedia && matchesTime
  })
})

const totalImageCount = computed(() => surveys.value.reduce((sum, survey) => sum + survey.images.length, 0))
const surveyWithImagesCount = computed(() => surveys.value.filter((survey) => survey.images.length > 0).length)
const latestSurveyLabel = computed(() => {
  const latestSurvey = [...surveys.value].sort((left, right) => right.surveyTime.localeCompare(left.surveyTime))[0]
  return latestSurvey ? formatDateLabel(latestSurvey.surveyTime) : '--'
})
const surveyInsightCards = computed(() => [
  {
    label: '考察记录',
    value: `${surveys.value.length}`,
    detail: `${surveyWithImagesCount.value} 条记录包含照片`,
    tone: surveys.value.length > 0 ? 'is-good' : 'is-warn',
  },
  {
    label: '照片资料',
    value: `${totalImageCount.value}`,
    detail: '用于地图弹窗与外业回看',
    tone: totalImageCount.value > 0 ? 'is-accent' : 'is-neutral',
  },
  {
    label: '最近考察',
    value: latestSurveyLabel.value,
    detail: '用于判断近期是否仍在持续采集',
    tone: 'is-neutral',
  },
])

const coordinateSummary = computed(() => {
  const coordinates = getFormCoordinates()

  if (!coordinates) {
    return '未设置'
  }

  return `${coordinates.longitude.toFixed(6)}, ${coordinates.latitude.toFixed(6)}`
})

function formatDateLabel(value: string) {
  return value.replace('T', ' ')
}

function formatDateInput(value: string) {
  return value.replace(' ', 'T').slice(0, 16)
}

function getFormCoordinates() {
  const longitude = Number(form.longitude)
  const latitude = Number(form.latitude)

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return { longitude, latitude }
}

function updateFormCoordinates(latitude: number, longitude: number) {
  form.longitude = longitude.toFixed(6)
  form.latitude = latitude.toFixed(6)
}

function getMapTargetCoordinates() {
  const coordinates = getFormCoordinates()

  if (coordinates) {
    return L.latLng(coordinates.latitude, coordinates.longitude)
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

function syncMarkerFromForm(centerMap = false) {
  const coordinates = getFormCoordinates()

  if (!coordinates || !coordinateMap) {
    return
  }

  ensureCoordinateMarker(L.latLng(coordinates.latitude, coordinates.longitude), centerMap)
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

    defaultMapCenter.value = [
      totals.latitude / config.studyArea.length,
      totals.longitude / config.studyArea.length,
    ]
  } catch {
    defaultMapCenter.value = [37.77, 119.2]
  }
}

function resetForm() {
  form.serialNo = ''
  form.name = ''
  form.surveyTime = ''
  form.longitude = ''
  form.latitude = ''
  form.description = ''
  editingSurvey.value = null
  retainedImages.value = []
  newImagePreviews.value.forEach((item) => URL.revokeObjectURL(item.url))
  newImagePreviews.value = []
  errorMessage.value = ''
}

async function loadSurveys() {
  loading.value = true

  try {
    surveys.value = await fetchAdminFieldSurveys()
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  resetForm()
  modalVisible.value = true
}

function openEditModal(survey: FieldSurvey) {
  resetForm()
  editingSurvey.value = survey
  form.serialNo = survey.serialNo
  form.name = survey.name
  form.surveyTime = formatDateInput(survey.surveyTime)
  form.longitude = String(survey.longitude)
  form.latitude = String(survey.latitude)
  form.description = survey.description
  retainedImages.value = [...survey.images]
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  resetForm()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  for (const file of files) {
    newImagePreviews.value.push({
      key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    })
  }

  input.value = ''
}

function removeExistingImage(imageId: number) {
  retainedImages.value = retainedImages.value.filter((item) => item.id !== imageId)
}

function removeNewImage(key: string) {
  const target = newImagePreviews.value.find((item) => item.key === key)

  if (target) {
    URL.revokeObjectURL(target.url)
  }

  newImagePreviews.value = newImagePreviews.value.filter((item) => item.key !== key)
}

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      serialNo: form.serialNo,
      name: form.name,
      surveyTime: form.surveyTime.replace('T', ' '),
      longitude: form.longitude,
      latitude: form.latitude,
      description: form.description,
    }
    const newFiles = newImagePreviews.value.map((item) => item.file)

    if (editingSurvey.value) {
      await updateFieldSurvey(editingSurvey.value.id, payload, newFiles, retainedImages.value.map((item) => item.id))
    } else {
      await createFieldSurvey(payload, newFiles)
    }

    await loadSurveys()
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

async function handleDelete(survey: FieldSurvey) {
  const confirmed = window.confirm(`确定删除“${survey.name}”及其已上传的全部图片吗？`)

  if (!confirmed) {
    return
  }

  await deleteFieldSurvey(survey.id)
  await loadSurveys()
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台 - 野外考察管理'
  await Promise.all([loadSurveys(), loadStudyAreaCenter()])
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
  newImagePreviews.value.forEach((item) => URL.revokeObjectURL(item.url))
})
</script>

