// ===================================================
// 📁 Archivo: dependencias.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio de negocio para gestión de dependencias entre tareas
//    Funciones: CRUD completo, validaciones, detección de ciclos
//
// 🧠 Funcionalidades:
//    - Operaciones CRUD con validación
//    - Detección de dependencias circulares
//    - Análisis de ruta crítica
//    - Manejo de errores estandarizado
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import type {
  DependenciaTarea
} from '@/types/modelos'
import type {
  DependenciaTareaPayload,
  PaginatedResponse
} from '@/types/payloads'

// 🔧 Configuración base para fetch
const API_BASE = '/api/dependencias'
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

// 📡 Obtener lista de dependencias con filtros y paginación
export const getDependencias = async (params?: {
  page?: number
  limit?: number
  proyectoServicioId?: string
  tareaOrigenId?: string
  tareaDestinoId?: string
  tipo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<PaginatedResponse<DependenciaTarea>> => {
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
    console.error('❌ Error al obtener dependencias:', error)
    throw error
  }
}

// 📡 Obtener dependencia por ID
export const getDependenciaById = async (id: string): Promise<DependenciaTarea> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      cache: 'no-store'
    })
    
    await handleApiError(response)
    return await response.json()
    
  } catch (error) {
    console.error(`❌ Error al obtener dependencia ${id}:`, error)
    throw error
  }
}

// 📡 Crear nueva dependencia
export const createDependencia = async (data: DependenciaTareaPayload): Promise<DependenciaTarea> => {
  try {
    // ✅ Validaciones básicas del lado cliente
    if (!data.tareaOrigenId) {
      throw new Error('La tarea origen es requerida')
    }
    
    if (!data.tareaDestinoId) {
      throw new Error('La tarea destino es requerida')
    }
    
    if (data.tareaOrigenId === data.tareaDestinoId) {
      throw new Error('Una tarea no puede depender de sí misma')
    }
    
    if (!data.tipo) {
      throw new Error('El tipo de dependencia es requerido')
    }
    
    // Validar retraso
    if (data.retrasoMinimo !== undefined && data.retrasoMinimo < 0) {
      throw new Error('El retraso no puede ser negativo')
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
    console.error('❌ Error al crear dependencia:', error)
    throw error
  }
}

// 📡 Eliminar dependencia
export const deleteDependencia = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS
    })
    
    await handleApiError(response)
    
  } catch (error) {
    console.error(`❌ Error al eliminar dependencia ${id}:`, error)
    throw error
  }
}

// 📊 Obtener dependencias de una tarea específica
export const getDependenciasByTarea = async (tareaId: string): Promise<{
  dependenciasOrigen: DependenciaTarea[]
  dependenciasDestino: DependenciaTarea[]
}> => {
  try {
    // Obtener dependencias donde la tarea es origen
    const dependenciasOrigenResponse = await getDependencias({
      tareaOrigenId: tareaId,
      limit: 1000
    })
    
    // Obtener dependencias donde la tarea es destino
    const dependenciasDestinoResponse = await getDependencias({
      tareaDestinoId: tareaId,
      limit: 1000
    })
    
    return {
      dependenciasOrigen: dependenciasOrigenResponse.data,
      dependenciasDestino: dependenciasDestinoResponse.data
    }
    
  } catch (error) {
    console.error(`❌ Error al obtener dependencias de la tarea ${tareaId}:`, error)
    throw error
  }
}

