<template>
  <AdminLayout title="ICESat-2 数据" description="提供 ICESat-2 任务简介、常用产品说明和官方下载入口，方便在后台快速了解可用于近岸地形、水面高程和激光测高分析的数据来源。">
    <template #actions>
      <a class="admin-home-link" href="https://nsidc.org/data/icesat-2/data" target="_blank" rel="noreferrer noopener">前往官方数据下载</a>
    </template>

    <div class="admin-content-page">
      <section class="admin-panel-card admin-panel-card-wide admin-content-hero">
        <div class="admin-content-hero-copy">
          <div class="admin-section-kicker">Mission</div>
          <h2>ICESat-2 资料页</h2>
          <p class="admin-panel-text">这页聚焦任务简介、适用场景、常见产品和官方下载入口，方便快速判断是否值得进一步接入业务流程。</p>
          <p class="admin-panel-text">当前仍保持资料页定位，不接入平台内批量下载、入库或专题图层处理。</p>
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
        <section class="admin-panel-card admin-content-section">
          <h2>ICESat-2 是什么</h2>
          <p class="admin-panel-text">
            ICESat-2 是 NASA 于 2018 年发射的激光测高卫星，核心能力是利用 ATLAS 光子计数激光测高仪获取沿轨高程信息。
          </p>
          <p class="admin-panel-text">
            对海岸带场景，它更适合做近岸地形辅助分析、水面高程参考，以及和现有水深点、断面或外业成果做交叉比对。
          </p>
        </section>

        <section class="admin-panel-card admin-content-section">
          <h2>适合本平台的用途</h2>
          <ul class="admin-info-list">
            <li>补充近岸和浅水区域的高程观测背景，为岸滩演变、潮间带和水边线变化研究提供参考。</li>
            <li>与现有水深点、断面和野外考察点进行联动，辅助判断高程变化与外业观测的一致性。</li>
            <li>为后续建设“卫星激光测高专题图层”或“批量导入分析流程”预留数据来源入口。</li>
            <li>用于快速了解 ATL03、ATL06、ATL08、ATL12 等常见产品是否适合当前业务场景。</li>
          </ul>
        </section>

        <section class="admin-panel-card admin-panel-card-wide admin-content-section">
          <h2>数据获取方式</h2>
          <div class="admin-icesat-links">
            <a class="admin-icesat-link-card" href="https://icesat-2.gsfc.nasa.gov/" target="_blank" rel="noreferrer noopener">
              <strong>NASA ICESat-2 官方站</strong>
              <span>查看任务简介、科学背景、应用案例和培训资料。</span>
            </a>
            <a class="admin-icesat-link-card" href="https://nsidc.org/data/icesat-2" target="_blank" rel="noreferrer noopener">
              <strong>NSIDC ICESat-2 总入口</strong>
              <span>查看产品概览、文档、帮助文章和数据分发页面。</span>
            </a>
            <a class="admin-icesat-link-card" href="https://nsidc.org/data/icesat-2/data" target="_blank" rel="noreferrer noopener">
              <strong>NSIDC 数据下载入口</strong>
              <span>官方数据分发页面，下载前通常需要 Earthdata 账号。</span>
            </a>
            <a class="admin-icesat-link-card" href="https://search.earthdata.nasa.gov/search?q=ICESat-2" target="_blank" rel="noreferrer noopener">
              <strong>Earthdata Search</strong>
              <span>按空间范围、时间范围和产品名筛选 ICESat-2 数据。</span>
            </a>
          </div>
          <div class="admin-form-note admin-icesat-note">说明：大多数官方数据下载需要先注册并登录 NASA Earthdata 账号。当前模块首版仅提供资料介绍与官方下载入口，暂未接入平台内批量下载、入库或地图展示流程。</div>
        </section>

        <section class="admin-panel-card admin-panel-card-wide admin-survey-table-card admin-content-section">
          <div class="admin-table-toolbar">
            <div>
              <h2>常见产品清单</h2>
              <p>优先列出与海岸带、地形和水面分析更相关的常见产品。</p>
            </div>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-data-table">
              <thead>
                <tr>
                  <th>产品</th>
                  <th>主要内容</th>
                  <th>适用场景</th>
                  <th>下载说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in productItems" :key="item.name">
                  <td>
                    <div class="admin-table-name">{{ item.name }}</div>
                  </td>
                  <td>{{ item.summary }}</td>
                  <td>{{ item.scene }}</td>
                  <td>
                    <a :href="item.link" target="_blank" rel="noreferrer noopener">{{ item.linkLabel }}</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'

type ProductItem = {
  name: string
  summary: string
  scene: string
  link: string
  linkLabel: string
}

const productItems: ProductItem[] = [
  {
    name: 'ATL03',
    summary: '光子级高度产品，提供沿轨激光回波光子及基础定位信息。',
    scene: '适合开展精细沿轨分析、浅水地形探索、岸线附近点云筛选和二次处理。',
    link: 'https://nsidc.org/data/atl03',
    linkLabel: '查看 ATL03',
  },
  {
    name: 'ATL06',
    summary: '陆地冰面高程产品，提供沿轨地表高程解算结果。',
    scene: '适合快速获取高程成果，用于区域高程变化参考和多源高程比对。',
    link: 'https://nsidc.org/data/atl06',
    linkLabel: '查看 ATL06',
  },
  {
    name: 'ATL08',
    summary: '陆地与植被高度产品，描述地表与植被冠层结构。',
    scene: '适合研究海岸带植被、湿地或滩涂周边地表覆盖特征。',
    link: 'https://nsidc.org/data/atl08',
    linkLabel: '查看 ATL08',
  },
  {
    name: 'ATL12',
    summary: '海面高度产品，提供海表高度及相关质量信息。',
    scene: '适合海面高度参考、海岸带水位背景分析以及近岸海洋研究。',
    link: 'https://nsidc.org/data/atl12',
    linkLabel: '查看 ATL12',
  },
]

const overviewItems = [
  {
    label: '任务时间',
    value: '2018 至今',
    detail: '当前可作为持续更新的激光测高资料来源。',
  },
  {
    label: '常看产品',
    value: `${productItems.length} 个`,
    detail: '先关注 ATL03、ATL06、ATL08、ATL12。',
  },
  {
    label: '分发平台',
    value: 'NSIDC',
    detail: '官方数据分发与资料查询以 NSIDC 为主。',
  },
  {
    label: '当前定位',
    value: '资料页',
    detail: '用于任务认知和官方入口分流，不承担处理流程。',
  },
]

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - ICESat-2 数据'
})
</script>