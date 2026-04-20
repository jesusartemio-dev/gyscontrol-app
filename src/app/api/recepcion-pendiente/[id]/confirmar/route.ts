import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificacion } from '@/lib/utils/notificaciones'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

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
    const cantidadReal: number | null = body.cantidadReal ?? null

    // Validar permisos por paso
    const role = session.user.role
    if (paso === 'almacen' && !['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para confirmar llegada a almacén' }, { status: 403 })
    }
    if (paso === 'proyecto' && !['admin', 'gerente', 'logistico', 'coordinador_logistico', 'gestor', 'coordinador'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para confirmar entrega a proyecto' }, { status: 403 })
    }

    const almacen = await getAlmacenCentral().catch(() => null)

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
            ordenCompra: { select: { numero: true, proyectoId: true, proyecto: { select: { nombre: true, gestorId: true } } } },
            pedidoEquipoItem: { select: { catalogoEquipoId: true } },
          }
        },
        requerimientoMaterialItem: {
          include: {
            hojaDeGastos: { select: { numero: true } },
            proyecto: { select: { nombre: true, gestorId: true } },
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

    // Extraer datos con null safety — puede ser OC o requerimiento de materiales
    const pedidoItem = recepcion.pedidoEquipoItem || null
    const pedido = pedidoItem?.pedidoEquipo || null
    const ocItem = recepcion.ordenCompraItem || null
    const reqItem = recepcion.requerimientoMaterialItem || null
    const catalogoEquipoId = pedidoItem?.catalogoEquipoId
      || ocItem?.pedidoEquipoItem?.catalogoEquipoId
      || null
    const ocNumero = ocItem?.ordenCompra.numero || reqItem?.hojaDeGastos.numero || 'REQ'
    const proyectoId = pedido?.proyectoId || ocItem?.ordenCompra.proyectoId || reqItem?.proyectoId || null
    const proyectoNombre = pedido?.proyecto?.nombre || ocItem?.ordenCompra.proyecto?.nombre || reqItem?.proyecto?.nombre || null
    const gestorId = pedido?.proyecto?.gestorId || ocItem?.ordenCompra.proyecto?.gestorId || reqItem?.proyecto?.gestorId || null
    const itemCodigo = pedidoItem?.codigo || ocItem?.codigo || reqItem?.codigo || 'item'

    // ═══════════════════════════════════════
    // PASO 1: Confirmar llegada a almacén
    // ═══════════════════════════════════════
    if (paso === 'almacen') {
      // Validar cantidad real si se provee
      if (cantidadReal !== null) {
        if (cantidadReal <= 0) {
          return NextResponse.json({ error: 'La cantidad real debe ser mayor a 0' }, { status: 400 })
        }
        if (cantidadReal > recepcion.cantidadRecibida) {
          return NextResponse.json({ error: 'La cantidad real no puede superar la solicitada' }, { status: 400 })
        }
      }
      const cantidadConfirmada = cantidadReal ?? recepcion.cantidadRecibida

      const result = await prisma.$transaction(async (tx) => {
        await tx.recepcionPendiente.update({
          where: { id },
          data: {
            estado: 'en_almacen',
            cantidadRecibida: cantidadConfirmada,
            confirmadoPorId: session.user.id,
            fechaConfirmacion: new Date(),
            observaciones,
          }
        })

        await tx.eventoTrazabilidad.create({
          data: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            proyectoId,
            pedidoEquipoId: pedido?.id || null,
            tipo: 'recepcion_en_almacen',
            descripcion: `Recepción en almacén: ${recepcion.cantidadRecibida} x ${itemCodigo} desde OC ${ocNumero}`,
            usuarioId: session.user.id,
            metadata: {
              recepcionPendienteId: id,
              ordenCompraNumero: ocNumero,
              cantidadRecibida: recepcion.cantidadRecibida,
              pedidoCodigo: pedido?.codigo || null,
              itemCodigo,
            },
            updatedAt: new Date(),
          }
        })

        // Hook de stock: registrar entrada al almacén
        if (almacen && catalogoEquipoId) {
          await registrarMovimiento({
            almacenId: almacen.id,
            tipo: 'entrada_recepcion',
            catalogoEquipoId,
            cantidad: cantidadConfirmada,
            usuarioId: session.user.id,
            recepcionPendienteId: id,
            observaciones: `Recepción OC ${ocNumero}`,
          }, tx)
        }

        return { recepcionId: id, paso: 'almacen', nuevoEstado: 'en_almacen' }
      })

      if (gestorId) {
        crearNotificacion(prisma, {
          usuarioId: gestorId,
          titulo: 'Material recibido en almacén',
          mensaje: `${recepcion.cantidadRecibida} x ${itemCodigo} (OC ${ocNumero}) para ${proyectoNombre || 'proyecto'}`,
          tipo: 'info',
          prioridad: 'media',
          entidadTipo: pedido ? 'PedidoEquipo' : 'OrdenCompra',
          entidadId: pedido?.id || ocItem?.ordenCompraId || reqItem?.hojaDeGastosId || id,
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

      let entregaItemId: string | null = null
      let nuevoEstadoEntrega: string | null = null
      let nuevoEstadoPedido: string | null = null

      // ─── Path A: Item vinculado a Pedido (flujo completo) ───
      if (pedidoItem && pedido) {
        const nuevaCantidadAtendida = (pedidoItem.cantidadAtendida || 0) + recepcion.cantidadRecibida
        nuevoEstadoEntrega = 'pendiente'
        if (nuevaCantidadAtendida >= pedidoItem.cantidadPedida) {
          nuevoEstadoEntrega = 'entregado'
        } else if (nuevaCantidadAtendida > 0) {
          nuevoEstadoEntrega = 'parcial'
        }

        let estadoDerivado: string | undefined = undefined
        if (nuevoEstadoEntrega === 'entregado') estadoDerivado = 'entregado'
        else if (nuevoEstadoEntrega === 'parcial') estadoDerivado = 'parcial'

        await tx.pedidoEquipoItem.update({
          where: { id: pedidoItem.id },
          data: {
            cantidadAtendida: nuevaCantidadAtendida,
            estadoEntrega: nuevoEstadoEntrega as any,
            fechaEntregaReal: new Date(),
            ...(estadoDerivado ? { estado: estadoDerivado as any } : {}),
            updatedAt: new Date()
          }
        })

        // Crear EntregaItem
        entregaItemId = `ent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await tx.entregaItem.create({
          data: {
            id: entregaItemId,
            pedidoEquipoItemId: pedidoItem.id,
            listaEquipoItemId: pedidoItem.listaEquipoItemId || null,
            recepcionPendienteId: id,
            proyectoId: pedido.proyectoId as string,
            fechaEntrega: new Date(),
            estado: nuevoEstadoEntrega as any,
            cantidad: pedidoItem.cantidadPedida,
            cantidadEntregada: recepcion.cantidadRecibida,
            observaciones: observaciones || `Entrega a proyecto desde OC ${ocNumero}`,
            usuarioId: session.user.id,
          }
        })

        // Actualizar ListaEquipoItem si existe (vía pedido)
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

        // Recalcular PedidoEquipo.estado
        const allPedidoItems = await tx.pedidoEquipoItem.findMany({
          where: { pedidoId: pedido.id },
          select: { estado: true, precioUnitario: true, cantidadAtendida: true }
        })

        const costoRealTotal = allPedidoItems.reduce((sum, item) =>
          sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)

        const estados = allPedidoItems.map(i => i.estado)
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
              ...(nuevoEstadoPedido ? { estado: nuevoEstadoPedido as any } : {}),
              costoRealTotal,
              updatedAt: new Date()
            }
          })
        }
      }
      // ─── Path C: Item manual (sin pedido) ───
      // Solo se marca entregado_proyecto en RecepcionPendiente (ya hecho arriba)

      // Crear EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entregaItemId,
          proyectoId,
          pedidoEquipoId: pedido?.id || null,
          tipo: 'entrega_a_proyecto',
          descripcion: `Entrega a proyecto: ${recepcion.cantidadRecibida} x ${itemCodigo} desde almacén (OC ${ocNumero})`,
          estadoAnterior: pedidoItem?.estadoEntrega as any || null,
          estadoNuevo: nuevoEstadoEntrega as any || null,
          usuarioId: session.user.id,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            pedidoCodigo: pedido?.codigo || null,
            itemCodigo,
            origen: pedidoItem ? 'pedido' : 'manual',
          },
          updatedAt: new Date()
        }
      })

      // Hook de stock: registrar salida hacia proyecto
      if (almacen && catalogoEquipoId) {
        await registrarMovimiento({
          almacenId: almacen.id,
          tipo: 'salida_proyecto',
          catalogoEquipoId,
          cantidad: recepcion.cantidadRecibida,
          usuarioId: session.user.id,
          recepcionPendienteId: id,
          entregaItemId: entregaItemId ?? undefined,
          observaciones: `Entrega a proyecto desde almacén (OC ${ocNumero})`,
        }, tx)
      }

      return {
        recepcionId: id,
        paso: 'proyecto',
        entregaItemId,
        pedidoItemId: pedidoItem?.id || null,
        cantidadRecibida: recepcion.cantidadRecibida,
        nuevoEstadoEntrega,
        nuevoEstadoPedido,
      }
    })

    if (gestorId) {
      crearNotificacion(prisma, {
        usuarioId: gestorId,
        titulo: 'Material entregado a proyecto',
        mensaje: `${recepcion.cantidadRecibida} x ${itemCodigo} (OC ${ocNumero}) entregado a ${proyectoNombre || 'proyecto'}`,
        tipo: 'success',
        prioridad: 'media',
        entidadTipo: pedido ? 'PedidoEquipo' : 'OrdenCompra',
        entidadId: pedido?.id || ocItem?.ordenCompraId || reqItem?.hojaDeGastosId || id,
        accionUrl: proyectoId ? `/proyectos/${proyectoId}` : '/logistica/recepciones',
        accionTexto: pedido ? 'Ver proyecto' : 'Ver recepciones',
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
