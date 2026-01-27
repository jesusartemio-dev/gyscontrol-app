import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// src/app/api/categoria-gasto/[id]/route.ts

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const categoria = await prisma.categoriaGasto.findUnique({
      where: { id },
    })

    if (!categoria) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    return NextResponse.json(categoria)
  } catch (error) {
    console.error('Error al obtener categoría de gasto:', error)
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

    const actualizada = await prisma.categoriaGasto.update({
      where: { id },
      data: {
        nombre,
        descripcion: descripcion || null,
      },
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('Error al actualizar categoría de gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    // Verificar si hay gastos asociados
    const gastosAsociados = await prisma.catalogoGasto.count({
      where: { categoriaId: id },
    })

    if (gastosAsociados > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. Hay ${gastosAsociados} gasto(s) asociado(s) a esta categoría.` },
        { status: 400 }
      )
    }

    await prisma.categoriaGasto.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Categoría eliminada' })
  } catch (error) {
    console.error('Error al eliminar categoría de gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
