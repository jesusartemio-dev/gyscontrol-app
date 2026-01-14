// ===================================================
// 📅 UTILIDADES PARA SISTEMA DE CALENDARIOS LABORALES (CLIENT-SAFE)
// ===================================================

export interface JornadaLaboral {
  horaInicioManana: string
  horaFinManana: string
  horaInicioTarde: string
  horaFinTarde: string
}

export interface DiaCalendarioInfo {
  esLaborable: boolean
  jornada?: JornadaLaboral
  horasTotales: number
}

export interface ExcepcionCalendarioInfo {
  tipo: 'feriado' | 'dia_laboral_extra' | 'dia_no_laboral'
  nombre: string
  jornada?: JornadaLaboral
  horasTotales?: number
}

/**
 * Obtiene información de un día específico en el calendario
 */
export function obtenerInfoDiaCalendario(
  calendario: any,
  fecha: Date
): DiaCalendarioInfo {
  const diaSemana = obtenerDiaSemana(fecha)

  // Verificar excepciones primero
  const excepcion = calendario.excepcion_calendario.find((exc: any) =>
    exc.fecha.toDateString() === fecha.toDateString()
  )

  if (excepcion) {
    return procesarExcepcion(excepcion)
  }

  // Verificar configuración específica del día
  const diaConfig = calendario.dia_calendario.find((dia: any) =>
    dia.diaSemana === diaSemana
  )

  if (diaConfig) {
    return {
      esLaborable: diaConfig.esLaborable,
      jornada: diaConfig.esLaborable ? {
        horaInicioManana: diaConfig.horaInicioManana || calendario.horaInicioManana,
        horaFinManana: diaConfig.horaFinManana || calendario.horaFinManana,
        horaInicioTarde: diaConfig.horaInicioTarde || calendario.horaInicioTarde,
        horaFinTarde: diaConfig.horaFinTarde || calendario.horaFinTarde
      } : undefined,
      horasTotales: diaConfig.horasTotales || (diaConfig.esLaborable ? calendario.horasPorDia : 0)
    }
  }

  // Usar configuración por defecto
  const esLaborablePorDefecto = calendario.diasLaborables.includes(diaSemana)

  return {
    esLaborable: esLaborablePorDefecto,
    jornada: esLaborablePorDefecto ? {
      horaInicioManana: calendario.horaInicioManana,
      horaFinManana: calendario.horaFinManana,
      horaInicioTarde: calendario.horaInicioTarde,
      horaFinTarde: calendario.horaFinTarde
    } : undefined,
    horasTotales: esLaborablePorDefecto ? calendario.horasPorDia : 0
  }
}

/**
 * Calcula la fecha de fin considerando días laborables
 */
export function calcularFechaFinConCalendario(
  fechaInicio: Date,
  horasRequeridas: number,
  calendario: any
): Date {
  let fechaActual = new Date(fechaInicio)
  let horasAcumuladas = 0

  while (horasAcumuladas < horasRequeridas) {
    const infoDia = obtenerInfoDiaCalendario(calendario, fechaActual)

    if (infoDia.esLaborable) {
      horasAcumuladas += infoDia.horasTotales

      // Si con este día completamos las horas requeridas
      if (horasAcumuladas >= horasRequeridas) {
        // Calcular exactamente a qué hora termina
        const horasExtras = horasAcumuladas - horasRequeridas
        const horasDia = infoDia.horasTotales - horasExtras

        if (infoDia.jornada) {
          // Calcular la hora exacta dentro del día
          fechaActual = calcularHoraFinDia(fechaActual, horasDia, infoDia.jornada)
        }
        break
      }
    }

    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1)
  }

  return fechaActual
}

/**
 * Ajusta una fecha para que caiga en día laborable
 */
