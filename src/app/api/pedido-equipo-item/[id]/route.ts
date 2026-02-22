// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 API para ver, editar o eliminar un ítem de pedido de equipo
// 🧠 Uso: Actualiza entrega, costos, comentarios desde logística
// ✍️ Autor: Jesús Artemio + IA GYS
// 🗕️ Última actualización: 2025-07-17
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { PedidoEquipoItemUpdatePayload } from '@/types'
import { sincronizarCantidadPedida, recalcularCantidadPedida } from '@/lib/utils/cantidadPedidaValidator'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: {
        pedidoEquipo: {
          include: {
            proyecto: true,
            user: true,
          },
        },
        listaEquipoItem: {
          include: {
            proveedor: true,
            cotizacionSeleccionada: {
              include: {
                cotizacionProveedor: {
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
        comentarioLogisticaPor: {
          select: { id: true, name: true, email: true }
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body: PedidoEquipoItemUpdatePayload = await request.json()

    // 🔍 Buscar el ítem anterior
    const itemAnterior = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: { pedidoEquipo: true },
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

    if (dias !== null && itemAnterior.pedidoEquipo?.fechaNecesaria) {
      const fechaNecesaria = new Date(itemAnterior.pedidoEquipo.fechaNecesaria)
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

    // Auto-sync estado from estadoEntrega
    if (body.estadoEntrega) {
      if (body.estadoEntrega === 'entregado') body.estado = 'entregado'
      else if (body.estadoEntrega === 'parcial') body.estado = 'parcial'
      else if (body.estadoEntrega === 'cancelado') body.estado = 'cancelado'
      else if (body.estadoEntrega === 'en_proceso') body.estado = 'atendido'
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
         // 🔍 Trazabilidad: registrar quién escribió el comentario logístico
         ...(body.comentarioLogistica !== undefined ? {
           comentarioLogisticaPorId: session.user.id,
           comentarioLogisticaAt: new Date(),
         } : {}),
         // 🏪 Proveedor
         ...(body.proveedorId !== undefined ? { proveedorId: body.proveedorId || null } : {}),
         ...(body.proveedorNombre !== undefined ? { proveedorNombre: body.proveedorNombre || null } : {}),
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

    // 🔄 Sync cantidadEntregada + costoReal en ListaEquipoItem cuando cambia cantidadAtendida
    if (body.cantidadAtendida !== undefined && itemAnterior.listaEquipoItemId) {
      try {
        // Recalcular sumando todas las cantidadAtendida de PedidoEquipoItems vinculados
        const resultado = await prisma.pedidoEquipoItem.aggregate({
          where: { listaEquipoItemId: itemAnterior.listaEquipoItemId },
          _sum: { cantidadAtendida: true },
        })
        // Also sync costoReal
        const allLinkedItems = await prisma.pedidoEquipoItem.findMany({
          where: { listaEquipoItemId: itemAnterior.listaEquipoItemId },
          select: { precioUnitario: true, cantidadAtendida: true }
        })
        const costoReal = allLinkedItems.reduce((sum, item) =>
          sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)

        await prisma.listaEquipoItem.update({
          where: { id: itemAnterior.listaEquipoItemId },
          data: {
            cantidadEntregada: resultado._sum.cantidadAtendida || 0,
            costoReal
          },
        })
      } catch (syncError) {
        console.warn('⚠️ Error al sincronizar cantidadEntregada:', syncError)
      }
    }

    // 🔄 Recalculate PedidoEquipo.costoRealTotal
    if ((body.cantidadAtendida !== undefined || body.precioUnitario !== undefined) && itemAnterior.pedidoEquipo) {
      try {
        const allPedidoItems = await prisma.pedidoEquipoItem.findMany({
          where: { pedidoId: itemAnterior.pedidoEquipo.id },
          select: { precioUnitario: true, cantidadAtendida: true }
        })
        const costoRealTotal = allPedidoItems.reduce((sum, item) =>
          sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)
        await prisma.pedidoEquipo.update({
          where: { id: itemAnterior.pedidoEquipo.id },
          data: { costoRealTotal, updatedAt: new Date() }
        })
      } catch (costoError) {
        console.warn('⚠️ Error al recalcular costoRealTotal:', costoError)
      }
    }

    // 🔄 Auto-derivar estado del pedido padre basado en estados de todos sus items
    if (body.estado && itemAnterior.pedidoEquipo) {
      try {
        const allItems = await prisma.pedidoEquipoItem.findMany({
          where: { pedidoId: itemAnterior.pedidoEquipo.id },
          select: { estado: true },
        })

        const estados = allItems.map(i => i.estado)
        let nuevoEstadoPedido: 'parcial' | 'entregado' | 'cancelado' | null = null

        if (estados.length > 0) {
          if (estados.every(e => e === 'cancelado')) {
            nuevoEstadoPedido = 'cancelado'
          } else if (estados.every(e => e === 'entregado' || e === 'cancelado')) {
            nuevoEstadoPedido = 'entregado'
          } else if (estados.some(e => e !== 'pendiente' && e !== 'cancelado')) {
            nuevoEstadoPedido = 'parcial'
          }
        }

        // Solo actualizar si hay un nuevo estado derivado y es diferente al actual
        if (nuevoEstadoPedido) {
          await prisma.pedidoEquipo.update({
            where: { id: itemAnterior.pedidoEquipo.id },
            data: { estado: nuevoEstadoPedido, updatedAt: new Date() },
          })
        }
      } catch (derivarError) {
        console.warn('⚠️ Error al derivar estado del pedido:', derivarError)
      }
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

      // 🔄 Recalcular cantidadEntregada sumando items restantes
      try {
        const resultado = await prisma.pedidoEquipoItem.aggregate({
          where: { listaEquipoItemId: item.listaEquipoItemId },
          _sum: { cantidadAtendida: true },
        })
        await prisma.listaEquipoItem.update({
          where: { id: item.listaEquipoItemId },
          data: { cantidadEntregada: resultado._sum.cantidadAtendida || 0 },
        })
      } catch (syncError) {
        console.warn('⚠️ Error al sincronizar cantidadEntregada tras eliminar:', syncError)
      }
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
