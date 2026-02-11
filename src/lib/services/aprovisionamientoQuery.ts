/**
 * 🚀 React Query Hooks - FASE 2 Performance Optimization
 * 
 * Hooks optimizados de React Query para gestión de aprovisionamiento con:
 * - Cache inteligente con TTL diferenciado
 * - Background refetch optimizado
 * - Invalidación automática
 * - Prefetch de datos frecuentes
 * - Error handling mejorado
 * 
 * @author GYS Team
 * @version 2.0.0 - Performance Optimized
 * @lastUpdate 2025-01-20
 */

import { 
  useQuery, 
  useMutation, 
  useQueryClient, 
  UseQueryOptions,
  keepPreviousData
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { 
  ListaEquipo, 
  PedidoEquipo, 
  PaginatedResponse 
} from '@/types'
import type { 
  ListasEquipoPaginationParams, 
  PedidosEquipoPaginationParams 
} from '@/types/payloads'
import { logger } from '@/lib/logger'
import { buildApiUrl } from '@/lib/utils'
import type { ListaEquipoDetail } from '@/types/master-detail'

// 🔑 Query Keys - Centralizadas para mejor invalidación
export const aprovisionamientoKeys = {
  all: ['aprovisionamiento'] as const,
  listas: () => [...aprovisionamientoKeys.all, 'listas'] as const,
  lista: (id: string) => [...aprovisionamientoKeys.listas(), id] as const,
  listasPaginated: (params: ListasEquipoPaginationParams) => 
    [...aprovisionamientoKeys.listas(), 'paginated', params] as const,
  pedidos: () => [...aprovisionamientoKeys.all, 'pedidos'] as const,
  pedido: (id: string) => [...aprovisionamientoKeys.pedidos(), id] as const,
  pedidosPaginated: (params: PedidosEquipoPaginationParams) => 
    [...aprovisionamientoKeys.pedidos(), 'paginated', params] as const,
  timeline: () => [...aprovisionamientoKeys.all, 'timeline'] as const,
  timelinePaginated: (params: any) => 
    [...aprovisionamientoKeys.timeline(), 'paginated', params] as const,
} as const

// 🎯 Fetcher functions optimizadas
const fetchListasEquipo = async (params: ListasEquipoPaginationParams): Promise<PaginatedResponse<ListaEquipo>> => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const url = buildApiUrl(`/api/aprovisionamiento/listas?${searchParams.toString()}`)
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Error al cargar listas de equipo')
  }

  const raw = await response.json()
  // Transform API response { success, data: { listas: [...], pagination: {...} }, estadisticas } to PaginatedResponse
  const listas = raw.data?.listas || raw.data || []
  const pagination = raw.data?.pagination
  return {
    data: listas,
    meta: {
      page: pagination?.page || raw.estadisticas?.pagina || params.page || 1,
      limit: pagination?.limit || raw.estadisticas?.limite || params.limit || 20,
      total: pagination?.total || raw.estadisticas?.total || 0,
      totalPages: pagination?.pages || raw.estadisticas?.totalPaginas || 0,
      hasNextPage: pagination?.hasNext || (raw.estadisticas?.pagina || 1) < (raw.estadisticas?.totalPaginas || 1),
      hasPrevPage: pagination?.hasPrev || (raw.estadisticas?.pagina || 1) > 1
    }
  }
}

const fetchListaEquipoDetail = async (id: string): Promise<ListaEquipoDetail> => {
  const response = await fetch(`/api/listas-equipo/${id}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Error al cargar detalle de lista')
  }
  
  return response.json()
}

const fetchPedidosEquipo = async (params: PedidosEquipoPaginationParams): Promise<PaginatedResponse<PedidoEquipo>> => {
  // 🔄 Build query parameters
  const queryParams = new URLSearchParams()
  
  if (params.proyectoId) queryParams.append('proyectoId', params.proyectoId)
  if (params.proveedorId) queryParams.append('proveedorId', params.proveedorId)
  if (params.estado && params.estado.length > 0) {
    params.estado.forEach(e => queryParams.append('estado', e))
  }
  if (params.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde)
  if (params.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta)
  if (params.montoMinimo !== undefined) queryParams.append('montoMinimo', params.montoMinimo.toString())
  if (params.montoMaximo !== undefined) queryParams.append('montoMaximo', params.montoMaximo.toString())
  if (params.busqueda) queryParams.append('busqueda', params.busqueda)
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  
  const url = `/api/aprovisionamiento/pedidos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Error al cargar pedidos de equipo')
  }
  
  const data = await response.json()
  
  // 🔄 Transform response to expected format
  return {
    data: data.data?.pedidos || data.data || [],
    meta: {
      page: data.data?.pagination?.page || params.page || 1,
      limit: data.data?.pagination?.limit || params.limit || 20,
      total: data.data?.pagination?.total || 0,
      totalPages: data.data?.pagination?.pages || data.data?.pagination?.totalPages || 0,
      hasNextPage: data.data?.pagination?.hasNext ?? data.data?.pagination?.hasNextPage ?? false,
      hasPrevPage: data.data?.pagination?.hasPrev ?? data.data?.pagination?.hasPrevPage ?? false
    }
  }
}

