import { z } from 'zod'
import { startOfISOWeek, endOfISOWeek, getISOWeek, getISOWeekYear, addWeeks } from 'date-fns'

// ─── ISO week helpers ────────────────────────────────────────────────────────

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

// ─── Enums / constants ───────────────────────────────────────────────────────

export const estadoReporteSeguridadEnum = z.enum(['borrador', 'enviado', 'aprobado', 'rechazado'])
export type EstadoReporteSeguridad = z.infer<typeof estadoReporteSeguridadEnum>

export const ESTADO_REPORTE_LABELS: Record<EstadoReporteSeguridad, string> = {
  borrador: 'Borrador',
  enviado: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const crearReporteSeguridadSchema = z.object({
  proyectoId: z.string().min(1),
  semanaIso: z.string().regex(/^\d{4}-W\d{2}$/, 'Formato inválido (ej. 2026-W19)'),
})

export type CrearReporteSeguridadInput = z.infer<typeof crearReporteSeguridadSchema>

export const actualizarReporteSeguridadSchema = z.object({
  resumenEjecutivo: z.string().max(10000).nullable().optional(),
  horasHombre: z.number().nonnegative().nullable().optional(),
  diasSinAccidentes: z.number().int().nonnegative().nullable().optional(),
  incidentesCount: z.number().int().nonnegative().nullable().optional(),
  accidentesCount: z.number().int().nonnegative().nullable().optional(),
  horasCapacitacion: z.number().nonnegative().nullable().optional(),
  personasCapacitadas: z.number().int().nonnegative().nullable().optional(),
  // Reporte COVID 19
  totalPersonas: z.number().int().nonnegative().nullable().optional(),
  trabajadoresObra: z.number().int().nonnegative().nullable().optional(),
  homeOffice: z.number().int().nonnegative().nullable().optional(),
  casosSospechosos: z.number().int().nonnegative().nullable().optional(),
  casosInfectados: z.number().int().nonnegative().nullable().optional(),
  casosCurados: z.number().int().nonnegative().nullable().optional(),
  fallecidos: z.number().int().nonnegative().nullable().optional(),
  grupoRiesgo: z.number().int().nonnegative().nullable().optional(),
})

export type ActualizarReporteSeguridadInput = z.infer<typeof actualizarReporteSeguridadSchema>

export const rechazarReporteSeguridadSchema = z.object({
  notasRevision: z.string().trim().min(5, 'Explica el motivo del rechazo').max(2000),
})
