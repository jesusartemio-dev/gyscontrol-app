// Desplazamiento y posición de nodos del cronograma según el calendario del
// proyecto, por horas laborables (como MS Project).
//
// Convención de fechas: "hora de obra" — la hora tal cual en obra guardada en
// los campos UTC (ver cronogramaHoras.ts). Por eso todo se razona con getUTC*.

import { prisma } from '@/lib/prisma'
import {
  type CalendarioHoras,
  desplazarHorasLaborables,
  diferenciaHorasLaborables,
  extremoDeInstante,
  horasLaborablesEntre,
  horasPorDiaCalendario,
  siguienteMomentoLaborable,
} from './cronogramaHoras'

const DIA_MS = 86400000
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
// Tope de iteraciones: un calendario sin días laborables no debe colgar el request.
const MAX_DIAS = 3660

export interface CalendarioDesplazamiento {
  diasLaborables: string[]
  diaCalendario: { diaSemana: string; esLaborable: boolean }[]
  excepcionCalendario: { fecha: Date; tipo: string }[]
}

// Sin calendario configurado: lunes a viernes, 08:00–12:00 y 13:00–17:00.
const CALENDARIO_LUN_VIE: CalendarioHoras = {
  diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  diaCalendario: [],
  excepcionCalendario: [],
  horasPorDia: 8,
  horaInicioManana: '08:00',
  horaFinManana: '12:00',
  horaInicioTarde: '13:00',
  horaFinTarde: '17:00',
}

