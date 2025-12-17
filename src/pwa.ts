// src/pwa.js
import { registerSW } from 'virtual:pwa-register'

export const setupPWA = () => {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('새 버전이 있어요. 지금 새로고침할까요?')) {
        updateSW(true)
      }
    },
    onOfflineReady() {
      console.log('오프라인 준비 완료')
    }
  })
}


