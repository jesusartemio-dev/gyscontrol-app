import { PrismaClient } from '@prisma/client'

type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

interface RevertirResult {
  celdasEliminadas: number
}

/**
 * Elimina todas las PlanificacionDia ligadas a una SolicitudAusencia.
 * Usar cuando:
 *  - Se cancela una ausencia en estado aprobada o en_curso.
 *  - Se rechaza después de una aprobación parcial (caso edge).
 * Debe ejecutarse DENTRO de una transacción existente (recibe tx).
 */
export async function revertirPlanificacion(
  solicitudId: string,
  tx: PrismaTx,
): Promise<RevertirResult> {
  const result = await tx.planificacionDia.deleteMany({
    where: { solicitudAusenciaId: solicitudId },
  })
  return { celdasEliminadas: result.count }
}
