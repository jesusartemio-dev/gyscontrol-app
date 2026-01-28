import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const categorias = await prisma.categoriaCondicion.findMany({
      orderBy: { orden: 'asc' },
      include: {
        _count: {
          select: { catalogoCondiciones: true }
        }
      }
    })

    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Error al obtener categorías de condiciones:', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    if (!data.nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // Verificar si ya existe
    const existente = await prisma.categoriaCondicion.findUnique({
      where: { nombre: data.nombre }
    })

    if (existente) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 400 })
    }

    // Obtener el máximo orden
    const maxOrden = await prisma.categoriaCondicion.aggregate({
      _max: { orden: true }
    })

    const nueva = await prisma.categoriaCondicion.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        orden: (maxOrden._max.orden || 0) + 1,
        activo: data.activo ?? true
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('Error al crear categoría de condiciones:', error)
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 })
  }
}
