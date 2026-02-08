// ===================================================
// 📁 Archivo: listaEquipo.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para la entidad ListaEquipo
// 🧠 Uso: Consumido por formularios, páginas y componentes (proyecto y logística)
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

import { ListaEquipo, ListaEquipoPayload, ListaEquipoUpdatePayload, EstadoListaEquipo } from '@/types'
import { buildApiUrl } from '@/lib/utils'

const BASE_URL = '/api/lista-equipo'
const MASTER_URL = '/api/lista-equipo/master'
const DETAIL_URL = '/api/lista-equipo/detail'

// 🎯 Types for optimized endpoints
export interface ListaEquipoMaster {
  id: string
  codigo: string
  nombre: string
  numeroSecuencia: number
  estado: EstadoListaEquipo
  createdAt: string
  updatedAt: string
  
  // 📊 Estadísticas calculadas para la vista Master
  stats: {
    totalItems: number
    itemsVerificados: number
    itemsAprobados: number
    itemsRechazados: number
    costoTotal: number
    costoAprobado: number
    // 📦 Estadísticas de pedidos
    itemsConPedido: number
    itemsSinPedido: number
    pedidosCompletos: number
    pedidosParciales: number
    pedidosPendientes: number
  }
  
  // 🏗️ Información mínima del proyecto
  proyecto: {
    id: string
    nombre: string
    codigo: string
  }
  
  responsable?: {
    id: string
    name: string
  }
  
  // 🎯 Coherencia calculada (porcentaje de consistencia)
  coherencia?: number
}

export interface ListaEquipoMasterResponse {
  data: ListaEquipoMaster[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface ListaEquipoFilters {
  proyectoId?: string
  estado?: string
  search?: string
  page?: number
  limit?: number
}

// ✅ Obtener todas las listas técnicas (modo logística, trae todo) - DEPRECATED
// Use getListasEquipoMaster for better performance
export async function getTodasLasListas(): Promise<ListaEquipo[]> {
  try {
    const url = buildApiUrl(BASE_URL)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Incluir cookies de sesión
      cache: 'no-store' // Siempre obtener datos frescos
    })
    
    if (!res.ok) {
      if (res.status === 401) {
        // Redirigir al login si no está autenticado
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return []
      }
      throw new Error(`Error ${res.status}: ${res.statusText}`)
    }
    
    return await res.json()
  } catch (error) {
    console.error('getTodasLasListas:', error)
    return []
  }
}

// ✅ Obtener listas técnicas filtradas por proyecto - DEPRECATED
// Use getListasEquipoMaster with proyectoId filter for better performance
export async function getListaEquiposPorProyecto(proyectoId: string): Promise<ListaEquipo[]> {
  try {
    const url = buildApiUrl(`${BASE_URL}?proyectoId=${proyectoId}`)
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener listas por proyecto')
    return await res.json()
  } catch (error) {
    console.error('getListaEquiposPorProyecto:', error)
    return []
  }
}

// ✅ Obtener una lista técnica por ID específico - DEPRECATED
// Use getListaEquipoDetail for complete data or getListaEquipoById for basic data
export async function getListaEquipoById(id: string): Promise<ListaEquipo | null> {
  try {
    const url = buildApiUrl(`${BASE_URL}/${id}`)
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      cache: 'no-store'
    })
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`Lista de equipos no encontrada: ${id}`)
        return null
      }
      if (res.status === 401) {
        console.warn('No autorizado para obtener lista de equipos')
        return null
      }
      console.error(`Error ${res.status}: ${res.statusText}`)
      return null
    }
    
    return await res.json()
  } catch (error) {
    console.error('getListaEquipoById:', error)
    return null
  }
}

// ✅ Crear una nueva lista técnica
export async function createListaEquipo(payload: ListaEquipoPayload): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('createListaEquipo:', error)
    return null
  }
}

