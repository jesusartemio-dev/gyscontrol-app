// ===================================================
// 📁 Archivo: entrega/route.ts
// 📌 API para gestionar entregas de items de pedidos de equipo
// 🧠 Uso: Registrar, actualizar y consultar entregas específicas
// ✍️ Autor: GYS Team + IA
// 🗕️ Última actualización: 2025-01-17
// ===================================================

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { EntregaItemSchema } from '@/lib/validators/trazabilidad';
import type { EntregaItemPayload } from '@/lib/validators/trazabilidad';
import { logger } from '@/lib/logger';

// ✅ Registrar nueva entrega
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body: EntregaItemPayload = await request.json();

    // 🔍 Validar datos de entrada
    const validationResult = EntregaItemSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('❌ Datos de entrega inválidos:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Datos de entrega inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // 🔍 Verificar que el item existe
    const itemExistente = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: {
        pedidoEquipo: {
          select: {
            id: true,
            codigo: true,
            proyectoId: true,
            proyecto: { select: { nombre: true } }
          }
        }
      }
    });

    if (!itemExistente) {
      return NextResponse.json(
        { error: 'Item de pedido no encontrado' },
        { status: 404 }
      );
    }

    // Auto-sync estado from estadoEntrega
    const estadoEntrega = validationResult.data.estadoEntrega
    let estadoDerivado: 'pendiente' | 'atendido' | 'parcial' | 'entregado' | 'cancelado' | undefined = undefined
    if (estadoEntrega === 'entregado') estadoDerivado = 'entregado'
    else if (estadoEntrega === 'parcial') estadoDerivado = 'parcial'
    else if (estadoEntrega === 'cancelado') estadoDerivado = 'cancelado'
    else if (estadoEntrega === 'en_proceso') estadoDerivado = 'atendido'

    // 🔄 Actualizar el item con los datos de entrega (dentro de transacción)
    const itemActualizado = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.pedidoEquipoItem.update({
        where: { id },
        data: {
          cantidadAtendida: validationResult.data.cantidadAtendida,
          estadoEntrega: validationResult.data.estadoEntrega,
          fechaEntregaReal: validationResult.data.fechaEntregaReal,
          observacionesEntrega: validationResult.data.observacionesEntrega,
          comentarioLogistica: validationResult.data.comentarioLogistica,
          ...(estadoDerivado ? { estado: estadoDerivado } : {}),
          updatedAt: new Date()
        },
        include: {
          pedidoEquipo: {
            select: {
              codigo: true,
              proyecto: {
                select: { nombre: true }
              }
            }
          }
        }
      });

      // Calculate costoReal = precioUnitario * cantidadAtendida
      const precioUnitario = itemExistente.precioUnitario || 0
      const cantidadAtendida = validationResult.data.cantidadAtendida || 0

      // Update costoReal on the ListaEquipoItem by summing all related pedido items
      if (itemExistente.listaEquipoItemId) {
        const sumResult = await tx.pedidoEquipoItem.aggregate({
          where: { listaEquipoItemId: itemExistente.listaEquipoItemId },
          _sum: { cantidadAtendida: true }
        })
        // Also get all items to calculate weighted costoReal
        const allLinkedItems = await tx.pedidoEquipoItem.findMany({
          where: { listaEquipoItemId: itemExistente.listaEquipoItemId },
          select: { precioUnitario: true, cantidadAtendida: true }
        })
        const costoReal = allLinkedItems.reduce((sum, item) =>
          sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)

        await tx.listaEquipoItem.update({
          where: { id: itemExistente.listaEquipoItemId },
          data: {
            costoReal,
            cantidadEntregada: sumResult._sum.cantidadAtendida || 0
          }
        })
      }

      // Recalculate PedidoEquipo.costoRealTotal
      const allPedidoItems = await tx.pedidoEquipoItem.findMany({
        where: { pedidoId: itemExistente.pedidoEquipo.id },
        select: { precioUnitario: true, cantidadAtendida: true }
      })
      const costoRealTotal = allPedidoItems.reduce((sum, item) =>
        sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)

      await tx.pedidoEquipo.update({
        where: { id: itemExistente.pedidoEquipo.id },
        data: { costoRealTotal, updatedAt: new Date() }
      })

      // Create EntregaItem record
      const entregaItemId = `ent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const entregaItem = await tx.entregaItem.create({
        data: {
          id: entregaItemId,
          pedidoEquipoItemId: id,
          listaEquipoItemId: itemExistente.listaEquipoItemId || null,
          proyectoId: itemExistente.pedidoEquipo.proyectoId,
          fechaEntrega: validationResult.data.fechaEntregaReal || new Date(),
          estado: validationResult.data.estadoEntrega as any,
          cantidad: itemExistente.cantidadPedida || 0,
          cantidadEntregada: validationResult.data.cantidadAtendida || 0,
          observaciones: validationResult.data.observacionesEntrega || null,
          usuarioId: null, // No session available in this route currently
          updatedAt: new Date()
        }
      })

      // Create EventoTrazabilidad record
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entregaItemId: entregaItemId,
          proyectoId: itemExistente.pedidoEquipo.proyectoId,
          tipo: 'ENTREGA',
          descripcion: `Entrega registrada: ${validationResult.data.cantidadAtendida} unidades - ${validationResult.data.estadoEntrega}`,
          estadoAnterior: itemExistente.estadoEntrega as any || null,
          estadoNuevo: validationResult.data.estadoEntrega as any,
          usuarioId: 'system', // No session in this route
          metadata: {
            cantidadAtendida: validationResult.data.cantidadAtendida,
            fechaEntregaReal: validationResult.data.fechaEntregaReal?.toISOString(),
            observaciones: validationResult.data.observacionesEntrega,
            comentarioLogistica: validationResult.data.comentarioLogistica,
            pedidoCodigo: itemExistente.pedidoEquipo.codigo,
            proyectoNombre: itemExistente.pedidoEquipo.proyecto.nombre
          },
          updatedAt: new Date()
        }
      })

      // Auto-derive parent pedido state
      const allItems = await tx.pedidoEquipoItem.findMany({
        where: { pedidoId: itemExistente.pedidoEquipo.id },
        select: { estado: true }
      })
      const estados = allItems.map(i => i.estado)
      let nuevoEstadoPedido: 'borrador' | 'enviado' | 'atendido' | 'parcial' | 'entregado' | 'cancelado' | null = null
      if (estados.every(e => e === 'cancelado')) {
        nuevoEstadoPedido = 'cancelado'
      } else if (estados.every(e => e === 'entregado' || e === 'cancelado')) {
        nuevoEstadoPedido = 'entregado'
      } else if (estados.some(e => e !== 'pendiente' && e !== 'cancelado')) {
        nuevoEstadoPedido = 'parcial'
      }
      if (nuevoEstadoPedido) {
        await tx.pedidoEquipo.update({
          where: { id: itemExistente.pedidoEquipo.id },
          data: { estado: nuevoEstadoPedido, updatedAt: new Date() }
        })
      }

      return updatedItem
    });

    // 📝 Log de trazabilidad
    logger.info('Entrega registrada', {
      pedidoEquipoItemId: id,
      estado: validationResult.data.estadoEntrega,
      descripcion: `Entrega registrada: ${validationResult.data.cantidadAtendida} unidades`,
      metadata: {
        cantidadAtendida: validationResult.data.cantidadAtendida,
        fechaEntregaReal: validationResult.data.fechaEntregaReal?.toISOString(),
        observaciones: validationResult.data.observacionesEntrega,
        comentarioLogistica: validationResult.data.comentarioLogistica
      }
    });

    logger.info('✅ Entrega registrada exitosamente:', {
      itemId: id,
      estadoEntrega: validationResult.data.estadoEntrega,
      cantidadAtendida: validationResult.data.cantidadAtendida
    });

    return NextResponse.json(itemActualizado);
  } catch (error) {
    logger.error('❌ Error al registrar entrega:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al registrar entrega' },
      { status: 500 }
    );
  }
}

// ✅ Actualizar entrega existente
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body: Partial<EntregaItemPayload> = await request.json();

    // 🔍 Verificar que el item existe
    const itemExistente = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      select: {
        id: true,
        estadoEntrega: true,
        cantidadAtendida: true
      }
    });

    if (!itemExistente) {
      return NextResponse.json(
        { error: 'Item de pedido no encontrado' },
        { status: 404 }
      );
    }

    // 🔄 Preparar datos para actualización
    const datosActualizacion: any = {
      updatedAt: new Date()
    };

    if (body.cantidadAtendida !== undefined) {
      datosActualizacion.cantidadAtendida = body.cantidadAtendida;
    }
    if (body.estadoEntrega !== undefined) {
      datosActualizacion.estadoEntrega = body.estadoEntrega;
    }
    if (body.fechaEntregaReal !== undefined) {
      datosActualizacion.fechaEntregaReal = body.fechaEntregaReal;
    }
    if (body.observacionesEntrega !== undefined) {
      datosActualizacion.observacionesEntrega = body.observacionesEntrega;
    }
    if (body.comentarioLogistica !== undefined) {
      datosActualizacion.comentarioLogistica = body.comentarioLogistica;
    }

    // Auto-sync estado from estadoEntrega
    if (body.estadoEntrega) {
      if (body.estadoEntrega === 'entregado') datosActualizacion.estado = 'entregado'
      else if (body.estadoEntrega === 'parcial') datosActualizacion.estado = 'parcial'
      else if (body.estadoEntrega === 'cancelado') datosActualizacion.estado = 'cancelado'
      else if (body.estadoEntrega === 'en_proceso') datosActualizacion.estado = 'atendido'
    }

    // 🔄 Actualizar el item
    const itemActualizado = await prisma.pedidoEquipoItem.update({
      where: { id },
      data: datosActualizacion,
      include: {
        pedidoEquipo: {
          select: {
            codigo: true,
            proyecto: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    // 📝 Log de trazabilidad si cambió el estado (modelo no disponible)
    if (body.estadoEntrega && body.estadoEntrega !== itemExistente.estadoEntrega) {
      logger.info('Estado de entrega actualizado', {
        pedidoEquipoItemId: id,
        estado: body.estadoEntrega,
        descripcion: `Estado actualizado de ${itemExistente.estadoEntrega} a ${body.estadoEntrega}`,
        metadata: {
          estadoAnterior: itemExistente.estadoEntrega,
          estadoNuevo: body.estadoEntrega,
          cantidadAtendida: body.cantidadAtendida || itemExistente.cantidadAtendida,
          observaciones: body.observacionesEntrega
        }
      });
    }

    logger.info('✅ Entrega actualizada exitosamente:', {
      itemId: id,
      cambios: Object.keys(datosActualizacion)
    });

    return NextResponse.json(itemActualizado);
  } catch (error) {
    logger.error('❌ Error al actualizar entrega:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar entrega' },
      { status: 500 }
    );
  }
}

// ✅ Obtener estado actual de entrega
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const item = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      select: {
        id: true,
        cantidadPedida: true,
        cantidadAtendida: true,
        estadoEntrega: true,
        fechaEntregaReal: true,
        fechaEntregaEstimada: true,
        observacionesEntrega: true,
        comentarioLogistica: true,
        codigo: true,
        descripcion: true,
        unidad: true,
        pedidoEquipo: {
          select: {
            codigo: true,
            proyecto: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item de pedido no encontrado' },
        { status: 404 }
      );
    }

    // 📊 Calcular progreso de entrega
    const progreso = item.cantidadPedida > 0 
      ? Math.round(((item.cantidadAtendida || 0) / item.cantidadPedida) * 100)
      : 0;

    const resultado = {
      ...item,
      progresoEntrega: progreso,
      cantidadPendiente: item.cantidadPedida - (item.cantidadAtendida || 0)
    };

    return NextResponse.json(resultado);
  } catch (error) {
    logger.error('❌ Error al obtener estado de entrega:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener estado de entrega' },
      { status: 500 }
    );
  }
}