import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.tipoBloqueo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tipo de bloqueo no encontrado' }, { status: 404 })
    }

    // Check unique name if changed
    if (body.nombre && body.nombre.trim() !== existing.nombre) {
      const duplicate = await prisma.tipoBloqueo.findUnique({
        where: { nombre: body.nombre.trim() }
      })
      if (duplicate) {
        return NextResponse.json(
          { message: 'Ya existe un tipo de bloqueo con ese nombre' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim()
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion?.trim() || null
    if (body.activo !== undefined) updateData.activo = body.activo
    if (body.orden !== undefined) updateData.orden = body.orden

    const data = await prisma.tipoBloqueo.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar tipo de bloqueo:', error)
    return NextResponse.json({ error: 'Error al actualizar tipo de bloqueo' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const existing = await prisma.tipoBloqueo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tipo de bloqueo no encontrado' }, { status: 404 })
    }

    await prisma.tipoBloqueo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error al eliminar tipo de bloqueo:', error)
    return NextResponse.json({ error: 'Error al eliminar tipo de bloqueo' }, { status: 500 })
  }
}
