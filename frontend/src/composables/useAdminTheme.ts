import { onMounted, ref, watch } from 'vue'

export type AdminTheme = 'light' | 'dark'

const ADMIN_THEME_KEY = 'csbdp-admin-theme'

function readStoredTheme(): AdminTheme {
  const value = localStorage.getItem(ADMIN_THEME_KEY)
  return value === 'dark' ? 'dark' : 'light'
}

function applyAdminTheme(theme: AdminTheme) {
  document.body.dataset.adminTheme = theme
}

export function useAdminTheme() {
  const theme = ref<AdminTheme>('light')

  onMounted(() => {
    theme.value = readStoredTheme()
    applyAdminTheme(theme.value)
  })

  watch(theme, (value) => {
    localStorage.setItem(ADMIN_THEME_KEY, value)
    applyAdminTheme(value)
  })

  return {
    theme,
    setTheme(value: AdminTheme) {
      theme.value = value
    },
    toggleTheme() {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
    },
  }
}