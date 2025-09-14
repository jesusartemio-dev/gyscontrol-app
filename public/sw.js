/**
 * 🚀 Service Worker para GYS App
 * 
 * Implementa cache de assets y API responses para mejorar performance.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

// 📊 Configuración del cache
const CACHE_NAME = 'gys-app-v1';
const STATIC_CACHE_NAME = 'gys-static-v1';
const API_CACHE_NAME = 'gys-api-v1';
const IMAGE_CACHE_NAME = 'gys-images-v1';

// 🔧 URLs para pre-cache (assets críticos)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/',
];

// 📡 Patrones de cache
const CACHE_STRATEGIES = {
  // 🖼️ Imágenes - Cache First con fallback
  images: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i,
  
  // 📊 API - Network First con cache fallback
  api: /^\/api\//,
  
  // 🎨 Assets estáticos - Cache First
  static: /\/_next\/static\//,
  
  // 📄 Páginas - Stale While Revalidate
  pages: /^\/(proyectos|comercial|logistica|admin|catalogo)/,
};

// ⏱️ Tiempos de expiración del cache
const CACHE_EXPIRATION = {
  images: 30 * 24 * 60 * 60 * 1000, // 30 días
  api: 5 * 60 * 1000, // 5 minutos
  static: 7 * 24 * 60 * 60 * 1000, // 7 días
  pages: 24 * 60 * 60 * 1000, // 1 día
};

// ✅ Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 SW: Instalando Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 SW: Pre-caching assets críticos');
        return cache.addAll(PRECACHE_URLS.filter(url => url));
      })
      .then(() => {
        console.log('✅ SW: Service Worker instalado correctamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ SW: Error durante instalación:', error);
      })
  );
});

// 🔄 Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Activando Service Worker');
  
  event.waitUntil(
    Promise.all([
      // 🧹 Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return ![
                CACHE_NAME,
                STATIC_CACHE_NAME,
                API_CACHE_NAME,
                IMAGE_CACHE_NAME
              ].includes(cacheName);
            })
            .map((cacheName) => {
              console.log('🗑️ SW: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // 📡 Tomar control de todos los clientes
      self.clients.claim()
    ])
      .then(() => {
        console.log('✅ SW: Service Worker activado correctamente');
      })
      .catch((error) => {
        console.error('❌ SW: Error durante activación:', error);
      })
  );
});

// 📡 Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 🔍 Solo procesar requests del mismo origen
  if (url.origin !== location.origin) {
    return;
  }
  
  // 🖼️ Estrategia para imágenes - Cache First
  if (CACHE_STRATEGIES.images.test(url.pathname)) {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // 📊 Estrategia para API - Network First
  if (CACHE_STRATEGIES.api.test(url.pathname)) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // 🎨 Estrategia para assets estáticos - Cache First
  if (CACHE_STRATEGIES.static.test(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // 📄 Estrategia para páginas - Stale While Revalidate
  if (CACHE_STRATEGIES.pages.test(url.pathname)) {
    event.respondWith(handlePageRequest(request));
    return;
  }
});

// 🖼️ Manejar requests de imágenes - Cache First
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_EXPIRATION.images)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('🖼️ SW: Error cargando imagen:', error);
    
    // 🔄 Fallback a cache si hay error de red
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 📄 Fallback a imagen placeholder
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Imagen no disponible</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// 📊 Manejar requests de API - Network First
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('📊 SW: Error en API, usando cache:', error);
    
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_EXPIRATION.api)) {
      // 🏷️ Marcar como respuesta desde cache
      const response = cachedResponse.clone();
      response.headers.set('X-Cache-Status', 'HIT');
      return response;
    }
    
    throw error;
  }
}

// 🎨 Manejar requests de assets estáticos - Cache First
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('🎨 SW: Error cargando asset estático:', error);
    throw error;
  }
}

// 📄 Manejar requests de páginas - Stale While Revalidate
async function handlePageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // 🔄 Fetch en background para actualizar cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.warn('📄 SW: Error actualizando página:', error);
      return null;
    });
  
  // ✅ Devolver cache inmediatamente si existe
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // 🔄 Si no hay cache, esperar por la red
  return fetchPromise;
}

// ⏱️ Verificar si una respuesta ha expirado
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const responseTime = new Date(dateHeader).getTime();
  const now = Date.now();
  
  return (now - responseTime) > maxAge;
}

// 📊 Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then((status) => {
      event.ports[0].postMessage(status);
    });
  }
});

// 📊 Obtener estado del cache
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

console.log('🚀 SW: Service Worker cargado correctamente');