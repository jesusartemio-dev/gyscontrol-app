// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-equipo-item/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar o eliminar un ListaEquipoItem con cotización seleccionada extendida
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquipoItemUpdatePayload } from '@/types/payloads'

// ✅ Obtener ítem por ID
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const item = await prisma.ListaEquipoItem.findUnique({
      where: { id },
      include: {
        lista: true,
        proveedor: true,
        cotizacionSeleccionada: true,
        cotizacionSeleccionada: {
          include: {
            cotizacion: {
              include: {
                proveedor: true,
              },
            },
          },
        },
        pedidos: {
          include: {
            pedido: true // ✅ Incluir relación al pedido padre para acceder al código
          }
        },
        ProyectoEquipoCotizadoItem_ProyectoEquipoCotizadoItem_listaEquipoSeleccionadoIdToListaEquipoItem: {
          include: {
            ProyectoEquipoCotizado: true,
          },
        },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Actualizar ítem
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const payload: ListaEquipoItemUpdatePayload = await request.json()

    const dataToUpdate: any = {
      // Nota: categoria field will be added after Prisma client regeneration
      codigo: payload.codigo,
      descripcion: payload.descripcion,
      unidad: payload.unidad,
      cantidad: payload.cantidad,
      verificado: payload.verificado,
      comentarioRevision: payload.categoria ? `CATEGORIA:${payload.categoria}` : payload.comentarioRevision,
      presupuesto: payload.presupuesto,
      precioElegido: payload.precioElegido,
      costoElegido: payload.costoElegido,
      costoPedido: payload.costoPedido,
      costoReal: payload.costoReal,
      cantidadPedida: payload.cantidadPedida,
      cantidadEntregada: payload.cantidadEntregada,
      cotizacionSeleccionadaId: payload.cotizacionSeleccionadaId ?? undefined,
      proyectoEquipoItemId: payload.proyectoEquipoItemId,
      proyectoEquipoId: payload.proyectoEquipoId,
      proveedorId: payload.proveedorId,
      estado: payload.estado,
      reemplazaProyectoEquipoCotizadoItemId: payload.reemplazaProyectoEquipoCotizadoItemId ?? undefined,
    }

    // 🧠 Si hay cotización seleccionada, copiar tiempoEntrega y tiempoEntregaDias
    if (payload.cotizacionSeleccionadaId) {
      const cotizacion = await prisma.CotizacionProveedorItem.findUnique({
        where: { id: payload.cotizacionSeleccionadaId },
        select: {
          tiempoEntrega: true,
          tiempoEntregaDias: true,
        },
      })

      if (cotizacion) {
        dataToUpdate.tiempoEntrega = cotizacion.tiempoEntrega
        dataToUpdate.tiempoEntregaDias = cotizacion.tiempoEntregaDias
      }
    }

    const actualizado = await prisma.ListaEquipoItem.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Actualizar parcialmente un ítem (PATCH para cotización seleccionada)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { cotizacionSeleccionadaId } = await request.json()

    // 🔍 Verificar que el item existe
    const item = await prisma.ListaEquipoItem.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    // 🔍 Si se proporciona cotizacionSeleccionadaId, verificar que existe y pertenece al item
    if (cotizacionSeleccionadaId) {
      const cotizacion = await prisma.CotizacionProveedorItem.findFirst({
        where: {
          id: cotizacionSeleccionadaId,
          listaEquipoItemId: id
        },
        select: {
          id: true,
          tiempoEntrega: true,
          tiempoEntregaDias: true
        }
      })

      if (!cotizacion) {
        return NextResponse.json(
          { error: 'Cotización no encontrada o no pertenece a este ítem' },
          { status: 400 }
        )
      }

      // 🔄 Actualizar el item con la nueva cotización seleccionada
      const actualizado = await prisma.ListaEquipoItem.update({
        where: { id },
        data: {
          cotizacionSeleccionadaId,
          tiempoEntrega: cotizacion.tiempoEntrega,
          tiempoEntregaDias: cotizacion.tiempoEntregaDias
        },
        include: {
          cotizacion_proveedor_item_cotizacion_proveedor_item_listaEquipoItemIdTolista_equipo_item: {
            include: {
              cotizacion_proveedor: {
                include: {
                  proveedores: true
                }
              }
            }
          }
        }
      })

      return NextResponse.json(actualizado)
    }

    // 🚫 Si no se proporciona cotizacionSeleccionadaId, limpiar la selección
    const actualizado = await prisma.ListaEquipoItem.update({
      where: { id },
      data: {
        cotizacionSeleccionadaId: null,
        tiempoEntrega: null,
        tiempoEntregaDias: null
      }
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar la cotización seleccionada: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Eliminar ítem y revertir estado del ProyectoEquipoItem si aplica
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const item = await prisma.ListaEquipoItem.findUnique({
      where: { id },
      include: { proyecto_equipo_cotizado_item_lista_equipo_item_proyectoEquipoItemIdToproyecto_equipo_cotizado_item: true },
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    // 🧯 Desmarcar todas las cotizaciones como seleccionadas
    await prisma.CotizacionProveedorItem.updateMany({
      where: { listaEquipoItemId: id },
      data: { esSeleccionada: false },
    })

    // 🧹 Si el ítem proviene de ProyectoEquipoItem, hacer rollback completo
    if (item.proyectoEquipoItemId) {
      await prisma.ProyectoEquipoCotizadoItem.update({
        where: { id: item.proyectoEquipoItemId },
        data: {
          listaEquipoSeleccionadoId: null,
          listaId: null,
          motivoCambio: null,
          estado: 'pendiente',
          cantidadReal: undefined,
          precioReal: undefined,
          costoReal: undefined,
        },
      })
    }

    const eliminado = await prisma.ListaEquipoItem.delete({
      where: { id },
    })

    return NextResponse.json(eliminado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar el ítem: ' + String(error) },
      { status: 500 }
    )
  }
}