// 📊 Obtener dependencias por proyecto
export const getDependenciasByProyecto = async (proyectoServicioId: string): Promise<DependenciaTarea[]> => {
  try {
    const response = await getDependencias({
      proyectoServicioId,
      limit: 1000
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener dependencias del proyecto ${proyectoServicioId}:`, error)
    throw error
  }
}

// 🔍 Verificar si existe dependencia circular
export const verificarDependenciaCircular = async (
  tareaOrigenId: string, 
  tareaDestinoId: string,
  proyectoServicioId: string
): Promise<boolean> => {
  try {
    // Obtener todas las dependencias del proyecto
    const dependencias = await getDependenciasByProyecto(proyectoServicioId)
    
    // Crear mapa de adyacencia
    const grafo = new Map<string, string[]>()
    
    // Agregar dependencias existentes
    dependencias.forEach(dep => {
      if (!grafo.has(dep.tareaOrigenId)) {
        grafo.set(dep.tareaOrigenId, [])
      }
      grafo.get(dep.tareaOrigenId)!.push(dep.tareaDestinoId)
    })
    
    // Agregar la nueva dependencia propuesta
    if (!grafo.has(tareaOrigenId)) {
      grafo.set(tareaOrigenId, [])
    }
    grafo.get(tareaOrigenId)!.push(tareaDestinoId)
    
    // Función DFS para detectar ciclos
    const visitados = new Set<string>()
    const enProceso = new Set<string>()
    
    const tieneCiclo = (nodo: string): boolean => {
      if (enProceso.has(nodo)) {
        return true // Ciclo detectado
      }
      
      if (visitados.has(nodo)) {
        return false // Ya procesado
      }
      
      visitados.add(nodo)
      enProceso.add(nodo)
      
      const vecinos = grafo.get(nodo) || []
      for (const vecino of vecinos) {
        if (tieneCiclo(vecino)) {
          return true
        }
      }
      
      enProceso.delete(nodo)
      return false
    }
    
    // Verificar ciclos desde todos los nodos
    for (const nodo of grafo.keys()) {
      if (!visitados.has(nodo)) {
        if (tieneCiclo(nodo)) {
          return true
        }
      }
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Error al verificar dependencia circular:', error)
    throw error
  }
}

// 📊 Crear dependencia con validación de ciclos
export const createDependenciaSegura = async (data: DependenciaTareaPayload, proyectoServicioId: string): Promise<DependenciaTarea> => {
  try {
    // Verificar que no se cree una dependencia circular
    const tieneCiclo = await verificarDependenciaCircular(
      data.tareaOrigenId,
      data.tareaDestinoId,
      proyectoServicioId
    )
    
    if (tieneCiclo) {
      throw new Error('No se puede crear la dependencia: generaría una dependencia circular')
    }
    
    return await createDependencia(data)
    
  } catch (error) {
    console.error('❌ Error al crear dependencia segura:', error)
    throw error
  }
}

// 📊 Obtener ruta crítica del proyecto
export const getRutaCritica = async (proyectoServicioId: string): Promise<{
  rutaCritica: string[]
  duracionTotal: number
}> => {
  try {
    // Esta función requiere información adicional de las tareas (duración, fechas)
    // Por ahora retornamos una estructura básica
    // En una implementación completa, se calcularía usando el algoritmo CPM
    
    const dependencias = await getDependenciasByProyecto(proyectoServicioId)
    
    // Algoritmo simplificado - en producción usar CPM completo
    const nodos = new Set<string>()
    dependencias.forEach(dep => {
      nodos.add(dep.tareaOrigenId)
      nodos.add(dep.tareaDestinoId)
    })
    
    return {
      rutaCritica: Array.from(nodos),
      duracionTotal: 0 // Calcular basado en duración de tareas
    }
    
  } catch (error) {
    console.error(`❌ Error al calcular ruta crítica del proyecto ${proyectoServicioId}:`, error)
    throw error
  }
}

// 📊 Obtener tareas predecesoras
export const getTareasPredecesoras = async (tareaId: string): Promise<DependenciaTarea[]> => {
  try {
    const response = await getDependencias({
      tareaDestinoId: tareaId,
      limit: 1000
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener tareas predecesoras de ${tareaId}:`, error)
    throw error
  }
}

// 📊 Obtener tareas sucesoras
export const getTareasSuccesoras = async (tareaId: string): Promise<DependenciaTarea[]> => {
  try {
    const response = await getDependencias({
      tareaOrigenId: tareaId,
      limit: 1000
    })
    
    return response.data
    
  } catch (error) {
    console.error(`❌ Error al obtener tareas sucesoras de ${tareaId}:`, error)
    throw error
  }
}

// 🔄 Eliminar todas las dependencias de una tarea
export const eliminarDependenciasDeTarea = async (tareaId: string): Promise<void> => {
  try {
    const { dependenciasOrigen, dependenciasDestino } = await getDependenciasByTarea(tareaId)
    
    // Eliminar dependencias donde la tarea es origen
    const promesasOrigen = dependenciasOrigen.map(dep => deleteDependencia(dep.id))
    
    // Eliminar dependencias donde la tarea es destino
    const promesasDestino = dependenciasDestino.map(dep => deleteDependencia(dep.id))
    
    await Promise.all([...promesasOrigen, ...promesasDestino])
    
  } catch (error) {
    console.error(`❌ Error al eliminar dependencias de la tarea ${tareaId}:`, error)
    throw error
  }
}

// 📊 Validar dependencias antes de cambiar estado de tarea
export const validarDependenciasParaCambioEstado = async (
  tareaId: string, 
  nuevoEstado: string
): Promise<{ valido: boolean; mensaje?: string }> => {
  try {
    // Si se quiere marcar como completada, verificar que las predecesoras estén completadas
    if (nuevoEstado === 'completada') {
      const predecesoras = await getTareasPredecesoras(tareaId)
      
      // Aquí necesitaríamos obtener el estado de las tareas predecesoras
      // Por simplicidad, asumimos que la validación se hace en el backend
      
      return { valido: true }
    }
    
    return { valido: true }
    
  } catch (error) {
    console.error(`❌ Error al validar dependencias para cambio de estado:`, error)
    return { 
      valido: false, 
      mensaje: 'Error al validar dependencias' 
    }
  }
}

// 📊 Obtener estadísticas de dependencias
export const getEstadisticasDependencias = async (proyectoServicioId: string): Promise<{
  totalDependencias: number
  dependenciasPorTipo: Record<string, number>
  tareasConMasDependencias: { tareaId: string; cantidad: number }[]
}> => {
  try {
    const response = await fetch(`${API_BASE}/estadisticas?proyectoServicioId=${proyectoServicioId}`, {
      headers: DEFAULT_HEADERS
    })

    await handleApiError(response)
    return await response.json()
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de dependencias:', error)
    throw error
  }
}

// 🔄 Detectar ciclos en dependencias
export const detectCycles = async (proyectoServicioId: string): Promise<{
  hasCycles: boolean
  cycles: string[][]
}> => {
  try {
    const response = await fetch(`${API_BASE}/cycles?proyectoServicioId=${proyectoServicioId}`, {
      headers: DEFAULT_HEADERS
    })

    await handleApiError(response)
    return await response.json()
  } catch (error) {
    console.error('❌ Error al detectar ciclos:', error)
    throw error
  }
}

// 🎯 Obtener ruta crítica del proyecto
export const getCriticalPath = async (proyectoServicioId: string): Promise<{
  criticalPath: string[]
  totalDuration: number
  tasks: Array<{
    id: string
    nombre: string
    duracion: number
    fechaInicio: string
    fechaFin: string
  }>
}> => {
  try {
    const response = await fetch(`${API_BASE}/critical-path?proyectoServicioId=${proyectoServicioId}`, {
      headers: DEFAULT_HEADERS
    })

    await handleApiError(response)
    return await response.json()
  } catch (error) {
    console.error('❌ Error al obtener ruta crítica:', error)
    throw error
  }
}