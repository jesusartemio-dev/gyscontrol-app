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

    if (!['admin', 'gerente', 'logistico', 'gestor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para confirmar recepción' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const observaciones = body.observaciones || null

    const recepcion = await prisma.recepcionPendiente.findUnique({
      where: { id },
      include: {
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: {
              select: { id: true, codigo: true, proyectoId: true, proyecto: { select: { nombre: true } } }
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

    if (recepcion.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Esta recepción ya fue procesada' },
        { status: 409 }
      )
    }

    const pedidoItem = recepcion.pedidoEquipoItem
    const pedido = pedidoItem.pedidoEquipo
    const proyectoId = pedido.proyectoId

    const result = await prisma.$transaction(async (tx) => {
      // 1. Marcar RecepcionPendiente como confirmada
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'confirmado',
          confirmadoPorId: session.user.id,
          fechaConfirmacion: new Date(),
          observaciones,
        }
      })

      // 2. Actualizar PedidoEquipoItem.cantidadAtendida
      const nuevaCantidadAtendida = (pedidoItem.cantidadAtendida || 0) + recepcion.cantidadRecibida
      let nuevoEstadoEntrega: 'pendiente' | 'parcial' | 'entregado' = 'pendiente'
      if (nuevaCantidadAtendida >= pedidoItem.cantidadPedida) {
        nuevoEstadoEntrega = 'entregado'
      } else if (nuevaCantidadAtendida > 0) {
        nuevoEstadoEntrega = 'parcial'
      }

      // Derivar estado del item desde estadoEntrega
      let estadoDerivado: 'pendiente' | 'atendido' | 'parcial' | 'entregado' | undefined = undefined
      if (nuevoEstadoEntrega === 'entregado') estadoDerivado = 'entregado'
      else if (nuevoEstadoEntrega === 'parcial') estadoDerivado = 'parcial'

      await tx.pedidoEquipoItem.update({
        where: { id: pedidoItem.id },
        data: {
          cantidadAtendida: nuevaCantidadAtendida,
          estadoEntrega: nuevoEstadoEntrega,
          fechaEntregaReal: new Date(),
          ...(estadoDerivado ? { estado: estadoDerivado } : {}),
          updatedAt: new Date()
        }
      })

      // 3. Crear EntregaItem
      const entregaItemId = `ent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await tx.entregaItem.create({
        data: {
          id: entregaItemId,
          pedidoEquipoItemId: pedidoItem.id,
          listaEquipoItemId: pedidoItem.listaEquipoItemId || null,
          proyectoId,
          fechaEntrega: recepcion.fechaRecepcion,
          estado: nuevoEstadoEntrega as any,
          cantidad: pedidoItem.cantidadPedida,
          cantidadEntregada: recepcion.cantidadRecibida,
          observaciones: observaciones || `Recepción confirmada desde OC ${recepcion.ordenCompraItem.ordenCompra.numero}`,
          usuarioId: session.user.id,
          updatedAt: new Date()
        }
      })

      // 4. Crear EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entregaItemId,
          proyectoId,
          tipo: 'recepcion_confirmada',
          descripcion: `Recepción confirmada: ${recepcion.cantidadRecibida} unidades desde OC ${recepcion.ordenCompraItem.ordenCompra.numero}`,
          estadoAnterior: pedidoItem.estadoEntrega as any,
          estadoNuevo: nuevoEstadoEntrega as any,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: recepcion.ordenCompraItem.ordenCompra.numero,
            cantidadRecibida: recepcion.cantidadRecibida,
            pedidoCodigo: pedido.codigo,
            proyectoNombre: pedido.proyecto.nombre,
          },
          updatedAt: new Date()
        }
      })

      // 5. Actualizar ListaEquipoItem.cantidadEntregada si existe
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

      // 6. Recalcular PedidoEquipo.estado
      const allPedidoItems = await tx.pedidoEquipoItem.findMany({
        where: { pedidoId: pedido.id },
        select: { estado: true, precioUnitario: true, cantidadAtendida: true }
      })

      // Recalcular costoRealTotal
      const costoRealTotal = allPedidoItems.reduce((sum, item) =>
        sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)

      const estados = allPedidoItems.map(i => i.estado)
      let nuevoEstadoPedido: 'borrador' | 'enviado' | 'atendido' | 'parcial' | 'entregado' | 'cancelado' | null = null
      if (estados.every(e => e === 'cancelado')) {
        nuevoEstadoPedido = 'cancelado'
      } else if (estados.every(e => e === 'entregado' || e === 'cancelado')) {
        nuevoEstadoPedido = 'entregado'
      } else if (estados.some(e => e !== 'pendiente' && e !== 'cancelado')) {
        nuevoEstadoPedido = 'parcial'
      }

      if (nuevoEstadoPedido || costoRealTotal > 0) {
        await tx.pedidoEquipo.update({
          where: { id: pedido.id },
          data: {
            ...(nuevoEstadoPedido ? { estado: nuevoEstadoPedido } : {}),
            costoRealTotal,
            updatedAt: new Date()
          }
        })
      }

      return {
        recepcionId: id,
        entregaItemId,
        pedidoItemId: pedidoItem.id,
        cantidadRecibida: recepcion.cantidadRecibida,
        nuevaCantidadAtendida,
        nuevoEstadoEntrega,
        nuevoEstadoPedido,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al confirmar recepción:', error)
    return NextResponse.json(
      { error: 'Error al confirmar recepción: ' + String(error) },
      { status: 500 }
    )
  }
}
