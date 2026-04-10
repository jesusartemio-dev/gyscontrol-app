import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { createId } from '@paralleldrive/cuid2'

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
    console.log('🔹 Creating categoria equipo with data:', body)

    if (!body.nombre || typeof body.nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    const nombreTrimmed = body.nombre.trim().toUpperCase()
    
    if (nombreTrimmed.length === 0) {
      return NextResponse.json({ error: 'Nombre no puede estar vacío' }, { status: 400 })
    }

    // Verificar si ya existe
    const existente = await prisma.categoriaEquipo.findUnique({
      where: { nombre: nombreTrimmed }
    })

    if (existente) {
      console.log('⚠️ Categoria already exists:', existente)
      return NextResponse.json(existente, { status: 200 }) // Retornar la existente
    }

    const nueva = await prisma.categoriaEquipo.create({
      data: {
        id: createId(),
        nombre: nombreTrimmed,
        descripcion: body.descripcion?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log('✅ Categoria equipo created:', nueva)
    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear categoría de equipo:', error)
    
    // Manejo específico de errores de Prisma
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Error al crear categoría: ${error.message}` }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

