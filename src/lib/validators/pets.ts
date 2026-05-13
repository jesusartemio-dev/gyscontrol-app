import { z } from 'zod'

// ─── Cabecera ─────────────────────────────────────────────────────────────────

export const petsCabeceraSchema = z.object({
  codigoDocumento: z.string().nullish(),
  revision: z.string().nullish(),
  fechaEmision: z.coerce.date().nullish(),
  fechaAprobacion: z.coerce.date().nullish(),
  area: z.string().nullish(),
  alcance: z.string().nullish(),
  preparadoPor: z.string().nullish(),
  preparadoCargo: z.string().nullish(),
  revisadoPor1: z.string().nullish(),
  revisadoCargo1: z.string().nullish(),
  revisadoPor2: z.string().nullish(),
  revisadoCargo2: z.string().nullish(),
  aprobadoPor: z.string().nullish(),
  aprobadoCargo: z.string().nullish(),
  estado: z.enum(['borrador', 'revisado', 'aprobado']).nullish(),
})

export type PetsCabeceraInput = z.infer<typeof petsCabeceraSchema>

export const petsPatchSchema = petsCabeceraSchema.partial()

export type PetsPatchInput = z.infer<typeof petsPatchSchema>

// ─── BloqueComo (discriminated union recursiva) ───────────────────────────────

export type BloqueComo =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; titulo?: string; items: string[] }
  | { tipo: 'subseccion'; titulo: string; bloques: BloqueComo[] }
  | { tipo: 'tabla'; titulo?: string; headers: string[]; filas: string[][] }
  | { tipo: 'ilustracion'; numero: number; titulo: string }
  | { tipo: 'referencia'; documento: string; codigo: string; nota?: string }
  | { tipo: 'restriccion'; titulo?: string; prohibiciones: string[] }

// z.lazy() + discriminatedUnion requires an explicit cast to satisfy the recursive type annotation
export const bloqueComoSchema: z.ZodType<BloqueComo> = z.lazy(() =>
  z.discriminatedUnion('tipo', [
    z.object({
      tipo: z.literal('parrafo'),
      texto: z.string(),
    }),
    z.object({
      tipo: z.literal('lista'),
      titulo: z.string().optional(),
      items: z.string().array().min(1),
    }),
    z.object({
      tipo: z.literal('subseccion'),
      titulo: z.string(),
      bloques: z.array(bloqueComoSchema).min(1),
    }),
    z.object({
      tipo: z.literal('tabla'),
      titulo: z.string().optional(),
      headers: z.string().array(),
      filas: z.string().array().array(),
    }),
    z.object({
      tipo: z.literal('ilustracion'),
      numero: z.number(),
      titulo: z.string(),
    }),
    z.object({
      tipo: z.literal('referencia'),
      documento: z.string(),
      codigo: z.string(),
      nota: z.string().optional(),
    }),
    z.object({
      tipo: z.literal('restriccion'),
      titulo: z.string().optional(),
      prohibiciones: z.string().array().min(1),
    }),
  ])
) as z.ZodType<BloqueComo>

// ─── Contenido completo ───────────────────────────────────────────────────────

export const petsContenidoSchema = z.object({
  personal: z.array(z.object({ rol: z.string() })).min(1),

  epp: z.object({
    basico: z.array(z.object({ nombre: z.string() })),
    bioseguridad: z.array(z.object({ nombre: z.string() })),
    especifico: z.array(z.object({ nombre: z.string() })),
    mppRef: z.string(),
  }),

  recursos: z.object({
    equipos: z.array(z.object({ nombre: z.string() })),
    herramientas: z.array(z.object({ nombre: z.string() })),
    materiales: z.array(z.object({ nombre: z.string() })),
  }),

  procedimiento: z.object({
    etapas: z
      .array(
        z.object({
          letra: z.string().optional(),
          titulo: z.string().min(3),
          pasos: z
            .array(
              z.object({
                numero: z.number().optional(),
                que: z.string().min(3),
                como: z.array(bloqueComoSchema).min(1),
                quien: z.array(z.object({ rol: z.string() })).min(1),
              })
            )
            .min(1),
        })
      )
      .min(1)
      .max(12),
  }),

  restricciones: z.array(z.object({ texto: z.string() })).min(1),

  cambios: z
    .array(
      z.object({
        fecha: z.string(),
        version: z.string(),
        descripcion: z.string(),
      })
    )
    .min(1),
})

export type PetsContenido = z.infer<typeof petsContenidoSchema>
