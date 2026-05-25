<template>
  <AdminLayout title="后台控制台" description="统一查看系统状态、核心统计与后台模块入口，并支持浅色 / 深色主题切换。">
    <div class="admin-home-page">
      <div class="error-msg" :style="{ display: pageError ? 'block' : 'none' }">{{ pageError }}</div>

      <section class="admin-panel-card admin-panel-card-wide admin-home-summary">
        <div class="admin-home-summary-copy">
          <div class="admin-section-kicker">Overview</div>
          <h2>欢迎回来，{{ loginUserText }}</h2>
          <p>后台首页现在只保留关键统计、快捷入口和最近动态，减少首屏噪音，方便你快速进入具体管理页。</p>
        </div>

        <div class="admin-home-summary-meta">
          <div class="admin-home-summary-item">
            <span>启用用户</span>
            <strong>{{ summary.activeUsers }}</strong>
          </div>
          <div class="admin-home-summary-item">
            <span>可见图层</span>
            <strong>{{ summary.visibleLayers }}</strong>
          </div>
          <div class="admin-home-summary-item">
            <span>监测位置</span>
            <strong>{{ summary.totalMonitoringPoints }}</strong>
          </div>
          <div class="admin-home-summary-item">
            <span>最近日志</span>
            <strong>{{ summary.latestLogDate }}</strong>
          </div>
        </div>
      </section>

      <section class="admin-stat-grid admin-stat-grid-compact">
        <article v-for="card in statCards.slice(0, 4)" :key="card.label" class="admin-stat-card">
          <div class="admin-stat-card-top">
            <span>{{ card.label }}</span>
            <i :class="card.icon"></i>
          </div>
          <strong>{{ card.value }}</strong>
          <p>{{ card.detail }}</p>
          <div class="admin-stat-card-progress">
            <div class="admin-stat-card-progress-fill" :style="{ width: `${card.progress}%` }"></div>
          </div>
          <small>{{ card.footnote }}</small>
        </article>
      </section>

      <main class="admin-home-grid">
        <section class="admin-panel-card admin-panel-card-span-7">
          <div class="admin-section-heading">
            <div>
              <div class="admin-section-kicker">Quick Access</div>
              <h2>快捷入口</h2>
            </div>
            <p>高频管理操作集中放在首页，不再额外堆叠摘要说明。</p>
          </div>

          <div class="admin-shortcut-list admin-shortcut-list-compact">
            <RouterLink v-for="item in quickLinks" :key="item.to" class="admin-shortcut admin-shortcut-compact" :to="item.to">
              <i :class="item.icon"></i>
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </span>
            </RouterLink>
          </div>
        </section>

        <section class="admin-panel-card admin-panel-card-span-5">
          <div class="admin-section-heading">
            <div>
              <div class="admin-section-kicker">Activity Feed</div>
              <h2>最近动态</h2>
            </div>
            <p>用现有后台数据汇总出最近一次重要更新时间和同步状态。</p>
          </div>

          <div class="admin-activity-list">
            <article v-for="item in activityItems" :key="item.title" class="admin-activity-item">
              <div class="admin-activity-dot"></div>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
                <small>{{ item.time }}</small>
              </div>
            </article>
          </div>
        </section>

        <section class="admin-panel-card admin-panel-card-span-6">
          <div class="admin-section-heading">
            <div>
              <div class="admin-section-kicker">System Status</div>
              <h2>系统状态</h2>
            </div>
            <p>只保留必要状态项，帮助判断当前后台是否可正常工作。</p>
          </div>

          <div class="admin-health-grid">
            <article v-for="item in healthChecks" :key="item.label" class="admin-health-card" :class="item.tone">
              <div class="admin-health-card-top">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
              <p>{{ item.detail }}</p>
            </article>
          </div>
        </section>

        <section class="admin-panel-card admin-panel-card-wide">
          <div class="admin-section-heading">
            <div>
              <div class="admin-section-kicker">Data Snapshot</div>
              <h2>模块概览</h2>
            </div>
            <p>按模块做简洁摘要，不再把首页做成多层级驾驶舱。</p>
          </div>

          <div class="admin-module-grid admin-module-grid-simple">
            <article v-for="item in moduleCards" :key="item.label" class="admin-module-card admin-module-card-simple">
              <div class="admin-module-card-top">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
              </div>
              <strong>{{ item.value }}</strong>
              <p>{{ item.detail }}</p>
            </article>
          </div>
        </section>

        <section class="admin-panel-card admin-panel-card-wide admin-dashboard-note">
          <div class="admin-section-heading">
            <div>
              <div class="admin-section-kicker">Note</div>
              <h2>当前首页说明</h2>
            </div>
          </div>
          <p>当前首页继续通过现有后台接口并行汇总，不新增聚合接口。后续如果还要继续做减法，优先再压缩标签栏和各业务页的摘要区，而不是继续往首页叠加新模块。</p>
        </section>
      </main>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AdminLayout from '../components/AdminLayout.vue'
