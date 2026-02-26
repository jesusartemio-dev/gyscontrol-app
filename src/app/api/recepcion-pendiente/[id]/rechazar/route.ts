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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico', 'gestor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para rechazar recepción' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const observaciones = body.observaciones

    if (!observaciones || typeof observaciones !== 'string' || observaciones.trim().length === 0) {
      return NextResponse.json(
        { error: 'Las observaciones son obligatorias al rechazar' },
        { status: 400 }
      )
    }

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

    if (!['pendiente', 'en_almacen'].includes(recepcion.estado)) {
      return NextResponse.json(
        { error: `No se puede rechazar: estado actual es "${recepcion.estado}"` },
        { status: 409 }
      )
    }

    const pedidoItem = recepcion.pedidoEquipoItem
    const pedido = pedidoItem.pedidoEquipo
    const ocNumero = recepcion.ordenCompraItem.ordenCompra.numero
    const motivo = observaciones.trim()

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar RecepcionPendiente → rechazado
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'rechazado',
          rechazadoPorId: session.user.id,
          fechaRechazo: new Date(),
          motivoRechazo: motivo,
          observaciones: motivo,
        }
      })

      // 2. Decrementar cantidadRecibida en OrdenCompraItem
      await tx.ordenCompraItem.update({
        where: { id: recepcion.ordenCompraItemId },
        data: {
          cantidadRecibida: { decrement: recepcion.cantidadRecibida },
          updatedAt: new Date(),
        }
      })

      // 3. Recalcular estado de la OrdenCompra (post-decrement)
      const ocId = recepcion.ordenCompraItem.ordenCompraId
      const allItems = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId: ocId },
      })
      const todosCompletos = allItems.every(i => i.cantidadRecibida >= i.cantidad)
      const algunoRecibido = allItems.some(i => i.cantidadRecibida > 0)

      let nuevoEstadoOC = 'confirmada'
      if (todosCompletos) nuevoEstadoOC = 'completada'
      else if (algunoRecibido) nuevoEstadoOC = 'parcial'

      await tx.ordenCompra.update({
        where: { id: ocId },
        data: { estado: nuevoEstadoOC as any, updatedAt: new Date() },
      })

      // 4. Crear EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId: pedido.proyectoId,
          pedidoEquipoId: pedido.id,
          tipo: 'rechazo_recepcion',
          descripcion: `Item rechazado en recepción: ${motivo}. ${recepcion.cantidadRecibida} x ${pedidoItem.codigo} de OC ${ocNumero} no aceptados.`,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            pedidoCodigo: pedido.codigo,
            itemCodigo: pedidoItem.codigo,
            motivoRechazo: motivo,
          },
          updatedAt: new Date(),
        }
      })
    })

    return NextResponse.json({
      recepcionId: id,
      estado: 'rechazado',
      mensaje: 'Recepción rechazada correctamente'
    })
  } catch (error) {
    console.error('Error al rechazar recepción:', error)
    return NextResponse.json(
      { error: 'Error al rechazar recepción: ' + String(error) },
      { status: 500 }
    )
  }
}
