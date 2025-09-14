// ===================================================
// 📁 Archivo: listasEquipoOptimized.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio optimizado para listas de equipos
//    con cache, paginación y debounce integrados
// 🧠 Uso: Implementa Fase 1 del plan de optimización
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  LocalCache,
  catalogoCache,
  cacheWithFallback,
  generateListCacheKey,
  generateEntityCacheKey,
  CACHE_PRESETS,
  invalidateCachePattern
} from '@/lib/cache/localCache'
import { ProyectosCache } from './cacheService'
import type { 
  PaginatedResponse, 
  PaginationParams,
  ListaEquipoPayload,
  ListaEquipoUpdatePayload 
} from '@/types/payloads'
import type { ListaEquipo } from '@/types/modelos'

// ✅ Tipos optimizados para el servicio
export interface ListaEquipoOptimized {
  id: string
  codigo: string
  nombre: string
  estado: string
  numeroSecuencia: number
  fechaNecesaria?: string
  createdAt: string
  updatedAt: string
  proyecto: {
    id: string
    nombre: string
    codigo: string
  }
  responsable: {
    id: string
    name: string
    email: string
  }
  itemsCount: number
}

export interface ListasEquipoFilters extends PaginationParams {
  proyectoId?: string
  estado?: string
  responsableId?: string
  fechaDesde?: string
  fechaHasta?: string
}

/**
 * 🔧 Servicio optimizado para listas de equipos
 */
export class ListasEquipoService {
  private static readonly ENTITY = 'listas-equipo'
  private static readonly BASE_URL = '/api/listas-equipo'

  /**
   * 📡 Obtener listas con paginación y cache optimizado
   */
  static async getListas(
    filters: ListasEquipoFilters = {}
  ): Promise<PaginatedResponse<ListaEquipoOptimized>> {
    const {
      page = 1,
      limit = 15,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...otherFilters
    } = filters

    // 🔧 Generar clave de cache
    const cacheKey = generateListCacheKey(
      this.ENTITY,
      { page, limit, search, sortBy, sortOrder, ...otherFilters }
    )

    return cacheWithFallback(
      cacheKey,
      async () => {
        const searchParams = new URLSearchParams()
        searchParams.set('page', page.toString())
        searchParams.set('limit', limit.toString())
        if (search) searchParams.set('search', search)
        if (sortBy) searchParams.set('sortBy', sortBy)
        if (sortOrder) searchParams.set('sortOrder', sortOrder)
        
        // 📡 Agregar filtros adicionales
        Object.entries(otherFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, value.toString())
          }
        })

        const response = await fetch(`${this.BASE_URL}?${searchParams.toString()}`)
        if (!response.ok) {
          throw new Error(`Error fetching listas: ${response.statusText}`)
        }

        const data: PaginatedResponse<any> = await response.json()
        
