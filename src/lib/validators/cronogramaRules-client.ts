// ===================================================
// 📁 Archivo: cronogramaRules-client.ts
// 📌 Ubicación: src/lib/validators/
// 🔧 Descripción: Validaciones de reglas GYS-GEN para cronogramas (client-safe)
//
// ✅ GYS-GEN-18: Re-encadenado temporal automático
// ✅ GYS-GEN-20: Validación de consistencia completa
// ✅ GYS-GEN-21: Monitoreo y alertas de consistencia
// ✍️ Autor: Kilo Code - Validaciones GYS
// 📅 Última actualización: 2025-10-12
// ===================================================

import { ajustarFechaADiaLaborable, calcularFechaFinConCalendario } from '@/lib/utils/calendarioLaboral-client'

export interface ValidationResult {
  valido: boolean
  tipo: string
  mensaje: string
  severidad: 'advertencia' | 'error' | 'critico'
  elementoId?: string
  elementoNombre?: string
}

export interface CorrectionResult {
  exito: boolean
  correcciones: string[]
  errores?: string[]
}

export interface ConsistenciaDashboard {
  temporal: {
    totalViolaciones: number
    violacionesFS1: number
    separacionesInsuficientes: number
    solapamientos: number
  }
  horas: {
    padresConHorasIncorrectas: number
    diferenciasPromedio: number
    casosCriticos: number
  }
  calendario: {
    fechasNoLaborables: number
    duracionesExcesivas: number
    excepcionesRequeridas: number
  }
  jerarquia: {
    padresSinContenerHijos: number
    hijosFueraDePadres: number
    rollupIncorrecto: number
  }
}

/**
 * GYS-GEN-18: Re-encadenado temporal automático de hermanos
 * Ejecuta recalcularSecuencia() en todo el árbol jerárquico
 */
export function recalcularSecuencia(nodoPadre: any, calendario: any): void {
  if (!nodoPadre || !calendario) return

  const hijos = obtenerHijosOrdenados(nodoPadre)

  for (let i = 0; i < hijos.length; i++) {
    // Validar que el hijo tenga propiedades válidas
    if (!hijos[i] || typeof hijos[i] !== 'object') continue

    if (i === 0) {
      // GYS-GEN-02: Primer hijo hereda fecha del padre
      if (nodoPadre.start instanceof Date && !isNaN(nodoPadre.start.getTime())) {
        hijos[i].start = ajustarFechaADiaLaborable(nodoPadre.start, calendario)
      } else {
        // Fallback: usar fecha actual si el padre no tiene fecha válida
        hijos[i].start = ajustarFechaADiaLaborable(new Date(), calendario)
      }
    } else {
      // GYS-GEN-01: Hermanos siguientes = FS+1 con 1 día laborable de separación
      if (hijos[i-1].finish instanceof Date && !isNaN(hijos[i-1].finish.getTime())) {
        const nextDay = new Date(hijos[i-1].finish)
        nextDay.setDate(nextDay.getDate() + 1) // Agregar 1 día
        hijos[i].start = ajustarFechaADiaLaborable(nextDay, calendario)
      } else {
        // Fallback: usar fecha del hermano anterior + 1 día
        const prevStart = hijos[i-1].start instanceof Date && !isNaN(hijos[i-1].start.getTime())
          ? hijos[i-1].start
          : new Date()
        hijos[i].start = ajustarFechaADiaLaborable(new Date(prevStart.getTime() + 24 * 60 * 60 * 1000), calendario)
      }
    }

    // Recalcular finish basado en duración y calendario
    const horasHijo = hijos[i].horas || hijos[i].horasEstimadas || 8 // fallback a 8 horas
    if (hijos[i].start instanceof Date && !isNaN(hijos[i].start.getTime())) {
      hijos[i].finish = calcularFechaFinConCalendario(hijos[i].start, horasHijo, calendario)
    } else {
      // Fallback: start + duración por defecto
      hijos[i].finish = new Date(Date.now() + (horasHijo * 60 * 60 * 1000))
    }

    // Recursión para hijos del hijo
    if (hijos[i].tieneHijos || hijos[i].children || hijos[i].edts || hijos[i].actividades || hijos[i].tareas) {
      recalcularSecuencia(hijos[i], calendario)
    }
  }

  // GYS-GEN-04: Roll-up automático del padre
  if (hijos.length > 0) {
    // Solo hacer roll-up si tenemos hijos con fechas válidas
    const hijosConFechas = hijos.filter((h: any) =>
      h.start instanceof Date && !isNaN(h.start.getTime()) &&
      h.finish instanceof Date && !isNaN(h.finish.getTime())
    )

    if (hijosConFechas.length > 0) {
      nodoPadre.start = new Date(Math.min(...hijosConFechas.map((h: any) => h.start.getTime())))
      nodoPadre.finish = new Date(Math.max(...hijosConFechas.map((h: any) => h.finish.getTime())))
      nodoPadre.horas = hijos.reduce((sum: number, h: any) => sum + (h.horas || h.horasEstimadas || 0), 0)
    }
  }
}

