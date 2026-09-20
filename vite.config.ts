import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        console: resolve(import.meta.dirname, 'index.html'),
        security: resolve(import.meta.dirname, 'security/index.html'),
      },
    },
  },
})
