// 🚀 Servicios de Aprovisionamiento para Client Components
// ✅ Versión optimizada para componentes del cliente que maneja automáticamente las cookies de NextAuth
// 🔄 MIGRADO A REACT QUERY - Este archivo será deprecado gradualmente

import type { 
  ResponseListas,
  ResponsePedidos 
} from '@/types/aprovisionamiento'
import { buildApiUrl } from '@/lib/utils'
import logger from '@/lib/logger'

const API_BASE = '/api/listas-equipo'

// 🔧 Utilidad para manejar respuestas de API en el cliente
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

// 🔧 Construir parámetros de consulta
function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        searchParams.append(key, value.join(','))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  return searchParams.toString()
}

// 📊 Servicio de Listas de Equipo para Client Components
// ⚠️ DEPRECADO: Usar aprovisionamientoQuery.ts con React Query
export const listasEquipoClientService = {
  /**
   * 🔍 Obtener listas de equipo con filtros (Client Component)
   * @deprecated Usar useListasEquipo hook de aprovisionamientoQuery.ts
   */
  async obtenerListas(filtros: {
    proyectoId?: string
    estado?: string[]
    responsableId?: string
    fechaDesde?: string
    fechaHasta?: string
    montoMinimo?: number
    montoMaximo?: number
    page?: number
    limit?: number
  } = {}): Promise<ResponseListas> {
    try {
      logger.warn('🚨 Usando servicio deprecado listasEquipoClientService. Migrar a React Query.')
      
      const queryParams = buildQueryParams(filtros)
      const url = buildApiUrl(`${API_BASE}${queryParams ? `?${queryParams}` : ''}`)
      
      // 📡 En Client Components, fetch automáticamente incluye las cookies de sesión
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // ✅ Incluir cookies automáticamente
      })
      
      const apiResponse = await handleApiResponse<any>(response)
      
      // ✅ Validar que la respuesta de la API sea válida
      if (!apiResponse || !Array.isArray(apiResponse)) {
        logger.warn('API response is null or not an array:', apiResponse)
        return {
          success: false,
          data: {
            listas: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              pages: 0,
              hasNext: false,
              hasPrev: false
            }
          },
          timestamp: new Date().toISOString()
        }
      }
      
      // ✅ La API /api/listas-equipo devuelve directamente un array de listas
      // Transformar las listas para extraer solo el porcentaje de coherencia
      const listasTransformadas = apiResponse.map((lista: any) => ({
        ...lista,
        // ✅ Extraer solo el porcentaje de coherencia del objeto complejo
        coherencia: typeof lista.coherencia === 'object' && lista.coherencia?.porcentajeEjecutado 
          ? Math.round(lista.coherencia.porcentajeEjecutado)
          : typeof lista.coherencia === 'number' 
            ? lista.coherencia 
            : undefined
      }))
      
      return {
        success: true,
        data: {
          listas: listasTransformadas,
          pagination: {
            page: filtros.page || 1,
            limit: filtros.limit || 20,
            total: listasTransformadas.length,
            pages: Math.ceil(listasTransformadas.length / (filtros.limit || 20)),
            hasNext: (filtros.page || 1) < Math.ceil(listasTransformadas.length / (filtros.limit || 20)),
            hasPrev: (filtros.page || 1) > 1
          }
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error al obtener listas de equipo (client):', error)
      throw error
    }
  }
}

