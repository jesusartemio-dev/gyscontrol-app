// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/gastos
// 🔧 Descripción: API para plantillas de gastos independientes
// ✅ GET: Obtener todas las plantillas de gastos
// ✅ POST: Crear nueva plantilla de gastos
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ✅ Obtener todas las plantillas de gastos independientes
export async function GET() {
  try {
    const plantillas = await prisma.plantillaGastoIndependiente.findMany({
      include: {
        plantillaGastoItemIndependiente: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { plantillaGastoItemIndependiente: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plantillas)
  } catch (error) {
    console.error('❌ Error al obtener plantillas de gastos:', error)
    return NextResponse.json(
      { error: 'Error al obtener plantillas de gastos' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva plantilla de gastos independiente
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { nombre, descripcion } = data

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    const nueva = await prisma.plantillaGastoIndependiente.create({
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
        plantillaGastoItemIndependiente: true,
        _count: {
          select: { plantillaGastoItemIndependiente: true }
        }
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear plantilla de gastos:', error)
    return NextResponse.json({ error: 'Error al crear plantilla de gastos' }, { status: 500 })
  }
}
