/**
 * API Importar Condiciones desde Catálogo
 *
 * Permite importar condiciones desde el catálogo a una cotización específica.
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

    // Obtener la condición del catálogo con sus items
    const catalogoCondicion = await prisma.catalogoCondicion.findUnique({
      where: { id: catalogoId },
      include: {
        items: {
          where: { activo: true },
          orderBy: { orden: 'asc' }
        }
      }
    })

    if (!catalogoCondicion) {
      return NextResponse.json(
        { error: 'Condición no encontrada en el catálogo' },
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
      ? catalogoCondicion.items.filter((_, index) => itemsSeleccionados.includes(index))
      : catalogoCondicion.items

    if (itemsAFiltrar.length === 0) {
      return NextResponse.json(
        { error: 'No hay items para importar' },
        { status: 400 }
      )
    }

    // Check for existing conditions with same description (for append mode)
    let filteredItems = itemsAFiltrar
    if (modo === 'append') {
      const existingDescriptions = await prisma.cotizacionCondicion.findMany({
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

    // Crear nuevas condiciones desde el catálogo
    const nuevasCondiciones = filteredItems.map((item, index) => ({
      id: `cot-cond-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      cotizacionId: id,
      descripcion: item.descripcion,
      tipo: item.tipo,
      orden: nextOrden + index,
      catalogoCondicionItemId: item.id,
      updatedAt: new Date()
    }))

    const condicionesCreadas = await prisma.cotizacionCondicion.createMany({
      data: nuevasCondiciones
    })

    logger.info(`Importadas ${condicionesCreadas.count} condiciones desde catálogo ${catalogoId} a cotización ${id}`)

    // Obtener las condiciones creadas para devolver
    const condiciones = await prisma.cotizacionCondicion.findMany({
      where: { cotizacionId: id },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: condiciones,
      message: `Se importaron ${condicionesCreadas.count} condiciones desde "${catalogoCondicion.nombre}"`,
      meta: {
        catalogo: catalogoCondicion.nombre,
        modo,
        importadas: condicionesCreadas.count
      }
    })

  } catch (error) {
    logger.error('Error al importar condiciones desde catálogo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
