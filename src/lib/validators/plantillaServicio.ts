import { z } from 'zod'

export const plantillaServicioSchema = z.object({
  categoria: z.string().min(3, 'La categoría debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  unidad: z.string().min(1, 'La unidad es requerida'),
  cantidad: z
    .number({ invalid_type_error: 'Cantidad debe ser un número' })
    .min(1, 'La cantidad debe ser al menos 1'),
  precioUnitario: z
    .number({ invalid_type_error: 'Precio unitario debe ser un número' })
    .min(0, 'El precio debe ser mayor o igual a 0'),
})

export type PlantillaServicioInput = z.infer<typeof plantillaServicioSchema>
