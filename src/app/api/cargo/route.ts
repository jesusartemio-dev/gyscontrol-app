import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await prisma.cargo.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { empleados: true }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /cargo:', error)
    return NextResponse.json({ error: 'Error al listar cargos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Verificar si ya existe un cargo con ese nombre
    const existente = await prisma.cargo.findUnique({
      where: { nombre: body.nombre }
    })

    if (existente) {
      return NextResponse.json(
        { message: 'Ya existe un cargo con ese nombre' },
        { status: 400 }
      )
    }

    const data = await prisma.cargo.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        sueldoBase: body.sueldoBase ? parseFloat(body.sueldoBase) : null,
        activo: body.activo ?? true,
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /cargo:', error)
    return NextResponse.json({ error: 'Error al crear cargo' }, { status: 500 })
  }
}
