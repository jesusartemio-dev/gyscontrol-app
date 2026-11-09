import { z } from 'zod'

export const mppCabeceraSchema = z.object({
  codigoDocumento: z.string().min(1),
  revision: z.string().optional(),
  fechaElaboracion: z.coerce.date().optional(),
  fechaActualizacion: z.coerce.date().optional(),
  area: z.string().optional(),
  gerencia: z.string().optional(),
  observaciones: z.string().optional(),
  estado: z.enum(['borrador', 'revisado', 'aprobado']).optional(),
})

export type MppCabeceraInput = z.infer<typeof mppCabeceraSchema>

export const mppPatchSchema = mppCabeceraSchema.partial()

export type MppPatchInput = z.infer<typeof mppPatchSchema>

export const mppItemPatchSchema = z.object({
  // asignaciones: { [puesto: string]: boolean }
  asignaciones: z.record(z.string(), z.boolean()).optional(),
  observaciones: z.string().nullable().optional(),
})

// Lote: lo pegado desde texto / IA (varios EPP a la vez, todo o nada).
export const mppItemsLoteSchema = z.object({
  cambios: z.array(mppItemPatchSchema.extend({ id: z.string().min(1) })).min(1),
})

export type MppItemPatchInput = z.infer<typeof mppItemPatchSchema>
