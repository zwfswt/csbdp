<template>
  <AdminLayout title="图层配置" description="维护前台数据目录中的图层顺序、默认显隐和透明度。系统内置图层固定保留，外部 ArcGIS 图层支持新增、编辑和删除。">
    <template #actions>
      <button class="admin-home-link" type="button" @click="openCreateModal">新增 ArcGIS 图层</button>
    </template>

    <div class="admin-home-page">
      <section class="admin-panel-card admin-panel-card-wide admin-page-intro-card">
        <div class="admin-page-intro-grid">
          <div class="admin-page-intro-copy">
            <div class="admin-section-kicker">Layer Supply</div>
            <h2>图层供给摘要</h2>
            <p>先判断当前数据目录是否具备可浏览内容、系统图层占比和外部服务接入规模，再进入列表维护排序、显隐和透明度。</p>

            <div class="admin-page-tag-row">
              <span class="admin-page-tag">总图层 {{ layers.length }}</span>
              <span class="admin-page-tag">系统 {{ systemLayerCount }}</span>
              <span class="admin-page-tag">外部 {{ externalLayerCount }}</span>
              <span class="admin-page-tag">可见 {{ visibleLayerCount }}</span>
            </div>
          </div>

          <div class="admin-page-intro-side">
            <article v-for="item in layerInsightCards" :key="item.label" class="admin-page-insight-card" :class="item.tone">
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
          <p>把新建外部图层、检查前台可见状态和维护系统图层约束拆成三个动作区，减少在表格内来回判断。</p>
        </div>

        <div class="admin-operation-grid">
          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-circle-plus"></i>
              <span>新增接入</span>
            </div>
            <strong>接入外部 ArcGIS 图层</strong>
            <p>新增后会自动进入前台数据目录，可继续配置排序、透明度和默认显隐。</p>
            <button class="admin-home-link" type="button" @click="openCreateModal">新增图层</button>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-eye"></i>
              <span>可见性</span>
            </div>
            <strong>当前可见 {{ visibleLayerCount }} / {{ layers.length || 0 }}</strong>
            <p>可见图层越少，前台可浏览的业务内容越薄；可见过多则会增加地图初始负担。</p>
            <small>{{ visibleLayerCount > 0 ? '当前存在可直接展示的业务图层。' : '当前未发现可见图层，建议优先检查。' }}</small>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-lock"></i>
              <span>系统约束</span>
            </div>
            <strong>系统图层 {{ systemLayerCount }} 个</strong>
            <p>系统内置图层仅允许调整显隐、透明度和排序，不允许修改固定来源地址。</p>
            <small>外部图层则可完整维护 URL 和展示参数。</small>
          </article>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-filter-panel">
        <div class="admin-filter-panel-head">
          <div>
            <div class="admin-section-kicker">Filter Console</div>
            <h2>筛选与维护视图</h2>
          </div>
          <p>先从可见性和图层来源收敛范围，再进入排序、透明度和地址配置。</p>
        </div>

        <div class="admin-filter-toolbar">
          <div class="admin-filter-group">
            <span class="admin-filter-label">可见性</span>
            <button type="button" class="admin-filter-chip" :class="{ active: visibilityFilter === 'all' }" @click="visibilityFilter = 'all'">全部 {{ layers.length }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: visibilityFilter === 'visible' }" @click="visibilityFilter = 'visible'">可见 {{ visibleLayerCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: visibilityFilter === 'hidden' }" @click="visibilityFilter = 'hidden'">隐藏 {{ hiddenLayerCount }}</button>
          </div>

          <div class="admin-filter-group">
            <span class="admin-filter-label">图层来源</span>
            <button type="button" class="admin-filter-chip" :class="{ active: sourceFilter === 'all' }" @click="sourceFilter = 'all'">全部</button>
            <button type="button" class="admin-filter-chip" :class="{ active: sourceFilter === 'system' }" @click="sourceFilter = 'system'">系统 {{ systemLayerCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: sourceFilter === 'external' }" @click="sourceFilter = 'external'">外部 {{ externalLayerCount }}</button>
          </div>
        </div>
      </section>

      <section class="admin-panel-card admin-survey-table-card">
      <div class="admin-table-toolbar">
        <div>
          <h2>数据目录列表</h2>
          <p>共 {{ filteredLayers.length }} 条记录</p>
        </div>

        <label class="admin-search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model.trim="keyword" type="search" placeholder="搜索名称、标识、地址" />
        </label>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>排序</th>
              <th>名称</th>
              <th>标识</th>
              <th>类型</th>
              <th>默认显示</th>
              <th>透明度</th>
              <th>来源</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="admin-empty-cell">正在加载数据...</td>
            </tr>
            <tr v-else-if="filteredLayers.length === 0">
              <td colspan="8" class="admin-empty-cell">暂无图层配置</td>
            </tr>
            <tr v-for="layer in filteredLayers" :key="layer.id">
              <td>{{ layer.sortOrder }}</td>
              <td>
                <div class="admin-table-primary">{{ layer.name }}</div>
                <div class="admin-table-secondary">{{ layer.isSystem ? '系统内置图层' : '外部 ArcGIS 图层' }}</div>
              </td>
              <td>{{ layer.key }}</td>
              <td>{{ layer.type }}</td>
              <td><span class="admin-status-tag" :class="layer.visible ? 'is-success' : 'is-danger'">{{ layer.visible ? '默认显示' : '默认隐藏' }}</span></td>
              <td>{{ layer.opacity.toFixed(2) }}</td>
              <td>
                <div class="admin-table-primary">{{ layer.url || '系统图层' }}</div>
                <div class="admin-table-secondary">{{ layer.isSystem ? '固定来源地址' : '可编辑外部服务地址' }}</div>
              </td>
              <td>
                <div class="admin-row-actions">
                  <button type="button" @click="openEditModal(layer)">编辑</button>
                  <button v-if="!layer.isSystem" type="button" class="danger" @click="handleDelete(layer)">删除</button>
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
            <h2>{{ editingLayer ? '编辑图层配置' : '新增 ArcGIS 图层' }}</h2>
            <p>{{ editingLayer?.isSystem ? '系统图层仅允许修改默认显隐、透明度和排序。' : '新增外部 ArcGIS Server 图层后，将自动出现在前台数据目录中。' }}</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeModal">×</button>
        </div>

        <div class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">{{ errorMessage }}</div>

        <form class="admin-survey-form" @submit.prevent="handleSubmit">
          <div class="admin-form-section">
            <div class="admin-form-section-head">
              <h3>基础配置</h3>
              <p>定义图层名称、排序和值班时常用的基础标识信息。</p>
            </div>

            <div class="admin-form-grid">
              <div class="form-group">
                <label for="layerName">名称</label>
                <input id="layerName" v-model.trim="form.name" type="text" placeholder="请输入图层名称" :readonly="Boolean(editingLayer?.isSystem)" />
              </div>

              <div class="form-group">
                <label for="layerSortOrder">排序值</label>
                <input id="layerSortOrder" v-model.trim="form.sortOrder" type="number" step="1" placeholder="1" />
              </div>

              <div class="form-group">
                <label for="layerKey">稳定标识</label>
                <input id="layerKey" :value="editingLayer?.key || '创建后自动生成'" type="text" readonly />
              </div>

              <div class="form-group">
                <label for="layerType">类型</label>
                <input id="layerType" :value="editingLayer?.type || arcgisTypeLabel" type="text" readonly />
              </div>
            </div>
          </div>

          <div class="admin-form-section">
            <div class="admin-form-section-head">
              <h3>显示与来源</h3>
              <p>维护前台默认显隐、透明度以及外部服务地址。</p>
            </div>

            <div class="admin-form-grid">
              <div class="form-group admin-form-group-wide">
                <label for="layerUrl">ArcGIS 地址</label>
                <input
                  id="layerUrl"
                  v-model.trim="form.url"
                  type="url"
                  placeholder="https://example.com/arcgis/rest/services/xxx/MapServer"
                  :readonly="Boolean(editingLayer?.isSystem)"
                />
                <div class="admin-form-note">系统图层地址固定；外部图层请填写 ArcGIS Server MapServer 地址。</div>
              </div>

              <div class="form-group admin-form-group-wide">
                <label class="admin-checkbox-row">
                  <input v-model="form.visible" type="checkbox" />
                  默认在前台数据目录中显示
                </label>
              </div>

              <div class="form-group admin-form-group-wide">
                <div class="admin-range-label">
                  <label for="layerOpacity">默认透明度</label>
                  <span>{{ opacityPreview }}</span>
                </div>
                <input id="layerOpacity" v-model.trim="form.opacity" type="range" min="0" max="1" step="0.05" />
              </div>
            </div>
          </div>

          <div class="admin-modal-footer">
            <button type="button" class="admin-home-link" @click="closeModal">取消</button>
            <button type="submit" class="admin-home-logout" :disabled="submitting">
              {{ submitting ? '保存中...' : editingLayer ? '保存修改' : '创建图层' }}
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
  createLayer,
  deleteLayer,
  fetchAdminLayers,
  type BusinessLayerConfig,
  updateLayer,
} from '../services/api'

