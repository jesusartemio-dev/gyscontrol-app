// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor-item/
// 🔧 Descripción: API para crear y listar ítems de cotización de proveedor
//
// 🧠 Uso: Logística registra los precios y tiempos por ítem ofertado
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionProveedorItemPayload } from '@/types'

export async function GET() {
  try {
    const data = await prisma.cotizacionProveedorItem.findMany({
      include: {
        cotizacion: {
          include: {
            proveedor: true,
            proyecto: true,
          },
        },
        listaEquipoItem: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener ítems de cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: CotizacionProveedorItemPayload = await request.json()
    const data = await prisma.cotizacionProveedorItem.create({ data: body })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear ítem de cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
