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
import { sincronizarCantidadPedida, recalcularCantidadPedida } from '@/lib/utils/cantidadPedidaValidator'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

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
            cotizacionSeleccionada: {
              include: {
                cotizacion: {
                  select: {
                    id: true,
                    codigo: true,
                    proveedor: {
                      select: { nombre: true },
                    },
                  },
                },
              },
            },
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
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
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

    // 🔄 Validar y actualizar cantidadPedida en ListaEquipoItem si hay diferencia
    if (diferencia !== 0 && itemAnterior.listaEquipoItemId) {
      const operacion = diferencia > 0 ? 'increment' : 'decrement'
      const cantidadOperacion = Math.abs(diferencia)
      
      const resultado = await sincronizarCantidadPedida(
        itemAnterior.listaEquipoItemId,
        operacion,
        cantidadOperacion
      )

      if (!resultado.exito) {
        console.warn('⚠️ Advertencia al actualizar cantidadPedida:', resultado.mensaje)
        // 🔄 Recalcular desde cero para corregir inconsistencias
        await recalcularCantidadPedida(itemAnterior.listaEquipoItemId)
      }
    }

    // 🔧 Actualizar el ítem
    const itemActualizado = await prisma.pedidoEquipoItem.update({ 
       where: { id }, 
       data: { 
         cantidadPedida: body.cantidadPedida, 
         cantidadAtendida: body.cantidadAtendida, 
         precioUnitario: body.precioUnitario, 
         costoTotal: body.costoTotal, 
         tiempoEntrega: body.tiempoEntrega, 
         tiempoEntregaDias: body.tiempoEntregaDias, 
         fechaOrdenCompraRecomendada: fechaOC, 
         estado: body.estado, 
         comentarioLogistica: body.comentarioLogistica,
         // 🚚 Campos de trazabilidad de entregas
         fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada) : undefined,
         fechaEntregaReal: body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : undefined,
         estadoEntrega: body.estadoEntrega,
         observacionesEntrega: body.observacionesEntrega,
       }, 
     })

    // 🔄 Recalcular cantidadPedida después de actualizar para asegurar consistencia
    if (itemAnterior.listaEquipoItemId) {
      await recalcularCantidadPedida(itemAnterior.listaEquipoItemId)
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
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
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

    // ✅ Si el ítem está vinculado a un ListaEquipoItem, validar y actualizar cantidad
    if (item.listaEquipoItemId && item.cantidadPedida && item.cantidadPedida > 0) {
      // ✅ Usar sincronización segura para decrementar
      const resultado = await sincronizarCantidadPedida(
        item.listaEquipoItemId,
        'decrement',
        item.cantidadPedida
      )

      if (!resultado.exito) {
        console.warn('⚠️ Advertencia al decrementar cantidadPedida:', resultado.mensaje)
        // 🔄 Recalcular desde cero para corregir inconsistencias
        await recalcularCantidadPedida(item.listaEquipoItemId)
      }
    }

    // ✅ Eliminar el ítem de la tabla pedidoEquipoItem
    await prisma.pedidoEquipoItem.delete({ where: { id } })

    // 🔄 Recalcular cantidadPedida después de eliminar para asegurar consistencia
    if (item.listaEquipoItemId) {
      await recalcularCantidadPedida(item.listaEquipoItemId)
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
