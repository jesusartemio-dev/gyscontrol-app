// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/pedido-equipo-item/[id]/
// 🔧 Descripción: API para ver, editar o eliminar un ítem de pedido de equipo
//
// 🧠 Uso: Para actualizar entrega, costos, comentarios desde logística
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoItemUpdatePayload } from '@/types'

export async function GET(context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const data = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: {
        pedido: true,
        listaEquipoItem: true,
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

export async function PUT(context: { params: { id: string }; request: Request }) {
  try {
    const { id } = await context.params
    const body: PedidoEquipoItemUpdatePayload = await context.request.json()

    const data = await prisma.pedidoEquipoItem.update({
      where: { id },
      data: body,
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
    const { id } = await context.params
    await prisma.pedidoEquipoItem.delete({ where: { id } })
    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar ítem de pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
