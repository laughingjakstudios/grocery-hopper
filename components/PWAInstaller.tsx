'use client'

import { useEffect } from 'react'

export function PWAInstaller() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service worker registered:', registration.scope)

          // Check for updates
          registration.update()
        })
        .catch((error) => {
          console.error('[PWA] Service worker registration failed:', error)
        })
    }

    // Let the browser show its own install prompt ("Add to Home Screen").
    // Intercepting beforeinstallprompt with preventDefault() would suppress
    // it unless we build a custom install button.
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed!')
    })
  }, [])

  return null // This component doesn't render anything
}
