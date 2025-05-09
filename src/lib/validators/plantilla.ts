// src/lib/validators/plantilla.ts
import { z } from 'zod'

export const plantillaSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
})

export type PlantillaInput = z.infer<typeof plantillaSchema>
