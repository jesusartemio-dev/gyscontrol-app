/**
 * Utilidades compartidas para el módulo de Planificación de Personal.
 * Funciones puras sin dependencias externas.
 */

export const COLORES_PROYECTO = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#F43F5E', // rose
]

/**
 * Devuelve un color determinístico para un proyectoId dado.
 * El mismo ID siempre produce el mismo color.
 */
export function colorParaProyecto(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return COLORES_PROYECTO[Math.abs(h) % COLORES_PROYECTO.length]
}

/**
 * Resuelve el color final de un proyecto:
 * usa el guardado en DB si existe, si no el determinístico por ID.
 */
export function resolverColorProyecto(id: string, colorGuardado?: string | null): string {
  return colorGuardado || colorParaProyecto(id)
}

/**
 * Devuelve las iniciales (máximo 2) a partir del nombre completo.
 * Ejemplo: "Juan Ramírez" → "JR", "María" → "M"
 */
export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * Convierte un objeto Date a una cadena "YYYY-MM-DD" usando UTC.
 */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Suma n días a una fecha usando UTC (evita desplazamientos de zona horaria).
 */
export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86400000)
}

/**
 * Devuelve la semana ISO 8601 de una fecha UTC como "YYYY-Www".
 * Ejemplo: 2026-05-25 → "2026-W22"
 */
export function dateToISOWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * Convierte una semana ISO "YYYY-Www" al lunes UTC correspondiente.
 * Lanza Error si el formato es inválido.
 */
export function parseISOWeek(isoWeek: string): Date {
  const match = isoWeek.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) throw new Error(`Formato de semana inválido: ${isoWeek}`)
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  // El 4 de enero siempre está en la semana 1 de su año ISO
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  return new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000)
}
