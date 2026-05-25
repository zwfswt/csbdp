<template>
  <AdminLayout title="用户管理" description="统一维护后台管理员和前台普通用户账号，支持新增、编辑资料、重置密码以及启用或禁用账号。">
    <template #actions>
      <button class="admin-home-link" type="button" @click="openCreateModal">新增用户</button>
    </template>

    <div class="admin-home-page">
      <section class="admin-panel-card admin-panel-card-wide admin-page-intro-card">
        <div class="admin-page-intro-grid">
          <div class="admin-page-intro-copy">
            <div class="admin-section-kicker">Account Control</div>
            <h2>账号运营摘要</h2>
            <p>把管理员与普通用户的状态、角色结构和最近登录情况放到页头，先完成一轮可用性判断，再进入账号编辑和密码重置。</p>

            <div class="admin-page-tag-row">
              <span class="admin-page-tag">总账号 {{ users.length }}</span>
              <span class="admin-page-tag">启用 {{ activeUserCount }}</span>
              <span class="admin-page-tag">管理员 {{ adminUserCount }}</span>
              <span class="admin-page-tag">最近登录 {{ latestLoginLabel }}</span>
            </div>
          </div>

          <div class="admin-page-intro-side">
            <article v-for="item in userInsightCards" :key="item.label" class="admin-page-insight-card" :class="item.tone">
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
          <p>把本页最常见的维护动作前置成可扫描分区，避免直接扎进表格里逐条找。</p>
        </div>

        <div class="admin-operation-grid">
          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-user-plus"></i>
              <span>新增账号</span>
            </div>
            <strong>创建管理员或普通用户</strong>
            <p>适合初始化账号、补充显示名和角色信息。</p>
            <button class="admin-home-link" type="button" @click="openCreateModal">立即新增</button>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-shield-halved"></i>
              <span>权限检查</span>
            </div>
            <strong>管理员占比 {{ adminUserCount }} / {{ users.length || 0 }}</strong>
            <p>管理员过少会影响后台值守；管理员过多则会增加权限扩散风险。</p>
            <small>{{ adminUserCount > 0 ? '当前至少存在一个管理员账号。' : '当前未发现管理员账号，建议优先核查。' }}</small>
          </article>

          <article class="admin-operation-card">
            <div class="admin-operation-card-top">
              <i class="fa-solid fa-key"></i>
              <span>安全维护</span>
            </div>
            <strong>支持逐账号重置密码与启停状态</strong>
            <p>先用搜索缩小范围，再在表格操作区执行编辑、密码重置或启用/禁用。</p>
            <small>适合做周期性账号巡检。</small>
          </article>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-filter-panel">
        <div class="admin-filter-panel-head">
          <div>
            <div class="admin-section-kicker">Filter Console</div>
            <h2>筛选与快速定位</h2>
          </div>
          <p>按账号状态和角色先做一轮收敛，再进入表格逐条维护。</p>
        </div>

        <div class="admin-filter-toolbar">
          <div class="admin-filter-group">
            <span class="admin-filter-label">账号状态</span>
            <button type="button" class="admin-filter-chip" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部 {{ users.length }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: statusFilter === 'active' }" @click="statusFilter = 'active'">启用 {{ activeUserCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: statusFilter === 'disabled' }" @click="statusFilter = 'disabled'">禁用 {{ disabledUserCount }}</button>
          </div>

          <div class="admin-filter-group">
            <span class="admin-filter-label">账号角色</span>
            <button type="button" class="admin-filter-chip" :class="{ active: roleFilter === 'all' }" @click="roleFilter = 'all'">全部</button>
            <button type="button" class="admin-filter-chip" :class="{ active: roleFilter === 'admin' }" @click="roleFilter = 'admin'">管理员 {{ adminUserCount }}</button>
            <button type="button" class="admin-filter-chip" :class="{ active: roleFilter === 'user' }" @click="roleFilter = 'user'">普通用户 {{ normalUserCount }}</button>
          </div>
        </div>
      </section>

      <section class="admin-panel-card admin-survey-table-card">
      <div class="admin-table-toolbar">
        <div>
          <h2>用户列表</h2>
          <p>共 {{ filteredUsers.length }} 条记录</p>
        </div>

        <label class="admin-search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model.trim="keyword" type="search" placeholder="搜索用户名、显示名、角色" />
        </label>
      </div>

      <div class="error-msg" :style="{ display: pageError ? 'block' : 'none' }">{{ pageError }}</div>

      <div class="admin-table-wrap">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>显示名</th>
              <th>角色</th>
              <th>状态</th>
              <th>最近登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="admin-empty-cell">正在加载数据...</td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="6" class="admin-empty-cell">暂无用户记录</td>
            </tr>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>
                <div class="admin-table-primary">{{ user.username }}</div>
                <div class="admin-table-secondary">账号 ID {{ user.id }}</div>
              </td>
              <td>
                <div class="admin-table-primary">{{ user.displayName }}</div>
                <div class="admin-table-secondary">{{ user.role === 'admin' ? '后台管理视角' : '前台使用视角' }}</div>
              </td>
              <td><span class="admin-status-tag" :class="user.role === 'admin' ? 'is-info' : 'is-neutral'">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</span></td>
              <td><span class="admin-status-tag" :class="user.status === 'active' ? 'is-success' : 'is-danger'">{{ user.status === 'active' ? '启用' : '禁用' }}</span></td>
              <td>{{ formatDateLabel(user.lastLoginAt) }}</td>
              <td>
                <div class="admin-row-actions">
                  <button type="button" @click="openEditModal(user)">编辑</button>
                  <button type="button" @click="openPasswordModal(user)">重置密码</button>
                  <button type="button" :class="user.status === 'active' ? 'danger' : ''" @click="toggleStatus(user)">
                    {{ user.status === 'active' ? '禁用' : '启用' }}
                  </button>
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
            <h2>{{ editingUser ? '编辑用户' : '新增用户' }}</h2>
            <p>维护账号基础资料与角色信息。首版支持管理员和普通用户两种角色。</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeModal">×</button>
        </div>

        <div class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">{{ errorMessage }}</div>

        <form class="admin-survey-form" @submit.prevent="handleSubmit">
          <div class="admin-form-section">
            <div class="admin-form-section-head">
              <h3>基础资料</h3>
              <p>用于定义账号识别信息和在后台显示的名称。</p>
            </div>

            <div class="admin-form-grid">
              <div class="form-group">
                <label for="userUsername">用户名</label>
                <input id="userUsername" v-model.trim="form.username" type="text" placeholder="请输入用户名" />
              </div>

              <div class="form-group">
                <label for="userDisplayName">显示名</label>
                <input id="userDisplayName" v-model.trim="form.displayName" type="text" placeholder="请输入显示名" />
              </div>
            </div>
          </div>

          <div class="admin-form-section">
            <div class="admin-form-section-head">
              <h3>权限与状态</h3>
              <p>用于确定该账号是后台管理员还是普通用户，以及默认启用状态。</p>
            </div>

            <div class="admin-form-grid">
              <div class="form-group">
                <label for="userRole">角色</label>
                <select id="userRole" v-model="form.role">
                  <option value="admin">管理员</option>
                  <option value="user">普通用户</option>
                </select>
              </div>

              <div class="form-group">
                <label for="userStatus">状态</label>
                <select id="userStatus" v-model="form.status" :disabled="Boolean(editingUser)">
                  <option value="active">启用</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>

              <div v-if="!editingUser" class="form-group admin-form-group-wide">
                <label for="userPassword">初始密码</label>
                <input id="userPassword" v-model="form.password" type="password" placeholder="不少于 6 位" />
              </div>
            </div>
          </div>

          <div class="admin-modal-footer">
            <button type="button" class="admin-home-link" @click="closeModal">取消</button>
            <button type="submit" class="admin-home-logout" :disabled="submitting">
              {{ submitting ? '保存中...' : editingUser ? '保存修改' : '创建用户' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="passwordModalVisible" class="admin-modal-mask" @click.self="closePasswordModal">
      <div class="admin-modal admin-survey-modal admin-password-modal">
        <div class="admin-modal-header">
          <div>
            <h2>重置密码</h2>
            <p>为 {{ passwordTarget?.displayName || passwordTarget?.username }} 设置新的登录密码。</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closePasswordModal">×</button>
        </div>

        <div class="error-msg" :style="{ display: passwordError ? 'block' : 'none' }">{{ passwordError }}</div>

        <form class="admin-survey-form" @submit.prevent="handlePasswordReset">
          <div class="admin-form-grid">
            <div class="form-group admin-form-group-wide">
              <label for="resetPassword">新密码</label>
              <input id="resetPassword" v-model="passwordForm.password" type="password" placeholder="不少于 6 位" />
            </div>
          </div>

          <div class="admin-modal-footer">
            <button type="button" class="admin-home-link" @click="closePasswordModal">取消</button>
            <button type="submit" class="admin-home-logout" :disabled="passwordSubmitting">
              {{ passwordSubmitting ? '提交中...' : '确认重置' }}
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
  createUser,
  fetchAdminUsers,
  resetUserPassword,
  type CurrentUser,
  type UserRole,
  type UserStatus,
  updateUser,
  updateUserStatus,
} from '../services/api'

type UserFormState = {
  username: string
  displayName: string
  role: UserRole
  status: UserStatus
  password: string
}

const loading = ref(true)
const submitting = ref(false)
const passwordSubmitting = ref(false)
const keyword = ref('')
const statusFilter = ref<'all' | 'active' | 'disabled'>('all')
const roleFilter = ref<'all' | 'admin' | 'user'>('all')
const modalVisible = ref(false)
const passwordModalVisible = ref(false)
const errorMessage = ref('')
const passwordError = ref('')
const pageError = ref('')
const users = ref<CurrentUser[]>([])
const editingUser = ref<CurrentUser | null>(null)
const passwordTarget = ref<CurrentUser | null>(null)

const form = reactive<UserFormState>({
  username: '',
  displayName: '',
  role: 'user',
  status: 'active',
  password: '',
})

const passwordForm = reactive({
  password: '',
})

const filteredUsers = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  return users.value.filter((user) => {
    const matchesKeyword = !value || [user.username, user.displayName, user.role].some((item) => item.toLowerCase().includes(value))
    const matchesStatus = statusFilter.value === 'all' || user.status === statusFilter.value
    const matchesRole = roleFilter.value === 'all' || user.role === roleFilter.value
    return matchesKeyword && matchesStatus && matchesRole
  })
})

