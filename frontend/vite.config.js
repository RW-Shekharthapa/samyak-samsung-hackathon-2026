import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: true,
    proxy: { '/proxy/5173/api': { target: 'http://localhost:8080', rewrite: (p) => p.replace('/proxy/5173', '') } },
  },
  plugins: [react()],
})