// ✅ Actualizar lista técnica (PUT por id)
export async function updateListaEquipo(id: string, payload: ListaEquipoUpdatePayload): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('updateListaEquipo:', error)
    return null
  }
}

// ✅ Eliminar lista técnica
export async function deleteListaEquipo(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('deleteListaEquipo:', error)
    return false
  }
}

// ✅ Crear lista automáticamente desde equipos cotizados (solo para logística)
export async function createListaDesdeEquiposCotizados(proyectoId: string): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/from-proyecto/${proyectoId}`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Error al crear lista desde equipos cotizados')
    return await res.json()
  } catch (error) {
    console.error('createListaDesdeEquiposCotizados:', error)
    return null
  }
}

// ✅ Crear lista técnica desde un ProyectoEquipo específico (conversión directa)
export async function createListaDesdeProyectoEquipo(proyectoEquipoId: string, proyectoId: string): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/from-proyecto-equipo/${proyectoEquipoId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyectoId }),
    })
    if (!res.ok) throw new Error('Error al crear lista desde proyecto equipo')
    return await res.json()
  } catch (error) {
    console.error('createListaDesdeProyectoEquipo:', error)
    return null
  }
}

// ✅ Enviar lista a revisión técnica
export async function enviarListaARevision(listaId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/enviar/${listaId}`, {
      method: 'POST',
    })
    return res.ok
  } catch (error) {
    console.error('enviarListaARevision:', error)
    return false
  }
}

// ✅ Cambiar estado de la lista técnica (solo estado, no todo el objeto)
// 🔄 Las fechas se actualizan automáticamente en el backend según el cambio de estado
export async function updateListaEstado(id: string, nuevoEstado: string, motivoRechazo?: string): Promise<ListaEquipo | null> {
  try {
    const payload: Record<string, string> = { estado: nuevoEstado }
    if (motivoRechazo) payload.motivoRechazo = motivoRechazo

    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Error al cambiar estado de la lista')
    }
    return await res.json()
  } catch (error) {
    console.error('updateListaEstado:', error)
    throw error
  }
}

// ✅ Actualizar fecha necesaria de una lista
export async function updateFechaNecesaria(id: string, fechaNecesaria: string): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fechaNecesaria }),
    })
    if (!res.ok) throw new Error('Error al actualizar fecha necesaria')
    return await res.json()
  } catch (error) {
    console.error('updateFechaNecesaria:', error)
    return null
  }
}

// ✅ Obtener timeline de fechas de seguimiento de una lista
export function getTimelineFechas(lista: ListaEquipo | null | undefined) {
  // ✅ Validación defensiva para evitar errores si lista es null/undefined
  if (!lista) {
    return []
  }
  
  const timeline = []
  
  if (lista.createdAt) {
    timeline.push({
      fecha: lista.createdAt,
      estado: 'creado',
      descripcion: 'Lista creada',
      completado: true
    })
  }
  
  if (lista.fechaEnvioRevision) {
    timeline.push({
      fecha: lista.fechaEnvioRevision,
      estado: 'enviado_revision',
      descripcion: 'Enviado a revisión técnica',
      completado: true
    })
  }
  
  if (lista.fechaValidacion) {
    timeline.push({
      fecha: lista.fechaValidacion,
      estado: 'por_aprobar',
      descripcion: 'Lista validada técnicamente',
      completado: true
    })
  }
  
  if (lista.fechaAprobacionRevision) {
    timeline.push({
      fecha: lista.fechaAprobacionRevision,
      estado: 'aprobado',
      descripcion: 'Lista aprobada',
      completado: true
    })
  }
  
  if (lista.fechaEnvioLogistica) {
    timeline.push({
      fecha: lista.fechaEnvioLogistica,
      estado: 'enviado_logistica',
      descripcion: 'Enviado a logística',
      completado: true
    })
  }
  
  if (lista.fechaInicioCotizacion) {
    timeline.push({
      fecha: lista.fechaInicioCotizacion,
      estado: 'en_cotizacion',
      descripcion: 'Inicio de cotización',
      completado: true
    })
  }
  
  if (lista.fechaFinCotizacion) {
    timeline.push({
      fecha: lista.fechaFinCotizacion,
      estado: 'cotizado',
      descripcion: 'Cotización completada',
      completado: true
    })
  }
  
  if (lista.fechaAprobacionFinal) {
    timeline.push({
      fecha: lista.fechaAprobacionFinal,
      estado: 'aprobado_final',
      descripcion: 'Aprobación final',
      completado: true
    })
  }
  
  // 🔄 Agregar fecha necesaria si existe
  if (lista.fechaNecesaria) {
    timeline.push({
      fecha: lista.fechaNecesaria,
      estado: 'fecha_limite',
      descripcion: 'Fecha límite requerida',
      completado: false,
      esLimite: true
    })
  }
  
  return timeline.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
}

