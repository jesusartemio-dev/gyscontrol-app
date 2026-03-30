import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.catalogoRecurso.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
    }

    const updated = await prisma.catalogoRecurso.update({
      where: { id },
      data: {
        nombre: body.nombre ?? existing.nombre,
        categoria: body.categoria ?? existing.categoria,
        unidad: body.unidad ?? existing.unidad,
        descripcion: 'descripcion' in body ? body.descripcion : existing.descripcion,
        precioCompra: 'precioCompra' in body ? body.precioCompra : existing.precioCompra,
        vidaUtilAnios: 'vidaUtilAnios' in body ? body.vidaUtilAnios : existing.vidaUtilAnios,
        costoMantAnual: 'costoMantAnual' in body ? body.costoMantAnual : existing.costoMantAnual,
        activo: 'activo' in body ? body.activo : existing.activo,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un recurso con ese nombre' }, { status: 409 })
    }
    console.error('Error al actualizar recurso:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.catalogoRecurso.findUnique({
      where: { id },
      include: { items: { select: { id: true }, take: 1 } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
    }
    if (existing.items.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: tiene solicitudes asociadas' },
        { status: 409 }
      )
    }

    await prisma.catalogoRecurso.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar recurso:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
