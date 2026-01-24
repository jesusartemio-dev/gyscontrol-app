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
import { randomUUID } from 'crypto'
import type { CotizacionProveedorItemPayload } from '@/types'

export async function GET() {
  try {
    const data = await prisma.cotizacionProveedorItem.findMany({
      include: {
        cotizacionProveedor: {
          include: {
            proveedor: true,
            proyecto: true,
          },
        },
        listaEquipoItem: true,
        listaEquipo: true,
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
    const creado = await prisma.cotizacionProveedorItem.create({
      data: {
        id: randomUUID(),
        cotizacionId: body.cotizacionId,
        listaEquipoItemId: body.listaEquipoItemId,
        listaId: body.listaId ?? item.listaId,

        // 🧠 Copiados desde ListaEquipoItem
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidadOriginal: item.cantidad,

        // 💰 Datos de cotización (pueden venir vacíos)
        precioUnitario: body.precioUnitario ?? null,
        cantidad: body.cantidad ?? item.cantidad,
        costoTotal: body.costoTotal ?? null,
        tiempoEntrega: body.tiempoEntrega ?? item.tiempoEntrega ?? (item.tiempoEntregaDias ? `${item.tiempoEntregaDias} días` : null),
        tiempoEntregaDias: body.tiempoEntregaDias ?? item.tiempoEntregaDias ?? null,

        estado: body.estado ?? 'pendiente',
        esSeleccionada: body.esSeleccionada ?? false,
        updatedAt: new Date(),
      },
    })

    // 🔄 Obtener el ítem creado con todas sus relaciones
    const nuevoItem = await prisma.cotizacionProveedorItem.findUnique({
      where: { id: creado.id },
      include: {
        cotizacionProveedor: {
          include: {
            proveedor: true,
            proyecto: true,
          },
        },
        listaEquipoItem: true,
        listaEquipo: true,
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