const fetchPedidoEquipoDetail = async (id: string): Promise<PedidoEquipo> => {
  const response = await fetch(`/api/aprovisionamiento/pedidos/${id}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Error al cargar detalle de pedido')
  }
  
  return response.json()
}

const fetchAprovisionamientoTimeline = async (params: any): Promise<PaginatedResponse<any>> => {
  const queryParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })
  }
  const queryString = queryParams.toString()
  const path = `/api/aprovisionamiento/timeline${queryString ? `?${queryString}` : ''}`
  const url = buildApiUrl(path)
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Error al cargar timeline de aprovisionamiento')
  }
  
  return response.json()
}

// 📊 Custom Hooks - Queries optimizadas

/**
 * 🚀 Hook optimizado para obtener listas de equipo paginadas
 * 
 * Optimizaciones FASE 2:
 * - Cache inteligente con TTL diferenciado
 * - keepPreviousData para UX fluida
 * - Background refetch optimizado
 * - Error handling mejorado
 */
export const useListasEquipo = (
  params: ListasEquipoPaginationParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<ListaEquipo>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: aprovisionamientoKeys.listasPaginated(params),
    queryFn: () => fetchListasEquipo(params),
    
    // 🚀 FASE 2: Cache inteligente optimizado
    staleTime: 10 * 60 * 1000, // 10 minutos - datos estables
    gcTime: 15 * 60 * 1000, // 15 minutos - mantener en memoria
    
    // 🎯 UX optimizada con datos previos
    placeholderData: keepPreviousData,
    
    // 🔄 Background refetch inteligente
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false, // Solo manual o por invalidación
    
    // 🛡️ Error handling optimizado
    retry: (failureCount, error: any) => {
      // No retry en errores 4xx
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2;
    },
    
    // 🎯 Network mode para mejor offline support
    networkMode: 'online',
    
    ...options,
  })
}

/**
 * Hook para obtener una lista específica por ID
 */
export const useListaEquipo = (
  id: string,
  options?: Omit<UseQueryOptions<ListaEquipo>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: aprovisionamientoKeys.lista(id),
    queryFn: async () => {
      const response = await fetch(`/api/listas-equipo/${id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al cargar lista de equipo')
      }
      
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    enabled: !!id,
    ...options,
  })
}

/**
 * Hook para obtener detalle de lista de equipo
 */
export const useListaEquipoDetail = (
  id: string,
  options?: Omit<UseQueryOptions<ListaEquipoDetail>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: aprovisionamientoKeys.lista(id),
    queryFn: () => fetchListaEquipoDetail(id),
    enabled: !!id,
    // 🎯 Datos de detalle más dinámicos
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options,
  })
}

/**
 * 🚀 Hook optimizado para obtener pedidos de equipo paginados
 * 
 * Optimizaciones FASE 2:
 * - Cache más frecuente (datos dinámicos)
 * - keepPreviousData para navegación fluida
 * - Background refetch para datos actualizados
 */
export const usePedidosEquipo = (
  params: PedidosEquipoPaginationParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<PedidoEquipo>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: aprovisionamientoKeys.pedidosPaginated(params),
    queryFn: () => fetchPedidosEquipo(params),
    
    // 🚀 FASE 2: Cache más dinámico para pedidos
    staleTime: 5 * 60 * 1000, // 5 minutos - datos más dinámicos
    gcTime: 10 * 60 * 1000, // 10 minutos
    
    // 🎯 UX fluida con datos previos
    placeholderData: keepPreviousData,
    
    // 🔄 Refetch más frecuente para pedidos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 2 * 60 * 1000, // 2 minutos background refetch
    
    // 🛡️ Error handling
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2;
    },
    
    networkMode: 'online',
    enabled: true,
    
    ...options
  })
}

/**
 * Hook para obtener un pedido específico por ID
 */
