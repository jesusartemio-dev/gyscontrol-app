import { z } from 'zod'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'

const FACTORES_RIESGO = [
  'MECÁNICO', 'LOCATIVO', 'ELÉCTRICO', 'FÍSICO', 'QUÍMICO',
  'ERGONÓMICO', 'PSICOSOCIAL', 'BIOLÓGICO', 'FISICOQUÍMICO',
] as const

const probabilidadEnum = z.enum(['A', 'B', 'C', 'D', 'E'])
const severidadSchema = z.number().int().min(1).max(5)

const filaIpercIaSchema = z.object({
  tareaId: z.string().min(1),
  actividadId: z.string().nullable().optional(),
  proceso: z.string().min(1),
  actividad: z.string().min(1),
  tarea: z.string().min(1),
  puestoTrabajo: z.string().min(1),
  factorRiesgo: z.enum(FACTORES_RIESGO),
  condicionActividad: z.enum(['Rutinaria', 'No rutinaria']),
  peligro: z.string().min(1),
  riesgo: z.string().min(1),
  consecuencia: z.string().min(1),
  severidad: severidadSchema,
  probabilidad: probabilidadEnum,
  eliminar: z.string().default('NA'),
  sustituir: z.string().default('NA'),
  controlIngenieria: z.string().min(1),
  controlAdministrativo: z.string().min(1),
  controlReceptor: z.string().min(1),
  severidadResidual: severidadSchema,
  probabilidadResidual: probabilidadEnum,
  accionesMejora: z.string().default('NA'),
  responsables: z.string().min(1),
})

export type FilaIpercIa = z.infer<typeof filaIpercIaSchema>

export interface ResultadoValidacion {
  filasValidas: FilaIpercIa[]
  errores: string[]
}

export function validarYParsearLote(texto: string): ResultadoValidacion {
  const filasValidas: FilaIpercIa[] = []
  const errores: string[] = []

  let parsed: unknown
  try {
    parsed = parseJsonIA(texto)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { filasValidas: [], errores: [`No se pudo parsear JSON del lote: ${msg}`] }
  }

  if (!Array.isArray(parsed)) {
    return { filasValidas: [], errores: ['La respuesta de la IA no es un array JSON'] }
  }

  for (let i = 0; i < parsed.length; i++) {
    const result = filaIpercIaSchema.safeParse(parsed[i])
    if (result.success) {
      filasValidas.push(result.data)
    } else {
      const issues = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      errores.push(`Fila ${i + 1}: ${issues}`)
    }
  }

  return { filasValidas, errores }
}