type LayerFormState = {
  name: string
  visible: boolean
  opacity: string
  sortOrder: string
  url: string
}

const arcgisTypeLabel = 'ArcGIS Server MapServer'
const loading = ref(true)
const submitting = ref(false)
const keyword = ref('')
const visibilityFilter = ref<'all' | 'visible' | 'hidden'>('all')
const sourceFilter = ref<'all' | 'system' | 'external'>('all')
const modalVisible = ref(false)
const errorMessage = ref('')
const layers = ref<BusinessLayerConfig[]>([])
const editingLayer = ref<BusinessLayerConfig | null>(null)

const form = reactive<LayerFormState>({
  name: '',
  visible: false,
  opacity: '0.85',
  sortOrder: '1',
  url: '',
})

const filteredLayers = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  return layers.value.filter((layer) => {
    const matchesKeyword = !value || [layer.name, layer.key, layer.url ?? ''].some((item) => item.toLowerCase().includes(value))
    const matchesVisibility = visibilityFilter.value === 'all' || (visibilityFilter.value === 'visible' ? layer.visible : !layer.visible)
    const matchesSource = sourceFilter.value === 'all' || (sourceFilter.value === 'system' ? layer.isSystem : !layer.isSystem)
    return matchesKeyword && matchesVisibility && matchesSource
  })
})

