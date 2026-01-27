// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/gastos/[id]
// 🔧 Descripción: API para gestionar plantilla de gastos independiente específica
// ✅ GET: Obtener plantilla con sus items
// ✅ PUT: Actualizar plantilla (nombre, descripción, etc.)
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plantilla = await prisma.plantillaGastoIndependiente.findUnique({
      where: { id },
      include: {
        plantillaGastoItemIndependiente: true,
        _count: {
          select: { plantillaGastoItemIndependiente: true }
        }
      }
    })

    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(plantilla)
  } catch (error) {
    console.error('❌ Error al obtener plantilla de gastos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()

    const { nombre, descripcion } = data

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
      return NextResponse.json(
        { error: 'Nombre es requerido y debe tener al menos 3 caracteres' },
        { status: 400 }
      )
    }

    const plantillaActualizada = await prisma.plantillaGastoIndependiente.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        updatedAt: new Date()
      },
      include: {
        plantillaGastoItemIndependiente: true,
        _count: {
          select: { plantillaGastoItemIndependiente: true }
        }
      }
    })

    return NextResponse.json(plantillaActualizada)
  } catch (error) {
    console.error('❌ Error al actualizar plantilla de gastos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}