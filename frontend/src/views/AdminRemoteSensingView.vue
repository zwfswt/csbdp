<template>
  <AdminLayout title="卫星与平台" description="集中介绍 Planet、Sentinel-1、Sentinel-2 以及 Google Earth Engine 的定位、适用场景和官方访问入口，方便在后台快速了解多源遥感数据与云端处理平台。">
    <template #actions>
      <a class="admin-home-link" href="https://browser.dataspace.copernicus.eu/" target="_blank" rel="noreferrer noopener">打开官方数据入口</a>
    </template>

    <div class="admin-content-page">
      <section class="admin-panel-card admin-panel-card-wide admin-content-hero">
        <div class="admin-content-hero-copy">
          <div class="admin-section-kicker">Resources</div>
          <h2>多源遥感资料入口</h2>
          <p class="admin-panel-text">这一页只做两件事：帮你快速区分几类常用遥感资源的定位，并提供最直接的官方访问入口。</p>
          <p class="admin-panel-text">当前不承载下载、入库或专题图层功能，先把资料页做成清楚、稳定、便于回看的后台入口。</p>
        </div>

        <div class="admin-content-meta">
          <article v-for="item in overviewItems" :key="item.label" class="admin-content-meta-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
      </section>

      <main class="admin-content-layout admin-content-grid">

      <section class="admin-panel-card admin-panel-card-wide admin-survey-table-card">
        <div class="admin-table-toolbar">
          <div>
            <h2>主要资源对比</h2>
            <p>先看资源类型、适用场景和访问方式，再决定进入哪一个官方平台。</p>
          </div>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th>资源名称</th>
                <th>类型</th>
                <th>核心特点</th>
                <th>适用场景</th>
                <th>访问方式</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in resourceItems" :key="item.name">
                <td><div class="admin-table-name">{{ item.name }}</div></td>
                <td>{{ item.kind }}</td>
                <td>{{ item.feature }}</td>
                <td>{{ item.scene }}</td>
                <td>
                  <a :href="item.link" target="_blank" rel="noreferrer noopener">{{ item.linkLabel }}</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="admin-panel-card admin-content-section">
        <h2>Planet</h2>
        <p class="admin-panel-text">
          Planet 偏商业高频光学影像，适合对时效要求高的区域监测、岸线动态和工程巡查。
        </p>
        <ul class="admin-info-list">
          <li>适合海岸带高频变化监测、岸线动态识别、工程活动巡查和灾害应急补充观测。</li>
          <li>相较开放数据，优势在于更高时效和商业平台化能力，但通常需要商业账号或授权访问。</li>
          <li>首版后台只提供产品与平台入口，不接入购买、试用或自动下载流程。</li>
        </ul>
        <div class="admin-icesat-links">
          <a class="admin-icesat-link-card" href="https://www.planet.com/" target="_blank" rel="noreferrer noopener">
            <strong>Planet 官网</strong>
            <span>查看平台定位、产品能力和应用案例。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://www.planet.com/products/" target="_blank" rel="noreferrer noopener">
            <strong>Planet 产品总览</strong>
            <span>了解 Planet Monitoring、Tasking、Mosaics、Insights Platform 等产品。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://www.planet.com/account/" target="_blank" rel="noreferrer noopener">
            <strong>Planet 登录入口</strong>
            <span>进入账号系统或已有授权平台。</span>
          </a>
        </div>
      </section>

      <section class="admin-panel-card admin-content-section">
        <h2>Sentinel-1</h2>
        <p class="admin-panel-text">
          Sentinel-1 是免费开放的 SAR 数据，优势是全天时、全天候观测，适合云雨条件下持续监测。
        </p>
        <ul class="admin-info-list">
          <li>适合海岸带洪水、水体边界、近岸地表形变和云雨天气下的持续监测。</li>
          <li>属于免费开放数据，当前主访问平台已转向 Copernicus Data Space Ecosystem。</li>
          <li>对于海岸带业务，可作为光学影像失效时的重要补充数据源。</li>
        </ul>
        <div class="admin-icesat-links">
          <a class="admin-icesat-link-card" href="https://dataspace.copernicus.eu/" target="_blank" rel="noreferrer noopener">
            <strong>Copernicus Data Space</strong>
            <span>Sentinel 主分发平台，提供数据检索、下载和处理服务。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://browser.dataspace.copernicus.eu/" target="_blank" rel="noreferrer noopener">
            <strong>Copernicus Browser</strong>
            <span>直接浏览和下载 Sentinel 数据的网页入口。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://sentinels.copernicus.eu/sentinel-data-access" target="_blank" rel="noreferrer noopener">
            <strong>Sentinel 数据访问说明</strong>
            <span>查看官方数据访问体系说明与迁移信息。</span>
          </a>
        </div>
      </section>

      <section class="admin-panel-card admin-content-section">
        <h2>Sentinel-2</h2>
        <p class="admin-panel-text">
          Sentinel-2 是最常用的开放多光谱光学数据之一，适合岸线、水体和地物变化分析。
        </p>
        <ul class="admin-info-list">
          <li>适合岸线识别、水体提取、海岸带地物分类、时序对比和可视化展示。</li>
          <li>同样属于免费开放数据，主要入口仍是 Copernicus Data Space Ecosystem 和 Copernicus Browser。</li>
          <li>若后续要优先落一条真实接入链路，Sentinel-2 通常是最现实的第一步。</li>
        </ul>
        <div class="admin-icesat-links">
          <a class="admin-icesat-link-card" href="https://dataspace.copernicus.eu/" target="_blank" rel="noreferrer noopener">
            <strong>Copernicus Data Space</strong>
            <span>统一访问 Sentinel-2 数据、服务和分析工具。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://browser.dataspace.copernicus.eu/" target="_blank" rel="noreferrer noopener">
            <strong>Copernicus Browser</strong>
            <span>适合快速检索真彩色、多光谱组合和时序影像。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions" target="_blank" rel="noreferrer noopener">
            <strong>Sentinel 数据集总览</strong>
            <span>查看 Sentinel 各任务的数据集合入口。</span>
          </a>
        </div>
      </section>

      <section class="admin-panel-card admin-panel-card-wide admin-content-section">
        <h2>Google Earth Engine</h2>
        <p class="admin-panel-text">
          Google Earth Engine 是云端地理计算平台，更适合作为多源数据检索、处理和原型验证入口，而不是单纯下载站。
        </p>
        <ul class="admin-info-list">
          <li>适合做 Sentinel、Landsat 等开放数据的快速时序分析、指数计算、区域统计和原型验证。</li>
          <li>适合作为本平台后续算法验证、样例处理和遥感分析方法沉淀的外部入口。</li>
          <li>首版只提供平台介绍和官方入口，不扩展脚本模板、课程目录或账号接入逻辑。</li>
        </ul>
        <div class="admin-icesat-links">
          <a class="admin-icesat-link-card" href="https://earthengine.google.com/" target="_blank" rel="noreferrer noopener">
            <strong>Earth Engine 平台介绍</strong>
            <span>查看 Earth Engine 的平台能力、应用场景和官方说明。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://code.earthengine.google.com/" target="_blank" rel="noreferrer noopener">
            <strong>Code Editor</strong>
            <span>进入 Earth Engine 在线脚本编辑器。</span>
          </a>
          <a class="admin-icesat-link-card" href="https://developers.google.com/earth-engine" target="_blank" rel="noreferrer noopener">
            <strong>Earth Engine 文档</strong>
            <span>查看开发文档、API 说明和平台使用指南。</span>
          </a>
        </div>
      </section>
      </main>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'

