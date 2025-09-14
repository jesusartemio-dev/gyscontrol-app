// ===================================================
// 📁 Archivo: subtareas.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio de negocio para gestión de subtareas
//    Funciones: CRUD completo, validaciones, lógica de negocio
//
// 🧠 Funcionalidades:
//    - Operaciones CRUD con validación
//    - Fetch optimizado con cache
//    - Manejo de errores estandarizado
//    - Gestión de orden y jerarquía
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import type { Subtarea } from '@/types/modelos'
import type {
  SubtareaPayload,
  SubtareaUpdatePayload,
  PaginatedResponse
} from '@/types/payloads'

// 🔧 Configuración base para fetch
const API_BASE = '/api/subtareas'
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

// 📡 Obtener lista de subtareas con filtros y paginación
export const getSubtareas = async (params?: {
  page?: number
  limit?: number
  search?: string
  tareaId?: string
  asignadoId?: string
  estado?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<PaginatedResponse<Subtarea>> => {
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
      cache: 'no-store'
    })
    
    await handleApiError(response)
    return await response.json()
    
  } catch (error) {
    console.error('❌ Error al obtener subtareas:', error)
    throw error
  }
}

// 📡 Obtener subtarea por ID
export const getSubtareaById = async (id: string): Promise<Subtarea> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      cache: 'no-store'
    })
    
    await handleApiError(response)
    return await response.json()
    
  } catch (error) {
    console.error(`❌ Error al obtener subtarea ${id}:`, error)
    throw error
  }
}

// 📡 Crear nueva subtarea
export const createSubtarea = async (data: SubtareaPayload): Promise<Subtarea> => {
  try {
    // ✅ Validaciones básicas del lado cliente
    if (!data.nombre?.trim()) {
      throw new Error('El nombre de la subtarea es requerido')
    }
    
    if (!data.tareaId) {
      throw new Error('La tarea padre es requerida')
    }
    
    // ✅ El orden se asigna automáticamente en el backend
    
    // Validar fechas si se proporcionan
    if (data.fechaInicio && data.fechaFin) {
      const fechaInicio = new Date(data.fechaInicio)
      const fechaFin = new Date(data.fechaFin)
      
      if (fechaFin <= fechaInicio) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
      }
    }
    
    // Validar horas
    if (data.horasEstimadas !== undefined && data.horasEstimadas < 0) {
      throw new Error('Las horas estimadas no pueden ser negativas')
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
    console.error('❌ Error al crear subtarea:', error)
    throw error
  }
}

// 📡 Actualizar subtarea existente
export const updateSubtarea = async (id: string, data: SubtareaUpdatePayload): Promise<Subtarea> => {
  try {
    // ✅ Validaciones básicas del lado cliente
    if (data.nombre !== undefined && !data.nombre?.trim()) {
      throw new Error('El nombre de la subtarea no puede estar vacío')
    }
    
    // ✅ El orden se maneja automáticamente en el backend
    
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
    console.error(`❌ Error al actualizar subtarea ${id}:`, error)
    throw error
  }
}

// 📡 Eliminar subtarea
export const deleteSubtarea = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS
    })
    
    await handleApiError(response)
    
  } catch (error) {
    console.error(`❌ Error al eliminar subtarea ${id}:`, error)
    throw error
  }
}

