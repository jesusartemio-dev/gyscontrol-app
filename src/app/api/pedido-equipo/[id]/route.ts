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
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'

// ✅ Obtener pedido por ID
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.pedidoEquipo.findUnique({
      where: { id },
      include: {
        user: true,
        proyecto: true,
        listaEquipo: {
          include: {
            listaEquipoItem: {
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
        pedidoEquipoItem: {
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

    // Transformar para compatibilidad con frontend
    const response = data ? {
      ...data,
      responsable: data.user,
      lista: data.listaEquipo ? {
        ...data.listaEquipo,
        items: data.listaEquipo.listaEquipoItem
      } : null,
      items: data.pedidoEquipoItem
    } : null

    return NextResponse.json(response)
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
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const body: PedidoEquipoUpdatePayload = await req.json()

    // Obtener el pedido actual antes de actualizar para comparar cambios
    const pedidoActual = await prisma.pedidoEquipo.findUnique({
      where: { id },
      select: {
        observacion: true,
        fechaNecesaria: true,
        fechaEntregaEstimada: true,
        estado: true,
        codigo: true,
        proyecto: {
          select: { nombre: true }
        }
      }
    })

    if (!pedidoActual) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const data = await prisma.pedidoEquipo.update({
      where: { id },
      data: {
        proyectoId: body.proyectoId,
        responsableId: body.responsableId,
        listaId: body.listaId ?? null,
        estado: body.estado,
        observacion: body.observacion,
        fechaPedido: body.fechaPedido ? new Date(body.fechaPedido) : undefined,
        fechaNecesaria: body.fechaNecesaria ? new Date(body.fechaNecesaria + 'T00:00:00') : undefined,
        fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada + 'T00:00:00') : null,
        fechaEntregaReal: body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : null,
      },
      include: {
        user: true,
        proyecto: true,
        listaEquipo: true,
        pedidoEquipoItem: {
          include: {
            listaEquipoItem: true,
          },
        },
      },
    })

    // Transformar para compatibilidad con frontend
    const response = {
      ...data,
      responsable: data.user,
      lista: data.listaEquipo,
      items: data.pedidoEquipoItem
    }

    // ✅ Registrar en auditoría
    try {
      // Determinar qué campos cambiaron
      const cambios: Record<string, { anterior: any; nuevo: any }> = {}

      if (body.observacion !== undefined && body.observacion !== pedidoActual.observacion) {
        cambios.observacion = { anterior: pedidoActual.observacion, nuevo: body.observacion }
      }

      if (body.fechaNecesaria !== undefined && body.fechaNecesaria !== pedidoActual.fechaNecesaria?.toISOString().split('T')[0]) {
        cambios.fechaNecesaria = { anterior: pedidoActual.fechaNecesaria?.toISOString().split('T')[0], nuevo: body.fechaNecesaria }
      }

      if (body.fechaEntregaEstimada !== undefined && body.fechaEntregaEstimada !== pedidoActual.fechaEntregaEstimada?.toISOString().split('T')[0]) {
        cambios.fechaEntregaEstimada = { anterior: pedidoActual.fechaEntregaEstimada?.toISOString().split('T')[0], nuevo: body.fechaEntregaEstimada }
      }

      if (body.estado !== undefined && body.estado !== pedidoActual.estado) {
        cambios.estado = { anterior: pedidoActual.estado, nuevo: body.estado }
      }

      if (Object.keys(cambios).length > 0) {
        await prisma.auditLog.create({
          data: {
            id: randomUUID(),
            entidadTipo: 'PEDIDO_EQUIPO',
            entidadId: id,
            accion: 'ACTUALIZAR',
            usuarioId: session.user.id,
            descripcion: `Actualización del pedido ${pedidoActual.codigo}`,
            cambios: JSON.stringify(cambios),
            metadata: JSON.stringify({
              proyecto: pedidoActual.proyecto.nombre,
              codigo: pedidoActual.codigo
            })
          }
        })
      }
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
      // No fallar la actualización por error de auditoría
    }

    return NextResponse.json(response)
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

