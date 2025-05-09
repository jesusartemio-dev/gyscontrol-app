// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantilla
// 🔧 Descripción: Obtener o crear plantillas con sus relaciones
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ✅ Obtener todas las plantillas con sus relaciones
export async function GET() {
  try {
    const plantillas = await prisma.plantilla.findMany({
      include: {
        equipos: {
          include: {
            items: true, // Incluye ítems de cada grupo de equipo
          },
        },
        servicios: {
          include: {
            items: true, // Incluye ítems de cada grupo de servicio
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plantillas)
  } catch (error) {
    console.error('❌ Error al obtener plantillas:', error)
    return NextResponse.json(
      { error: 'Error al obtener plantillas' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva plantilla
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { nombre } = data

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    const nueva = await prisma.plantilla.create({
      data: {
        nombre,
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0,
      },
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear plantilla:', error)
    return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 })
  }
}
