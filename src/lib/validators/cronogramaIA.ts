import { z } from 'zod'

export const configuracionWizardPaso1Schema = z.object({
  edtsSeleccionados: z.array(z.string().min(1)).min(1, 'Selecciona al menos un EDT'),
  brownfield: z.boolean(),
  ingenieriaDetalle: z.boolean(),
  tableros: z.array(z.object({ nombre: z.string().min(1) })),
  plcs: z.array(z.object({ nombre: z.string().min(1) })),
  hmiCantidad: z.number().int().min(0).max(50),
  scada: z.boolean(),
  nValorizaciones: z.number().int().min(0).max(100),
  duracionSemanas: z.number().int().min(0).max(520),
  nPersonas: z.number().int().min(0).max(1000),
  nPets: z.number().int().min(0).max(500),
  alcanceLibre: z.string().max(4000),
})

export const tareaPropuestaSchema = z.object({
  catalogoServicioId: z.string().min(1),
  nombre: z.string().min(1),
  cantidad: z.number().min(0),
  nivelDificultad: z.number().min(0),
  horaBase: z.number().min(0),
  horaRepetido: z.number().min(0),
  horasEstimadas: z.number().min(0),
  incluida: z.boolean(),
  motivoExclusion: z.string().optional(),
})

export const actividadPropuestaSchema = z.object({
  edtNombre: z.string().min(1),
  actividadNombre: z.string().min(1),
  tareas: z.array(tareaPropuestaSchema),
  origen: z.enum(['determinista', 'ia']),
})

export const propuestaActividadesSchema = z.array(actividadPropuestaSchema)
