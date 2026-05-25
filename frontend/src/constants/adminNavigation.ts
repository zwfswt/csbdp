export type AdminNavigationSection = 'overview' | 'operations' | 'resources'

export type AdminNavigationItem = {
  label: string
  to: string
  icon: string
  description: string
  section: AdminNavigationSection
  permissionKey: string
  routeName: string
  hidden?: boolean
  alwaysShow?: boolean
  activeMenu?: string
  showInBreadcrumb?: boolean
  showInTagsView?: boolean
  affix?: boolean
}

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    label: '控制台看板',
    to: '/admin',
    icon: 'fa-solid fa-chart-line',
    description: '统计概览与快捷入口',
    section: 'overview',
    permissionKey: 'admin:dashboard',
    routeName: 'admin-home',
    alwaysShow: true,
    affix: true,
  },
  {
    label: '用户管理',
    to: '/admin/users',
    icon: 'fa-solid fa-users',
    description: '管理员与普通用户账号',
    section: 'operations',
    permissionKey: 'admin:users',
    routeName: 'admin-users',
  },
  {
    label: '开发日志',
    to: '/admin/dev-logs',
    icon: 'fa-solid fa-pen-ruler',
    description: '记录需求、开发与问题处理',
    section: 'operations',
    permissionKey: 'admin:dev-logs',
    routeName: 'admin-dev-logs',
  },
  {
    label: '野外考察',
    to: '/admin/field-surveys',
    icon: 'fa-solid fa-map-location-dot',
    description: '维护考察点与现场图片',
    section: 'operations',
    permissionKey: 'admin:field-surveys',
    routeName: 'admin-field-surveys',
  },
  {
    label: '监测位置',
    to: '/admin/monitoring-points',
    icon: 'fa-solid fa-tower-observation',
    description: '地下水高程监测点与 Excel 导入',
    section: 'operations',
    permissionKey: 'admin:monitoring-points',
    routeName: 'admin-monitoring-points',
  },
  {
    label: '书签管理',
    to: '/admin/bookmarks',
    icon: 'fa-regular fa-bookmark',
    description: '地图书签与定位视角',
    section: 'operations',
    permissionKey: 'admin:bookmarks',
    routeName: 'admin-bookmarks',
  },
  {
    label: '图层配置',
    to: '/admin/layers',
    icon: 'fa-solid fa-layer-group',
    description: '数据目录与图层显隐顺序',
    section: 'operations',
    permissionKey: 'admin:layers',
    routeName: 'admin-layers',
  },
  {
    label: '卫星与平台',
    to: '/admin/remote-sensing',
    icon: 'fa-solid fa-satellite-dish',
    description: 'Planet、Sentinel 与 GEE',
    section: 'resources',
    permissionKey: 'admin:remote-sensing',
    routeName: 'admin-remote-sensing',
  },
  {
    label: 'ICESat-2 数据',
    to: '/admin/icesat-2',
    icon: 'fa-solid fa-ruler-vertical',
    description: '光子测高产品与下载',
    section: 'resources',
    permissionKey: 'admin:icesat-2',
    routeName: 'admin-icesat-2',
  },
  {
    label: 'SWOT 数据',
    to: '/admin/swot',
    icon: 'fa-solid fa-water',
    description: 'SWOT 产品介绍与入口',
    section: 'resources',
    permissionKey: 'admin:swot',
    routeName: 'admin-swot',
  },
]

export const adminSectionLabels: Record<AdminNavigationSection, { title: string; description: string }> = {
  overview: {
    title: '总览区',
    description: '系统态势与快捷巡检',
  },
  operations: {
    title: '运营区',
    description: '账户、图层与业务数据维护',
  },
  resources: {
    title: '资料区',
    description: '遥感与卫星数据入口',
  },
}

export function getAdminNavigationItemByPath(path: string) {
  return adminNavigationItems.find((item) => item.to === path)
}

export function getAdminNavigationItemByRouteName(routeName?: string | symbol | null) {
  if (!routeName) {
    return undefined
  }

  return adminNavigationItems.find((item) => item.routeName === String(routeName))
}