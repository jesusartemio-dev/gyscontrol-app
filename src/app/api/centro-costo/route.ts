import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo')
    const activo = searchParams.get('activo')

    const where: any = {}
    if (tipo) where.tipo = tipo
    if (activo !== null && activo !== undefined) where.activo = activo === 'true'

    const data = await prisma.centroCosto.findMany({
      where,
      include: {
        proyecto: { select: { id: true, nombre: true, codigo: true } },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener centros de costo:', error)
    return NextResponse.json({ error: 'Error al obtener centros de costo' }, { status: 500 })
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

    const payload = await req.json()

    if (!payload.nombre?.trim() || !payload.tipo) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 })
    }

    const data = await prisma.centroCosto.create({
      data: {
        nombre: payload.nombre.trim(),
        tipo: payload.tipo,
        descripcion: payload.descripcion || null,
        activo: payload.activo !== false,
        proyectoId: payload.proyectoId || null,
        updatedAt: new Date(),
      },
      include: {
        proyecto: { select: { id: true, nombre: true, codigo: true } },
      },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un centro de costo con ese nombre' }, { status: 409 })
    }
    console.error('Error al crear centro de costo:', error)
    return NextResponse.json({ error: 'Error al crear centro de costo' }, { status: 500 })
  }
}
