// ===================================================
// 📁 Archivo: [id]/seleccionar-cotizacion/route.ts
// 📌 Descripción: Selecciona una cotización ganadora para un ítem (ListaEquipoItem)
// 📌 Efecto: Marca una cotización como seleccionada, desmarca las otras, y actualiza datos clave del ítem
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { cotizacionProveedorItemId } = await req.json()

    // 🔄 Paso 1: desmarcar todas las cotizaciones previas del ítem
    await prisma.cotizacionProveedorItem.updateMany({
      where: { listaEquipoItemId: id },
      data: { esSeleccionada: false },
    })

    // ✅ Verificar si es una deselección (cotizacionProveedorItemId es null)
    if (cotizacionProveedorItemId === null) {
      // 📝 Paso 2: actualizar el ListaEquipoItem limpiando la selección (incluyendo proveedor)
      const updatedItem = await prisma.listaEquipoItem.update({
        where: { id },
        data: {
          cotizacionSeleccionadaId: null,
          precioElegido: null,
          costoElegido: 0,
          tiempoEntrega: null,
          tiempoEntregaDias: null,
          proveedorId: null, // ✅ Limpiar el proveedor al deseleccionar
        },
      })
  
      // 🔄 Paso 3: limpiar precios en pedidos existentes que referencian este ítem
      // Buscar todos los PedidoEquipoItem que referencian este ListaEquipoItem
      const pedidosAfectados = await prisma.pedidoEquipoItem.findMany({
        where: { listaEquipoItemId: id },
        include: {
          pedidoEquipo: {
            select: { id: true, codigo: true, proyecto: { select: { nombre: true } } }
          }
        }
      })
  
      // Limpiar precios en cada pedido afectado (volver a 0 o null)
      const pedidosActualizados = []
      for (const pedidoItem of pedidosAfectados) {
        await prisma.pedidoEquipoItem.update({
          where: { id: pedidoItem.id },
          data: {
            precioUnitario: 0, // O null, dependiendo de la lógica de negocio
            costoTotal: 0,
            tiempoEntrega: null,
            tiempoEntregaDias: null,
          },
        })
  
        pedidosActualizados.push({
          pedidoId: pedidoItem.pedidoEquipo.id,
          pedidoCodigo: pedidoItem.pedidoEquipo.codigo,
          proyectoNombre: pedidoItem.pedidoEquipo.proyecto.nombre,
          itemId: pedidoItem.id,
          precioAnterior: pedidoItem.precioUnitario,
          precioNuevo: 0,
          costoTotalNuevo: 0,
          accion: 'deseleccion'
        })
      }
  
      // 📊 Paso 4: recalcular totales de pedidos afectados
      const pedidosIds = [...new Set(pedidosAfectados.map(p => p.pedidoEquipo.id))]
      for (const pedidoId of pedidosIds) {
        // Recalcular presupuestoTotal del pedido basado en sus items
        const itemsPedido = await prisma.pedidoEquipoItem.findMany({
          where: { pedidoId },
          select: { costoTotal: true }
        })
  
        const nuevoPresupuestoTotal = itemsPedido.reduce((sum, item) => sum + (item.costoTotal || 0), 0)
  
        await prisma.pedidoEquipo.update({
          where: { id: pedidoId },
          data: { presupuestoTotal: nuevoPresupuestoTotal }
        })
      }
  
      // 🎉 Listo - deselección completada
      return NextResponse.json({
        listaItem: updatedItem,
        pedidosActualizados: pedidosActualizados,
        estadisticas: {
          pedidosAfectados: pedidosIds.length,
          itemsActualizados: pedidosActualizados.length,
          accion: 'deseleccion'
        }
      })
    }

    // ✅ Es una selección normal - buscar la cotización seleccionada con su proveedor
    const cotizacionItem = await prisma.cotizacionProveedorItem.findUnique({
      where: { id: cotizacionProveedorItemId },
      include: {
        cotizacionProveedor: {
          select: { proveedorId: true }
        }
      }
    })

    // 🚫 Validación: que la cotización exista y pertenezca al ítem solicitado
    if (!cotizacionItem || cotizacionItem.listaEquipoItemId !== id) {
      return NextResponse.json(
        { error: 'Cotización no válida para este ítem' },
        { status: 400 }
      )
    }

    // ✅ Paso 2: marcar como seleccionada la cotización elegida
    await prisma.cotizacionProveedorItem.update({
      where: { id: cotizacionProveedorItemId },
      data: { esSeleccionada: true },
    })

    // 🧮 Paso 3: calcular precio y costo total (unitario × cantidad)
    const precioUnitario = cotizacionItem.precioUnitario ?? 0
    const cantidad = cotizacionItem.cantidad ?? cotizacionItem.cantidadOriginal ?? 0
    const costoElegido = precioUnitario * cantidad

    // 📦 Paso 4: obtener datos adicionales como tiempo de entrega (default: Stock)
    const tiempoEntrega = cotizacionItem.tiempoEntrega || 'Stock'
    const tiempoEntregaDias = cotizacionItem.tiempoEntregaDias ?? 0

    // 📝 Paso 5: actualizar el ListaEquipoItem con la información final (incluyendo proveedor)
    const proveedorId = cotizacionItem.cotizacionProveedor?.proveedorId ?? null
    const updatedItem = await prisma.listaEquipoItem.update({
      where: { id },
      data: {
        cotizacionSeleccionadaId: cotizacionProveedorItemId,
        precioElegido: precioUnitario,
        costoElegido,
        tiempoEntrega,
        tiempoEntregaDias,
        proveedorId, // ✅ Actualizar el proveedor del ítem
      },
    })

    // 🔄 Paso 6: actualizar pedidos existentes que referencian este ítem
    // Buscar todos los PedidoEquipoItem que referencian este ListaEquipoItem
    const pedidosAfectados = await prisma.pedidoEquipoItem.findMany({
      where: { listaEquipoItemId: id },
      include: {
        pedidoEquipo: {
          select: { id: true, codigo: true, proyecto: { select: { nombre: true } } }
        }
      }
    })

    // Actualizar cada pedido afectado con los nuevos precios
    const pedidosActualizados = []
    for (const pedidoItem of pedidosAfectados) {
      const nuevoCostoTotal = precioUnitario * pedidoItem.cantidadPedida

      await prisma.pedidoEquipoItem.update({
        where: { id: pedidoItem.id },
        data: {
          precioUnitario: precioUnitario,
          costoTotal: nuevoCostoTotal,
          tiempoEntrega: tiempoEntrega,
          tiempoEntregaDias: tiempoEntregaDias,
        },
      })

      pedidosActualizados.push({
        pedidoId: pedidoItem.pedidoEquipo.id,
        pedidoCodigo: pedidoItem.pedidoEquipo.codigo,
        proyectoNombre: pedidoItem.pedidoEquipo.proyecto.nombre,
        itemId: pedidoItem.id,
        precioAnterior: pedidoItem.precioUnitario,
        precioNuevo: precioUnitario,
        costoTotalNuevo: nuevoCostoTotal
      })
    }

    // 📊 Paso 7: recalcular totales de pedidos afectados
    const pedidosIds = [...new Set(pedidosAfectados.map(p => p.pedidoEquipo.id))]
    for (const pedidoId of pedidosIds) {
      // Recalcular presupuestoTotal del pedido basado en sus items
      const itemsPedido = await prisma.pedidoEquipoItem.findMany({
        where: { pedidoId },
        select: { costoTotal: true }
      })

      const nuevoPresupuestoTotal = itemsPedido.reduce((sum, item) => sum + (item.costoTotal || 0), 0)

      await prisma.pedidoEquipo.update({
        where: { id: pedidoId },
        data: { presupuestoTotal: nuevoPresupuestoTotal }
      })
    }

    // 🎉 Listo - devolver información completa de la operación
    return NextResponse.json({
      listaItem: updatedItem,
      pedidosActualizados: pedidosActualizados,
      estadisticas: {
        pedidosAfectados: pedidosIds.length,
        itemsActualizados: pedidosActualizados.length
      }
    })
  } catch (error) {
    console.error('❌ Error al seleccionar cotización:', error)
    return NextResponse.json(
      { error: 'Error al seleccionar cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

// 🔁 POST reutiliza el PATCH por compatibilidad (en caso de ser usado como formulario)
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(req, context)
}
