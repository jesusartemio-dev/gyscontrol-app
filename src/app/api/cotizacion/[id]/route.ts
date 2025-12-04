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

    const cotizacion = await prisma.cotizaciones.findUnique({
      where: { id },
      include: {
        clientes: true,
        users: true,
        plantillas: true,
        cotizacion_equipo: { include: { cotizacion_equipo_item: true } },
        cotizacion_servicio: {
          include: {
            cotizacion_servicio_item: {
              include: {
                unidad_servicio: true,
                recursos: true,
                catalogo_servicio: true
              }
            }
          }
        },
        cotizacion_gasto: {
          include: {
            cotizacion_gasto_item: true
          }
        },
        // ✅ Nuevas relaciones para exclusiones y condiciones
        cotizacion_exclusion: {
          orderBy: { orden: 'asc' }
        },
        cotizacion_condicion: {
          orderBy: { orden: 'asc' }
        }
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Map snake_case relation names to expected PascalCase property names for frontend compatibility
    const cotizacionFormatted = {
      ...cotizacion,
      equipos: cotizacion.cotizacion_equipo?.map(equipo => ({
        ...equipo,
        items: equipo.cotizacion_equipo_item || []
      })) || [],
      servicios: cotizacion.cotizacion_servicio?.map(servicio => ({
        ...servicio,
        items: servicio.cotizacion_servicio_item || []
      })) || [],
      gastos: cotizacion.cotizacion_gasto?.map(gasto => ({
        ...gasto,
        items: gasto.cotizacion_gasto_item || []
      })) || [],
      exclusiones: cotizacion.cotizacion_exclusion || [],
      condiciones: cotizacion.cotizacion_condicion || [],
      cliente: cotizacion.clientes,
      comercial: cotizacion.users,
      plantilla: cotizacion.plantillas
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

    const existente = await prisma.cotizaciones.findUnique({ where: { id } })
    if (!existente) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const actualizada = await prisma.cotizaciones.update({
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

    await prisma.cotizaciones.delete({ where: { id } })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar cotización:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
