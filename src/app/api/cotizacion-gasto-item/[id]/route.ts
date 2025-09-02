// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto-item/[id]
// 🔧 Descripción: Maneja GET, PUT y DELETE de CotizacionGastoItem con mejoras
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoItemUpdatePayload } from '@/types/payloads'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.cotizacionGastoItem.findUnique({
      where: { id },
      include: { gasto: true },
    })

    if (!data) {
      return NextResponse.json({ error: 'Ítem de gasto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al obtener ítem de gasto' }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params // ✅ CORREGIDO: await context.params

    const payload: Partial<CotizacionGastoItemUpdatePayload> = await req.json()

    const existing = await prisma.cotizacionGastoItem.findUnique({
      where: { id },
      include: { gasto: { select: { cotizacionId: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ítem de gasto no encontrado para actualizar' }, { status: 404 })
    }

    const data = await prisma.cotizacionGastoItem.update({
      where: { id },
      data: payload,
    })

    await recalcularTotalesCotizacion(existing.gasto.cotizacionId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al actualizar ítem de gasto' }, { status: 500 })
  }
}


export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const existing = await prisma.cotizacionGastoItem.findUnique({
      where: { id },
      include: { gasto: { select: { cotizacionId: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ítem de gasto no encontrado para eliminar' }, { status: 404 })
    }

    await prisma.cotizacionGastoItem.delete({
      where: { id },
    })

    await recalcularTotalesCotizacion(existing.gasto.cotizacionId)

    return NextResponse.json({ status: 'ok', deletedId: id })
  } catch (error) {
    console.error('❌ Error al eliminar ítem de gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar ítem de gasto' }, { status: 500 })
  }
}
