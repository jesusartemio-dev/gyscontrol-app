/**
 * Tareas "extra": trabajo que se ejecutó pero que NO estaba en el alcance planificado.
 *
 * Se crean al vuelo desde la jornada de campo para poder imputar horas a algo. Por eso
 * casi siempre se quedan en 0 %: nadie vuelve a cerrarlas.
 *
 * Regla de negocio: **una tarea extra NO cuenta para el % de avance del cronograma, pero
 * SÍ para las horas consumidas.** El % del cronograma mide cuánto del alcance contratado
 * está hecho; el trabajo no previsto es crecimiento de alcance y se mide aparte. Sus horas
 * en cambio se gastaron de verdad, así que pesan en el consumo y en la eficiencia — que es
 * donde el trabajo no previsto tiene que doler.
 *
 * Antes de esta regla las extras diluían el avance: YAN29 tenía el 100 % de su alcance
 * planificado terminado y mostraba 38.5 %, porque 700 horas-hombre de armado de tablero se
 * cargaron como extras al 0 % contra 98 horas de plan.
 */

/**
 * `esExtra` es el campo real. El prefijo `[EXTRA]` en la descripción es el marcador legacy
 * que se sigue escribiendo junto al flag; se comprueba también por si alguna vía antigua
 * dejó filas con solo el marcador.
 */
export function esTareaExtra(t: { esExtra?: boolean | null; descripcion?: string | null }): boolean {
  return t.esExtra === true || (t.descripcion?.startsWith('[EXTRA]') ?? false)
}

/** Campos mínimos que hay que traer de Prisma para poder aplicar `esTareaExtra`. */
export const SELECT_ES_EXTRA = { esExtra: true, descripcion: true } as const

export interface ResumenFueraDePlan {
  tareas: number
  /** Horas-hombre presupuestadas en tareas extra. */
  horasHombre: number
  /** Horas realmente gastadas en ellas. */
  horasReales: number
  /** % que representan sobre las horas-hombre del alcance planificado. */
  porcentajeSobrePlan: number
}