type ResourceItem = {
  name: string
  kind: string
  feature: string
  scene: string
  link: string
  linkLabel: string
}

const resourceItems: ResourceItem[] = [
  {
    name: 'Planet',
    kind: '商业高频光学影像平台',
    feature: '近每日覆盖、较高分辨率、平台化产品体系完整。',
    scene: '高频变化监测、岸线动态、工程巡查、事件响应。',
    link: 'https://www.planet.com/products/',
    linkLabel: '查看 Planet 产品',
  },
  {
    name: 'Sentinel-1',
    kind: '免费开放 SAR 数据',
    feature: '全天时全天候、适合云雨条件下持续观测。',
    scene: '洪水、水体边界、地表形变、近岸监测。',
    link: 'https://browser.dataspace.copernicus.eu/',
    linkLabel: '打开 Copernicus Browser',
  },
  {
    name: 'Sentinel-2',
    kind: '免费开放多光谱光学数据',
    feature: '多光谱、可视化友好、生态与水体分析应用广。',
    scene: '岸线、水体、植被、浑浊度和地物分类。',
    link: 'https://dataspace.copernicus.eu/',
    linkLabel: '打开 Copernicus Data Space',
  },
  {
    name: 'Google Earth Engine',
    kind: '云端遥感处理平台',
    feature: '多源数据整合、脚本化分析、云端处理。',
    scene: '时序分析、指数计算、区域统计、快速原型验证。',
    link: 'https://code.earthengine.google.com/',
    linkLabel: '进入 Code Editor',
  },
]

const overviewItems = [
  {
    label: '资料类型',
    value: '4 类',
    detail: '商业光学、开放 SAR、开放多光谱和云端处理平台。',
  },
  {
    label: '开放入口',
    value: '3 类',
    detail: 'Copernicus、Earth Engine 与各自官方站点。',
  },
  {
    label: '当前定位',
    value: '资料页',
    detail: '只做介绍、分流和外部入口，不承担数据处理流程。',
  },
  {
    label: '适用场景',
    value: '监测 / 分析',
    detail: '覆盖海岸带监测、变化识别和快速方法验证。',
  },
]

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - 卫星与平台'
})
</script>