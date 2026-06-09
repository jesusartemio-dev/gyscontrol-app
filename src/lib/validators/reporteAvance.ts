import { z } from 'zod'

// ─── Enums / constants ───────────────────────────────────────────────────────

export const estadoReporteAvanceEnum = z.enum(['borrador', 'enviado', 'aprobado', 'rechazado'])
export type EstadoReporteAvance = z.infer<typeof estadoReporteAvanceEnum>

export const ESTADO_REPORTE_AVANCE_LABELS: Record<EstadoReporteAvance, string> = {
  borrador: 'Borrador',
  enviado: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

// ─── Crear ───────────────────────────────────────────────────────────────────

export const crearReporteAvanceSchema = z.object({
  proyectoId: z.string().min(1),
  semanaIso: z.string().regex(/^\d{4}-W\d{2}$/, 'Formato inválido (ej. 2026-W05)'),
})

export type CrearReporteAvanceInput = z.infer<typeof crearReporteAvanceSchema>

// ─── Sub-schemas de los campos Json de narrativa ─────────────────────────────

export const comentarioHitoSchema = z.object({
  hitoId: z.string().min(1),
  comentario: z.string().trim().max(2000),
})
export type ComentarioHito = z.infer<typeof comentarioHitoSchema>

export const variacionSchema = z.object({
  fase: z.string().trim().max(200),
  causa: z.string().trim().max(2000),
})
export type Variacion = z.infer<typeof variacionSchema>

export const impedimentoSchema = z.object({
  restriccion: z.string().trim().min(1).max(2000),
  responsable: z.string().trim().max(200).nullable().optional(),
  fechaLimite: z.string().trim().max(40).nullable().optional(), // ISO date string (se guarda en Json)
})
export type Impedimento = z.infer<typeof impedimentoSchema>

// ─── Actualizar (narrativa, todo opcional) ───────────────────────────────────

export const actualizarReporteAvanceSchema = z.object({
  numero: z.number().int().nullable().optional(),
  alcanceTexto: z.string().max(10000).nullable().optional(),
  resumenEjecutivo: z.string().max(10000).nullable().optional(),
  comentariosHitos: z.array(comentarioHitoSchema).nullable().optional(),
  variaciones: z.array(variacionSchema).nullable().optional(),
  impedimentos: z.array(impedimentoSchema).nullable().optional(),
})

export type ActualizarReporteAvanceInput = z.infer<typeof actualizarReporteAvanceSchema>

// ─── Transiciones de estado ──────────────────────────────────────────────────

export const enviarReporteAvanceSchema = z.object({})
export type EnviarReporteAvanceInput = z.infer<typeof enviarReporteAvanceSchema>

export const aprobarReporteAvanceSchema = z.object({})
export type AprobarReporteAvanceInput = z.infer<typeof aprobarReporteAvanceSchema>

export const rechazarReporteAvanceSchema = z.object({
  notasRevision: z.string().trim().min(5, 'Explica el motivo del rechazo').max(2000),
})
export type RechazarReporteAvanceInput = z.infer<typeof rechazarReporteAvanceSchema>