import { adminNavigationItems } from '../constants/adminNavigation'
import {
  fetchAdminBookmarks,
  fetchAdminDevLogs,
  fetchAdminFieldSurveys,
  fetchAdminLayers,
  fetchAdminMonitoringPoints,
  fetchAdminUsers,
  getStoredLoginUser,
} from '../services/api'

const loading = ref(true)
const pageError = ref('')
const loginUserText = ref(getStoredLoginUser() ?? 'admin')

const summary = reactive({
  totalUsers: 0,
  activeUsers: 0,
  totalLayers: 0,
  systemLayers: 0,
  visibleLayers: 0,
  totalBookmarks: 0,
  totalFieldSurveys: 0,
  totalMonitoringPoints: 0,
  totalDevLogs: 0,
  latestLogDate: '--',
  latestMonitoringDate: '--',
})

const quickLinks = computed(() => adminNavigationItems.filter((item) => item.to !== '/admin').slice(0, 6))
const primaryActions = computed(() => adminNavigationItems.filter((item) => item.to !== '/admin').slice(0, 3))

const heroHighlights = computed(() => [
  {
    label: '启用用户',
    value: `${summary.activeUsers}`,
    detail: `总账号 ${summary.totalUsers} 个`,
  },
  {
    label: '可见图层',
    value: `${summary.visibleLayers}`,
    detail: `系统图层 ${summary.systemLayers} 个`,
  },
  {
    label: '最新监测日期',
    value: summary.latestMonitoringDate,
    detail: `监测位置 ${summary.totalMonitoringPoints} 条`,
  },
])

const signalBand = computed(() => [
  {
    label: '在线模块',
    value: `${adminNavigationItems.length}`,
    detail: '后台导航已接入的控制模块数量',
  },
  {
    label: '可见图层',
    value: `${summary.visibleLayers}`,
    detail: '直接影响前台地图可浏览内容',
  },
  {
    label: '现场采集',
    value: `${summary.totalFieldSurveys + summary.totalMonitoringPoints}`,
    detail: '考察与监测合计条数',
  },
])

const briefingItems = computed(() => [
  {
    label: '用户可用性',
    detail: summary.activeUsers > 0 ? `当前存在 ${summary.activeUsers} 个启用账号，可继续进行后台操作。` : '当前未发现启用账号，建议优先进入用户管理检查状态。',
  },
  {
    label: '地图供应状态',
    detail: summary.visibleLayers > 0 ? `当前有 ${summary.visibleLayers} 个可见图层，前台地图具备基础内容供应。` : '当前没有可见图层，前台地图可能缺少主要业务内容。',
  },
  {
    label: '最新业务更新时间',
    detail: `监测日期 ${summary.latestMonitoringDate}，开发日志 ${summary.latestLogDate}。`,
  },
])

