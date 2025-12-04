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

    const plantilla = await prisma.plantillaServicioIndependiente.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            catalogoServicio: true,
            recurso: true,
            unidadServicio: true
          },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      }
    })

    if (plantilla) {
      // Get categoria name if categoria is an ID
      let categoriaNombre = plantilla.categoria
      if (plantilla.categoria) {
        const categoriaServicio = await prisma.edt.findUnique({
          where: { id: plantilla.categoria }
        })
        if (categoriaServicio) {
          categoriaNombre = categoriaServicio.nombre
        }
      }

      return NextResponse.json({
        ...plantilla,
        categoriaNombre
      })
    }

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

    const { nombre, descripcion } = data

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
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            catalogoServicio: true,
            recurso: true,
            unidadServicio: true
          },
          orderBy: { orden: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      }
    })

    // Get categoria name for the updated plantilla
    let categoriaNombre = plantillaActualizada.categoria
    if (plantillaActualizada.categoria) {
      const categoriaServicio = await prisma.edt.findUnique({
        where: { id: plantillaActualizada.categoria }
      })
      if (categoriaServicio) {
        categoriaNombre = categoriaServicio.nombre
      }
    }

    return NextResponse.json({
      ...plantillaActualizada,
      categoriaNombre
    })
  } catch (error) {
    console.error('❌ Error al actualizar plantilla de servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}