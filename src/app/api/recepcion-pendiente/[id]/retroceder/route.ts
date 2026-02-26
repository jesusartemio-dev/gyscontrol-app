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

    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Solo admin o gerente pueden retroceder confirmaciones' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
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
        },
        entregasItem: { select: { id: true } },
      }
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    if (recepcion.estado !== 'en_almacen') {
      return NextResponse.json(
        { error: 'Solo se puede retroceder desde estado "en almacén"' },
        { status: 409 }
      )
    }

    // Bloquear si ya fue entregado al proyecto
    if (recepcion.entregasItem.length > 0) {
      return NextResponse.json(
        { error: 'No se puede retroceder: ya fue entregado al proyecto' },
        { status: 409 }
      )
    }

    const pedidoItem = recepcion.pedidoEquipoItem
    const pedido = pedidoItem.pedidoEquipo
    const ocNumero = recepcion.ordenCompraItem.ordenCompra.numero

    await prisma.$transaction(async (tx) => {
      // 1. Retroceder a pendiente, limpiar campos de confirmación
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'pendiente',
          confirmadoPorId: null,
          fechaConfirmacion: null,
          observaciones: observaciones.trim() || `Confirmación de almacén revertida por ${session.user.name || session.user.email}`,
        }
      })

      // 2. Crear EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId: pedido.proyectoId,
          pedidoEquipoId: pedido.id,
          tipo: 'recepcion_retrocedida',
          descripcion: `Confirmación de almacén revertida: ${recepcion.cantidadRecibida} x ${pedidoItem.codigo} de OC ${ocNumero} vuelve a pendiente.${observaciones.trim() ? ` Motivo: ${observaciones.trim()}` : ''}`,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            estadoAnterior: 'en_almacen',
            estadoNuevo: 'pendiente',
          },
          updatedAt: new Date(),
        }
      })
    })

    return NextResponse.json({
      recepcionId: id,
      estado: 'pendiente',
      mensaje: 'Confirmación de almacén revertida correctamente'
    })
  } catch (error) {
    console.error('Error al retroceder recepción:', error)
    return NextResponse.json(
      { error: 'Error al retroceder recepción: ' + String(error) },
      { status: 500 }
    )
  }
}