const activeUserCount = computed(() => users.value.filter((user) => user.status === 'active').length)
const adminUserCount = computed(() => users.value.filter((user) => user.role === 'admin').length)
const normalUserCount = computed(() => users.value.filter((user) => user.role === 'user').length)
const disabledUserCount = computed(() => users.value.filter((user) => user.status === 'disabled').length)
const latestLoginLabel = computed(() => {
  const latestUser = [...users.value]
    .filter((user) => Boolean(user.lastLoginAt))
    .sort((left, right) => (right.lastLoginAt ?? '').localeCompare(left.lastLoginAt ?? ''))[0]

  return latestUser?.lastLoginAt ? formatDateLabel(latestUser.lastLoginAt) : '从未登录'
})
const userInsightCards = computed(() => [
  {
    label: '启用账号',
    value: `${activeUserCount.value}`,
    detail: `禁用 ${disabledUserCount.value} 个账号`,
    tone: activeUserCount.value > 0 ? 'is-good' : 'is-warn',
  },
  {
    label: '角色结构',
    value: `${adminUserCount.value} / ${users.value.length || 0}`,
    detail: '管理员 / 总账号',
    tone: adminUserCount.value > 0 ? 'is-accent' : 'is-danger',
  },
  {
    label: '最近登录',
    value: latestLoginLabel.value,
    detail: '用于判断后台活跃性与账号使用情况',
    tone: 'is-neutral',
  },
])

