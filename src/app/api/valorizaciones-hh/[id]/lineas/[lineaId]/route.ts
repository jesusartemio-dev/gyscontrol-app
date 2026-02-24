import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularDescuentoVolumen } from '@/lib/utils/otUtils'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; lineaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: hhId, lineaId } = await params

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load ValorizacionHH with valorizacion
      const valHH = await tx.valorizacionHH.findUnique({
        where: { id: hhId },
        include: {
          valorizacion: { select: { id: true, estado: true, proyectoId: true } },
        },
      })

      if (!valHH) {
        return { error: 'Valorización HH no encontrada', status: 404 }
      }
      if (valHH.valorizacion.estado !== 'borrador') {
        return { error: 'Solo se pueden eliminar líneas en estado borrador', status: 400 }
      }

      // 2. Delete the line
      await tx.lineaHH.delete({ where: { id: lineaId } })

      // 3. Recalculate HH totals from remaining lines
      const remainingLines = await tx.lineaHH.findMany({
        where: { valorizacionHHId: hhId },
      })

      const totalHorasReportadas = +remainingLines.reduce((s, l) => s + l.horasReportadas, 0).toFixed(4)
      const totalHorasEquivalentes = +remainingLines.reduce((s, l) => s + l.horasEquivalente, 0).toFixed(4)
      const subtotalHH = +remainingLines.reduce((s, l) => s + l.costoLinea, 0).toFixed(2)

      // Recalculate volume discount
      const descuentosDB = await tx.configDescuentoHH.findMany({
        where: { clienteId: valHH.clienteId, activo: true },
        orderBy: { orden: 'asc' },
      })
      const descVolumen = calcularDescuentoVolumen(subtotalHH, totalHorasEquivalentes, descuentosDB)

      await tx.valorizacionHH.update({
        where: { id: hhId },
        data: {
          totalHorasReportadas,
          totalHorasEquivalentes,
          subtotal: subtotalHH,
          descuentoPct: descVolumen.descuentoPct,
          descuentoMonto: descVolumen.descuentoMonto,
        },
      })

      // 4. Recalculate parent Valorizacion
      const montoValorizacion = +(subtotalHH - descVolumen.descuentoMonto).toFixed(2)
      const val = await tx.valorizacion.findUniqueOrThrow({
        where: { id: valHH.valorizacionId },
      })

      const proyecto = await tx.proyecto.findUniqueOrThrow({
        where: { id: valHH.valorizacion.proyectoId },
        select: { adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true, totalCliente: true },
      })

      const adelanto = calcularAdelantoValorizacion(proyecto, montoValorizacion)
      const adelantoMonto = adelanto.tieneAdelanto ? adelanto.adelantoMonto : 0
      const adelantoPorcentaje = adelanto.tieneAdelanto ? adelanto.adelantoPorcentaje : 0

      const descuentoComercialMonto = +(montoValorizacion * val.descuentoComercialPorcentaje / 100).toFixed(2)
      const subtotal = +(montoValorizacion - descuentoComercialMonto - adelantoMonto).toFixed(2)
      const igvMonto = +(subtotal * val.igvPorcentaje / 100).toFixed(2)
      const fondoGarantiaMonto = +(subtotal * val.fondoGarantiaPorcentaje / 100).toFixed(2)
      const netoARecibir = +(subtotal + igvMonto - fondoGarantiaMonto).toFixed(2)

      const presupuestoContractual = proyecto.totalCliente ?? 0
      const acumuladoActual = +(val.acumuladoAnterior + montoValorizacion).toFixed(2)
      const saldoPorValorizar = +(presupuestoContractual - acumuladoActual).toFixed(2)
      const porcentajeAvance = presupuestoContractual > 0
        ? +((acumuladoActual / presupuestoContractual) * 100).toFixed(2)
        : 0

      await tx.valorizacion.update({
        where: { id: valHH.valorizacionId },
        data: {
          montoValorizacion,
          descuentoComercialMonto,
          adelantoPorcentaje,
          adelantoMonto,
          subtotal,
          igvMonto,
          fondoGarantiaMonto,
          netoARecibir,
          acumuladoActual,
          saldoPorValorizar,
          porcentajeAvance,
          updatedAt: new Date(),
        },
      })

      return { ok: true, montoValorizacion, netoARecibir }
    })

    if ('error' in result && 'status' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status as number })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al eliminar línea HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
