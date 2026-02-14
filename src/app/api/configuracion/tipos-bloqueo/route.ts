import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await prisma.tipoBloqueo.findMany({
      orderBy: { orden: 'asc' }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /tipos-bloqueo:', error)
    return NextResponse.json({ error: 'Error al listar tipos de bloqueo' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.nombre?.trim()) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 })
    }

    const existente = await prisma.tipoBloqueo.findUnique({
      where: { nombre: body.nombre.trim() }
    })

    if (existente) {
      return NextResponse.json(
        { message: 'Ya existe un tipo de bloqueo con ese nombre' },
        { status: 400 }
      )
    }

    // Obtener el siguiente orden
    const maxOrden = await prisma.tipoBloqueo.aggregate({ _max: { orden: true } })
    const siguienteOrden = (maxOrden._max.orden ?? 0) + 1

    const data = await prisma.tipoBloqueo.create({
      data: {
        nombre: body.nombre.trim(),
        descripcion: body.descripcion?.trim() || null,
        activo: body.activo ?? true,
        orden: body.orden ?? siguienteOrden
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /tipos-bloqueo:', error)
    return NextResponse.json({ error: 'Error al crear tipo de bloqueo' }, { status: 500 })
  }
}