        // 🔄 Transformar datos para optimización
        return {
          ...data,
          data: data.data.map(lista => ({
            id: lista.id,
            codigo: lista.codigo,
            nombre: lista.nombre,
            estado: lista.estado,
            numeroSecuencia: lista.numeroSecuencia,
            fechaNecesaria: lista.fechaNecesaria,
            createdAt: lista.createdAt,
            updatedAt: lista.updatedAt,
            proyecto: {
              id: lista.proyecto.id,
              nombre: lista.proyecto.nombre,
              codigo: lista.proyecto.codigo
            },
            responsable: {
              id: lista.responsable.id,
              name: lista.responsable.name,
              email: lista.responsable.email
            },
            itemsCount: lista._count?.items || 0
          }))
        } as PaginatedResponse<ListaEquipoOptimized>
      },
      CACHE_PRESETS.DYNAMIC
    )
  }

  /**
   * 📡 Obtener lista por ID con cache
   */
  static async getListaById(id: string): Promise<ListaEquipo | null> {
    const cacheKey = generateEntityCacheKey(this.ENTITY, id)

    return cacheWithFallback(
      cacheKey,
      async () => {
        const response = await fetch(`${this.BASE_URL}/${id}`)
        if (!response.ok) {
          if (response.status === 404) return null
          throw new Error(`Error fetching lista: ${response.statusText}`)
        }

        return response.json()
      },
      CACHE_PRESETS.DYNAMIC
    )
  }

  /**
   * 📡 Crear nueva lista (invalida cache)
   */
  static async createLista(payload: ListaEquipoPayload): Promise<ListaEquipo> {
    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error creating lista')
    }

    const newLista = await response.json()
    
    // 🔄 Invalidar cache relacionado
    this.invalidateRelatedCache(payload.proyectoId)
    
    return newLista
  }

  /**
   * 📡 Actualizar lista (invalida cache)
   */
  static async updateLista(
    id: string, 
    payload: ListaEquipoUpdatePayload
  ): Promise<ListaEquipo> {
    const response = await fetch(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error updating lista')
    }

    const updatedLista = await response.json()
    
    // 🔄 Invalidar cache específico y relacionado
    this.invalidateCache(id)
    if (updatedLista.proyectoId) {
      this.invalidateRelatedCache(updatedLista.proyectoId)
    }
    
    return updatedLista
  }

  /**
   * 📡 Eliminar lista (invalida cache)
   */
  static async deleteLista(id: string): Promise<void> {
    // 📡 Obtener datos antes de eliminar para invalidar cache relacionado
    const lista = await this.getListaById(id)
    
    const response = await fetch(`${this.BASE_URL}/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error deleting lista')
    }

    // 🔄 Invalidar cache
    this.invalidateCache(id)
    if (lista?.proyectoId) {
      this.invalidateRelatedCache(lista.proyectoId)
    }
  }

  /**
   * 📡 Obtener listas por proyecto (optimizado)
   */
  static async getListasByProyecto(
    proyectoId: string,
    filters: Omit<ListasEquipoFilters, 'proyectoId'> = {}
  ): Promise<PaginatedResponse<ListaEquipoOptimized>> {
    return this.getListas({ ...filters, proyectoId })
  }

  /**
   * 📡 Buscar listas con debounce automático
   */
  static async searchListas(
    searchTerm: string,
    filters: Omit<ListasEquipoFilters, 'search'> = {}
  ): Promise<PaginatedResponse<ListaEquipoOptimized>> {
    // 📡 Si el término es muy corto, no buscar
    if (searchTerm.length > 0 && searchTerm.length < 2) {
      return {
        data: [],
        meta: {
          page: 1,
          limit: filters.limit || 15,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    }

    return this.getListas({ ...filters, search: searchTerm })
  }

  /**
   * 📡 Obtener estadísticas de listas por proyecto
   */
  static async getEstadisticasByProyecto(proyectoId: string) {
    const cacheKey = `${this.ENTITY}:stats:${proyectoId}`

    return cacheWithFallback(
      cacheKey,
      async () => {
        const response = await fetch(`${this.BASE_URL}/estadisticas?proyectoId=${proyectoId}`)
        if (!response.ok) {
          throw new Error('Error fetching estadísticas')
        }
        return response.json()
      },
      CACHE_PRESETS.VOLATILE // Stats cambian más frecuentemente
    )
  }

  /**
   * 🔄 Invalidar cache específico
   */
  static invalidateCache(listaId?: string): void {
    if (listaId) {
      // 📡 Invalidar cache de entidad específica
      const entityKey = generateEntityCacheKey(this.ENTITY, listaId)
      invalidateCachePattern(entityKey)
    }
    
    // 📡 Invalidar todas las listas paginadas
    invalidateCachePattern(`${this.ENTITY}:list:*`)
  }

  /**
   * 🔄 Invalidar cache relacionado (por proyecto, etc.)
   */
  static invalidateRelatedCache(proyectoId?: string): void {
    this.invalidateCache()
    
    if (proyectoId) {
      // 📡 Invalidar estadísticas del proyecto
      invalidateCachePattern(`${this.ENTITY}:stats:${proyectoId}`)
      
      // 📡 Invalidar cache de proyectos relacionados
      ProyectosCache.invalidateCache(proyectoId)
    }
  }

  /**
   * 📡 Precargar listas frecuentes
   */
  static async preloadFrequentListas(): Promise<void> {
    try {
      // 📡 Precargar listas activas más recientes
      await Promise.allSettled([
        this.getListas({ 
          estado: 'por_revisar', 
          limit: 10, 
          sortBy: 'createdAt', 
          sortOrder: 'desc' 
        }),
        this.getListas({ 
          estado: 'por_cotizar', 
          limit: 10, 
          sortBy: 'createdAt', 
          sortOrder: 'desc' 
        })
      ])
      
      console.log('✅ Listas frecuentes precargadas')
    } catch (error) {
      console.warn('⚠️ Error precargando listas frecuentes:', error)
    }
  }
}

// ✅ Exportar servicio optimizado
export default ListasEquipoService