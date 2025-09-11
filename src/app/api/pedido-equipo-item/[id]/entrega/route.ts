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
        pedido: {
          select: {
            id: true,
            codigo: true,
            proyecto: {
              select: { nombre: true }
            }
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

    // 🔄 Actualizar el item con los datos de entrega
    const itemActualizado = await prisma.pedidoEquipoItem.update({
      where: { id },
      data: {
        cantidadAtendida: validationResult.data.cantidadAtendida,
        estadoEntrega: validationResult.data.estadoEntrega,
        fechaEntregaReal: validationResult.data.fechaEntregaReal,
        observacionesEntrega: validationResult.data.observacionesEntrega,
        comentarioLogistica: validationResult.data.comentarioLogistica,
        updatedAt: new Date()
      },
      include: {
        pedido: {
          select: {
            codigo: true,
            proyecto: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    // 📝 Log de trazabilidad (modelo no disponible)
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

    // 🔄 Actualizar el item
    const itemActualizado = await prisma.pedidoEquipoItem.update({
      where: { id },
      data: datosActualizacion,
      include: {
        pedido: {
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
        pedido: {
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