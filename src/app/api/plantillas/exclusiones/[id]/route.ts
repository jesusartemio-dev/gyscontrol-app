/**
 * 📋 API Plantillas de Exclusiones - Individual
 *
 * Endpoints para gestión de plantillas individuales de exclusiones.
 * Permite actualizar y eliminar plantillas específicas.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { plantillasExclusiones, savePlantillasExclusiones } from '@/lib/temp-plantillas-storage'

// ===================================================
// ✏️ PUT /api/plantillas/exclusiones/[id]
// ===================================================

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // Validación básica
    if (!data.nombre) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      )
    }

    // Find and update the plantilla
    console.log('plantillasExclusiones:', plantillasExclusiones)
    const index = plantillasExclusiones.findIndex(p => p.id === id)
    console.log('index:', index, 'id:', id)
    if (index === -1) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Actualizar la plantilla
    const updatedItems = data.items?.map((item: any, idx: number) => ({
      id: plantillasExclusiones[index].items[idx]?.id || `exc-item-${Date.now()}-${idx}`,
      descripcion: item.descripcion,
      orden: item.orden || idx + 1,
      activo: true,
      updatedAt: new Date()
    })) || plantillasExclusiones[index].items

    const plantillaActualizada = {
      ...plantillasExclusiones[index],
      nombre: data.nombre,
      descripcion: data.descripcion,
      categoria: data.categoria,
      orden: data.orden || plantillasExclusiones[index].orden,
      activo: data.activo !== false,
      updatedAt: new Date(),
      items: updatedItems,
      _count: { items: updatedItems.length }
    }

    plantillasExclusiones[index] = plantillaActualizada
    savePlantillasExclusiones()

    logger.info(`✅ Plantilla de exclusiones actualizada: ${id}`)

    return NextResponse.json({
      success: true,
      data: plantillaActualizada,
      message: 'Plantilla de exclusiones actualizada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error al actualizar plantilla de exclusiones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// 🗑️ DELETE /api/plantillas/exclusiones/[id]
// ===================================================

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Eliminar de la lista en memoria
    const index = plantillasExclusiones.findIndex(p => p.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    plantillasExclusiones.splice(index, 1)
    savePlantillasExclusiones()

    logger.info(`✅ Plantilla de exclusiones eliminada: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Plantilla de exclusiones eliminada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al eliminar plantilla de exclusiones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}