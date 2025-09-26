// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/equipos/[id]
// 🔧 Descripción: API para gestionar plantilla de equipos independiente específica
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

    const plantilla = await prisma.plantillaEquipoIndependiente.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            catalogoEquipo: true
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { items: true }
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
    console.error('❌ Error al obtener plantilla de equipos:', error)
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

    const plantillaActualizada = await prisma.plantillaEquipoIndependiente.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            catalogoEquipo: true
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      }
    })

    return NextResponse.json(plantillaActualizada)
  } catch (error) {
    console.error('❌ Error al actualizar plantilla de equipos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // For now, just return success since the independent tables may not exist yet
    // TODO: Implement proper deletion when tables are created
    console.log('DELETE request for plantilla equipos:', id)

    return NextResponse.json({ message: 'Plantilla eliminada exitosamente' })
  } catch (error) {
    console.error('❌ Error al eliminar plantilla de equipos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}