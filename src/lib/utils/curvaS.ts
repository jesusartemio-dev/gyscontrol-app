// ─── Curva S (Earned Value Management) ─── utility functions ───

// ─── Types ───

export interface WeekBucket {
  weekStart: string  // ISO date del lunes: "2025-05-26"
  weekLabel: string  // "26/05" (dd/MM del lunes)
  pv: number         // incremental en esta semana
  ev: number         // incremental en esta semana
  pvAcum: number     // acumulado (se llena en accumulateBuckets)
  evAcum: number     // acumulado (se llena en accumulateBuckets)
}

export interface EVMMetrics {
  spi: number | null   // EV / PV (null si pvTotal = 0)
  sv: number           // EV - PV (Schedule Variance)
  cpi: null            // no calculamos AC en v1
  cv: null             // no calculamos AC en v1
  pvTotal: number      // PV acumulado a la semana actual
  evTotal: number      // EV acumulado total
  bac: number
}

export interface CurvaSResult {
  weeks: WeekBucket[]
  bac: number
  evm: EVMMetrics
  hasBaseline: boolean
  cronogramaId: string | null
  proyecto: { id: string; codigo: string; nombre: string }
}

// ─── Helpers ───

const MS_PER_DAY = 86_400_000

/** Truncate a Date to start-of-day UTC and return ms */
function toDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Days between two dates (inclusive of both ends) */
function daysBetween(a: Date, b: Date): number {
  return Math.round((toDay(b) - toDay(a)) / MS_PER_DAY) + 1
}

/** Days of overlap between two date ranges [a1,a2] and [b1,b2] (inclusive) */
function daysOverlap(a1: Date, a2: Date, b1: Date, b2: Date): number {
  const start = Math.max(toDay(a1), toDay(b1))
  const end = Math.min(toDay(a2), toDay(b2))
  if (end < start) return 0
  return Math.round((end - start) / MS_PER_DAY) + 1
}

/** Get the Monday (start of ISO week) for a given date */
function getMonday(d: Date): Date {
  const day = d.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  return new Date(toDay(d) + diff * MS_PER_DAY)
}

/** Get the Sunday (end of ISO week) for a given date */
function getSunday(d: Date): Date {
  const monday = getMonday(d)
  return new Date(toDay(monday) + 6 * MS_PER_DAY)
}

/** Format a Date as "dd/MM" */
function formatDDMM(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

/** Format a Date as ISO date string "YYYY-MM-DD" */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ─── Exported functions ───

const MAX_WEEKS = 104

/**
 * Genera array de semanas (lunes a domingo) cubriendo el rango completo.
 * Límite: 104 semanas máximo.
 */
export function buildWeekBuckets(startDate: Date, endDate: Date): WeekBucket[] {
  const firstMonday = getMonday(startDate)
  const lastSunday = getSunday(endDate)

  const buckets: WeekBucket[] = []
  let current = new Date(toDay(firstMonday))

  while (toDay(current) <= toDay(lastSunday)) {
    if (buckets.length >= MAX_WEEKS) {
      console.warn(
        `[CurvaS] Rango excede ${MAX_WEEKS} semanas — limitando a ${MAX_WEEKS}. ` +
        `Rango: ${toISODate(startDate)} — ${toISODate(endDate)}`
      )
      break
    }

    buckets.push({
      weekStart: toISODate(current),
      weekLabel: formatDDMM(current),
      pv: 0,
      ev: 0,
      pvAcum: 0,
      evAcum: 0,
    })

    // Advance to next Monday
    current = new Date(toDay(current) + 7 * MS_PER_DAY)
  }

  return buckets
}

/**
 * Distribuye el costo de una tarea linealmente entre las semanas del rango.
 * Modifica buckets[].pv in-place.
 */
export function distributeTaskCostByWeek(
  task: { fechaInicio: Date; fechaFin: Date; costo: number },
  buckets: WeekBucket[]
): void {
  if (!task.costo || task.costo === 0 || buckets.length === 0) return
  if (isNaN(task.costo)) return

  const totalDays = daysBetween(task.fechaInicio, task.fechaFin)
  if (totalDays <= 0) return

  for (const bucket of buckets) {
    const bucketMonday = new Date(bucket.weekStart + 'T00:00:00Z')
    const bucketSunday = new Date(toDay(bucketMonday) + 6 * MS_PER_DAY)

    const overlap = daysOverlap(task.fechaInicio, task.fechaFin, bucketMonday, bucketSunday)
    if (overlap > 0) {
      bucket.pv += task.costo * (overlap / totalDays)
    }
  }
}

/**
 * Coloca el monto de una valorización en la semana correspondiente.
 * Si periodoFin está fuera del rango, va al bucket más cercano.
 * Modifica buckets[].ev in-place.
 */
export function placeValorizacionInWeek(
  val: { periodoFin: Date; monto: number },
  buckets: WeekBucket[]
): void {
  if (buckets.length === 0 || !val.monto) return

  const valDay = toDay(val.periodoFin)

  // Find the bucket that contains periodoFin
  for (const bucket of buckets) {
    const bucketMonday = new Date(bucket.weekStart + 'T00:00:00Z')
    const bucketSunday = new Date(toDay(bucketMonday) + 6 * MS_PER_DAY)

    if (valDay >= toDay(bucketMonday) && valDay <= toDay(bucketSunday)) {
      bucket.ev += val.monto
      return
    }
  }

  // periodoFin fuera del rango — asignar al bucket más cercano
  const firstBucketStart = toDay(new Date(buckets[0].weekStart + 'T00:00:00Z'))
  if (valDay < firstBucketStart) {
    buckets[0].ev += val.monto
  } else {
    buckets[buckets.length - 1].ev += val.monto
  }
}

/**
 * Transforma PV y EV de incrementales a acumulativos.
 * Modifica buckets in-place y los retorna.
 */
export function accumulateBuckets(buckets: WeekBucket[]): WeekBucket[] {
  let pvRunning = 0
  let evRunning = 0

  for (const bucket of buckets) {
    pvRunning += bucket.pv
    evRunning += bucket.ev
    bucket.pvAcum = pvRunning
    bucket.evAcum = evRunning
  }

  return buckets
}

/**
 * Calcula métricas EVM a partir de los buckets acumulados.
 * "Semana actual" = última semana con ev > 0.
 * Si ninguna tiene ev, usa el último bucket.
 */
export function calculateEVM(buckets: WeekBucket[], bac: number): EVMMetrics {
  if (buckets.length === 0) {
    return { spi: null, sv: 0, cpi: null, cv: null, pvTotal: 0, evTotal: 0, bac }
  }

  // EV acumulado total = último bucket.evAcum
  const evTotal = buckets[buckets.length - 1].evAcum

  // "Semana actual" para PV = última semana con ev > 0
  let currentWeekIdx = buckets.length - 1
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].ev > 0) {
      currentWeekIdx = i
      break
    }
  }

  const pvTotal = buckets[currentWeekIdx].pvAcum
  const spi = pvTotal > 0 && evTotal > 0 ? evTotal / pvTotal : null
  const sv = evTotal - pvTotal

  return { spi, sv, cpi: null, cv: null, pvTotal, evTotal, bac }
}
