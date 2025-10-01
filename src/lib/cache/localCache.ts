// ===================================================
// 📁 Archivo: localCache.ts
// 📌 Ubicación: src/lib/cache/localCache.ts
// 🔧 Descripción: Sistema de cache local con Map y TTL de 5 minutos
// 🧠 Uso: Cache para datos estáticos (catálogos, usuarios, proyectos)
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import React from 'react'

/**
 * 🎯 Interface para entrada de cache
 */
interface CacheEntry<T> {
  /** Datos almacenados */
  data: T
  /** Timestamp de cuando expira */
  expiresAt: number
  /** Timestamp de cuando se creó */
  createdAt: number
}

/**
 * 🎯 Interface para configuración de cache
 */
export interface CacheConfig {
  /** TTL en milisegundos (default: 5 minutos) */
  ttl?: number
  /** Máximo número de entradas (default: 1000) */
  maxEntries?: number
  /** Habilitar logs de debug */
  debug?: boolean
}

/**
 * 🎯 Interface para estadísticas de cache
 */
export interface CacheStats {
  /** Número total de entradas */
  totalEntries: number
  /** Número de hits */
  hits: number
  /** Número de misses */
  misses: number
  /** Ratio de hit (hits / (hits + misses)) */
  hitRatio: number
  /** Entradas expiradas limpiadas */
  expiredCleaned: number
}

/**
 * 🚀 Clase para manejo de cache local con TTL
 */
