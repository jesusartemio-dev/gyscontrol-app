// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/cotizacion/[id]
// 🔧 Descripción: API para manejar GET, PUT y DELETE de cotizaciones
// ✅ Corregido para evitar errores de Next.js con dynamic params
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'  // ✅ Previene errores de caché en rutas dinámicas

// ✅ Obtener cotización por ID
export async function GET(_: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params // 👈 Previene errores de acceso a params

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        comercial: true,
        plantilla: true,
        equipos: { include: { items: true } },
        servicios: {
          include: {
            items: {
              include: {
                unidadServicio: true,
                recurso: true,
                catalogoServicio: true
              }
            }
          }
        }
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    return NextResponse.json(cotizacion)
  } catch (error) {
    console.error('❌ Error al obtener cotización:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ Actualizar cotización
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params // 👈 Se usa await aquí también
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
export async function DELETE(_: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params // 👈 También corregido

    await prisma.cotizacion.delete({ where: { id } })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar cotización:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
