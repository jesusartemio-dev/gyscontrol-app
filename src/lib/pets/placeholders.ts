import type { BloqueComo, PetsContenido } from '@/lib/validators/pets'

/**
 * Únicas 3 variantes de "contenido placeholder" que puede tener un paso —
 * ver generarConIa.ts (skeleton inicial + fallback de error) y
 * regenerarConIa.ts (fallback de regeneración individual). Centralizado acá
 * para que la detección (usada en la UI para avisar "esto quedó incompleto")
 * nunca se desincronice de lo que efectivamente escriben los generadores.
 */
export const TEXTOS_PLACEHOLDER = [
  '(generando...)',
  '(contenido pendiente de generación)',
  '(generación fallida — completar manualmente)',
] as const

export const PLACEHOLDER_GENERANDO: BloqueComo[] = [{ tipo: 'parrafo', texto: TEXTOS_PLACEHOLDER[0] }]
export const PLACEHOLDER_PENDIENTE: BloqueComo[] = [{ tipo: 'parrafo', texto: TEXTOS_PLACEHOLDER[1] }]
export const PLACEHOLDER_FALLIDA: BloqueComo[] = [{ tipo: 'parrafo', texto: TEXTOS_PLACEHOLDER[2] }]

export function esComoPlaceholder(como: BloqueComo[]): boolean {
  return (
    como.length === 1 &&
    como[0].tipo === 'parrafo' &&
    (TEXTOS_PLACEHOLDER as readonly string[]).includes(como[0].texto)
  )
}

type Etapa = PetsContenido['procedimiento']['etapas'][number]

export function etapaTienePasosIncompletos(etapa: Etapa): boolean {
  return etapa.pasos.some((p) => esComoPlaceholder(p.como))
}

export function contarEtapasIncompletas(contenido: PetsContenido): number {
  return contenido.procedimiento.etapas.filter(etapaTienePasosIncompletos).length
}
