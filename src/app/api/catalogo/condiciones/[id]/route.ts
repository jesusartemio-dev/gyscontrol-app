import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const condicion = await prisma.catalogoCondicion.findUnique({
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

    if (!condicion) {
      return NextResponse.json({ error: 'Condición no encontrada' }, { status: 404 })
    }

    return NextResponse.json(condicion)
  } catch (error) {
    console.error('Error al obtener condición:', error)
    return NextResponse.json({ error: 'Error al obtener condición' }, { status: 500 })
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
    const existente = await prisma.catalogoCondicion.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Condición no encontrada' }, { status: 404 })
    }

    // Si se cambia el código, verificar que no exista otro con ese código
    if (data.codigo && data.codigo !== existente.codigo) {
      const codigoExistente = await prisma.catalogoCondicion.findUnique({
        where: { codigo: data.codigo }
      })
      if (codigoExistente) {
        return NextResponse.json({ error: 'Ya existe una condición con ese código' }, { status: 400 })
      }
    }

    // Actualizar items si se proporcionan
    if (data.items !== undefined) {
      // Eliminar items existentes
      await prisma.catalogoCondicionItem.deleteMany({
        where: { catalogoCondicionId: id }
      })

      // Crear nuevos items
      if (data.items.length > 0) {
        await prisma.catalogoCondicionItem.createMany({
          data: data.items.map((item: any, index: number) => ({
            catalogoCondicionId: id,
            descripcion: item.descripcion,
            tipo: item.tipo,
            orden: item.orden ?? index + 1,
            activo: item.activo ?? true
          }))
        })
      }
    }

    // Actualizar la condición
    const actualizada = await prisma.catalogoCondicion.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        tipo: data.tipo,
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
    console.error('Error al actualizar condición:', error)
    return NextResponse.json({ error: 'Error al actualizar condición' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar que existe
    const existente = await prisma.catalogoCondicion.findUnique({
      where: { id }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Condición no encontrada' }, { status: 404 })
    }

    // Eliminar (los items se eliminan en cascada)
    await prisma.catalogoCondicion.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Condición eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar condición:', error)
    return NextResponse.json({ error: 'Error al eliminar condición' }, { status: 500 })
  }
}
