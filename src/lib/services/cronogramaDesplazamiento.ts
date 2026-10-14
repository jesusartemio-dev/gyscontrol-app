// Desplazamiento de nodos del cronograma en días laborables, según el
// calendario del proyecto.
//
// Las fechas del cronograma se guardan con hora (08:00Z, 18:30Z, 00:00Z…) y la
// UI muestra el día UTC, así que aquí todo se razona por día UTC y la hora de
// cada fecha se conserva al moverla.

import { prisma } from '@/lib/prisma'

const DIA_MS = 86400000
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
// Tope de iteraciones: un calendario sin días laborables no debe colgar el request.
const MAX_DIAS = 3660

export interface CalendarioDesplazamiento {
  diasLaborables: string[]
  diaCalendario: { diaSemana: string; esLaborable: boolean }[]
  excepcionCalendario: { fecha: Date; tipo: string }[]
}

const CALENDARIO_LUN_VIE: CalendarioDesplazamiento = {
  diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  diaCalendario: [],
  excepcionCalendario: [],
}

/** Calendario del proyecto; si no tiene, el primer calendario activo (igual que el árbol). */
export async function obtenerCalendarioProyecto(proyectoId: string): Promise<CalendarioDesplazamiento> {
  const include = { diaCalendario: true, excepcionCalendario: true }
  const config = await prisma.configuracionCalendario.findFirst({
    where: { entidadTipo: 'proyecto', entidadId: proyectoId },
    include: { calendarioLaboral: { include } },
  })
  const calendario =
    config?.calendarioLaboral ??
    (await prisma.calendarioLaboral.findFirst({ where: { activo: true }, include }))
  return calendario ?? CALENDARIO_LUN_VIE
}

const claveDia = (d: Date) => d.toISOString().slice(0, 10)

/** Medianoche UTC del día de la fecha. */
export const inicioDiaUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

export const mismoDiaUTC = (a: Date, b: Date) => claveDia(a) === claveDia(b)

export function esDiaLaborable(cal: CalendarioDesplazamiento, fecha: Date): boolean {
  const clave = claveDia(fecha)
  const excepcion = cal.excepcionCalendario.find((e) => claveDia(new Date(e.fecha)) === clave)
  if (excepcion) return excepcion.tipo === 'dia_laboral_extra'

  const diaSemana = DIAS_SEMANA[fecha.getUTCDay()]
  const config = cal.diaCalendario.find((d) => d.diaSemana === diaSemana)
  if (config) return config.esLaborable
  return cal.diasLaborables.includes(diaSemana)
}

/** Primer día laborable estrictamente posterior a la fecha (conserva la hora). */
export function siguienteDiaLaborable(cal: CalendarioDesplazamiento, fecha: Date): Date {
  let d = new Date(fecha.getTime() + DIA_MS)
  for (let i = 0; i < MAX_DIAS && !esDiaLaborable(cal, d); i++) d = new Date(d.getTime() + DIA_MS)
  return d
}

/** La misma fecha si es laborable; si no, el siguiente día laborable. */
export function ajustarALaborable(cal: CalendarioDesplazamiento, fecha: Date): Date {
  return esDiaLaborable(cal, fecha) ? fecha : siguienteDiaLaborable(cal, fecha)
}

/**
 * Mueve una fecha `n` días laborables (negativo = hacia atrás), conservando la hora.
 * Si la fecha cae en día no laborable, primero se lleva al siguiente laborable.
 */
export function desplazarDiasLaborables(cal: CalendarioDesplazamiento, fecha: Date, n: number): Date {
  if (n === 0) return fecha
  let d = ajustarALaborable(cal, fecha)
  const paso = n > 0 ? DIA_MS : -DIA_MS
  let restantes = Math.abs(n)
  for (let i = 0; restantes > 0 && i < MAX_DIAS; i++) {
    d = new Date(d.getTime() + paso)
    if (esDiaLaborable(cal, d)) restantes--
  }
  return d
}

/**
 * Cuántos días laborables hay que moverse para ir de `desde` a `hasta`
 * (con signo). Cuenta los laborables en (desde, hasta].
 */
export function diferenciaDiasLaborables(cal: CalendarioDesplazamiento, desde: Date, hasta: Date): number {
  const a = inicioDiaUTC(desde)
  const b = inicioDiaUTC(hasta)
  if (a.getTime() === b.getTime()) return 0
  const signo = b > a ? 1 : -1
  let cuenta = 0
  let d = a
  for (let i = 0; i < MAX_DIAS && d.getTime() !== b.getTime(); i++) {
    d = new Date(d.getTime() + signo * DIA_MS)
    // Hacia atrás se cuenta el día de partida, no el de llegada, para que
    // desplazar(desde, diferencia(desde, hasta)) caiga en `hasta`.
    const diaContado = signo > 0 ? d : new Date(d.getTime() + DIA_MS)
    if (esDiaLaborable(cal, diaContado)) cuenta++
  }
  return signo * cuenta
}

/**
 * Desplaza en bloque todos los descendientes de un nodo `n` días laborables.
 * El nodo en sí no se toca: lo actualiza quien llama.
 */
export async function desplazarDescendientes(
  cal: CalendarioDesplazamiento,
  nodeType: string,
  realId: string,
  n: number,
): Promise<void> {
  if (n === 0) return
  const mover = (f: Date | null) => (f ? desplazarDiasLaborables(cal, f, n) : undefined)

  if (nodeType === 'fase') {
    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoFaseId: realId },
      select: { id: true, fechaInicioPlan: true, fechaFinPlan: true },
    })
    for (const edt of edts) {
      await prisma.proyectoEdt.update({
        where: { id: edt.id },
        data: { fechaInicioPlan: mover(edt.fechaInicioPlan), fechaFinPlan: mover(edt.fechaFinPlan), updatedAt: new Date() },
      })
      await desplazarDescendientes(cal, 'edt', edt.id, n)
    }
  } else if (nodeType === 'edt') {
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoEdtId: realId },
      select: { id: true, fechaInicioPlan: true, fechaFinPlan: true },
    })
    for (const act of actividades) {
      await prisma.proyectoActividad.update({
        where: { id: act.id },
        data: { fechaInicioPlan: mover(act.fechaInicioPlan), fechaFinPlan: mover(act.fechaFinPlan), updatedAt: new Date() },
      })
      await desplazarDescendientes(cal, 'actividad', act.id, n)
    }
  } else if (nodeType === 'actividad') {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoActividadId: realId },
      select: { id: true, fechaInicio: true, fechaFin: true },
    })
    for (const tarea of tareas) {
      await prisma.proyectoTarea.update({
        where: { id: tarea.id },
        data: { fechaInicio: mover(tarea.fechaInicio), fechaFin: mover(tarea.fechaFin), updatedAt: new Date() },
      })
    }
  }
  // Tarea: nodo hoja, nada que desplazar
}
