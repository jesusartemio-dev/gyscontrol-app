// ===================================================
// 📁 Archivo: cacheService.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio para cache de queries frecuentes
//    (proyectos, proveedores) con optimización de performance
// 🧠 Uso: Reduce latencia en consultas repetitivas
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { 
  LocalCache,
  catalogoCache,
  usuariosCache,
  proyectosCache,
  generalCache,
  getCachedData,
  cacheWithFallback,
  generateListCacheKey,
  generateEntityCacheKey,
  invalidateCachePattern,
  CACHE_PRESETS
} from '@/lib/cache/localCache'
import type { PaginatedResponse, PaginationParams } from '@/types/payloads'

// ✅ Tipos para entidades frecuentes
export interface CachedProyecto {
  id: string
  nombre: string
  codigo: string
  estado: string
  cliente?: {
    id: string
    nombre: string
  }
  comercial?: {
    id: string
    name: string
  }
}

export interface CachedProveedor {
  id: string
  nombre: string
  ruc?: string
  telefono?: string
  correo?: string
  activo: boolean
}

export interface CachedUser {
  id: string
  name: string
  email: string
  role: string
}

/**
 * 🔧 Servicio de cache para proyectos
 */
export class ProyectosCacheService {
  private static readonly ENTITY = 'proyectos'

  /**
   * 📡 Obtener proyectos activos (cached)
   */
  static async getProyectosActivos(): Promise<CachedProyecto[]> {
    const cacheKey = `${this.ENTITY}:activos`
    
    return cacheWithFallback(
      cacheKey,
      async () => {
        const response = await fetch('/api/proyectos?estado=activo&limit=100')
        if (!response.ok) throw new Error('Error fetching proyectos activos')
        
        const data: PaginatedResponse<any> = await response.json()
        return data.data.map(proyecto => ({
          id: proyecto.id,
          nombre: proyecto.nombre,
          codigo: proyecto.codigo,
          estado: proyecto.estado,
          cliente: proyecto.cliente ? {
            id: proyecto.cliente.id,
            nombre: proyecto.cliente.nombre
          } : undefined,
          comercial: proyecto.comercial ? {
            id: proyecto.comercial.id,
            name: proyecto.comercial.name
          } : undefined
        }))
      },
      CACHE_PRESETS.STATIC
    )
  }

  /**
   * 📡 Obtener proyecto por ID (cached)
   */
  static async getProyectoById(id: string): Promise<CachedProyecto | null> {
    const cacheKey = generateEntityCacheKey(this.ENTITY, id)
    
    return cacheWithFallback(
      cacheKey,
      async () => {
        const response = await fetch(`/api/proyectos/${id}`)
        if (!response.ok) {
          if (response.status === 404) return null
          throw new Error('Error fetching proyecto')
        }
        
        const proyecto = await response.json()
        return {
          id: proyecto.id,
          nombre: proyecto.nombre,
          codigo: proyecto.codigo,
          estado: proyecto.estado,
          cliente: proyecto.cliente ? {
            id: proyecto.cliente.id,
            nombre: proyecto.cliente.nombre
          } : undefined,
          comercial: proyecto.comercial ? {
            id: proyecto.comercial.id,
            name: proyecto.comercial.name
          } : undefined
        }
      },
      CACHE_PRESETS.DYNAMIC
    )
  }

  /**
   * 📡 Buscar proyectos con cache inteligente
   */
  static async searchProyectos(
    params: PaginationParams & { estado?: string; clienteId?: string }
  ): Promise<PaginatedResponse<CachedProyecto>> {
    const cacheKey = generateListCacheKey(
      this.ENTITY,
      { 
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search,
        estado: params.estado,
        clienteId: params.clienteId,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      }
    )

    return cacheWithFallback(
      cacheKey,
      async () => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', params.page.toString())
        if (params.limit) searchParams.set('limit', params.limit.toString())
        if (params.search) searchParams.set('search', params.search)
        if (params.estado) searchParams.set('estado', params.estado)
        if (params.clienteId) searchParams.set('clienteId', params.clienteId)
        if (params.sortBy) searchParams.set('sortBy', params.sortBy)
        if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

        const response = await fetch(`/api/proyectos?${searchParams.toString()}`)
        if (!response.ok) throw new Error('Error searching proyectos')
        
        const data: PaginatedResponse<any> = await response.json()
        return {
          ...data,
          data: data.data.map(proyecto => ({
            id: proyecto.id,
            nombre: proyecto.nombre,
            codigo: proyecto.codigo,
            estado: proyecto.estado,
            cliente: proyecto.cliente ? {
              id: proyecto.cliente.id,
              nombre: proyecto.cliente.nombre
            } : undefined,
            comercial: proyecto.comercial ? {
              id: proyecto.comercial.id,
              name: proyecto.comercial.name
            } : undefined
          }))
        }
      },
      CACHE_PRESETS.DYNAMIC
    )
  }

  /**
   * 🔄 Invalidar cache de proyectos
   */
  static invalidateCache(proyectoId?: string): void {
    if (proyectoId) {
      proyectosCache.delete(generateEntityCacheKey(this.ENTITY, proyectoId))
    }
    invalidateCachePattern(`${this.ENTITY}:*`, proyectosCache)
  }
}

/**
 * 🔧 Servicio de cache para proveedores
 */
export class ProveedoresCacheService {
  private static readonly ENTITY = 'proveedores'

