// ===================================================
// 📁 Archivo: useDebounceFilter.ts
// 📌 Ubicación: src/lib/hooks/useDebounceFilter.ts
// 🔧 Descripción: Hook para debounce de filtros de búsqueda (300ms)
// 🧠 Uso: Optimiza performance evitando múltiples requests durante typing
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { useState, useEffect, useCallback } from 'react'

/**
 * 🎯 Interface para filtros de búsqueda
 */
export interface SearchFilters {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: any // ✅ Permite filtros adicionales específicos
}

/**
 * 🎯 Interface para configuración del hook
 */
export interface UseDebounceFilterConfig {
  /** Delay en milisegundos para el debounce (default: 300ms) */
  delay?: number
  /** Filtros iniciales */
  initialFilters?: SearchFilters
  /** Callback cuando los filtros cambian (después del debounce) */
  onFiltersChange?: (filters: SearchFilters) => void
}

/**
 * 🎯 Interface para el retorno del hook
 */
export interface UseDebounceFilterReturn {
  /** Filtros actuales (inmediatos, sin debounce) */
  filters: SearchFilters
  /** Filtros con debounce aplicado */
  debouncedFilters: SearchFilters
  /** Función para actualizar filtros */
  setFilters: (filters: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => void
  /** Función para actualizar un filtro específico */
  updateFilter: (key: string, value: any) => void
  /** Función para resetear filtros */
  resetFilters: () => void
  /** Indica si hay un debounce en progreso */
  isDebouncing: boolean
}

/**
 * 🚀 Hook para manejar filtros de búsqueda con debounce
 * 
 * @param config - Configuración del hook
 * @returns Objeto con filtros y funciones de control
 * 
 * @example
 * ```tsx
 * const {
 *   filters,
 *   debouncedFilters,
 *   setFilters,
 *   updateFilter,
 *   resetFilters,
 *   isDebouncing
 * } = useDebounceFilter({
 *   delay: 300,
 *   initialFilters: { search: '', page: 1, limit: 10 },
 *   onFiltersChange: (filters) => {
 *     // 📡 Hacer request a la API
 *     fetchData(filters)
 *   }
 * })
 * 
 * // 🔄 Actualizar filtro específico
 * updateFilter('search', 'nuevo valor')
 * 
 * // 🔄 Actualizar múltiples filtros
 * setFilters(prev => ({ ...prev, page: 1, search: 'nuevo' }))
 * ```
 */
export function useDebounceFilter({
  delay = 300,
  initialFilters = {},
  onFiltersChange
}: UseDebounceFilterConfig = {}): UseDebounceFilterReturn {
  // 🎯 Estado para filtros inmediatos
  const [filters, setFiltersState] = useState<SearchFilters>(initialFilters)
  
  // 🎯 Estado para filtros con debounce
  const [debouncedFilters, setDebouncedFilters] = useState<SearchFilters>(initialFilters)
  
  // 🎯 Estado para indicar si hay debounce en progreso
  const [isDebouncing, setIsDebouncing] = useState(false)

  // 🔄 Efecto para aplicar debounce
  useEffect(() => {
    setIsDebouncing(true)
    
    const timeoutId = setTimeout(() => {
      setDebouncedFilters(filters)
      setIsDebouncing(false)
      
      // 📡 Llamar callback si existe
      if (onFiltersChange) {
        onFiltersChange(filters)
      }
    }, delay)

    // 🧹 Cleanup del timeout
    return () => {
      clearTimeout(timeoutId)
      setIsDebouncing(false)
    }
  }, [filters, delay, onFiltersChange])

  // 🎯 Función para actualizar filtros
  const setFilters = useCallback((newFilters: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => {
    if (typeof newFilters === 'function') {
      setFiltersState(prev => newFilters(prev))
    } else {
      setFiltersState(newFilters)
    }
  }, [])

  // 🎯 Función para actualizar un filtro específico
  const updateFilter = useCallback((key: string, value: any) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
      // 🔁 Reset page to 1 when search changes (except when updating page itself)
      ...(key === 'search' && { page: 1 })
    }))
  }, [])

  // 🎯 Función para resetear filtros
  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters)
  }, [initialFilters])

  return {
    filters,
    debouncedFilters,
    setFilters,
    updateFilter,
    resetFilters,
    isDebouncing
  }
}

/**
 * 🚀 Hook simplificado para búsqueda con debounce
 * 
 * @param initialSearch - Valor inicial de búsqueda
 * @param delay - Delay en milisegundos (default: 300ms)
 * @returns Objeto con search, debouncedSearch y setSearch
 * 
 * @example
 * ```tsx
 * const { search, debouncedSearch, setSearch } = useDebounceSearch('', 300)
 * 
 * // 🔄 En el input
 * <input 
 *   value={search} 
 *   onChange={(e) => setSearch(e.target.value)}
 *   placeholder="Buscar..."
 * />
 * 
 * // 📡 Usar debouncedSearch para la API
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchResults(debouncedSearch)
 *   }
 * }, [debouncedSearch])
 * ```
 */
export function useDebounceSearch(initialSearch: string = '', delay: number = 300) {
  const { filters, debouncedFilters, updateFilter } = useDebounceFilter({
    delay,
    initialFilters: { search: initialSearch }
  })

  return {
    search: filters.search || '',
    debouncedSearch: debouncedFilters.search || '',
    setSearch: (value: string) => updateFilter('search', value)
  }
}

export default useDebounceFilter
