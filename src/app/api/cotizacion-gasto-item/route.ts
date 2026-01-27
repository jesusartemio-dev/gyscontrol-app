// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto-item/
// 🔧 Descripción: Maneja GET todos y POST de CotizacionGastoItem con mejoras
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoItemPayload } from '@/types/payloads'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import { randomUUID } from 'crypto'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const gastoId = searchParams.get('gastoId')

    const data = gastoId
      ? await prisma.cotizacionGastoItem.findMany({
          where: { gastoId },
          include: { cotizacionGasto: true },
        })
      : await prisma.cotizacionGastoItem.findMany({
          include: { cotizacionGasto: true },
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

    // Validar existencia del gasto
    const gasto = await prisma.cotizacionGasto.findUnique({
      where: { id: payload.gastoId },
    })

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado para asignar ítem' }, { status: 404 })
    }

    const data = await prisma.cotizacionGastoItem.create({
      data: {
        id: randomUUID(),
        ...payload,
        updatedAt: new Date(),
      },
    })

    await recalcularTotalesCotizacion(gasto.cotizacionId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al crear ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al crear ítem de gasto' }, { status: 500 })
  }
}
