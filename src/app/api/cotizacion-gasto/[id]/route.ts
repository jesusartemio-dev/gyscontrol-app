// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto/[id]
// 🔧 Descripción: Maneja GET uno, PUT y DELETE de CotizacionGasto con mejoras
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoUpdatePayload } from '@/types/payloads'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.cotizacionGasto.findUnique({
      where: { id },
      include: { items: true, cotizacion: true },
    })

    if (!data) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener gasto:', error)
    return NextResponse.json({ error: 'Error al obtener gasto' }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const payload: CotizacionGastoUpdatePayload = await req.json()

    const existing = await prisma.cotizacionGasto.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Gasto no encontrado para actualizar' }, { status: 404 })
    }

    const data = await prisma.cotizacionGasto.update({
      where: { id },
      data: payload,
    })

    await recalcularTotalesCotizacion(existing.cotizacionId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar gasto:', error)
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const existing = await prisma.cotizacionGasto.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Gasto no encontrado para eliminar' }, { status: 404 })
    }

    await prisma.cotizacionGasto.delete({
      where: { id },
    })

    await recalcularTotalesCotizacion(existing.cotizacionId)

    return NextResponse.json({ status: 'ok', deletedId: id })
  } catch (error) {
    console.error('❌ Error al eliminar gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
