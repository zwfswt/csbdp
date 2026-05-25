<template>
  <AdminLayout title="SWOT 数据" description="提供 SWOT 任务简介、典型产品说明和官方下载入口，方便在后台快速了解适用于海洋表面高度、内陆水体和海岸带水文分析的数据来源。">
    <template #actions>
      <a class="admin-home-link" href="https://search.earthdata.nasa.gov/search?q=SWOT" target="_blank" rel="noreferrer noopener">前往官方数据下载</a>
    </template>

    <div class="admin-content-page">
      <section class="admin-panel-card admin-panel-card-wide admin-content-hero">
        <div class="admin-content-hero-copy">
          <div class="admin-section-kicker">Mission</div>
          <h2>SWOT 资料页</h2>
          <p class="admin-panel-text">这一页用于快速了解 SWOT 的任务定位、典型产品和官方下载入口，帮助判断它是否适合当前海岸带场景。</p>
          <p class="admin-panel-text">当前不承担平台内下载、解析或专题图层展示，先保持资料页的清晰入口角色。</p>
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
          <h2>SWOT 是什么</h2>
          <p class="admin-panel-text">
            SWOT 是 Surface Water and Ocean Topography 卫星任务，重点观测海洋表面高度以及河流、湖泊、洪泛区等水体变化。
          </p>
          <p class="admin-panel-text">
            对海岸带业务来说，它更适合做海面高度背景分析、河口和近岸海洋过程研究，以及与现有外业成果进行对照分析。
          </p>
        </section>

        <section class="admin-panel-card admin-content-section">
          <h2>适合本平台的用途</h2>
          <ul class="admin-info-list">
            <li>补充近岸海表高度和波浪背景信息，为岸滩演变、河口交换和近海动力分析提供参考。</li>
            <li>支持河流、湖泊、湿地和洪泛区的水面高程与范围分析，便于构建海岸带水文背景资料。</li>
            <li>与现有水深点、外业考察和无人机成果联动，用于多源水面与地形变化交叉验证。</li>
            <li>为后续建设 SWOT 专题图层、批量导入或数据预处理流程预留官方数据入口。</li>
          </ul>
        </section>

        <section class="admin-panel-card admin-panel-card-wide admin-content-section">
          <h2>数据获取方式</h2>
          <div class="admin-icesat-links">
            <a class="admin-icesat-link-card" href="https://swot.jpl.nasa.gov/" target="_blank" rel="noreferrer noopener">
              <strong>NASA SWOT 官方站</strong>
              <span>查看任务背景、科学目标、应用方向和最新资料。</span>
            </a>
            <a class="admin-icesat-link-card" href="https://swot.jpl.nasa.gov/data/" target="_blank" rel="noreferrer noopener">
              <strong>SWOT 数据入口</strong>
              <span>从任务官网进入数据说明页面，了解产品分类和数据访问方式。</span>
            </a>
            <a class="admin-icesat-link-card" href="https://search.earthdata.nasa.gov/search?q=SWOT" target="_blank" rel="noreferrer noopener">
              <strong>Earthdata Search</strong>
              <span>按 SWOT 关键词、空间范围和时间范围检索官方数据集合。</span>
            </a>
            <a class="admin-icesat-link-card" href="https://podaac.jpl.nasa.gov/SWOT" target="_blank" rel="noreferrer noopener">
              <strong>PO.DAAC 渠道</strong>
              <span>PO.DAAC 是 SWOT 重要分发渠道之一，可作为海洋与水体产品补充入口。</span>
            </a>
          </div>
          <div class="admin-form-note admin-icesat-note">说明：多数 SWOT 官方产品下载需要先注册并登录 NASA Earthdata 账号。当前模块首版仅提供资料介绍与官方下载入口，暂未接入平台内批量导入、解析或专题图层展示流程。</div>
        </section>

        <section class="admin-panel-card admin-panel-card-wide admin-survey-table-card admin-content-section">
          <div class="admin-table-toolbar">
            <div>
              <h2>常见产品清单</h2>
              <p>优先列出与海岸带、海表高度和内陆水体分析关系更紧密的 SWOT 产品。</p>
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
    name: 'L2 KaRIn Low Rate Sea Surface Height',
    summary: '提供 SWOT KaRIn 低速率海表高度、海表高度异常、风速和有效波高等参数。',
    scene: '适合海面高度背景分析、近岸海洋过程研究以及海表变化监测。',
    link: 'https://search.earthdata.nasa.gov/search?q=SWOT%20Level%202%20KaRIn%20Low%20Rate%20Sea%20Surface%20Height',
    linkLabel: '检索 L2 LR SSH',
  },
  {
    name: 'L2 HR PIXC',
    summary: '高分辨率水体像元点云产品，提供水体探测像元的高程、位置和回波等信息。',
    scene: '适合河流、湖泊、湿地和洪泛区精细水体分析，以及后续二次处理。',
    link: 'https://search.earthdata.nasa.gov/search?q=SWOT%20Level%202%20Water%20Mask%20Pixel%20Cloud',
    linkLabel: '检索 L2 HR PIXC',
  },
  {
    name: 'L2 HR Raster',
    summary: '高分辨率水面高程与淹没范围栅格产品，提供固定网格上的水体信息。',
    scene: '适合区域水面高程、淹没范围和洪泛过程分析，便于快速栅格展示。',
    link: 'https://search.earthdata.nasa.gov/search?q=SWOT%20Level%202%20Water%20Mask%20Raster',
    linkLabel: '检索 L2 HR Raster',
  },
]

const overviewItems = [
  {
    label: '核心方向',
    value: '海洋 / 水体',
    detail: '聚焦海表高度和内陆水体高程结构。',
  },
  {
    label: '常看产品',
    value: `${productItems.length} 个`,
    detail: '优先关注 SSH、PIXC 和 Raster。',
  },
  {
    label: '主要入口',
    value: 'Earthdata',
    detail: '官方检索下载通常通过 Earthdata 体系完成。',
  },
  {
    label: '当前定位',
    value: '资料页',
    detail: '先提供任务认知和官方入口，不承接内部处理流程。',
  },
]

onMounted(() => {
  document.title = '海岸带时空水深数据平台 - SWOT 数据'
})
</script>