export const usePedidoEquipo = (
  id: string,
  options?: Omit<UseQueryOptions<PedidoEquipo>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: aprovisionamientoKeys.pedido(id),
    queryFn: async () => {
      const response = await fetch(`/api/aprovisionamiento/pedidos/${id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al cargar pedido de equipo')
      }
      
      return response.json()
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 8 * 60 * 1000, // 8 minutos
    enabled: !!id,
    ...options,
  })
}

// 🔄 Mutation Hooks - Con invalidación automática

/**
 * Hook para crear una nueva lista de equipo
 */
export const useCreateListaEquipo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/listas-equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear lista de equipo')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // 🎯 Invalidar todas las queries de listas
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.listas() })
      
      // 🎯 Optimistic update - agregar a cache si es posible
      if (data?.id) {
        queryClient.setQueryData(aprovisionamientoKeys.lista(data.id), data)
      }
      
      toast.success('Lista de equipo creada exitosamente')
      logger.info('Lista de equipo creada:', { id: data?.id })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear lista de equipo')
      logger.error('Error creando lista de equipo:', error)
    }
  })
}

/**
 * Hook para actualizar una lista de equipo
 */
export const useUpdateListaEquipo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/listas-equipo/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar lista de equipo')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 🎯 Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.listas() })
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.lista(variables.id) })
      
      // 🎯 Actualizar cache específica
      queryClient.setQueryData(aprovisionamientoKeys.lista(variables.id), data)
      
      toast.success('Lista de equipo actualizada exitosamente')
      logger.info('Lista de equipo actualizada:', { id: variables.id })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar lista de equipo')
      logger.error('Error actualizando lista de equipo:', error)
    }
  })
}

/**
 * Hook para crear un nuevo pedido de equipo
 */
export const useCreatePedidoEquipo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/aprovisionamiento/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear pedido de equipo')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // 🎯 Invalidar todas las queries de pedidos
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedidos() })
      
      // 🎯 También invalidar listas relacionadas (coherencia)
      if (data?.listaEquipoId) {
        queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.lista(data.listaEquipoId) })
      }
      
      toast.success('Pedido de equipo creado exitosamente')
      logger.info('Pedido de equipo creado:', { id: data?.id })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear pedido de equipo')
      logger.error('Error creando pedido de equipo:', error)
    }
  })
}

/**
 * Hook para actualizar un pedido de equipo
 */
export const useUpdatePedidoEquipo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/aprovisionamiento/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar pedido de equipo')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 🎯 Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedidos() })
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedido(variables.id) })
      
      // 🎯 También invalidar listas relacionadas
      if (data?.listaEquipoId) {
        queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.lista(data.listaEquipoId) })
      }
      
      toast.success('Pedido de equipo actualizado exitosamente')
      logger.info('Pedido de equipo actualizado:', { id: variables.id })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar pedido de equipo')
      logger.error('Error actualizando pedido de equipo:', error)
    }
  })
}

// 🛠️ Utility Functions - Invalidación manual y prefetch

/**
 * Función para invalidar manualmente todas las queries de aprovisionamiento
 */
export const useInvalidateAprovisionamiento = () => {
  const queryClient = useQueryClient()
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.all })
      logger.info('Cache de aprovisionamiento invalidado completamente')
    },
    invalidateListas: () => {
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.listas() })
      logger.info('Cache de listas invalidado')
    },
    invalidatePedidos: () => {
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedidos() })
      logger.info('Cache de pedidos invalidado')
    },
    invalidateLista: (id: string) => {
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.lista(id) })
      logger.info('Cache de lista específica invalidado:', { id })
    },
    invalidatePedido: (id: string) => {
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedido(id) })
      logger.info('Cache de pedido específico invalidado:', { id })
    }
  }
}

/**
 * Función para prefetch de datos críticos
 */
export const usePrefetchAprovisionamiento = () => {
  const queryClient = useQueryClient()
  
  return {
    prefetchListas: async (params: ListasEquipoPaginationParams) => {
      await queryClient.prefetchQuery({
        queryKey: aprovisionamientoKeys.listasPaginated(params),
        queryFn: () => fetchListasEquipo(params),
        staleTime: 10 * 60 * 1000
      })
      logger.info('Listas prefetched:', params)
    },
    prefetchPedidos: async (params: PedidosEquipoPaginationParams) => {
      await queryClient.prefetchQuery({
        queryKey: aprovisionamientoKeys.pedidosPaginated(params),
        queryFn: () => fetchPedidosEquipo(params),
        staleTime: 5 * 60 * 1000
      })
      logger.info('Pedidos prefetched:', params)
    },
    prefetchLista: async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: aprovisionamientoKeys.lista(id),
        queryFn: async () => {
          const response = await fetch(`/api/listas-equipo/${id}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          })
          return response.json()
        },
        staleTime: 5 * 60 * 1000
      })
      logger.info('Lista prefetched:', { id })
    }
  }
}

/**
 * Hook para obtener detalle de pedido de equipo
 */
export const usePedidoEquipoDetail = (
  id: string,
  options?: Omit<UseQueryOptions<PedidoEquipo>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: aprovisionamientoKeys.pedido(id),
    queryFn: () => fetchPedidoEquipoDetail(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    ...options,
  })
}

/**
 * Hook para obtener timeline de aprovisionamiento
 */
