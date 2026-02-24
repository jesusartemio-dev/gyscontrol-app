import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

// Calcula todos los campos derivados de una valorización
function calcularMontos(data: {
  montoValorizacion: number
  acumuladoAnterior: number
  presupuestoContractual: number
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
}) {
  const acumuladoActual = data.acumuladoAnterior + data.montoValorizacion
  const saldoPorValorizar = data.presupuestoContractual - acumuladoActual
  const porcentajeAvance = data.presupuestoContractual > 0
    ? (acumuladoActual / data.presupuestoContractual) * 100
    : 0

  const descuentoComercialMonto = data.montoValorizacion * data.descuentoComercialPorcentaje / 100
  const adelantoMonto = data.montoValorizacion * data.adelantoPorcentaje / 100
  const subtotal = data.montoValorizacion - descuentoComercialMonto - adelantoMonto
  const igvMonto = subtotal * data.igvPorcentaje / 100
  const fondoGarantiaMonto = subtotal * data.fondoGarantiaPorcentaje / 100
  const netoARecibir = subtotal + igvMonto - fondoGarantiaMonto

  return {
    acumuladoActual: Math.round(acumuladoActual * 100) / 100,
    saldoPorValorizar: Math.round(saldoPorValorizar * 100) / 100,
    porcentajeAvance: Math.round(porcentajeAvance * 100) / 100,
    descuentoComercialMonto: Math.round(descuentoComercialMonto * 100) / 100,
    adelantoMonto: Math.round(adelantoMonto * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    igvMonto: Math.round(igvMonto * 100) / 100,
    fondoGarantiaMonto: Math.round(fondoGarantiaMonto * 100) / 100,
    netoARecibir: Math.round(netoARecibir * 100) / 100,
  }
}

// Recalcula montoValorizacion = SUM(partidas.montoAvance) y todos los campos derivados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalcularMontoValorizacion(valorizacionId: string, tx: any) {
  const partidas = await tx.partidaValorizacion.findMany({
    where: { valorizacionId },
  })

  const montoValorizacion = Math.round(
    partidas.reduce((sum: number, p: any) => sum + p.montoAvance, 0) * 100
  ) / 100

  const val = await tx.valorizacion.findUnique({
    where: { id: valorizacionId },
  })
  if (!val) return null

  const agg = await tx.valorizacion.aggregate({
    where: {
      proyectoId: val.proyectoId,
      estado: { not: 'anulada' },
      id: { not: valorizacionId },
    },
    _sum: { montoValorizacion: true },
  })
  const acumuladoAnterior = agg._sum.montoValorizacion || 0

  const calculados = calcularMontos({
    montoValorizacion,
    acumuladoAnterior,
    presupuestoContractual: val.presupuestoContractual,
    descuentoComercialPorcentaje: val.descuentoComercialPorcentaje,
    adelantoPorcentaje: val.adelantoPorcentaje,
    igvPorcentaje: val.igvPorcentaje,
    fondoGarantiaPorcentaje: val.fondoGarantiaPorcentaje,
  })

  return tx.valorizacion.update({
    where: { id: valorizacionId },
    data: {
      montoValorizacion,
      acumuladoAnterior,
      ...calculados,
      updatedAt: new Date(),
    },
  })
}

// DELETE /api/proyectos/[id]/valorizaciones/[valId]/partidas/[partidaId]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; valId: string; partidaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: proyectoId, valId, partidaId } = await params

    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id: valId },
    })
    if (!valorizacion || valorizacion.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    if (valorizacion.estado !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar partidas de valorizaciones en estado borrador' },
        { status: 400 }
      )
    }

    // Verificar que la partida existe
    const partida = await prisma.partidaValorizacion.findUnique({
      where: { id: partidaId },
    })
    if (!partida || partida.valorizacionId !== valId) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.partidaValorizacion.delete({
        where: { id: partidaId },
      })

      const valActualizada = await recalcularMontoValorizacion(valId, tx)

      return { ok: true, montoValorizacion: valActualizada?.montoValorizacion ?? 0 }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al eliminar partida de valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