// 📊 Servicio de Pedidos de Equipo para Client Components
export const pedidosEquipoClientService = {
  /**
   * 🔍 Obtener pedidos de equipo con filtros (Client Component)
   */
  async obtenerPedidos(filtros: {
    proyectoId?: string
    listaEquipoId?: string
    estado?: string[]
    proveedorId?: string
    fechaDesde?: string
    fechaHasta?: string
    montoMinimo?: number
    montoMaximo?: number
    busqueda?: string
    page?: number
    limit?: number
  } = {}): Promise<ResponsePedidos> {
    try {
      const queryParams = buildQueryParams(filtros)
      const url = buildApiUrl(`${API_BASE}/pedidos${queryParams ? `?${queryParams}` : ''}`)
      
      // 📡 En Client Components, fetch automáticamente incluye las cookies de sesión
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // ✅ Incluir cookies automáticamente
      })
      
      const apiResponse = await handleApiResponse<any>(response)
      
      // ✅ Validar que la respuesta de la API sea válida
      if (!apiResponse || typeof apiResponse !== 'object') {
        console.warn('API response is null or invalid:', apiResponse)
        return {
          success: false,
          data: {
            pedidos: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              pages: 0,
              hasNext: false,
              hasPrev: false
            }
          },
          timestamp: new Date().toISOString()
        }
      }
      
      // ✅ Transformar respuesta de aprovisionamiento al formato esperado
      // La API devuelve: { success: true, data: [...pedidos], estadisticas: {...} }
      // El componente espera: { success: true, data: { pedidos: [...pedidos], pagination: {...} } }
      return {
        success: apiResponse.success || true,
        data: {
          pedidos: apiResponse.data || [], // ✅ Los pedidos van en 'pedidos' según ResponsePedidos
          pagination: {
            page: apiResponse.estadisticas?.pagina || 1,
            limit: apiResponse.estadisticas?.limite || 20,
            total: apiResponse.estadisticas?.total || 0,
            pages: apiResponse.estadisticas?.totalPaginas || 0,
            hasNext: (apiResponse.estadisticas?.pagina || 1) < (apiResponse.estadisticas?.totalPaginas || 0),
            hasPrev: (apiResponse.estadisticas?.pagina || 1) > 1
          }
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error al obtener pedidos de equipo (client):', error)
      throw error
    }
  }
}

// 🔍 Función principal para obtener listas desde Client Components
export async function getListasEquipoClient(filtros: {
  proyectoId?: string
  estado?: string
  fechaInicio?: string
  fechaFin?: string
  montoMin?: number
  montoMax?: number
  soloCoherencia?: boolean
  busqueda?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}): Promise<ResponseListas> {
  try {
    // 🔄 Mapear parámetros para compatibilidad con listasEquipoClientService
    const filtrosMapeados = {
      proyectoId: filtros.proyectoId,
      estado: filtros.estado ? [filtros.estado] : undefined, // ✅ Convertir string a array
      responsableId: undefined, // ✅ No disponible en filtros de entrada
      fechaDesde: filtros.fechaInicio, // ✅ Mapear 'fechaInicio' a 'fechaDesde'
      fechaHasta: filtros.fechaFin, // ✅ Mapear 'fechaFin' a 'fechaHasta'
      montoMinimo: filtros.montoMin, // ✅ Mapear 'montoMin' a 'montoMinimo'
      montoMaximo: filtros.montoMax, // ✅ Mapear 'montoMax' a 'montoMaximo'
      page: filtros.page,
      limit: filtros.limit
    }
    
    return await listasEquipoClientService.obtenerListas(filtrosMapeados)
  } catch (error) {
    console.error('Error al obtener listas de equipo (client wrapper):', error)
    return {
      success: false,
      data: {
        listas: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: new Date().toISOString()
    }
  }
}

// 🔍 Función principal para obtener pedidos desde Client Components
export async function getPedidosEquipoClient(filtros: {
  proyectoId?: string
  proveedorId?: string
  estado?: string
  fechaInicio?: string
  fechaFin?: string
  montoMin?: number
  montoMax?: number
  coherencia?: string
  lista?: string
  busqueda?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}): Promise<ResponsePedidos> {
  try {
    // 🔄 Usar el servicio getAllPedidoEquipos existente
    const { getAllPedidoEquipos } = await import('./pedidoEquipo')
    
    // 🔧 Mapear filtros al formato esperado por getAllPedidoEquipos
    const filtrosMapeados = {
      proyectoId: filtros.proyectoId,
      estado: filtros.estado,
      responsableId: filtros.proveedorId,
      fechaDesde: filtros.fechaInicio,
      fechaHasta: filtros.fechaFin,
      searchText: filtros.busqueda
    }
    
    const pedidos = await getAllPedidoEquipos(filtrosMapeados)
    
    // ✅ Transformar respuesta al formato esperado por ResponsePedidos
    return {
      success: true,
      data: {
        pedidos: pedidos || [],
        pagination: {
          page: filtros.page || 1,
          limit: filtros.limit || 20,
          total: pedidos?.length || 0,
          pages: Math.ceil((pedidos?.length || 0) / (filtros.limit || 20)),
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error al obtener pedidos de equipo (client wrapper):', error)
    return {
      success: false,
      data: {
        pedidos: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: new Date().toISOString()
    }
  }
}

export default {
  listas: listasEquipoClientService,
  pedidos: pedidosEquipoClientService,
  getListasEquipo: getListasEquipoClient,
  getPedidosEquipo: getPedidosEquipoClient
}
