import { TurnoDia } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── Public async entry point (queries DB for holidays) ──────────────────────

export async function calcularDiasHabiles(
  fechaInicio: Date,
  fechaFin: Date,
  turnoInicio: TurnoDia,
  turnoFin: TurnoDia,
  aplicaFinDeSemana: boolean,
  calendarioLaboralId?: string,
): Promise<number> {
  let feriadoSet = new Set<string>()

  if (calendarioLaboralId && !aplicaFinDeSemana) {
    const excepciones = await prisma.excepcionCalendario.findMany({
      where: {
        calendarioLaboralId,
        tipo: { in: ['feriado', 'dia_no_laboral'] },
        fecha: { gte: normalizeDate(fechaInicio), lte: normalizeDate(fechaFin) },
      },
      select: { fecha: true },
    })
    feriadoSet = new Set(excepciones.map((e) => toDateKey(e.fecha)))
  }

  return calcularDiasHabilesSync(
    fechaInicio,
    fechaFin,
    turnoInicio,
    turnoFin,
    aplicaFinDeSemana,
    feriadoSet,
  )
}

// ─── Pure sync core (exported for tests) ─────────────────────────────────────

export function calcularDiasHabilesSync(
  fechaInicio: Date,
  fechaFin: Date,
  turnoInicio: TurnoDia,
  turnoFin: TurnoDia,
  aplicaFinDeSemana: boolean,
  feriadoSet: Set<string> = new Set(),
): number {
  const inicio = normalizeDate(fechaInicio)
  const fin = normalizeDate(fechaFin)

  // ── Same-day edge case ───────────────────────────────────────────────────
  if (inicio.getTime() === fin.getTime()) {
    if (!isDayEligible(inicio, aplicaFinDeSemana, feriadoSet)) return 0
    // Both dia_completo → full day; any half-turn → half day
    return turnoInicio === 'dia_completo' && turnoFin === 'dia_completo' ? 1 : 0.5
  }

  // ── Multi-day range ──────────────────────────────────────────────────────
  let dias = 0
  let current = new Date(inicio)

  while (current <= fin) {
    if (isDayEligible(current, aplicaFinDeSemana, feriadoSet)) {
      if (current.getTime() === inicio.getTime()) {
        // First day: PM start → only afternoon counts (0.5)
        dias += turnoInicio === 'pm' ? 0.5 : 1
      } else if (current.getTime() === fin.getTime()) {
        // Last day: AM end → only morning counts (0.5)
        dias += turnoFin === 'am' ? 0.5 : 1
      } else {
        dias += 1
      }
    }
    current = addOneDay(current)
  }

  return dias
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalizes a Date to UTC midnight so that comparisons are timezone-independent.
 *
 * WHY UTC: Prisma returns @db.Date columns as JS Date objects at UTC midnight
 * (e.g. 2026-05-18T00:00:00.000Z). Using setHours() (local-TZ) in a UTC-5
 * environment would shift such a date back one day (May 18 UTC → May 17 local),
 * causing Monday to be treated as Sunday and producing off-by-one day counts.
 * setUTCHours() normalizes to UTC midnight regardless of the server's local timezone.
 */
function normalizeDate(d: Date): Date {
  const n = new Date(d)
  n.setUTCHours(0, 0, 0, 0)
  return n
}

function addOneDay(d: Date): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + 1)
  return next
}

export function toDateKey(d: Date): string {
  // YYYY-MM-DD in UTC to avoid timezone drift when comparing
  return d.toISOString().slice(0, 10)
}

function isDayEligible(date: Date, aplicaFinDeSemana: boolean, feriadoSet: Set<string>): boolean {
  // When aplicaFinDeSemana=true (ej. MAT ley 29992) all calendar days count
  if (aplicaFinDeSemana) return true

  const day = date.getUTCDay() // 0=Sun, 6=Sat — must match UTC normalization in normalizeDate
  if (day === 0 || day === 6) return false
  if (feriadoSet.has(toDateKey(date))) return false
  return true
}

// ─── Lista de días hábiles (para materialización y validación de conflictos) ──

export interface DiaHabilItem {
  fecha: Date
  turno: TurnoDia
  dias: number // 1 = día completo, 0.5 = medio día
}

/**
 * Devuelve la lista de celdas a crear/revisar en planificacion_dia,
 * una entrada por día hábil con el turno correcto.
 * Misma lógica que calcularDiasHabilesSync pero devuelve items en vez de total.
 */
export function calcularDiasHabilesLista(
  fechaInicio: Date,
  fechaFin: Date,
  turnoInicio: TurnoDia,
  turnoFin: TurnoDia,
  aplicaFinDeSemana: boolean,
  feriadoSet: Set<string> = new Set(),
): DiaHabilItem[] {
  const inicio = normalizeDate(fechaInicio)
  const fin = normalizeDate(fechaFin)

  // ── Same-day ─────────────────────────────────────────────────────────────
  if (inicio.getTime() === fin.getTime()) {
    if (!isDayEligible(inicio, aplicaFinDeSemana, feriadoSet)) return []
    if (turnoInicio === 'dia_completo' && turnoFin === 'dia_completo') {
      return [{ fecha: new Date(inicio), turno: 'dia_completo', dias: 1 }]
    }
    // Both am → am cell; both pm → pm cell; mixed → treat as full day
    const turno: TurnoDia =
      turnoInicio === 'am' && turnoFin === 'am'
        ? 'am'
        : turnoInicio === 'pm' && turnoFin === 'pm'
          ? 'pm'
          : 'dia_completo'
    return [{ fecha: new Date(inicio), turno, dias: 0.5 }]
  }

  // ── Multi-day ─────────────────────────────────────────────────────────────
  const items: DiaHabilItem[] = []
  let current = new Date(inicio)

  while (current <= fin) {
    if (isDayEligible(current, aplicaFinDeSemana, feriadoSet)) {
      let turno: TurnoDia
      let dias: number

      if (current.getTime() === inicio.getTime()) {
        turno = turnoInicio === 'pm' ? 'pm' : 'dia_completo'
        dias = turnoInicio === 'pm' ? 0.5 : 1
      } else if (current.getTime() === fin.getTime()) {
        turno = turnoFin === 'am' ? 'am' : 'dia_completo'
        dias = turnoFin === 'am' ? 0.5 : 1
      } else {
        turno = 'dia_completo'
        dias = 1
      }

      items.push({ fecha: new Date(current), turno, dias })
    }
    current = addOneDay(current)
  }

  return items
}
