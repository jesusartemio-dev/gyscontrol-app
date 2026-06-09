import {
  buildWeekBuckets,
  distributeTaskCostByWeek,
  accumulateBuckets,
  type WeekBucket,
} from '@/lib/utils/curvaS'

// Curva S de AVANCE FÍSICO (% 0-100). Distinta a la de costos (EVM): reusa su mecánica de
// bucketing semanal y prorrateo por solape de días, pero repartiendo HORAS (no costo) para
// el plan, y usando los snapshots de avance para la serie real. No modifica curvaS.ts.

const MS_PER_DAY = 86_400_000

/** Inicio de día UTC en ms. */
function toDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}
/** Lunes (inicio de semana ISO) de una fecha. */
function getMonday(d: Date): Date {
  const day = d.getUTCDay() // 0=Dom, 1=Lun, ...
  const diff = day === 0 ? -6 : 1 - day
  return new Date(toDay(d) + diff * MS_PER_DAY)
}
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export interface BaselineTareaInput {
  fechaInicio: Date
  fechaFin: Date
  horasEstimadas: number
}
export interface SnapshotInput {
  semanaIso: string
  fechaCorte: Date
  progresoGeneral: number
}

export interface AvanceWeek {
  weekStart: string // ISO del lunes
  weekLabel: string // "dd/MM"
  planificadoAcum: number | null // % 0-100 (null si no hay baseline con horas)
  realAcum: number | null // % 0-100 (null antes del primer snapshot)
}

export interface CurvaAvanceResult {
  weeks: AvanceWeek[]
  hasBaseline: boolean
  tieneSnapshots: boolean
}

/**
 * Construye la Curva S de avance físico:
 *  - PLANEADO: prorratea las horasEstimadas del baseline por semana (solape de días, misma
 *    mecánica que la curva de costos) → % acumulado = horasAcum / ΣhorasTotales × 100.
 *  - REAL: el progresoGeneral de cada snapshot colocado en su semana (lunes de fechaCorte)
 *    y arrastrado hacia adelante entre semanas sin snapshot (la curva no baja).
 */
export function construirCurvaAvance(
  baselineTareas: BaselineTareaInput[],
  snapshots: SnapshotInput[],
): CurvaAvanceResult {
  const hasBaseline = baselineTareas.length > 0
  const tieneSnapshots = snapshots.length > 0

  // Rango temporal = min/max de fechas del baseline + cortes de los snapshots.
  const fechas: number[] = []
  for (const t of baselineTareas) fechas.push(t.fechaInicio.getTime(), t.fechaFin.getTime())
  for (const s of snapshots) fechas.push(s.fechaCorte.getTime())
  if (fechas.length === 0) return { weeks: [], hasBaseline, tieneSnapshots }

  const rangeStart = new Date(Math.min(...fechas))
  const rangeEnd = new Date(Math.max(...fechas))
  const buckets: WeekBucket[] = buildWeekBuckets(rangeStart, rangeEnd)

  // ── PLANEADO: prorratea horas (reusa distributeTaskCostByWeek con costo = horas) ──
  const totalHoras = baselineTareas.reduce((s, t) => s + (t.horasEstimadas || 0), 0)
  const planificable = hasBaseline && totalHoras > 0
  if (planificable) {
    for (const t of baselineTareas) {
      distributeTaskCostByWeek(
        { fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, costo: t.horasEstimadas || 0 },
        buckets,
      )
    }
    accumulateBuckets(buckets) // pvAcum = horas acumuladas
  }

  // ── REAL: % del snapshot por semana (lunes de fechaCorte); arrastre del último valor ──
  const realPorSemana = new Map<string, number>()
  for (const s of [...snapshots].sort((a, b) => a.fechaCorte.getTime() - b.fechaCorte.getTime())) {
    realPorSemana.set(toISODate(getMonday(s.fechaCorte)), s.progresoGeneral)
  }

  let ultimoReal: number | null = null
  let realIniciado = false
  const weeks: AvanceWeek[] = buckets.map((b) => {
    const planificadoAcum = planificable ? Math.min(100, (b.pvAcum / totalHoras) * 100) : null
    if (realPorSemana.has(b.weekStart)) {
      ultimoReal = realPorSemana.get(b.weekStart)!
      realIniciado = true
    }
    const realAcum = realIniciado ? ultimoReal : null
    return {
      weekStart: b.weekStart,
      weekLabel: b.weekLabel,
      planificadoAcum: planificadoAcum != null ? Number(planificadoAcum.toFixed(2)) : null,
      realAcum: realAcum != null ? Number(realAcum.toFixed(2)) : null,
    }
  })

  return { weeks, hasBaseline, tieneSnapshots }
}
