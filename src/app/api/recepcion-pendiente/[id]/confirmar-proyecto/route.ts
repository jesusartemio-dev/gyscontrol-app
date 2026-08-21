// Conformidad del proyecto sobre lo que Logística despachó.
//
// Último eslabón del ciclo: Proyectos pide → Logística atiende y entrega →
// el solicitante confirma que recibió lo que pidió. A diferencia del resto de
// los pasos de recepción (que se autorizan por ROL), acá se autoriza por
// PERTENENCIA: confirma quien hizo el pedido o el gestor de ese proyecto.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificacion } from '@/lib/utils/notificaciones'
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

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const observaciones: string | null = body.observaciones?.trim() || null
    const cantidadConfirmadaRaw = body.cantidadConfirmada

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
          },
        },
      },
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    if (recepcion.estado !== 'entregado_proyecto') {
      return NextResponse.json(
        { error: `No se puede confirmar: estado actual es "${recepcion.estado}". Debe estar entregado al proyecto.` },
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

    // ── Autorización por pertenencia ──
    // Sin pedido no hay solicitante (items manuales / OC de centro de costo):
    // esos no entran a la cola de conformidad.
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
        { error: 'Solo el solicitante del pedido o el gestor del proyecto pueden confirmar esta recepción' },
        { status: 403 }
      )
    }

    // ── Cantidad confirmada ──
    let cantidadConfirmada = recepcion.cantidadRecibida
    if (cantidadConfirmadaRaw !== undefined && cantidadConfirmadaRaw !== null) {
      const parsed = Number(cantidadConfirmadaRaw)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'La cantidad confirmada debe ser mayor a 0' }, { status: 400 })
      }
      if (parsed > recepcion.cantidadRecibida) {
        return NextResponse.json(
          { error: `La cantidad confirmada no puede superar lo entregado (${recepcion.cantidadRecibida})` },
          { status: 400 }
        )
      }
      cantidadConfirmada = parsed
    }

    const faltante = recepcion.cantidadRecibida - cantidadConfirmada
    const esParcial = faltante > 0

    if (esParcial && !observaciones) {
      return NextResponse.json(
        { error: 'Al confirmar menos de lo entregado, la observación es obligatoria' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.recepcionPendiente.update({
        where: { id },
        data: {
          estado: 'confirmado_proyecto',
          confirmadoProyectoPorId: userId,
          fechaConfirmacionProyecto: new Date(),
          cantidadConfirmada: esParcial ? cantidadConfirmada : null,
          observacionesConformidad: observaciones,
        },
      })

      // Si llegó menos de lo despachado, descontar el faltante en cascada.
      let ajuste = null
      if (esParcial && pedidoItem) {
        ajuste = await ajustarCantidadAtendida(
          tx,
          {
            id: pedidoItem.id,
            cantidadAtendida: pedidoItem.cantidadAtendida,
            cantidadPedida: pedidoItem.cantidadPedida,
            listaEquipoItemId: pedidoItem.listaEquipoItemId,
          },
          pedido.id,
          -faltante
        )

        // La EntregaItem refleja lo realmente recibido, no lo despachado.
        await tx.entregaItem.updateMany({
          where: { recepcionPendienteId: id },
          data: {
            cantidadEntregada: cantidadConfirmada,
            observaciones: `Conformidad parcial: recibido ${cantidadConfirmada} de ${recepcion.cantidadRecibida}. ${observaciones}`,
          },
        })
      }

      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId,
          pedidoEquipoId: pedido.id,
          tipo: 'conformidad_proyecto',
          descripcion: esParcial
            ? `Conformidad PARCIAL del proyecto: recibido ${cantidadConfirmada} de ${recepcion.cantidadRecibida} x ${itemCodigo} (OC ${ocNumero}). Faltante: ${faltante}. ${observaciones}`
            : `Conformidad del proyecto: ${cantidadConfirmada} x ${itemCodigo} (OC ${ocNumero}) recibido conforme.`,
          usuarioId: userId,
          metadata: {
            recepcionPendienteId: id,
            ordenCompraNumero: ocNumero,
            cantidadEntregada: recepcion.cantidadRecibida,
            cantidadConfirmada,
            faltante,
            pedidoCodigo: pedido.codigo,
            itemCodigo,
            confirmadoPor: esSolicitante ? 'solicitante' : esGestor ? 'gestor' : 'admin',
          },
          updatedAt: new Date(),
        },
      })

      return {
        recepcionId: id,
        estado: 'confirmado_proyecto',
        cantidadConfirmada,
        faltante,
        ajuste,
      }
    })

    // Avisar a quien despachó y al gestor (sin duplicar si son la misma persona)
    const destinatarios = new Set<string>()
    if (recepcion.entregadoPorId) destinatarios.add(recepcion.entregadoPorId)
    if (gestorId) destinatarios.add(gestorId)
    destinatarios.delete(userId)

    for (const destinatarioId of destinatarios) {
      crearNotificacion(prisma, {
        usuarioId: destinatarioId,
        titulo: esParcial ? 'Conformidad parcial del proyecto' : 'Recepción confirmada por el proyecto',
        mensaje: esParcial
          ? `${proyectoNombre || 'El proyecto'} recibió ${cantidadConfirmada} de ${recepcion.cantidadRecibida} x ${itemCodigo} (OC ${ocNumero}). ${observaciones}`
          : `${proyectoNombre || 'El proyecto'} confirmó ${cantidadConfirmada} x ${itemCodigo} (OC ${ocNumero})`,
        tipo: esParcial ? 'warning' : 'success',
        prioridad: esParcial ? 'alta' : 'media',
        entidadTipo: 'PedidoEquipo',
        entidadId: pedido.id,
        accionUrl: proyectoId ? `/proyectos/${proyectoId}/pedidos/${pedido.id}` : '/logistica/recepciones',
        accionTexto: 'Ver pedido',
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al confirmar conformidad del proyecto:', error)
    return NextResponse.json(
      { error: 'Error al confirmar conformidad: ' + String(error) },
      { status: 500 }
    )
  }
}
