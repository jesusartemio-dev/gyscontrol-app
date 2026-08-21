// Disconformidad del proyecto: lo despachado no llegó, llegó dañado o no
// corresponde. Devuelve la recepción a la cola de Logística (`en_almacen`).
//
// OJO: esto NO es lo mismo que `rechazar/route.ts`. Ese rechaza la mercadería
// del PROVEEDOR y por eso decrementa `OrdenCompraItem.cantidadRecibida` (se le
// devuelve al proveedor). Acá el material sigue siendo de GYS: es una
// discrepancia entre lo que salió del almacén y lo que llegó a obra, así que la
// OC no se toca — solo se revierte la entrega y el stock vuelve al almacén.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificacion } from '@/lib/utils/notificaciones'
import { ajustarCantidadAtendida } from '@/lib/services/recepcionRecalculo'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const motivo: string = (body.observaciones || '').trim()

    if (!motivo) {
      return NextResponse.json(
        { error: 'El motivo es obligatorio al reportar disconformidad' },
        { status: 400 }
      )
    }

    const almacen = await getAlmacenCentral().catch(() => null)

    const recepcion = await prisma.recepcionPendiente.findUnique({
      where: { id },
      include: {
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: {
              select: {
                id: true,
                codigo: true,
                proyectoId: true,
                responsableId: true,
                proyecto: { select: { nombre: true, gestorId: true } },
              },
            },
          },
        },
        ordenCompraItem: {
          include: {
            ordenCompra: {
              select: { numero: true, proyectoId: true, proyecto: { select: { nombre: true, gestorId: true } } },
            },
            pedidoEquipoItem: { select: { catalogoEquipoId: true, catalogoEppId: true } },
          },
        },
      },
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    if (recepcion.estado !== 'entregado_proyecto') {
      return NextResponse.json(
        { error: `No se puede reportar disconformidad: estado actual es "${recepcion.estado}"` },
        { status: 409 }
      )
    }

    const pedidoItem = recepcion.pedidoEquipoItem || null
    const pedido = pedidoItem?.pedidoEquipo || null
    const ocItem = recepcion.ordenCompraItem || null
    const ocNumero = ocItem?.ordenCompra.numero || 'OC'
    const itemCodigo = pedidoItem?.codigo || ocItem?.codigo || 'item'
    const proyectoId = pedido?.proyectoId || ocItem?.ordenCompra.proyectoId || null
    const proyectoNombre = pedido?.proyecto?.nombre || ocItem?.ordenCompra.proyecto?.nombre || null
    const gestorId = pedido?.proyecto?.gestorId || ocItem?.ordenCompra.proyecto?.gestorId || null

    if (!pedido) {
      return NextResponse.json(
        { error: 'Esta recepción no está vinculada a un pedido, no requiere confirmación del proyecto' },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const esSolicitante = pedido.responsableId === userId
    const esGestor = gestorId === userId
    const esAdmin = ['admin', 'gerente'].includes(session.user.role)

    if (!esSolicitante && !esGestor && !esAdmin) {
      return NextResponse.json(
        { error: 'Solo el solicitante del pedido o el gestor del proyecto pueden reportar disconformidad' },
        { status: 403 }
      )
    }

    const catalogoEquipoId = pedidoItem?.catalogoEquipoId
      || ocItem?.pedidoEquipoItem?.catalogoEquipoId
      || null
    const catalogoEppId = (pedidoItem as any)?.catalogoEppId
      || (ocItem as any)?.catalogoEppId
      || (ocItem as any)?.pedidoEquipoItem?.catalogoEppId
      || null

    await prisma.$transaction(async (tx) => {
      // 1. Borrar la entrega registrada — no hubo entrega efectiva
      await tx.entregaItem.deleteMany({ where: { recepcionPendienteId: id } })

      // 2. Revertir la cantidad atendida y recalcular lista/pedido
      if (pedidoItem) {
        await ajustarCantidadAtendida(
          tx,
          {
            id: pedidoItem.id,
            cantidadAtendida: pedidoItem.cantidadAtendida,
            cantidadPedida: pedidoItem.cantidadPedida,
            listaEquipoItemId: pedidoItem.listaEquipoItemId,
          },
          pedido.id,
          -recepcion.cantidadRecibida
        )
      }

      // 3. Volver a la cola de Logística
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'en_almacen',
          entregadoPorId: null,
          fechaEntregaProyecto: null,
          observacionesConformidad: motivo,
          observaciones: `Disconformidad del proyecto: ${motivo}`,
        },
      })

      // 4. El stock vuelve al almacén
      if (almacen && (catalogoEquipoId || catalogoEppId)) {
        await registrarMovimiento({
          almacenId: almacen.id,
          tipo: catalogoEppId ? 'devolucion_epp' : 'devolucion_proyecto',
          catalogoEquipoId: catalogoEquipoId ?? undefined,
          catalogoEppId: catalogoEppId ?? undefined,
          cantidad: recepcion.cantidadRecibida,
          usuarioId: userId,
          recepcionPendienteId: id,
          observaciones: `Devolución por disconformidad del proyecto (OC ${ocNumero}): ${motivo}`,
        }, tx)
      }

      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId,
          pedidoEquipoId: pedido.id,
          tipo: 'rechazo_conformidad_proyecto',
          descripcion: `Disconformidad del proyecto: ${recepcion.cantidadRecibida} x ${itemCodigo} (OC ${ocNumero}) no aceptado en obra. Motivo: ${motivo}`,
          usuarioId: userId,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadRecibida: recepcion.cantidadRecibida,
            pedidoCodigo: pedido.codigo,
            itemCodigo,
            motivo,
            de: 'entregado_proyecto',
            a: 'en_almacen',
          },
          updatedAt: new Date(),
        },
      })
    })

    const destinatarios = new Set<string>()
    if (recepcion.entregadoPorId) destinatarios.add(recepcion.entregadoPorId)
    if (recepcion.confirmadoPorId) destinatarios.add(recepcion.confirmadoPorId)
    if (gestorId) destinatarios.add(gestorId)
    destinatarios.delete(userId)

    for (const destinatarioId of destinatarios) {
      crearNotificacion(prisma, {
        usuarioId: destinatarioId,
        titulo: 'Disconformidad del proyecto',
        mensaje: `${proyectoNombre || 'El proyecto'} NO aceptó ${recepcion.cantidadRecibida} x ${itemCodigo} (OC ${ocNumero}). Motivo: ${motivo}`,
        tipo: 'error',
        prioridad: 'alta',
        entidadTipo: 'PedidoEquipo',
        entidadId: pedido.id,
        accionUrl: '/logistica/recepciones',
        accionTexto: 'Ver recepciones',
      })
    }

    return NextResponse.json({
      recepcionId: id,
      estado: 'en_almacen',
      mensaje: 'Disconformidad registrada. La recepción volvió a la cola de Logística.',
    })
  } catch (error) {
    console.error('Error al reportar disconformidad:', error)
    return NextResponse.json(
      { error: 'Error al reportar disconformidad: ' + String(error) },
      { status: 500 }
    )
  }
}
