// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 API para ver, actualizar o eliminar un ítem de cotización
// 🧠 Uso: Logística puede ajustar precio, entrega o eliminar ítem
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-07-11
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionProveedorItemUpdatePayload } from '@/types'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await prisma.cotizacionProveedorItem.findUnique({
      where: { id },
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
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET:', error)
    return NextResponse.json(
      { error: 'Error al obtener el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body: CotizacionProveedorItemUpdatePayload = await request.json()

    const updated = await prisma.cotizacionProveedorItem.update({
      where: { id },
      data: {
        precioUnitario: body.precioUnitario ?? null,
        cantidad: body.cantidad ?? null,
        costoTotal: body.costoTotal ?? null,
        tiempoEntrega: body.tiempoEntrega ?? null,
        tiempoEntregaDias: body.tiempoEntregaDias ?? null,
        estado: body.estado,
        esSeleccionada: body.esSeleccionada ?? false,
      },
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
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error('❌ Error en PUT:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const existente = await prisma.cotizacionProveedorItem.findUnique({ where: { id } })

    if (!existente) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    await prisma.cotizacionProveedorItem.delete({ where: { id } })

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    console.error('❌ Error en DELETE:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

