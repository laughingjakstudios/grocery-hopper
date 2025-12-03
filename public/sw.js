// GroceryHopper Service Worker
// Provides offline functionality and PWA features

const CACHE_NAME = 'groceryhopper-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )

  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )

  // Take control immediately
  return self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!request.url.startsWith('http')) {
    return
  }

  // Skip API calls (let them fail naturally to show user feedback)
  if (request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        // Fetch fresh version in background
        fetch(request).then((freshResponse) => {
          if (freshResponse && freshResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, freshResponse)
            })
          }
        }).catch(() => {
          // Offline - do nothing
        })

        return cachedResponse
      }

      // No cache - fetch from network
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }

        return response
      }).catch(() => {
        // Offline and no cache - show offline page if we have one
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        })
      })
    })
  )
})

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
