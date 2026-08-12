import { prisma } from '@/lib/prisma'
import type { CuentaPorCobrar } from '@prisma/client'

/** Subconjunto de delegados de Prisma que necesita el recálculo — lo satisface tanto
 *  el cliente singleton como el `tx` de una transacción interactiva. */
type PrismaClientOrTx = Pick<typeof prisma, 'cuentaPorCobrar' | 'pagoCobro' | 'valorizacion'>

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Recalcula montoPagado, saldoPendiente y estado de una CuentaPorCobrar a partir de
 * SUM(PagoCobro.monto), y sincroniza su Valorizacion a 'pagada' si corresponde.
 *
 * Extraído de cuentas-cobrar/[id]/pagos/route.ts sin cambiar su comportamiento.
 *
 * @param tx Cliente de Prisma a usar (singleton por defecto). Pasa el `tx` de una
 *           transacción interactiva (`prisma.$transaction(async (tx) => ...)`) para que
 *           el recálculo corra atómico junto con la operación que lo dispara.
 */
export async function recalcularCuentaPorCobrar(
  cuentaPorCobrarId: string,
  tx?: PrismaClientOrTx
): Promise<CuentaPorCobrar> {
  const client = tx ?? prisma

  const cuenta = await client.cuentaPorCobrar.findUnique({ where: { id: cuentaPorCobrarId } })
  if (!cuenta) {
    throw new Error('Cuenta por cobrar no encontrada')
  }

  const totalPagado = await client.pagoCobro.aggregate({
    where: { cuentaPorCobrarId },
    _sum: { monto: true },
  })

  const montoPagado = totalPagado._sum.monto || 0
  const saldoPendiente = round2(cuenta.monto - montoPagado)

  const nuevoEstado: typeof cuenta.estado = saldoPendiente <= 0 ? 'pagada'
    : montoPagado > 0 ? 'parcial'
    : cuenta.estado

  const cuentaActualizada = await client.cuentaPorCobrar.update({
    where: { id: cuentaPorCobrarId },
    data: {
      montoPagado: round2(montoPagado),
      saldoPendiente: Math.max(0, saldoPendiente),
      estado: nuevoEstado,
      updatedAt: new Date(),
    },
  })

  // Auto-sync: si CxC queda pagada y tiene valorización vinculada, marcarla como pagada también
  if (nuevoEstado === 'pagada' && cuentaActualizada.valorizacionId) {
    const val = await client.valorizacion.findUnique({
      where: { id: cuentaActualizada.valorizacionId },
      select: { id: true, estado: true, proyectoId: true },
    })
    if (val && val.estado === 'facturada') {
      await client.valorizacion.update({
        where: { id: val.id },
        data: { estado: 'pagada', updatedAt: new Date() },
      })
    }
  }

  return cuentaActualizada
}
