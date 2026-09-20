import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    sourcemap: true,
  },
})
