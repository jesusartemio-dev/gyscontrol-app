// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/cotizacion/[id]
// 🔧 Descripción: API para manejar GET, PUT y DELETE de cotizaciones
// ✅ Corregido para evitar errores de Next.js con dynamic params
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // ✅ Previene errores de caché en rutas dinámicas

// ✅ Obtener cotización por ID
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
   try {
     const { id } = await context.params // 👈 Previene errores de acceso a params

     if (typeof id !== 'string') {
       return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
     }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        user: true,
        plantilla: true,
        cotizacionEquipo: { include: { cotizacionEquipoItem: true } },
        cotizacionServicio: {
          include: {
            cotizacionServicioItem: {
              include: {
                unidadServicio: true,
                recurso: true,
                catalogoServicio: true
              }
            }
          }
        },
        cotizacionGasto: {
          include: {
            cotizacionGastoItem: true
          }
        },
        // ✅ Nuevas relaciones para exclusiones y condiciones
        cotizacionExclusion: {
          orderBy: { orden: 'asc' }
        },
        cotizacionCondicion: {
          orderBy: { orden: 'asc' }
        }
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Map camelCase relation names for frontend compatibility
    const cotizacionFormatted = {
      ...cotizacion,
      comercial: cotizacion.user, // Alias for frontend compatibility
      equipos: cotizacion.cotizacionEquipo?.map(equipo => ({
        ...equipo,
        items: equipo.cotizacionEquipoItem || []
      })) || [],
      servicios: cotizacion.cotizacionServicio?.map(servicio => ({
        ...servicio,
        items: servicio.cotizacionServicioItem || []
      })) || [],
      gastos: cotizacion.cotizacionGasto?.map(gasto => ({
        ...gasto,
        items: gasto.cotizacionGastoItem || []
      })) || [],
      exclusiones: cotizacion.cotizacionExclusion || [],
      condiciones: cotizacion.cotizacionCondicion || []
    }

    return NextResponse.json(cotizacionFormatted)
  } catch (error) {
    console.error('❌ Error al obtener cotización:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ Actualizar cotización
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const existente = await prisma.cotizacion.findUnique({ where: { id } })
    if (!existente) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const actualizada = await prisma.cotizacion.update({
      where: { id },
      data
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('❌ Error al actualizar cotización:', error)
    return NextResponse.json({ error: 'Error interno al actualizar cotización' }, { status: 500 })
  }
}

// ✅ Eliminar cotización
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
   try {
     const { id } = await context.params

     if (typeof id !== 'string') {
       return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
     }

    await prisma.cotizacion.delete({ where: { id } })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar cotización:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
