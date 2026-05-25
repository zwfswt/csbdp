<template>
  <div class="admin-login-page">
    <section class="admin-login-shell">
      <div class="admin-login-hero">
        <div class="admin-badge">CSBDP Admin</div>
        <div class="admin-login-kicker">Control Entry</div>
        <h1>管理员登录</h1>
        <p>进入后台后可统一管理图层、书签、野外考察、监测点与资料页入口。</p>

        <div class="admin-login-note">
          <i class="fa-solid fa-shield-halved"></i>
          <span>仅管理员账号可进入后台控制台。</span>
        </div>
      </div>

      <section class="admin-login-panel">
        <div class="admin-login-header">
          <div class="admin-login-icon">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <h2>管理员身份验证</h2>
          <p>请输入后台账号和密码后进入管理控制台，前台普通账号不会获得后台权限。</p>
        </div>

        <div class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">
          {{ errorMessage || '用户名或密码错误，请重新输入。' }}
        </div>

        <el-form class="admin-login-form admin-login-form-modern" @submit.prevent="handleSubmit">
          <div class="admin-login-field">
            <label for="adminUsername">管理员账号</label>
            <el-input id="adminUsername" v-model.trim="username" size="large" placeholder="请输入管理员账号" autocomplete="username">
              <template #prefix>
                <i class="fa-solid fa-user-shield admin-login-input-icon"></i>
              </template>
            </el-input>
          </div>

          <div class="admin-login-field">
            <label for="adminPassword">登录密码</label>
            <el-input
              id="adminPassword"
              v-model.trim="password"
              :type="passwordVisible ? 'text' : 'password'"
              size="large"
              placeholder="请输入登录密码"
              autocomplete="current-password"
              @keyup.enter="handleSubmit"
            >
              <template #prefix>
                <i class="fa-solid fa-lock admin-login-input-icon"></i>
              </template>
              <template #suffix>
                <button type="button" class="admin-login-eye" @click="passwordVisible = !passwordVisible">
                  <i :class="passwordVisible ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                </button>
              </template>
            </el-input>
          </div>

          <div class="option-row admin-login-option-row">
            <el-checkbox v-model="rememberMe">保持后台登录状态</el-checkbox>
            <RouterLink class="admin-back-link" to="/login">前台登录</RouterLink>
          </div>

          <div class="admin-login-submit-row">
            <el-button class="admin-login-btn" type="primary" size="large" :loading="submitting" @click="handleSubmit">
              {{ submitting ? '验证中...' : '进入后台' }}
            </el-button>
          </div>
        </el-form>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { login, storeCsrfToken, storeLoginState, storeToken } from '../services/api'

const router = useRouter()

const username = ref('')
const password = ref('')
const passwordVisible = ref(false)
const rememberMe = ref(true)
const submitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''

  try {
    const response = await login(username.value, password.value)

    if (response.user.role !== 'admin') {
      errorMessage.value = '当前账号无后台权限。'
      return
    }

    storeToken(response.token, rememberMe.value)
    storeCsrfToken(response.csrfToken, rememberMe.value)
    storeLoginState(response.user, rememberMe.value)
    await router.push('/admin')
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.status === 401 ? '管理员账号或密码错误，请重新输入。' : '后台登录失败，请稍后重试。'
      return
    }

    errorMessage.value = '后台登录失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - 后台登录'
  document.body.classList.add('page-login', 'page-admin-login')
})

onBeforeUnmount(() => {
  document.body.classList.remove('page-login', 'page-admin-login')
})
</script>
