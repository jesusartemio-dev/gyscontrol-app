// 📡 Servicios para gestión de datos Gantt
// Manejo de datos de cronograma, métricas y análisis de proyectos

import { logger } from '@/lib/logger'
import type {
  GanttChartPayload,
  GanttTaskPayload,
  GanttMetricsPayload
} from '@/types/payloads'

// ✅ Configuración de API
const API_BASE = '/api/gantt'
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
}

// 🔁 Manejo de errores de API
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
  }
}

// 📡 Obtener datos del Gantt
export const getGanttData = async (proyectoServicioId: string): Promise<GanttChartPayload> => {
  try {
    const response = await fetch(`${API_BASE}/${proyectoServicioId}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS
    })
    
    await handleApiError(response)
    const data = await response.json()
    
    logger.info('✅ Datos del Gantt obtenidos correctamente', { proyectoServicioId })
    return data
    
  } catch (error) {
    logger.error('❌ Error al obtener datos del Gantt:', error)
    throw error
  }
}

// 🔁 Calcular métricas del proyecto
export const calcularMetricasProyecto = (ganttData: GanttChartPayload): GanttMetricsPayload => {
  const { tareas } = ganttData
  
  if (!tareas || tareas.length === 0) {
    return {
      progresoGeneral: 0,
      horasTotales: 0,
      horasCompletadas: 0,
      eficiencia: 0,
      fechaInicioProyecto: new Date().toISOString(),
      fechaFinProyecto: new Date().toISOString(),
      tareasTotal: 0,
      tareasCompletadas: 0,
      tareasPendientes: 0,
      tareasEnProgreso: 0
    }
  }
  
  const tareasTotal = tareas.length
  const tareasCompletadas = tareas.filter(t => t.progreso === 100).length
  const tareasEnProgreso = tareas.filter(t => t.progreso > 0 && t.progreso < 100).length
  const tareasPendientes = tareas.filter(t => t.progreso === 0).length
  
  const progresoGeneral = Math.round(
    tareas.reduce((acc, tarea) => acc + (tarea.progreso || 0), 0) / tareasTotal
  )
  
  const horasTotales = tareas.reduce((acc, tarea) => acc + (tarea.horasEstimadas || 0), 0)
  const horasCompletadas = tareas.reduce((acc, tarea) => acc + (tarea.horasReales || 0), 0)
  
  const eficiencia = horasTotales > 0 ? Math.round((horasCompletadas / horasTotales) * 100) : 0
  
  // Calcular fechas del proyecto
  const fechasInicio = tareas
    .filter(t => t.fechaInicio)
    .map(t => new Date(t.fechaInicio))
    .sort((a, b) => a.getTime() - b.getTime())
  
  const fechasFinalizacion = tareas
    .filter(t => t.fechaFin)
    .map(t => new Date(t.fechaFin!))
    .sort((a, b) => b.getTime() - a.getTime())
  
  const fechaInicioProyecto = fechasInicio.length > 0 
    ? fechasInicio[0].toISOString()
    : new Date().toISOString()
    
  const fechaFinProyecto = fechasFinalizacion.length > 0 
    ? fechasFinalizacion[0].toISOString()
    : new Date().toISOString()
  
  // Calcular días de retraso si hay fechas reales
  const tareasConRetraso = tareas.filter(t => 
    t.fechaFinReal && t.fechaFin && 
    new Date(t.fechaFinReal) > new Date(t.fechaFin)
  )
  
  const diasRetraso = tareasConRetraso.length > 0 
    ? Math.max(...tareasConRetraso.map(t => 
        Math.ceil((new Date(t.fechaFinReal!).getTime() - new Date(t.fechaFin).getTime()) / (1000 * 60 * 60 * 24))
      ))
    : 0
  
  return {
    progresoGeneral,
    horasTotales,
    horasCompletadas,
    eficiencia,
    fechaInicioProyecto,
    fechaFinProyecto,
    diasRetraso,
    tareasTotal,
    tareasCompletadas,
    tareasPendientes,
    tareasEnProgreso
  }
}

// 🔁 Generar timeline del proyecto
export const generarTimeline = (tareas: GanttTaskPayload[]): {
  fechaInicio: string
  fechaFin: string
  duracionDias: number
  hitos: { fecha: string; descripcion: string; tipo: 'inicio' | 'fin' | 'hito' }[]
} => {
  if (!tareas || tareas.length === 0) {
    const hoy = new Date().toISOString().split('T')[0]
    return {
      fechaInicio: hoy,
      fechaFin: hoy,
      duracionDias: 0,
      hitos: []
    }
  }
  
  // Obtener fechas válidas
  const fechasInicio = tareas
    .filter(t => t.fechaInicio)
    .map(t => new Date(t.fechaInicio!))
    .sort((a, b) => a.getTime() - b.getTime())
  
  const fechasFin = tareas
    .filter(t => t.fechaFin)
    .map(t => new Date(t.fechaFin!))
    .sort((a, b) => b.getTime() - a.getTime())
  
  const fechaInicio = fechasInicio.length > 0 
    ? fechasInicio[0].toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]
  
  const fechaFin = fechasFin.length > 0 
    ? fechasFin[0].toISOString().split('T')[0]
    : fechaInicio
  
  // Calcular duración
  const duracionDias = Math.ceil(
    (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Generar hitos
  const hitos: { fecha: string; descripcion: string; tipo: 'inicio' | 'fin' | 'hito' }[] = []
  
  // Hito de inicio
  hitos.push({
    fecha: fechaInicio,
    descripcion: 'Inicio del proyecto',
    tipo: 'inicio'
  })
  
  // Hitos de tareas críticas (alta prioridad)
  tareas
    .filter(t => t.prioridad === 'alta' && t.fechaFin)
    .forEach(tarea => {
      hitos.push({
        fecha: tarea.fechaFin!,
        descripcion: `Finalización: ${tarea.nombre}`,
        tipo: 'hito'
      })
    })
  
  // Hito de finalización
  if (fechaFin !== fechaInicio) {
    hitos.push({
      fecha: fechaFin,
      descripcion: 'Finalización del proyecto',
      tipo: 'fin'
    })
  }
  
  // Ordenar hitos por fecha
  hitos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  
  return {
    fechaInicio,
    fechaFin,
    duracionDias,
    hitos
  }
}

// 🔁 Identificar ruta crítica
export const identificarRutaCritica = (ganttData: GanttChartPayload): {
  rutaCritica: string[]
  tareasRutaCritica: GanttTaskPayload[]
  duracionRutaCritica: number
} => {
  const { tareas } = ganttData
  
  if (!tareas || tareas.length === 0) {
    return {
      rutaCritica: [],
      tareasRutaCritica: [],
      duracionRutaCritica: 0
    }
  }
  
  // Crear mapa de tareas por ID
  const tareasMap = new Map(tareas.map(t => [t.id, t]))
  
  // Crear grafo de dependencias (simplificado)
  const grafo = new Map<string, string[]>()
  tareas.forEach(tarea => {
    grafo.set(tarea.id, [])
  })
  
  // Identificar tareas sin dependencias (nodos raíz)
  const tareasRaiz = tareas.filter(t => {
    // Simplificación: consideramos tareas de alta prioridad como críticas
    return t.prioridad === 'alta' || t.progreso < 100
  })
  
  // Calcular ruta más larga (crítica)
  let rutaMasLarga: { camino: string[]; duracion: number } = { camino: [], duracion: 0 }
  
  tareasRaiz.forEach(tarea => {
    const ruta = calcularRutaMasLarga(tarea.id, grafo, tareasMap)
    if (ruta.duracion > rutaMasLarga.duracion) {
      rutaMasLarga = ruta
    }
  })
  
  const tareasRutaCritica = rutaMasLarga.camino
    .map(id => tareasMap.get(id)!)
    .filter(Boolean)
  
  return {
    rutaCritica: rutaMasLarga.camino,
    tareasRutaCritica,
    duracionRutaCritica: rutaMasLarga.duracion
  }
}

// 🔁 Calcular ruta más larga (auxiliar)
const calcularRutaMasLarga = (
  tareaId: string,
  grafo: Map<string, string[]>,
  tareasMap: Map<string, GanttTaskPayload>,
  visitados = new Set<string>()
): { camino: string[]; duracion: number } => {
  if (visitados.has(tareaId)) {
    return { camino: [], duracion: 0 }
  }
  
  visitados.add(tareaId)
  const tarea = tareasMap.get(tareaId)
  
  if (!tarea) {
    return { camino: [], duracion: 0 }
  }
  
  const dependencias = grafo.get(tareaId) || []
  let rutaMasLarga = { camino: [tareaId], duracion: tarea.horasEstimadas || 0 }
  
  dependencias.forEach(depId => {
    const rutaDep = calcularRutaMasLarga(depId, grafo, tareasMap, new Set(visitados))
    const duracionTotal = (tarea.horasEstimadas || 0) + rutaDep.duracion
    
    if (duracionTotal > rutaMasLarga.duracion) {
      rutaMasLarga = {
        camino: [tareaId, ...rutaDep.camino],
        duracion: duracionTotal
      }
    }
  })
  
  return rutaMasLarga
}

// 🔁 Analizar carga de trabajo
export const analizarCargaTrabajo = (ganttData: GanttChartPayload): {
  cargaPorAsignado: Record<string, {
    nombreAsignado: string
    tareasTotal: number
    horasEstimadas: number
    horasReales: number
    progreso: number
    eficiencia: number
  }>
  asignadosSobrecargados: string[]
} => {
  const { tareas } = ganttData
  
  if (!tareas || tareas.length === 0) {
    return {
      cargaPorAsignado: {},
      asignadosSobrecargados: []
    }
  }
  
  const cargaPorAsignado: Record<string, {
    nombreAsignado: string
    tareasTotal: number
    horasEstimadas: number
    horasReales: number
    progreso: number
    eficiencia: number
  }> = {}
  
  // Agrupar tareas por asignado
  tareas.forEach(tarea => {
    const asignadoId = tarea.responsable?.id || 'sin-asignar'
    const nombreAsignado = tarea.responsable?.nombre || 'Sin asignar'
    
    if (!cargaPorAsignado[asignadoId]) {
      cargaPorAsignado[asignadoId] = {
        nombreAsignado,
        tareasTotal: 0,
        horasEstimadas: 0,
        horasReales: 0,
        progreso: 0,
        eficiencia: 0
      }
    }
    
    const carga = cargaPorAsignado[asignadoId]
    carga.tareasTotal++
    carga.horasEstimadas += tarea.horasEstimadas || 0
    carga.horasReales += tarea.horasReales || 0
    carga.progreso += tarea.progreso || 0
  })
  
  // Calcular promedios y eficiencia
  Object.values(cargaPorAsignado).forEach(carga => {
    carga.progreso = Math.round(carga.progreso / carga.tareasTotal)
    carga.eficiencia = carga.horasEstimadas > 0 
      ? Math.round((carga.horasEstimadas / carga.horasReales) * 100)
      : 0
  })
  
  // Identificar sobrecargados (más de 40 horas estimadas)
  const asignadosSobrecargados = Object.entries(cargaPorAsignado)
    .filter(([_, carga]) => carga.horasEstimadas > 40)
    .map(([id]) => id)
  
  return {
    cargaPorAsignado,
    asignadosSobrecargados
  }
}

// 📡 Generar reporte completo de progreso
export const generarReporteProgreso = async (proyectoServicioId: string): Promise<{
  ganttData: GanttChartPayload
  metricas: GanttMetricsPayload
  timeline: ReturnType<typeof generarTimeline>
  rutaCritica: ReturnType<typeof identificarRutaCritica>
  cargaTrabajo: ReturnType<typeof analizarCargaTrabajo>
}> => {
  try {
    const ganttData = await getGanttData(proyectoServicioId)
    const metricas = calcularMetricasProyecto(ganttData)
    const timeline = generarTimeline(ganttData.tareas)
    const rutaCritica = identificarRutaCritica(ganttData)
    const cargaTrabajo = analizarCargaTrabajo(ganttData)
    
    logger.info('✅ Reporte de progreso generado correctamente', { proyectoServicioId })
    
    return {
      ganttData,
      metricas,
      timeline,
      rutaCritica,
      cargaTrabajo
    }
    
  } catch (error) {
    logger.error('❌ Error al generar reporte de progreso:', error)
    throw error
  }
}

// 🔁 Exportar datos del Gantt
export const exportarDatosGantt = (ganttData: GanttChartPayload, formato: 'json' | 'csv'): string => {
  try {
    if (formato === 'json') {
      return JSON.stringify(ganttData, null, 2)
    }
    
    if (formato === 'csv') {
      const { tareas } = ganttData
      
      // Headers del CSV
      const headers = [
        'ID', 'Nombre', 'Estado', 'Prioridad', 'Progreso (%)',
        'Fecha Inicio', 'Fecha Fin', 'Horas Estimadas', 'Horas Reales',
        'Asignado', 'Descripción'
      ]
      
      // Filas de datos
      const rows = tareas.map(tarea => {
        return [
          tarea.id,
          '"' + tarea.nombre + '"',
          tarea.estado,
          tarea.prioridad,
          tarea.progreso || 0,
          tarea.fechaInicio || '',
          tarea.fechaFin || '',
          tarea.horasEstimadas || 0,
          tarea.horasReales || 0,
          '"' + (tarea.responsable?.nombre || '') + '"',
          '"' + tarea.nombre + '"'
        ]
      })
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }
    
    throw new Error(`Formato no soportado: ${formato}`)
    
  } catch (error) {
    console.error('❌ Error al exportar datos del Gantt:', error)
    throw error
  }
}