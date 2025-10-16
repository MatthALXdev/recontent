import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/recontent/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://nexus-recontent-api:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/recontent/, ''),
      }
    }
  }
})
