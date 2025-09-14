// ===================================================
// 📁 Archivo: tareas.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio de negocio para gestión de tareas
//    Funciones: CRUD completo, validaciones, lógica de negocio
//
// 🧠 Funcionalidades:
//    - Operaciones CRUD con validación
//    - Fetch optimizado con cache
//    - Manejo de errores estandarizado
//    - Transformación de datos
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import type { Tarea } from '@/types/modelos'
import type {
  TareaPayload,
  TareaUpdatePayload,
  TareasPaginationParams,
  PaginatedResponse
} from '@/types/payloads'

// 🔧 Configuración base para fetch
const API_BASE = '/api/tareas'
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
}

// 🔍 Función auxiliar para manejo de errores
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
  }
  return response
}

// 📡 Obtener lista de tareas con filtros y paginación
export const getTareas = async (params?: TareasPaginationParams): Promise<PaginatedResponse<Tarea>> => {
  try {
    // 🔍 Construir query string
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
    }
    
    const url = `${API_BASE}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    // 📡 Realizar petición
    const response = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      cache: 'no-store' // Siempre obtener datos frescos
    })
    
    await handleApiError(response)
    return await response.json()
    
  } catch (error) {
    console.error('❌ Error al obtener tareas:', error)
    throw error
  }
}

// 📡 Obtener tarea por ID
export const getTareaById = async (id: string): Promise<Tarea> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      cache: 'no-store'
    })
    
    await handleApiError(response)
    return await response.json()
    
  } catch (error) {
    console.error(`❌ Error al obtener tarea ${id}:`, error)
    throw error
  }
}

// 📡 Crear nueva tarea
export const createTarea = async (data: TareaPayload): Promise<Tarea> => {
  try {
    // ✅ Validaciones básicas del lado cliente
    if (!data.nombre?.trim()) {
      throw new Error('El nombre de la tarea es requerido')
    }
    
    if (!data.proyectoServicioId) {
      throw new Error('El proyecto servicio es requerido')
    }
    
    if (!data.responsableId) {
      throw new Error('El responsable es requerido')
    }
    
    if (!data.fechaInicio || !data.fechaFin) {
      throw new Error('Las fechas de inicio y fin son requeridas')
    }
    
    // Validar que fechaFin > fechaInicio
    const fechaInicio = new Date(data.fechaInicio)
    const fechaFin = new Date(data.fechaFin)
    
    if (fechaFin <= fechaInicio) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
    }
    
    // 📡 Realizar petición
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(data)
    })
    
    await handleApiError(response)
    return await response.json()
    
  } catch (error) {
    console.error('❌ Error al crear tarea:', error)
    throw error
  }
}

// 📡 Actualizar tarea existente
export const updateTarea = async (id: string, data: TareaUpdatePayload): Promise<Tarea> => {
  try {
    // ✅ Validaciones básicas del lado cliente
    if (data.nombre !== undefined && !data.nombre?.trim()) {
      throw new Error('El nombre de la tarea no puede estar vacío')
    }
    
    // Validar fechas si se proporcionan ambas
    if (data.fechaInicio && data.fechaFin) {
      const fechaInicio = new Date(data.fechaInicio)
      const fechaFin = new Date(data.fechaFin)
      
      if (fechaFin <= fechaInicio) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
      }
    }
    
    // Validar progreso
    if (data.progreso !== undefined && (data.progreso < 0 || data.progreso > 100)) {
      throw new Error('El progreso debe estar entre 0 y 100')
    }
    
    // Validar horas
    if (data.horasEstimadas !== undefined && data.horasEstimadas < 0) {
      throw new Error('Las horas estimadas no pueden ser negativas')
    }
    
    if (data.horasReales !== undefined && data.horasReales < 0) {
      throw new Error('Las horas reales no pueden ser negativas')
    }
    
    // 📡 Realizar petición
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(data)
    })
    
    await handleApiError(response)
    return await response.json()
    
  } catch (error) {
    console.error(`❌ Error al actualizar tarea ${id}:`, error)
    throw error
  }
}

// 📡 Eliminar tarea
export const deleteTarea = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS
    })
    
    await handleApiError(response)
    
  } catch (error) {
    console.error(`❌ Error al eliminar tarea ${id}:`, error)
    throw error
  }
}

// 📊 Obtener tareas por proyecto servicio
export const getTareasByProyectoServicio = async (proyectoServicioId: string): Promise<Tarea[]> => {
  try {
    const response = await getTareas({
      proyectoServicioId,
      limit: 1000, // Obtener todas las tareas del proyecto
      sortBy: 'fechaInicio',
      sortOrder: 'asc'
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener tareas del proyecto ${proyectoServicioId}:`, error)
    throw error
  }
}

