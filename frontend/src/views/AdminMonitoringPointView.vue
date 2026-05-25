<template>
  <AdminLayout title="监测位置" description="维护地下水高程监测点位，并支持通过 Excel 批量导入，结果将同步显示在前台地图“监测位置”图层中。">
    <template #actions>
      <button class="admin-home-link" type="button" @click="openCreateModal">新增监测点</button>
      <label class="admin-home-link admin-upload-trigger">
        <input type="file" accept=".xlsx,.xls" @change="handleImport" />
        导入 Excel
      </label>
    </template>

    <div class="admin-home-page">
      <section class="admin-panel-card admin-panel-card-wide admin-page-intro-card">
        <div class="admin-page-intro-grid">
          <div class="admin-page-intro-copy">
            <div class="admin-section-kicker">Monitoring Network</div>
            <h2>监测点网络摘要</h2>
            <p>先查看监测点规模、导入占比和最近观测时间，再决定是手动修订单点还是直接批量导入新一轮数据。</p>

            <div class="admin-page-tag-row">
              <span class="admin-page-tag">点位 {{ points.length }}</span>
              <span class="admin-page-tag">Excel 导入 {{ importedPointCount }}</span>
              <span class="admin-page-tag">手动维护 {{ manualPointCount }}</span>
              <span class="admin-page-tag">平均高程 {{ averageElevationLabel }}</span>
            </div>
          </div>

          <div class="admin-page-intro-side">
            <article v-for="item in monitoringInsightCards" :key="item.label" class="admin-page-insight-card" :class="item.tone">
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
          <p>把监测页拆成单点维护、批量导入和质量复核三类工作区，减少监测更新时的来回切换。</p>
        </div>

        <div class="admin-operation-grid">
          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-location-dot"></i>
              <span>单点维护</span>
            </div>
            <strong>新增或修订监测点</strong>
            <p>适合补录个别监测点的观测时间、经纬度、高程和坐标信息。</p>
            <button class="admin-home-link" type="button" @click="openCreateModal">新增监测点</button>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-file-import"></i>
              <span>批量导入</span>
            </div>
            <strong>Excel 覆盖导入</strong>
            <p>适合在整轮外业监测结束后，用统一表格一次性替换当前监测点集。</p>
            <small>当前 Excel 来源记录 {{ importedPointCount }} 条。</small>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-wave-square"></i>
              <span>质量复核</span>
            </div>
            <strong>平均高程 {{ averageElevationLabel }}</strong>
            <p>结合时间筛选和来源标签，优先检查最新一轮观测中异常点位。</p>
            <small>最近观测 {{ latestMonitorLabel }}</small>
          </article>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-filter-panel">
        <div class="admin-filter-panel-head">
          <div>
            <div class="admin-section-kicker">Filter Console</div>
            <h2>筛选与核验</h2>
          </div>
          <p>先按来源和观测时间收敛监测点，再进入高程、坐标和来源文件的细节修订。</p>
        </div>

        <div class="admin-filter-toolbar">
          <div class="admin-filter-group">
            <span class="admin-filter-label">来源方式</span>
            <button type="button" class="admin-filter-chip" :class="{ active: sourceFilter === 'all' }" @click="sourceFilter = 'all'">全部 {{ points.length }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: sourceFilter === 'imported' }" @click="sourceFilter = 'imported'">Excel 导入 {{ importedPointCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: sourceFilter === 'manual' }" @click="sourceFilter = 'manual'">手动维护 {{ manualPointCount }}</button>
          </div>

          <div class="admin-filter-group">
            <span class="admin-filter-label">观测时间</span>
            <button type="button" class="admin-filter-chip" :class="{ active: timeFilter === 'all' }" @click="timeFilter = 'all'">全部</button>
            <button type="button" class="admin-filter-chip" :class="{ active: timeFilter === 'recent' }" @click="timeFilter = 'recent'">较新记录</button>
            <button type="button" class="admin-filter-chip" :class="{ active: timeFilter === 'older' }" @click="timeFilter = 'older'">较早记录</button>
          </div>
        </div>
      </section>

      <section class="admin-panel-card admin-survey-table-card">
        <div class="admin-table-toolbar">
          <div>
            <h2>点位列表</h2>
            <p>共 {{ filteredPoints.length }} 条记录</p>
          </div>

          <label class="admin-search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model.trim="keyword" type="search" placeholder="搜索点名、日期或来源文件" />
          </label>
        </div>

        <div class="error-msg" :style="{ display: pageError ? 'block' : 'none' }">{{ pageError }}</div>

        <div class="admin-table-wrap">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th>点位</th>
                <th>观测时间</th>
                <th>地下水高程</th>
                <th>坐标状态</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="admin-empty-cell">正在加载数据...</td>
              </tr>
              <tr v-else-if="filteredPoints.length === 0">
                <td colspan="6" class="admin-empty-cell">暂无监测点数据</td>
              </tr>
              <tr v-for="point in filteredPoints" :key="point.id">
                <td>
                  <div class="admin-table-primary">{{ point.pointName }}</div>
                  <div class="admin-table-secondary">东坐标 {{ point.easting ?? '--' }} / 北坐标 {{ point.northing ?? '--' }}</div>
                </td>
                <td>
                  <div class="admin-table-primary">{{ point.monitoredAt }}</div>
                  <div class="admin-table-secondary">天线高 {{ point.antennaHeight == null ? '--' : `${point.antennaHeight.toFixed(3)} m` }}</div>
                </td>
                <td>
                  <div class="admin-table-primary">{{ point.elevation.toFixed(3) }} m</div>
                  <div class="admin-table-secondary">椭球高 {{ point.ellipsoidHeight == null ? '--' : `${point.ellipsoidHeight.toFixed(3)} m` }}</div>
                </td>
                <td>
                  <div class="admin-table-primary">{{ point.longitude.toFixed(6) }}, {{ point.latitude.toFixed(6) }}</div>
                  <div class="admin-table-secondary">
                    <span class="admin-status-tag" :class="point.easting != null && point.northing != null ? 'is-success' : 'is-warn'">
                      {{ point.easting != null && point.northing != null ? '坐标完整' : '仅经纬度' }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="admin-table-primary">{{ point.sourceFile || '手动维护' }}</div>
                  <div class="admin-table-secondary">
                    <span class="admin-status-tag" :class="point.sourceFile ? 'is-info' : 'is-neutral'">
                      {{ point.sourceFile ? 'Excel 导入' : '手动录入' }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="admin-row-actions">
                    <button type="button" @click="openEditModal(point)">编辑</button>
                    <button type="button" class="danger" @click="handleDelete(point)">删除</button>
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
              <h2>{{ editingPoint ? '编辑监测点' : '新增监测点' }}</h2>
              <p>支持手动维护单个点位；批量更新建议继续使用 Excel 导入。</p>
            </div>
            <button type="button" class="admin-modal-close" @click="closeModal">×</button>
          </div>

          <div class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">{{ errorMessage }}</div>

          <form class="admin-survey-form" @submit.prevent="handleSubmit">
            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>监测信息</h3>
                <p>先定义点名、观测日期和时间，再补充来源文件以标记批次。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group">
                  <label for="pointName">点名</label>
                  <input id="pointName" v-model.trim="form.pointName" type="text" placeholder="例如 dxs-08-06" />
                </div>

                <div class="form-group">
                  <label for="monitorDate">日期</label>
                  <input id="monitorDate" v-model="form.monitorDate" type="date" />
                </div>

                <div class="form-group">
                  <label for="monitorTime">时间</label>
                  <input id="monitorTime" v-model="form.monitorTime" type="time" step="1" />
                </div>

                <div class="form-group admin-form-group-wide">
                  <label for="sourceFile">来源文件</label>
                  <input id="sourceFile" v-model.trim="form.sourceFile" type="text" placeholder="例如 20220815地下水高程监测.xlsx" />
                </div>
              </div>
            </div>

            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>坐标与测值</h3>
                <p>录入经纬度、投影坐标和高程相关字段，便于后续空间核验与比对。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group">
                  <label for="elevation">地下水高程</label>
                  <input id="elevation" v-model.trim="form.elevation" type="number" step="0.001" placeholder="8.216" />
                </div>

                <div class="form-group">
                  <label for="longitude">经度</label>
                  <input id="longitude" v-model.trim="form.longitude" type="number" step="0.000001" placeholder="118.811883" />
                </div>

                <div class="form-group">
                  <label for="latitude">纬度</label>
                  <input id="latitude" v-model.trim="form.latitude" type="number" step="0.000001" placeholder="37.55032695" />
                </div>

                <div class="form-group">
                  <label for="northing">北坐标</label>
                  <input id="northing" v-model.trim="form.northing" type="number" step="0.001" placeholder="4158251.302" />
                </div>

                <div class="form-group">
                  <label for="easting">东坐标</label>
                  <input id="easting" v-model.trim="form.easting" type="number" step="0.001" placeholder="395008.822" />
                </div>

                <div class="form-group">
                  <label for="ellipsoidHeight">椭球高</label>
                  <input id="ellipsoidHeight" v-model.trim="form.ellipsoidHeight" type="number" step="0.001" placeholder="8.216" />
                </div>

                <div class="form-group">
                  <label for="antennaHeight">天线高</label>
                  <input id="antennaHeight" v-model.trim="form.antennaHeight" type="number" step="0.001" placeholder="1.91" />
                </div>
              </div>
            </div>

            <div class="admin-modal-footer">
              <button type="button" class="admin-home-link" @click="closeModal">取消</button>
              <button type="submit" class="admin-home-logout" :disabled="submitting || importing">
                {{ submitting ? '保存中...' : editingPoint ? '保存修改' : '创建监测点' }}
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
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import {
  createMonitoringPoint,
  deleteMonitoringPoint,
  fetchAdminMonitoringPoints,
  importMonitoringPoints,
  type MonitoringPoint,
  updateMonitoringPoint,
} from '../services/api'

type MonitoringFormState = {
  pointName: string
  northing: string
  easting: string
  elevation: string
  latitude: string
  longitude: string
  ellipsoidHeight: string
  monitorDate: string
  monitorTime: string
  antennaHeight: string
  sourceFile: string
}

const loading = ref(true)
const submitting = ref(false)
const importing = ref(false)
const keyword = ref('')
const sourceFilter = ref<'all' | 'imported' | 'manual'>('all')
const timeFilter = ref<'all' | 'recent' | 'older'>('all')
const modalVisible = ref(false)
const errorMessage = ref('')
const pageError = ref('')
const points = ref<MonitoringPoint[]>([])
const editingPoint = ref<MonitoringPoint | null>(null)

const form = reactive<MonitoringFormState>({
  pointName: '',
  northing: '',
  easting: '',
  elevation: '',
  latitude: '',
  longitude: '',
  ellipsoidHeight: '',
  monitorDate: '',
  monitorTime: '',
  antennaHeight: '',
  sourceFile: '',
})

const filteredPoints = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  const sortedTimes = [...points.value].map((point) => point.monitoredAt).sort((left, right) => right.localeCompare(left))
  const splitPoint = sortedTimes[Math.max(0, Math.floor((sortedTimes.length - 1) / 2))] ?? ''

  return points.value.filter((point) => {
    const matchesKeyword = !value || [point.pointName, point.monitorDate, point.sourceFile].some((item) => item.toLowerCase().includes(value))
    const matchesSource = sourceFilter.value === 'all' || (sourceFilter.value === 'imported' ? Boolean(point.sourceFile) : !point.sourceFile)
    const matchesTime = timeFilter.value === 'all' || (timeFilter.value === 'recent' ? point.monitoredAt >= splitPoint : point.monitoredAt < splitPoint)
    return matchesKeyword && matchesSource && matchesTime
  })
})

