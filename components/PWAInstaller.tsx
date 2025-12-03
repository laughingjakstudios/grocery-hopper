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

    // Handle install prompt (for "Add to Home Screen")
    let deferredPrompt: any

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('[PWA] Install prompt available')

      // You could show a custom install button here
      // For now, we'll let the browser handle it
    })

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed!')
      deferredPrompt = null
    })
  }, [])

  return null // This component doesn't render anything
}
