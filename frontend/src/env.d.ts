declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare module '@cesium-china/cesium-map'

declare module 'shpjs' {
  const shp: (input: string | ArrayBuffer | ArrayBufferView | Record<string, ArrayBuffer | undefined>) => Promise<unknown>
  export default shp
}
