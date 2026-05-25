<template>
  <div class="admin-shell admin-shell-template">
    <div v-if="isMobile && sidebarOpen" class="admin-shell-overlay" @click="sidebarOpen = false"></div>

    <aside class="admin-sidebar" :class="{ open: sidebarOpen || !isMobile, collapsed: sidebarCollapsed && !isMobile }">
      <div class="admin-sidebar-top admin-sidebar-top-template">
        <div class="admin-sidebar-brand">
          <div class="admin-template-brand-row">
            <div>
              <div class="admin-badge">CSBDP Admin</div>
              <h2>后台控制中心</h2>
            </div>

            <button type="button" class="admin-sidebar-collapse" @click="toggleSidebar">
              <i :class="isMobile ? 'fa-solid fa-xmark' : sidebarCollapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left'"></i>
            </button>
          </div>
        </div>
      </div>

      <el-scrollbar class="admin-sidebar-scroll">
        <div class="admin-sidebar-nav-stack">
          <section v-for="section in visibleNavigationSections" :key="section.title" class="admin-sidebar-nav-section">
            <div v-if="!sidebarCollapsed || isMobile" class="admin-sidebar-section-heading">
              <span>{{ section.title }}</span>
            </div>

            <el-menu class="admin-template-menu" :default-active="activeMenu" :collapse="sidebarCollapsed && !isMobile" :collapse-transition="false">
              <el-menu-item v-for="item in section.items" :key="item.to" :index="item.activeMenu ?? item.to" @click="handleMenuSelect(item.to)">
                <i :class="item.icon"></i>
                <div class="admin-template-menu-copy">
                  <strong>{{ item.label }}</strong>
                </div>
              </el-menu-item>
            </el-menu>
          </section>
        </div>
      </el-scrollbar>

      <div class="admin-sidebar-footer" :class="{ 'is-collapsed': sidebarCollapsed && !isMobile }">
        <button type="button" class="admin-sidebar-link admin-sidebar-link-secondary" @click="navigateTo('/')">
          <i class="fa-solid fa-map"></i>
          <span v-if="!sidebarCollapsed || isMobile">
            <strong>地图模式选择</strong>
          </span>
        </button>
        <button type="button" class="admin-sidebar-link admin-sidebar-link-secondary" @click="navigateTo('/map-2d')">
          <i class="fa-regular fa-map"></i>
          <span v-if="!sidebarCollapsed || isMobile">
            <strong>进入二维地图</strong>
          </span>
        </button>
        <button type="button" class="admin-sidebar-link admin-sidebar-link-secondary" @click="navigateTo('/map-3d')">
          <i class="fa-solid fa-cube"></i>
          <span v-if="!sidebarCollapsed || isMobile">
            <strong>进入三维地图</strong>
          </span>
        </button>
      </div>
    </aside>

    <div class="admin-shell-main">
      <header class="admin-shell-topbar">
        <div class="admin-shell-topbar-left">
          <button type="button" class="admin-shell-toggle admin-shell-toggle-inline" @click="toggleSidebar">
            <i :class="isMobile ? 'fa-solid fa-bars' : sidebarCollapsed ? 'fa-solid fa-indent' : 'fa-solid fa-outdent'"></i>
          </button>

          <div class="admin-template-breadcrumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item v-for="item in breadcrumbItems" :key="item.to">
                <button type="button" class="admin-breadcrumb-link" @click="navigateTo(item.to)">
                  <i v-if="item.icon" :class="item.icon"></i>
                  <span>{{ item.label }}</span>
                </button>
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
        </div>

        <div class="admin-shell-topbar-right">
          <div class="admin-theme-switcher" role="group" aria-label="后台主题切换">
            <button type="button" :class="{ active: theme === 'light' }" @click="setTheme('light')">浅色</button>
            <button type="button" :class="{ active: theme === 'dark' }" @click="setTheme('dark')">深色</button>
          </div>

          <el-dropdown trigger="click" @command="handleAccountCommand">
            <button type="button" class="admin-shell-user-menu">
              <span class="admin-shell-user-avatar">{{ loginUserInitial }}</span>
              <span class="admin-shell-user-copy">
                <small>{{ loginUserRoleText }}</small>
                <strong>{{ loginUserText }}</strong>
              </span>
              <i class="fa-solid fa-chevron-down"></i>
            </button>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="admin-home">后台首页</el-dropdown-item>
                <el-dropdown-item command="public-home">地图模式选择</el-dropdown-item>
                <el-dropdown-item command="public-2d">二维地图</el-dropdown-item>
                <el-dropdown-item command="public-3d">三维地图</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <section class="admin-shell-header admin-shell-header-simple">
        <div class="admin-shell-heading-copy">
          <div class="admin-shell-kicker">{{ currentSectionLabel }}</div>
          <h1>{{ title }}</h1>
          <p>{{ description }}</p>
        </div>

        <div class="admin-shell-action-row admin-shell-action-row-simple">
          <slot name="actions"></slot>
          <button type="button" class="admin-home-logout" @click="handleLogout">退出登录</button>
        </div>
      </section>

      <section class="admin-shell-routebar">
        <div class="admin-tags-view">
          <button type="button" class="admin-tags-home" @click="navigateTo('/admin')">
            <i class="fa-solid fa-house"></i>
          </button>

          <el-scrollbar class="admin-tags-scroll-wrap">
            <div class="admin-tags-scroll">
              <button
                v-for="tag in visitedTags"
                :key="tag.to"
                type="button"
                class="admin-tag-item"
                :class="{ active: tag.to === route.path }"
                @click="navigateTo(tag.to)"
              >
                <i :class="tag.icon"></i>
                <span>{{ tag.label }}</span>
                <span v-if="!tag.affix" class="admin-tag-close" @click.stop="closeTag(tag.to)">×</span>
              </button>
            </div>
          </el-scrollbar>
        </div>
      </section>

      <main class="admin-shell-content">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  adminNavigationItems,
  adminSectionLabels,
  getAdminNavigationItemByPath,
  getAdminNavigationItemByRouteName,
} from '../constants/adminNavigation'
import { useAdminTheme } from '../composables/useAdminTheme'
import { clearLoginState, clearToken, getStoredLoginUser, getStoredUserRole } from '../services/api'

