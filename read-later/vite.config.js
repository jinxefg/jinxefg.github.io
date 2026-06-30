import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue' // or whatever you're using

export default defineConfig({
  base: '/read-later/',
  plugins: [vue()]
})
