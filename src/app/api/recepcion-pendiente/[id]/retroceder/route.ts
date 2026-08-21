import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ajustarCantidadAtendida } from '@/lib/services/recepcionRecalculo'

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
      return NextResponse.json({ error: 'Solo admin o gerente pueden retroceder' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const targetEstado: string = body.targetEstado || 'pendiente'
    const observaciones: string = body.observaciones || ''

    if (!['pendiente', 'en_almacen', 'entregado_proyecto'].includes(targetEstado)) {
      return NextResponse.json({ error: 'targetEstado inválido: debe ser "pendiente", "en_almacen" o "entregado_proyecto"' }, { status: 400 })
    }

    const recepcion = await (prisma.recepcionPendiente as any).findUnique({
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
            ordenCompra: { select: { id: true, numero: true, proyectoId: true } }
          }
        },
        entregasItem: { select: { id: true } },
      }
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    const pedidoItem = recepcion.pedidoEquipoItem || null
    const pedido = pedidoItem?.pedidoEquipo || null
    const ocNumero = recepcion.ordenCompraItem?.ordenCompra?.numero || '—'
    const proyectoId = pedido?.proyectoId || recepcion.ordenCompraItem?.ordenCompra?.proyectoId || null
    const itemCodigo = pedidoItem?.codigo || recepcion.ordenCompraItem?.codigo || '—'

    // ═══════════════════════════════════════
    // RETROCESO: confirmado_proyecto → entregado_proyecto
    // Deshace una conformidad equivocada. Si había sido parcial, devuelve el
    // faltante que se había descontado del pedido.
    // ═══════════════════════════════════════
    if (targetEstado === 'entregado_proyecto') {
      if (recepcion.estado !== 'confirmado_proyecto') {
        return NextResponse.json(
          { error: 'Solo se puede retroceder a "entregado a proyecto" desde una recepción confirmada' },
          { status: 409 }
        )
      }

      const faltanteRevertido = recepcion.cantidadConfirmada != null
        ? recepcion.cantidadRecibida - recepcion.cantidadConfirmada
        : 0

      await prisma.$transaction(async (tx) => {
        if (faltanteRevertido > 0 && pedidoItem && pedido) {
          await ajustarCantidadAtendida(
            tx,
            {
              id: pedidoItem.id,
              cantidadAtendida: pedidoItem.cantidadAtendida,
              cantidadPedida: pedidoItem.cantidadPedida,
              listaEquipoItemId: pedidoItem.listaEquipoItemId,
            },
            pedido.id,
            faltanteRevertido
          )
          await tx.entregaItem.updateMany({
            where: { recepcionPendienteId: id },
            data: { cantidadEntregada: recepcion.cantidadRecibida },
          })
        }

        await tx.recepcionPendiente.update({
          where: { id },
          data: {
            estado: 'entregado_proyecto',
            confirmadoProyectoPorId: null,
            fechaConfirmacionProyecto: null,
            cantidadConfirmada: null,
            observacionesConformidad: observaciones.trim()
              || `Conformidad revertida por ${session.user.name || session.user.email}`,
          },
        })

        await tx.eventoTrazabilidad.create({
          data: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            proyectoId,
            pedidoEquipoId: pedido?.id || null,
            tipo: 'recepcion_retrocedida',
            descripcion: `Conformidad del proyecto revertida: ${recepcion.cantidadRecibida} x ${itemCodigo} de OC ${ocNumero} vuelve a pendiente de confirmación.${observaciones.trim() ? ` Motivo: ${observaciones.trim()}` : ''}`,
            usuarioId: session.user.id,
            metadata: {
              recepcionPendienteId: id,
              ordenCompraNumero: ocNumero,
              cantidadRecibida: recepcion.cantidadRecibida,
              faltanteRevertido,
              de: 'confirmado_proyecto',
              a: 'entregado_proyecto',
            },
            updatedAt: new Date(),
          },
        })
      })

      return NextResponse.json({
        recepcionId: id,
        estado: 'entregado_proyecto',
        mensaje: 'Conformidad revertida correctamente',
      })
    }

    // ═══════════════════════════════════════
    // RETROCESO: en_almacen → pendiente
    // ═══════════════════════════════════════
    if (targetEstado === 'pendiente') {
      if (recepcion.estado !== 'en_almacen') {
        return NextResponse.json(
          { error: 'Solo se puede retroceder a pendiente desde estado "en almacén"' },
          { status: 409 }
        )
      }

      if (recepcion.entregasItem.length > 0) {
        return NextResponse.json(
          { error: 'No se puede retroceder: ya fue entregado al proyecto. Retrocede primero la entrega.' },
          { status: 409 }
        )
      }

      await prisma.$transaction(async (tx) => {
        await tx.recepcionPendiente.update({
          where: { id },
          data: {
            estado: 'pendiente' as any,
            confirmadoPorId: null,
            fechaConfirmacion: null,
            observaciones: observaciones.trim() || `Confirmación de almacén revertida por ${session.user.name || session.user.email}`,
          }
        })

        await tx.eventoTrazabilidad.create({
          data: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            proyectoId,
            pedidoEquipoId: pedido?.id || null,
            tipo: 'recepcion_retrocedida',
            descripcion: `Confirmación de almacén revertida: ${recepcion.cantidadRecibida} x ${itemCodigo} de OC ${ocNumero} vuelve a pendiente.${observaciones.trim() ? ` Motivo: ${observaciones.trim()}` : ''}`,
            usuarioId: session.user.id,
            metadata: {
              recepcionPendienteId: id,
              ordenCompraNumero: ocNumero,
              cantidadRecibida: recepcion.cantidadRecibida,
              de: 'en_almacen',
              a: 'pendiente',
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
    }

    // ═══════════════════════════════════════
    // RETROCESO: entregado_proyecto → en_almacen
    // ═══════════════════════════════════════
    if (recepcion.estado !== 'entregado_proyecto') {
      return NextResponse.json(
        { error: 'Solo se puede retroceder a almacén desde estado "entregado a proyecto"' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar EntregaItem(s) vinculados a esta recepción
      await tx.entregaItem.deleteMany({
        where: { recepcionPendienteId: id }
      })

      // 2. Si tiene pedido: decrementar cantidadAtendida y recalcular estados
      if (pedidoItem && pedido) {
        const nuevaCantidadAtendida = Math.max(0, (pedidoItem.cantidadAtendida || 0) - recepcion.cantidadRecibida)

        let nuevoEstadoEntrega: string = 'pendiente'
        if (nuevaCantidadAtendida >= pedidoItem.cantidadPedida) {
          nuevoEstadoEntrega = 'entregado'
        } else if (nuevaCantidadAtendida > 0) {
          nuevoEstadoEntrega = 'parcial'
        }

        let estadoItem: string = 'atendido'
        if (nuevoEstadoEntrega === 'entregado') estadoItem = 'entregado'
        else if (nuevoEstadoEntrega === 'parcial') estadoItem = 'parcial'
        else if (nuevoEstadoEntrega === 'pendiente') estadoItem = 'pendiente'

        await tx.pedidoEquipoItem.update({
          where: { id: pedidoItem.id },
          data: {
            cantidadAtendida: nuevaCantidadAtendida,
            estadoEntrega: nuevoEstadoEntrega as any,
            estado: estadoItem as any,
            updatedAt: new Date()
          }
        })

        // Recalcular ListaEquipoItem vía pedido
        if (pedidoItem.listaEquipoItemId) {
          const sumResult = await tx.pedidoEquipoItem.aggregate({
            where: { listaEquipoItemId: pedidoItem.listaEquipoItemId },
            _sum: { cantidadAtendida: true }
          })
          const allLinkedItems = await tx.pedidoEquipoItem.findMany({
            where: { listaEquipoItemId: pedidoItem.listaEquipoItemId },
            select: { precioUnitario: true, cantidadAtendida: true }
          })
          const costoReal = allLinkedItems.reduce((sum, item) =>
            sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)

          await tx.listaEquipoItem.update({
            where: { id: pedidoItem.listaEquipoItemId },
            data: {
              costoReal,
              cantidadEntregada: sumResult._sum.cantidadAtendida || 0
            }
          })
        }

        // Recalcular PedidoEquipo.estado y costoRealTotal
        const allPedidoItems = await tx.pedidoEquipoItem.findMany({
          where: { pedidoId: pedido.id },
          select: { estado: true, precioUnitario: true, cantidadAtendida: true }
        })

        const costoRealTotal = allPedidoItems.reduce((sum, item) =>
          sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)

        const estados = allPedidoItems.map(i => i.estado)
        let nuevoEstadoPedido: string | null = null
        if (estados.every(e => e === 'cancelado')) {
          nuevoEstadoPedido = 'cancelado'
        } else if (estados.every(e => e === 'entregado' || e === 'cancelado')) {
          nuevoEstadoPedido = 'entregado'
        } else if (estados.some(e => e === 'entregado' || e === 'parcial')) {
          nuevoEstadoPedido = 'parcial'
        } else if (estados.some(e => e === 'atendido')) {
          nuevoEstadoPedido = 'atendido'
        }

        await tx.pedidoEquipo.update({
          where: { id: pedido.id },
          data: {
            ...(nuevoEstadoPedido ? { estado: nuevoEstadoPedido as any } : {}),
            costoRealTotal,
            updatedAt: new Date()
          }
        })
      }
      // Path C: Item manual (sin pedido) — no hay nada adicional que revertir

      // Retroceder RecepcionPendiente a en_almacen
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'en_almacen' as any,
          entregadoPorId: null,
          fechaEntregaProyecto: null,
          observaciones: observaciones.trim() || `Entrega a proyecto revertida por ${session.user.name || session.user.email}`,
        }
      })

      // EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId,
          pedidoEquipoId: pedido?.id || null,
          tipo: 'recepcion_retrocedida',
          descripcion: `Entrega a proyecto revertida: ${recepcion.cantidadRecibida} x ${itemCodigo} de OC ${ocNumero} vuelve a almacén.${observaciones.trim() ? ` Motivo: ${observaciones.trim()}` : ''}`,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            de: 'entregado_proyecto',
            a: 'en_almacen',
          },
          updatedAt: new Date(),
        }
      })
    })

    return NextResponse.json({
      recepcionId: id,
      estado: 'en_almacen',
      mensaje: 'Entrega a proyecto revertida correctamente'
    })
  } catch (error) {
    console.error('Error al retroceder recepción:', error)
    return NextResponse.json(
      { error: 'Error al retroceder recepción: ' + String(error) },
      { status: 500 }
    )
  }
}
