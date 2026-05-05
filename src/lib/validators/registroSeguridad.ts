import { z } from 'zod'

export const tipoRegistroSeguridadEnum = z.enum([
  'charla',
  'inspeccion',
  'observacion',
  'incidente',
  'actividad_general',
  'riesgo_critico',
  'medio_ambiente',
  'prevencion_salud',
])

export type TipoRegistroSeguridad = z.infer<typeof tipoRegistroSeguridadEnum>

export const TIPO_REGISTRO_LABELS: Record<TipoRegistroSeguridad, string> = {
  charla: 'Charla NDAD',
  inspeccion: 'Inspección',
  observacion: 'Observación',
  incidente: 'Incidente',
  actividad_general: 'Actividad general',
  riesgo_critico: 'Riesgo crítico',
  medio_ambiente: 'Medio ambiente',
  prevencion_salud: 'Prevención de salud',
}

export const crearRegistroSeguridadSchema = z.object({
  registroHorasCampoId: z.string().min(1, 'Selecciona una jornada activa'),
  tipo: tipoRegistroSeguridadEnum,
  descripcion: z.string().trim().min(3, 'La descripción es muy corta').max(2000, 'Máximo 2000 caracteres'),
  asistentes: z.number().int().nonnegative().nullable().optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type CrearRegistroSeguridadInput = z.infer<typeof crearRegistroSeguridadSchema>

export const actualizarRegistroSeguridadSchema = z.object({
  tipo: tipoRegistroSeguridadEnum.optional(),
  descripcion: z.string().trim().min(3).max(2000).optional(),
  asistentes: z.number().int().nonnegative().nullable().optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type ActualizarRegistroSeguridadInput = z.infer<typeof actualizarRegistroSeguridadSchema>
