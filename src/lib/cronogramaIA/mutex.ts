import { prisma } from '@/lib/prisma'

const MAX_DURACION_MS = 10 * 60 * 1000 // 10 minutos

/**
 * Intenta adquirir el lock de operación IA para un ProyectoCronograma.
 * Usa updateMany atómico: solo setea si el lock está libre o expiró.
 * Mismo patrón que src/lib/planTrabajo/mutex.ts (adquirirLockIA).
 */
export async function adquirirLockCronogramaIA(
  proyectoCronogramaId: string,
  operacion: string
): Promise<{ ok: boolean; conflicto?: { operacion: string; iniciadaEn: Date } }> {
  const ahora = new Date()
  const expiracion = new Date(ahora.getTime() - MAX_DURACION_MS)

  const result = await prisma.proyectoCronograma.updateMany({
    where: {
      id: proyectoCronogramaId,
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

  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { id: proyectoCronogramaId },
    select: { operacionIAEnCurso: true, operacionIAIniciadaEn: true },
  })

  return {
    ok: false,
    conflicto: {
      operacion: cronograma?.operacionIAEnCurso ?? '?',
      iniciadaEn: cronograma?.operacionIAIniciadaEn ?? new Date(),
    },
  }
}

export async function liberarLockCronogramaIA(proyectoCronogramaId: string): Promise<void> {
  await prisma.proyectoCronograma.update({
    where: { id: proyectoCronogramaId },
    data: {
      operacionIAEnCurso: null,
      operacionIAIniciadaEn: null,
    },
  })
}
