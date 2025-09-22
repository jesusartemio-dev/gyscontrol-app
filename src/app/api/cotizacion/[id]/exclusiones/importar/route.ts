/**
 * 📋 API Importar Exclusiones desde Plantilla
 *
 * Permite importar una plantilla de exclusiones a una cotización específica.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { plantillasExclusiones } from '@/lib/temp-plantillas-storage'

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
    const plantillas = plantillasExclusiones

    const plantilla = plantillas.find(p => p.id === plantillaId)
    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Si modo es 'replace', eliminar exclusiones existentes
    if (modo === 'replace') {
      await prisma.cotizacionExclusion.deleteMany({
        where: { cotizacionId: id }
      })
    }

    // Obtener el orden máximo actual
    const maxOrden = await prisma.cotizacionExclusion.findFirst({
      where: { cotizacionId: id },
      orderBy: { orden: 'desc' },
      select: { orden: true }
    })

    const nextOrden = (maxOrden?.orden || 0) + 1

    // Filtrar items seleccionados si se especificaron
    const itemsAFiltrar = itemsSeleccionados && Array.isArray(itemsSeleccionados) && itemsSeleccionados.length > 0
      ? plantilla.items.filter((item, index) => itemsSeleccionados.includes(index))
      : plantilla.items

    // Crear nuevas exclusiones desde la plantilla
    const nuevasExclusiones = itemsAFiltrar.map((item, index) => ({
      cotizacionId: id,
      descripcion: item.descripcion,
      orden: nextOrden + index
    }))

    if (nuevasExclusiones.length === 0) {
      return NextResponse.json(
        { error: 'No hay items para importar' },
        { status: 400 }
      )
    }

    // Check for existing exclusions with same description
    const existingDescriptions = await prisma.cotizacionExclusion.findMany({
      where: {
        cotizacionId: id,
        descripcion: {
          in: nuevasExclusiones.map(e => e.descripcion)
        }
      },
      select: { descripcion: true }
    })

    const existingDescSet = new Set(existingDescriptions.map(e => e.descripcion))
    const filteredExclusiones = nuevasExclusiones.filter(e => !existingDescSet.has(e.descripcion))

    if (filteredExclusiones.length === 0) {
      return NextResponse.json(
        { error: 'Todos los items ya están importados' },
        { status: 400 }
      )
    }

    const exclusionesCreadas = await prisma.cotizacionExclusion.createMany({
      data: filteredExclusiones
    })

    logger.info(`✅ Importadas ${exclusionesCreadas.count} exclusiones desde plantilla ${plantillaId} a cotización ${id}`)

    // Obtener las exclusiones creadas para devolver
    const exclusiones = await prisma.cotizacionExclusion.findMany({
      where: { cotizacionId: id },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: exclusiones,
      message: `Se importaron ${exclusionesCreadas.count} exclusiones desde la plantilla "${plantilla.nombre}"`,
      meta: {
        plantilla: plantilla.nombre,
        modo,
        importadas: exclusionesCreadas.count
      }
    })

  } catch (error) {
    logger.error('❌ Error al importar exclusiones desde plantilla:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}