import { createRouter, createWebHistory } from 'vue-router'
import AdminBookmarkView from '../views/AdminBookmarkView.vue'
import AdminDevLogView from '../views/AdminDevLogView.vue'
import AdminHomeView from '../views/AdminHomeView.vue'
import AdminFieldSurveyView from '../views/AdminFieldSurveyView.vue'
import AdminIcesat2View from '../views/AdminIcesat2View.vue'
import AdminLayerView from '../views/AdminLayerView.vue'
import AdminMonitoringPointView from '../views/AdminMonitoringPointView.vue'
import AdminRemoteSensingView from '../views/AdminRemoteSensingView.vue'
import AdminSwotView from '../views/AdminSwotView.vue'
import AdminUserView from '../views/AdminUserView.vue'
import AdminLoginView from '../views/AdminLoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import Map3DRebuildView from '../views/Map3DRebuildView.vue'
import MapModeSelectView from '../views/MapModeSelectView.vue'
import { getAdminNavigationItemByPath } from '../constants/adminNavigation'
import { getStoredToken, getStoredUserRole } from '../services/api'

function createAdminMeta(path: string) {
  const item = getAdminNavigationItemByPath(path)

  return {
    requiresAuth: true,
    adminArea: true,
    hidden: Boolean(item?.hidden),
    alwaysShow: Boolean(item?.alwaysShow),
    title: item?.label ?? '后台页面',
    icon: item?.icon ?? 'fa-solid fa-grid-2',
    description: item?.description ?? '',
    section: item?.section ?? 'overview',
    permissionKey: item?.permissionKey ?? 'admin:unknown',
    activeMenu: item?.activeMenu ?? path,
    affix: Boolean(item?.affix),
    showInTagsView: item?.showInTagsView ?? true,
    showInBreadcrumb: item?.showInBreadcrumb ?? true,
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'map-mode-select',
      component: MapModeSelectView,
      meta: { requiresAuth: true, title: '地图模式选择' },
    },
    {
      path: '/map-2d',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, title: '二维地图平台', keepAlive: true },
    },
    {
      path: '/map-3d',
      name: 'map-3d',
      component: Map3DRebuildView,
      meta: { requiresAuth: true, title: '三维地图平台' },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true, title: '登录' },
    },
    {
      path: '/admin',
      name: 'admin-home',
      component: AdminHomeView,
      meta: createAdminMeta('/admin'),
    },
    {
      path: '/admin/field-surveys',
      name: 'admin-field-surveys',
      component: AdminFieldSurveyView,
      meta: createAdminMeta('/admin/field-surveys'),
    },
    {
      path: '/admin/monitoring-points',
      name: 'admin-monitoring-points',
      component: AdminMonitoringPointView,
      meta: createAdminMeta('/admin/monitoring-points'),
    },
    {
      path: '/admin/dev-logs',
      name: 'admin-dev-logs',
      component: AdminDevLogView,
      meta: createAdminMeta('/admin/dev-logs'),
    },
    {
      path: '/admin/bookmarks',
      name: 'admin-bookmarks',
      component: AdminBookmarkView,
      meta: createAdminMeta('/admin/bookmarks'),
    },
    {
      path: '/admin/layers',
      name: 'admin-layers',
      component: AdminLayerView,
      meta: createAdminMeta('/admin/layers'),
    },
    {
      path: '/admin/icesat-2',
      name: 'admin-icesat-2',
      component: AdminIcesat2View,
      meta: createAdminMeta('/admin/icesat-2'),
    },
    {
      path: '/admin/swot',
      name: 'admin-swot',
      component: AdminSwotView,
      meta: createAdminMeta('/admin/swot'),
    },
    {
      path: '/admin/remote-sensing',
      name: 'admin-remote-sensing',
      component: AdminRemoteSensingView,
      meta: createAdminMeta('/admin/remote-sensing'),
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUserView,
      meta: createAdminMeta('/admin/users'),
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLoginView,
      meta: { guestOnly: true, adminArea: true, title: '后台登录', showInTagsView: false, showInBreadcrumb: false },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const token = getStoredToken()
  const adminArea = Boolean(to.meta.adminArea)
  const role = getStoredUserRole()

  if (to.meta.requiresAuth && !token) {
    return { name: adminArea ? 'admin-login' : 'login' }
  }

  if (to.meta.requiresAuth && adminArea && token && role !== 'admin') {
    return { name: 'map-mode-select' }
  }

  if (to.meta.guestOnly && token) {
    return { name: adminArea && role === 'admin' ? 'admin-home' : 'map-mode-select' }
  }

  return true
})

export default router