const importedPointCount = computed(() => points.value.filter((point) => Boolean(point.sourceFile)).length)
const manualPointCount = computed(() => points.value.length - importedPointCount.value)
const averageElevationLabel = computed(() => {
  if (!points.value.length) {
    return '--'
  }

  const total = points.value.reduce((sum, point) => sum + point.elevation, 0)
  return `${(total / points.value.length).toFixed(3)} m`
})
const latestMonitorLabel = computed(() => {
  const latestPoint = [...points.value].sort((left, right) => right.monitoredAt.localeCompare(left.monitoredAt))[0]
  return latestPoint ? latestPoint.monitoredAt : '--'
})
const monitoringInsightCards = computed(() => [
  {
    label: '监测点总量',
    value: `${points.value.length}`,
    detail: `手动维护 ${manualPointCount.value} 条`,
    tone: points.value.length > 0 ? 'is-good' : 'is-warn',
  },
  {
    label: '导入批次占比',
    value: `${importedPointCount.value}`,
    detail: '带来源文件的点位会被视为 Excel 导入记录',
    tone: importedPointCount.value > 0 ? 'is-info' : 'is-neutral',
  },
  {
    label: '最近观测',
    value: latestMonitorLabel.value,
    detail: `平均高程 ${averageElevationLabel.value}`,
    tone: 'is-neutral',
  },
])

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function resetForm() {
  form.pointName = ''
  form.northing = ''
  form.easting = ''
  form.elevation = ''
  form.latitude = ''
  form.longitude = ''
  form.ellipsoidHeight = ''
  form.monitorDate = getToday()
  form.monitorTime = '00:00:00'
  form.antennaHeight = ''
  form.sourceFile = ''
  editingPoint.value = null
  errorMessage.value = ''
}

