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

// ── Relación con el hermano de arriba (solo informativa) ───────────────────

export type TipoRelacion = 'secuencia' | 'paralelo' | 'solape' | 'hueco' | 'antes'

export interface RelacionAnterior {
  tipo: TipoRelacion
  /** Días laborables libres entre ambos (solo `hueco`). */
  dias?: number
  anteriorNombre: string
}

/**
 * Cómo se ubica un elemento respecto al que está justo arriba en su nivel,
 * deducido de las fechas (no se guarda ninguna dependencia):
 * - paralelo: empiezan el mismo día.
 * - secuencia: empieza el día laborable siguiente al fin del anterior.
 * - solape: empieza después que el anterior pero antes de que este termine.
 * - hueco: hay `dias` días laborables libres entre el fin del anterior y su inicio.
 * - antes: empieza antes que el anterior (la lista no está en orden de fecha).
 */
export function clasificarRelacion(
  cal: CalendarioDesplazamiento,
  anterior: { inicio: Date; fin: Date; nombre: string },
  actual: { inicio: Date; esHito?: boolean },
): RelacionAnterior {
  const base = { anteriorNombre: anterior.nombre }
  const inicio = inicioDiaUTC(actual.inicio)
  // Un hito que cae el día en que termina el anterior va "después" de él (como en MS Project).
  if (actual.esHito && mismoDiaUTC(actual.inicio, anterior.fin) && !mismoDiaUTC(anterior.inicio, anterior.fin)) {
    return { tipo: 'secuencia', ...base }
  }
  if (mismoDiaUTC(actual.inicio, anterior.inicio)) return { tipo: 'paralelo', ...base }
  if (inicio < inicioDiaUTC(anterior.inicio)) return { tipo: 'antes', ...base }
  if (inicio <= inicioDiaUTC(anterior.fin)) return { tipo: 'solape', ...base }
  if (mismoDiaUTC(actual.inicio, siguienteDiaLaborable(cal, anterior.fin))) return { tipo: 'secuencia', ...base }
  // Laborables estrictamente entre el fin del anterior y el inicio de este.
  const libres = Math.max(0, diferenciaDiasLaborables(cal, anterior.fin, ajustarALaborable(cal, actual.inicio)) - 1)
  return libres === 0 ? { tipo: 'secuencia', ...base } : { tipo: 'hueco', dias: libres, ...base }
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
 * Nuevo inicio (medianoche UTC de un día laborable) para un EDT, actividad o
 * tarea según el modo:
 * - inicio_padre: primer día laborable del padre.
 * - despues_anterior / despues_de: día laborable siguiente al fin del hermano `referenciaId`.
 * - despues_ultimo: día laborable siguiente al fin del hermano que termina más tarde.
 * - en_paralelo: mismo inicio que el hermano `referenciaId`.
 * Devuelve `{ error }` si no se puede calcular.
 */
export async function calcularInicioPosicion(
  cal: CalendarioDesplazamiento,
  nodeType: string,
  realId: string,
  modo: ModoPosicion,
  referenciaId?: string,
): Promise<{ inicio: Date } | { error: string }> {
  const datos = await padreYHermanos(nodeType, realId)
  if (!datos) return { error: 'Solo se puede posicionar un EDT, una actividad o una tarea' }

  // Un hito "después de" algo cae el mismo día en que ese algo termina (como
  // en MS Project); una tarea normal, el día laborable siguiente.
  const despuesDe = (fin: Date) => (datos.esHito ? ajustarALaborable(cal, fin) : siguienteDiaLaborable(cal, fin))

  let base: Date
  if (modo === 'inicio_padre') {
    if (!datos.inicioPadre) return { error: 'El padre no tiene fecha de inicio' }
    base = ajustarALaborable(cal, datos.inicioPadre)
  } else if (modo === 'despues_ultimo') {
    if (datos.hermanos.length === 0) return { error: 'No hay otros elementos en el mismo nivel' }
    const ultimoFin = datos.hermanos.reduce((max, h) => (h.fin > max ? h.fin : max), datos.hermanos[0].fin)
    base = despuesDe(ultimoFin)
  } else {
    const ref = datos.hermanos.find(h => h.id === referenciaId)
    if (!ref) return { error: 'El elemento de referencia no está en el mismo nivel' }
    base = modo === 'en_paralelo' ? ajustarALaborable(cal, ref.inicio) : despuesDe(ref.fin)
  }
  return { inicio: inicioDiaUTC(base) }
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
