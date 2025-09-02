// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/plantilla-equipo-item/[id]
// 🔧 Descripción: Actualiza o elimina un ítem de equipo de una plantilla
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-05-01
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { PlantillaEquipoItemPayload } from '@/types'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla'

export const dynamic = 'force-dynamic' // ✅ Para rutas dinámicas en App Router

// ✅ Actualizar ítem de equipo de plantilla
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data: Partial<PlantillaEquipoItemPayload> = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const actualizado = await prisma.plantillaEquipoItem.update({
      where: { id },
      data,
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        categoria: true,
        unidad: true,
        marca: true,
        precioInterno: true,
        precioCliente: true,
        cantidad: true,
        costoInterno: true,
        costoCliente: true,
        createdAt: true,
        updatedAt: true,
        plantillaEquipoId: true,
      },
    })

    const equipo = await prisma.plantillaEquipo.findUnique({
      where: { id: actualizado.plantillaEquipoId },
      select: { plantillaId: true },
    })

    if (equipo) {
      await recalcularTotalesPlantilla(equipo.plantillaId)
    }

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar ítem de equipo:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ✅ Eliminar ítem de equipo de plantilla
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const item = await prisma.plantillaEquipoItem.findUnique({
      where: { id },
      select: { plantillaEquipoId: true },
    })

    await prisma.plantillaEquipoItem.delete({ where: { id } })

    if (item) {
      const equipo = await prisma.plantillaEquipo.findUnique({
        where: { id: item.plantillaEquipoId },
        select: { plantillaId: true },
      })

      if (equipo) {
        await recalcularTotalesPlantilla(equipo.plantillaId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar ítem de equipo:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
