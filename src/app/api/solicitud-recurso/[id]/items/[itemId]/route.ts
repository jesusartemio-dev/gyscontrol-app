import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, itemId } = await params
    const solicitud = await prisma.solicitudRecurso.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se pueden editar ítems en estado borrador' }, { status: 409 })
    }

    const item = await prisma.solicitudRecursoItem.findUnique({ where: { id: itemId } })
    if (!item || item.solicitudId !== id) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const cantidad = body.cantidad ?? item.cantidad
    const precioEstimado = 'precioEstimado' in body ? body.precioEstimado : item.precioEstimado

    const updated = await prisma.solicitudRecursoItem.update({
      where: { id: itemId },
      data: {
        catalogoRecursoId: 'catalogoRecursoId' in body ? body.catalogoRecursoId : item.catalogoRecursoId,
        descripcion: body.descripcion ?? item.descripcion,
        unidad: body.unidad ?? item.unidad,
        cantidad,
        precioEstimado: precioEstimado ?? null,
        totalEstimado: precioEstimado && cantidad ? Number(precioEstimado) * Number(cantidad) : null,
        fechaInicio: 'fechaInicio' in body ? (body.fechaInicio ? new Date(body.fechaInicio) : null) : item.fechaInicio,
        fechaFin: 'fechaFin' in body ? (body.fechaFin ? new Date(body.fechaFin) : null) : item.fechaFin,
        edtId: 'edtId' in body ? body.edtId : item.edtId,
        observaciones: 'observaciones' in body ? body.observaciones : item.observaciones,
      },
      include: {
        catalogoRecurso: { select: { id: true, nombre: true, categoria: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar ítem:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, itemId } = await params
    const solicitud = await prisma.solicitudRecurso.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se pueden eliminar ítems en estado borrador' }, { status: 409 })
    }

    const item = await prisma.solicitudRecursoItem.findUnique({ where: { id: itemId } })
    if (!item || item.solicitudId !== id) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    await prisma.solicitudRecursoItem.delete({ where: { id: itemId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar ítem:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
