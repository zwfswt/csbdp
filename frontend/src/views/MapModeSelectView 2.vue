<template>
  <div class="mode-select-page">
    <div class="mode-select-shell">
      <div class="mode-select-header">
        <div>
          <div class="mode-select-kicker">Map Experience</div>
          <h1>选择地图模式</h1>
          <p>登录成功后先选择二维或三维工作场景，二者共用同一套后台数据与账号体系。</p>
        </div>

        <div class="mode-select-userbar">
          <span>{{ loginUserText }}</span>
          <button type="button" class="mode-select-logout" @click="handleLogout">退出登录</button>
        </div>
      </div>

      <div class="mode-select-grid">
        <button type="button" class="mode-card mode-card-2d" @click="goToMap('/map-2d')">
          <div class="mode-card-icon">
            <i class="fa-solid fa-map"></i>
          </div>
          <div class="mode-card-copy">
            <strong>二维地图</strong>
            <p>进入当前 Leaflet 地图页面，继续使用现有图层、书签、标注与业务浏览能力。</p>
          </div>
          <span class="mode-card-action">进入 2D</span>
        </button>

        <button type="button" class="mode-card mode-card-3d" @click="goToMap('/map-3d')">
          <div class="mode-card-icon">
            <i class="fa-solid fa-cube"></i>
          </div>
          <div class="mode-card-copy">
            <strong>三维地图</strong>
            <p>进入重建版三维场景，当前已恢复基础地球、底图切换、Home 视角和书签飞行。</p>
          </div>
          <span class="mode-card-action">进入 3D</span>
        </button>
      </div>

      <div class="mode-select-notice">
        <strong>三维模块正在重建</strong>
        <p>旧版三维页已退出运行路径，当前入口连接的是新的轻量骨架版本，后续会逐步恢复图层和业务功能。</p>
      </div>

      <div v-if="isAdmin" class="mode-select-footer">
        <button type="button" class="mode-select-admin-link" @click="router.push('/admin')">进入后台控制台</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { clearLoginState, clearToken, getStoredLoginUser, getStoredUserRole } from '../services/api'

const router = useRouter()
const loginUserText = computed(() => getStoredLoginUser() ?? 'admin')
const isAdmin = computed(() => getStoredUserRole() === 'admin')

function goToMap(path: string) {
  router.push(path)
}

function handleLogout() {
  clearToken()
  clearLoginState()
  router.push('/login')
}

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - 地图模式选择'
  document.body.classList.add('page-map-mode-select')
})

onBeforeUnmount(() => {
  document.body.classList.remove('page-map-mode-select')
})
</script>

<style scoped>
.mode-select-page {
  min-height: 100vh;
  padding: 40px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.24), transparent 35%),
    radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.18), transparent 28%),
    linear-gradient(135deg, #08111f 0%, #0d2039 52%, #13325d 100%);
}

.mode-select-shell {
  width: min(1080px, 100%);
  padding: 36px;
  border-radius: 28px;
  background: rgba(7, 15, 28, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  color: #e2e8f0;
  backdrop-filter: blur(18px);
}

.mode-select-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.mode-select-kicker {
  margin-bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.mode-select-header h1 {
  margin: 0;
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1.05;
}

.mode-select-header p {
  max-width: 620px;
  margin: 12px 0 0;
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.75;
}

.mode-select-userbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.18);
  white-space: nowrap;
}

.mode-select-logout,
.mode-select-admin-link {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease;
}

.mode-select-logout {
  color: #fff;
  background: linear-gradient(135deg, #ef4444, #f97316);
}

.mode-select-admin-link {
  color: #0f172a;
  background: linear-gradient(135deg, #f8fafc, #cbd5e1);
}

.mode-select-logout:hover,
.mode-select-admin-link:hover,
.mode-card:hover {
  transform: translateY(-2px);
}

.mode-select-grid {
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.mode-select-notice {
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.mode-select-notice strong {
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
}

.mode-select-notice p {
  margin: 0;
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.7;
}

.mode-card {
  position: relative;
  overflow: hidden;
  min-height: 320px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
  color: inherit;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.mode-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.92;
}

.mode-card-2d::before {
  background:
    linear-gradient(165deg, rgba(14, 165, 233, 0.92) 0%, rgba(8, 47, 73, 0.95) 100%),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.08) 0 10px, transparent 10px 20px);
}

.mode-card-3d::before {
  background:
    linear-gradient(165deg, rgba(34, 197, 94, 0.92) 0%, rgba(6, 78, 59, 0.96) 100%),
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.16), transparent 30%);
}

.mode-card > * {
  position: relative;
  z-index: 1;
}

.mode-card-icon {
  width: 78px;
  height: 78px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  font-size: 34px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.mode-card-copy strong {
  display: block;
  margin-top: 30px;
  font-size: 28px;
}

.mode-card-copy p {
  margin: 12px 0 0;
  max-width: 360px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.88);
}

.mode-card-action {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.mode-select-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 860px) {
  .mode-select-shell {
    padding: 28px;
  }

  .mode-select-header {
    flex-direction: column;
  }

  .mode-select-grid {
    grid-template-columns: 1fr;
  }

  .mode-card {
    min-height: 260px;
  }
}

@media (max-width: 560px) {
  .mode-select-page {
    padding: 18px;
  }

  .mode-select-shell {
    padding: 22px;
    border-radius: 22px;
  }

  .mode-select-userbar {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
}
</style>