import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plantilla = await prisma.plantillaCondicionIndependiente.findUnique({
      where: { id },
      include: {
        plantillaCondicionItemIndependiente: {
          include: {
            catalogoCondicion: {
              include: { categoria: true }
            }
          },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { plantillaCondicionItemIndependiente: true }
        }
      }
    })

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    return NextResponse.json(plantilla)
  } catch (error) {
    console.error('Error al obtener plantilla:', error)
    return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()

    const existente = await prisma.plantillaCondicionIndependiente.findUnique({
      where: { id }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Actualizar items si se proporcionan
    if (data.items !== undefined) {
      await prisma.plantillaCondicionItemIndependiente.deleteMany({
        where: { plantillaCondicionId: id }
      })

      if (data.items.length > 0) {
        await prisma.plantillaCondicionItemIndependiente.createMany({
          data: data.items.map((item: any, index: number) => ({
            plantillaCondicionId: id,
            catalogoCondicionId: item.catalogoCondicionId,
            descripcion: item.descripcion,
            tipo: item.tipo,
            orden: item.orden ?? index + 1
          }))
        })
      }
    }

    const actualizada = await prisma.plantillaCondicionIndependiente.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        activo: data.activo
      },
      include: {
        plantillaCondicionItemIndependiente: {
          include: {
            catalogoCondicion: {
              include: { categoria: true }
            }
          },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { plantillaCondicionItemIndependiente: true }
        }
      }
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('Error al actualizar plantilla:', error)
    return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existente = await prisma.plantillaCondicionIndependiente.findUnique({
      where: { id }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    await prisma.plantillaCondicionIndependiente.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Plantilla eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar plantilla:', error)
    return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 })
  }
}
