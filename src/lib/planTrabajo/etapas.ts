import type { SeccionRegenerable, PlanBloquesCompletitud } from '@/types/planTrabajo'

/**
 * Secciones calculadas por servidor sin IA (informe §6). Se generan/recalculan
 * con POST /plan-trabajo/calcular-datos, instantáneo y determinista.
 */
export const SECCIONES_ETAPA_1: readonly SeccionRegenerable[] = [
  'personalAsignado',
  'matrizRaci',
  'histogramas',
  'cronogramaResumen',
  'referencias',
]

/**
 * Secciones redactadas por IA — solo se habilitan cuando la Etapa 1 está completa,
 * porque su prompt recibe los resultados de la Etapa 1 como hechos inmutables.
 */
export const SECCIONES_ETAPA_2: readonly SeccionRegenerable[] = [
  'objetivo',
  'alcanceGeneral',
  'alcanceDetallado',
  'eppRequeridos',
  'restricciones',
  'herramientasYEquipos',
]

export function esSeccionEtapa1(seccion: SeccionRegenerable): boolean {
  return (SECCIONES_ETAPA_1 as readonly string[]).includes(seccion)
}

export function etapa1Completa(bloques: Partial<PlanBloquesCompletitud> | null | undefined): boolean {
  if (!bloques) return false
  return SECCIONES_ETAPA_1.every(s => bloques[s] === true)
}

export function etapa2Completa(bloques: Partial<PlanBloquesCompletitud> | null | undefined): boolean {
  if (!bloques) return false
  return SECCIONES_ETAPA_2.every(s => bloques[s] === true)
}

export function algunaSeccionEtapa2Completa(bloques: Partial<PlanBloquesCompletitud> | null | undefined): boolean {
  if (!bloques) return false
  return SECCIONES_ETAPA_2.some(s => bloques[s] === true)
}
