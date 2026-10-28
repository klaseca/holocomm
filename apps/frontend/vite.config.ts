import { fileURLToPath, URL } from 'node:url'

import svgSpritemap from '@spiriit/vite-plugin-svg-spritemap'
import vue from '@vitejs/plugin-vue'
import vueNamedExport from 'unplugin-vue-named-export/vite'
import { defineConfig, normalizePath } from 'vite'

import { iconNames } from './src/ui/icons.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svgSpritemap(
      iconNames.map(name => normalizePath(fileURLToPath(
        new URL(`./node_modules/lucide-static/icons/${name}.svg`, import.meta.url),
      ))),
      {
        prefix: 'icon-',
        output: { use: false, view: false },
      },
    ),
    vue(),
    vueNamedExport(),
  ],
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
