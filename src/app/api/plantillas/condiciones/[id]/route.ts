/**
 * 📋 API Plantillas de Condiciones - Individual
 *
 * Endpoints para gestión de plantillas individuales de condiciones.
 * Permite actualizar y eliminar plantillas específicas.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { plantillasCondiciones, savePlantillasExclusiones } from '@/lib/temp-plantillas-storage'

// ===================================================
// ✏️ PUT /api/plantillas/condiciones/[id]
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
    const index = plantillasCondiciones.findIndex(p => p.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Actualizar la plantilla
    const updatedItems = data.items?.map((item: any, idx: number) => ({
      id: plantillasCondiciones[index].items[idx]?.id || `cond-item-${Date.now()}-${idx}`,
      descripcion: item.descripcion,
      tipo: item.tipo || 'comercial',
      orden: item.orden || idx + 1,
      activo: true,
      updatedAt: new Date()
    })) || plantillasCondiciones[index].items

    const plantillaActualizada = {
      ...plantillasCondiciones[index],
      nombre: data.nombre,
      descripcion: data.descripcion,
      categoria: data.categoria,
      tipo: data.tipo,
      orden: data.orden || plantillasCondiciones[index].orden,
      activo: data.activo !== false,
      updatedAt: new Date(),
      items: updatedItems,
      _count: { items: updatedItems.length }
    }

    plantillasCondiciones[index] = plantillaActualizada
    savePlantillasExclusiones()

    logger.info(`✅ Plantilla de condiciones actualizada: ${id}`)

    return NextResponse.json({
      success: true,
      data: plantillaActualizada,
      message: 'Plantilla de condiciones actualizada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar plantilla de condiciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// 🗑️ DELETE /api/plantillas/condiciones/[id]
// ===================================================

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Eliminar de la lista en memoria
    const index = plantillasCondiciones.findIndex(p => p.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    plantillasCondiciones.splice(index, 1)
    savePlantillasExclusiones()

    logger.info(`✅ Plantilla de condiciones eliminada: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Plantilla de condiciones eliminada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al eliminar plantilla de condiciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}