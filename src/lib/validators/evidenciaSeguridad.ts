import { z } from 'zod'

export const estadoEvidenciaSeguridadEnum = z.enum(['abierta', 'cerrada'])

export type EstadoEvidenciaSeguridad = z.infer<typeof estadoEvidenciaSeguridadEnum>

export const crearEvidenciaSeguridadSchema = z.object({
  registroHorasCampoId: z.string().min(1, 'Selecciona una jornada activa'),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type CrearEvidenciaSeguridadInput = z.infer<typeof crearEvidenciaSeguridadSchema>

export const actualizarEvidenciaSeguridadSchema = z.object({
  estado: estadoEvidenciaSeguridadEnum.optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type ActualizarEvidenciaSeguridadInput = z.infer<typeof actualizarEvidenciaSeguridadSchema>
