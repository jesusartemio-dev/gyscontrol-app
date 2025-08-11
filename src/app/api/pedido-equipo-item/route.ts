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
      orderBy: { createdAt: 'asc' },
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

    // ✅ Validación: existencia del ítem de la lista
    const listaItem = await prisma.listaEquipoItem.findUnique({
      where: { id: body.listaEquipoItemId },
    })

    if (!listaItem) {
      return NextResponse.json(
        { error: 'Ítem de lista no encontrado' },
        { status: 400 }
      )
    }

    // ✅ Validación: total acumulado de pedidos
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

    // ✅ Obtener datos del pedido (incluye fechaNecesaria)
    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id: body.pedidoId },
    })

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido no encontrado para calcular fechaOrdenCompraRecomendada' },
        { status: 400 }
      )
    }

    // ✅ Tiempo de entrega y días: usar lo del body o respaldar desde ListaEquipoItem
    const tiempoEntrega = body.tiempoEntrega ?? listaItem.tiempoEntrega ?? null
    const tiempoEntregaDias = body.tiempoEntregaDias ?? listaItem.tiempoEntregaDias ?? null

    // ✅ Calcular la fecha recomendada para emitir la orden de compra
    let fechaOrdenCompraRecomendada: Date | null = null
    if (tiempoEntregaDias != null) {
      const base = new Date(pedido.fechaNecesaria)
      fechaOrdenCompraRecomendada = new Date(base)
      fechaOrdenCompraRecomendada.setDate(base.getDate() - tiempoEntregaDias)
    }

    // ✅ Crear el nuevo ítem de pedido
    const nuevoItem = await prisma.pedidoEquipoItem.create({
      data: {
        pedidoId: body.pedidoId,
        listaId: body.listaId ?? null,
        listaEquipoItemId: body.listaEquipoItemId,
        cantidadPedida: body.cantidadPedida,
        cantidadAtendida: body.cantidadAtendida ?? null,
        precioUnitario: body.precioUnitario ?? null,
        costoTotal: body.costoTotal ?? null,
        tiempoEntrega,
        tiempoEntregaDias,
        fechaOrdenCompraRecomendada,
        comentarioLogistica: body.comentarioLogistica ?? null,
        estado: body.estado ?? 'pendiente',
        codigo: body.codigo,
        descripcion: body.descripcion,
        unidad: body.unidad,
      },
    })

    // ✅ Actualizar el acumulado de cantidadPedida en ListaEquipoItem
    await prisma.listaEquipoItem.update({
      where: { id: body.listaEquipoItemId },
      data: {
        cantidadPedida: {
          increment: body.cantidadPedida,
        },
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
