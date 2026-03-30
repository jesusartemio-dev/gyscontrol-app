import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const items = await prisma.catalogoRecurso.findMany({
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error al obtener catálogo recursos:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { nombre, categoria, unidad, descripcion, precioCompra, vidaUtilAnios, costoMantAnual } = body

    if (!nombre || !categoria || !unidad) {
      return NextResponse.json({ error: 'nombre, categoria y unidad son requeridos' }, { status: 400 })
    }

    const item = await prisma.catalogoRecurso.create({
      data: {
        nombre,
        categoria,
        unidad,
        descripcion: descripcion || null,
        precioCompra: precioCompra ?? null,
        vidaUtilAnios: vidaUtilAnios ?? null,
        costoMantAnual: costoMantAnual ?? null,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un recurso con ese nombre' }, { status: 409 })
    }
    console.error('Error al crear recurso:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
