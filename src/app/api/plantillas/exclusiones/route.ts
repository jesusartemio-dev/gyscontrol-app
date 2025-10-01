/**
 * 📋 API Plantillas de Exclusiones
 *
 * Endpoints para gestión completa de plantillas de exclusiones.
 * Permite crear, listar, actualizar y eliminar plantillas reutilizables.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { plantillasExclusiones, savePlantillasExclusiones } from '@/lib/temp-plantillas-storage'

// ===================================================
// 📋 GET /api/plantillas/exclusiones
// ===================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')
    const activo = searchParams.get('activo') !== 'false' // Default true

    // Usar el array en memoria que se actualiza con las operaciones CRUD
    const plantillas = plantillasExclusiones

    logger.info(`📋 Plantillas de exclusiones obtenidas: ${plantillas.length}`)

    return NextResponse.json({
      success: true,
      data: plantillas,
      meta: {
        total: plantillas.length,
        categorias: [...new Set(plantillas.map(p => p.categoria).filter(Boolean))]
      }
    })

  } catch (error) {
    logger.error('❌ Error al obtener plantillas de exclusiones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// ➕ POST /api/plantillas/exclusiones
// ===================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await request.json()

    // Validación básica
    if (!data.nombre || !data.items || !Array.isArray(data.items)) {
      return NextResponse.json(
        { error: 'Nombre e items son requeridos' },
        { status: 400 }
      )
    }

    // Crear plantilla temporal (hasta que se regenere Prisma)
    const nuevaPlantilla = {
      id: `plantilla-${Date.now()}`,
      nombre: data.nombre,
      descripcion: data.descripcion,
      categoria: data.categoria,
      orden: data.orden || 0,
      activo: data.activo !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items.map((item: any, index: number) => ({
        id: `item-${Date.now()}-${index}`,
        descripcion: item.descripcion,
        orden: item.orden || index,
        activo: item.activo !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      _count: { items: data.items.length }
    }

    // Agregar a la lista en memoria
    plantillasExclusiones.push(nuevaPlantilla)
    savePlantillasExclusiones()

    logger.info(`✅ Plantilla de exclusiones creada: ${nuevaPlantilla.id}`)

    return NextResponse.json({
      success: true,
      data: nuevaPlantilla,
      message: 'Plantilla de exclusiones creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    logger.error('❌ Error al crear plantilla de exclusiones:', error)

    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
