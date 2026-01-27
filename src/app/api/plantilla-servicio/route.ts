// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantilla-servicio
// 🔧 Descripción: CRUD general para PlantillaServicio
//
// 🧠 Uso: Listar y crear secciones de servicios en una plantilla
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { plantillaServicioSchema } from '@/lib/validators/plantillaServicio'

export async function GET() {
  const servicios = await prisma.plantillaServicio.findMany({
    include: { plantillaServicioItem: true }
  })
  return NextResponse.json(servicios)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // 🔍 Validar datos con Zod
    const validatedData = plantillaServicioSchema.parse(body)
    
    // 📡 Crear registro en base de datos
    const nuevo = await prisma.plantillaServicio.create({
      data: {
        ...validatedData,
        id: `plantilla-servicio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: new Date()
      },
      include: { plantillaServicioItem: true }
    })
    
    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('Error creating PlantillaServicio:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
