import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      manifest: {
        name: 'Bustory',
        short_name: 'Bustory',
        description: '함안/마산 농어촌 버스 시간 안내',
        theme_color: '#0C4D2A',
        background_color: '#A8DFD0',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
        ],
      },
      strategies: 'generateSW',
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          // 1) 정적 JSON (public/data/**)
          {
            urlPattern: /https?:\/\/[^/]+\/data\/.*\.json$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bus-static-json',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
              purgeOnQuotaError: true,
            },
          },
          // 2) 실시간 버스 API - 동일 도메인 /bus
          {
            urlPattern: /https?:\/\/[^/]+\/bus(?:\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-bus-live',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
              purgeOnQuotaError: true,
            },
          },
          // 3) Kakao Maps SDK(JS)
          {
            urlPattern: /^https?:\/\/dapi\.kakao\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kakao-sdk',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 4) Kakao 지도 타일
          {
            urlPattern: /^https:\/\/(?:t\d\.daumcdn\.net|map\d?\.daumcdn\.net)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kakao-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
              purgeOnQuotaError: true,
            },
          },
          // 5) 네이버 애널리틱스
          {
            urlPattern: /^https?:\/\/wcs\.naver\.net\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    })
  ],
  server: {
    proxy: {
      '/bus': 'http://localhost:8080',
    },
  },
})