/**
  * GYS-GEN-20: Validación de consistencia temporal
  * Verifica que los hermanos estén encadenados FS+1 (con 1 día laborable de separación)
  */
export function validarConsistenciaTemporal(hijos: any[]): ValidationResult {
  if (!hijos || hijos.length < 2) {
    return { valido: true, tipo: 'GYS-GEN-18', mensaje: 'Sin hermanos para validar', severidad: 'advertencia' }
  }

  for (let i = 1; i < hijos.length; i++) {
    const hermanoAnterior = hijos[i-1]
    const hermanoActual = hijos[i]

    // Validar que ambos hermanos tengan fechas válidas
    if (!hermanoAnterior || !hermanoActual) continue

    const finishAnterior = hermanoAnterior.finish || hermanoAnterior.fechaFin
    const startActual = hermanoActual.start || hermanoActual.fechaInicio

    if (!(finishAnterior instanceof Date && !isNaN(finishAnterior.getTime())) ||
        !(startActual instanceof Date && !isNaN(startActual.getTime()))) {
      return {
        valido: false,
        tipo: 'GYS-GEN-18',
        mensaje: `Fechas inválidas entre ${hermanoAnterior.nombre || hermanoAnterior.id || 'elemento ' + i} y ${hermanoActual.nombre || hermanoActual.id || 'elemento ' + (i+1)}`,
        severidad: 'error',
        elementoId: hermanoActual.id,
        elementoNombre: hermanoActual.nombre
      }
    }

    const gap = startActual.getTime() - finishAnterior.getTime()
    const unDia = 24 * 60 * 60 * 1000
    const tresDias = 3 * 24 * 60 * 60 * 1000

    // Para FS+1, esperamos al menos 1 día de separación (puede ser más por fines de semana)
    if (gap < unDia) {
      return {
        valido: false,
        tipo: 'GYS-GEN-18',
        mensaje: `Violación FS+1: ${hermanoActual.nombre || hermanoActual.id} debe iniciar al menos 1 día después de ${hermanoAnterior.nombre || hermanoAnterior.id} (gap actual: ${Math.floor(gap/unDia)} días)`,
        severidad: gap < 0 ? 'critico' : 'error',
        elementoId: hermanoActual.id,
        elementoNombre: hermanoActual.nombre
      }
    }

    // Advertencia si la separación es excesiva (> 3 días)
    if (gap > tresDias) {
      return {
        valido: false,
        tipo: 'GYS-GEN-18',
        mensaje: `Separación excesiva FS+1: ${hermanoActual.nombre || hermanoActual.id} inicia ${Math.ceil(gap/unDia)} días después de ${hermanoAnterior.nombre || hermanoAnterior.id}`,
        severidad: 'advertencia',
        elementoId: hermanoActual.id,
        elementoNombre: hermanoActual.nombre
      }
    }
  }

  return { valido: true, tipo: 'GYS-GEN-18', mensaje: 'Consistencia temporal correcta', severidad: 'advertencia' }
}

/**
 * GYS-GEN-20: Validación de consistencia de horas padre-hijo
 * Verifica que horas(padre) = Σ horas(hijos)
 */
export function validarConsistenciaHoras(padre: any, hijos: any[]): ValidationResult {
  if (!padre || !hijos) {
    return { valido: false, tipo: 'GYS-GEN-03', mensaje: 'Datos insuficientes para validación', severidad: 'error' }
  }

  const horasPadre = padre.horas || padre.horasEstimadas || 0
  const sumaHijos = hijos.reduce((sum: number, h: any) => sum + (h.horas || h.horasEstimadas || 0), 0)
  const diferencia = Math.abs(horasPadre - sumaHijos)

  if (diferencia > 0.01) { // Tolerancia decimal
    return {
      valido: false,
      tipo: 'GYS-GEN-03',
      mensaje: `Inconsistencia de horas: ${padre.nombre || padre.id} tiene ${horasPadre}h pero suma de hijos = ${sumaHijos}h (diferencia: ${diferencia.toFixed(2)}h)`,
      severidad: diferencia > 1 ? 'critico' : 'error',
      elementoId: padre.id,
      elementoNombre: padre.nombre
    }
  }

  return { valido: true, tipo: 'GYS-GEN-03', mensaje: 'Consistencia de horas correcta', severidad: 'advertencia' }
}