async function loadPoints() {
  loading.value = true
  pageError.value = ''

  try {
    points.value = await fetchAdminMonitoringPoints()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '加载监测点失败，请稍后重试。'
    } else {
      pageError.value = '加载监测点失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  resetForm()
  modalVisible.value = true
}

function openEditModal(point: MonitoringPoint) {
  resetForm()
  editingPoint.value = point
  form.pointName = point.pointName
  form.northing = point.northing == null ? '' : String(point.northing)
  form.easting = point.easting == null ? '' : String(point.easting)
  form.elevation = String(point.elevation)
  form.latitude = String(point.latitude)
  form.longitude = String(point.longitude)
  form.ellipsoidHeight = point.ellipsoidHeight == null ? '' : String(point.ellipsoidHeight)
  form.monitorDate = point.monitorDate
  form.monitorTime = point.monitorTime
  form.antennaHeight = point.antennaHeight == null ? '' : String(point.antennaHeight)
  form.sourceFile = point.sourceFile
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
      pointName: form.pointName,
      northing: form.northing || null,
      easting: form.easting || null,
      elevation: form.elevation,
      latitude: form.latitude,
      longitude: form.longitude,
      ellipsoidHeight: form.ellipsoidHeight || null,
      monitorDate: form.monitorDate,
      monitorTime: form.monitorTime,
      antennaHeight: form.antennaHeight || null,
      sourceFile: form.sourceFile,
    }

    if (editingPoint.value) {
      await updateMonitoringPoint(editingPoint.value.id, payload)
    } else {
      await createMonitoringPoint(payload)
    }

    await loadPoints()
    closeModal()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message ?? '保存监测点失败，请稍后重试。'
    } else {
      errorMessage.value = '保存监测点失败，请稍后重试。'
    }
  } finally {
    submitting.value = false
  }
}

async function handleDelete(point: MonitoringPoint) {
  const confirmed = window.confirm(`确定删除监测点“${point.pointName}”吗？`)

  if (!confirmed) {
    return
  }

  try {
    await deleteMonitoringPoint(point.id)
    await loadPoints()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '删除监测点失败，请稍后重试。'
    } else {
      pageError.value = '删除监测点失败，请稍后重试。'
    }
  }
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const confirmed = window.confirm('导入新的 Excel 将覆盖当前全部监测点数据，是否继续？')

  if (!confirmed) {
    input.value = ''
    return
  }

  importing.value = true
  pageError.value = ''

  try {
    await importMonitoringPoints(file)
    await loadPoints()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '导入监测点失败，请稍后重试。'
    } else {
      pageError.value = '导入监测点失败，请稍后重试。'
    }
  } finally {
    importing.value = false
    input.value = ''
  }
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台 - 监测位置'
  await loadPoints()
})
</script>