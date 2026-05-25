<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive :include="keepAliveNames">
      <component :is="Component" v-if="route.meta.keepAlive" :key="route.name" />
    </KeepAlive>
    <component :is="Component" v-if="!route.meta.keepAlive" :key="route.fullPath" />
  </RouterView>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getStoredToken } from './services/api'

const route = useRoute()

const keepAliveNames = computed(() => {
  route.fullPath
  return getStoredToken() ? ['DashboardView'] : []
})
</script>