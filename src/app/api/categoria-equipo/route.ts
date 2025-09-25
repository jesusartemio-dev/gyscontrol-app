import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// src/app/api/categoria-equipo/route.ts
export async function GET() {
  const categorias = await prisma.categoriaEquipo.findMany({
    select: { id: true, nombre: true, descripcion: true } as any,
    orderBy: { nombre: 'asc' },
  })
  return NextResponse.json(categorias)
}


export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.nombre || typeof body.nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    const nueva = await prisma.categoriaEquipo.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion || null
      } as any
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear categoría de equipo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