// 📊 Obtener subtareas por tarea
export const getSubtareasByTarea = async (tareaId: string): Promise<Subtarea[]> => {
  try {
    const response = await getSubtareas({
      tareaId,
      limit: 1000, // Obtener todas las subtareas de la tarea
      sortBy: 'orden',
      sortOrder: 'asc'
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener subtareas de la tarea ${tareaId}:`, error)
    throw error
  }
}

// 📊 Obtener subtareas por asignado
export const getSubtareasByAsignado = async (asignadoId: string): Promise<Subtarea[]> => {
  try {
    const response = await getSubtareas({
      asignadoId,
      limit: 1000,
      sortBy: 'orden',
      sortOrder: 'asc'
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener subtareas del asignado ${asignadoId}:`, error)
    throw error
  }
}

// 🔄 Cambiar estado de subtarea con validaciones
export const cambiarEstadoSubtarea = async (id: string, nuevoEstado: string): Promise<Subtarea> => {
  try {
    // 🔍 Obtener subtarea actual para validaciones
    const subtareaActual = await getSubtareaById(id)
    
    // ✅ Validaciones de transición de estado
    const transicionesValidas: Record<string, string[]> = {
      'pendiente': ['en_progreso', 'cancelada'],
      'en_progreso': ['completada', 'cancelada'],
      'completada': [], // No se puede cambiar desde completada
      'cancelada': ['pendiente'] // Solo se puede reactivar a pendiente
    }
    
    const estadosPermitidos = transicionesValidas[subtareaActual.estado] || []
    
    if (!estadosPermitidos.includes(nuevoEstado)) {
      throw new Error(`No se puede cambiar de '${subtareaActual.estado}' a '${nuevoEstado}'`)
    }
    
    // 📝 Preparar datos de actualización
    const updateData: SubtareaUpdatePayload = {
      estado: nuevoEstado as any
    }
    
    // 🔄 Lógica automática según el nuevo estado
    if (nuevoEstado === 'completada') {
      updateData.progreso = 100
    }
    
    return await updateSubtarea(id, updateData)
    
  } catch (error) {
    console.error(`❌ Error al cambiar estado de subtarea ${id}:`, error)
    throw error
  }
}

// 📊 Actualizar progreso de subtarea
export const actualizarProgresoSubtarea = async (id: string, progreso: number): Promise<Subtarea> => {
  try {
    if (progreso < 0 || progreso > 100) {
      throw new Error('El progreso debe estar entre 0 y 100')
    }
    
    const updateData: SubtareaUpdatePayload = {
      progreso
    }
    
    // Si se completa al 100%, cambiar estado automáticamente
    if (progreso === 100) {
      const subtareaActual = await getSubtareaById(id)
      if (subtareaActual.estado !== 'completada') {
        updateData.estado = 'completada'
      }
    }
    
    return await updateSubtarea(id, updateData)
    
  } catch (error) {
    console.error(`❌ Error al actualizar progreso de subtarea ${id}:`, error)
    throw error
  }
}

// 📊 Registrar horas trabajadas en subtarea
export const registrarHorasSubtarea = async (id: string, horasAdicionales: number): Promise<Subtarea> => {
  try {
    if (horasAdicionales <= 0) {
      throw new Error('Las horas adicionales deben ser mayores a 0')
    }
    
    // 🔍 Obtener subtarea actual
    const subtareaActual = await getSubtareaById(id)
    
    const nuevasHorasReales = subtareaActual.horasReales + horasAdicionales
    
    return await updateSubtarea(id, {
      horasReales: nuevasHorasReales
    })
    
  } catch (error) {
    console.error(`❌ Error al registrar horas en subtarea ${id}:`, error)
    throw error
  }
}

// 🔄 Reordenar subtareas
// ⚠️ DESHABILITADO: La propiedad 'orden' no está disponible en SubtareaUpdatePayload
// TODO: Implementar reordenamiento a través de endpoint específico
export const reordenarSubtareas = async (tareaId: string, subtareasOrdenadas: { id: string; orden: number }[]): Promise<void> => {
  console.warn('⚠️ Función reordenarSubtareas deshabilitada temporalmente')
  // Implementar llamada a endpoint específico para reordenamiento
  throw new Error('Función no implementada: reordenarSubtareas')
}

// 📊 Obtener siguiente orden disponible para una tarea
// ⚠️ DESHABILITADO: La propiedad 'orden' no está disponible en el modelo Subtarea
// TODO: Implementar lógica de orden a través del backend
export const getSiguienteOrden = async (tareaId: string): Promise<number> => {
  console.warn('⚠️ Función getSiguienteOrden deshabilitada temporalmente')
  // Por ahora retornamos 1 como valor por defecto
  return 1
}

// 📊 Duplicar subtarea
export const duplicarSubtarea = async (id: string): Promise<Subtarea> => {
  try {
    // 🔍 Obtener subtarea original
    const subtareaOriginal = await getSubtareaById(id)
    
    // 📊 Obtener siguiente orden disponible
    const siguienteOrden = await getSiguienteOrden(subtareaOriginal.tareaId)
    
    // 📝 Crear datos para la nueva subtarea
    const nuevaSubtareaData: SubtareaPayload = {
      tareaId: subtareaOriginal.tareaId,
      nombre: `${subtareaOriginal.nombre} (Copia)`,
      descripcion: subtareaOriginal.descripcion,
      estado: 'pendiente', // Siempre empezar como pendiente
      fechaInicio: subtareaOriginal.fechaInicio || new Date().toISOString(),
      fechaFin: subtareaOriginal.fechaFin || new Date().toISOString(),
      horasEstimadas: subtareaOriginal.horasEstimadas || 0,
      horasReales: 0, // Resetear horas reales
      progreso: 0, // Resetear progreso
      asignadoId: subtareaOriginal.asignadoId
    }
    
    return await createSubtarea(nuevaSubtareaData)
    
  } catch (error) {
    console.error(`❌ Error al duplicar subtarea ${id}:`, error)
    throw error
  }
}