const statCards = computed(() => [
  {
    label: '用户规模',
    value: `${summary.totalUsers}`,
    detail: `启用 ${summary.activeUsers} 个账号`,
    icon: 'fa-solid fa-users',
    progress: getProgress(summary.activeUsers, summary.totalUsers || 1),
    footnote: summary.totalUsers ? '以启用账号占比衡量后台可服务用户规模' : '当前尚未发现用户数据',
  },
  {
    label: '数据目录',
    value: `${summary.totalLayers}`,
    detail: `系统图层 ${summary.systemLayers} 个`,
    icon: 'fa-solid fa-layer-group',
    progress: getProgress(summary.visibleLayers, summary.totalLayers || 1),
    footnote: '按可见图层占比估算当前地图内容开放度',
  },
  {
    label: '地图书签',
    value: `${summary.totalBookmarks}`,
    detail: '常用定位与视角入口',
    icon: 'fa-regular fa-bookmark',
    progress: getProgress(summary.totalBookmarks, Math.max(summary.totalLayers, 1)),
    footnote: '用于衡量常用视角是否已沉淀为可复用入口',
  },
  {
    label: '野外考察',
    value: `${summary.totalFieldSurveys}`,
    detail: '现场图片与考察记录',
    icon: 'fa-solid fa-map-location-dot',
    progress: getProgress(summary.totalFieldSurveys, Math.max(summary.totalMonitoringPoints, 1)),
    footnote: '与监测位置一起反映线下采集工作的累积规模',
  },
  {
    label: '监测位置',
    value: `${summary.totalMonitoringPoints}`,
    detail: `最新日期 ${summary.latestMonitoringDate}`,
    icon: 'fa-solid fa-tower-observation',
    progress: getProgress(summary.totalMonitoringPoints, Math.max(summary.totalLayers, 1)),
    footnote: '用于观察监测数据是否持续扩充与更新',
  },
  {
    label: '开发日志',
    value: `${summary.totalDevLogs}`,
    detail: `最近更新 ${summary.latestLogDate}`,
    icon: 'fa-solid fa-pen-ruler',
    progress: getProgress(summary.totalDevLogs, Math.max(summary.totalUsers, 1)),
    footnote: '反映后台需求、迭代和问题处理的沉淀密度',
  },
])

const trendPanels = computed(() => {
  const items = [
    {
      label: '图层开放度',
      value: `${summary.visibleLayers} / ${summary.totalLayers || 0}`,
      detail: '当前可直接在前台地图使用的业务图层数量。',
      ratio: getProgress(summary.visibleLayers, summary.totalLayers || 1),
    },
    {
      label: '考察覆盖度',
      value: `${summary.totalFieldSurveys}`,
      detail: '野外考察记录越多，现场印证与回看能力越强。',
      ratio: getProgress(summary.totalFieldSurveys, Math.max(summary.totalMonitoringPoints, summary.totalFieldSurveys, 1)),
    },
    {
      label: '监测持续度',
      value: `${summary.totalMonitoringPoints}`,
      detail: '监测位置是平台时空数据持续更新的重要来源。',
      ratio: getProgress(summary.totalMonitoringPoints, Math.max(summary.totalLayers, summary.totalMonitoringPoints, 1)),
    },
    {
      label: '产品沉淀度',
      value: `${summary.totalBookmarks + summary.totalDevLogs}`,
      detail: '书签与开发日志共同衡量使用经验是否正在沉淀。',
      ratio: getProgress(summary.totalBookmarks + summary.totalDevLogs, Math.max(summary.totalLayers + summary.totalUsers, 1)),
    },
  ]

  return items
})

