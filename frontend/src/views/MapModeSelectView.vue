<template>
  <div class="mode-select-page">
    <div class="mode-select-topbar">
      <div class="mode-select-brand">
        <span class="mode-select-brand-mark">CSBDP</span>
        <span>海岸带时空水深数据平台</span>
      </div>

      <div class="mode-select-userbar">
        <span>{{ loginUserText }}</span>
        <button v-if="isAdmin" type="button" class="mode-select-admin-link" @click="router.push('/admin')">
          <i class="fa-solid fa-table-columns"></i>
          后台
        </button>
        <button type="button" class="mode-select-logout" @click="handleLogout">
          <i class="fa-solid fa-right-from-bracket"></i>
          退出
        </button>
      </div>
    </div>

    <main class="mode-select-shell">
      <section class="mode-select-intro">
        <div class="mode-select-kicker">Map Workspace</div>
        <h1>选择地图模式</h1>
        <p>在二维数据浏览与三维地形场景之间切换，同一套书签、图层和业务数据保持同步。</p>

        <div class="mode-select-metrics">
          <div>
            <strong>2D</strong>
            <span>快速制图</span>
          </div>
          <div>
            <strong>3D</strong>
            <span>地形浏览</span>
          </div>
          <div>
            <strong>GIS</strong>
            <span>统一数据</span>
          </div>
        </div>
      </section>

      <section class="mode-select-grid" aria-label="地图模式">
        <button type="button" class="mode-card mode-card-2d" @click="goToMap('/map-2d')">
          <span class="mode-card-media" aria-hidden="true">
            <span class="mode-card-mapline mode-card-mapline-a"></span>
            <span class="mode-card-mapline mode-card-mapline-b"></span>
            <span class="mode-card-pin mode-card-pin-a"></span>
            <span class="mode-card-pin mode-card-pin-b"></span>
          </span>
          <span class="mode-card-body">
            <span class="mode-card-icon">
              <i class="fa-solid fa-map"></i>
            </span>
            <span class="mode-card-copy">
              <strong>二维地图</strong>
              <span>图层浏览、空间书签、标注绘制、测距与打印。</span>
            </span>
            <span class="mode-card-action">
              进入二维
              <i class="fa-solid fa-arrow-right"></i>
            </span>
          </span>
        </button>

        <button type="button" class="mode-card mode-card-3d" @click="goToMap('/map-3d')">
          <span class="mode-card-media" aria-hidden="true">
            <span class="mode-card-ridge mode-card-ridge-a"></span>
            <span class="mode-card-ridge mode-card-ridge-b"></span>
            <span class="mode-card-ridge mode-card-ridge-c"></span>
          </span>
          <span class="mode-card-body">
            <span class="mode-card-icon">
              <i class="fa-solid fa-cube"></i>
            </span>
            <span class="mode-card-copy">
              <strong>三维地图</strong>
              <span>地形起伏、书签飞行、三维图层、标注与场景打印。</span>
            </span>
            <span class="mode-card-action">
              进入三维
              <i class="fa-solid fa-arrow-right"></i>
            </span>
          </span>
        </button>
      </section>
    </main>
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  color: #f8fafc;
  background: linear-gradient(90deg, rgba(3, 7, 18, 0.72), rgba(3, 7, 18, 0.28)), url('/images/coastal.jpg') center / cover no-repeat;
}

.mode-select-topbar {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.mode-select-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  font-weight: 700;
}

.mode-select-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  color: #0f172a;
  background: #f8fafc;
  font-size: 13px;
}

.mode-select-shell {
  width: min(1180px, 100%);
  margin: auto;
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(520px, 1.35fr);
  align-items: end;
  gap: 34px;
}

.mode-select-intro {
  padding-bottom: 18px;
}

.mode-select-kicker {
  margin-bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #bae6fd;
}

.mode-select-intro h1 {
  margin: 0;
  font-size: clamp(40px, 7vw, 82px);
  line-height: 0.96;
  max-width: 560px;
}

.mode-select-intro p {
  max-width: 520px;
  margin: 20px 0 0;
  color: rgba(248, 250, 252, 0.82);
  line-height: 1.8;
  font-size: 16px;
}

.mode-select-userbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(226, 232, 240, 0.18);
  white-space: nowrap;
  backdrop-filter: blur(12px);
}

