// ===================================================
// 📁 Archivo: useAdvancedFilters.ts
// 📌 Ubicación: src/hooks/useAdvancedFilters.ts
// 🔧 Descripción: Hook genérico para manejo avanzado de filtros con persistencia y debounce
//
// 🧠 Uso: Gestión inteligente de filtros para cualquier entidad del sistema
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDebounce } from './usePerformanceMetrics'
// ✅ Referencias de aprovisionamiento eliminadas

// 🎯 Configuración de filtros
interface FilterConfig {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'number' | 'boolean' | 'range'
  options?: { value: string; label: string }[]
  defaultValue?: any
  debounceMs?: number
  persistent?: boolean // Si debe persistir en localStorage
}

// 🎯 Estado de filtros
interface FilterState {
  [key: string]: any
}

// 🎯 Opciones del hook
interface UseAdvancedFiltersOptions {
  storageKey?: string // Clave para localStorage
  debounceMs?: number // Debounce global por defecto
  onFiltersChange?: (filters: any) => void
  initialFilters?: any
  enablePersistence?: boolean
  filterConfigs?: FilterConfig[] // Configuraciones de filtros específicas
}

// ✅ Configuraciones de aprovisionamiento eliminadas - ahora es un hook genérico

// 🚀 Hook principal para filtros avanzados
export function useAdvancedFilters({
  storageKey = 'generic_filters',
  debounceMs = 300,
  onFiltersChange,
  initialFilters = {},
  enablePersistence = true,
  filterConfigs = []
}: UseAdvancedFiltersOptions = {}) {
  
  // 🏗️ Inicializar estado desde localStorage o valores por defecto
  const initializeFilters = useCallback((): FilterState => {
    const defaultFilters: FilterState = {}
    
    // Aplicar valores por defecto de configuración
    filterConfigs.forEach(config => {
      if (config.defaultValue !== undefined) {
        defaultFilters[config.key] = config.defaultValue
      }
    })
    
    // Aplicar filtros iniciales
    Object.assign(defaultFilters, initialFilters)
    
    // Cargar desde localStorage si está habilitado
    if (enablePersistence && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedFilters = JSON.parse(stored)
          Object.assign(defaultFilters, parsedFilters)
        }
      } catch (error) {
        console.warn('Error al cargar filtros desde localStorage:', error)
      }
    }
    
    return defaultFilters
  }, [storageKey, initialFilters, enablePersistence])
  
  const [filters, setFilters] = useState<FilterState>(initializeFilters)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  
  // 🔄 Debounce de filtros
  const debouncedFilters = useDebounce(filters, debounceMs)
  
  // 💾 Persistir filtros en localStorage
  useEffect(() => {
    if (enablePersistence && typeof window !== 'undefined') {
      try {
        // Solo persistir filtros que están marcados como persistentes
        const persistentFilters: FilterState = {}
        filterConfigs.forEach(config => {
          if (config.persistent && filters[config.key] !== undefined) {
            persistentFilters[config.key] = filters[config.key]
          }
        })
        
        localStorage.setItem(storageKey, JSON.stringify(persistentFilters))
      } catch (error) {
        console.warn('Error al guardar filtros en localStorage:', error)
      }
    }
  }, [filters, storageKey, enablePersistence])
  
  // 📊 Contar filtros activos
  useEffect(() => {
    const count = Object.entries(filters).reduce((acc, [key, value]) => {
      const config = filterConfigs.find(c => c.key === key)
      if (!config) return acc
      
      // Verificar si el filtro está activo (no es valor por defecto)
      const isActive = value !== undefined && 
                      value !== null && 
                      value !== '' && 
                      value !== config.defaultValue &&
                      value !== '__ALL__'
      
      return isActive ? acc + 1 : acc
    }, 0)
    
    setActiveFiltersCount(count)
  }, [filters])
  
  // 🎯 Convertir filtros internos a formato genérico
  const processedFilters = useMemo(() => {
    const converted: any = {}
    
    // Mapear cada filtro omitiendo valores vacíos
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === '__ALL__') {
        return // Omitir valores vacíos o "todos"
      }
      
      // Mapeo directo - sin transformaciones específicas
      converted[key] = value
    })
    
    return converted
  }, [debouncedFilters])
  
  // 📢 Notificar cambios
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(processedFilters)
    }
  }, [processedFilters, onFiltersChange])
  
  // 🎛️ Funciones de control
  const setFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])
  
  const getFilter = useCallback((key: string) => {
    return filters[key]
  }, [filters])
  
  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      const config = filterConfigs.find(c => c.key === key)
      
      if (config?.defaultValue !== undefined) {
        newFilters[key] = config.defaultValue
      } else {
        delete newFilters[key]
      }
      
      return newFilters
    })
  }, [filterConfigs])
  
  const clearAllFilters = useCallback(() => {
    const defaultFilters: FilterState = {}
    
    filterConfigs.forEach(config => {
      if (config.defaultValue !== undefined) {
        defaultFilters[config.key] = config.defaultValue
      }
    })
    
    setFilters(defaultFilters)
  }, [filterConfigs])
  
  const resetToDefaults = useCallback(() => {
    setFilters(initializeFilters())
  }, [initializeFilters])
  
  // 📋 Obtener configuración de filtros
  const getFilterConfig = useCallback((key: string): FilterConfig | undefined => {
    return filterConfigs.find(config => config.key === key)
  }, [filterConfigs])
  
  const getAllFilterConfigs = useCallback((): FilterConfig[] => {
    return filterConfigs
  }, [filterConfigs])
  
  // 🔍 Validar filtros
  const validateFilters = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Validar rangos de fechas
    const fechaInicio = filters.fechaDesde
    const fechaFin = filters.fechaHasta
    
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
      errors.push('La fecha desde no puede ser mayor que la fecha hasta')
    }
    
    // Validar rangos de montos
    const montoMinimo = filters.montoMinimo
    const montoMaximo = filters.montoMaximo
    
    if (montoMinimo && montoMaximo && montoMinimo > montoMaximo) {
      errors.push('El monto mínimo no puede ser mayor que el monto máximo')
    }
    
    // Validar valores numéricos
    if (montoMinimo && (typeof montoMinimo !== 'number' || montoMinimo < 0)) {
      errors.push('El monto mínimo debe ser un número positivo')
    }
    
    if (montoMaximo && (typeof montoMaximo !== 'number' || montoMaximo < 0)) {
      errors.push('El monto máximo debe ser un número positivo')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [filters])
  
  // 📊 Estadísticas de filtros
  const filterStats = useMemo(() => {
    const validation = validateFilters()
    
    return {
      totalFilters: filterConfigs.length,
      activeFilters: activeFiltersCount,
      isValid: validation.isValid,
      errors: validation.errors,
      hasTextSearch: !!(filters.busqueda && filters.busqueda.trim()),
      hasDateRange: !!(filters.fechaDesde || filters.fechaHasta),
      hasAmountRange: !!(filters.montoMinimo || filters.montoMaximo),
      hasBooleanFilters: Object.values(filters).some(value => typeof value === 'boolean' && value === true)
    }
  }, [activeFiltersCount, validateFilters, filters, filterConfigs])
  
  return {
    // Estado
    filters,
    debouncedFilters,
    processedFilters,
    activeFiltersCount,
    filterStats,
    
    // Funciones de control
    setFilter,
    getFilter,
    clearFilter,
    clearAllFilters,
    resetToDefaults,
    
    // Configuración
    getFilterConfig,
    getAllFilterConfigs,
    
    // Validación
    validateFilters
  }
}

// 🎯 Hook especializado para filtros de proyecciones
export function useProyeccionesFilters(options?: Omit<UseAdvancedFiltersOptions, 'storageKey'>) {
  return useAdvancedFilters({
    ...options,
    storageKey: 'proyecciones_filters'
  })
}

// 🎯 Hook especializado para filtros de pedidos
export function usePedidosFilters(options?: Omit<UseAdvancedFiltersOptions, 'storageKey'>) {
  return useAdvancedFilters({
    ...options,
    storageKey: 'pedidos_filters'
  })
}

// 🎯 Hook especializado para filtros de cotizaciones
export function useCotizacionesFilters(options?: Omit<UseAdvancedFiltersOptions, 'storageKey'>) {
  return useAdvancedFilters({
    ...options,
    storageKey: 'cotizaciones_filters'
  })
}

// 🎯 Tipos exportados
export type {
  FilterConfig,
  FilterState,
  UseAdvancedFiltersOptions
}

// ✅ Configuraciones de aprovisionamiento eliminadas