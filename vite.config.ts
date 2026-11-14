import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const isLocalDevelopment = command === 'serve' && mode === 'development'
  const env = isLocalDevelopment ? loadEnv(mode, process.cwd(), '') : {}

  return {
    base: '/',
    plugins: [react()],
    define: isLocalDevelopment
      ? { __TMDB_DEV_API_KEY__: JSON.stringify(env.TMDB_API_KEY ?? '') }
      : {},
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
