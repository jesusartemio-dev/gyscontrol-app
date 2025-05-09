// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto/[id]
// 🔧 Descripción: Maneja GET uno, PUT y DELETE de CotizacionGasto
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoUpdatePayload } from '@/types/payloads'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await prisma.cotizacionGasto.findUnique({
      where: { id },
      include: {
        items: true,
        cotizacion: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener gasto:', error)
    return NextResponse.json({ error: 'Error al obtener gasto' }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const payload: CotizacionGastoUpdatePayload = await req.json()

    const data = await prisma.cotizacionGasto.update({
      where: { id },
      data: payload,
    })

    // 🔁 Recalcular totales de cotización después de actualizar
    const gasto = await prisma.cotizacionGasto.findUnique({
      where: { id },
      select: { cotizacionId: true },
    })

    if (gasto) {
      await recalcularTotalesCotizacion(gasto.cotizacionId)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar gasto:', error)
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params

    const gasto = await prisma.cotizacionGasto.findUnique({
      where: { id },
      select: { cotizacionId: true },
    })

    await prisma.cotizacionGasto.delete({
      where: { id },
    })

    // 🔁 Recalcular totales
    if (gasto) {
      await recalcularTotalesCotizacion(gasto.cotizacionId)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
