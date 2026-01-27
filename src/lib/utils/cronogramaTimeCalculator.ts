// ===================================================
// 📁 Archivo: cronogramaTimeCalculator.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Utilidades de cálculo de tiempo para cronogramas GYS
// ✅ Implementa cálculos temporales según reglas GYS-GEN
// ===================================================

import { obtenerCalendarioLaboral, calcularFechaFinConCalendario, ajustarFechaADiaLaborable } from './calendarioLaboral'

export interface TimeCalculationOptions {
  calendarioLaboral?: any
  duracionesPorDefecto?: {
    edt: number
    actividad: number
    tarea: number
  }
}

export interface TimeCalculationResult {
  fechaInicio: Date
  fechaFin: Date
  duracionDias: number
  horasEstimadas: number
  calendarioUsado: any
}

// ✅ GYS-GEN-01: Calcular fecha de inicio secuencial para hermanos
export function calcularFechaInicioSecuencial(
  fechaFinHermanoAnterior: Date,
  calendarioLaboral?: any
): Date {
  // FS+0: Inicia al día siguiente del hermano anterior
  const fechaInicio = new Date(fechaFinHermanoAnterior.getTime() + 24 * 60 * 60 * 1000)

  // Ajustar a día laborable
  return ajustarFechaADiaLaborable(fechaInicio, calendarioLaboral)
}

// ✅ GYS-GEN-02: Calcular fecha de inicio anclada al padre
export function calcularFechaInicioAnclada(
  fechaInicioPadre: Date,
  calendarioLaboral?: any
): Date {
  // El primer hijo siempre inicia en la fecha del padre
  return ajustarFechaADiaLaborable(fechaInicioPadre, calendarioLaboral)
}

// ✅ GYS-GEN-05: Calcular duración basada en horas y calendario
export function calcularDuracionDesdeHoras(
  horasTotales: number,
  calendarioLaboral?: any,
  duracionPorDefecto?: number
): number {
  if (!calendarioLaboral) {
    // Fallback sin calendario
    return duracionPorDefecto || Math.ceil(horasTotales / 8)
  }

  if (horasTotales > 0 && calendarioLaboral.horasPorDia > 0) {
    return Math.ceil(horasTotales / calendarioLaboral.horasPorDia)
  }

  return duracionPorDefecto || 1
}

// ✅ GYS-GEN-03: Calcular horas por roll-up de hijos
export function calcularHorasRollup(hijos: Array<{ horasEstimadas?: number }>): number {
  return hijos.reduce((total, hijo) => total + (hijo.horasEstimadas || 0), 0)
}

// ✅ GYS-GEN-04: Calcular fechas de padre por roll-up
export function calcularFechasPadreRollup(hijos: Array<{ fechaInicioComercial?: Date, fechaFinComercial?: Date }>): {
  fechaInicio: Date | null
  fechaFin: Date | null
} {
  if (hijos.length === 0) {
    return { fechaInicio: null, fechaFin: null }
  }

  const fechasInicio = hijos
    .map(h => h.fechaInicioComercial)
    .filter(f => f !== undefined) as Date[]

  const fechasFin = hijos
    .map(h => h.fechaFinComercial)
    .filter(f => f !== undefined) as Date[]

  const fechaInicio = fechasInicio.length > 0 ? new Date(Math.min(...fechasInicio.map(f => f.getTime()))) : null
  const fechaFin = fechasFin.length > 0 ? new Date(Math.max(...fechasFin.map(f => f.getTime()))) : null

  return { fechaInicio, fechaFin }
}

// ✅ GYS-GEN-10: Obtener duración por defecto según nivel
export function obtenerDuracionPorDefecto(
  nivel: 'edt' | 'actividad' | 'tarea',
  options?: TimeCalculationOptions
): number {
  const defaults = options?.duracionesPorDefecto || {
    edt: 45,
    actividad: 7,
    tarea: 2
  }

  return defaults[nivel]
}

// ✅ Función principal: Calcular tiempo completo para un elemento
export async function calcularTiempoElemento(
  tipo: 'fase' | 'edt' | 'actividad' | 'tarea',
  horasTotales: number,
  fechaInicioBase: Date,
  options: TimeCalculationOptions = {}
): Promise<TimeCalculationResult> {
  // Obtener calendario laboral
  let calendarioLaboral = options.calendarioLaboral
  if (!calendarioLaboral) {
    calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
  }

  // Calcular duración
  let duracionDias: number
  if (tipo === 'fase') {
    // Las fases tienen duraciones fijas configuradas
    duracionDias = horasTotales // Para fases, horasTotales representa días
  } else {
    // Para otros niveles, calcular basado en horas
    const duracionPorDefecto = obtenerDuracionPorDefecto(tipo, options)
    duracionDias = calcularDuracionDesdeHoras(horasTotales, calendarioLaboral, duracionPorDefecto)
  }

  // Calcular fecha fin
  const fechaInicio = ajustarFechaADiaLaborable(fechaInicioBase, calendarioLaboral)
  const fechaFin = calcularFechaFinConCalendario(fechaInicio, duracionDias * (calendarioLaboral?.horasPorDia || 8), calendarioLaboral)

  return {
    fechaInicio,
    fechaFin,
    duracionDias,
    horasEstimadas: horasTotales,
    calendarioUsado: calendarioLaboral
  }
}