function formatDateLabel(value?: string | null) {
  if (!value) {
    return '从未登录'
  }

  return value.replace('T', ' ')
}

function resetForm() {
  form.username = ''
  form.displayName = ''
  form.role = 'user'
  form.status = 'active'
  form.password = ''
  editingUser.value = null
  errorMessage.value = ''
}

function resetPasswordForm() {
  passwordForm.password = ''
  passwordTarget.value = null
  passwordError.value = ''
}

async function loadUsers() {
  loading.value = true
  pageError.value = ''

  try {
    users.value = await fetchAdminUsers()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '加载用户失败，请稍后重试。'
    } else {
      pageError.value = '加载用户失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  resetForm()
  modalVisible.value = true
}

function openEditModal(user: CurrentUser) {
  resetForm()
  editingUser.value = user
  form.username = user.username
  form.displayName = user.displayName
  form.role = user.role
  form.status = user.status
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  resetForm()
}

function openPasswordModal(user: CurrentUser) {
  resetPasswordForm()
  passwordTarget.value = user
  passwordModalVisible.value = true
}

function closePasswordModal() {
  passwordModalVisible.value = false
  resetPasswordForm()
}

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''

  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, {
        username: form.username,
        displayName: form.displayName,
        role: form.role,
      })
    } else {
      await createUser({
        username: form.username,
        displayName: form.displayName,
        role: form.role,
        password: form.password,
        status: form.status,
      })
    }

    await loadUsers()
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

async function handlePasswordReset() {
  if (!passwordTarget.value) {
    return
  }

  passwordSubmitting.value = true
  passwordError.value = ''

  try {
    await resetUserPassword(passwordTarget.value.id, passwordForm.password)
    await loadUsers()
    closePasswordModal()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      passwordError.value = error.response?.data?.message ?? '重置密码失败，请稍后重试。'
    } else {
      passwordError.value = '重置密码失败，请稍后重试。'
    }
  } finally {
    passwordSubmitting.value = false
  }
}

async function toggleStatus(user: CurrentUser) {
  try {
    await updateUserStatus(user.id, user.status === 'active' ? 'disabled' : 'active')
    await loadUsers()
  } catch (error) {
    if (axios.isAxiosError(error)) {
      pageError.value = error.response?.data?.message ?? '更新用户状态失败，请稍后重试。'
    } else {
      pageError.value = '更新用户状态失败，请稍后重试。'
    }
  }
}

onMounted(async () => {
  document.title = '海岸带时空水深数据平台 - 用户管理'
  await loadUsers()
})
</script>