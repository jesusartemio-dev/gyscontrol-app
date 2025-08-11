// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 API para ver, editar o eliminar un ítem de pedido de equipo
// 🧠 Uso: Actualiza entrega, costos, comentarios desde logística
// ✍️ Autor: Jesús Artemio + IA GYS
// 🗕️ Última actualización: 2025-07-17
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

// ✅ Actualizar un ítem de pedido por ID
export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body: PedidoEquipoItemUpdatePayload = await request.json()

    // 🔍 Buscar el ítem anterior
    const itemAnterior = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: { pedido: true },
    })

    if (!itemAnterior) {
      return NextResponse.json({ error: 'Ítem no encontrado para actualizar' }, { status: 404 })
    }

    if (body.cantidadPedida === undefined) {
      return NextResponse.json({ error: 'La cantidadPedida es requerida' }, { status: 400 })
    }

    // 🔢 Calcular la diferencia en cantidadPedida para actualizar lista
    const diferencia = body.cantidadPedida - itemAnterior.cantidadPedida

    // 📅 Recalcular fechaOrdenCompraRecomendada si hay tiempoEntregaDias
    let fechaOC: Date | null = null
    const dias = body.tiempoEntregaDias ?? itemAnterior.tiempoEntregaDias

    if (dias !== null && itemAnterior.pedido?.fechaNecesaria) {
      const fechaNecesaria = new Date(itemAnterior.pedido.fechaNecesaria)
      fechaOC = new Date(fechaNecesaria)
      fechaOC.setDate(fechaOC.getDate() - dias)
    }

    // 🔧 Actualizar el ítem
    const itemActualizado = await prisma.pedidoEquipoItem.update({
      where: { id },
      data: {
        cantidadPedida: body.cantidadPedida,
        tiempoEntregaDias: body.tiempoEntregaDias ?? itemAnterior.tiempoEntregaDias,
        tiempoEntrega: body.tiempoEntrega ?? itemAnterior.tiempoEntrega,
        fechaOrdenCompraRecomendada: fechaOC,
        estado: body.estado ?? 'pendiente',
        cantidadAtendida: body.cantidadAtendida ?? null,
        comentarioLogistica: body.comentarioLogistica ?? null,
        codigo: body.codigo,
        descripcion: body.descripcion,
        unidad: body.unidad,
      },
    })

    // 🔄 Actualizar acumulado en ListaEquipoItem
    if (itemAnterior.listaEquipoItemId && diferencia !== 0) {
      await prisma.listaEquipoItem.update({
        where: { id: itemAnterior.listaEquipoItemId },
        data: {
          cantidadPedida: { increment: diferencia },
        },
      })
    }

    return NextResponse.json(itemActualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Eliminar un ítem de pedido de equipo por ID
export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    // ✅ Extraer el ID desde los parámetros de la URL
    const { id } = await  context.params
    console.log('🔍 Eliminando PedidoEquipoItem con ID:', id)

    // ✅ Buscar el ítem en la base de datos para validar que existe
    const item = await prisma.pedidoEquipoItem.findUnique({ where: { id } })

    // ⚠️ Si no existe, devolver error 404
    if (!item) {
      return NextResponse.json(
        { error: 'Ítem no encontrado para eliminar' },
        { status: 404 }
      )
    }

    // ✅ Eliminar el ítem de la tabla pedidoEquipoItem
    await prisma.pedidoEquipoItem.delete({ where: { id } })

    // ✅ Si el ítem está vinculado a un ListaEquipoItem, restar la cantidad
    if (item.listaEquipoItemId && item.cantidadPedida && item.cantidadPedida > 0) {
      await prisma.listaEquipoItem.update({
        where: { id: item.listaEquipoItemId },
        data: {
          cantidadPedida: {
            decrement: item.cantidadPedida, // ✅ Resta la cantidad eliminada del total
          },
        },
      })
    }

    // ✅ Confirmar éxito
    return NextResponse.json({ status: 'OK' })

  } catch (error) {
    // ❌ Capturar errores inesperados y devolver error 500
    console.error('❌ Error al eliminar ítem de pedido:', error)
    return NextResponse.json(
      { error: 'Error al eliminar ítem de pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
