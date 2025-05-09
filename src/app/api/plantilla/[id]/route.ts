// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/plantilla/[id]
// 🔧 Descripción: API para obtener, actualizar o eliminar una plantilla
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-05-01
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic' // ✅ recomendado por Next.js para rutas dinámicas

// ✅ Obtener una plantilla por ID
export async function GET(_: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const plantilla = await prisma.plantilla.findUnique({
      where: { id },
      include: {
        equipos: {
          include: {
            items: true,
          },
        },
        servicios: {
          include: {
            items: {
              include: {
                catalogoServicio: true,
                recurso: true,
                unidadServicio: true,
              },
            },
          },
        },
        gastos: {
          include: {
            items: true,
          },
        },
      },
    })

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    return NextResponse.json(plantilla)
  } catch (error) {
    console.error('❌ Error al obtener plantilla:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ Actualizar una plantilla
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const camposTotalesExtendidos = {
      totalEquiposInterno: data.totalEquiposInterno,
      totalEquiposCliente: data.totalEquiposCliente,
      totalServiciosInterno: data.totalServiciosInterno,
      totalServiciosCliente: data.totalServiciosCliente,
      totalGastosInterno: data.totalGastosInterno,
      totalGastosCliente: data.totalGastosCliente,
      totalInterno: data.totalInterno,
      totalCliente: data.totalCliente,
      grandTotal: data.grandTotal
    }

    const actualizada = await prisma.plantilla.update({
      where: { id },
      data: camposTotalesExtendidos,
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('❌ Error al actualizar plantilla:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ✅ Eliminar una plantilla
export async function DELETE(_: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    await prisma.plantilla.delete({ where: { id } })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar plantilla:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
