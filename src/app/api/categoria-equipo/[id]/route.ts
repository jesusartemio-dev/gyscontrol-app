import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    await prisma.categoriaEquipo.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Categoría eliminada' })
  } catch (error) {
    console.error('❌ Error al eliminar categoría de equipo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const body = await req.json()
    const { nombre, descripcion } = body

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
    }

    const actualizada = await prisma.categoriaEquipo.update({
      where: { id },
      data: {
        nombre,
        descripcion: descripcion || null
      } as any,
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('❌ Error al actualizar categoría de equipo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
