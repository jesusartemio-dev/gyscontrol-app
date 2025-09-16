import { z } from 'zod'

export const plantillaServicioSchema = z.object({
  plantillaId: z.string().min(1, 'El ID de plantilla es requerido'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  categoria: z.string().min(3, 'La categoría debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  subtotalInterno: z.number().min(0, 'El subtotal interno debe ser mayor o igual a 0'),
  subtotalCliente: z.number().min(0, 'El subtotal cliente debe ser mayor o igual a 0'),
})

export type PlantillaServicioInput = z.infer<typeof plantillaServicioSchema>
