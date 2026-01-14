// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/unidad-servicio/
// 🔧 API REST para UnidadServicio (GET - POST)
//
// 🧠 Uso: Se usa para listar y crear unidades de servicio
// 🔗 Relaciones incluidas: servicios, plantillaServicioItems
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ✅ GET: Listar todas las unidades
export async function GET() {
  try {
    const unidades = await prisma.unidadServicio.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        catalogoServicio: true,
        plantillaServicioItem: true,
        cotizacionServicioItem: true
      }
    })

    return NextResponse.json(unidades)
  } catch (error) {
    console.error('❌ Error en GET /unidad-servicio:', error)
    return NextResponse.json(
      { error: 'Error al obtener unidades de servicio' },
      { status: 500 }
    )
  }
}

// ✅ POST: Crear nueva unidad de servicio
export async function POST(req: Request) {
  try {
    const { nombre } = await req.json()

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json(
        { error: 'El campo nombre es obligatorio y debe ser texto' },
        { status: 400 }
      )
    }

    const creada = await prisma.unidadServicio.create({
      data: { nombre }
    })

    return NextResponse.json(creada, { status: 201 })
  } catch (error) {
    console.error('❌ Error en POST /unidad-servicio:', error)
    return NextResponse.json(
      { error: 'Error al crear unidad de servicio' },
      { status: 500 }
    )
  }
}
