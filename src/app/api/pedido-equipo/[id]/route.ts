// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/pedido-equipo/[id]/
// 🔧 Descripción: API para obtener, actualizar o eliminar un pedido de equipo
//
// 🧠 Uso: Visualización y edición de pedido por ID
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-07-16
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoUpdatePayload } from '@/types'

// ✅ Obtener pedido por ID
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.pedidoEquipo.findUnique({
      where: { id },
      include: {
        responsable: true,
        proyecto: true,
        lista: {
          include: {
            items: {
              select: {
                id: true,
                cantidad: true,
                cantidadPedida: true,
                codigo: true,
                descripcion: true,
                unidad: true,
                precioElegido: true,
                tiempoEntrega: true,
                tiempoEntregaDias: true,
              },
            },
          },
        },
        items: {
          include: {
            listaEquipoItem: {
              include: {
                proveedor: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener pedido:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedido: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Actualizar pedido
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body: PedidoEquipoUpdatePayload = await req.json()

    const data = await prisma.pedidoEquipo.update({
      where: { id },
      data: {
        proyectoId: body.proyectoId,
        responsableId: body.responsableId,
        listaId: body.listaId ?? null,
        estado: body.estado,
        observacion: body.observacion,
        fechaPedido: body.fechaPedido ? new Date(body.fechaPedido) : undefined,
        fechaNecesaria: body.fechaNecesaria ? new Date(body.fechaNecesaria) : undefined,
        fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada) : null,
        fechaEntregaReal: body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : null,
      },
      include: {
        responsable: true,
        proyecto: true,
        lista: true,
        items: {
          include: {
            listaEquipoItem: true,
          },
        },
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar pedido:', error)
    return NextResponse.json(
      { error: 'Error al actualizar pedido: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Eliminar pedido
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // ✅ Obtener todos los ítems asociados al pedido
    const items = await prisma.pedidoEquipoItem.findMany({
      where: { pedidoId: id },
    })

    // ✅ Restar cantidades acumuladas en ListaEquipoItem
    for (const item of items) {
      if (item.listaEquipoItemId && item.cantidadPedida > 0) {
        await prisma.listaEquipoItem.update({
          where: { id: item.listaEquipoItemId },
          data: {
            cantidadPedida: {
              decrement: item.cantidadPedida,
            },
          },
        })
      }
    }

    // ✅ Eliminar el pedido (asume que los ítems tienen delete cascade)
    await prisma.pedidoEquipo.delete({
      where: { id },
    })

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    console.error('❌ Error al eliminar pedido:', error)
    return NextResponse.json(
      { error: 'Error al eliminar pedido: ' + String(error) },
      { status: 500 }
    )
  }
}

