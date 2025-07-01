// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto/
// 🔧 Descripción: Maneja GET (todos) y POST de CotizacionGasto con mejoras
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoPayload } from '@/types/payloads'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cotizacionId = searchParams.get('cotizacionId')

    const data = cotizacionId
      ? await prisma.cotizacionGasto.findMany({
          where: { cotizacionId },
          include: { items: true, cotizacion: true },
        })
      : await prisma.cotizacionGasto.findMany({
          include: { items: true, cotizacion: true },
        })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener gastos:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload: CotizacionGastoPayload = await req.json()

    // Validar si existe la cotización
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: payload.cotizacionId },
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada para asignar gasto' },
        { status: 404 }
      )
    }

    const data = await prisma.cotizacionGasto.create({
      data: {
        cotizacionId: payload.cotizacionId,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        subtotalInterno: payload.subtotalInterno,
        subtotalCliente: payload.subtotalCliente,
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al crear gasto:', error)
    return NextResponse.json(
      { error: 'Error al crear gasto', detalle: String(error) },
      { status: 500 }
    )
  }
}
