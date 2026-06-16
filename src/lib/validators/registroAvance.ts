import { z } from 'zod'

export const tipoRegistroAvanceEnum = z.enum([
  'avance_general',
  'montaje_instalacion',
  'conexionado_electrico',
  'instrumentacion',
  'pruebas_comisionamiento',
  'inspeccion_calidad',
])

export type TipoRegistroAvance = z.infer<typeof tipoRegistroAvanceEnum>

export const TIPO_REGISTRO_AVANCE_LABELS: Record<TipoRegistroAvance, string> = {
  avance_general: 'Avance general',
  montaje_instalacion: 'Montaje / Instalación',
  conexionado_electrico: 'Conexionado eléctrico',
  instrumentacion: 'Instrumentación',
  pruebas_comisionamiento: 'Pruebas / Comisionamiento',
  inspeccion_calidad: 'Inspección de calidad',
}

/**
 * Orden canónico de los tipos (mismo orden del enum). Sirve de checklist en el
 * cuaderno y define el orden de secciones del reporte fotográfico.
 */
export const SECCIONES_REPORTE: TipoRegistroAvance[] = [
  'avance_general',
  'montaje_instalacion',
  'conexionado_electrico',
  'instrumentacion',
  'pruebas_comisionamiento',
  'inspeccion_calidad',
]

export const crearRegistroAvanceSchema = z.object({
  evidenciaAvanceId: z.string().min(1, 'Selecciona una evidencia activa'),
  tipo: tipoRegistroAvanceEnum,
  descripcion: z.string().trim().min(3, 'La descripción es muy corta').max(2000, 'Máximo 2000 caracteres'),
  disciplina: z.string().trim().max(120).nullable().optional(),
  proyectoTareaId: z.string().min(1).nullable().optional(),
  registroHorasCampoTareaId: z.string().min(1).nullable().optional(),
  porcentajeAvance: z.number().int().min(0).max(100).nullable().optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type CrearRegistroAvanceInput = z.infer<typeof crearRegistroAvanceSchema>

export const actualizarRegistroAvanceSchema = z.object({
  tipo: tipoRegistroAvanceEnum.optional(),
  descripcion: z.string().trim().min(3).max(2000).optional(),
  disciplina: z.string().trim().max(120).nullable().optional(),
  proyectoTareaId: z.string().min(1).nullable().optional(),
  registroHorasCampoTareaId: z.string().min(1).nullable().optional(),
  porcentajeAvance: z.number().int().min(0).max(100).nullable().optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
})

export type ActualizarRegistroAvanceInput = z.infer<typeof actualizarRegistroAvanceSchema>