// ✅ Calcular días restantes hasta fecha necesaria
export function calcularDiasRestantes(fechaNecesaria: string | Date | null): number | null {
  if (!fechaNecesaria) return null
  
  const fecha = typeof fechaNecesaria === 'string' ? new Date(fechaNecesaria) : fechaNecesaria
  const hoy = new Date()
  const diferencia = fecha.getTime() - hoy.getTime()
  
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24))
}

// ✅ Obtener estado de tiempo basado en días restantes
export function getEstadoTiempo(diasRestantes: number | null): 'critico' | 'urgente' | 'normal' | null {
  if (diasRestantes === null) return null
  
  if (diasRestantes < 0) return 'critico' // Ya pasó la fecha
  if (diasRestantes <= 3) return 'critico'
  if (diasRestantes <= 7) return 'urgente'
  return 'normal'
}

// 🚀 NEW OPTIMIZED FUNCTIONS FOR PHASE 4

// ✅ Obtener listas con datos resumidos para vista Master (OPTIMIZED)
export async function getListasEquipoMaster(filters: ListaEquipoFilters = {}): Promise<ListaEquipoMasterResponse | null> {
  try {
    const params = new URLSearchParams()
    
    if (filters.proyectoId) params.append('proyectoId', filters.proyectoId)
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.search) params.append('search', filters.search)
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    
    const url = `${MASTER_URL}${params.toString() ? '?' + params.toString() : ''}`
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      cache: 'no-store'
    })
    
    if (!res.ok) {
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return null
      }
      throw new Error(`Error ${res.status}: ${res.statusText}`)
    }
    
    return await res.json()
  } catch (error) {
    console.error('getListasEquipoMaster:', error)
    return null
  }
}

// ✅ Obtener lista específica con datos completos para vista Detail (OPTIMIZED)
export async function getListaEquipoDetail(id: string): Promise<ListaEquipo | null> {
  try {
    const url = buildApiUrl(`${DETAIL_URL}/${id}`)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      cache: 'no-store'
    })

    if (!res.ok) {
      if (res.status === 401) {
        // Solo redirigir en el cliente, no en el servidor
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return null
      }
      if (res.status === 404) {
        return null
      }
      throw new Error(`Error ${res.status}: ${res.statusText}`)
    }

    return await res.json()
  } catch (error) {
    console.error('getListaEquipoDetail:', error)
    return null
  }
}

// ✅ Obtener listas resumidas por proyecto (wrapper for backward compatibility)
export async function getListasEquipoPorProyectoOptimized(proyectoId: string, page = 1, limit = 10): Promise<ListaEquipoMasterResponse | null> {
  return getListasEquipoMaster({ proyectoId, page, limit })
}

// ✅ Buscar listas con filtros avanzados
export async function searchListasEquipo(searchText: string, filters: Omit<ListaEquipoFilters, 'search'> = {}): Promise<ListaEquipoMasterResponse | null> {
  return getListasEquipoMaster({ ...filters, search: searchText })
}
