import { z } from 'zod'

export const estadoEvidenciaAvanceEnum = z.enum(['abierta', 'cerrada'])

export type EstadoEvidenciaAvance = z.infer<typeof estadoEvidenciaAvanceEnum>

export const crearEvidenciaAvanceSchema = z.object({
  registroHorasCampoId: z.string().min(1, 'Selecciona una jornada activa'),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type CrearEvidenciaAvanceInput = z.infer<typeof crearEvidenciaAvanceSchema>

export const actualizarEvidenciaAvanceSchema = z.object({
  estado: estadoEvidenciaAvanceEnum.optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type ActualizarEvidenciaAvanceInput = z.infer<typeof actualizarEvidenciaAvanceSchema>
