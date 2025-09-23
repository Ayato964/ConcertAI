import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ConcertAI/',
  server: {
    proxy: {
      '/generate': {
        target: 'https://8d4f2be12ab2.ngrok-free.app',
        changeOrigin: true,
      },
      '/model_info': {
        target: 'https://8d4f2be12ab2.ngrok-free.app',
        changeOrigin: true,
      },
    }
  }
})