/** Calendario del proyecto; si no tiene, el primer calendario activo (igual que el árbol). */
export async function obtenerCalendarioProyecto(proyectoId: string): Promise<CalendarioHoras> {
  const include = { diaCalendario: true, excepcionCalendario: true }
  const config = await prisma.configuracionCalendario.findFirst({
    where: { entidadTipo: 'proyecto', entidadId: proyectoId },
    include: { calendarioLaboral: { include } },
  })
  const calendario =
    config?.calendarioLaboral ??
    (await prisma.calendarioLaboral.findFirst({ where: { activo: true }, include }))
  return (calendario as CalendarioHoras | null) ?? CALENDARIO_LUN_VIE
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

// ── Relación con el hermano de arriba (solo informativa) ───────────────────

export type TipoRelacion = 'secuencia' | 'paralelo' | 'solape' | 'hueco' | 'antes'

export interface RelacionAnterior {
  tipo: TipoRelacion
  /** Tiempo laborable libre entre ambos (solo `hueco`): en horas, y en días si es ≥ 1 jornada. */
  horas?: number
  dias?: number
  anteriorNombre: string
}

/**
 * Cómo se ubica un elemento respecto al que está justo arriba en su nivel,
 * deducido de las fechas (no se guarda ninguna dependencia):
 * - secuencia: empieza en cuanto termina el anterior (el siguiente momento laborable).
 * - paralelo: empiezan en el mismo momento.
 * - solape: empieza después que el anterior pero antes de que este termine.
 * - hueco: queda tiempo laborable libre entre el fin del anterior y su inicio.
 * - antes: empieza antes que el anterior (la lista no está en orden de fecha).
 */
export function clasificarRelacion(
  cal: CalendarioHoras,
  anterior: { inicio: Date; fin: Date; nombre: string },
  actual: { inicio: Date; esHito?: boolean },
): RelacionAnterior {
  const base = { anteriorNombre: anterior.nombre }
  const ini = actual.inicio.getTime()
  // Un hito va "después de" lo que termina en su mismo instante (como en MS Project).
  if (actual.esHito && ini === anterior.fin.getTime() && anterior.fin.getTime() !== anterior.inicio.getTime()) {
    return { tipo: 'secuencia', ...base }
  }
  if (ini === siguienteMomentoLaborable(cal, anterior.fin).getTime() && ini >= anterior.fin.getTime()) {
    return { tipo: 'secuencia', ...base }
  }
  if (ini === anterior.inicio.getTime()) return { tipo: 'paralelo', ...base }
  if (ini < anterior.inicio.getTime()) return { tipo: 'antes', ...base }
  if (ini < anterior.fin.getTime()) return { tipo: 'solape', ...base }
  const libres = horasLaborablesEntre(cal, anterior.fin, actual.inicio)
  if (libres === 0) return { tipo: 'secuencia', ...base }
  const hpd = horasPorDiaCalendario(cal)
  return {
    tipo: 'hueco',
    horas: Math.round(libres * 10) / 10,
    dias: libres >= hpd ? Math.round((libres / hpd) * 10) / 10 : undefined,
    ...base,
  }
}

// ── Posicionar un nodo respecto a su padre o a un hermano ──────────────────

export type ModoPosicion = 'inicio_padre' | 'despues_anterior' | 'despues_ultimo' | 'despues_de' | 'en_paralelo'

interface Hermano { id: string; inicio: Date; fin: Date }

/** Inicio del padre y hermanos (mismo tipo, mismo padre) de un EDT, actividad o tarea. */
async function padreYHermanos(nodeType: string, realId: string): Promise<{ inicioPadre: Date | null; hermanos: Hermano[]; esHito?: boolean } | null> {
  if (nodeType === 'edt') {
    const edt = await prisma.proyectoEdt.findUnique({
      where: { id: realId },
      select: { proyectoFaseId: true, proyectoCronogramaId: true, proyectoFase: { select: { fechaInicioPlan: true } } },
    })
    if (!edt) return null
    const hermanos = await prisma.proyectoEdt.findMany({
      where: { proyectoCronogramaId: edt.proyectoCronogramaId, proyectoFaseId: edt.proyectoFaseId, id: { not: realId } },
      select: { id: true, fechaInicioPlan: true, fechaFinPlan: true },
    })
    return {
      inicioPadre: edt.proyectoFase?.fechaInicioPlan ?? null,
      hermanos: hermanos
        .filter(h => h.fechaInicioPlan && h.fechaFinPlan)
        .map(h => ({ id: h.id, inicio: h.fechaInicioPlan!, fin: h.fechaFinPlan! })),
    }
  }
  if (nodeType === 'actividad') {
    const act = await prisma.proyectoActividad.findUnique({
      where: { id: realId },
      select: { proyectoEdtId: true, proyectoEdt: { select: { fechaInicioPlan: true } } },
    })
    if (!act) return null
    const hermanos = await prisma.proyectoActividad.findMany({
      where: { proyectoEdtId: act.proyectoEdtId, id: { not: realId } },
      select: { id: true, fechaInicioPlan: true, fechaFinPlan: true },
    })
    return {
      inicioPadre: act.proyectoEdt.fechaInicioPlan ?? null,
      hermanos: hermanos.map(h => ({ id: h.id, inicio: h.fechaInicioPlan, fin: h.fechaFinPlan })),
    }
  }
  if (nodeType === 'tarea') {
    const tarea = await prisma.proyectoTarea.findUnique({
      where: { id: realId },
      select: {
        proyectoActividadId: true,
        proyectoEdtId: true,
        esHito: true,
        proyectoActividad: { select: { fechaInicioPlan: true } },
        proyectoEdt: { select: { fechaInicioPlan: true } },
      },
    })
    if (!tarea) return null
    // Tarea dentro de una actividad: sus hermanas son las de esa actividad.
    // Tarea suelta en el EDT: las otras tareas sueltas del EDT.
    const hermanos = await prisma.proyectoTarea.findMany({
      where: tarea.proyectoActividadId
        ? { proyectoActividadId: tarea.proyectoActividadId, id: { not: realId } }
        : { proyectoEdtId: tarea.proyectoEdtId, proyectoActividadId: null, id: { not: realId } },
      select: { id: true, fechaInicio: true, fechaFin: true },
    })
    return {
      inicioPadre: (tarea.proyectoActividad?.fechaInicioPlan ?? tarea.proyectoEdt.fechaInicioPlan) ?? null,
      hermanos: hermanos.map(h => ({ id: h.id, inicio: h.fechaInicio, fin: h.fechaFin })),
      esHito: tarea.esHito,
    }
  }
  return null
}

/**
 * Nuevo inicio para un EDT, actividad o tarea según el modo (por horas, como
 * Fin-Comienzo en MS Project):
 * - inicio_padre: primer momento laborable del padre.
 * - despues_anterior / despues_de: en cuanto termina el hermano `referenciaId`
 *   (el mismo día si queda jornada). Un hito, en el mismo instante en que termina.
 * - despues_ultimo: igual, tras el hermano que termina más tarde.
 * - en_paralelo: mismo inicio que el hermano `referenciaId`.
 * Devuelve `{ error }` si no se puede calcular.
 */
export async function calcularInicioPosicion(
  cal: CalendarioHoras,
  nodeType: string,
  realId: string,
  modo: ModoPosicion,
  referenciaId?: string,
): Promise<{ inicio: Date } | { error: string }> {
  const datos = await padreYHermanos(nodeType, realId)
  if (!datos) return { error: 'Solo se puede posicionar un EDT, una actividad o una tarea' }

  const despuesDe = (fin: Date) => (datos.esHito ? fin : siguienteMomentoLaborable(cal, fin))

  let inicio: Date
  if (modo === 'inicio_padre') {
    if (!datos.inicioPadre) return { error: 'El padre no tiene fecha de inicio' }
    inicio = siguienteMomentoLaborable(cal, datos.inicioPadre)
  } else if (modo === 'despues_ultimo') {
    if (datos.hermanos.length === 0) return { error: 'No hay otros elementos en el mismo nivel' }
    const ultimoFin = datos.hermanos.reduce((max, h) => (h.fin > max ? h.fin : max), datos.hermanos[0].fin)
    inicio = despuesDe(ultimoFin)
  } else {
    const ref = datos.hermanos.find(h => h.id === referenciaId)
    if (!ref) return { error: 'El elemento de referencia no está en el mismo nivel' }
    inicio = modo === 'en_paralelo' ? siguienteMomentoLaborable(cal, ref.inicio) : despuesDe(ref.fin)
  }
  return { inicio }
}

/** Horas laborables (con signo) para mover un nodo de `desde` a `hasta`. */
export function deltaHorasEntre(cal: CalendarioHoras, desde: Date, hasta: Date): number {
  return diferenciaHorasLaborables(cal, desde, hasta)
}

/**
 * Desplaza en bloque todos los descendientes de un nodo `deltaHoras` laborables
 * (con signo). Cada inicio y cada fin se mueven como tales (ver
 * desplazarHorasLaborables), así cada elemento conserva su duración.
 * El nodo en sí no se toca: lo actualiza quien llama.
 */
export async function desplazarDescendientes(
  cal: CalendarioHoras,
  nodeType: string,
  realId: string,
  deltaHoras: number,
): Promise<void> {
  if (deltaHoras === 0) return
  const moverIni = (f: Date | null) => (f ? desplazarHorasLaborables(cal, f, deltaHoras, 'inicio') : undefined)
  const moverFin = (f: Date | null) => (f ? desplazarHorasLaborables(cal, f, deltaHoras, 'fin') : undefined)

  if (nodeType === 'fase') {
    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoFaseId: realId },
      select: { id: true, fechaInicioPlan: true, fechaFinPlan: true },
    })
    for (const edt of edts) {
      await prisma.proyectoEdt.update({
        where: { id: edt.id },
        data: { fechaInicioPlan: moverIni(edt.fechaInicioPlan), fechaFinPlan: moverFin(edt.fechaFinPlan), updatedAt: new Date() },
      })
      await desplazarDescendientes(cal, 'edt', edt.id, deltaHoras)
    }
  } else if (nodeType === 'edt') {
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoEdtId: realId },
      select: { id: true, fechaInicioPlan: true, fechaFinPlan: true },
    })
    for (const act of actividades) {
      await prisma.proyectoActividad.update({
        where: { id: act.id },
        data: { fechaInicioPlan: moverIni(act.fechaInicioPlan), fechaFinPlan: moverFin(act.fechaFinPlan), updatedAt: new Date() },
      })
      await desplazarDescendientes(cal, 'actividad', act.id, deltaHoras)
    }
  } else if (nodeType === 'actividad') {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoActividadId: realId },
      select: { id: true, fechaInicio: true, fechaFin: true, esHito: true },
    })
    for (const tarea of tareas) {
      // Un hito es un instante: inicio y fin se mueven juntos, según dónde cae.
      if (tarea.esHito) {
        const t = desplazarHorasLaborables(cal, tarea.fechaInicio, deltaHoras, extremoDeInstante(cal, tarea.fechaInicio))
        await prisma.proyectoTarea.update({ where: { id: tarea.id }, data: { fechaInicio: t, fechaFin: t, updatedAt: new Date() } })
        continue
      }
      await prisma.proyectoTarea.update({
        where: { id: tarea.id },
        data: { fechaInicio: moverIni(tarea.fechaInicio), fechaFin: moverFin(tarea.fechaFin), updatedAt: new Date() },
      })
    }
  }
  // Tarea: nodo hoja, nada que desplazar
}
