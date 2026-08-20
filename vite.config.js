import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      manifest: false, // Use our existing static manifest
      devOptions: { enabled: true }
    })
  ],

  server: {
    proxy: {
      // During local development, forward /linways-api/* to the university portal.
      // This avoids CORS issues without touching any credentials on any server.
      // In production the app must be served from a CORS-allowed origin or behind a proxy.
      '/linways-api': {
        target: 'https://presidencyuniversity.linways.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/linways-api/, ''),
      },
    },
  },
})
