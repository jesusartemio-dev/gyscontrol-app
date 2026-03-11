// ===================================================
// 📁 Archivo: /api/cotizacion-proveedor-item/bulk/route.ts
// 📌 Descripción: Endpoint para crear ítems de cotización masivamente (ahora incluyendo todos los campos requeridos por Prisma)
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Formato inválido: se esperaba un array de items' },
        { status: 400 }
      )
    }

    const now = new Date()
    const mappedItems = body.items.map((item: any) => ({
      id: randomUUID(),
      cotizacionId: item.cotizacionId,
      listaEquipoItemId: item.listaEquipoItemId,
      listaId: item.listaId,
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidadOriginal: item.cantidadOriginal || 0,
      precioUnitario: item.precioUnitario,
      cantidad: item.cantidad,
      costoTotal: item.costoTotal,
      tiempoEntrega: item.tiempoEntrega || 'Stock',
      tiempoEntregaDias: item.tiempoEntregaDias ?? 0,
      estado: item.estado,
      esSeleccionada: item.esSeleccionada,
      updatedAt: now,
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
