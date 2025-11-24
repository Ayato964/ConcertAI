import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: '/ConcertAI/',
    server: {
      proxy: {
        '/generate': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
        '/model_info': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
      }
    }
  }
})
