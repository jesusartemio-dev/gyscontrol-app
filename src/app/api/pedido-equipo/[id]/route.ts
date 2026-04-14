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
import { validarTransicionPedido, getFechasPorTransicionPedido, type EstadoPedidoEquipo } from '@/lib/utils/flujoPedidoEquipo'
import { canDelete } from '@/lib/utils/deleteValidation'

// ✅ Obtener pedido por ID
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.pedidoEquipo.findUnique({
      where: { id },
      include: {
        user: true,
        proyecto: true,
        centroCosto: true,
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
          orderBy: { orden: 'asc' as const },
          include: {
            listaEquipoItem: {
              include: {
                proveedor: true,
                cotizacionSeleccionada: {
                  select: {
                    id: true,
                    precioUnitario: true,
                    tiempoEntrega: true,
                    tiempoEntregaDias: true,
                    cotizacionProveedor: {
                      select: {
                        id: true,
                        codigo: true,
                        moneda: true,
                        tipoCambio: true,
                        proveedor: { select: { nombre: true } },
                      },
                    },
                  },
                },
              },
            },
            proveedor: { select: { id: true, nombre: true } },
            ordenCompraItems: {
              select: {
                id: true,
                ordenCompraId: true,
                cantidad: true,
                ordenCompra: { select: { id: true, numero: true, estado: true } },
              },
            },
            requerimientoMaterialItems: {
              select: {
                id: true,
                hojaDeGastosId: true,
                cantidadSolicitada: true,
                hojaDeGastos: { select: { id: true, numero: true, estado: true } },
              },
            },
            catalogoEquipo: {
              select: {
                precioLogistica: true,
                fechaActualizacion: true,
              },
            },
            recepcionesPendientes: {
              where: { estado: { in: ['pendiente', 'en_almacen', 'rechazado'] } },
              include: {
                ordenCompraItem: {
                  select: {
                    id: true,
                    codigo: true,
                    descripcion: true,
                    cantidad: true,
                    ordenCompra: { select: { numero: true } },
                  },
                },
                requerimientoMaterialItem: {
                  select: {
                    id: true,
                    hojaDeGastos: { select: { numero: true } },
                  },
                },
                confirmadoPor: { select: { name: true } },
                rechazadoPor: { select: { name: true } },
              },
              orderBy: { fechaRecepcion: 'desc' as const },
            },
          },
        },
        ordenesCompra: {
          include: {
            proveedor: { select: { id: true, nombre: true } },
            items: { select: { id: true } },
          },
          orderBy: { createdAt: 'desc' as const },
        },
        eventosTrazabilidad: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { fechaEvento: 'asc' as const },
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
      items: data.pedidoEquipoItem,
      ordenesCompra: data.ordenesCompra,
      eventosTrazabilidad: data.eventosTrazabilidad,
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
        },
        centroCosto: {
          select: { nombre: true }
        }
      }
    })

    if (!pedidoActual) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // Validate state transition using state machine
    if (body.estado && body.estado !== pedidoActual.estado) {
      const userRole = session.user.role || ''
      const resultado = validarTransicionPedido(pedidoActual.estado, body.estado, userRole)
      if (!resultado.valido) {
        return NextResponse.json(
          { error: resultado.error },
          { status: 403 }
        )
      }
      // Auto-set dates based on transition
      const fechasTransicion = getFechasPorTransicionPedido(body.estado as EstadoPedidoEquipo)
      Object.assign(body, fechasTransicion)
    }

    const data = await prisma.pedidoEquipo.update({
      where: { id },
      data: {
        proyectoId: body.proyectoId,
        responsableId: body.responsableId,
        listaId: body.listaId ?? null,
        nombre: body.nombre !== undefined ? (body.nombre || null) : undefined,
        estado: body.estado,
        observacion: body.observacion,
        fechaPedido: body.fechaPedido ? new Date(body.fechaPedido) : undefined,
        fechaNecesaria: body.fechaNecesaria ? new Date(body.fechaNecesaria + 'T00:00:00') : undefined,
        fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada + 'T00:00:00') : null,
        fechaEntregaReal: body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : null,
        updatedAt: new Date(),
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
              proyecto: pedidoActual.proyecto?.nombre ?? pedidoActual.centroCosto?.nombre,
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

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rolesPermitidos = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']
    if (!rolesPermitidos.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Logística no puede eliminar pedidos. Solo el área de Proyectos puede eliminar pedidos.' },
        { status: 403 }
      )
    }

    const deleteCheck = await canDelete('pedidoEquipo', id)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // Cargar pedido con items y OCs para limpieza
    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id },
      select: {
        codigo: true,
        estado: true,
        proyectoId: true,
        pedidoEquipoItem: {
          select: { id: true, listaEquipoItemId: true, cantidadPedida: true },
        },
        ordenesCompra: {
          select: { id: true },
        },
      },
    })

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const itemIds = pedido.pedidoEquipoItem.map(i => i.id)
    const ocIds = pedido.ordenesCompra.map(oc => oc.id)
    const listaItemIds = new Set<string>()
    for (const item of pedido.pedidoEquipoItem) {
      if (item.listaEquipoItemId) listaItemIds.add(item.listaEquipoItemId)
    }

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar EntregaItems vinculados a ítems del pedido (no tiene cascade)
      if (itemIds.length > 0) {
        await tx.entregaItem.deleteMany({
          where: { pedidoEquipoItemId: { in: itemIds } },
        })
      }

      // 2. Desligar CxP (anuladas — las activas ya están bloqueadas por canDelete)
      const cxpOrConditions: object[] = [{ pedidoEquipoId: id }]
      if (ocIds.length > 0) cxpOrConditions.push({ ordenCompraId: { in: ocIds } })
      if (itemIds.length > 0) cxpOrConditions.push({ pedidoEquipoItemId: { in: itemIds } })

      await tx.cuentaPorPagar.updateMany({
        where: { OR: cxpOrConditions },
        data: { pedidoEquipoId: null, pedidoEquipoItemId: null, ordenCompraId: null },
      })

      // 3. Desligar EventoTrazabilidad (preservar registros, limpiar FK)
      await tx.eventoTrazabilidad.updateMany({
        where: { pedidoEquipoId: id },
        data: { pedidoEquipoId: null },
      })

      // 4. Eliminar OCs (cascade: OCI → RecepcionPendiente)
      if (ocIds.length > 0) {
        await tx.ordenCompra.deleteMany({
          where: { id: { in: ocIds } },
        })
      }

      // 5. Decrementar cantidadPedida en ListaEquipoItems
      for (const item of pedido.pedidoEquipoItem) {
        if (item.listaEquipoItemId && item.cantidadPedida > 0) {
          await tx.listaEquipoItem.update({
            where: { id: item.listaEquipoItemId },
            data: { cantidadPedida: { decrement: item.cantidadPedida } },
          })
        }
      }

      // 6. Eliminar PedidoEquipo (cascade: PedidoEquipoItem)
      await tx.pedidoEquipo.delete({ where: { id } })
    })

    // Recalcular cantidadEntregada en ListaEquipoItems afectados
    for (const listaItemId of listaItemIds) {
      try {
        const resultado = await prisma.pedidoEquipoItem.aggregate({
          where: { listaEquipoItemId: listaItemId },
          _sum: { cantidadAtendida: true },
        })
        await prisma.listaEquipoItem.update({
          where: { id: listaItemId },
          data: { cantidadEntregada: resultado._sum.cantidadAtendida || 0 },
        })
      } catch (syncError) {
        console.warn('Error al sincronizar cantidadEntregada tras eliminar pedido:', syncError)
      }
    }

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    console.error('Error al eliminar pedido:', error)
    return NextResponse.json(
      { error: 'Error al eliminar pedido: ' + String(error) },
      { status: 500 }
    )
  }
}

