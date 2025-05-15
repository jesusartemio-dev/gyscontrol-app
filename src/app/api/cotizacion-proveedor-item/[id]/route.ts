// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor-item/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar o eliminar ítems de cotización de proveedor
//
// 🧠 Uso: Gestión de ítems asociados a una cotización por proveedor
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CotizacionProveedorItemPayload } from '@/types'

// ✅ Obtener ítem por ID
export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const item = await prisma.cotizacionProveedorItem.findUnique({
      where: { id },
      include: {
        cotizacion: true,
        listaItem: true
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener ítem de cotización de proveedor' }, { status: 500 })
  }
}

// ✅ Actualizar ítem
export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const payload: Partial<CotizacionProveedorItemPayload> = await request.json()

    const actualizado = await prisma.cotizacionProveedorItem.update({
      where: { id },
      data: {
        precioUnitario: payload.precioUnitario,
        tiempoEntrega: payload.tiempoEntrega,
        seleccionado: payload.seleccionado
      }
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar ítem de cotización de proveedor' }, { status: 500 })
  }
}

// ✅ Eliminar ítem
export async function DELETE(context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    await prisma.cotizacionProveedorItem.delete({
      where: { id }
    })

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar ítem de cotización de proveedor' }, { status: 500 })
  }
}
