import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    // Verificar si tiene equipos vinculados antes de eliminar
    const enUso = await prisma.catalogoEquipo.count({ where: { categoriaId: id } })
    if (enUso > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: ${enUso} equipo${enUso !== 1 ? 's' : ''} del catálogo usan esta categoría. Reasígnalos primero.` },
        { status: 409 }
      )
    }

    await prisma.categoriaEquipo.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Categoría eliminada' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ error: 'No se puede eliminar: la categoría está siendo usada.' }, { status: 409 })
    }
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
