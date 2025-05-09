// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto-item/[id]
// 🔧 Descripción: Maneja GET, PUT y DELETE de CotizacionGastoItem
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoItemUpdatePayload } from '@/types/payloads'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const data = await prisma.cotizacionGastoItem.findUnique({
      where: { id },
      include: {
        gasto: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al obtener ítem de gasto' }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const payload: CotizacionGastoItemUpdatePayload = await req.json()

    const actualizado = await prisma.cotizacionGastoItem.update({
      where: { id },
      data: payload,
    })

    const gasto = await prisma.cotizacionGasto.findUnique({
      where: { id: actualizado.gastoId },
      select: { cotizacionId: true },
    })

    if (gasto?.cotizacionId) {
      await recalcularTotalesCotizacion(gasto.cotizacionId)
    }

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al actualizar ítem de gasto' }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params

    const item = await prisma.cotizacionGastoItem.findUnique({
      where: { id },
      select: { gastoId: true },
    })

    await prisma.cotizacionGastoItem.delete({
      where: { id },
    })

    if (item?.gastoId) {
      const gasto = await prisma.cotizacionGasto.findUnique({
        where: { id: item.gastoId },
        select: { cotizacionId: true },
      })

      if (gasto?.cotizacionId) {
        await recalcularTotalesCotizacion(gasto.cotizacionId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar ítem de gasto' }, { status: 500 })
  }
}