  /**
   * 📡 Obtener proveedores activos (cached)
   */
  static async getProveedoresActivos(): Promise<CachedProveedor[]> {
    const cacheKey = `${this.ENTITY}:activos`
    
    return cacheWithFallback(
      cacheKey,
      async () => {
        const response = await fetch('/api/proveedores?activo=true&limit=100')
        if (!response.ok) throw new Error('Error fetching proveedores activos')
        
        const data: PaginatedResponse<any> = await response.json()
        return data.data.map(proveedor => ({
          id: proveedor.id,
          nombre: proveedor.nombre,
          ruc: proveedor.ruc,
          telefono: proveedor.telefono,
          correo: proveedor.correo,
          activo: proveedor.activo ?? true
        }))
      },
      CACHE_PRESETS.STATIC
    )
  }

  /**
   * 📡 Obtener proveedor por ID (cached)
   */
  static async getProveedorById(id: string): Promise<CachedProveedor | null> {
    const cacheKey = generateEntityCacheKey(this.ENTITY, id)
    
    return cacheWithFallback(
      cacheKey,
      async () => {
        const response = await fetch(`/api/proveedores/${id}`)
        if (!response.ok) {
          if (response.status === 404) return null
          throw new Error('Error fetching proveedor')
        }
        
        const proveedor = await response.json()
        return {
          id: proveedor.id,
          nombre: proveedor.nombre,
          ruc: proveedor.ruc,
          telefono: proveedor.telefono,
          correo: proveedor.correo,
          activo: proveedor.activo ?? true
        }
      },
      CACHE_PRESETS.DYNAMIC
    )
  }

  /**
   * 🔄 Invalidar cache de proveedores
   */
  static invalidateCache(proveedorId?: string): void {
    if (proveedorId) {
      catalogoCache.delete(generateEntityCacheKey(this.ENTITY, proveedorId))
    }
    invalidateCachePattern(`${this.ENTITY}:*`, catalogoCache)
  }
}

/**
 * 🔧 Servicio de cache para usuarios
 */
export class UsersCacheService {
  private static readonly ENTITY = 'users'

  /**
   * 📡 Obtener usuarios por rol (cached)
   */
  static async getUsersByRole(role: string): Promise<CachedUser[]> {
    const cacheKey = `${this.ENTITY}:role:${role}`
    
    return cacheWithFallback(
      cacheKey,
      async () => {
        const response = await fetch(`/api/users?role=${role}&limit=100`)
        if (!response.ok) throw new Error('Error fetching users by role')
        
        const data: PaginatedResponse<any> = await response.json()
        return data.data.map(user => ({
          id: user.id,
          name: user.name || 'Sin nombre',
          email: user.email,
          role: user.role
        }))
      },
      CACHE_PRESETS.SESSION
    )
  }

  /**
   * 📡 Obtener comerciales activos (cached)
   */
  static async getComerciales(): Promise<CachedUser[]> {
    return this.getUsersByRole('comercial')
  }

  /**
   * 📡 Obtener gestores de proyecto (cached)
   */
  static async getGestores(): Promise<CachedUser[]> {
    return this.getUsersByRole('gestor')
  }

  /**
   * 🔄 Invalidar cache de usuarios
   */
  static invalidateCache(role?: string): void {
    if (role) {
      usuariosCache.delete(`${this.ENTITY}:role:${role}`)
    } else {
      invalidateCachePattern(`${this.ENTITY}:*`, usuariosCache)
    }
  }
}

/**
 * 🔧 Servicio principal de cache
 */
export class CacheService {
  /**
   * 📡 Precargar datos críticos al inicio de la aplicación
   */
  static async preloadCriticalData(): Promise<void> {
    try {
      console.log('🔄 Precargando datos críticos...')
      
      // 📡 Precargar en paralelo
      await Promise.allSettled([
        ProyectosCacheService.getProyectosActivos(),
        ProveedoresCacheService.getProveedoresActivos(),
        UsersCacheService.getComerciales(),
        UsersCacheService.getGestores()
      ])
      
      console.log('✅ Datos críticos precargados')
    } catch (error) {
      console.warn('⚠️ Error precargando datos críticos:', error)
    }
  }

  /**
   * 🔄 Limpiar todo el cache
   */
  static clearAllCache(): void {
    catalogoCache.clear()
    usuariosCache.clear()
    proyectosCache.clear()
    generalCache.clear()
    console.log('🧹 Cache limpiado completamente')
  }

  /**
   * 📊 Obtener estadísticas del cache
   */
  static getCacheStats() {
    return {
      catalogo: catalogoCache.getStats(),
      usuarios: usuariosCache.getStats(),
      proyectos: proyectosCache.getStats(),
      general: generalCache.getStats()
    }
  }

  /**
   * 🔄 Invalidar cache por entidad
   */
  static invalidateEntity(entity: 'proyectos' | 'proveedores' | 'users', id?: string): void {
    switch (entity) {
      case 'proyectos':
        ProyectosCacheService.invalidateCache(id)
        break
      case 'proveedores':
        ProveedoresCacheService.invalidateCache(id)
        break
      case 'users':
        UsersCacheService.invalidateCache(id)
        break
    }
  }
}

// ✅ Exportar servicios
export {
  ProyectosCacheService as ProyectosCache,
  ProveedoresCacheService as ProveedoresCache,
  UsersCacheService as UsersCache
}

export default CacheService
