// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/plantilla-gasto/[id]
// 🔧 Descripción: Maneja GET uno, PUT y DELETE de PlantillaGasto
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PlantillaGastoUpdatePayload } from '@/types/payloads'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla'


export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await prisma.plantillaGasto.findUnique({
      where: { id },
      include: {
        plantillaGastoItem: true,
        plantilla: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener gasto' }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const payload: PlantillaGastoUpdatePayload = await req.json()
    const data = await prisma.plantillaGasto.update({
      where: { id },
      data: payload,
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const gasto = await prisma.plantillaGasto.findUnique({
      where: { id },
      select: { plantillaId: true }
    })

    const deleted = await prisma.plantillaGasto.delete({
      where: { id },
    })

    // 🔁 Recalcular totales
    if (gasto) {
      await recalcularTotalesPlantilla(gasto.plantillaId)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
