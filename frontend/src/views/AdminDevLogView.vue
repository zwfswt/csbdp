<template>
  <AdminLayout title="开发日志" description="记录需求变更、开发过程、问题处理与阶段性结果，支持搜索、查看、编辑和删除日志。">
    <template #actions>
      <button class="admin-home-link" type="button" @click="openCreateModal">新增日志</button>
    </template>

    <div class="admin-home-page">
      <section class="admin-panel-card admin-panel-card-wide admin-page-intro-card">
        <div class="admin-page-intro-grid">
          <div class="admin-page-intro-copy">
            <div class="admin-section-kicker">Project Journal</div>
            <h2>开发沉淀摘要</h2>
            <p>先看日志总量、最近更新活跃度和内容规模，再决定优先查看最新问题处理还是历史开发阶段记录。</p>

            <div class="admin-page-tag-row">
              <span class="admin-page-tag">日志 {{ logs.length }}</span>
              <span class="admin-page-tag">近 7 天 {{ recentLogCount }}</span>
              <span class="admin-page-tag">长文日志 {{ longFormLogCount }}</span>
              <span class="admin-page-tag">最近更新 {{ latestUpdateLabel }}</span>
            </div>
          </div>

          <div class="admin-page-intro-side">
            <article v-for="item in devLogInsightCards" :key="item.label" class="admin-page-insight-card" :class="item.tone">
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
          <p>把开发日志拆成新增记录、状态回看和内容复盘三个工作区，便于持续沉淀问题和迭代结论。</p>
        </div>

        <div class="admin-operation-grid">
          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-pen-to-square"></i>
              <span>新增记录</span>
            </div>
            <strong>记录新的开发节点</strong>
            <p>适合补充需求变更、调试过程、问题处理方案和交付结果。</p>
            <button class="admin-home-link" type="button" @click="openCreateModal">新增日志</button>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-clock-rotate-left"></i>
              <span>状态回看</span>
            </div>
            <strong>查看最近更新节奏</strong>
            <p>按更新时间快速区分近期活跃日志与历史归档，优先跟进最新迭代上下文。</p>
            <small>近 7 天更新 {{ recentLogCount }} 条。</small>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-scroll"></i>
              <span>内容复盘</span>
            </div>
            <strong>长文日志 {{ longFormLogCount }} 条</strong>
            <p>可优先查看信息密度高的阶段性总结和复杂问题处理记录。</p>
            <small>最近更新 {{ latestUpdateLabel }}</small>
          </article>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-filter-panel">
        <div class="admin-filter-panel-head">
          <div>
            <div class="admin-section-kicker">Filter Console</div>
            <h2>筛选与回看</h2>
          </div>
          <p>先按更新时间和内容规模缩小日志范围，再查看、编辑或删除具体开发记录。</p>
        </div>

        <div class="admin-filter-toolbar">
          <div class="admin-filter-group">
            <span class="admin-filter-label">更新时间</span>
            <button type="button" class="admin-filter-chip" :class="{ active: freshnessFilter === 'all' }" @click="freshnessFilter = 'all'">全部 {{ logs.length }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: freshnessFilter === 'recent' }" @click="freshnessFilter = 'recent'">近 7 天 {{ recentLogCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: freshnessFilter === 'archived' }" @click="freshnessFilter = 'archived'">历史归档 {{ logs.length - recentLogCount }}</button>
          </div>

          <div class="admin-filter-group">
            <span class="admin-filter-label">内容规模</span>
            <button type="button" class="admin-filter-chip" :class="{ active: contentFilter === 'all' }" @click="contentFilter = 'all'">全部</button>
            <button type="button" class="admin-filter-chip" :class="{ active: contentFilter === 'long' }" @click="contentFilter = 'long'">长文 {{ longFormLogCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: contentFilter === 'short' }" @click="contentFilter = 'short'">短文 {{ logs.length - longFormLogCount }}</button>
          </div>
        </div>
      </section>

      <section class="admin-panel-card admin-survey-table-card">
        <div class="admin-table-toolbar">
          <div>
            <h2>日志列表</h2>
            <p>共 {{ filteredLogs.length }} 条记录</p>
          </div>

          <label class="admin-search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model.trim="keyword" type="search" placeholder="搜索标题或日志内容" />
          </label>
        </div>

        <div class="error-msg" :style="{ display: pageError ? 'block' : 'none' }">{{ pageError }}</div>

        <div class="admin-table-wrap">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>状态</th>
                <th>日期</th>
                <th>内容摘要</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="admin-empty-cell">正在加载数据...</td>
              </tr>
              <tr v-else-if="filteredLogs.length === 0">
                <td colspan="5" class="admin-empty-cell">暂无开发日志</td>
              </tr>
              <tr v-for="log in filteredLogs" :key="log.id">
                <td>
                  <div class="admin-table-primary">{{ log.title }}</div>
                  <div class="admin-table-secondary">更新于 {{ formatDateLabel(log.updatedAt) }}</div>
                </td>
                <td>
                  <div class="admin-table-primary">
                    <span class="admin-status-tag" :class="getFreshnessTone(log.updatedAt)">{{ getFreshnessLabel(log.updatedAt) }}</span>
                  </div>
                  <div class="admin-table-secondary">
                    <span class="admin-status-tag" :class="log.contentText.trim().length >= 160 ? 'is-info' : 'is-neutral'">
                      {{ log.contentText.trim().length >= 160 ? '长文记录' : '短文记录' }}
                    </span>
                  </div>
                </td>
                <td class="admin-devlog-date">{{ formatDateLabel(log.logDate) }}</td>
                <td>
                  <div class="admin-devlog-summary">{{ getSummary(log.contentText) }}</div>
                </td>
                <td>
                  <div class="admin-row-actions">
                    <button type="button" @click="openViewModal(log)">查看</button>
                    <button type="button" @click="openEditModal(log)">编辑</button>
                    <button type="button" class="danger" @click="handleDelete(log)">删除</button>
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
              <h2>{{ modalTitle }}</h2>
              <p>可随时记录开发过程、需求变更和问题处理情况，便于后续回溯与查看。</p>
            </div>
            <button type="button" class="admin-modal-close" @click="closeModal">×</button>
          </div>

          <div class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">{{ errorMessage }}</div>

          <form class="admin-survey-form" @submit.prevent="handleSubmit">
            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>日志元信息</h3>
                <p>先定义标题和日期，再进入详细开发内容编写或查看。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group">
                  <label for="devLogTitle">标题</label>
                  <input id="devLogTitle" v-model.trim="form.title" type="text" placeholder="请输入日志标题" :readonly="isViewMode" />
                </div>

                <div class="form-group">
                  <label for="devLogDate">日期</label>
                  <input id="devLogDate" v-model="form.logDate" type="date" :readonly="isViewMode" />
                </div>
              </div>
            </div>

            <div class="admin-form-section">
              <div class="admin-form-section-head">
                <h3>开发内容</h3>
                <p>记录需求背景、处理过程、结论和后续事项，支持查看模式和编辑模式切换。</p>
              </div>

              <div class="admin-form-grid">
                <div class="form-group admin-form-group-wide">
                  <label>日志内容</label>
                  <div v-if="isViewMode" class="admin-devlog-preview" v-html="form.contentHtml"></div>
                  <div v-else class="admin-devlog-editor">
                    <div ref="editorElement"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="admin-modal-footer">
              <button type="button" class="admin-home-link" @click="closeModal">关闭</button>
              <button v-if="!isViewMode" type="submit" class="admin-home-logout" :disabled="submitting">
                {{ submitting ? '保存中...' : editingLog ? '保存修改' : '创建日志' }}
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
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import {
  createDevLog,
  deleteDevLog,
  fetchAdminDevLogs,
  type DevLog,
  updateDevLog,
} from '../services/api'

type ModalMode = 'create' | 'edit' | 'view'

type DevLogFormState = {
  title: string
  logDate: string
  contentHtml: string
}

const loading = ref(true)
const submitting = ref(false)
const keyword = ref('')
const freshnessFilter = ref<'all' | 'recent' | 'archived'>('all')
const contentFilter = ref<'all' | 'long' | 'short'>('all')
const modalVisible = ref(false)
const errorMessage = ref('')
const pageError = ref('')
const logs = ref<DevLog[]>([])
const editingLog = ref<DevLog | null>(null)
const modalMode = ref<ModalMode>('create')
const editorElement = ref<HTMLDivElement | null>(null)

const form = reactive<DevLogFormState>({
  title: '',
  logDate: '',
  contentHtml: '',
})

let quill: Quill | null = null

const isViewMode = computed(() => modalMode.value === 'view')
const modalTitle = computed(() => {
  if (modalMode.value === 'view') {
    return '查看开发日志'
  }

  return editingLog.value ? '编辑开发日志' : '新增开发日志'
})

const filteredLogs = computed(() => {
  const value = keyword.value.trim().toLowerCase()

  return logs.value.filter((log) => {
    const matchesKeyword = !value || [log.title, log.contentText].some((item) => item.toLowerCase().includes(value))
    const daysSinceUpdate = getDaysSince(log.updatedAt)
    const matchesFreshness = freshnessFilter.value === 'all' || (freshnessFilter.value === 'recent' ? daysSinceUpdate <= 7 : daysSinceUpdate > 7)
    const matchesContent = contentFilter.value === 'all' || (contentFilter.value === 'long' ? log.contentText.trim().length >= 160 : log.contentText.trim().length < 160)
    return matchesKeyword && matchesFreshness && matchesContent
  })
})

const recentLogCount = computed(() => logs.value.filter((log) => getDaysSince(log.updatedAt) <= 7).length)
const longFormLogCount = computed(() => logs.value.filter((log) => log.contentText.trim().length >= 160).length)
const latestUpdateLabel = computed(() => {
  const latestLog = [...logs.value].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
  return latestLog ? formatDateLabel(latestLog.updatedAt) : '--'
})
const devLogInsightCards = computed(() => [
  {
    label: '日志总量',
    value: `${logs.value.length}`,
    detail: `长文记录 ${longFormLogCount.value} 条`,
    tone: logs.value.length > 0 ? 'is-good' : 'is-warn',
  },
  {
    label: '近 7 天更新',
    value: `${recentLogCount.value}`,
    detail: '用于判断当前阶段的开发沉淀活跃度',
    tone: recentLogCount.value > 0 ? 'is-info' : 'is-neutral',
  },
  {
    label: '最近更新时间',
    value: latestUpdateLabel.value,
    detail: '可优先查看最近维护的开发日志',
    tone: 'is-neutral',
  },
])

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return '--'
  }

  return value.replace('T', ' ')
}