const opacityPreview = computed(() => Number(form.opacity || 0).toFixed(2))
const visibleLayerCount = computed(() => layers.value.filter((layer) => layer.visible).length)
const hiddenLayerCount = computed(() => layers.value.filter((layer) => !layer.visible).length)
const systemLayerCount = computed(() => layers.value.filter((layer) => layer.isSystem).length)
const externalLayerCount = computed(() => layers.value.filter((layer) => !layer.isSystem).length)
const averageOpacityLabel = computed(() => {
  if (!layers.value.length) {
    return '0.00'
  }

  const totalOpacity = layers.value.reduce((sum, layer) => sum + layer.opacity, 0)
  return (totalOpacity / layers.value.length).toFixed(2)
})
const layerInsightCards = computed(() => [
  {
    label: '可见图层',
    value: `${visibleLayerCount.value}`,
    detail: `总图层 ${layers.value.length} 个`,
    tone: visibleLayerCount.value > 0 ? 'is-good' : 'is-danger',
  },
  {
    label: '外部服务',
    value: `${externalLayerCount.value}`,
    detail: '可作为外部 ArcGIS 图层接入规模参考',
    tone: externalLayerCount.value > 0 ? 'is-accent' : 'is-neutral',
  },
  {
    label: '平均透明度',
    value: averageOpacityLabel.value,
    detail: '用于粗略观察图层默认显示强度',
    tone: 'is-neutral',
  },
])

function resetForm() {
  form.name = ''
  form.visible = false
  form.opacity = '0.85'
  form.sortOrder = String(layers.value.length + 1)
  form.url = ''
  editingLayer.value = null
  errorMessage.value = ''
}

async function loadLayers() {
  loading.value = true

  try {
    layers.value = await fetchAdminLayers()
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  resetForm()
  form.visible = false
  form.opacity = '0.85'
  modalVisible.value = true
}

function openEditModal(layer: BusinessLayerConfig) {
  resetForm()
  editingLayer.value = layer
  form.name = layer.name
  form.visible = layer.visible
  form.opacity = String(layer.opacity)
  form.sortOrder = String(layer.sortOrder)
  form.url = layer.url ?? ''
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
      visible: form.visible,
      opacity: form.opacity,
      sortOrder: form.sortOrder,
      url: form.url,
    }

    if (editingLayer.value) {
      await updateLayer(editingLayer.value.id, payload)
    } else {
      await createLayer(payload)
    }

    await loadLayers()
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

async function handleDelete(layer: BusinessLayerConfig) {
  const confirmed = window.confirm(`确定删除图层“${layer.name}”吗？`)

  if (!confirmed) {
    return
  }

  try {
    await deleteLayer(layer.id)
    await loadLayers()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message ?? '删除失败，请稍后重试。'
    } else {
      errorMessage.value = '删除失败，请稍后重试。'
    }
  }
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台 - 图层配置'
  await loadLayers()
})
</script>