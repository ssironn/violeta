import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/texlive-api': {
        target: 'https://texlive.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/texlive-api/, ''),
        followRedirects: true,
      },
      '/api': {
        target: process.env.API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
