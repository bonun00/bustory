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
          { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
          { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
          { "src": "icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable any" },
          { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          // 1) 정적 시간표(JSON, public/ 하위) - 거의 안 바뀌므로 CacheFirst
          {
            urlPattern: ({url}) =>
                url.origin === self.location.origin &&
                (url.pathname.startsWith('/data/') || url.pathname.endsWith('.json')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bus-static-json',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30일
              cacheableResponse: { statuses: [0, 200] },
              purgeOnQuotaError: true,
            },
          },

          // 2) 실시간 버스 API(백엔드 경유) - 최신 우선, 오프라인 시 마지막 응답 사용
          {
            urlPattern: ({url, request}) =>
                request.method === 'GET' &&
                url.origin === self.location.origin &&
                url.pathname === '/bus',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-bus-live',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 }, // 5분
              cacheableResponse: { statuses: [0, 200] },
              purgeOnQuotaError: true,
            },
          },

          // 3) Kakao Maps SDK(JS)
          {
            urlPattern: ({url}) => url.hostname === 'dapi.kakao.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kakao-sdk',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7일
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // 4) Kakao 지도 타일(이미지) - 빠른 응답(SWR)
          {
            urlPattern: ({url}) =>
                /(^https:\/\/t\d\.daumcdn\.net)|(^https:\/\/map\d?\.daumcdn\.net)/.test(url.href),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kakao-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
              purgeOnQuotaError: true,
            },
          },

          // 5) 네이버 애널리틱스 - 캐시 X
          {
            urlPattern: ({url}) => url.hostname === 'wcs.naver.net',
            handler: 'NetworkOnly',
          },
        ],
      }
    })
  ],
  server: {
    proxy: {
      '/bus': 'http://localhost:8080',
    },
  },
})