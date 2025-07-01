// ===================================================
// 📁 Archivo: [id]/seleccionar-cotizacion/route.ts
// 📌 Descripción: Selecciona una cotización ganadora para un ítem (renombrado [itemId] → [id])
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { cotizacionProveedorItemId } = await req.json()

    // Verificar que la cotización exista y pertenece a ese ítem
    const cotizacionItem = await prisma.cotizacionProveedorItem.findUnique({
      where: { id: cotizacionProveedorItemId },
    })

    if (!cotizacionItem || cotizacionItem.listaEquipoItemId !== id) {
      return NextResponse.json(
        { error: 'Cotización no válida para este ítem' },
        { status: 400 }
      )
    }

    // Primero: desmarcar todas las demás
    await prisma.cotizacionProveedorItem.updateMany({
      where: { listaEquipoItemId: id },
      data: { esSeleccionada: false },
    })

    // Segundo: marcar como seleccionada
    await prisma.cotizacionProveedorItem.update({
      where: { id: cotizacionProveedorItemId },
      data: { esSeleccionada: true },
    })

    // Tercero: actualizar el ítem principal
    const precioUnitario = cotizacionItem.precioUnitario ?? 0
    const cantidad = cotizacionItem.cantidad ?? cotizacionItem.cantidadOriginal ?? 0
    const costoElegido = precioUnitario * cantidad

    const updatedItem = await prisma.listaEquipoItem.update({
      where: { id },
      data: {
        cotizacionSeleccionadaId: cotizacionProveedorItemId,
        precioElegido: precioUnitario,
        costoElegido,
        // tiempoEntrega: cotizacionItem.tiempoEntrega, // descomenta si lo necesitas
      },
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('❌ Error al seleccionar cotización:', error)
    return NextResponse.json(
      { error: 'Error al seleccionar cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: Request, context: { params: { id: string } }) {
  return PATCH(req, context)
}
