/**
 * 📋 API Importar Condiciones desde Plantilla
 *
 * Permite importar una plantilla de condiciones a una cotización específica.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { plantillasCondiciones } from '@/lib/temp-plantillas-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { plantillaId, modo = 'replace', itemsSeleccionados } = await request.json()

    // Validar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Usar las plantillas dinámicas del almacenamiento temporal
    const plantillas = plantillasCondiciones

    const plantilla = plantillas.find(p => p.id === plantillaId)
    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Si modo es 'replace', eliminar condiciones existentes
    if (modo === 'replace') {
      await prisma.cotizacionCondicion.deleteMany({
        where: { cotizacionId: id }
      })
    }

    // Obtener el orden máximo actual
    const maxOrden = await prisma.cotizacionCondicion.findFirst({
      where: { cotizacionId: id },
      orderBy: { orden: 'desc' },
      select: { orden: true }
    })

    const nextOrden = (maxOrden?.orden || 0) + 1

    // Filtrar items seleccionados si se especificaron
    const itemsAFiltrar = itemsSeleccionados && Array.isArray(itemsSeleccionados) && itemsSeleccionados.length > 0
      ? plantilla.items.filter((item, index) => itemsSeleccionados.includes(index))
      : plantilla.items

    // Crear nuevas condiciones desde la plantilla
    const nuevasCondiciones = itemsAFiltrar.map((item, index) => ({
      id: `cot-cond-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      cotizacionId: id,
      descripcion: item.descripcion,
      tipo: item.tipo,
      orden: nextOrden + index,
      updatedAt: new Date()
    }))

    const condicionesCreadas = await prisma.cotizacionCondicion.createMany({
      data: nuevasCondiciones
    })

    logger.info(`✅ Importadas ${condicionesCreadas.count} condiciones desde plantilla ${plantillaId} a cotización ${id}`)

    // Obtener las condiciones creadas para devolver
    const condiciones = await prisma.cotizacionCondicion.findMany({
      where: { cotizacionId: id },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: condiciones,
      message: `Se importaron ${condicionesCreadas.count} condiciones desde la plantilla "${plantilla.nombre}"`,
      meta: {
        plantilla: plantilla.nombre,
        modo,
        importadas: condicionesCreadas.count
      }
    })

  } catch (error) {
    logger.error('❌ Error al importar condiciones desde plantilla:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}