export const useAprovisionamientoTimeline = (
  params: any,
  options?: Omit<UseQueryOptions<PaginatedResponse<any>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: aprovisionamientoKeys.timelinePaginated(params),
    queryFn: () => fetchAprovisionamientoTimeline(params),
    // 🎯 Timeline es crítico según el plan - cache más corto
    staleTime: 1 * 60 * 1000, // 1 minuto
    ...options,
  })
}

// 🔄 Custom Hooks - Mutations con invalidación automática

/**
 * Hook para crear/actualizar lista de equipo
 */
export const useListaEquipoMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { id?: string; payload: any }) => {
      const url = data.id ? `/api/listas-equipo/${data.id}` : '/api/listas-equipo'
      const method = data.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.payload)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al guardar lista de equipo')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 🔄 Invalidación automática según FASE 2
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.listas() })
      
      if (variables.id) {
        // Actualizar cache específico del item
        queryClient.setQueryData(aprovisionamientoKeys.lista(variables.id), data)
      }
      
      toast.success(variables.id ? 'Lista actualizada correctamente' : 'Lista creada correctamente')
      logger.info('Lista de equipo guardada', { id: data.id })
    },
    onError: (error: Error) => {
      toast.error(error.message)
      logger.error('Error al guardar lista de equipo', { error: error.message })
    }
  })
}

/**
 * Hook para crear/actualizar pedido de equipo
 */
export const usePedidoEquipoMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { id?: string; payload: any }) => {
      const url = data.id ? `/api/pedido-equipo/${data.id}` : '/api/pedido-equipo'
      const method = data.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.payload)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al guardar pedido de equipo')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 🔄 Invalidación automática
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedidos() })
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.timeline() })
      
      if (variables.id) {
        queryClient.setQueryData(aprovisionamientoKeys.pedido(variables.id), data)
      }
      
      toast.success(variables.id ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente')
      logger.info('Pedido de equipo guardado', { id: data.id })
    },
    onError: (error: Error) => {
      toast.error(error.message)
      logger.error('Error al guardar pedido de equipo', { error: error.message })
    }
  })
}

/**
 * Hook para eliminar lista de equipo
 */
export const useDeleteListaEquipo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/listas-equipo/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al eliminar lista de equipo')
      }
      
      return { id }
    },
    onSuccess: (data) => {
      // 🔄 Invalidación y limpieza de cache
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.listas() })
      queryClient.removeQueries({ queryKey: aprovisionamientoKeys.lista(data.id) })
      
      toast.success('Lista eliminada correctamente')
      logger.info('Lista de equipo eliminada', { id: data.id })
    },
    onError: (error: Error) => {
      toast.error(error.message)
      logger.error('Error al eliminar lista de equipo', { error: error.message })
    }
  })
}

/**
 * Hook para eliminar pedido de equipo
 */
export const useDeletePedidoEquipo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/aprovisionamiento/pedidos/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al eliminar pedido de equipo')
      }
      
      return { id }
    },
    onSuccess: (data) => {
      // 🔄 Invalidación múltiple
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedidos() })
      queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.timeline() })
      queryClient.removeQueries({ queryKey: aprovisionamientoKeys.pedido(data.id) })
      
      toast.success('Pedido eliminado correctamente')
      logger.info('Pedido de equipo eliminado', { id: data.id })
    },
    onError: (error: Error) => {
      toast.error(error.message)
      logger.error('Error al eliminar pedido de equipo', { error: error.message })
    }
  })
}

// 🛠️ Utility functions para invalidación manual

/**
 * Invalida todas las queries de aprovisionamiento
 */
export const invalidateAprovisionamientoQueries = (queryClient: any) => {
  return queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.all })
}

/**
 * Invalida queries específicas de listas
 */
export const invalidateListasQueries = (queryClient: any) => {
  return queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.listas() })
}

/**
 * Invalida queries específicas de pedidos
 */
export const invalidatePedidosQueries = (queryClient: any) => {
  return queryClient.invalidateQueries({ queryKey: aprovisionamientoKeys.pedidos() })
}

/**
 * Prefetch de datos críticos para mejorar UX
 */
export const prefetchAprovisionamientoData = async (queryClient: any, params: any) => {
  // Prefetch listas más comunes
  await queryClient.prefetchQuery({
    queryKey: aprovisionamientoKeys.listasPaginated({ page: 1, limit: 10, search: '' }),
    queryFn: () => fetchListasEquipo({ page: 1, limit: 10, search: '' }),
    staleTime: 10 * 60 * 1000
  })
  
  // Prefetch pedidos recientes
  await queryClient.prefetchQuery({
    queryKey: aprovisionamientoKeys.pedidosPaginated({ page: 1, limit: 10, search: '' }),
    queryFn: () => fetchPedidosEquipo({ page: 1, limit: 10, search: '' }),
    staleTime: 3 * 60 * 1000
  })
}