/**
 * GYS-GEN-20: Validación completa antes de exportar
 * Ejecuta todas las validaciones críticas
 */
export function validarAntesDeExportar(cronograma: any): ValidationResult[] {
  const errores: ValidationResult[] = []

  if (!cronograma || !cronograma.fases) {
    errores.push({
      valido: false,
      tipo: 'GYS-GEN-20',
      mensaje: 'Estructura de cronograma inválida',
      severidad: 'critico'
    })
    return errores
  }

  // Validar consistencia temporal en todo el árbol
  for (const fase of cronograma.fases) {
    // Validar EDTs dentro de fase
    const validacionFase = validarConsistenciaTemporal(fase.edts || [])
    if (!validacionFase.valido) errores.push(validacionFase)

    // Validar horas fase-EDTs
    const horasFase = validarConsistenciaHoras(fase, fase.edts || [])
    if (!horasFase.valido) errores.push(horasFase)

    for (const edt of (fase.edts || [])) {
      // Validar actividades dentro de EDT
      const validacionEdt = validarConsistenciaTemporal(edt.actividades || [])
      if (!validacionEdt.valido) errores.push(validacionEdt)

      // Validar horas EDT-actividades
      const horasEdt = validarConsistenciaHoras(edt, edt.actividades || [])
      if (!horasEdt.valido) errores.push(horasEdt)

      for (const actividad of (edt.actividades || [])) {
        // Validar tareas dentro de actividad
        const validacionActividad = validarConsistenciaTemporal(actividad.tareas || [])
        if (!validacionActividad.valido) errores.push(validacionActividad)

        // Validar horas actividad-tareas
        const horasActividad = validarConsistenciaHoras(actividad, actividad.tareas || [])
        if (!horasActividad.valido) errores.push(horasActividad)
      }
    }
  }

  return errores
}

/**
 * GYS-GEN-20: Auto-corrección de inconsistencias
 * Corrige automáticamente problemas detectados
 */
