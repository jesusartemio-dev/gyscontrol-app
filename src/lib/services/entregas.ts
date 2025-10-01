// ===================================================
// 📁 Archivo: entregas.ts
// 📌 Servicio para gestión de entregas de items de pedidos
// 🧠 Uso: Conecta EntregaItemForm con APIs de entrega
// ✍️ Autor: GYS Team + IA
// 🗕️ Última actualización: 2025-01-17
// ===================================================

import { logger } from '@/lib/logger';
import type { EntregaItemPayload } from '@/lib/validators/trazabilidad';
import { EstadoEntregaItem } from '@/types/modelos';

// ============================
// 🔧 CONFIGURACIÓN BASE
// ============================

const BASE_URL = '/api';

const fetchConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// ============================
// 📡 FUNCIONES DE SERVICIO
// ============================

/**
 * Registra una nueva entrega para un item de pedido
 * @param data - Datos de la entrega a registrar
 * @returns Promise con el resultado de la operación
 */
export async function registrarEntrega(data: EntregaItemPayload) {
  try {
    logger.info('🚀 Registrando entrega:', { pedidoEquipoItemId: data.pedidoEquipoItemId });
    
    const response = await fetch(`${BASE_URL}/pedido-equipo-item/${data.pedidoEquipoItemId}/entrega`, {
      method: 'POST',
      ...fetchConfig,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const resultado = await response.json();
    logger.info('✅ Entrega registrada exitosamente:', { id: resultado.id });
    
    return resultado;
  } catch (error) {
    logger.error('❌ Error al registrar entrega:', error);
    throw error;
  }
}

/**
 * Actualiza una entrega existente
 * @param pedidoEquipoItemId - ID del item del pedido
 * @param data - Datos actualizados de la entrega
 * @returns Promise con el resultado de la operación
 */
export async function actualizarEntrega(pedidoEquipoItemId: string, data: Partial<EntregaItemPayload>) {
  try {
    logger.info('🔄 Actualizando entrega:', { pedidoEquipoItemId });
    
    const response = await fetch(`${BASE_URL}/pedido-equipo-item/${pedidoEquipoItemId}/entrega`, {
      method: 'PUT',
      ...fetchConfig,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const resultado = await response.json();
    logger.info('✅ Entrega actualizada exitosamente:', { id: resultado.id });
    
    return resultado;
  } catch (error) {
    logger.error('❌ Error al actualizar entrega:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de entregas de un item
 * @param pedidoEquipoItemId - ID del item del pedido
 * @returns Promise con el historial de entregas
 */
export async function obtenerHistorialEntregas(pedidoEquipoItemId: string) {
  try {
    logger.info('📋 Obteniendo historial de entregas:', { pedidoEquipoItemId });
    
    const response = await fetch(`${BASE_URL}/pedido-equipo-item/${pedidoEquipoItemId}/entregas`, {
      method: 'GET',
      ...fetchConfig,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const historial = await response.json();
    logger.info('✅ Historial obtenido exitosamente:', { cantidad: historial.length });
    
    return historial;
  } catch (error) {
    logger.error('❌ Error al obtener historial de entregas:', error);
    throw error;
  }
}

/**
 * Obtiene el estado actual de entrega de un item
 * @param pedidoEquipoItemId - ID del item del pedido
 * @returns Promise con el estado actual
 */
export async function obtenerEstadoEntrega(pedidoEquipoItemId: string): Promise<{
  estadoEntrega: EstadoEntregaItem;
  cantidadAtendida: number;
  fechaEntregaReal?: Date;
  observacionesEntrega?: string;
}> {
  try {
    logger.info('🔍 Obteniendo estado de entrega:', { pedidoEquipoItemId });
    
    const response = await fetch(`${BASE_URL}/pedido-equipo-item/${pedidoEquipoItemId}`, {
      method: 'GET',
      ...fetchConfig,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const item = await response.json();
    logger.info('✅ Estado obtenido exitosamente:', { estado: item.estadoEntrega });
    
    return {
      estadoEntrega: item.estadoEntrega,
      cantidadAtendida: item.cantidadAtendida || 0,
      fechaEntregaReal: item.fechaEntregaReal ? new Date(item.fechaEntregaReal) : undefined,
      observacionesEntrega: item.observacionesEntrega,
    };
  } catch (error) {
    logger.error('❌ Error al obtener estado de entrega:', error);
    throw error;
  }
}

/**
 * Valida si una transición de estado es permitida
 * @param estadoActual - Estado actual del item
 * @param estadoNuevo - Estado al que se quiere cambiar
 * @returns boolean indicando si la transición es válida
 */
export function validarTransicionEstado(estadoActual: EstadoEntregaItem, estadoNuevo: EstadoEntregaItem): boolean {
  const transicionesValidas: Record<EstadoEntregaItem, EstadoEntregaItem[]> = {
    [EstadoEntregaItem.PENDIENTE]: [
      EstadoEntregaItem.EN_PROCESO,
      EstadoEntregaItem.CANCELADO
    ],
    [EstadoEntregaItem.EN_PROCESO]: [
      EstadoEntregaItem.PARCIAL,
      EstadoEntregaItem.ENTREGADO,
      EstadoEntregaItem.RETRASADO,
      EstadoEntregaItem.CANCELADO
    ],
    [EstadoEntregaItem.PARCIAL]: [
      EstadoEntregaItem.ENTREGADO,
      EstadoEntregaItem.RETRASADO,
      EstadoEntregaItem.CANCELADO
    ],
    [EstadoEntregaItem.RETRASADO]: [
      EstadoEntregaItem.EN_PROCESO,
      EstadoEntregaItem.PARCIAL,
      EstadoEntregaItem.ENTREGADO,
      EstadoEntregaItem.CANCELADO
    ],
    [EstadoEntregaItem.ENTREGADO]: [], // Estado final
    [EstadoEntregaItem.CANCELADO]: [], // Estado final
  };

  return transicionesValidas[estadoActual]?.includes(estadoNuevo) ?? false;
}

// ============================
// 📊 FUNCIONES DE UTILIDAD
// ============================

/**
 * Calcula el progreso de entrega basado en cantidades
 * @param cantidadPedida - Cantidad total pedida
 * @param cantidadAtendida - Cantidad ya entregada
 * @returns Porcentaje de progreso (0-100)
 */
export function calcularProgresoEntrega(cantidadPedida: number, cantidadAtendida: number): number {
  if (cantidadPedida <= 0) return 0;
  return Math.min(100, Math.round((cantidadAtendida / cantidadPedida) * 100));
}

/**
 * Determina el estado de entrega basado en cantidades
 * @param cantidadPedida - Cantidad total pedida
 * @param cantidadAtendida - Cantidad ya entregada
 * @returns Estado de entrega sugerido
 */
export function determinarEstadoPorCantidad(cantidadPedida: number, cantidadAtendida: number): EstadoEntregaItem {
  if (cantidadAtendida <= 0) {
    return EstadoEntregaItem.PENDIENTE;
  } else if (cantidadAtendida >= cantidadPedida) {
    return EstadoEntregaItem.ENTREGADO;
  } else {
    return EstadoEntregaItem.PARCIAL;
  }
}
