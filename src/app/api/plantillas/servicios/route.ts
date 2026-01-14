// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/servicios
// 🔧 Descripción: API para plantillas de servicios independientes
// ✅ GET: Obtener todas las plantillas de servicios
// ✅ POST: Crear nueva plantilla de servicios
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ✅ Obtener todas las plantillas de servicios independientes
export async function GET() {
  try {
    const plantillas = await prisma.plantillaServicioIndependiente.findMany({
      include: {
        plantillaServicioItemIndependiente: {
          include: {
            catalogoServicio: true,
            recurso: true,
            unidadServicio: true
          },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { plantillaServicioItemIndependiente: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plantillas)
  } catch (error) {
    console.error('❌ Error al obtener plantillas de servicios:', error)
    return NextResponse.json(
      { error: 'Error al obtener plantillas de servicios' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva plantilla de servicios independiente
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { nombre, descripcion, categoria } = data

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    const nueva = await prisma.plantillaServicioIndependiente.create({
      data: {
        id: randomUUID(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        categoria: categoria || 'General',
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0,
        descuento: 0,
        grandTotal: 0,
        updatedAt: new Date(),
      },
      include: {
        plantillaServicioItemIndependiente: true,
        _count: {
          select: { plantillaServicioItemIndependiente: true }
        }
      }
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear plantilla de servicios:', error)
    return NextResponse.json({ error: 'Error al crear plantilla de servicios' }, { status: 500 })
  }
}