export function autoCorregirInconsistencias(cronograma: any, calendario: any): CorrectionResult {
  const correcciones: string[] = []
  const errores: string[] = []

  try {
    if (!cronograma || !cronograma.fases) {
      errores.push('Estructura de cronograma inválida')
      return { exito: false, correcciones, errores }
    }

    // 1. Re-encadenar hermanos con FS+0
    for (const fase of cronograma.fases) {
      if (fase.edts && fase.edts.length > 0) {
        recalcularSecuencia(fase, calendario)
        correcciones.push(`Re-encadenado EDTs en fase ${fase.nombre}`)
      }

      for (const edt of (fase.edts || [])) {
        if (edt.actividades && edt.actividades.length > 0) {
          recalcularSecuencia(edt, calendario)
          correcciones.push(`Re-encadenado actividades en EDT ${edt.nombre}`)
        }

        for (const actividad of (edt.actividades || [])) {
          if (actividad.tareas && actividad.tareas.length > 0) {
            recalcularSecuencia(actividad, calendario)
            correcciones.push(`Re-encadenado tareas en actividad ${actividad.nombre}`)
          }
        }
      }
    }

    // 2. Roll-up final de fechas y horas
    for (const fase of cronograma.fases) {
      if (fase.edts && fase.edts.length > 0) {
        // Filtrar EDTs con fechas válidas
        const edtsConFechas = fase.edts.filter((e: any) =>
          e.start instanceof Date && !isNaN(e.start.getTime()) &&
          e.finish instanceof Date && !isNaN(e.finish.getTime())
        )

        if (edtsConFechas.length > 0) {
          fase.start = new Date(Math.min(...edtsConFechas.map((e: any) => e.start.getTime())))
          fase.finish = new Date(Math.max(...edtsConFechas.map((e: any) => e.finish.getTime())))
          fase.horas = fase.edts.reduce((sum: number, e: any) => sum + (e.horas || e.horasEstimadas || 0), 0)
          correcciones.push(`Roll-up final fase ${fase.nombre}`)
        } else {
          // Fallback si no hay EDTs con fechas válidas
          fase.start = new Date()
          fase.finish = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 días
          fase.horas = fase.edts.reduce((sum: number, e: any) => sum + (e.horas || e.horasEstimadas || 0), 0)
          correcciones.push(`Roll-up con fallback fase ${fase.nombre}`)
        }
      }
    }

    return { exito: true, correcciones }

  } catch (error) {
    errores.push(`Error en auto-corrección: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    return { exito: false, correcciones, errores }
  }
}

/**
  * GYS-GEN-16: Validación de Consistencia de Horas Padre-Hijo
  * Verifica que horas(padre) = Σ horas(hijos) en toda la jerarquía
  */
export function validarConsistenciaHorasJerarquia(cronograma: any): ValidationResult[] {
  const errores: ValidationResult[] = []

  if (!cronograma || !cronograma.fases) {
    errores.push({
      valido: false,
      tipo: 'GYS-GEN-16',
      mensaje: 'Estructura de cronograma inválida para validación de horas',
      severidad: 'critico'
    })
    return errores
  }

  for (const fase of cronograma.fases) {
    // Validar fase = suma EDTs
    const sumaEdts = (fase.edts || []).reduce((sum: number, edt: any) => sum + Number(edt.horasEstimadas || 0), 0)
    const horasFase = Number(fase.horasEstimadas || 0)

    if (Math.abs(horasFase - sumaEdts) > 0.01) {
      errores.push({
        valido: false,
        tipo: 'GYS-GEN-16',
        mensaje: `Inconsistencia Fase-EDTs: ${fase.nombre} tiene ${horasFase}h pero suma EDTs = ${sumaEdts}h`,
        severidad: 'error',
        elementoId: fase.id,
        elementoNombre: fase.nombre
      })
    }

    for (const edt of (fase.edts || [])) {
      // Validar EDT = suma actividades
      const sumaActividades = (edt.actividades || []).reduce((sum: number, act: any) => sum + Number(act.horasEstimadas || 0), 0)
      const horasEdt = Number(edt.horasEstimadas || 0)

      if (Math.abs(horasEdt - sumaActividades) > 0.01) {
        errores.push({
          valido: false,
          tipo: 'GYS-GEN-16',
          mensaje: `Inconsistencia EDT-Actividades: ${edt.nombre} tiene ${horasEdt}h pero suma actividades = ${sumaActividades}h`,
          severidad: 'error',
          elementoId: edt.id,
          elementoNombre: edt.nombre
        })
      }

      for (const actividad of (edt.actividades || [])) {
        // Validar actividad = suma tareas
        const sumaTareas = (actividad.tareas || []).reduce((sum: number, tarea: any) => sum + Number(tarea.horasEstimadas || 0), 0)
        const horasActividad = Number(actividad.horasEstimadas || 0)

        if (Math.abs(horasActividad - sumaTareas) > 0.01) {
          errores.push({
            valido: false,
            tipo: 'GYS-GEN-16',
            mensaje: `Inconsistencia Actividad-Tareas: ${actividad.nombre} tiene ${horasActividad}h pero suma tareas = ${sumaTareas}h`,
            severidad: 'error',
            elementoId: actividad.id,
            elementoNombre: actividad.nombre
          })
        }
      }
    }
  }

  return errores
}

/**
 * GYS-GEN-21: Dashboard de consistencia
 * Genera métricas completas del estado del cronograma
 */
export function generarDashboardConsistencia(cronograma: any): ConsistenciaDashboard {
  const dashboard: ConsistenciaDashboard = {
    temporal: { totalViolaciones: 0, violacionesFS1: 0, separacionesInsuficientes: 0, solapamientos: 0 },
    horas: { padresConHorasIncorrectas: 0, diferenciasPromedio: 0, casosCriticos: 0 },
    calendario: { fechasNoLaborables: 0, duracionesExcesivas: 0, excepcionesRequeridas: 0 },
    jerarquia: { padresSinContenerHijos: 0, hijosFueraDePadres: 0, rollupIncorrecto: 0 }
  }

  if (!cronograma || !cronograma.fases) return dashboard

  const diferenciasHoras: number[] = []

  for (const fase of cronograma.fases) {
    // Validar EDTs
    const validacionFase = validarConsistenciaTemporal(fase.edts || [])
    if (!validacionFase.valido) {
      dashboard.temporal.totalViolaciones++
      if (validacionFase.mensaje.includes('solapamiento')) dashboard.temporal.solapamientos++
      else if (validacionFase.mensaje.includes('Violación FS+1')) dashboard.temporal.violacionesFS1++
      else dashboard.temporal.separacionesInsuficientes++
    }

    const horasFase = validarConsistenciaHoras(fase, fase.edts || [])
    if (!horasFase.valido) {
      dashboard.horas.padresConHorasIncorrectas++
      const horasFaseTotal = fase.horas || fase.horasEstimadas || 0
      const sumaEdts = (fase.edts || []).reduce((sum: number, e: any) => sum + (e.horas || e.horasEstimadas || 0), 0)
      const diferencia = Math.abs(horasFaseTotal - sumaEdts)
      diferenciasHoras.push(diferencia)
      if (diferencia > 1) dashboard.horas.casosCriticos++
    }

    for (const edt of (fase.edts || [])) {
      // Validar actividades
      const validacionEdt = validarConsistenciaTemporal(edt.actividades || [])
      if (!validacionEdt.valido) {
        dashboard.temporal.totalViolaciones++
        if (validacionEdt.mensaje.includes('solapamiento')) dashboard.temporal.solapamientos++
        else if (validacionEdt.mensaje.includes('Violación FS+1')) dashboard.temporal.violacionesFS1++
        else dashboard.temporal.separacionesInsuficientes++
      }

      const horasEdt = validarConsistenciaHoras(edt, edt.actividades || [])
      if (!horasEdt.valido) {
        dashboard.horas.padresConHorasIncorrectas++
        const horasEdtTotal = edt.horas || edt.horasEstimadas || 0
        const sumaActividades = (edt.actividades || []).reduce((sum: number, a: any) => sum + (a.horas || a.horasEstimadas || 0), 0)
        const diferencia = Math.abs(horasEdtTotal - sumaActividades)
        diferenciasHoras.push(diferencia)
        if (diferencia > 1) dashboard.horas.casosCriticos++
      }

      for (const actividad of (edt.actividades || [])) {
        // Validar tareas
        const validacionActividad = validarConsistenciaTemporal(actividad.tareas || [])
        if (!validacionActividad.valido) {
          dashboard.temporal.totalViolaciones++
          if (validacionActividad.mensaje.includes('solapamiento')) dashboard.temporal.solapamientos++
          else if (validacionActividad.mensaje.includes('Violación FS+1')) dashboard.temporal.violacionesFS1++
          else dashboard.temporal.separacionesInsuficientes++
        }

        const horasActividad = validarConsistenciaHoras(actividad, actividad.tareas || [])
        if (!horasActividad.valido) {
          dashboard.horas.padresConHorasIncorrectas++
          const horasActividadTotal = actividad.horas || actividad.horasEstimadas || 0
          const sumaTareas = (actividad.tareas || []).reduce((sum: number, t: any) => sum + (t.horas || t.horasEstimadas || 0), 0)
          const diferencia = Math.abs(horasActividadTotal - sumaTareas)
          diferenciasHoras.push(diferencia)
          if (diferencia > 1) dashboard.horas.casosCriticos++
        }
      }
    }
  }

  // Calcular promedio de diferencias
  if (diferenciasHoras.length > 0) {
    dashboard.horas.diferenciasPromedio = diferenciasHoras.reduce((sum, d) => sum + d, 0) / diferenciasHoras.length
  }

  return dashboard
}

/**
 * Helper: Obtener hijos ordenados por fecha de inicio
 */
function obtenerHijosOrdenados(nodoPadre: any): any[] {
  if (!nodoPadre) return []

  // Intentar diferentes propiedades donde pueden estar los hijos
  const hijos = nodoPadre.edts || nodoPadre.actividades || nodoPadre.tareas || nodoPadre.children || []

  // Ordenar por fecha de inicio, luego por orden si existe
  return hijos.sort((a: any, b: any) => {
    const aStart = a.start || a.fechaInicio
    const bStart = b.start || b.fechaInicio

    if (aStart instanceof Date && !isNaN(aStart.getTime()) &&
        bStart instanceof Date && !isNaN(bStart.getTime())) {
      return aStart.getTime() - bStart.getTime()
    }
    if (a.orden !== undefined && b.orden !== undefined) {
      return a.orden - b.orden
    }
    return 0
  })
}