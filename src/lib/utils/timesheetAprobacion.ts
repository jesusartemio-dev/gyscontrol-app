import { prisma } from '@/lib/prisma'

/**
 * Calcula la semana ISO (YYYY-Www) a partir de una fecha.
 * Ejemplo: 2026-02-16 → "2026-W08"
 */
export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Obtiene el rango de fechas (lunes a domingo) de una semana ISO.
 * Input: "2026-W08" → { inicio: Date(lunes), fin: Date(domingo) }
 */
export function getWeekRange(semana: string): { inicio: Date; fin: Date } {
  const [yearStr, weekStr] = semana.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(weekStr)

  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7 // Mon=1 ... Sun=7
  // Monday of week 1
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1)

  const inicio = new Date(week1Monday)
  inicio.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)

  const fin = new Date(inicio)
  fin.setUTCDate(inicio.getUTCDate() + 6)

  return { inicio, fin }
}

/**
 * Verifica si la semana de una fecha es editable para un usuario.
 * Retorna true si no existe aprobación, es borrador, o está rechazada.
 * Retorna false si está enviada o aprobada (bloqueada).
 */
export async function verificarSemanaEditable(usuarioId: string, fecha: Date): Promise<boolean> {
  const semana = getISOWeek(fecha)
  const aprobacion = await prisma.timesheetAprobacion.findUnique({
    where: { usuarioId_semana: { usuarioId, semana } },
    select: { estado: true }
  })

  if (!aprobacion) return true
  return aprobacion.estado === 'borrador' || aprobacion.estado === 'rechazado'
}

/**
 * Verifica si una semana específica (string) es editable.
 */
export async function verificarSemanaEditablePorCodigo(usuarioId: string, semana: string): Promise<boolean> {
  const aprobacion = await prisma.timesheetAprobacion.findUnique({
    where: { usuarioId_semana: { usuarioId, semana } },
    select: { estado: true }
  })

  if (!aprobacion) return true
  return aprobacion.estado === 'borrador' || aprobacion.estado === 'rechazado'
}
