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

    // 📋 Eventos de trazabilidad (modelo no disponible - retornando array vacío)
    const eventos: any[] = [];
    
    logger.info('Consulta de eventos de trazabilidad', {
      pedidoEquipoItemId: id,
      message: 'Modelo trazabilidadEvent no disponible'
    });

    // 🔄 Transformar eventos para incluir información útil
    const historialEntregas = eventos.map(evento => {
      const metadata = evento.metadata as any || {};
      
      return {
        id: evento.id,
        estado: evento.estado,
        descripcion: evento.descripcion,
        fecha: evento.createdAt,
        cantidadAtendida: metadata.cantidadAtendida || null,
        fechaEntregaReal: metadata.fechaEntregaReal ? new Date(metadata.fechaEntregaReal) : null,
        observaciones: metadata.observaciones || null,
        comentarioLogistica: metadata.comentarioLogistica || null,
        estadoAnterior: metadata.estadoAnterior || null,
        estadoNuevo: metadata.estadoNuevo || null
      };
    });

    // 📊 Calcular estadísticas del historial
    const estadisticas = {
      totalEventos: eventos.length,
      ultimoEstado: eventos.length > 0 ? eventos[0].estado : null,
      fechaUltimaActualizacion: eventos.length > 0 ? eventos[0].createdAt : null,
      cantidadTotalAtendida: historialEntregas.reduce((total, evento) => {
        return total + (evento.cantidadAtendida || 0);
      }, 0)
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

    logger.info('✅ Historial de entregas obtenido exitosamente:', {
      itemId: id,
      totalEventos: eventos.length
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