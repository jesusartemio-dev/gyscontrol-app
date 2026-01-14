// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/equipos
// 🔧 Descripción: API para plantillas de equipos independientes
// ✅ GET: Obtener todas las plantillas de equipos
// ✅ POST: Crear nueva plantilla de equipos
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ✅ Obtener todas las plantillas de equipos independientes
export async function GET() {
  try {
    const plantillas = await prisma.plantillaEquipoIndependiente.findMany({
      include: {
        plantillaEquipoItemIndependiente: {
          include: {
            catalogoEquipo: true
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { plantillaEquipoItemIndependiente: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plantillas)
  } catch (error) {
    console.error('❌ Error al obtener plantillas de equipos:', error)
    return NextResponse.json(
      { error: 'Error al obtener plantillas de equipos' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva plantilla de equipos independiente
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { nombre, descripcion } = data

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    const nueva = await prisma.plantillaEquipoIndependiente.create({
      data: {
        id: randomUUID(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0,
        descuento: 0,
        grandTotal: 0,
        updatedAt: new Date(),
      },
      include: {
        plantillaEquipoItemIndependiente: true,
        _count: {
          select: { plantillaEquipoItemIndependiente: true }
        }
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear plantilla de equipos:', error)
    return NextResponse.json({ error: 'Error al crear plantilla de equipos' }, { status: 500 })
  }
}
