// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantillas/servicios/[id]
// 🔧 Descripción: API para gestionar plantilla de servicios independiente específica
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
    console.log('📋 GET plantilla - id:', id)

    const plantilla = await prisma.plantillaServicioIndependiente.findUnique({
      where: { id },
      include: {
        edt: true,
        plantillaServicioItemIndependiente: {
          include: {
            catalogoServicio: true,
            edt: true,
            recurso: true,
            unidadServicio: true
          },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { plantillaServicioItemIndependiente: true }
        }
      }
    })

    console.log('📋 Items encontrados:', plantilla?.plantillaServicioItemIndependiente?.length || 0)
    console.log('📋 Items IDs:', plantilla?.plantillaServicioItemIndependiente?.map(i => i.id))

    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(plantilla)
  } catch (error) {
    console.error('❌ Error al obtener plantilla de servicios:', error)
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

    const { nombre, descripcion, edtId } = data

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
      return NextResponse.json(
        { error: 'Nombre es requerido y debe tener al menos 3 caracteres' },
        { status: 400 }
      )
    }

    const plantillaActualizada = await prisma.plantillaServicioIndependiente.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        edtId: edtId || null,
        updatedAt: new Date()
      },
      include: {
        edt: true,
        plantillaServicioItemIndependiente: {
          include: {
            catalogoServicio: true,
            edt: true,
            recurso: true,
            unidadServicio: true
          },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { plantillaServicioItemIndependiente: true }
        }
      }
    })

    return NextResponse.json(plantillaActualizada)
  } catch (error) {
    console.error('❌ Error al actualizar plantilla de servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}