import axios from 'axios'

const TOKEN_KEY = 'csbdp-token'
const CSRF_KEY = 'csbdp-csrf-token'
const LOGIN_KEY = 'isLogin'
const USER_KEY = 'csbdp-current-user'

export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'disabled'

export interface CurrentUser {
  id: number
  username: string
  displayName: string
  role: UserRole
  status: UserStatus
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface UserPayload {
  username: string
  displayName: string
  role: UserRole
  password: string
  status: UserStatus
}

export interface UpdateUserPayload {
  username: string
  displayName: string
  role: UserRole
}

export interface LoginResponse {
  token: string
  csrfToken: string
  user: CurrentUser
}

export interface Bookmark {
  id: number
  name: string
  lat: number
  lng: number
  zoom: number
  description: string
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface BookmarkPayload {
  name: string
  lat: number | string
  lng: number | string
  zoom: number | string
  description: string
  sortOrder: number | string
}

export interface DepthPoint {
  id: string
  lat: number
  lng: number
  depth: number
}

export interface BusinessLayerConfig {
  id: number
  key: string
  name: string
  type: string
  visible: boolean
  opacity: number
  sortOrder: number
  isSystem: boolean
  isArcGISServer?: boolean
  url?: string
  createdAt?: string
  updatedAt?: string
}

export interface LayerPayload {
  name: string
  visible: boolean
  opacity: number | string
  sortOrder: number | string
  url: string
}

export interface FieldSurveyImage {
  id: number
  surveyId: number
  originalName: string
  imagePath: string
  url: string
  createdAt: string
}

export interface FieldSurvey {
  id: number
  serialNo: string
  name: string
  surveyTime: string
  longitude: number
  latitude: number
  description: string
  images: FieldSurveyImage[]
  createdAt: string
  updatedAt: string
}

export interface FieldSurveyPayload {
  serialNo: string
  name: string
  surveyTime: string
  longitude: number | string
  latitude: number | string
  description: string
}

export interface MonitoringPoint {
  id: number
  pointName: string
  northing: number | null
  easting: number | null
  elevation: number
  latitude: number
  longitude: number
  ellipsoidHeight: number | null
  monitorDate: string
  monitorTime: string
  monitoredAt: string
  antennaHeight: number | null
  sourceFile: string
  createdAt: string
  updatedAt: string
}

export interface MonitoringPointPayload {
  pointName: string
  northing: number | string | null
  easting: number | string | null
  elevation: number | string
  latitude: number | string
  longitude: number | string
  ellipsoidHeight: number | string | null
  monitorDate: string
  monitorTime: string
  antennaHeight: number | string | null
  sourceFile?: string
}

export interface DevLog {
  id: number
  title: string
  logDate: string
  contentHtml: string
  contentText: string
  createdAt: string
  updatedAt: string
}

export interface DevLogPayload {
  title: string
  logDate: string
  contentHtml: string
}

export interface MapConfigResponse {
  user: {
    id: number
    username: string
    displayName: string
    role: UserRole
    status: UserStatus
  }
  studyArea: number[][]
  depthData: DepthPoint[]
  bookmarks: Bookmark[]
  layers: BusinessLayerConfig[]
  monitoringPoints: MonitoringPoint[]
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  const csrfToken = getStoredCsrfToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }

  return config
})

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string, rememberMe = true) {
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage

  otherStorage.removeItem(TOKEN_KEY)
  storage.setItem(TOKEN_KEY, token)
}

export function getStoredCsrfToken() {
  return localStorage.getItem(CSRF_KEY) ?? sessionStorage.getItem(CSRF_KEY)
}

