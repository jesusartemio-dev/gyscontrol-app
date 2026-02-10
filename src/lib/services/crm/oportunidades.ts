// ===================================================
// 📁 Archivo: oportunidades.ts
// 📌 Ubicación: src/lib/services/crm/oportunidades.ts
// 🔧 Descripción: Servicios para gestión de oportunidades CRM
// ✅ Funciones para crear, leer, actualizar y eliminar oportunidades
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { buildApiUrl } from '@/lib/utils'

// Tipos para oportunidades
export interface CrmOportunidad {
  id: string
  clienteId: string
  nombre: string
  descripcion?: string
  valorEstimado?: number
  probabilidad: number
  fechaCierreEstimada?: string
  fuente?: string
  estado: string
  prioridad: string
  comercialId?: string
  responsableId?: string
  fechaUltimoContacto?: string
  notas?: string
  competencia?: string
  cotizacionId?: string // ✅ Agregado para validar si ya tiene cotización
  proyectoId?: string   // ✅ Agregado: enlace directo a proyecto
  createdAt: string
  updatedAt: string

  // Relaciones
  cliente?: {
    id: string
    nombre: string
    ruc?: string
    sector?: string
  }
  comercial?: {
    id: string
    name: string
    email: string
  }
  responsable?: {
    id: string
    name: string
    email: string
  }
  cotizacion?: {
    id: string
    codigo: string
    nombre: string
    estado: string
    totalCliente?: number
    grandTotal?: number
    fechaEnvio?: string
  }

  // Conteos (opcional, disponible cuando se incluye en queries)
  _count?: {
    actividades: number
  }
}

export interface CrmOportunidadCreate {
  clienteId: string
  nombre: string
  descripcion?: string
  valorEstimado?: number
  probabilidad?: number
  fechaCierreEstimada?: string
  fuente?: string
  prioridad?: string
  responsableId?: string
  notas?: string
  competencia?: string
}

export interface CrmOportunidadUpdate {
  nombre?: string
  descripcion?: string
  valorEstimado?: number
  probabilidad?: number
  fechaCierreEstimada?: string
  fuente?: string
  estado?: string
  prioridad?: string
  responsableId?: string
  notas?: string
  competencia?: string
  cotizacionId?: string
}

export interface CrmOportunidadFilters {
  clienteId?: string
  comercialId?: string
  estado?: string
  prioridad?: string
  fechaDesde?: string
  fechaHasta?: string
  valorMin?: number
  valorMax?: number
  search?: string

  // ✅ Filtros mejorados
  hasCotizacion?: boolean        // Tiene cotización asignada
  hasProyecto?: boolean         // Tiene proyecto creado
  estadoCotizacion?: string     // Estado específico de la cotización
  estadoProyecto?: string       // Estado específico del proyecto
  probabilidadMin?: number      // Probabilidad mínima (0-100)
  probabilidadMax?: number      // Probabilidad máxima (0-100)
  diasSinContacto?: number      // Días sin contacto
  soloUrgentes?: boolean        // Alta prioridad + fecha cercana (< 30 días)
  soloVencidas?: boolean        // Fecha de cierre pasada
  soloActivas?: boolean         // Solo oportunidades activas (no ganadas/perdidas)
}

export interface CrmOportunidadPagination {
  page?: number
  limit?: number
}

