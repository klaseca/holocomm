import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vueNamedExport from 'unplugin-vue-named-export/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueNamedExport()],
  resolve: {
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
      },
    },
  },
})