const commandDeckItems = computed(() => [
  {
    label: '账号活跃度',
    value: `${summary.activeUsers}/${summary.totalUsers || 0}`,
    detail: '启用账号比例决定后台是否具备稳定的维护入口。',
    tag: summary.activeUsers > 0 ? '可用' : '待处理',
  },
  {
    label: '地图供给面',
    value: `${summary.visibleLayers}`,
    detail: '可见业务图层数量直接决定前台地图的有效信息面。',
    tag: summary.visibleLayers > 0 ? '在线' : '空白',
  },
  {
    label: '采集积累量',
    value: `${summary.totalFieldSurveys + summary.totalMonitoringPoints}`,
    detail: '现场考察与监测点位共同构成外业沉淀的核心规模。',
    tag: summary.totalFieldSurveys + summary.totalMonitoringPoints > 0 ? '已接入' : '待补充',
  },
  {
    label: '经验沉淀量',
    value: `${summary.totalBookmarks + summary.totalDevLogs}`,
    detail: '书签和开发日志反映经验是否被记录为可复用资产。',
    tag: summary.totalBookmarks + summary.totalDevLogs > 0 ? '已沉淀' : '待沉淀',
  },
])

const activityItems = computed(() => [
  {
    title: '开发日志已同步',
    detail: `当前共 ${summary.totalDevLogs} 条开发日志，最近一次更新为 ${summary.latestLogDate}。`,
    time: summary.latestLogDate,
  },
  {
    title: '监测位置状态已刷新',
    detail: `监测位置累计 ${summary.totalMonitoringPoints} 条，最近监测日期 ${summary.latestMonitoringDate}。`,
    time: summary.latestMonitoringDate,
  },
  {
    title: '地图内容概览可用',
    detail: `系统图层 ${summary.systemLayers} 个，可见图层 ${summary.visibleLayers} 个。`,
    time: loading.value ? '统计加载中' : '已完成汇总',
  },
  {
    title: '现场采集数据已纳入',
    detail: `野外考察 ${summary.totalFieldSurveys} 条，地图书签 ${summary.totalBookmarks} 个。`,
    time: loading.value ? '等待汇总' : '已进入当前看板',
  },
])

const healthChecks = computed(() => [
  {
    label: '接口汇总状态',
    value: loading.value ? '同步中' : '正常',
    detail: loading.value ? '后台首页正在并行汇总各业务接口。' : '当前统计已由前端并行汇总完成。',
    tone: loading.value ? 'is-warn' : 'is-good',
  },
  {
    label: '用户可用性',
    value: summary.activeUsers > 0 ? '可用' : '待处理',
    detail: summary.activeUsers > 0 ? '至少存在一个启用账号，可支持后台使用。' : '当前没有启用账号，需优先处理用户状态。',
    tone: summary.activeUsers > 0 ? 'is-good' : 'is-warn',
  },
  {
    label: '图层供应情况',
    value: summary.visibleLayers > 0 ? '在线' : '空白',
    detail: summary.visibleLayers > 0 ? '存在可见业务图层，可支持前台地图浏览。' : '未检测到可见图层，前台内容可能偏空。',
    tone: summary.visibleLayers > 0 ? 'is-good' : 'is-danger',
  },
  {
    label: '采集沉淀程度',
    value: summary.totalFieldSurveys + summary.totalMonitoringPoints > 0 ? '已接入' : '待补充',
    detail: summary.totalFieldSurveys + summary.totalMonitoringPoints > 0 ? '已存在现场采集或监测数据。' : '尚未发现野外考察和监测位置数据。',
    tone: summary.totalFieldSurveys + summary.totalMonitoringPoints > 0 ? 'is-good' : 'is-warn',
  },
])

const moduleCards = computed(() => [
  {
    label: '用户管理',
    icon: 'fa-solid fa-users',
    value: `${summary.totalUsers}`,
    detail: `其中启用 ${summary.activeUsers} 个账号，可直接进入用户页维护角色与状态。`,
  },
  {
    label: '图层配置',
    icon: 'fa-solid fa-layer-group',
    value: `${summary.totalLayers}`,
    detail: `系统图层 ${summary.systemLayers} 个，可见图层 ${summary.visibleLayers} 个。`,
  },
  {
    label: '地图书签',
    icon: 'fa-regular fa-bookmark',
    value: `${summary.totalBookmarks}`,
    detail: '用于沉淀常用观察视角和定位点位。',
  },
  {
    label: '野外考察',
    icon: 'fa-solid fa-map-location-dot',
    value: `${summary.totalFieldSurveys}`,
    detail: '现场图片和调查记录可以支撑地图业务核验。',
  },
  {
    label: '监测位置',
    icon: 'fa-solid fa-tower-observation',
    value: `${summary.totalMonitoringPoints}`,
    detail: `最近监测日期 ${summary.latestMonitoringDate}。`,
  },
  {
    label: '开发日志',
    icon: 'fa-solid fa-pen-ruler',
    value: `${summary.totalDevLogs}`,
    detail: `最近更新 ${summary.latestLogDate}，可用于回溯需求与问题处理。`,
  },
])

