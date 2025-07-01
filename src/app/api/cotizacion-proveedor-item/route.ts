// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor-item/
// 🔧 Descripción: API para crear y listar ítems de cotización de proveedor
//
// 🧠 Uso: Logística registra los precios y tiempos por ítem ofertado
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-05-31
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
      orderBy: {
        codigo: 'asc', // ✅ Ordena los ítems por código ascendente
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener ítems de cotización:', error)
    return NextResponse.json(
      { error: 'Error al obtener ítems de cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: CotizacionProveedorItemPayload = await request.json()

    // 🔁 Leer datos del ítem técnico asociado
    const item = await prisma.listaEquipoItem.findUnique({
      where: { id: body.listaEquipoItemId },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Ítem técnico no encontrado para emparejar' },
        { status: 400 }
      )
    }

    // 📦 Crear nuevo ítem de cotización con copia de datos técnicos
    const nuevoItem = await prisma.cotizacionProveedorItem.create({
      data: {
        cotizacionId: body.cotizacionId,
        listaEquipoItemId: body.listaEquipoItemId,

        // 🧠 Copiados desde ListaEquipoItem
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidadOriginal: item.cantidad,
        presupuesto: item.presupuesto,

        // 💰 Datos de cotización (pueden venir vacíos)
        precioUnitario: body.precioUnitario ?? null,
        cantidad: body.cantidad ?? item.cantidad, // ✅ usa cantidad del ítem si no se pasa
        costoTotal: body.costoTotal ?? null,
        tiempoEntrega: body.tiempoEntrega ?? null,

        estado: body.estado ?? 'pendiente',
        esSeleccionada: body.esSeleccionada ?? false,
      },
    })

    return NextResponse.json(nuevoItem)
  } catch (error) {
    console.error('❌ Error al crear ítem de cotización:', error)
    return NextResponse.json(
      { error: 'Error al crear ítem de cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
