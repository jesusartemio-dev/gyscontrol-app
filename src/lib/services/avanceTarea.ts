import { prisma } from '@/lib/prisma'
import { ProgresoService } from './progresoService'

/**
 * Punto ÚNICO de escritura del avance de una tarea del cronograma.
 *
 * Regla: `ProyectoTareaAvance` es el libro mayor y `ProyectoTarea.porcentajeCompletado` es
 * solo un caché del asiento de MAYOR FECHA DE EFECTO. Nadie debe escribir ese campo
 * directamente — si se hace, la curva S y el histórico dejan de coincidir.
 *
 * La fecha de efecto es SIEMPRE explícita y es la fecha a la que pertenece el trabajo (la
 * `fechaTrabajo` de la jornada), no la fecha en que alguien lo teclea: más de la mitad de
 * las jornadas se cierran con días o semanas de retraso.
 */

export type OrigenAvance = 'campo' | 'oficina' | 'automatico'

export interface RegistrarAvanceInput {
  proyectoTareaId: string
  porcentaje: number
  /** Fecha a la que PERTENECE el avance. Se normaliza a medianoche UTC. */
  fechaEfecto: Date
  origen: OrigenAvance
  usuarioId?: string | null
}

/** Cliente de transacción de Prisma (o el cliente normal). */
type Db = Omit<typeof prisma, '$transaction' | '$connect' | '$disconnect' | '$on' | '$extends'>

/**
 * Medianoche UTC. La fecha forma parte de la clave única `(proyectoTareaId, fecha)`, así que
 * NO puede depender de la zona del proceso: `setHours(0,0,0,0)` daba una clave distinta en
 * un dev local (UTC-5) que en Vercel (UTC), duplicando asientos del mismo día.
 */
export function diaUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Resuelve la fecha de efecto que manda el cliente ("YYYY-MM-DD"). Por defecto hoy.
 * Nunca acepta futuro: un avance no puede pertenecer a una semana que no ha llegado.
 */
export function fechaEfectoDe(valor: unknown): Date {
  const hoy = new Date()
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return hoy
  const parsed = new Date(`${valor}T00:00:00.000Z`)
  if (isNaN(parsed.getTime()) || parsed.getTime() > hoy.getTime()) return hoy
  return parsed
}

/**
 * Recalcula `porcentajeCompletado` (y estado/fechaFinReal) desde el libro mayor.
 *
 * Toma el asiento de mayor fecha de efecto, NO el último capturado: cerrar hoy la jornada
 * del 5 de agosto debe rellenar el hueco del pasado sin pisar un avance del 18.
 */
export async function recalcularCacheAvance(db: Db, proyectoTareaId: string): Promise<number> {
  const ultimo = await db.proyectoTareaAvance.findFirst({
    where: { proyectoTareaId },
    orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    select: { porcentaje: true, fecha: true },
  })

  const porcentaje = ultimo?.porcentaje ?? 0
  await db.proyectoTarea.update({
    where: { id: proyectoTareaId },
    data: {
      porcentajeCompletado: porcentaje,
      estado: porcentaje >= 100 ? 'completada' : porcentaje > 0 ? 'en_progreso' : 'pendiente',
      // La tarea se terminó el día del avance que la llevó al 100%, no el día en que se
      // registró. Si baja del 100% deja de estar terminada.
      fechaFinReal: porcentaje >= 100 ? (ultimo?.fecha ?? null) : null,
      updatedAt: new Date(),
    },
  })
  return porcentaje
}

/**
 * Registra un avance fechado y deja el caché de la tarea coherente con el libro mayor.
 *
 * A igualdad de fecha el último asiento gana, sea cual sea el origen: descartar en silencio
 * la corrección de una persona es peor que la ambigüedad que evitaría. El `origen` queda
 * grabado para poder auditarlo.
 */
export async function registrarAvanceTarea(
  db: Db,
  { proyectoTareaId, porcentaje, fechaEfecto, origen, usuarioId = null }: RegistrarAvanceInput,
): Promise<{ porcentajeVigente: number }> {
  const pct = Math.max(0, Math.min(100, Math.round(porcentaje)))
  const fecha = diaUTC(fechaEfecto)

  const tarea = await db.proyectoTarea.findUnique({
    where: { id: proyectoTareaId },
    select: { proyectoEdt: { select: { proyectoId: true } } },
  })
  if (!tarea?.proyectoEdt?.proyectoId) {
    throw new Error(`Tarea ${proyectoTareaId} sin proyecto asociado`)
  }

  await db.proyectoTareaAvance.upsert({
    where: { proyectoTareaId_fecha: { proyectoTareaId, fecha } },
    update: { porcentaje: pct, origen, usuarioId },
    create: {
      proyectoTareaId,
      proyectoId: tarea.proyectoEdt.proyectoId,
      fecha,
      porcentaje: pct,
      origen,
      usuarioId,
    },
  })

  const porcentajeVigente = await recalcularCacheAvance(db, proyectoTareaId)
  return { porcentajeVigente }
}

/**
 * Borra los asientos de campo que dejó una jornada y devuelve el caché al valor que
 * corresponda según el resto del histórico.
 *
 * Se usa al rechazar o reabrir una jornada: hasta ahora solo se revertían las horas, así que
 * el avance quedaba inflado para siempre. Los asientos se identifican por
 * `(tareas de la jornada, fechaTrabajo, origen 'campo')` — `ProyectoTareaAvance` no guarda
 * de qué jornada vino, pero esa terna la identifica sin ambigüedad en la práctica.
 */
export async function revertirAvanceJornada(db: Db, jornadaId: string): Promise<string[]> {
  const jornada = await db.registroHorasCampo.findUnique({
    where: { id: jornadaId },
    select: {
      fechaTrabajo: true,
      tareas: { select: { proyectoTareaId: true } },
    },
  })
  if (!jornada) return []

  const tareaIds = [...new Set(
    jornada.tareas.map((t) => t.proyectoTareaId).filter((id): id is string => !!id),
  )]
  if (tareaIds.length === 0) return []

  const fecha = diaUTC(jornada.fechaTrabajo)
  const { count } = await db.proyectoTareaAvance.deleteMany({
    where: { proyectoTareaId: { in: tareaIds }, fecha, origen: 'campo' },
  })
  if (count === 0) return []

  for (const id of tareaIds) await recalcularCacheAvance(db, id)
  return tareaIds
}

/** Propaga el rollup Actividad → EDT tras cambiar el avance de una tarea. */
export async function propagarRollup(proyectoTareaId: string): Promise<void> {
  try {
    const t = await prisma.proyectoTarea.findUnique({
      where: { id: proyectoTareaId },
      select: { proyectoActividadId: true, proyectoEdtId: true },
    })
    if (!t) return
    if (t.proyectoActividadId) await ProgresoService.actualizarProgresoActividad(t.proyectoActividadId)
    else await ProgresoService.actualizarProgresoEDT(t.proyectoEdtId)
  } catch (e) {
    console.error('[avanceTarea] rollup', proyectoTareaId, e)
  }
}