export function storeCsrfToken(token: string, rememberMe = true) {
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage

  otherStorage.removeItem(CSRF_KEY)
  storage.setItem(CSRF_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(CSRF_KEY)
  sessionStorage.removeItem(CSRF_KEY)
}

export function storeLoginState(user: CurrentUser, rememberMe = true) {
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage

  otherStorage.removeItem(LOGIN_KEY)
  otherStorage.removeItem(USER_KEY)
  storage.setItem(LOGIN_KEY, 'true')
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearLoginState() {
  localStorage.removeItem(LOGIN_KEY)
  sessionStorage.removeItem(LOGIN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function getStoredCurrentUser() {
  const value = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as CurrentUser
  } catch {
    return null
  }
}

export function getStoredLoginUser() {
  const user = getStoredCurrentUser()
  return user?.displayName ?? user?.username ?? null
}

export function getStoredUserRole() {
  return getStoredCurrentUser()?.role ?? null
}

export async function login(username: string, password: string) {
  const response = await api.post<LoginResponse>('/auth/login', {
    username,
    password,
  })

  return response.data
}

export async function fetchMapConfig() {
  const response = await api.get<MapConfigResponse>('/map/config')
  return response.data
}

export async function fetchCurrentUser() {
  const response = await api.get<{ user: CurrentUser }>('/auth/me')
  return response.data.user
}

export async function fetchFieldSurveys() {
  const response = await api.get<{ items: FieldSurvey[] }>('/field-surveys')
  return response.data.items
}

export async function fetchAdminFieldSurveys() {
  const response = await api.get<{ items: FieldSurvey[] }>('/admin/field-surveys')
  return response.data.items
}

export async function fetchAdminBookmarks() {
  const response = await api.get<{ items: Bookmark[] }>('/admin/bookmarks')
  return response.data.items
}

export async function fetchAdminLayers() {
  const response = await api.get<{ items: BusinessLayerConfig[] }>('/admin/layers')
  return response.data.items
}

export async function fetchAdminUsers() {
  const response = await api.get<{ items: CurrentUser[] }>('/admin/users')
  return response.data.items
}

export async function fetchAdminDevLogs() {
  const response = await api.get<{ items: DevLog[] }>('/admin/dev-logs')
  return response.data.items
}

export async function fetchMonitoringPoints() {
  const response = await api.get<{ items: MonitoringPoint[] }>('/monitoring-points')
  return response.data.items
}

export async function fetchAdminMonitoringPoints() {
  const response = await api.get<{ items: MonitoringPoint[] }>('/admin/monitoring-points')
  return response.data.items
}

export async function createMonitoringPoint(payload: MonitoringPointPayload) {
  const response = await api.post<MonitoringPoint>('/admin/monitoring-points', payload)
  return response.data
}

export async function updateMonitoringPoint(id: number, payload: MonitoringPointPayload) {
  const response = await api.put<MonitoringPoint>(`/admin/monitoring-points/${id}`, payload)
  return response.data
}

export async function deleteMonitoringPoint(id: number) {
  await api.delete(`/admin/monitoring-points/${id}`)
}

export async function importMonitoringPoints(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post<{ count: number; items: MonitoringPoint[] }>('/admin/monitoring-points/import', formData)
  return response.data
}

export async function createDevLog(payload: DevLogPayload) {
  const response = await api.post<DevLog>('/admin/dev-logs', payload)
  return response.data
}

export async function updateDevLog(id: number, payload: DevLogPayload) {
  const response = await api.put<DevLog>(`/admin/dev-logs/${id}`, payload)
  return response.data
}

export async function deleteDevLog(id: number) {
  await api.delete(`/admin/dev-logs/${id}`)
}

export async function createUser(payload: UserPayload) {
  const response = await api.post<CurrentUser>('/admin/users', payload)
  return response.data
}

export async function updateUser(id: number, payload: UpdateUserPayload) {
  const response = await api.put<CurrentUser>(`/admin/users/${id}`, payload)
  return response.data
}

export async function resetUserPassword(id: number, password: string) {
  const response = await api.put<CurrentUser>(`/admin/users/${id}/password`, { password })
  return response.data
}

export async function updateUserStatus(id: number, status: UserStatus) {
  const response = await api.put<CurrentUser>(`/admin/users/${id}/status`, { status })
  return response.data
}

export async function createLayer(payload: LayerPayload) {
  const response = await api.post<BusinessLayerConfig>('/admin/layers', payload)
  return response.data
}

export async function updateLayer(id: number, payload: LayerPayload) {
  const response = await api.put<BusinessLayerConfig>(`/admin/layers/${id}`, payload)
  return response.data
}

export async function deleteLayer(id: number) {
  await api.delete(`/admin/layers/${id}`)
}

export async function createBookmark(payload: BookmarkPayload) {
  const response = await api.post<Bookmark>('/admin/bookmarks', payload)
  return response.data
}

export async function updateBookmark(id: number, payload: BookmarkPayload) {
  const response = await api.put<Bookmark>(`/admin/bookmarks/${id}`, payload)
  return response.data
}

export async function deleteBookmark(id: number) {
  await api.delete(`/admin/bookmarks/${id}`)
}

function appendSurveyFormData(formData: FormData, payload: FieldSurveyPayload, files: File[], retainedImageIds: number[] = []) {
  formData.append('serialNo', payload.serialNo)
  formData.append('name', payload.name)
  formData.append('surveyTime', payload.surveyTime)
  formData.append('longitude', String(payload.longitude))
  formData.append('latitude', String(payload.latitude))
  formData.append('description', payload.description)
  formData.append('retainedImageIds', JSON.stringify(retainedImageIds))

  for (const file of files) {
    formData.append('images', file)
  }
}

export async function createFieldSurvey(payload: FieldSurveyPayload, files: File[]) {
  const formData = new FormData()
  appendSurveyFormData(formData, payload, files)
  const response = await api.post<FieldSurvey>('/admin/field-surveys', formData)
  return response.data
}

export async function updateFieldSurvey(id: number, payload: FieldSurveyPayload, files: File[], retainedImageIds: number[]) {
  const formData = new FormData()
  appendSurveyFormData(formData, payload, files, retainedImageIds)
  const response = await api.put<FieldSurvey>(`/admin/field-surveys/${id}`, formData)
  return response.data
}

export async function deleteFieldSurvey(id: number) {
  await api.delete(`/admin/field-surveys/${id}`)
}
