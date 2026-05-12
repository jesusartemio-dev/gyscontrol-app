import { z } from 'zod'

// ─── Cabecera (crear / actualizar) ──────────────────────────────────────────
export const ipercCabeceraSchema = z.object({
  codigoDocumento: z.string().min(1),
  revision: z.string().optional(),
  fechaElaboracion: z.coerce.date().optional(),
  fechaActualizacion: z.coerce.date().optional(),
  gerencia: z.string().optional(),
  area: z.string().min(1),
  evaluadores: z
    .array(
      z.object({
        nombre: z.string().min(1),
        cargo: z.string().min(1),
      })
    )
    .optional(),
  estado: z.enum(['borrador', 'revisado', 'aprobado']).optional(),
})

export type IpercCabeceraInput = z.infer<typeof ipercCabeceraSchema>

// ─── Patch (todos los campos opcionales) ─────────────────────────────────────
export const ipercPatchSchema = ipercCabeceraSchema.partial()

export type IpercPatchInput = z.infer<typeof ipercPatchSchema>

// ─── Fila (crear / actualizar) ───────────────────────────────────────────────
export const ipercFilaSchema = z.object({
  proceso: z.string().min(1),
  actividad: z.string().min(1),
  tarea: z.string().min(1),
  puestoTrabajo: z.string().min(1),
  factorRiesgo: z.string().min(1),
  condicionActividad: z.string().min(1),
  peligro: z.string().min(1),
  riesgo: z.string().min(1),
  consecuencia: z.string().min(1),
  severidad: z.number().int().min(1).max(5),
  probabilidad: z.string().min(1),
  eliminar: z.string().optional(),
  sustituir: z.string().optional(),
  controlIngenieria: z.string().optional(),
  controlAdministrativo: z.string().optional(),
  controlReceptor: z.string().optional(),
  severidadResidual: z.number().int().min(1).max(5),
  probabilidadResidual: z.string().min(1),
  accionesMejora: z.string().optional(),
  responsables: z.string().optional(),
  tareaCronogramaRefId: z.string().optional(),
  actividadCronogramaRefId: z.string().optional(),
})

export type IpercFilaInput = z.infer<typeof ipercFilaSchema>

// ─── Reordenar filas ─────────────────────────────────────────────────────────
export const reordenarFilasSchema = z.object({
  orden: z.array(z.string()).min(1),
})

export type ReordenarFilasInput = z.infer<typeof reordenarFilasSchema>
