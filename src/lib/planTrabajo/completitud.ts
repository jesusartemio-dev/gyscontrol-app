import type { PlanTrabajo } from '@prisma/client'
import type { PlanBloquesCompletitud } from '@/types/planTrabajo'

function isJsonFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return false
}

export function calcularCompletitud(plan: PlanTrabajo): PlanBloquesCompletitud {
  return {
    objetivo: Boolean(plan.objetivo && plan.objetivo.trim().length > 0),
    alcanceGeneral: Boolean(plan.alcanceGeneral && plan.alcanceGeneral.trim().length > 0),
    alcanceDetallado: isJsonFilled(plan.alcanceDetallado),
    eppRequeridos: isJsonFilled(plan.eppRequeridos),
    herramientasYEquipos: isJsonFilled(plan.herramientasYEquipos),
    restricciones: isJsonFilled(plan.restricciones),
    personalAsignado: isJsonFilled(plan.personalAsignado),
    matrizRaci: isJsonFilled(plan.matrizRaci),
    histogramas: isJsonFilled(plan.histogramas),
    cronogramaResumen: isJsonFilled(plan.cronogramaResumen),
    responsabilidades: isJsonFilled(plan.responsabilidades),
    referencias: isJsonFilled(plan.referencias),
  }
}

export function calcularPorcentajeCompletitud(bloques: PlanBloquesCompletitud): number {
  const values = Object.values(bloques)
  if (values.length === 0) return 0
  return Math.round((values.filter(Boolean).length / values.length) * 100)
}
