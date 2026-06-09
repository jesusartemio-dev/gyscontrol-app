import { startOfISOWeek, endOfISOWeek, getISOWeek, getISOWeekYear, addWeeks } from 'date-fns'

// Helpers de semana ISO compartidos. Copiados desde el validador de seguridad
// (no se refactoriza seguridad; este util es para el módulo de avance y futuros).

/** Parses "YYYY-Www" → { year, week } */
export function parsearSemanaIso(semana: string): { year: number; week: number } {
  const m = semana.match(/^(\d{4})-W(\d{2})$/)
  if (!m) throw new Error(`Formato de semana inválido: ${semana}`)
  return { year: Number(m[1]), week: Number(m[2]) }
}

/** Date → "YYYY-Www" */
export function formatearSemanaIso(date: Date): string {
  const week = getISOWeek(date)
  const year = getISOWeekYear(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** "YYYY-Www" → { fechaInicio: Monday 00:00 UTC, fechaFin: Sunday 23:59:59 UTC } */
export function rangoSemanaIso(semana: string): { fechaInicio: Date; fechaFin: Date } {
  const { year, week } = parsearSemanaIso(semana)
  // Reconstruct the Monday of that ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4)) // Jan 4 is always in ISO week 1
  const monday = startOfISOWeek(jan4)
  const targetMonday = addWeeks(monday, week - 1)
  const fechaInicio = new Date(Date.UTC(targetMonday.getFullYear(), targetMonday.getMonth(), targetMonday.getDate()))
  const sunday = endOfISOWeek(targetMonday)
  const fechaFin = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999))
  return { fechaInicio, fechaFin }
}
