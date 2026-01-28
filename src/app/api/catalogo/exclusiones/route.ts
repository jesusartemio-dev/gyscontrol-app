import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const categoriaId = searchParams.get('categoriaId')
    const activo = searchParams.get('activo')
    const search = searchParams.get('search')

    const where: any = {}

    if (categoriaId) {
      where.categoriaId = categoriaId
    }

    if (activo !== null && activo !== undefined) {
      where.activo = activo === 'true'
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } }
      ]
    }

    const exclusiones = await prisma.catalogoExclusion.findMany({
      where,
      include: {
        categoria: true,
        items: {
          where: { activo: true },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json(exclusiones)
  } catch (error) {
    console.error('Error al obtener catálogo de exclusiones:', error)
    return NextResponse.json({ error: 'Error al obtener exclusiones' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Validación de campos requeridos
    if (!data.nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // Generar código único si no se proporciona
    let codigo = data.codigo
    if (!codigo) {
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      codigo = `EXCL-${timestamp}-${random}`.toUpperCase()
    }

    // Verificar si el código ya existe
    const existente = await prisma.catalogoExclusion.findUnique({
      where: { codigo }
    })

    if (existente) {
      return NextResponse.json({ error: 'Ya existe una exclusión con ese código' }, { status: 400 })
    }

    // Obtener el máximo orden
    const maxOrden = await prisma.catalogoExclusion.aggregate({
      _max: { orden: true }
    })

    // Crear la exclusión con sus items
    const nueva = await prisma.catalogoExclusion.create({
      data: {
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        activo: data.activo ?? true,
        orden: data.orden ?? (maxOrden._max.orden || 0) + 1,
        items: data.items?.length > 0 ? {
          create: data.items.map((item: any, index: number) => ({
            descripcion: item.descripcion,
            orden: item.orden ?? index + 1,
            activo: item.activo ?? true
          }))
        } : undefined
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

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('Error al crear exclusión:', error)
    return NextResponse.json({ error: 'Error al crear exclusión' }, { status: 500 })
  }
}