.mode-select-metrics {
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-width: 500px;
}

.mode-select-metrics div {
  padding: 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(226, 232, 240, 0.14);
}

.mode-select-metrics strong,
.mode-select-metrics span {
  display: block;
}

.mode-select-metrics strong {
  font-size: 22px;
}

.mode-select-metrics span {
  margin-top: 4px;
  color: rgba(226, 232, 240, 0.72);
  font-size: 13px;
}

.mode-select-logout,
.mode-select-admin-link {
  border: none;
  border-radius: 6px;
  padding: 9px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease;
}

.mode-select-logout {
  color: #fff;
  background: #dc2626;
}

.mode-select-admin-link {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.12);
}

.mode-select-logout:hover,
.mode-select-admin-link:hover,
.mode-card:hover {
  transform: translateY(-3px);
}

.mode-select-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.mode-card {
  position: relative;
  overflow: hidden;
  min-height: 520px;
  padding: 0;
  display: flex;
  flex-direction: column;
  text-align: left;
  color: inherit;
  border: 1px solid rgba(226, 232, 240, 0.2);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  box-shadow: 0 18px 50px rgba(2, 6, 23, 0.28);
}

.mode-card:hover {
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 22px 60px rgba(2, 6, 23, 0.42);
}

.mode-card-media {
  position: relative;
  min-height: 270px;
  display: block;
  overflow: hidden;
  background: linear-gradient(rgba(14, 116, 144, 0.08), rgba(15, 23, 42, 0.52)), url('/images/coastal.jpg') center / cover no-repeat;
}

.mode-card-2d .mode-card-media {
  filter: saturate(1.05) contrast(1.02);
}

.mode-card-3d .mode-card-media {
  transform-style: preserve-3d;
  background-position: 58% 50%;
  filter: saturate(1.08) contrast(1.08);
}

.mode-card-body {
  flex: 1;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
}

.mode-card-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-size: 22px;
  color: #0f172a;
  background: #f8fafc;
}

.mode-card-copy strong {
  display: block;
  font-size: 30px;
}

.mode-card-copy span {
  display: block;
  margin: 12px 0 0;
  line-height: 1.7;
  color: rgba(226, 232, 240, 0.82);
}

.mode-card-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 11px 14px;
  border-radius: 6px;
  color: #0f172a;
  background: #f8fafc;
  font-weight: 700;
}

.mode-card-mapline,
.mode-card-ridge,
.mode-card-pin {
  position: absolute;
  display: block;
}

.mode-card-mapline {
  height: 2px;
  background: rgba(248, 250, 252, 0.78);
  box-shadow: 0 0 12px rgba(14, 165, 233, 0.72);
  transform-origin: left center;
}

.mode-card-mapline-a {
  width: 76%;
  left: 11%;
  top: 42%;
  transform: rotate(-13deg);
}

.mode-card-mapline-b {
  width: 58%;
  left: 22%;
  top: 62%;
  transform: rotate(15deg);
}

.mode-card-pin {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f97316;
  border: 3px solid #fff;
  box-shadow: 0 0 18px rgba(249, 115, 22, 0.8);
}

.mode-card-pin-a {
  left: 31%;
  top: 36%;
}

.mode-card-pin-b {
  right: 22%;
  bottom: 28%;
}

.mode-card-ridge {
  left: 6%;
  width: 88%;
  height: 72px;
  border-radius: 50%;
  border-top: 2px solid rgba(248, 250, 252, 0.76);
  transform: perspective(380px) rotateX(62deg);
}

.mode-card-ridge-a {
  bottom: 22px;
}

.mode-card-ridge-b {
  bottom: 70px;
  opacity: 0.75;
}

.mode-card-ridge-c {
  bottom: 118px;
  opacity: 0.52;
}

@media (max-width: 1020px) {
  .mode-select-shell {
    grid-template-columns: 1fr;
    margin: 0 auto;
  }

  .mode-select-intro {
    padding-bottom: 0;
  }

  .mode-select-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .mode-select-page {
    padding: 16px;
    gap: 22px;
  }

  .mode-select-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .mode-select-userbar {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .mode-select-grid,
  .mode-select-metrics {
    grid-template-columns: 1fr;
  }

  .mode-card {
    min-height: 430px;
  }

  .mode-card-media {
    min-height: 210px;
  }
}
</style>
