import { z } from 'zod'

export const mppCabeceraSchema = z.object({
  codigoDocumento: z.string().min(1),
  revision: z.string().optional(),
  fechaElaboracion: z.coerce.date().optional(),
  fechaActualizacion: z.coerce.date().optional(),
  area: z.string().optional(),
  elaboradoPor: z.string().optional(),
  revisadoPor: z.string().optional(),
  aprobadoPor: z.string().optional(),
  estado: z.enum(['borrador', 'revisado', 'aprobado']).optional(),
})

export type MppCabeceraInput = z.infer<typeof mppCabeceraSchema>

export const mppPatchSchema = mppCabeceraSchema.partial()

export type MppPatchInput = z.infer<typeof mppPatchSchema>

export const mppItemPatchSchema = z.object({
  cantidad: z.number().int().min(1).optional(),
  periodo: z.enum(['mensual', 'trimestral', 'semestral', 'anual', 'obra']).optional(),
  requiere: z.boolean().optional(),
  nota: z.string().optional(),
})

export type MppItemPatchInput = z.infer<typeof mppItemPatchSchema>
