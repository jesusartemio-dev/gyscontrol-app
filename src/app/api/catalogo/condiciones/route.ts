import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const categoriaId = searchParams.get('categoriaId')
    const activo = searchParams.get('activo')
    const tipo = searchParams.get('tipo')
    const search = searchParams.get('search')

    const where: any = {}

    if (categoriaId) {
      where.categoriaId = categoriaId
    }

    if (activo !== null && activo !== undefined) {
      where.activo = activo === 'true'
    }

    if (tipo) {
      where.tipo = tipo
    }

    if (search) {
      where.OR = [
        { descripcion: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } }
      ]
    }

    const condiciones = await prisma.catalogoCondicion.findMany({
      where,
      include: {
        categoria: true
      },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json(condiciones)
  } catch (error) {
    console.error('Error al obtener catálogo de condiciones:', error)
    return NextResponse.json({ error: 'Error al obtener condiciones' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Validación de campos requeridos
    if (!data.descripcion) {
      return NextResponse.json({ error: 'La descripción es obligatoria' }, { status: 400 })
    }

    // Generar código único si no se proporciona
    let codigo = data.codigo
    if (!codigo) {
      const count = await prisma.catalogoCondicion.count()
      codigo = `COND-${String(count + 1).padStart(4, '0')}`
    }

    // Verificar si el código ya existe
    const existente = await prisma.catalogoCondicion.findUnique({
      where: { codigo }
    })

    if (existente) {
      return NextResponse.json({ error: 'Ya existe una condición con ese código' }, { status: 400 })
    }

    // Obtener el máximo orden
    const maxOrden = await prisma.catalogoCondicion.aggregate({
      _max: { orden: true }
    })

    // Crear la condición
    const nueva = await prisma.catalogoCondicion.create({
      data: {
        codigo,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        tipo: data.tipo,
        activo: data.activo ?? true,
        orden: data.orden ?? (maxOrden._max.orden || 0) + 1
      },
      include: {
        categoria: true
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('Error al crear condición:', error)
    return NextResponse.json({ error: 'Error al crear condición' }, { status: 500 })
  }
}