export function ajustarFechaADiaLaborable(fecha: Date, calendario: any): Date {
  let fechaAjustada = new Date(fecha)

  while (true) {
    const infoDia = obtenerInfoDiaCalendario(calendario, fechaAjustada)

    if (infoDia.esLaborable) {
      // Ajustar a la hora de inicio del día laborable
      if (infoDia.jornada) {
        const [hora, minuto] = infoDia.jornada.horaInicioManana.split(':').map(Number)
        fechaAjustada.setHours(hora, minuto, 0, 0)
      }
      break
    }

    // Avanzar al siguiente día
    fechaAjustada.setDate(fechaAjustada.getDate() + 1)
  }

  return fechaAjustada
}

/**
 * Calcula horas laborables entre dos fechas
 */
export function calcularHorasLaborables(fechaInicio: Date, fechaFin: Date, calendario: any): number {
  let horasTotales = 0
  let fechaActual = new Date(fechaInicio)

  while (fechaActual <= fechaFin) {
    const infoDia = obtenerInfoDiaCalendario(calendario, fechaActual)

    if (infoDia.esLaborable) {
      // Si es el día de inicio, calcular horas parciales
      if (fechaActual.toDateString() === fechaInicio.toDateString()) {
        horasTotales += calcularHorasDiaParcial(fechaInicio, fechaFin, infoDia)
      }
      // Si es el día de fin, calcular horas parciales
      else if (fechaActual.toDateString() === fechaFin.toDateString()) {
        horasTotales += calcularHorasDiaParcial(fechaInicio, fechaFin, infoDia)
      }
      // Día completo
      else {
        horasTotales += infoDia.horasTotales
      }
    }

    fechaActual.setDate(fechaActual.getDate() + 1)
  }

  return horasTotales
}

// Funciones auxiliares

function obtenerDiaSemana(fecha: Date): string {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dias[fecha.getDay()]
}

function procesarExcepcion(excepcion: any): DiaCalendarioInfo {
  switch (excepcion.tipo) {
    case 'feriado':
    case 'dia_no_laboral':
      return {
        esLaborable: false,
        horasTotales: 0
      }

    case 'dia_laboral_extra':
      return {
        esLaborable: true,
        jornada: excepcion.horaInicio && excepcion.horaFin ? {
          horaInicioManana: excepcion.horaInicio,
          horaFinManana: excepcion.horaFin,
          horaInicioTarde: '00:00', // No aplica
          horaFinTarde: '00:00'
        } : undefined,
        horasTotales: excepcion.horasTotales || 8
      }

    default:
      return {
        esLaborable: false,
        horasTotales: 0
      }
  }
}

function calcularHoraFinDia(fechaBase: Date, horasDia: number, jornada: JornadaLaboral): Date {
  const fechaFin = new Date(fechaBase)

  // Calcular horas en la mañana
  const [horaInicioM, minInicioM] = jornada.horaInicioManana.split(':').map(Number)
  const [horaFinM, minFinM] = jornada.horaFinManana.split(':').map(Number)
  const horasManana = (horaFinM * 60 + minFinM - horaInicioM * 60 - minInicioM) / 60

  if (horasDia <= horasManana) {
    // Termina en la mañana
    fechaFin.setHours(horaInicioM, minInicioM, 0, 0)
    fechaFin.setTime(fechaFin.getTime() + (horasDia * 60 * 60 * 1000))
  } else {
    // Termina en la tarde
    const horasRestantes = horasDia - horasManana
    const [horaInicioT, minInicioT] = jornada.horaInicioTarde.split(':').map(Number)

    fechaFin.setHours(horaInicioT, minInicioT, 0, 0)
    fechaFin.setTime(fechaFin.getTime() + (horasRestantes * 60 * 60 * 1000))
  }

  return fechaFin
}

function calcularHorasDiaParcial(fechaInicio: Date, fechaFin: Date, infoDia: DiaCalendarioInfo): number {
  if (!infoDia.jornada) return 0

  // Lógica simplificada - calcular horas efectivas en el día
  const jornada = infoDia.jornada
  const [horaInicioM] = jornada.horaInicioManana.split(':').map(Number)
  const [horaFinT] = jornada.horaFinTarde.split(':').map(Number)

  // Por simplicidad, devolver horas totales del día
  // En una implementación completa, calcularía las horas exactas
  return infoDia.horasTotales
}