export interface CrmOportunidadResponse {
  data: CrmOportunidad[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  estadisticas: Record<string, { count: number; valorTotal: number }>
}

// ✅ Obtener oportunidades con filtros y paginación
export async function getOportunidades(
  filters: CrmOportunidadFilters = {},
  pagination: CrmOportunidadPagination = {}
): Promise<CrmOportunidadResponse> {
  try {
    const params = new URLSearchParams()

    // Filtros básicos
    if (filters.clienteId) params.append('clienteId', filters.clienteId)
    if (filters.comercialId) params.append('comercialId', filters.comercialId)
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.prioridad) params.append('prioridad', filters.prioridad)
    if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde)
    if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta)
    if (filters.valorMin) params.append('valorMin', filters.valorMin.toString())
    if (filters.valorMax) params.append('valorMax', filters.valorMax.toString())
    if (filters.search) params.append('search', filters.search)

    // ✅ Filtros mejorados
    if (filters.hasCotizacion !== undefined) params.append('hasCotizacion', filters.hasCotizacion.toString())
    if (filters.hasProyecto !== undefined) params.append('hasProyecto', filters.hasProyecto.toString())
    if (filters.estadoCotizacion) params.append('estadoCotizacion', filters.estadoCotizacion)
    if (filters.estadoProyecto) params.append('estadoProyecto', filters.estadoProyecto)
    if (filters.probabilidadMin !== undefined) params.append('probabilidadMin', filters.probabilidadMin.toString())
    if (filters.probabilidadMax !== undefined) params.append('probabilidadMax', filters.probabilidadMax.toString())
    if (filters.diasSinContacto !== undefined) params.append('diasSinContacto', filters.diasSinContacto.toString())
    if (filters.soloUrgentes !== undefined) params.append('soloUrgentes', filters.soloUrgentes.toString())
    if (filters.soloVencidas !== undefined) params.append('soloVencidas', filters.soloVencidas.toString())
    if (filters.soloActivas !== undefined) params.append('soloActivas', filters.soloActivas.toString())

    // Paginación
    if (pagination.page) params.append('page', pagination.page.toString())
    if (pagination.limit) params.append('limit', pagination.limit.toString())

    const url = buildApiUrl(`/api/crm/oportunidades?${params.toString()}`)

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 401) {
      // Redirigir al login si no está autorizado
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('No autorizado')
    }

    if (!response.ok) {
      throw new Error(`Error al obtener oportunidades: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getOportunidades:', error)
    throw error
  }
}

// ✅ Obtener oportunidad por ID
export async function getOportunidadById(id: string): Promise<CrmOportunidad> {
  try {
    const response = await fetch(buildApiUrl(`/api/crm/oportunidades/${id}`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Oportunidad no encontrada')
      }
      throw new Error(`Error al obtener oportunidad: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getOportunidadById:', error)
    throw error
  }
}

// ✅ Crear nueva oportunidad
export async function createOportunidad(data: CrmOportunidadCreate): Promise<CrmOportunidad> {
  try {
    const response = await fetch(buildApiUrl('/api/crm/oportunidades'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      // ✅ Intentar obtener mensaje específico del error
      try {
        const errorData = await response.json()
        if (errorData?.error) {
          throw new Error(errorData.error)
        }
      } catch (parseError) {
        // Si no se puede parsear el JSON, usar el mensaje genérico
      }

      throw new Error(`Error al crear oportunidad: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en createOportunidad:', error)
    throw error
  }
}

// ✅ Actualizar oportunidad
export async function updateOportunidad(
  id: string,
  data: CrmOportunidadUpdate
): Promise<CrmOportunidad> {
  try {
    const response = await fetch(buildApiUrl(`/api/crm/oportunidades/${id}`), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Oportunidad no encontrada')
      }

      // ✅ Intentar obtener mensaje específico del error
      try {
        const errorData = await response.json()
        if (errorData?.error) {
          throw new Error(errorData.error)
        }
      } catch (parseError) {
        // Si no se puede parsear el JSON, usar el mensaje genérico
      }

      throw new Error(`Error al actualizar oportunidad: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en updateOportunidad:', error)
    throw error
  }
}

// ✅ Eliminar oportunidad
export async function deleteOportunidad(id: string): Promise<void> {
  try {
    const response = await fetch(buildApiUrl(`/api/crm/oportunidades/${id}`), {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Oportunidad no encontrada')
      }
      throw new Error(`Error al eliminar oportunidad: ${response.statusText}`)
    }
  } catch (error) {
    console.error('❌ Error en deleteOportunidad:', error)
    throw error
  }
}

// ✅ Cambiar estado de oportunidad
export async function cambiarEstadoOportunidad(
  id: string,
  estado: string
): Promise<CrmOportunidad> {
  return updateOportunidad(id, { estado })
}

// ✅ Asignar responsable a oportunidad
export async function asignarResponsableOportunidad(
  id: string,
  responsableId: string
): Promise<CrmOportunidad> {
  return updateOportunidad(id, { responsableId })
}

// ✅ Actualizar probabilidad de oportunidad
export async function actualizarProbabilidadOportunidad(
  id: string,
  probabilidad: number
): Promise<CrmOportunidad> {
  return updateOportunidad(id, { probabilidad })
}
