import { prisma } from '@/lib/prisma'
import { toPrismaJsonNullable } from './prismaJson'
import { calcularCompletitud } from './completitud'
import type { PlanTrabajo } from '@prisma/client'
import type { SeccionRegenerable } from '@/types/planTrabajo'

const CAMPOS_JSON = [
  'alcanceDetallado',
  'eppRequeridos',
  'herramientasYEquipos',
  'restricciones',
  'personalAsignado',
  'matrizRaci',
  'histogramas',
  'cronogramaResumen',
  'responsabilidades',
  'referencias',
] as const

/**
 * Persiste las secciones validadas del Plan de Trabajo.
 * Solo actualiza los campos presentes en `secciones`.
 * Recalcula bloquesCompletitud al final.
 * Lanza si el PlanTrabajo no existe — el caller debe crearlo primero.
 */
export async function guardarSecciones(
  proyectoId: string,
  secciones: Record<string, unknown>
): Promise<void> {
  const planActual = await prisma.planTrabajo.findUnique({ where: { proyectoId } })
  if (!planActual) {
    throw new Error(
      'PlanTrabajo no existe para este proyecto — crearlo primero con POST /plan-trabajo'
    )
  }

  // Construir merged para calcular completitud correctamente
  const merged: Record<string, unknown> = { ...planActual }
  if (typeof secciones.objetivo === 'string') merged.objetivo = secciones.objetivo
  if (typeof secciones.alcanceGeneral === 'string') merged.alcanceGeneral = secciones.alcanceGeneral
  for (const campo of CAMPOS_JSON) {
    if (secciones[campo] !== undefined) merged[campo] = secciones[campo]
  }

  const bloques = calcularCompletitud(merged as PlanTrabajo)

  // Construir data de update
  const objetivoUpdate =
    typeof secciones.objetivo === 'string' ? { objetivo: secciones.objetivo } : {}
  const alcanceGeneralUpdate =
    typeof secciones.alcanceGeneral === 'string'
      ? { alcanceGeneral: secciones.alcanceGeneral }
      : {}

  const jsonUpdate: Record<string, ReturnType<typeof toPrismaJsonNullable>> = {}
  for (const campo of CAMPOS_JSON) {
    if (secciones[campo] !== undefined) {
      jsonUpdate[campo] = toPrismaJsonNullable(secciones[campo])
    }
  }

  await prisma.planTrabajo.update({
    where: { proyectoId },
    data: {
      generadoConIA: true,
      fechaGeneracionIA: new Date(),
      bloquesCompletitud: bloques as Parameters<typeof prisma.planTrabajo.update>[0]['data']['bloquesCompletitud'],
      ...objetivoUpdate,
      ...alcanceGeneralUpdate,
      ...(jsonUpdate as Parameters<typeof prisma.planTrabajo.update>[0]['data']),
    },
  })
}

const TEXT_SECCIONES = new Set<string>(['objetivo', 'alcanceGeneral'])

/**
 * Guarda una o más secciones SIN recalcular bloquesCompletitud.
 * Usar en generación paralela — llamar recalcularCompletitud al final.
 */
export async function guardarSeccionParalela(
  proyectoId: string,
  secciones: Record<string, unknown>
): Promise<void> {
  const objetivoUpdate = typeof secciones.objetivo === 'string' ? { objetivo: secciones.objetivo } : {}
  const alcanceGeneralUpdate = typeof secciones.alcanceGeneral === 'string' ? { alcanceGeneral: secciones.alcanceGeneral } : {}

  const jsonUpdate: Record<string, ReturnType<typeof toPrismaJsonNullable>> = {}
  for (const campo of CAMPOS_JSON) {
    if (secciones[campo] !== undefined) {
      jsonUpdate[campo] = toPrismaJsonNullable(secciones[campo])
    }
  }

  await prisma.planTrabajo.update({
    where: { proyectoId },
    data: {
      generadoConIA: true,
      fechaGeneracionIA: new Date(),
      ...objetivoUpdate,
      ...alcanceGeneralUpdate,
      ...(jsonUpdate as Parameters<typeof prisma.planTrabajo.update>[0]['data']),
    },
  })
}

/**
 * Recalcula y persiste bloquesCompletitud leyendo el estado actual del plan.
 * Llamar una única vez después de guardar todas las secciones en paralelo.
 */
export async function recalcularCompletitud(proyectoId: string): Promise<void> {
  const plan = await prisma.planTrabajo.findUnique({ where: { proyectoId } })
  if (!plan) return
  const bloques = calcularCompletitud(plan)
  await prisma.planTrabajo.update({
    where: { proyectoId },
    data: { bloquesCompletitud: bloques as Parameters<typeof prisma.planTrabajo.update>[0]['data']['bloquesCompletitud'] },
  })
}

/**
 * Persiste una única sección regenerada del Plan de Trabajo.
 * Actualiza `ultimaSeccionRegenerada` y recalcula `bloquesCompletitud`.
 */
export async function guardarSeccionIndividual(
  proyectoId: string,
  seccion: SeccionRegenerable,
  data: unknown
): Promise<void> {
  const planActual = await prisma.planTrabajo.findUnique({ where: { proyectoId } })
  if (!planActual) {
    throw new Error('PlanTrabajo no existe para este proyecto')
  }

  const merged: Record<string, unknown> = { ...planActual, [seccion]: data }
  const bloques = calcularCompletitud(merged as PlanTrabajo)

  const campoUpdate = TEXT_SECCIONES.has(seccion)
    ? { [seccion]: data as string }
    : { [seccion]: toPrismaJsonNullable(data) }

  await prisma.planTrabajo.update({
    where: { proyectoId },
    data: {
      ultimaSeccionRegenerada: seccion,
      fechaGeneracionIA: new Date(),
      bloquesCompletitud: bloques as Parameters<typeof prisma.planTrabajo.update>[0]['data']['bloquesCompletitud'],
      ...(campoUpdate as Parameters<typeof prisma.planTrabajo.update>[0]['data']),
    },
  })
}
