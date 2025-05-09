// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-gasto/
// 🔧 Descripción: Maneja GET (todos) y POST de CotizacionGasto
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CotizacionGastoPayload } from '@/types/payloads'

export async function GET() {
  try {
    const data = await prisma.cotizacionGasto.findMany({
      include: {
        items: true,
        cotizacion: true, // si necesitas mostrar la cotización vinculada
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload: CotizacionGastoPayload = await req.json()

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
    console.error('❌ Error en POST /api/cotizacion-gasto:', error)
    return NextResponse.json({ error: 'Error al crear gasto', detalle: String(error) }, { status: 500 })
  }
}
