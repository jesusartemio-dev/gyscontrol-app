// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto-item/
// 🔧 Descripción: Maneja GET todos y POST de CotizacionGastoItem
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoItemPayload } from '@/types/payloads'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

export async function GET() {
  try {
    const data = await prisma.cotizacionGastoItem.findMany({
      include: {
        gasto: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener ítems de gasto:', error)
    return NextResponse.json({ error: 'Error al obtener ítems de gasto' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload: CotizacionGastoItemPayload = await req.json()

    const data = await prisma.cotizacionGastoItem.create({
      data: payload,
    })

    // 🔁 Recalcular totales después de agregar el ítem
    const gasto = await prisma.cotizacionGasto.findUnique({
      where: { id: payload.gastoId },
      select: { cotizacionId: true },
    })

    if (gasto) {
      await recalcularTotalesCotizacion(gasto.cotizacionId)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al crear ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al crear ítem de gasto' }, { status: 500 })
  }
}
