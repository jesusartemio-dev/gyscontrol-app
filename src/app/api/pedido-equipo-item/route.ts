// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedido-equipo-item/
// 🔧 Descripción: API para crear y listar ítems de pedidos de equipo con validación extra
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoItemPayload } from '@/types'

export async function GET() {
  try {
    const data = await prisma.pedidoEquipoItem.findMany({
      include: {
        pedido: {
          include: { proyecto: true, responsable: true },
        },
        listaEquipoItem: true,
      },
      orderBy: { fechaNecesaria: 'asc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener ítems de pedidos: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: PedidoEquipoItemPayload = await request.json()

    // ✅ Validación extra: suma actual de pedidos
    const listaItem = await prisma.listaEquipoItem.findUnique({
      where: { id: body.listaEquipoItemId },
    })

    if (!listaItem) {
      return NextResponse.json(
        { error: 'Ítem de lista no encontrado' },
        { status: 400 }
      )
    }

    const pedidosPrevios = await prisma.pedidoEquipoItem.aggregate({
      where: { listaEquipoItemId: body.listaEquipoItemId },
      _sum: { cantidadPedida: true },
    })

    const totalPrevio = pedidosPrevios._sum.cantidadPedida || 0
    const totalSolicitado = totalPrevio + body.cantidadPedida

    if (totalSolicitado > listaItem.cantidad) {
      return NextResponse.json(
        { error: 'La cantidad total pedida excede la cantidad disponible en la lista' },
        { status: 400 }
      )
    }

    const nuevoItem = await prisma.pedidoEquipoItem.create({
      data: {
        pedidoId: body.pedidoId,
        listaEquipoItemId: body.listaEquipoItemId,
        cantidadPedida: body.cantidadPedida,
        precioUnitario: body.precioUnitario ?? null,
        costoTotal: body.costoTotal ?? null,
        fechaNecesaria: body.fechaNecesaria,
        estado: body.estado ?? 'pendiente',
        cantidadAtendida: body.cantidadAtendida ?? null,
        comentarioLogistica: body.comentarioLogistica ?? null,
      },
    })

    return NextResponse.json(nuevoItem)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear ítem de pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
