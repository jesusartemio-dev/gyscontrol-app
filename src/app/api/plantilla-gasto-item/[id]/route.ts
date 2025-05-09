// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/plantilla-gasto-item/[id]
// 🔧 Descripción: Actualiza o elimina un ítem de gasto de una plantilla
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-05-05
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PlantillaGastoItemUpdatePayload } from '@/types/payloads'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const data = await prisma.plantillaGastoItem.findUnique({
      where: { id },
      include: {
        gasto: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener ítem' }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const payload: PlantillaGastoItemUpdatePayload = await req.json()
    const data = await prisma.plantillaGastoItem.update({
      where: { id },
      data: payload,
    })

    // Obtener plantillaId para recalcular
    const gasto = await prisma.plantillaGasto.findUnique({
      where: { id: data.gastoId },
      select: { plantillaId: true },
    })

    if (gasto?.plantillaId) {
      await recalcularTotalesPlantilla(gasto.plantillaId)
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar ítem' }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params

    const item = await prisma.plantillaGastoItem.findUnique({
      where: { id },
      select: { gastoId: true },
    })

    await prisma.plantillaGastoItem.delete({
      where: { id },
    })

    if (item?.gastoId) {
      const gasto = await prisma.plantillaGasto.findUnique({
        where: { id: item.gastoId },
        select: { plantillaId: true },
      })

      if (gasto?.plantillaId) {
        await recalcularTotalesPlantilla(gasto.plantillaId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar ítem' }, { status: 500 })
  }
}
