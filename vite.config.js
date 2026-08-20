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
      // cookieDomainRewrite rewrites the Set-Cookie domain from linways.com → localhost
      // so the browser actually stores and re-sends session cookies through the proxy.
      '/linways-api': {
        target: 'https://presidencyuniversity.linways.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/linways-api/, ''),
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})
