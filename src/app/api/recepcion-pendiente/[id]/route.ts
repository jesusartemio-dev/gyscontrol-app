import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canDelete } from '@/lib/utils/deleteValidation'
import { crearEvento } from '@/lib/utils/trazabilidad'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar recepciones' }, { status: 403 })
    }

    const { id } = await params

    const recepcion = await prisma.recepcionPendiente.findUnique({
      where: { id },
      include: {
        ordenCompraItem: {
          include: {
            ordenCompra: { select: { id: true, numero: true } }
          }
        },
        pedidoEquipoItem: {
          select: { codigo: true, pedidoEquipo: { select: { id: true, proyectoId: true } } }
        },
      },
    })

    if (!recepcion) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 })
    }

    if (recepcion.estado === 'entregado_proyecto') {
      return NextResponse.json(
        { error: 'No se puede eliminar una recepción ya entregada. Retrocede primero la entrega.' },
        { status: 403 }
      )
    }

    const validation = await canDelete('recepcionPendiente', id)
    if (!validation.allowed) {
      return NextResponse.json({ error: validation.message }, { status: 409 })
    }

    const oci = recepcion.ordenCompraItem
    const oc = oci.ordenCompra

    await prisma.$transaction(async (tx) => {
      // 1. Decrementar cantidadRecibida en el OrdenCompraItem
      await tx.ordenCompraItem.update({
        where: { id: oci.id },
        data: {
          cantidadRecibida: { decrement: recepcion.cantidadRecibida },
        },
      })

      // 2. Recalcular estado de la OC
      const allOCItems = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId: oc.id },
        select: { cantidad: true, cantidadRecibida: true },
      })

      let nuevoEstadoOC: string
      const todosCompletos = allOCItems.every(i => (i.cantidadRecibida || 0) >= i.cantidad)
      const algunoRecibido = allOCItems.some(i => (i.cantidadRecibida || 0) > 0)

      if (todosCompletos) {
        nuevoEstadoOC = 'completada'
      } else if (algunoRecibido) {
        nuevoEstadoOC = 'parcial'
      } else {
        nuevoEstadoOC = 'confirmada'
      }

      await tx.ordenCompra.update({
        where: { id: oc.id },
        data: { estado: nuevoEstadoOC as any, updatedAt: new Date() },
      })

      // 3. Eliminar la recepción
      await tx.recepcionPendiente.delete({ where: { id } })
    })

    // Auditoría fire-and-forget
    crearEvento(prisma, {
      tipo: 'recepcion_eliminada',
      descripcion: `Recepción eliminada — ${recepcion.cantidadRecibida} x ${recepcion.pedidoEquipoItem?.codigo || 'item'} de OC ${oc.numero}`,
      usuarioId: session.user.id,
      proyectoId: recepcion.pedidoEquipoItem?.pedidoEquipo?.proyectoId || null,
      pedidoEquipoId: recepcion.pedidoEquipoItem?.pedidoEquipo?.id || null,
      metadata: {
        recepcionPendienteId: id,
        ordenCompraId: oc.id,
        ordenCompraNumero: oc.numero,
        cantidadRecibida: recepcion.cantidadRecibida,
        estadoAlEliminar: recepcion.estado,
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true, mensaje: 'Recepción eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar recepción:', error)
    return NextResponse.json(
      { error: 'Error al eliminar recepción: ' + String(error) },
      { status: 500 }
    )
  }
}
