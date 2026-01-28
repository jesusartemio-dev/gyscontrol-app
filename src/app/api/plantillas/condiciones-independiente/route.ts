import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const activo = searchParams.get('activo')
    const search = searchParams.get('search')

    const where: any = {}

    if (activo !== null && activo !== undefined) {
      where.activo = activo === 'true'
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ]
    }

    const plantillas = await prisma.plantillaCondicionIndependiente.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(plantillas)
  } catch (error) {
    console.error('Error al obtener plantillas de condiciones:', error)
    return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    if (!data.nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const nueva = await prisma.plantillaCondicionIndependiente.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        activo: data.activo ?? true,
        plantillaCondicionItemIndependiente: data.items?.length > 0 ? {
          create: data.items.map((item: any, index: number) => ({
            catalogoCondicionId: item.catalogoCondicionId,
            descripcion: item.descripcion,
            tipo: item.tipo,
            orden: item.orden ?? index + 1
          }))
        } : undefined
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

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('Error al crear plantilla de condiciones:', error)
    return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 })
  }
}
