import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    API_URL: JSON.stringify('https://lmgo2fuffa.execute-api.ap-northeast-1.amazonaws.com'),
    TWITTER_CLIENT_ID: JSON.stringify('dFdQakVfTUJsZzU1eDdZU1A4U2w6MTpjaQ'),
  },
})