function getDaysSince(value?: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY
  }

  return Math.floor((Date.now() - timestamp) / 86400000)
}

function getFreshnessLabel(value?: string | null) {
  const days = getDaysSince(value)

  if (days <= 7) {
    return '最近更新'
  }

  if (days <= 30) {
    return '持续维护'
  }

  return '历史归档'
}

function getFreshnessTone(value?: string | null) {
  const days = getDaysSince(value)

  if (days <= 7) {
    return 'is-success'
  }

  if (days <= 30) {
    return 'is-info'
  }

  return 'is-neutral'
}

function getSummary(value: string) {
  const text = value.trim()

  if (!text) {
    return '暂无内容'
  }

  return text.length > 80 ? `${text.slice(0, 80)}...` : text
}

function resetForm() {
  form.title = ''
  form.logDate = getToday()
  form.contentHtml = ''
  editingLog.value = null
  errorMessage.value = ''
}

function syncEditorContent() {
  if (!quill) {
    return
  }

  quill.setContents([])

  if (form.contentHtml) {
    quill.clipboard.dangerouslyPasteHTML(form.contentHtml)
  }

  quill.enable(!isViewMode.value)
}

function ensureEditor() {
  if (!editorElement.value || quill) {
    return
  }

  quill = new Quill(editorElement.value, {
    theme: 'snow',
    placeholder: '请输入开发日志内容',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block', 'link'],
        [{ align: [] }],
        ['clean'],
      ],
    },
  })

  quill.on('text-change', () => {
    if (!isViewMode.value) {
      form.contentHtml = quill?.root.innerHTML ?? ''
    }
  })
}

