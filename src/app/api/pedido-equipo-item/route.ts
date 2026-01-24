// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedido-equipo-item/
// 🔧 Descripción: API para crear y listar ítems de pedidos de equipo con validación extra
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { PedidoEquipoItemPayload } from '@/types'

export async function GET() {
  try {
    const data = await prisma.pedidoEquipoItem.findMany({
      include: {
        pedidoEquipo: {
          include: { proyecto: true, user: true },
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // ✅ Asegurar que el ID del usuario existe
    const userId = session.user.id
    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario no válido' },
        { status: 401 }
      )
    }

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
        id: `pedido-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pedidoId: body.pedidoId,
        responsableId: userId,
        updatedAt: new Date(),
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

    // ✅ Actualizar el acumulado de cantidadPedida en ListaEquipoItem usando validación
    const { sincronizarCantidadPedida } = await import('@/lib/utils/cantidadPedidaValidator')
    
    const resultado = await sincronizarCantidadPedida(
      body.listaEquipoItemId,
      'increment',
      body.cantidadPedida
    )

    if (!resultado.exito) {
      console.warn('⚠️ Advertencia al incrementar cantidadPedida:', resultado.mensaje)
      // 🔄 Recalcular desde cero para corregir inconsistencias
      const { recalcularCantidadPedida } = await import('@/lib/utils/cantidadPedidaValidator')
      await recalcularCantidadPedida(body.listaEquipoItemId)
    }

    return NextResponse.json(nuevoItem)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear ítem de pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
