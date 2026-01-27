import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// src/app/api/categoria-gasto/route.ts

export async function GET() {
  try {
    const categorias = await prisma.categoriaGasto.findMany({
      orderBy: { nombre: 'asc' },
    })
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Error al obtener categorías de gasto:', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.nombre || typeof body.nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    const nombreTrimmed = body.nombre.trim()

    if (nombreTrimmed.length === 0) {
      return NextResponse.json({ error: 'Nombre no puede estar vacío' }, { status: 400 })
    }

    // Verificar si ya existe
    const existente = await prisma.categoriaGasto.findUnique({
      where: { nombre: nombreTrimmed }
    })

    if (existente) {
      return NextResponse.json(existente, { status: 200 })
    }

    const nueva = await prisma.categoriaGasto.create({
      data: {
        nombre: nombreTrimmed,
        descripcion: body.descripcion?.trim() || null,
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('Error al crear categoría de gasto:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Error al crear categoría: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
