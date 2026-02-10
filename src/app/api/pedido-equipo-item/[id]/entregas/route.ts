// ===================================================
// 📁 Archivo: entregas/route.ts
// 📌 API para obtener historial de entregas de un item
// 🧠 Uso: Consultar eventos de trazabilidad de entregas
// ✍️ Autor: GYS Team + IA
// 🗕️ Última actualización: 2025-01-17
// ===================================================

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ✅ Obtener historial de entregas de un item
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // 🔍 Verificar que el item existe
    const itemExistente = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        cantidadPedida: true,
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

    if (!itemExistente) {
      return NextResponse.json(
        { error: 'Item de pedido no encontrado' },
        { status: 404 }
      );
    }

    // Query real EntregaItem records with their events
    const entregas = await prisma.entregaItem.findMany({
      where: { pedidoEquipoItemId: id },
      include: {
        eventoTrazabilidad: {
          orderBy: { fechaEvento: 'desc' }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const historialEntregas = entregas.map(entrega => ({
      id: entrega.id,
      estado: entrega.estado,
      descripcion: `Entrega de ${entrega.cantidadEntregada || 0} unidades`,
      fecha: entrega.createdAt,
      cantidadAtendida: entrega.cantidadEntregada || 0,
      fechaEntregaReal: entrega.fechaEntrega,
      observaciones: entrega.observaciones || null,
      usuario: entrega.user?.name || null,
      eventos: entrega.eventoTrazabilidad.map(evt => ({
        id: evt.id,
        tipo: evt.tipo,
        descripcion: evt.descripcion,
        estadoAnterior: evt.estadoAnterior,
        estadoNuevo: evt.estadoNuevo,
        fecha: evt.fechaEvento,
        metadata: evt.metadata
      }))
    }));

    const estadisticas = {
      totalEntregas: entregas.length,
      ultimoEstado: entregas.length > 0 ? entregas[0].estado : null,
      fechaUltimaActualizacion: entregas.length > 0 ? entregas[0].createdAt : null,
      cantidadTotalEntregada: entregas.reduce((total, e) => total + (e.cantidadEntregada || 0), 0)
    };

    const resultado = {
      item: {
        id: itemExistente.id,
        codigo: itemExistente.codigo,
        descripcion: itemExistente.descripcion,
        cantidadPedida: itemExistente.cantidadPedida,
        pedido: itemExistente.pedidoEquipo
      },
      historial: historialEntregas,
      estadisticas
    };

    logger.info('Historial de entregas obtenido exitosamente:', {
      itemId: id,
      totalEntregas: entregas.length
    });

    return NextResponse.json(resultado);
  } catch (error) {
    logger.error('❌ Error al obtener historial de entregas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener historial de entregas' },
      { status: 500 }
    );
  }
}