// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-equipo-item/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar o eliminar un ListaEquipoItem con cotización seleccionada extendida
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ListaEquipoItemUpdatePayload } from '@/types/payloads'
import { canDelete } from '@/lib/utils/deleteValidation'

// ✅ Obtener ítem por ID
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      include: {
        listaEquipo: true,
        proveedor: true,
        cotizacionSeleccionada: {
          include: {
            cotizacionProveedor: {
              include: {
                proveedor: true,
              },
            },
          },
        },
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: true
          }
        },
        listaEquipoItemSeleccionados: {
          include: {
            proyectoEquipoCotizado: true,
          },
        },
        verificadoPor: {
          select: { id: true, name: true, email: true }
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const payload: ListaEquipoItemUpdatePayload = await request.json()

    // 🔒 Validar permisos según estado de la lista
    const itemCheck = await prisma.listaEquipoItem.findUnique({
      where: { id },
      select: { listaEquipo: { select: { estado: true } } },
    })
    if (!itemCheck) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }
    const estadoLista = itemCheck.listaEquipo.estado
    const soloVerificacion = payload.verificado !== undefined || payload.comentarioRevision !== undefined
    if (estadoLista === 'por_revisar' && !soloVerificacion) {
      return NextResponse.json(
        { error: 'En estado por revisar solo se puede actualizar la verificación y comentarios' },
        { status: 403 }
      )
    }
    if (estadoLista !== 'borrador' && estadoLista !== 'por_revisar') {
      return NextResponse.json(
        { error: 'Solo se pueden editar ítems cuando la lista está en estado borrador o por revisar' },
        { status: 403 }
      )
    }

    const dataToUpdate: any = {
      codigo: payload.codigo,
      descripcion: payload.descripcion,
      categoria: payload.categoria,
      unidad: payload.unidad,
      cantidad: payload.cantidad,
      verificado: payload.verificado,
      comentarioRevision: payload.comentarioRevision,
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
      const cotizacion = await prisma.cotizacionProveedorItem.findUnique({
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

    // 🔍 Trazabilidad: registrar quién verificó y cuándo
    if (payload.verificado === true) {
      dataToUpdate.verificadoPorId = session.user.id
      dataToUpdate.verificadoAt = new Date()
    }
    if (payload.verificado === false) {
      dataToUpdate.verificadoPorId = null
      dataToUpdate.verificadoAt = null
    }

    const actualizado = await prisma.listaEquipoItem.update({
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
    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    // 🔍 Si se proporciona cotizacionSeleccionadaId, verificar que existe y pertenece al item
    if (cotizacionSeleccionadaId) {
      const cotizacion = await prisma.cotizacionProveedorItem.findFirst({
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
      const actualizado = await prisma.listaEquipoItem.update({
        where: { id },
        data: {
          cotizacionSeleccionadaId,
          tiempoEntrega: cotizacion.tiempoEntrega,
          tiempoEntregaDias: cotizacion.tiempoEntregaDias
        },
        include: {
          cotizacionProveedorItems: {
            include: {
              cotizacionProveedor: {
                include: {
                  proveedor: true
                }
              }
            }
          }
        }
      })

      return NextResponse.json(actualizado)
    }

    // 🚫 Si no se proporciona cotizacionSeleccionadaId, limpiar la selección
    const actualizado = await prisma.listaEquipoItem.update({
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
    // 🔐 Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    // 🔒 Solo se puede eliminar si la lista está en estado borrador
    const itemForDelete = await prisma.listaEquipoItem.findUnique({
      where: { id },
      select: { listaEquipo: { select: { estado: true } } },
    })
    if (!itemForDelete) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }
    if (itemForDelete.listaEquipo.estado !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar ítems cuando la lista está en estado borrador' },
        { status: 403 }
      )
    }

    // 🛡️ Validar dependientes antes de eliminar
    const deleteCheck = await canDelete('listaEquipoItem', id)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      include: { proyectoEquipoItem: true },
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    // 🧯 Desmarcar todas las cotizaciones como seleccionadas
    await prisma.cotizacionProveedorItem.updateMany({
      where: { listaEquipoItemId: id },
      data: { esSeleccionada: false },
    })

    // 🧹 Si el ítem proviene de ProyectoEquipoItem, hacer rollback completo
    if (item.proyectoEquipoItemId) {
      await prisma.proyectoEquipoCotizadoItem.update({
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

    const eliminado = await prisma.listaEquipoItem.delete({
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