type NavigationSection = {
  title: string
  description: string
  items: typeof adminNavigationItems
}

type BreadcrumbItem = {
  label: string
  to: string
  icon?: string
}

type VisitedTag = {
  to: string
  label: string
  icon: string
  affix: boolean
  permissionKey?: string
}

const ADMIN_VISITED_TAGS_KEY = 'csbdp-admin-visited-tags'

const props = defineProps<{
  title: string
  description: string
}>()

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const isMobile = ref(false)
const visitedTags = ref<VisitedTag[]>([])
const loginUserText = computed(() => getStoredLoginUser() ?? 'admin')
const loginUserRoleText = computed(() => (getStoredUserRole() === 'admin' ? '管理员账号' : '平台账号'))
const loginUserInitial = computed(() => loginUserText.value.slice(0, 1).toUpperCase())
const { theme, setTheme } = useAdminTheme()
const currentNavItem = computed(() => getAdminNavigationItemByRouteName(route.name) ?? getAdminNavigationItemByPath(route.path))
const currentMeta = computed(() => route.meta)
const workspaceDateLabel = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(new Date()),
)

const activeMenu = computed(() => String(route.meta.activeMenu ?? route.path))
const navigationSections = computed<NavigationSection[]>(() => {
  return Object.entries(adminSectionLabels)
    .map(([section, label]) => ({
      title: label.title,
      description: label.description,
      items: adminNavigationItems.filter((item) => item.section === section),
    }))
    .filter((section) => section.items.length > 0)
})
const visibleNavigationSections = computed(() =>
  navigationSections.value
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.hidden),
    }))
    .filter((section) => section.items.length > 0),
)
const currentSectionLabel = computed(() => {
  const activeSection = navigationSections.value.find((section) => section.items.some((item) => item.to === currentNavItem.value?.to))
  return activeSection?.title ?? '总览区'
})
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (!route.meta.adminArea || route.name === 'admin-login') {
    return []
  }

  const items: BreadcrumbItem[] = [
    {
      label: '后台控制中心',
      to: '/admin',
      icon: 'fa-solid fa-table-columns',
    },
  ]

  if (route.path !== '/admin') {
    items.push({
      label: String(route.meta.title ?? props.title),
      to: route.path,
      icon: String(route.meta.icon ?? currentNavItem.value?.icon ?? ''),
    })
  }

  return items
})

