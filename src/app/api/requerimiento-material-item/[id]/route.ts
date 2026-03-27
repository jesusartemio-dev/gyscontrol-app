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
      include: { hojaDeGastos: { select: { estado: true, tipoPropósito: true } } },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }
    if (item.hojaDeGastos.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se pueden modificar items cuando el requerimiento está en borrador' }, { status: 409 })
    }

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
    if (!['borrador', 'depositado'].includes(estadoHoja)) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar items en borrador o cuando el dinero fue depositado' },
        { status: 409 }
      )
    }

    // En depositado: verificar que la recepción no haya sido confirmada ya
    if (estadoHoja === 'depositado') {
      const recepcionActiva = item.recepciones.find(
        r => ['en_almacen', 'entregado_proyecto'].includes(r.estado)
      )
      if (recepcionActiva) {
        return NextResponse.json(
          { error: 'No se puede eliminar: el item ya fue recibido en almacén o entregado al proyecto' },
          { status: 409 }
        )
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
