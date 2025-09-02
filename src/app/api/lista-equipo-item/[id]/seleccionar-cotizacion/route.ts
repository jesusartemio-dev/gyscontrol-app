// ===================================================
// 📁 Archivo: [id]/seleccionar-cotizacion/route.ts
// 📌 Descripción: Selecciona una cotización ganadora para un ítem (ListaEquipoItem)
// 📌 Efecto: Marca una cotización como seleccionada, desmarca las otras, y actualiza datos clave del ítem
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { cotizacionProveedorItemId } = await req.json()

    // ✅ Buscar la cotización seleccionada
    const cotizacionItem = await prisma.cotizacionProveedorItem.findUnique({
      where: { id: cotizacionProveedorItemId },
    })

    // 🚫 Validación: que la cotización exista y pertenezca al ítem solicitado
    if (!cotizacionItem || cotizacionItem.listaEquipoItemId !== id) {
      return NextResponse.json(
        { error: 'Cotización no válida para este ítem' },
        { status: 400 }
      )
    }

    // 🔄 Paso 1: desmarcar todas las cotizaciones previas del ítem
    await prisma.cotizacionProveedorItem.updateMany({
      where: { listaEquipoItemId: id },
      data: { esSeleccionada: false },
    })

    // ✅ Paso 2: marcar como seleccionada la cotización elegida
    await prisma.cotizacionProveedorItem.update({
      where: { id: cotizacionProveedorItemId },
      data: { esSeleccionada: true },
    })

    // 🧮 Paso 3: calcular precio y costo total (unitario × cantidad)
    const precioUnitario = cotizacionItem.precioUnitario ?? 0
    const cantidad = cotizacionItem.cantidad ?? cotizacionItem.cantidadOriginal ?? 0
    const costoElegido = precioUnitario * cantidad

    // 📦 Paso 4: obtener datos adicionales como tiempo de entrega
    const tiempoEntrega = cotizacionItem.tiempoEntrega ?? null
    const tiempoEntregaDias = cotizacionItem.tiempoEntregaDias ?? null

    // 📝 Paso 5: actualizar el ListaEquipoItem con la información final
    const updatedItem = await prisma.listaEquipoItem.update({
      where: { id },
      data: {
        cotizacionSeleccionadaId: cotizacionProveedorItemId,
        precioElegido: precioUnitario,
        costoElegido,
        tiempoEntrega,
        tiempoEntregaDias,
      },
    })

    // 🎉 Listo
    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('❌ Error al seleccionar cotización:', error)
    return NextResponse.json(
      { error: 'Error al seleccionar cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

// 🔁 POST reutiliza el PATCH por compatibilidad (en caso de ser usado como formulario)
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(req, context)
}
