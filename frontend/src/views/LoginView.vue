<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-box">
          <i class="fa-solid fa-water"></i>
        </div>
        <h1>海岸带时空水深数据平台</h1>
        <p>
          面向海岸带水深数据管理、遥感反演结果展示、无人船测深与多源数据融合的 WebGIS 平台
        </p>
      </div>

      <div class="login-body">
        <h2 class="form-title">用户登录</h2>

        <div id="errorMsg" class="error-msg" :style="{ display: errorMessage ? 'block' : 'none' }">
          {{ errorMessage || '用户名或密码错误，请重新输入。' }}
        </div>

        <form id="loginForm" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="username">用户名</label>
            <div class="input-wrap">
              <i class="fa-solid fa-user"></i>
              <input
                id="username"
                v-model.trim="username"
                type="text"
                placeholder="请输入用户名"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">密码</label>
            <div class="input-wrap">
              <i class="fa-solid fa-lock"></i>
              <input
                id="password"
                v-model.trim="password"
                type="password"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
            </div>
          </div>

          <div class="option-row">
            <label>
              <input id="rememberMe" v-model="rememberMe" type="checkbox" />
              记住登录状态
            </label>
          </div>

          <button class="login-btn" type="submit" :disabled="submitting">
            {{ submitting ? '登录中...' : '登录平台' }}
          </button>
        </form>

        <div class="footer-text">
          © 2026 海岸带时空水深数据平台
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, storeCsrfToken, storeLoginState, storeToken } from '../services/api'

const router = useRouter()

const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''

  try {
    const response = await login(username.value, password.value)
    storeToken(response.token, rememberMe.value)
    storeCsrfToken(response.csrfToken, rememberMe.value)
    storeLoginState(response.user, rememberMe.value)
    await router.push('/')
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.status === 401 ? '用户名或密码错误，请重新输入。' : '登录失败，请稍后重试。'
      return
    }

    errorMessage.value = '登录失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - 登录'
  document.body.classList.add('page-login')
})

onBeforeUnmount(() => {
  document.body.classList.remove('page-login')
})
</script>
