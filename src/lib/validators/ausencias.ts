import { z } from 'zod'

// ─── TipoAusencia ─────────────────────────────────────────────────────────────

export const TipoAusenciaCreateSchema = z.object({
  codigo: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'El código debe ser MAYUSCULAS, dígitos y guiones bajos (ej. VAC, LIC_MED)'),
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hex válido (#RRGGBB)')
    .default('#6366f1'),
  descuentaSaldo: z.boolean().default(false),
  diasPorDefecto: z.number().positive('Debe ser un número positivo').nullable().optional(),
  tipoCicloSaldo: z.enum(['anio_calendario', 'anio_servicio', 'sin_ciclo']).default('sin_ciclo'),
  requiereDocumento: z.boolean().default(false),
  requiereAprobacion: z.boolean().default(true),
  requiereAprobacion2: z.boolean().default(false),
  diasUmbralAprobacion2: z.number().int().positive().nullable().optional(),
  aplicaFinDeSemana: z.boolean().default(false),
  activo: z.boolean().default(true),
  orden: z.number().int().min(0).default(0),
})

// PUT no permite cambiar el código
export const TipoAusenciaUpdateSchema = TipoAusenciaCreateSchema.omit({ codigo: true }).partial()

export const TipoAusenciaEstadoSchema = z.object({
  activo: z.boolean(),
})

// ─── SolicitudAusencia ────────────────────────────────────────────────────────

const TurnoDiaEnum = z.enum(['dia_completo', 'am', 'pm'])

export const SolicitudAusenciaCreateSchema = z
  .object({
    tipoAusenciaId: z.string().min(1, 'El tipo de ausencia es requerido'),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    turnoInicio: TurnoDiaEnum.default('dia_completo'),
    turnoFin: TurnoDiaEnum.default('dia_completo'),
    motivo: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.fechaFin) >= new Date(d.fechaInicio), {
    message: 'fechaFin debe ser mayor o igual a fechaInicio',
    path: ['fechaFin'],
  })

export const SolicitudAusenciaUpdateSchema = z
  .object({
    tipoAusenciaId: z.string().min(1).optional(),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    turnoInicio: TurnoDiaEnum.optional(),
    turnoFin: TurnoDiaEnum.optional(),
    motivo: z.string().max(500).optional(),
  })
  .refine(
    (d) => {
      if (d.fechaInicio && d.fechaFin) return new Date(d.fechaFin) >= new Date(d.fechaInicio)
      return true
    },
    { message: 'fechaFin debe ser mayor o igual a fechaInicio', path: ['fechaFin'] },
  )

// ─── Inferred types ───────────────────────────────────────────────────────────

export type TipoAusenciaCreateInput = z.infer<typeof TipoAusenciaCreateSchema>
export type TipoAusenciaUpdateInput = z.infer<typeof TipoAusenciaUpdateSchema>
export type TipoAusenciaEstadoInput = z.infer<typeof TipoAusenciaEstadoSchema>
export type SolicitudAusenciaCreateInput = z.infer<typeof SolicitudAusenciaCreateSchema>
export type SolicitudAusenciaUpdateInput = z.infer<typeof SolicitudAusenciaUpdateSchema>
