// src/lib/validators/plantillaEquipo.ts
import { z } from 'zod'

export const plantillaEquipoSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
})

export type PlantillaEquipoInput = z.infer<typeof plantillaEquipoSchema>
