import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await prisma.departamento.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        responsable: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: { cargos: true }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /departamento:', error)
    return NextResponse.json({ error: 'Error al listar departamentos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Verificar si ya existe un departamento con ese nombre
    const existente = await prisma.departamento.findUnique({
      where: { nombre: body.nombre }
    })

    if (existente) {
      return NextResponse.json(
        { message: 'Ya existe un departamento con ese nombre' },
        { status: 400 }
      )
    }

    const data = await prisma.departamento.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        responsableId: body.responsableId || null,
        activo: body.activo ?? true,
      },
      include: {
        responsable: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /departamento:', error)
    return NextResponse.json({ error: 'Error al crear departamento' }, { status: 500 })
  }
}
