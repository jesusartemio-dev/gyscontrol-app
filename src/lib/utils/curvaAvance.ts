import {
  buildWeekBuckets,
  distributeTaskCostByWeek,
  accumulateBuckets,
  type WeekBucket,
} from '@/lib/utils/curvaS'

// Curva S de AVANCE FÍSICO (% 0-100). Distinta a la de costos (EVM): reusa su mecánica de
// bucketing semanal y prorrateo por solape de días, pero repartiendo HORAS (no costo) y
// ponderando por el PESO de cada fase (mismo criterio que el cronograma y el snapshot, para
// una sola verdad). No modifica curvaS.ts.

const MS_PER_DAY = 86_400_000

function toDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}
function getMonday(d: Date): Date {
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(toDay(d) + diff * MS_PER_DAY)
}
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
/** Normaliza un nombre de fase para casar baseline ↔ ejecución: MAYÚS, sin tildes, sin espacios. */
function normFase(nombre: string | null): string {
  return (nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
}

export interface BaselineTareaInput {
  faseNombre: string | null
  fechaInicio: Date
  fechaFin: Date
  horasEstimadas: number
}
export interface SnapshotInput {
  semanaIso: string
  fechaCorte: Date
  progresoGeneral: number // ya viene ponderado por peso de fase
}
export interface PesoFaseInput {
  faseNombre: string
  pesoEfectivo: number // % 0-100, normalizado
}

export interface AvanceWeek {
  weekStart: string
  weekLabel: string
  planificadoAcum: number | null // % 0-100 (null si no hay baseline)
  realAcum: number | null // % 0-100 (null antes del primer snapshot)
}

export interface CurvaAvanceResult {
  weeks: AvanceWeek[]
  hasBaseline: boolean
  tieneSnapshots: boolean
}

/**
 * Construye la Curva S de avance físico, ponderando por fase:
 *  - PLANEADO: por cada fase del baseline, se prorratean sus horas por semana (solape de
 *    días) → % completado de la fase; el aporte de la fase al total = pesoEfectivo(fase) ×
 *    %faseAcum. Suma sobre fases → % planificado acumulado del proyecto.
 *  - REAL: el progresoGeneral de cada snapshot (ya ponderado por peso) colocado en su semana
 *    y arrastrado hacia adelante.
 */
export function construirCurvaAvance(
  baselineTareas: BaselineTareaInput[],
  snapshots: SnapshotInput[],
  pesosFase: PesoFaseInput[],
): CurvaAvanceResult {
  const hasBaseline = baselineTareas.length > 0
  const tieneSnapshots = snapshots.length > 0

  // Rango temporal = min/max de fechas del baseline + cortes de los snapshots.
  const fechas: number[] = []
  for (const t of baselineTareas) fechas.push(t.fechaInicio.getTime(), t.fechaFin.getTime())
  for (const s of snapshots) fechas.push(s.fechaCorte.getTime())
  if (fechas.length === 0) return { weeks: [], hasBaseline, tieneSnapshots }

  const buckets: WeekBucket[] = buildWeekBuckets(new Date(Math.min(...fechas)), new Date(Math.max(...fechas)))
  const nWeeks = buckets.length

  // ── PLANEADO: por fase, prorrateo por horas × peso de fase ──
  const pesoMap = new Map(pesosFase.map((p) => [normFase(p.faseNombre), p.pesoEfectivo]))
  const porFase = new Map<string, BaselineTareaInput[]>()
  for (const t of baselineTareas) {
    const k = normFase(t.faseNombre)
    ;(porFase.get(k) ?? porFase.set(k, []).get(k)!).push(t)
  }
  const horasTotal = baselineTareas.reduce((s, t) => s + (t.horasEstimadas || 0), 0)

  // Peso efectivo por fase para el plan: usa el manual/efectivo si existe; si no, su % por
  // horas. Se renormaliza a 100% sobre las fases del baseline para que el plan llegue a 100.
  const fasesPlan = [...porFase.entries()].map(([k, tareas]) => {
    const horasFase = tareas.reduce((s, t) => s + (t.horasEstimadas || 0), 0)
    const rawPeso = pesoMap.get(k) ?? (horasTotal > 0 ? (horasFase / horasTotal) * 100 : 0)
    return { k, tareas, horasFase, rawPeso }
  })
  const sumaRaw = fasesPlan.reduce((s, f) => s + f.rawPeso, 0)

  const plannedAcum = new Array(nWeeks).fill(0)
  let hayPlan = false
  for (const f of fasesPlan) {
    if (f.horasFase <= 0 || f.rawPeso <= 0) continue
    hayPlan = true
    const pesoNorm = sumaRaw > 0 ? f.rawPeso / sumaRaw : 0 // fracción 0-1
    const fb: WeekBucket[] = buckets.map((b) => ({ ...b, pv: 0, ev: 0, pvAcum: 0, evAcum: 0 }))
    for (const t of f.tareas) {
      distributeTaskCostByWeek({ fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, costo: t.horasEstimadas || 0 }, fb)
    }
    accumulateBuckets(fb)
    for (let i = 0; i < nWeeks; i++) {
      plannedAcum[i] += pesoNorm * (fb[i].pvAcum / f.horasFase) * 100 // aporte de la fase
    }
  }

  // ── REAL: % del snapshot por semana (lunes de fechaCorte); arrastre del último valor ──
  const realPorSemana = new Map<string, number>()
  for (const s of [...snapshots].sort((a, b) => a.fechaCorte.getTime() - b.fechaCorte.getTime())) {
    realPorSemana.set(toISODate(getMonday(s.fechaCorte)), s.progresoGeneral)
  }

  let ultimoReal: number | null = null
  let realIniciado = false
  const weeks: AvanceWeek[] = buckets.map((b, i) => {
    const planificadoAcum = hayPlan ? Math.min(100, Number(plannedAcum[i].toFixed(2))) : null
    if (realPorSemana.has(b.weekStart)) {
      ultimoReal = realPorSemana.get(b.weekStart)!
      realIniciado = true
    }
    const realAcum = realIniciado ? Number((ultimoReal as number).toFixed(2)) : null
    return { weekStart: b.weekStart, weekLabel: b.weekLabel, planificadoAcum, realAcum }
  })

  return { weeks, hasBaseline, tieneSnapshots }
}