const focusModules = computed(() => [
  {
    label: '用户管理',
    to: '/admin/users',
    icon: 'fa-solid fa-users',
    headline: summary.activeUsers > 0 ? '账号状态可继续支撑后台使用' : '建议优先检查账号启用状态',
    detail: `当前共 ${summary.totalUsers} 个账号，其中启用 ${summary.activeUsers} 个。`,
    reason: summary.activeUsers > 0 ? '适合继续维护角色、状态和密码策略。' : '没有启用账号时，其他后台工作都会受阻。',
  },
  {
    label: '图层配置',
    to: '/admin/layers',
    icon: 'fa-solid fa-layer-group',
    headline: summary.visibleLayers > 0 ? '地图图层已上线，可继续优化结构' : '建议优先补齐可见图层',
    detail: `总图层 ${summary.totalLayers} 个，可见 ${summary.visibleLayers} 个。`,
    reason: '图层供应直接影响前台地图内容的可浏览性。',
  },
  {
    label: '监测位置',
    to: '/admin/monitoring-points',
    icon: 'fa-solid fa-tower-observation',
    headline: `最近监测日期 ${summary.latestMonitoringDate}`,
    detail: `当前已累计 ${summary.totalMonitoringPoints} 条监测位置记录。`,
    reason: '适合检查监测更新是否持续、来源文件是否完整。',
  },
  {
    label: '野外考察',
    to: '/admin/field-surveys',
    icon: 'fa-solid fa-map-location-dot',
    headline: `现场考察已沉淀 ${summary.totalFieldSurveys} 条记录`,
    detail: '可继续补充图片、说明和点位坐标，以支持地图核验。',
    reason: '外业记录是平台可信度和可解释性的重要来源。',
  },
])

function formatDateLabel(value?: string | null) {
  if (!value) {
    return '--'
  }

  return value.replace('T', ' ')
}

function getProgress(value: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.max(8, Math.min(100, Math.round((value / total) * 100)))
}

async function loadDashboardSummary() {
  loading.value = true
  pageError.value = ''

  try {
    const [users, layers, bookmarks, fieldSurveys, monitoringPoints, devLogs] = await Promise.all([
      fetchAdminUsers(),
      fetchAdminLayers(),
      fetchAdminBookmarks(),
      fetchAdminFieldSurveys(),
      fetchAdminMonitoringPoints(),
      fetchAdminDevLogs(),
    ])

    summary.totalUsers = users.length
    summary.activeUsers = users.filter((item) => item.status === 'active').length
    summary.totalLayers = layers.length
    summary.systemLayers = layers.filter((item) => item.isSystem).length
    summary.visibleLayers = layers.filter((item) => item.visible).length
    summary.totalBookmarks = bookmarks.length
    summary.totalFieldSurveys = fieldSurveys.length
    summary.totalMonitoringPoints = monitoringPoints.length
    summary.totalDevLogs = devLogs.length
    summary.latestLogDate = formatDateLabel(devLogs[0]?.logDate)
    summary.latestMonitoringDate = monitoringPoints[0]?.monitorDate ?? '--'
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '加载后台统计失败，请稍后重试。'
    } else {
      pageError.value = '加载后台统计失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - 后台控制台'
  void loadDashboardSummary()
})
</script>