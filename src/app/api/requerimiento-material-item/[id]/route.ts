import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * PATCH /api/requerimiento-material-item/[id]
 * Actualiza cantidad o precio estimado de un item.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const item = await prisma.requerimientoMaterialItem.findUnique({
      where: { id },
      include: { hojaDeGastos: { select: { id: true, estado: true, tipoPropósito: true } } },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }
    if (!['borrador', 'aprobado', 'depositado'].includes(item.hojaDeGastos.estado)) {
      return NextResponse.json({ error: 'Solo se pueden modificar items cuando el requerimiento está en borrador, aprobado o depositado' }, { status: 409 })
    }

    const cantidadAnterior = item.cantidadSolicitada
    const precioAnterior = item.precioEstimado
    const cantidadSolicitada = body.cantidadSolicitada ?? item.cantidadSolicitada
    const precioEstimado = 'precioEstimado' in body ? body.precioEstimado : item.precioEstimado
    const totalEstimado = precioEstimado !== null && precioEstimado !== undefined
      ? cantidadSolicitada * precioEstimado
      : null

    const updated = await prisma.requerimientoMaterialItem.update({
      where: { id },
      data: {
        cantidadSolicitada,
        precioEstimado: precioEstimado ?? null,
        totalEstimado,
        updatedAt: new Date(),
      },
    })

    // Registrar evento de auditoría si el requerimiento ya estaba aprobado/depositado
    if (item.hojaDeGastos.estado !== 'borrador') {
      const cambios: string[] = []
      if (cantidadAnterior !== cantidadSolicitada) cambios.push(`cantidad: ${cantidadAnterior} → ${cantidadSolicitada}`)
      if (precioAnterior !== precioEstimado) cambios.push(`precio est.: ${precioAnterior ?? '—'} → ${precioEstimado ?? '—'}`)
      await prisma.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: item.hojaDeGastos.id,
          tipo: 'item_editado',
          descripcion: `Ítem editado post-aprobación: ${item.codigo} — ${item.descripcion}${cambios.length ? ` (${cambios.join(', ')})` : ''}`,
          usuarioId: session.user.id,
          metadata: {
            itemId: id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            cantidadAnterior,
            cantidadNueva: cantidadSolicitada,
            precioAnterior,
            precioNuevo: precioEstimado,
            estadoHoja: item.hojaDeGastos.estado,
          },
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar item de requerimiento:', error)
    return NextResponse.json(
      { error: 'Error al actualizar item: ' + String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/requerimiento-material-item/[id]
 * Elimina un item del requerimiento (solo en borrador).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    const item = await prisma.requerimientoMaterialItem.findUnique({
      where: { id },
      include: {
        hojaDeGastos: { select: { estado: true } },
        recepciones: { select: { id: true, estado: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    const estadoHoja = item.hojaDeGastos.estado
    if (!['borrador', 'aprobado', 'depositado'].includes(estadoHoja)) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar items cuando el requerimiento está en borrador, aprobado o depositado' },
        { status: 409 }
      )
    }

    // En depositado: verificar que la recepción no haya sido confirmada ya
    if (estadoHoja === 'depositado') {
      const recepcionActiva = item.recepciones.find(
        r => ['en_almacen', 'entregado_proyecto'].includes(r.estado)
      )
      if (recepcionActiva) {
        const esEntregado = recepcionActiva.estado === 'entregado_proyecto'
        const mensaje = esEntregado
          ? 'No se puede eliminar: el ítem ya fue entregado al proyecto. Contacta al administrador si necesitas anularlo.'
          : 'No se puede eliminar: el ítem ya llegó al almacén. Para poder eliminarlo, primero ve a Logística → Recepciones y rechaza la recepción de este ítem.'
        return NextResponse.json({ error: mensaje }, { status: 409 })
      }
    }

    // Borrar en transacción: primero recepción pendiente (si existe), luego el item
    await prisma.$transaction(async (tx) => {
      const recepcionPendiente = item.recepciones.find(r => r.estado === 'pendiente')
      if (recepcionPendiente) {
        await tx.recepcionPendiente.delete({ where: { id: recepcionPendiente.id } })
      }
      await tx.requerimientoMaterialItem.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar item de requerimiento:', error)
    return NextResponse.json(
      { error: 'Error al eliminar item: ' + String(error) },
      { status: 500 }
    )
  }
}