// 📊 Obtener tareas por responsable
export const getTareasByResponsable = async (responsableId: string): Promise<Tarea[]> => {
  try {
    const response = await getTareas({
      responsableId,
      limit: 1000,
      sortBy: 'fechaInicio',
      sortOrder: 'asc'
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener tareas del responsable ${responsableId}:`, error)
    throw error
  }
}

// 📊 Obtener tareas por estado
export const getTareasByEstado = async (estado: string, proyectoServicioId?: string): Promise<Tarea[]> => {
  try {
    const response = await getTareas({
      estado,
      proyectoServicioId,
      limit: 1000,
      sortBy: 'fechaInicio',
      sortOrder: 'asc'
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener tareas con estado ${estado}:`, error)
    throw error
  }
}

// 🔄 Cambiar estado de tarea con validaciones
export const cambiarEstadoTarea = async (id: string, nuevoEstado: string): Promise<Tarea> => {
  try {
    // 🔍 Obtener tarea actual para validaciones
    const tareaActual = await getTareaById(id)
    
    // ✅ Validaciones de transición de estado
    const transicionesValidas: Record<string, string[]> = {
      'pendiente': ['en_progreso', 'cancelada'],
      'en_progreso': ['completada', 'pausada', 'cancelada'],
      'pausada': ['en_progreso', 'cancelada'],
      'completada': [], // No se puede cambiar desde completada
      'cancelada': ['pendiente'] // Solo se puede reactivar a pendiente
    }
    
    const estadosPermitidos = transicionesValidas[tareaActual.estado] || []
    
    if (!estadosPermitidos.includes(nuevoEstado)) {
      throw new Error(`No se puede cambiar de '${tareaActual.estado}' a '${nuevoEstado}'`)
    }
    
    // 📝 Preparar datos de actualización
    const updateData: TareaUpdatePayload = {
      estado: nuevoEstado as any
    }
    
    // 🔄 Lógica automática según el nuevo estado
    if (nuevoEstado === 'en_progreso' && !tareaActual.fechaInicioReal) {
      updateData.fechaInicioReal = new Date().toISOString()
    }
    
    if (nuevoEstado === 'completada') {
      updateData.fechaFinReal = new Date().toISOString()
      updateData.progreso = 100
    }
    
    return await updateTarea(id, updateData)
    
  } catch (error) {
    console.error(`❌ Error al cambiar estado de tarea ${id}:`, error)
    throw error
  }
}

// 📊 Actualizar progreso de tarea
export const actualizarProgreso = async (id: string, progreso: number): Promise<Tarea> => {
  try {
    if (progreso < 0 || progreso > 100) {
      throw new Error('El progreso debe estar entre 0 y 100')
    }
    
    const updateData: TareaUpdatePayload = {
      progreso
    }
    
    // Si se completa al 100%, cambiar estado automáticamente
    if (progreso === 100) {
      const tareaActual = await getTareaById(id)
      if (tareaActual.estado !== 'completada') {
        updateData.estado = 'completada'
        updateData.fechaFinReal = new Date().toISOString()
      }
    }
    
    return await updateTarea(id, updateData)
    
  } catch (error) {
    console.error(`❌ Error al actualizar progreso de tarea ${id}:`, error)
    throw error
  }
}

// 📊 Registrar horas trabajadas
export const registrarHoras = async (id: string, horasAdicionales: number): Promise<Tarea> => {
  try {
    if (horasAdicionales <= 0) {
      throw new Error('Las horas adicionales deben ser mayores a 0')
    }
    
    // 🔍 Obtener tarea actual
    const tareaActual = await getTareaById(id)
    
    const nuevasHorasReales = tareaActual.horasReales + horasAdicionales
    
    return await updateTarea(id, {
      horasReales: nuevasHorasReales
    })
    
  } catch (error) {
    console.error(`❌ Error al registrar horas en tarea ${id}:`, error)
    throw error
  }
}