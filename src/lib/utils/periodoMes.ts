import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function parsearMes(mes: string): { year: number; month: number } {
  const m = mes.match(/^(\d{4})-(\d{2})$/)
  if (!m) throw new Error(`Formato de mes inválido: ${mes} (esperado YYYY-MM)`)
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) throw new Error(`Mes fuera de rango: ${month}`)
  if (year < 2000 || year > 2100) throw new Error(`Año fuera de rango: ${year}`)
  return { year, month }
}

export function formatearMes(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function rangoMes(mes: string): { fechaInicio: Date; fechaFin: Date } {
  const { year, month } = parsearMes(mes)
  const fechaInicio = new Date(year, month - 1, 1, 0, 0, 0, 0)
  // day 0 of next month = last day of current month
  const fechaFin = new Date(year, month, 0, 23, 59, 59, 999)
  return { fechaInicio, fechaFin }
}

// Lunes a sábado, excluye domingos
export function diasLaborablesEnMes(mes: string): number {
  const { fechaInicio, fechaFin } = rangoMes(mes)
  let count = 0
  const current = new Date(fechaInicio)
  while (current <= fechaFin) {
    if (current.getDay() !== 0) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function mesAnterior(mes: string): string {
  const { year, month } = parsearMes(mes)
  // month - 2 porque month está en base 1, y Date usa base 0
  return formatearMes(new Date(year, month - 2, 1))
}

export function mesSiguiente(mes: string): string {
  const { year, month } = parsearMes(mes)
  return formatearMes(new Date(year, month, 1))
}

export function labelMes(mes: string): string {
  const { fechaInicio } = rangoMes(mes)
  const label = format(fechaInicio, 'MMMM yyyy', { locale: es })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
