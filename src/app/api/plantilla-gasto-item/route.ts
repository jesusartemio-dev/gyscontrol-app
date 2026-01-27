// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/plantilla-gasto-item/
// 🔧 Descripción: Maneja GET todos y POST de PlantillaGastoItem
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PlantillaGastoItemPayload } from '@/types/payloads'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla'

export async function GET() {
  try {
    const data = await prisma.plantillaGastoItem.findMany({
      include: {
        plantillaGasto: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener ítems:', error)
    return NextResponse.json({ error: 'Error al obtener ítems' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload: PlantillaGastoItemPayload = await req.json()

    const data = await prisma.plantillaGastoItem.create({
      data: {
        ...payload,
        id: `plantilla-gasto-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: new Date()
      },
    })

    // 🔁 Recalcular totales de la plantilla
    const gasto = await prisma.plantillaGasto.findUnique({
      where: { id: payload.gastoId },
      select: { plantillaId: true },
    })

    if (gasto) {
      await recalcularTotalesPlantilla(gasto.plantillaId)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al crear ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al crear ítem de gasto' }, { status: 500 })
  }
}
