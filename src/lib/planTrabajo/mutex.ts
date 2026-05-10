import { prisma } from '@/lib/prisma'

const MAX_DURACION_MS = 10 * 60 * 1000 // 10 minutos

/**
 * Intenta adquirir el lock de operación IA para un PlanTrabajo.
 * Usa updateMany atómico: solo setea si el lock está libre o expiró.
 */
export async function adquirirLockIA(
  planTrabajoId: string,
  operacion: string
): Promise<{ ok: boolean; conflicto?: { operacion: string; iniciadaEn: Date } }> {
  const ahora = new Date()
  const expiracion = new Date(ahora.getTime() - MAX_DURACION_MS)

  const result = await prisma.planTrabajo.updateMany({
    where: {
      id: planTrabajoId,
      OR: [
        { operacionIAEnCurso: null },
        { operacionIAIniciadaEn: { lt: expiracion } },
      ],
    },
    data: {
      operacionIAEnCurso: operacion,
      operacionIAIniciadaEn: ahora,
    },
  })

  if (result.count > 0) return { ok: true }

  const plan = await prisma.planTrabajo.findUnique({
    where: { id: planTrabajoId },
    select: { operacionIAEnCurso: true, operacionIAIniciadaEn: true },
  })

  return {
    ok: false,
    conflicto: {
      operacion: plan?.operacionIAEnCurso ?? '?',
      iniciadaEn: plan?.operacionIAIniciadaEn ?? new Date(),
    },
  }
}

export async function liberarLockIA(planTrabajoId: string): Promise<void> {
  await prisma.planTrabajo.update({
    where: { id: planTrabajoId },
    data: {
      operacionIAEnCurso: null,
      operacionIAIniciadaEn: null,
    },
  })
}
