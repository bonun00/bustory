// vite.config.js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 프로덕션 빌드에 localhost 프록시가 섞이지 않도록
// mode가 'development'일 때만 dev 서버 프록시를 활성화합니다.
export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
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
          { src: 'icons/bus-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/bus-icon-512.png', sizes: '512x512', type: 'image/png' },

        ],
      },
      // ← Workbox 설정
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // SPA 네비게이션 폴백에서 /api 요청은 제외 (서비스워커가 html로 응답하지 않도록)
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // 같은 출처의 /data/*.json 은 정적 캐시
          {
            urlPattern: /https?:\/\/[^/]+\/data\/.*\.json$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bus-static-json',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 라이브 버스 API: /api/bus → 네트워크 우선(원하면 NetworkOnly로 교체)
          {
            urlPattern: /https?:\/\/[^/]+\/api\/bus(?:[\/?].*)?$/i,
            handler: 'NetworkFirst',          // 또는 'NetworkOnly'
            options: {
              cacheName: 'api-bus-live',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 5,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Kakao Maps SDK
          {
            urlPattern: /^https?:\/\/dapi\.kakao\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kakao-sdk',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Kakao 타일
          {
            urlPattern: /^https:\/\/(?:t\d\.daumcdn\.net|map\d?\.daumcdn\.net)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kakao-tiles',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 7,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 네이버 애널리틱스는 캐시 X
          {
            urlPattern: /^https?:\/\/wcs\.naver\.net\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],

  // 🔧 개발 서버 프록시: 프로덕션과 동일하게 /api 사용 (개발 모드에서만)
  server: mode === 'development' ? {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/bus -> /bus
      },
    },
  } : undefined,
}))