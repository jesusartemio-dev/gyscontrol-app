// ===================================================
// 📁 Archivo: useLazyLoading.ts
// 📌 Ubicación: src/hooks/useLazyLoading.ts
// 🔧 Descripción: Hooks personalizados para lazy loading y paginación infinita
//
// 🧠 Uso: Optimizar carga de datos en listas grandes
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

// 📋 Interfaces
interface LazyLoadingOptions {
  pageSize?: number
  threshold?: number // Porcentaje de scroll para cargar más (0-1)
  debounceMs?: number // Debounce para evitar múltiples llamadas
  retryAttempts?: number
  retryDelay?: number
}

interface PaginatedResponse<T> {
  items: T[]
  hasMore: boolean
  total?: number
  page?: number
  totalPages?: number
}

interface LazyLoadingState<T> {
  items: T[]
  loading: boolean
  hasMore: boolean
  error: string | null
  page: number
  total: number
  isInitialLoad: boolean
}

// 🎯 Hook principal para lazy loading
export function useLazyLoading<T>(
  fetchFunction: (page: number, pageSize: number, filters?: any) => Promise<PaginatedResponse<T>>,
  options: LazyLoadingOptions = {},
  filters?: any
) {
  const {
    pageSize = 20,
    threshold = 0.8,
    debounceMs = 300,
    retryAttempts = 3,
    retryDelay = 1000
  } = options

  const [state, setState] = useState<LazyLoadingState<T>>({
    items: [],
    loading: false,
    hasMore: true,
    error: null,
    page: 1,
    total: 0,
    isInitialLoad: true
  })

  const retryCount = useRef(0)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  // 🔄 Función para cargar datos
  const loadData = useCallback(async (page: number, isReset = false) => {
    if (state.loading && !isReset) return

    // Cancelar petición anterior si existe
    if (abortController.current) {
      abortController.current.abort()
    }
    abortController.current = new AbortController()

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(isReset && { items: [], page: 1, hasMore: true, total: 0 })
      }))

      const response = await fetchFunction(page, pageSize, filters)
      
      setState(prev => ({
        ...prev,
        items: isReset ? response.items : [...prev.items, ...response.items],
        hasMore: response.hasMore,
        total: response.total || prev.total,
        page: page,
        loading: false,
        isInitialLoad: false
      }))

      retryCount.current = 0
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Petición cancelada, no hacer nada
      }

      const errorMessage = error instanceof Error ? error.message : 'Error al cargar datos'
      
      // Reintentar si no se han agotado los intentos
      if (retryCount.current < retryAttempts) {
        retryCount.current++
        setTimeout(() => loadData(page, isReset), retryDelay * retryCount.current)
        return
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isInitialLoad: false
      }))

      toast.error(`Error al cargar datos: ${errorMessage}`)
    }
  }, [fetchFunction, pageSize, filters, retryAttempts, retryDelay])

  // 🔄 Cargar más elementos
  const loadMore = useCallback(() => {
    if (state.loading || !state.hasMore) return

    // Debounce para evitar múltiples llamadas
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      loadData(state.page + 1)
    }, debounceMs)
  }, [loadData, state.loading, state.hasMore, state.page, debounceMs])

  // 🔄 Resetear y recargar
  const reset = useCallback(() => {
    retryCount.current = 0
    loadData(1, true)
  }, [loadData])

  // 🔄 Refrescar datos
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, items: [], page: 1, hasMore: true, total: 0 }))
    loadData(1, true)
  }, [loadData])

  // 🎯 Cargar datos iniciales
  useEffect(() => {
    if (state.isInitialLoad) {
      loadData(1, true)
    }
  }, []) // Solo en el primer render

  // 🎯 Recargar cuando cambien los filtros
  useEffect(() => {
    if (!state.isInitialLoad) {
      retryCount.current = 0
      loadData(1, true)
    }
  }, [filters, loadData, state.isInitialLoad])

  // 🧹 Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  return {
    ...state,
    loadMore,
    reset,
    refresh,
    retry: () => loadData(state.page, false)
  }
}

// 🎯 Hook para detectar scroll infinito
export function useInfiniteScroll(
  callback: () => void,
  options: {
    threshold?: number
    rootMargin?: string
    enabled?: boolean
  } = {}
) {
  const { threshold = 0.8, rootMargin = '100px', enabled = true } = options
  const targetRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!enabled) return

    const target = targetRef.current
    if (!target) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          callback()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    observerRef.current.observe(target)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback, threshold, rootMargin, enabled])

  return targetRef
}

// 🎯 Hook para lazy loading de imágenes
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          // Precargar imagen
          const imageLoader = new Image()
          imageLoader.onload = () => {
            setImageSrc(src)
            setIsLoaded(true)
            setIsError(false)
          }
          imageLoader.onerror = () => {
            setIsError(true)
            setIsLoaded(false)
          }
          imageLoader.src = src

          observer.unobserve(img)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(img)

    return () => observer.disconnect()
  }, [src])

  return { imageSrc, isLoaded, isError, imgRef }
}

// 🎯 Hook para memoización inteligente con TTL
export function useSmartMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  ttl: number = 5 * 60 * 1000 // 5 minutos por defecto
) {
  const cache = useRef<{
    value: T
    timestamp: number
    deps: React.DependencyList
  } | null>(null)

  const now = Date.now()
  
  // Verificar si el cache es válido
  const isCacheValid = cache.current &&
    (now - cache.current.timestamp < ttl) &&
    cache.current.deps.length === deps.length &&
    cache.current.deps.every((dep, index) => dep === deps[index])

  if (!isCacheValid) {
    cache.current = {
      value: factory(),
      timestamp: now,
      deps: [...deps]
    }
  }

  return cache.current!.value
}

// 🎯 Hook para debounce de valores
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// 🎯 Hook para throttle de funciones
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      return callback(...args)
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now()
        callback(...args)
      }, delay - (now - lastCall.current))
    }
  }, [callback, delay]) as T
}

// 📊 Hook para métricas de rendimiento
export function usePerformanceMetrics(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef<number | null>(null)

  useEffect(() => {
    renderCount.current++
    startTime.current = performance.now()

    return () => {
      if (startTime.current) {
        const renderTime = performance.now() - startTime.current
        
        // Solo log en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 ${componentName} - Render #${renderCount.current}: ${renderTime.toFixed(2)}ms`)
        }
      }
    }
  })

  const logMetric = useCallback((metricName: string, value: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${componentName} - ${metricName}: ${value}`)
    }
  }, [componentName])

  return { renderCount: renderCount.current, logMetric }
}

// 🎯 Tipos exportados
export type {
  LazyLoadingOptions,
  PaginatedResponse,
  LazyLoadingState
}
