import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificacion } from '@/lib/utils/notificaciones'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const paso: 'almacen' | 'proyecto' = body.paso || 'almacen'
    const observaciones = body.observaciones || null

    // Validar permisos por paso
    const role = session.user.role
    if (paso === 'almacen' && !['admin', 'gerente', 'logistico'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para confirmar llegada a almacén' }, { status: 403 })
    }
    if (paso === 'proyecto' && !['admin', 'gerente', 'gestor', 'coordinador'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para confirmar entrega a proyecto' }, { status: 403 })
    }

    const recepcion = await prisma.recepcionPendiente.findUnique({
      where: { id },
      include: {
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: {
              select: { id: true, codigo: true, proyectoId: true, proyecto: { select: { nombre: true, gestorId: true } } }
            }
          }
        },
        ordenCompraItem: {
          include: {
            ordenCompra: { select: { numero: true } }
          }
        },
        confirmadoPor: { select: { name: true } },
      }
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    // Validar estado según paso
    if (paso === 'almacen' && recepcion.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `No se puede confirmar en almacén: estado actual es "${recepcion.estado}"` },
        { status: 409 }
      )
    }
    if (paso === 'proyecto' && recepcion.estado !== 'en_almacen') {
      return NextResponse.json(
        { error: `No se puede confirmar entrega a proyecto: estado actual es "${recepcion.estado}". Debe estar en almacén primero.` },
        { status: 409 }
      )
    }

    const pedidoItem = recepcion.pedidoEquipoItem
    const pedido = pedidoItem.pedidoEquipo
    const proyectoId = pedido.proyectoId
    const ocNumero = recepcion.ordenCompraItem.ordenCompra.numero

    // ═══════════════════════════════════════
    // PASO 1: Confirmar llegada a almacén
    // ═══════════════════════════════════════
    if (paso === 'almacen') {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Actualizar RecepcionPendiente → en_almacen
        await tx.recepcionPendiente.update({
          where: { id },
          data: {
            estado: 'en_almacen',
            confirmadoPorId: session.user.id,
            fechaConfirmacion: new Date(),
            observaciones,
          }
        })

        // 2. Crear EventoTrazabilidad
        await tx.eventoTrazabilidad.create({
          data: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            proyectoId,
            pedidoEquipoId: pedido.id,
            tipo: 'recepcion_en_almacen',
            descripcion: `Recepción en almacén: ${recepcion.cantidadRecibida} x ${pedidoItem.codigo} desde OC ${ocNumero}`,
            usuarioId: session.user.id,
            metadata: {
              recepcionPendienteId: id,
              ordenCompraNumero: ocNumero,
              cantidadRecibida: recepcion.cantidadRecibida,
              pedidoCodigo: pedido.codigo,
              itemCodigo: pedidoItem.codigo,
            },
            updatedAt: new Date(),
          }
        })

        return {
          recepcionId: id,
          paso: 'almacen',
          nuevoEstado: 'en_almacen',
        }
      })

      // Notificar al gestor: material llegó a almacén
      if (pedido.proyecto?.gestorId) {
        crearNotificacion(prisma, {
          usuarioId: pedido.proyecto.gestorId,
          titulo: 'Material recibido en almacén',
          mensaje: `${recepcion.cantidadRecibida} x ${pedidoItem.codigo} (OC ${ocNumero}) para ${pedido.proyecto?.nombre || pedido.codigo}`,
          tipo: 'info',
          prioridad: 'media',
          entidadTipo: 'PedidoEquipo',
          entidadId: pedido.id,
          accionUrl: '/logistica/recepciones',
          accionTexto: 'Ver recepciones',
        })
      }

      return NextResponse.json(result)
    }

    // ═══════════════════════════════════════
    // PASO 2: Confirmar entrega a proyecto
    // ═══════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Marcar RecepcionPendiente como entregado_proyecto
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'entregado_proyecto',
          entregadoPorId: session.user.id,
          fechaEntregaProyecto: new Date(),
          observaciones: observaciones || recepcion.observaciones,
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
          fechaEntrega: new Date(),
          estado: nuevoEstadoEntrega as any,
          cantidad: pedidoItem.cantidadPedida,
          cantidadEntregada: recepcion.cantidadRecibida,
          observaciones: observaciones || `Entrega a proyecto desde OC ${ocNumero}`,
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
          pedidoEquipoId: pedido.id,
          tipo: 'entrega_a_proyecto',
          descripcion: `Entrega a proyecto: ${recepcion.cantidadRecibida} x ${pedidoItem.codigo} desde almacén (OC ${ocNumero})`,
          estadoAnterior: pedidoItem.estadoEntrega as any,
          estadoNuevo: nuevoEstadoEntrega as any,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            pedidoCodigo: pedido.codigo,
            itemCodigo: pedidoItem.codigo,
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
        paso: 'proyecto',
        entregaItemId,
        pedidoItemId: pedidoItem.id,
        cantidadRecibida: recepcion.cantidadRecibida,
        nuevaCantidadAtendida,
        nuevoEstadoEntrega,
        nuevoEstadoPedido,
      }
    })

    // Notificar al gestor: material entregado a proyecto
    if (pedido.proyecto?.gestorId) {
      crearNotificacion(prisma, {
        usuarioId: pedido.proyecto.gestorId,
        titulo: 'Material entregado a proyecto',
        mensaje: `${recepcion.cantidadRecibida} x ${pedidoItem.codigo} (OC ${ocNumero}) entregado a ${pedido.proyecto?.nombre || pedido.codigo}`,
        tipo: 'success',
        prioridad: 'media',
        entidadTipo: 'PedidoEquipo',
        entidadId: pedido.id,
        accionUrl: `/proyectos/${proyectoId}`,
        accionTexto: 'Ver proyecto',
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al confirmar recepción:', error)
    return NextResponse.json(
      { error: 'Error al confirmar recepción: ' + String(error) },
      { status: 500 }
    )
  }
}
