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
            ordenCompra: { select: { id: true, numero: true } }
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

    const pedidoItem = recepcion.pedidoEquipoItem || null
    const pedido = pedidoItem?.pedidoEquipo || null
    const ocItem = recepcion.ordenCompraItem || null
    const ocNumero = ocItem?.ordenCompra.numero || 'REQ'
    const itemCodigo = pedidoItem?.codigo || ocItem?.codigo || 'item'

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

      // 2. Si viene de OC: re-incrementar cantidadRecibida (rechazar lo decrementó)
      if (ocItem && recepcion.ordenCompraItemId) {
        await tx.ordenCompraItem.update({
          where: { id: recepcion.ordenCompraItemId },
          data: {
            cantidadRecibida: { increment: recepcion.cantidadRecibida },
            updatedAt: new Date(),
          }
        })

        const ocId = ocItem.ordenCompraId
        const allItems = await tx.ordenCompraItem.findMany({ where: { ordenCompraId: ocId } })
        const todosCompletos = allItems.every(i => i.cantidadRecibida >= i.cantidad)
        const algunoRecibido = allItems.some(i => i.cantidadRecibida > 0)
        let nuevoEstadoOC = 'confirmada'
        if (todosCompletos) nuevoEstadoOC = 'completada'
        else if (algunoRecibido) nuevoEstadoOC = 'parcial'
        await tx.ordenCompra.update({
          where: { id: ocId },
          data: { estado: nuevoEstadoOC as any, updatedAt: new Date() },
        })
      }

      // 3. Crear EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId: pedido?.proyectoId || null,
          pedidoEquipoId: pedido?.id || null,
          tipo: 'rechazo_revertido',
          descripcion: `Rechazo revertido: ${recepcion.cantidadRecibida} x ${itemCodigo} de ${ocNumero} vuelve a pendiente.${observaciones.trim() ? ` Motivo: ${observaciones.trim()}` : ''}`,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            pedidoCodigo: pedido?.codigo || null,
            itemCodigo,
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
