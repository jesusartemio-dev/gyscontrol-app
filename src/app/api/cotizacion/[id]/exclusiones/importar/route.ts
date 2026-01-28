/**
 * API Importar Exclusiones desde Catálogo
 *
 * Permite importar exclusiones desde el catálogo a una cotización específica.
 *
 * @author GYS Team
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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
    const { catalogoId, modo = 'replace', itemsSeleccionados } = await request.json()

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

    // Obtener la exclusión del catálogo con sus items
    const catalogoExclusion = await prisma.catalogoExclusion.findUnique({
      where: { id: catalogoId },
      include: {
        items: {
          where: { activo: true },
          orderBy: { orden: 'asc' }
        }
      }
    })

    if (!catalogoExclusion) {
      return NextResponse.json(
        { error: 'Exclusión no encontrada en el catálogo' },
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
      ? catalogoExclusion.items.filter((_, index) => itemsSeleccionados.includes(index))
      : catalogoExclusion.items

    if (itemsAFiltrar.length === 0) {
      return NextResponse.json(
        { error: 'No hay items para importar' },
        { status: 400 }
      )
    }

    // Check for existing exclusions with same description (for append mode)
    let filteredItems = itemsAFiltrar
    if (modo === 'append') {
      const existingDescriptions = await prisma.cotizacionExclusion.findMany({
        where: {
          cotizacionId: id,
          descripcion: {
            in: itemsAFiltrar.map(item => item.descripcion)
          }
        },
        select: { descripcion: true }
      })

      const existingDescSet = new Set(existingDescriptions.map(e => e.descripcion))
      filteredItems = itemsAFiltrar.filter(item => !existingDescSet.has(item.descripcion))

      if (filteredItems.length === 0) {
        return NextResponse.json(
          { error: 'Todos los items ya están importados' },
          { status: 400 }
        )
      }
    }

    // Crear nuevas exclusiones desde el catálogo
    const nuevasExclusiones = filteredItems.map((item, index) => ({
      id: `cot-excl-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      cotizacionId: id,
      descripcion: item.descripcion,
      orden: nextOrden + index,
      catalogoExclusionItemId: item.id,
      updatedAt: new Date()
    }))

    const exclusionesCreadas = await prisma.cotizacionExclusion.createMany({
      data: nuevasExclusiones
    })

    logger.info(`Importadas ${exclusionesCreadas.count} exclusiones desde catálogo ${catalogoId} a cotización ${id}`)

    // Obtener las exclusiones creadas para devolver
    const exclusiones = await prisma.cotizacionExclusion.findMany({
      where: { cotizacionId: id },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: exclusiones,
      message: `Se importaron ${exclusionesCreadas.count} exclusiones desde "${catalogoExclusion.nombre}"`,
      meta: {
        catalogo: catalogoExclusion.nombre,
        modo,
        importadas: exclusionesCreadas.count
      }
    })

  } catch (error) {
    logger.error('Error al importar exclusiones desde catálogo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
