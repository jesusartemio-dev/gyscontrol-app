// ===================================================
// 📁 Archivo: /api/cotizacion-proveedor-item/bulk/route.ts
// 📌 Descripción: Endpoint para crear ítems de cotización masivamente (ahora incluyendo todos los campos requeridos por Prisma)
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Formato inválido: se esperaba un array de items' },
        { status: 400 }
      )
    }

    // Verifica que cada ítem tenga todos los campos necesarios
    const mappedItems = body.items.map((item: any) => ({
      cotizacionId: item.cotizacionId,
      listaEquipoItemId: item.listaEquipoItemId,
      codigo: item.codigo,
      descripcion: item.descripcion, // ✅ aseguramos que se incluya
      unidad: item.unidad,           // ✅ aseguramos que se incluya
      cantidadOriginal: item.cantidadOriginal || 0, // por si es obligatorio
      precioUnitario: item.precioUnitario,
      cantidad: item.cantidad,
      costoTotal: item.costoTotal,
      tiempoEntrega: item.tiempoEntrega,
      estado: item.estado,
      esSeleccionada: item.esSeleccionada,
    }))

    const created = await prisma.cotizacionProveedorItem.createMany({
      data: mappedItems,
    })

    return NextResponse.json({
      message: 'Ítems creados correctamente',
      count: created.count,
    })
  } catch (error) {
    console.error('❌ Error en /api/cotizacion-proveedor-item/bulk:', error)
    return NextResponse.json(
      { error: 'Error interno al crear ítems masivos' },
      { status: 500 }
    )
  }
}
