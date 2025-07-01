// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/pedido-equipo-item/[id]/
// 🔧 Descripción: API para ver, editar o eliminar un ítem de pedido de equipo
//
// 🧠 Uso: Para actualizar entrega, costos, comentarios desde logística
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-05-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoItemUpdatePayload } from '@/types'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = context.params

    const data = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: {
        pedido: {
          include: {
            proyecto: true,
            responsable: true,
          },
        },
        listaEquipoItem: {
          include: {
            proveedor: true,
            cotizacionSeleccionada: true,
          },
        },
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body: PedidoEquipoItemUpdatePayload = await request.json()

    const data = await prisma.pedidoEquipoItem.update({
      where: { id },
      data: {
        cantidadPedida: body.cantidadPedida,
        precioUnitario: body.precioUnitario ?? null,
        costoTotal: body.costoTotal ?? null,
        fechaNecesaria: body.fechaNecesaria,
        estado: body.estado ?? 'pendiente',
        cantidadAtendida: body.cantidadAtendida ?? null,
        comentarioLogistica: body.comentarioLogistica ?? null,
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(context: { params: { id: string } }) {
  try {
    const { id } = context.params
    await prisma.pedidoEquipoItem.delete({
      where: { id },
    })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar ítem de pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