export class LocalCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private stats = {
    hits: 0,
    misses: 0,
    expiredCleaned: 0
  }
  
  private readonly ttl: number
  private readonly maxEntries: number
  private readonly debug: boolean
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: CacheConfig = {}) {
    this.ttl = config.ttl ?? 5 * 60 * 1000 // ✅ 5 minutos por defecto
    this.maxEntries = config.maxEntries ?? 1000
    this.debug = config.debug ?? false
    
    // 🔄 Iniciar limpieza automática cada minuto
    this.startCleanupInterval()
    
    if (this.debug) {
      console.log('🚀 LocalCache initialized:', {
        ttl: this.ttl,
        maxEntries: this.maxEntries
      })
    }
  }

  /**
   * 📥 Obtener valor del cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      if (this.debug) console.log('❌ Cache MISS:', key)
      return null
    }
    
    // 🕐 Verificar si ha expirado
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.expiredCleaned++
      if (this.debug) console.log('⏰ Cache EXPIRED:', key)
      return null
    }
    
    this.stats.hits++
    if (this.debug) console.log('✅ Cache HIT:', key)
    return entry.data
  }

  /**
   * 📤 Almacenar valor en cache
   */
  set(key: string, data: T, customTtl?: number): void {
    const now = Date.now()
    const ttlToUse = customTtl ?? this.ttl
    
    // 🧹 Limpiar cache si está lleno
    if (this.cache.size >= this.maxEntries) {
      this.cleanup()
      
      // 🚨 Si sigue lleno después de limpiar, eliminar entradas más antiguas
      if (this.cache.size >= this.maxEntries) {
        this.evictOldest()
      }
    }
    
    const entry: CacheEntry<T> = {
      data,
      expiresAt: now + ttlToUse,
      createdAt: now
    }
    
    this.cache.set(key, entry)
    
    if (this.debug) {
      console.log('💾 Cache SET:', key, {
        ttl: ttlToUse,
        expiresAt: new Date(entry.expiresAt).toISOString()
      })
    }
  }

  /**
   * 🗑️ Eliminar entrada específica
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (this.debug && deleted) console.log('🗑️ Cache DELETE:', key)
    return deleted
  }

  /**
   * 🧹 Limpiar entradas expiradas
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
        this.stats.expiredCleaned++
      }
    }
    
    if (this.debug && cleaned > 0) {
      console.log('🧹 Cache cleanup:', cleaned, 'entries removed')
    }
    
    return cleaned
  }

  /**
   * 🗑️ Eliminar entradas más antiguas (LRU)
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt)
    
    // 🔄 Eliminar 10% de las entradas más antiguas
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1))
    
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i]
      this.cache.delete(key)
    }
    
    if (this.debug) {
      console.log('🗑️ Cache evicted oldest:', toRemove, 'entries')
    }
  }

  /**
   * 🧹 Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, expiredCleaned: 0 }
    if (this.debug) console.log('🧹 Cache cleared')
  }

  /**
   * 📊 Obtener estadísticas del cache
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    return {
      totalEntries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRatio: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      expiredCleaned: this.stats.expiredCleaned
    }
  }

  /**
   * 🔍 Verificar si existe una clave
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // 🕐 Verificar si ha expirado
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.expiredCleaned++
      return false
    }
    
    return true
  }

  /**
   * 📋 Obtener todas las claves válidas (no expiradas)
   */
  keys(): string[] {
    const now = Date.now()
    const validKeys: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key)
      }
    }
    
    return validKeys
  }

  /**
   * 🔄 Iniciar intervalo de limpieza automática
   */
  private startCleanupInterval(): void {
    // 🧹 Limpiar cada minuto
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  /**
   * 🛑 Detener intervalo de limpieza
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
    if (this.debug) console.log('🛑 Cache destroyed')
  }
}

// 🌍 Instancias globales de cache para diferentes tipos de datos
export const catalogoCache = new LocalCache({
  ttl: 5 * 60 * 1000, // ✅ 5 minutos para catálogos
  maxEntries: 500,
  debug: process.env.NODE_ENV === 'development'
})

export const usuariosCache = new LocalCache({
  ttl: 3 * 60 * 1000, // ✅ 3 minutos para usuarios
  maxEntries: 200,
  debug: process.env.NODE_ENV === 'development'
})

export const proyectosCache = new LocalCache({
  ttl: 2 * 60 * 1000, // ✅ 2 minutos para proyectos
  maxEntries: 300,
  debug: process.env.NODE_ENV === 'development'
})

export const generalCache = new LocalCache({
  ttl: 5 * 60 * 1000, // ✅ 5 minutos para datos generales
  maxEntries: 1000,
  debug: process.env.NODE_ENV === 'development'
})

/**
 * 🚀 Función helper para cache con fetch automático
 * 
 * @example
 * ```tsx
 * const data = await getCachedData(
 *   'catalogo-equipos',
 *   () => fetch('/api/catalogo-equipo').then(r => r.json()),
 *   catalogoCache
 * )
 * ```
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: LocalCache<T> = generalCache
): Promise<T> {
  // 🔍 Intentar obtener del cache primero
  const cachedData = cache.get(key)
  if (cachedData) {
    return cachedData
  }

  // 📡 Si no está en cache, hacer fetch
  const result = await fetcher()
  cache.set(key, result)
  return result
}

/**
 * 🔧 Generar clave de cache para listas
 */
export function generateListCacheKey(entity: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  return `${entity}:list:${sortedParams || 'all'}`
}

/**
 * 🔧 Generar clave de cache para entidades
 */
export function generateEntityCacheKey(entity: string, id: string): string {
  return `${entity}:entity:${id}`
}

/**
 * 🔧 Cache con fallback
 */
export async function cacheWithFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {},
  cache: LocalCache<T> = generalCache
): Promise<T> {
  return getCachedData(key, fetcher, cache)
}

/**
 * 🔧 Invalidar cache por patrón
 */
export function invalidateCachePattern(pattern: string, cache: LocalCache = generalCache): void {
  const keys = cache.keys()
  const regex = new RegExp(pattern.replace('*', '.*'))
  
  keys.forEach(key => {
    if (regex.test(key)) {
      cache.delete(key)
    }
  })
}

/**
 * 🔧 Presets de configuración de cache
 */
export const CACHE_PRESETS = {
  STATIC: { ttl: 15 * 60 * 1000 }, // 15 minutos
  DYNAMIC: { ttl: 5 * 60 * 1000 }, // 5 minutos
  VOLATILE: { ttl: 1 * 60 * 1000 }, // 1 minuto
  SESSION: { ttl: 30 * 60 * 1000 } // 30 minutos
} as const

// 🧹 Limpiar todos los caches al cerrar la aplicación
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    catalogoCache.destroy()
    usuariosCache.destroy()
    proyectosCache.destroy()
    generalCache.destroy()
  })
}

export default LocalCache
