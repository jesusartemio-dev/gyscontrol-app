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
/** Punto semanal ya ponderado por peso de fase (lunes UTC "YYYY-MM-DD"). */
export interface PuntoSemanalInput {
  weekStart: string
  porcentaje: number
}
export interface PesoFaseInput {
  faseNombre: string
  pesoEfectivo: number // % 0-100, normalizado
}

export interface AvanceWeek {
  weekStart: string
  weekLabel: string
  planificadoAcum: number | null // % 0-100 (null si no hay baseline)
  realAcum: number | null // % 0-100 (null antes del primer asiento del histórico)
  reportado: number | null // % 0-100, solo en las semanas con snapshot congelado
  consumoAcum: number | null // % de las horas presupuestadas ya gastadas (puede pasar de 100)
}

export interface CurvaAvanceResult {
  weeks: AvanceWeek[]
  hasBaseline: boolean
  tieneSerieReal: boolean
  tieneReportados: boolean
}

/**
 * Construye la Curva S de avance físico, ponderando por fase:
 *  - PLANEADO: por cada fase del baseline, se prorratean sus horas por semana (solape de
 *    días) → % completado de la fase; el aporte de la fase al total = pesoEfectivo(fase) ×
 *    %faseAcum. Suma sobre fases → % planificado acumulado del proyecto.
 *  - REAL: la serie derivada del histórico fechado (`serieAvanceRealSemanal`), colocada en
 *    su semana y arrastrada hacia adelante. Se recalcula en cada consulta, así que una
 *    jornada cerrada tarde corrige la semana a la que pertenece.
 *  - REPORTADO: los snapshots congelados, como puntos sueltos (NO se arrastran) — son lo
 *    que se envió al cliente en su momento, no una serie continua.
 */
export function construirCurvaAvance(
  baselineTareas: BaselineTareaInput[],
  serieReal: PuntoSemanalInput[],
  pesosFase: PesoFaseInput[],
  reportados: PuntoSemanalInput[] = [],
  serieConsumo: PuntoSemanalInput[] = [],
  hoy: Date = new Date(),
): CurvaAvanceResult {
  const hasBaseline = baselineTareas.length > 0
  const tieneSerieReal = serieReal.length > 0
  const tieneReportados = reportados.length > 0

  // Rango temporal = min/max de fechas del baseline + semanas con dato real, reportado o
  // consumo de horas.
  const fechas: number[] = []
  for (const t of baselineTareas) fechas.push(t.fechaInicio.getTime(), t.fechaFin.getTime())
  for (const p of [...serieReal, ...reportados, ...serieConsumo]) {
    const ms = Date.parse(`${p.weekStart}T00:00:00.000Z`)
    if (!Number.isNaN(ms)) fechas.push(ms)
  }
  if (fechas.length === 0)
    return { weeks: [], hasBaseline, tieneSerieReal, tieneReportados }

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

  // ── REAL: serie derivada del histórico; arrastre del último valor conocido ──
  const realPorSemana = new Map(serieReal.map((p) => [p.weekStart, p.porcentaje]))
  // ── REPORTADO: snapshots congelados, sin arrastre (puntos sueltos) ──
  const reportadoPorSemana = new Map(reportados.map((p) => [p.weekStart, p.porcentaje]))

  // ── CONSUMO: % de horas presupuestadas gastadas; también se arrastra ──
  const consumoPorSemana = new Map(serieConsumo.map((p) => [p.weekStart, p.porcentaje]))

  // El arrastre de Real y Consumo se corta en la semana en curso: el plan puede extenderse
  // meses hacia adelante, pero decir "el avance real de la semana del 21 de septiembre es
  // 20.9%" sería afirmar algo del futuro. Esas semanas quedan sin dato (la línea se acaba).
  const semanaActual = (() => {
    const dia = hoy.getUTCDay()
    const base = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())
    return new Date(base + (dia === 0 ? -6 : 1 - dia) * MS_PER_DAY).toISOString().slice(0, 10)
  })()

  let ultimoReal: number | null = null
  let realIniciado = false
  let ultimoConsumo: number | null = null
  let consumoIniciado = false
  const weeks: AvanceWeek[] = buckets.map((b, i) => {
    const esFuturo = b.weekStart > semanaActual
    const planificadoAcum = hayPlan ? Math.min(100, Number(plannedAcum[i].toFixed(2))) : null
    if (realPorSemana.has(b.weekStart)) {
      ultimoReal = realPorSemana.get(b.weekStart)!
      realIniciado = true
    }
    const realAcum = realIniciado && !esFuturo ? Number((ultimoReal as number).toFixed(2)) : null
    const reportado = reportadoPorSemana.has(b.weekStart)
      ? Number(reportadoPorSemana.get(b.weekStart)!.toFixed(2))
      : null
    if (consumoPorSemana.has(b.weekStart)) {
      ultimoConsumo = consumoPorSemana.get(b.weekStart)!
      consumoIniciado = true
    }
    // El consumo NO se topa a 100: pasarse del presupuesto es justo lo que hay que ver.
    const consumoAcum = consumoIniciado && !esFuturo ? Number((ultimoConsumo as number).toFixed(2)) : null
    return { weekStart: b.weekStart, weekLabel: b.weekLabel, planificadoAcum, realAcum, reportado, consumoAcum }
  })

  return { weeks, hasBaseline, tieneSerieReal, tieneReportados }
}
