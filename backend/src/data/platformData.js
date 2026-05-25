const bcrypt = require('bcryptjs')

const demoUser = {
  username: 'admin',
  displayName: 'admin',
  passwordHash: bcrypt.hashSync('123456', 10),
}

const studyArea = [
  [37.52, 118.85],
  [37.52, 119.55],
  [38.02, 119.55],
  [38.02, 118.85],
]

const depthData = [
  { id: 'D001', lat: 37.62, lng: 119.03, depth: 2.4 },
  { id: 'D002', lat: 37.68, lng: 119.08, depth: 3.8 },
  { id: 'D003', lat: 37.74, lng: 119.16, depth: 5.2 },
  { id: 'D004', lat: 37.81, lng: 119.28, depth: 7.1 },
  { id: 'D005', lat: 37.88, lng: 119.36, depth: 9.6 },
  { id: 'D006', lat: 37.93, lng: 119.44, depth: 12.5 },
]

const bookmarks = [
  { name: '北京', lat: 39.9, lng: 116.39, zoom: 10 },
  { name: '巴黎', lat: 48.85, lng: 2.35, zoom: 10 },
  { name: '纽约', lat: 40.71, lng: -74, zoom: 10 },
  { name: '良平', lat: 35.46, lng: 108.08, zoom: 10 },
  { name: '黄河三角洲', lat: 37.73, lng: 119.15, zoom: 10 },
  { name: '黟县', lat: 29.93, lng: 117.92, zoom: 10 },
  { name: '营口', lat: 40.22, lng: 122.07, zoom: 10 },
  { name: '秦皇岛', lat: 39.784, lng: 119.445, zoom: 10 },
  { name: '葫芦岛', lat: 40.19, lng: 120.44, zoom: 10 },
  { name: '大辽河口', lat: 40.86, lng: 121.8, zoom: 10 },
  { name: '贝壳堤', lat: 38.18, lng: 118.131, zoom: 10 },
  { name: '一千二', lat: 38.16, lng: 118.81, zoom: 10 },
  { name: '龙口', lat: 37.35, lng: 120.7, zoom: 10 },
  { name: '栖霞水库', lat: 37.35, lng: 120.85, zoom: 10 },
  { name: '牟平海岸带', lat: 37.457, lng: 121.709, zoom: 10 },
  { name: '威海', lat: 37.431, lng: 122.177, zoom: 10 },
  { name: '桑沟湾', lat: 37.095, lng: 122.567, zoom: 10 },
  { name: '海阳', lat: 36.618, lng: 121.119, zoom: 10 },
  { name: '胶州湾', lat: 36.126, lng: 120.249, zoom: 10 },
  { name: '苏北浅滩', lat: 32.757, lng: 121.223, zoom: 10 },
  { name: '崇明岛', lat: 31.51, lng: 122.001, zoom: 10 },
  { name: '杭州湾', lat: 30.463, lng: 121.765, zoom: 10 },
  { name: '崖门水道', lat: 22.105, lng: 113.098, zoom: 10 },
  { name: '南海', lat: 16.28, lng: 112.165, zoom: 6 },
  { name: '伊朗', lat: 32.4279, lng: 53.688, zoom: 6 },
]

const layers = [
  { name: '研究区范围', type: 'polygon', visible: true, opacity: 1 },
  { name: '水深测点', type: 'group', visible: true, opacity: 1 },
  { name: '无人船测深航线', type: 'polyline', visible: true, opacity: 1 },
  { name: '野外考察', type: 'group', visible: false, opacity: 1 },
  { name: '监测位置', type: 'group', visible: true, opacity: 1 },
  { name: '绘制图层', type: 'group', visible: true, opacity: 1 },
  { name: 'Navionics_Marine_Chats', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.85, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/Navionics_Marine_Chats/MapServer' },
  { name: 'RS_Navionics', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.85, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/RS_Navionics/MapServer' },
  { name: '黄河流域范围', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.85, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/%E9%BB%84%E6%B2%B3%E6%B5%81%E5%9F%9F%E8%8C%83%E5%9B%B4/MapServer' },
  { name: '黄河口国家公园', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.85, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/Huanghe_Estuary_National_Park/MapServer' },
  { name: '中国海岸线', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/Coastline_of_China/MapServer' },
  { name: '黄三角水深', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/YRD_Depth/MapServer' },
  { name: '黄河口等深线', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/Sea_Depth_Line/MapServer' },
  { name: '土地利用', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.85, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/LUCC/MapServer' },
  { name: 'ATL24', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/ATL24/MapServer' },
  { name: 'YRD_DEM', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/YRD_DEM/MapServer' },
  { name: 'Water_Depth', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/Water_Depth/MapServer' },
  { name: 'YRD_2', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/YRD_2/MapServer' },
  { name: 'BoHai_Z13', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/BoHai_Z13/MapServer' },
  { name: 'BoHai_Z14', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/BoHai_Z14/MapServer' },
  { name: 'BoHai_Z15', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/BoHai_Z15/MapServer' },
  { name: 'SouthChinaSea_Z14', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/SouthChinaSea_Z14/MapServer' },
  { name: 'EastChinaSea_Z14', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/EastChinaSea_Z14/MapServer' },
  { name: 'YellowSea_Z14', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/YellowSea_Z14/MapServer' },
  { name: '验潮站', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/Tide_Station/MapServer' },
  { name: 'S2_YRD_NDVI', type: 'ArcGIS Server MapServer', visible: false, opacity: 0.9, isArcGISServer: true, url: 'https://124.16.170.87:6443/arcgis/rest/services/WebGIS/S2_YRD_NDVI_20250604/MapServer' },
]

module.exports = {
  demoUser,
  studyArea,
  depthData,
  bookmarks,
  layers,
}
