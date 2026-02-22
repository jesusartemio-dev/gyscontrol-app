import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Solo admin o gerente pueden revertir rechazos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const observaciones = body.observaciones || ''

    const recepcion = await prisma.recepcionPendiente.findUnique({
      where: { id },
      include: {
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: {
              select: { id: true, codigo: true, proyectoId: true }
            }
          }
        },
        ordenCompraItem: {
          include: {
            ordenCompra: { select: { numero: true } }
          }
        }
      }
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    if (recepcion.estado !== 'rechazado') {
      return NextResponse.json(
        { error: `Solo se pueden revertir recepciones rechazadas. Estado actual: "${recepcion.estado}"` },
        { status: 409 }
      )
    }

    const pedidoItem = recepcion.pedidoEquipoItem
    const pedido = pedidoItem.pedidoEquipo
    const ocNumero = recepcion.ordenCompraItem.ordenCompra.numero

    await prisma.$transaction(async (tx) => {
      // 1. Revertir estado a pendiente, limpiar campos de rechazo
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'pendiente',
          rechazadoPorId: null,
          fechaRechazo: null,
          motivoRechazo: null,
          observaciones: observaciones.trim() || `Rechazo revertido por ${session.user.name || session.user.email}`,
        }
      })

      // 2. Crear EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId: pedido.proyectoId,
          pedidoEquipoId: pedido.id,
          tipo: 'rechazo_revertido',
          descripcion: `Rechazo revertido: ${recepcion.cantidadRecibida} x ${pedidoItem.codigo} de OC ${ocNumero} vuelve a pendiente.${observaciones.trim() ? ` Motivo: ${observaciones.trim()}` : ''}`,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            pedidoCodigo: pedido.codigo,
            itemCodigo: pedidoItem.codigo,
            motivoRechazoOriginal: recepcion.motivoRechazo,
          },
          updatedAt: new Date(),
        }
      })
    })

    return NextResponse.json({
      recepcionId: id,
      estado: 'pendiente',
      mensaje: 'Rechazo revertido correctamente'
    })
  } catch (error) {
    console.error('Error al revertir rechazo:', error)
    return NextResponse.json(
      { error: 'Error al revertir rechazo: ' + String(error) },
      { status: 500 }
    )
  }
}
