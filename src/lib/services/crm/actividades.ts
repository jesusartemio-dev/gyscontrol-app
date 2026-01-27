// ===================================================
// 📁 Archivo: actividades.ts
// 📌 Ubicación: src/lib/services/crm/actividades.ts
// 🔧 Descripción: Servicios para gestión de actividades CRM
// ✅ Funciones para crear, leer actividades de oportunidades
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { buildApiUrl } from '@/lib/utils'

// Tipos para actividades
export interface CrmActividad {
  id: string
  oportunidadId: string
  tipo: string
  descripcion: string
  fecha: string
  resultado?: string
  notas?: string
  usuarioId: string
  createdAt: string
  updatedAt: string

  // Relaciones
  user?: {
    id: string
    name: string
    email: string
  }
  crmOportunidad?: {
    id: string
    nombre: string
    cliente?: {
      id: string
      nombre: string
      codigo: string
    }
  }
}

export interface CrmActividadCreate {
  tipo: string
  descripcion: string
  fecha?: string
  resultado?: string
  notas?: string
}

export interface CrmActividadFilters {
  tipo?: string
  resultado?: string
  fechaDesde?: string
  fechaHasta?: string
}

export interface CrmActividadPagination {
  page?: number
  limit?: number
}

export interface CrmActividadResponse {
  data: CrmActividad[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  estadisticas: Record<string, number>
}

// ✅ Obtener actividades de una oportunidad
export async function getActividadesOportunidad(
  oportunidadId: string,
  filters: CrmActividadFilters = {},
  pagination: CrmActividadPagination = {}
): Promise<CrmActividadResponse> {
  try {
    const params = new URLSearchParams()

    // Filtros
    if (filters.tipo) params.append('tipo', filters.tipo)
    if (filters.resultado) params.append('resultado', filters.resultado)
    if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde)
    if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta)

    // Paginación
    if (pagination.page) params.append('page', pagination.page.toString())
    if (pagination.limit) params.append('limit', pagination.limit.toString())

    const url = buildApiUrl(`/api/crm/oportunidades/${oportunidadId}/actividades?${params.toString()}`)

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener actividades: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getActividadesOportunidad:', error)
    throw error
  }
}

// ✅ Crear nueva actividad para una oportunidad
export async function createActividadOportunidad(
  oportunidadId: string,
  data: CrmActividadCreate
): Promise<CrmActividad> {
  try {
    const response = await fetch(buildApiUrl(`/api/crm/oportunidades/${oportunidadId}/actividades`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Error al crear actividad: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en createActividadOportunidad:', error)
    throw error
  }
}

// ✅ Tipos de actividades comunes
export const TIPOS_ACTIVIDAD = {
  LLAMADA: 'llamada',
  EMAIL: 'email',
  REUNION: 'reunión',
  PROPUESTA: 'propuesta',
  SEGUIMIENTO: 'seguimiento',
  VISITA: 'visita',
  DEMOSTRACION: 'demostración'
} as const

export type TipoActividad = typeof TIPOS_ACTIVIDAD[keyof typeof TIPOS_ACTIVIDAD]

// ✅ Resultados de actividades comunes
export const RESULTADOS_ACTIVIDAD = {
  POSITIVO: 'positivo',
  NEUTRO: 'neutro',
  NEGATIVO: 'negativo',
  PENDIENTE: 'pendiente'
} as const

export type ResultadoActividad = typeof RESULTADOS_ACTIVIDAD[keyof typeof RESULTADOS_ACTIVIDAD]

// ✅ Funciones helper para crear actividades comunes
export async function registrarLlamada(
  oportunidadId: string,
  descripcion: string,
  resultado?: ResultadoActividad,
  notas?: string
): Promise<CrmActividad> {
  return createActividadOportunidad(oportunidadId, {
    tipo: TIPOS_ACTIVIDAD.LLAMADA,
    descripcion,
    resultado,
    notas
  })
}

export async function registrarEmail(
  oportunidadId: string,
  descripcion: string,
  resultado?: ResultadoActividad,
  notas?: string
): Promise<CrmActividad> {
  return createActividadOportunidad(oportunidadId, {
    tipo: TIPOS_ACTIVIDAD.EMAIL,
    descripcion,
    resultado,
    notas
  })
}

export async function registrarReunion(
  oportunidadId: string,
  descripcion: string,
  fecha?: string,
  resultado?: ResultadoActividad,
  notas?: string
): Promise<CrmActividad> {
  return createActividadOportunidad(oportunidadId, {
    tipo: TIPOS_ACTIVIDAD.REUNION,
    descripcion,
    fecha,
    resultado,
    notas
  })
}

export async function registrarPropuesta(
  oportunidadId: string,
  descripcion: string,
  resultado?: ResultadoActividad,
  notas?: string
): Promise<CrmActividad> {
  return createActividadOportunidad(oportunidadId, {
    tipo: TIPOS_ACTIVIDAD.PROPUESTA,
    descripcion,
    resultado,
    notas
  })
}

export async function registrarSeguimiento(
  oportunidadId: string,
  descripcion: string,
  resultado?: ResultadoActividad,
  notas?: string
): Promise<CrmActividad> {
  return createActividadOportunidad(oportunidadId, {
    tipo: TIPOS_ACTIVIDAD.SEGUIMIENTO,
    descripcion,
    resultado,
    notas
  })
}

// ✅ Obtener todas las actividades del CRM (vista general)
export async function getAllActividades(
  filters: CrmActividadFilters = {},
  pagination: CrmActividadPagination = {}
): Promise<CrmActividadResponse> {
  try {
    const params = new URLSearchParams()

    // Filtros
    if (filters.tipo) params.append('tipo', filters.tipo)
    if (filters.resultado) params.append('resultado', filters.resultado)
    if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde!)
    if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta!)

    // Paginación
    if (pagination.page) params.append('page', pagination.page.toString())
    if (pagination.limit) params.append('limit', pagination.limit.toString())

    const url = buildApiUrl(`/api/crm/actividades?${params.toString()}`)

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener actividades: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getAllActividades:', error)
    throw error
  }
}