async function loadLogs() {
  loading.value = true
  pageError.value = ''

  try {
    logs.value = await fetchAdminDevLogs()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '加载开发日志失败，请稍后重试。'
    } else {
      pageError.value = '加载开发日志失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

async function openCreateModal() {
  resetForm()
  modalMode.value = 'create'
  modalVisible.value = true
  await nextTick()
  ensureEditor()
  syncEditorContent()
}

async function openEditModal(log: DevLog) {
  resetForm()
  editingLog.value = log
  modalMode.value = 'edit'
  form.title = log.title
  form.logDate = log.logDate.slice(0, 10)
  form.contentHtml = log.contentHtml
  modalVisible.value = true
  await nextTick()
  ensureEditor()
  syncEditorContent()
}

function openViewModal(log: DevLog) {
  resetForm()
  editingLog.value = log
  modalMode.value = 'view'
  form.title = log.title
  form.logDate = log.logDate.slice(0, 10)
  form.contentHtml = log.contentHtml
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  resetForm()
}

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''
  form.contentHtml = quill?.root.innerHTML ?? form.contentHtml

  try {
    const payload = {
      title: form.title,
      logDate: form.logDate,
      contentHtml: form.contentHtml,
    }

    if (editingLog.value) {
      await updateDevLog(editingLog.value.id, payload)
    } else {
      await createDevLog(payload)
    }

    await loadLogs()
    closeModal()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message ?? '保存开发日志失败，请稍后重试。'
    } else {
      errorMessage.value = '保存开发日志失败，请稍后重试。'
    }
  } finally {
    submitting.value = false
  }
}

async function handleDelete(log: DevLog) {
  const confirmed = window.confirm(`确定删除开发日志“${log.title}”吗？`)

  if (!confirmed) {
    return
  }

  try {
    await deleteDevLog(log.id)
    await loadLogs()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '删除开发日志失败，请稍后重试。'
    } else {
      pageError.value = '删除开发日志失败，请稍后重试。'
    }
  }
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台 - 开发日志'
  await loadLogs()
})

onBeforeUnmount(() => {
  quill = null
})
</script>