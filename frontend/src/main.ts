import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import L from 'leaflet'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'viewerjs/dist/viewer.css'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './original.css'

delete (L.Icon.Default.prototype as L.Icon.DefaultPrototypeParams & { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2xUrl,
	iconUrl: markerIconUrl,
	shadowUrl: markerShadowUrl,
})

const app = createApp(App)

for (const [iconName, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(iconName, component)
}

app.use(ElementPlus)
app.use(router)
app.mount('#app')
