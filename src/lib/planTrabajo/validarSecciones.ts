import { z } from 'zod'
import {
  planAlcanceItemSchema,
  planEPPSchema,
  planHerramientasYEquiposSchema,
  planRestriccionSchema,
  planPersonalSchema,
  planRaciSchema,
  planHistogramasSchema,
  planCronogramaSchema,
  planResponsabilidadesSchema,
  planReferenciaSchema,
} from '@/lib/validators/planTrabajo'
import type { SeccionRegenerable } from '@/types/planTrabajo'

export interface ValidacionResultado {
  secciones: Record<string, unknown>
  errores: Record<string, string>
}

const SECCIONES_JSON = [
  { key: 'alcanceDetallado', schema: z.array(planAlcanceItemSchema) },
  { key: 'eppRequeridos', schema: planEPPSchema },
  { key: 'herramientasYEquipos', schema: planHerramientasYEquiposSchema },
  { key: 'restricciones', schema: z.array(planRestriccionSchema) },
  { key: 'personalAsignado', schema: z.array(planPersonalSchema) },
  { key: 'matrizRaci', schema: planRaciSchema },
  { key: 'histogramas', schema: planHistogramasSchema },
  { key: 'cronogramaResumen', schema: planCronogramaSchema },
  { key: 'responsabilidades', schema: planResponsabilidadesSchema },
  { key: 'referencias', schema: z.array(planReferenciaSchema) },
] as const

/**
 * Valida el output de la IA sección por sección con Zod.
 * Las secciones que pasen se devuelven en `secciones`.
 * Las que fallen se devuelven en `errores` (sin lanzar excepción).
 */
export function validarSeccionesPlan(raw: unknown): ValidacionResultado {
  const secciones: Record<string, unknown> = {}
  const errores: Record<string, string> = {}

  if (typeof raw !== 'object' || raw === null) {
    return { secciones, errores: { _root: 'El output de la IA no es un objeto JSON válido' } }
  }

  const obj = raw as Record<string, unknown>

  // Texto libre — validación mínima
  if (typeof obj.objetivo === 'string' && obj.objetivo.trim().length > 0) {
    secciones.objetivo = obj.objetivo.trim()
  } else if (obj.objetivo !== undefined) {
    errores.objetivo = 'objetivo debe ser un string no vacío'
  }

  if (typeof obj.alcanceGeneral === 'string' && obj.alcanceGeneral.trim().length > 0) {
    secciones.alcanceGeneral = obj.alcanceGeneral.trim()
  } else if (obj.alcanceGeneral !== undefined) {
    errores.alcanceGeneral = 'alcanceGeneral debe ser un string no vacío'
  }

  // Secciones estructuradas
  for (const { key, schema } of SECCIONES_JSON) {
    const value = obj[key]
    if (value === undefined) {
      errores[key] = 'Sección ausente en el output de la IA'
      continue
    }
    const parsed = (schema as z.ZodType).safeParse(value)
    if (parsed.success) {
      secciones[key] = parsed.data
    } else {
      errores[key] = parsed.error.issues
        .slice(0, 3)
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
    }
  }

  return { secciones, errores }
}

const SECCION_SCHEMAS: Partial<Record<SeccionRegenerable, z.ZodType>> = {
  alcanceDetallado: z.array(planAlcanceItemSchema),
  eppRequeridos: planEPPSchema,
  herramientasYEquipos: planHerramientasYEquiposSchema,
  restricciones: z.array(planRestriccionSchema),
  personalAsignado: z.array(planPersonalSchema),
  matrizRaci: planRaciSchema,
  histogramas: planHistogramasSchema,
  cronogramaResumen: planCronogramaSchema,
  responsabilidades: planResponsabilidadesSchema,
  referencias: z.array(planReferenciaSchema),
}

/**
 * Valida el output de la IA para una sola sección del Plan de Trabajo.
 * Espera un objeto JSON con la clave de la sección, p.ej. { "eppRequeridos": {...} }.
 */
export function validarSeccionIndividual(
  seccion: SeccionRegenerable,
  raw: unknown
): { data: unknown; error: string | null } {
  if (typeof raw !== 'object' || raw === null) {
    return { data: null, error: 'El output de la IA no es un objeto JSON válido' }
  }

  const obj = raw as Record<string, unknown>
  const val = obj[seccion]

  if (seccion === 'objetivo' || seccion === 'alcanceGeneral') {
    if (typeof val === 'string' && val.trim().length > 0) {
      return { data: val.trim(), error: null }
    }
    return { data: null, error: `"${seccion}" debe ser un string no vacío` }
  }

  const schema = SECCION_SCHEMAS[seccion]
  if (!schema) {
    return { data: null, error: `Sección "${seccion}" no tiene schema de validación` }
  }

  if (val === undefined) {
    return { data: null, error: `La respuesta de la IA no contiene la clave "${seccion}"` }
  }

  const parsed = schema.safeParse(val)
  if (parsed.success) {
    return { data: parsed.data, error: null }
  }

  const errorMsg = parsed.error.issues
    .slice(0, 3)
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ')
  return { data: null, error: errorMsg }
}
