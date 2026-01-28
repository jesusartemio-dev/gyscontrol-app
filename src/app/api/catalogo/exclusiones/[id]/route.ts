import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const exclusion = await prisma.catalogoExclusion.findUnique({
      where: { id },
      include: {
        categoria: true,
        items: {
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      }
    })

    if (!exclusion) {
      return NextResponse.json({ error: 'Exclusión no encontrada' }, { status: 404 })
    }

    return NextResponse.json(exclusion)
  } catch (error) {
    console.error('Error al obtener exclusión:', error)
    return NextResponse.json({ error: 'Error al obtener exclusión' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()

    // Verificar que existe
    const existente = await prisma.catalogoExclusion.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Exclusión no encontrada' }, { status: 404 })
    }

    // Si se cambia el código, verificar que no exista otro con ese código
    if (data.codigo && data.codigo !== existente.codigo) {
      const codigoExistente = await prisma.catalogoExclusion.findUnique({
        where: { codigo: data.codigo }
      })
      if (codigoExistente) {
        return NextResponse.json({ error: 'Ya existe una exclusión con ese código' }, { status: 400 })
      }
    }

    // Actualizar items si se proporcionan
    if (data.items !== undefined) {
      // Eliminar items existentes
      await prisma.catalogoExclusionItem.deleteMany({
        where: { catalogoExclusionId: id }
      })

      // Crear nuevos items
      if (data.items.length > 0) {
        await prisma.catalogoExclusionItem.createMany({
          data: data.items.map((item: any, index: number) => ({
            catalogoExclusionId: id,
            descripcion: item.descripcion,
            orden: item.orden ?? index + 1,
            activo: item.activo ?? true
          }))
        })
      }
    }

    // Actualizar la exclusión
    const actualizada = await prisma.catalogoExclusion.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        activo: data.activo,
        orden: data.orden
      },
      include: {
        categoria: true,
        items: {
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      }
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('Error al actualizar exclusión:', error)
    return NextResponse.json({ error: 'Error al actualizar exclusión' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar que existe
    const existente = await prisma.catalogoExclusion.findUnique({
      where: { id }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Exclusión no encontrada' }, { status: 404 })
    }

    // Eliminar (los items se eliminan en cascada)
    await prisma.catalogoExclusion.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Exclusión eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar exclusión:', error)
    return NextResponse.json({ error: 'Error al eliminar exclusión' }, { status: 500 })
  }
}
