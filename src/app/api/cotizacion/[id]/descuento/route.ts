import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { action } = body

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      select: {
        id: true,
        totalCliente: true,
        descuento: true,
        descuentoEstado: true,
        estado: true,
      },
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    switch (action) {
      case 'proponer': {
        const { porcentaje, motivo } = body

        if (!porcentaje || porcentaje <= 0 || porcentaje > 100) {
          return NextResponse.json(
            { error: 'El porcentaje debe estar entre 0.01 y 100' },
            { status: 400 }
          )
        }

        const montoDescuento = (cotizacion.totalCliente * porcentaje) / 100
        const grandTotal = cotizacion.totalCliente - montoDescuento

        const updated = await prisma.cotizacion.update({
          where: { id },
          data: {
            descuento: montoDescuento,
            descuentoPorcentaje: porcentaje,
            descuentoMotivo: motivo || null,
            descuentoEstado: 'propuesto',
            descuentoSolicitadoPorId: session.user.id,
            descuentoAprobadoPorId: null,
            descuentoFechaRespuesta: null,
            descuentoComentario: null,
            grandTotal,
            updatedAt: new Date(),
          },
        })

        return NextResponse.json(updated)
      }

      case 'aprobar': {
        const userRole = (session.user as any).role
        if (!['admin', 'gerente'].includes(userRole)) {
          return NextResponse.json(
            { error: 'Solo admin o gerente pueden aprobar descuentos' },
            { status: 403 }
          )
        }

        if (cotizacion.descuentoEstado !== 'propuesto') {
          return NextResponse.json(
            { error: 'Solo se pueden aprobar descuentos en estado propuesto' },
            { status: 400 }
          )
        }

        const grandTotal = cotizacion.totalCliente - cotizacion.descuento

        const updated = await prisma.cotizacion.update({
          where: { id },
          data: {
            descuentoEstado: 'aprobado',
            descuentoAprobadoPorId: session.user.id,
            descuentoFechaRespuesta: new Date(),
            descuentoComentario: body.comentario || null,
            grandTotal,
            updatedAt: new Date(),
          },
        })

        return NextResponse.json(updated)
      }

      case 'rechazar': {
        const userRoleR = (session.user as any).role
        if (!['admin', 'gerente'].includes(userRoleR)) {
          return NextResponse.json(
            { error: 'Solo admin o gerente pueden rechazar descuentos' },
            { status: 403 }
          )
        }

        if (cotizacion.descuentoEstado !== 'propuesto') {
          return NextResponse.json(
            { error: 'Solo se pueden rechazar descuentos en estado propuesto' },
            { status: 400 }
          )
        }

        const grandTotal = cotizacion.totalCliente

        const updated = await prisma.cotizacion.update({
          where: { id },
          data: {
            descuento: 0,
            descuentoEstado: 'rechazado',
            descuentoAprobadoPorId: session.user.id,
            descuentoFechaRespuesta: new Date(),
            descuentoComentario: body.comentario || null,
            grandTotal,
            updatedAt: new Date(),
          },
        })

        return NextResponse.json(updated)
      }

      case 'eliminar': {
        const grandTotal = cotizacion.totalCliente

        const updated = await prisma.cotizacion.update({
          where: { id },
          data: {
            descuento: 0,
            descuentoPorcentaje: null,
            descuentoMotivo: null,
            descuentoEstado: null,
            descuentoSolicitadoPorId: null,
            descuentoAprobadoPorId: null,
            descuentoFechaRespuesta: null,
            descuentoComentario: null,
            grandTotal,
            updatedAt: new Date(),
          },
        })

        return NextResponse.json(updated)
      }

      default:
        return NextResponse.json(
          { error: `Acción no válida: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error en descuento API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
