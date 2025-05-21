// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor-item/[id]
// 🔧 Descripción: API para ver, actualizar o eliminar un ítem de cotización
//
// 🧠 Uso: Logística puede ajustar precio, entrega o eliminar ítem
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionProveedorItemUpdatePayload } from '@/types'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await prisma.cotizacionProveedorItem.findUnique({
      where: { id },
      include: {
        cotizacion: true,
        listaEquipoItem: true,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(context: { params: { id: string }; request: Request }) {
  try {
    const { id } = await context.params
    const body: CotizacionProveedorItemUpdatePayload = await context.request.json()

    const data = await prisma.cotizacionProveedorItem.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    await prisma.cotizacionProveedorItem.delete({ where: { id } })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}