// ✅ Calcular tiempo para EDTs secuenciales dentro de una fase
export async function calcularTiempoEdtsSecuenciales(
  edts: Array<{ id: string, horasTotales: number }>,
  fechaInicioFase: Date,
  options: TimeCalculationOptions = {}
): Promise<Array<TimeCalculationResult & { id: string }>> {
  const resultados: Array<TimeCalculationResult & { id: string }> = []

  let fechaInicioActual = new Date(fechaInicioFase)

  for (const edt of edts) {
    const resultado = await calcularTiempoElemento('edt', edt.horasTotales, fechaInicioActual, options)
    resultados.push({ ...resultado, id: edt.id })

    // ✅ GYS-GEN-01: Siguiente EDT inicia después del anterior
    fechaInicioActual = calcularFechaInicioSecuencial(resultado.fechaFin, options.calendarioLaboral)
  }

  return resultados
}

// ✅ Calcular tiempo para actividades secuenciales dentro de un EDT
export async function calcularTiempoActividadesSecuenciales(
  actividades: Array<{ id: string, horasTotales: number }>,
  fechaInicioEdt: Date,
  options: TimeCalculationOptions = {}
): Promise<Array<TimeCalculationResult & { id: string }>> {
  const resultados: Array<TimeCalculationResult & { id: string }> = []

  let fechaInicioActual = new Date(fechaInicioEdt)

  for (const actividad of actividades) {
    const resultado = await calcularTiempoElemento('actividad', actividad.horasTotales, fechaInicioActual, options)
    resultados.push({ ...resultado, id: actividad.id })

    // ✅ GYS-GEN-01: Siguiente actividad inicia después de la anterior
    fechaInicioActual = calcularFechaInicioSecuencial(resultado.fechaFin, options.calendarioLaboral)
  }

  return resultados
}

// ✅ Calcular tiempo para tareas distribuidas dentro de una actividad
export function calcularTiempoTareasDistribuidas(
  tareas: Array<{ id: string, horasTotales: number }>,
  fechaInicioActividad: Date,
  fechaFinActividad: Date,
  options: TimeCalculationOptions = {}
): Array<TimeCalculationResult & { id: string }> {
  const resultados: Array<TimeCalculationResult & { id: string }> = []

  if (tareas.length === 0) return resultados

  const calendarioLaboral = options.calendarioLaboral
  const duracionActividadDias = Math.max(1, Math.ceil((fechaFinActividad.getTime() - fechaInicioActividad.getTime()) / (24 * 60 * 60 * 1000)))
  const diasPorTarea = Math.max(1, Math.floor(duracionActividadDias / tareas.length))

  let fechaInicioActual = new Date(fechaInicioActividad)

  for (let i = 0; i < tareas.length; i++) {
    const tarea = tareas[i]

    // Calcular duración de la tarea
    const duracionPorDefecto = obtenerDuracionPorDefecto('tarea', options)
    const duracionTareaDias = calcularDuracionDesdeHoras(tarea.horasTotales, calendarioLaboral, duracionPorDefecto)

    // Limitar duración al espacio disponible
    const duracionLimitada = Math.min(duracionTareaDias, diasPorTarea)

    // Calcular fechas
    const fechaInicio = ajustarFechaADiaLaborable(fechaInicioActual, calendarioLaboral)
    const fechaFin = calcularFechaFinConCalendario(fechaInicio, duracionLimitada * (calendarioLaboral?.horasPorDia || 8), calendarioLaboral)

    resultados.push({
      id: tarea.id,
      fechaInicio,
      fechaFin,
      duracionDias: duracionLimitada,
      horasEstimadas: tarea.horasTotales,
      calendarioUsado: calendarioLaboral
    })

    // Avanzar para siguiente tarea
    fechaInicioActual = new Date(fechaFin.getTime() + 24 * 60 * 60 * 1000)
  }

  return resultados
}

// ✅ Validar consistencia temporal de un árbol
export function validarConsistenciaTemporal(
  nodos: Array<{
    id: string
    tipo: string
    fechaInicio?: Date
    fechaFin?: Date
    hijos?: Array<{ fechaInicio?: Date, fechaFin?: Date }>
  }>
): Array<{ nodoId: string, tipo: string, problema: string }> {
  const problemas: Array<{ nodoId: string, tipo: string, problema: string }> = []

  for (const nodo of nodos) {
    // Validar que el padre contenga a todos sus hijos
    if (nodo.hijos && nodo.hijos.length > 0 && nodo.fechaInicio && nodo.fechaFin) {
      for (const hijo of nodo.hijos) {
        if (hijo.fechaInicio && hijo.fechaFin) {
          if (hijo.fechaInicio < nodo.fechaInicio || hijo.fechaFin > nodo.fechaFin) {
            problemas.push({
              nodoId: nodo.id,
              tipo: nodo.tipo,
              problema: `Hijo fuera del rango temporal del padre`
            })
          }
        }
      }
    }

    // Validar que start < finish
    if (nodo.fechaInicio && nodo.fechaFin && nodo.fechaInicio >= nodo.fechaFin) {
      problemas.push({
        nodoId: nodo.id,
        tipo: nodo.tipo,
        problema: `Fecha de inicio debe ser anterior a fecha de fin`
      })
    }
  }

  return problemas
}

// ✅ Función de utilidad para formatear duración en formato MS Project
export function formatearDuracionMSProject(duracionDias: number, horasPorDia: number = 8): string {
  const horasTotales = duracionDias * horasPorDia

  if (horasTotales < 24) {
    return `PT${Math.round(horasTotales)}H0M0S`
  } else {
    const dias = Math.floor(horasTotales / horasPorDia)
    const horasRestantes = horasTotales % horasPorDia
    return `PT${dias}D${Math.round(horasRestantes)}H0M0S`
  }
}