function buildVisitedTag(path: string): VisitedTag | null {
  const navItem = getAdminNavigationItemByPath(path)

  if (!navItem) {
    return null
  }

  return {
    to: navItem.to,
    label: navItem.label,
    icon: navItem.icon,
    affix: Boolean(navItem.affix),
    permissionKey: navItem.permissionKey,
  }
}

function persistVisitedTags() {
  sessionStorage.setItem(ADMIN_VISITED_TAGS_KEY, JSON.stringify(visitedTags.value))
}

function ensureVisitedTag(path: string) {
  const nextTag = buildVisitedTag(path)

  if (!nextTag) {
    return
  }

  const existingIndex = visitedTags.value.findIndex((tag) => tag.to === nextTag.to)

  if (existingIndex >= 0) {
    visitedTags.value.splice(existingIndex, 1, nextTag)
  } else {
    visitedTags.value.push(nextTag)
  }

  visitedTags.value.sort((left, right) => {
    const leftIndex = adminNavigationItems.findIndex((item) => item.to === left.to)
    const rightIndex = adminNavigationItems.findIndex((item) => item.to === right.to)
    return leftIndex - rightIndex
  })

  persistVisitedTags()
}

function restoreVisitedTags() {
  const initialTags = adminNavigationItems.filter((item) => item.affix).map((item) => buildVisitedTag(item.to)).filter(Boolean) as VisitedTag[]
  const storedValue = sessionStorage.getItem(ADMIN_VISITED_TAGS_KEY)

  if (!storedValue) {
    visitedTags.value = initialTags
    return
  }

  try {
    const parsed = JSON.parse(storedValue) as VisitedTag[]
    const validTags = parsed
      .map((item) => buildVisitedTag(item.to))
      .filter(Boolean) as VisitedTag[]

    visitedTags.value = [...initialTags]

    for (const tag of validTags) {
      if (!visitedTags.value.some((item) => item.to === tag.to)) {
        visitedTags.value.push(tag)
      }
    }
  } catch {
    visitedTags.value = initialTags
  }
}

function isActive(path: string) {
  return route.path === path
}

function syncViewport() {
  isMobile.value = window.innerWidth <= 1180

  if (isMobile.value) {
    sidebarCollapsed.value = false
  } else {
    sidebarOpen.value = false
  }
}

function toggleSidebar() {
  if (isMobile.value) {
    sidebarOpen.value = !sidebarOpen.value
    return
  }

  sidebarCollapsed.value = !sidebarCollapsed.value
}

function navigateTo(path: string) {
  if (path !== route.path) {
    router.push(path)
  }

  if (isMobile.value) {
    sidebarOpen.value = false
  }
}

function handleMenuSelect(path: string) {
  navigateTo(path)
}

function handleAccountCommand(command: string | number | object) {
  switch (command) {
    case 'admin-home':
      navigateTo('/admin')
      break
    case 'public-home':
      navigateTo('/')
      break
    case 'public-2d':
      navigateTo('/map-2d')
      break
    case 'public-3d':
      navigateTo('/map-3d')
      break
    case 'logout':
      handleLogout()
      break
    default:
      break
  }
}

function closeTag(path: string) {
  const target = visitedTags.value.find((tag) => tag.to === path)

  if (!target || target.affix) {
    return
  }

  const nextTags = visitedTags.value.filter((tag) => tag.to !== path)
  visitedTags.value = nextTags
  persistVisitedTags()

  if (route.path === path) {
    const fallback = nextTags[nextTags.length - 1]?.to ?? '/admin'
    router.push(fallback)
  }
}

function handleLogout() {
  clearToken()
  clearLoginState()
  sessionStorage.removeItem(ADMIN_VISITED_TAGS_KEY)
  router.push('/admin/login')
}

onMounted(() => {
  document.body.classList.add('page-admin-home')
  syncViewport()
  window.addEventListener('resize', syncViewport)
  restoreVisitedTags()
  ensureVisitedTag(route.path)
})

watch(
  () => route.path,
  (path) => {
    if (currentMeta.value.adminArea && currentMeta.value.showInTagsView !== false) {
      ensureVisitedTag(path)
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
  document.body.classList.remove('page-admin-home')
})
</script>