// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor-item/route.ts
// 🔧 Descripción: API para crear y listar ítems de cotización de proveedor
//
// 🧠 Uso: Llamado desde formularios de cotización para agregar precios unitarios por ítem
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CotizacionProveedorItemPayload } from '@/types'


// ✅ Listar ítems con relaciones necesarias
export async function GET() {
  try {
    const data = await prisma.cotizacionProveedorItem.findMany({
      include: {
        cotizacion: true,
        listaItem: true
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener ítems de cotización' }, { status: 500 })
  }
}

// ✅ Crear nuevo ítem
export async function POST(request: Request) {
  try {
    const payload: CotizacionProveedorItemPayload = await request.json()

    const nuevo = await prisma.cotizacionProveedorItem.create({
      data: {
        cotizacionId: payload.cotizacionId,
        listaItemId: payload.listaItemId,
        precioUnitario: payload.precioUnitario,
        tiempoEntrega: payload.tiempoEntrega,
        seleccionado: payload.seleccionado ?? false
      }
    })

    return NextResponse.json(nuevo)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear ítem de cotización de proveedor' }, { status: 500 })
  }
}


