/**
 * ===================================================
 * VALIDADORES: Trazabilidad
 * ===================================================
 * 
 * Esquemas de validación Zod para el sistema de trazabilidad
 * de entregas y seguimiento de pedidos.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { z } from 'zod';
import { EstadoEntregaItem } from '@/types/modelos';

// ============================
// 📋 SCHEMAS DE VALIDACIÓN
// ============================

/**
 * Schema para validar datos de entrega de items
 */
export const EntregaItemSchema = z.object({
  pedidoEquipoItemId: z.string().uuid('ID de item inválido'),
  estadoEntrega: z.nativeEnum(EstadoEntregaItem),
  cantidadAtendida: z.number().positive('Cantidad debe ser positiva').optional(),
  fechaEntregaReal: z.date().optional(),
  observacionesEntrega: z.string().max(500, 'Observaciones muy largas').optional(),
  comentarioLogistica: z.string().max(500, 'Comentario muy largo').optional()
});

/**
 * Schema para validar actualización de estado de entrega
 */
export const ActualizacionEstadoSchema = z.object({
  estadoNuevo: z.nativeEnum(EstadoEntregaItem),
  observaciones: z.string().max(500, 'Observaciones muy largas').optional(),
  fechaEntregaEstimada: z.date().optional()
});

/**
 * Schema para validar filtros de trazabilidad
 */
export const FiltrosTrazabilidadSchema = z.object({
  proyectoId: z.string().uuid('ID de proyecto inválido').optional(),
  estadoEntrega: z.nativeEnum(EstadoEntregaItem).optional(),
  fechaDesde: z.date().optional(),
  fechaHasta: z.date().optional(),
  proveedorId: z.string().uuid('ID de proveedor inválido').optional()
});

/**
 * Schema para validar payload de reporte de métricas
 */
export const ReporteMetricasSchema = z.object({
  proyectoId: z.string().uuid('ID de proyecto inválido').optional(),
  fechaDesde: z.date().optional(),
  fechaHasta: z.date().optional(),
  incluirDetalles: z.boolean().default(false)
});

/**
 * Schema para validar creación de evento de trazabilidad
 */
export const CrearEventoTrazabilidadSchema = z.object({
  entidadId: z.string().min(1, 'ID de entidad requerido'),
  entidadTipo: z.enum(['PEDIDO', 'PROYECTO', 'ITEM']),
  tipo: z.enum(['CREACION', 'ACTUALIZACION', 'ENTREGA', 'CANCELACION']),
  descripcion: z.string().min(1, 'Descripción requerida').max(1000, 'Descripción muy larga'),
  estadoAnterior: z.nativeEnum(EstadoEntregaItem).optional(),
  estadoNuevo: z.nativeEnum(EstadoEntregaItem),
  metadata: z.record(z.any()).optional(),
  fechaEvento: z.date().optional()
});

/**
 * Schema para validar filtros de eventos
 */
export const FiltrosEventosSchema = z.object({
  entidadId: z.string().optional(),
  entidadTipo: z.enum(['PEDIDO', 'PROYECTO', 'ITEM']).optional(),
  tipo: z.string().optional(),
  fechaDesde: z.date().optional(),
  fechaHasta: z.date().optional(),
  limite: z.number().int().positive().max(100).default(50)
});

/**
 * Schema para validar métricas de entrega
 */
export const MetricasEntregaSchema = z.object({
  periodo: z.string().default('30d'),
  fechaDesde: z.date().optional(),
  fechaHasta: z.date().optional(),
  proyectoId: z.string().uuid().optional(),
  proveedorId: z.string().uuid().optional(),
  incluirTendencias: z.boolean().default(true)
});

// ============================
// 📤 TIPOS INFERIDOS
// ============================

export type EntregaItemPayload = z.infer<typeof EntregaItemSchema>;
export type ActualizacionEstadoPayload = z.infer<typeof ActualizacionEstadoSchema>;
export type FiltrosTrazabilidad = z.infer<typeof FiltrosTrazabilidadSchema>;
export type ReporteMetricasPayload = z.infer<typeof ReporteMetricasSchema>;
export type CrearEventoTrazabilidadPayload = z.infer<typeof CrearEventoTrazabilidadSchema>;
export type FiltrosEventos = z.infer<typeof FiltrosEventosSchema>;
export type MetricasEntregaPayload = z.infer<typeof MetricasEntregaSchema>;

// ============================
// 🔧 FUNCIONES DE UTILIDAD
// ============================

/**
 * Valida si una transición de estado es válida
 */
export function validarTransicionEstado(
  estadoAnterior: EstadoEntregaItem,
  estadoNuevo: EstadoEntregaItem
): boolean {
  const transicionesValidas: Record<EstadoEntregaItem, EstadoEntregaItem[]> = {
    [EstadoEntregaItem.PENDIENTE]: [EstadoEntregaItem.EN_PROCESO, EstadoEntregaItem.CANCELADO],
    [EstadoEntregaItem.EN_PROCESO]: [EstadoEntregaItem.PARCIAL, EstadoEntregaItem.ENTREGADO, EstadoEntregaItem.RETRASADO, EstadoEntregaItem.CANCELADO],
    [EstadoEntregaItem.PARCIAL]: [EstadoEntregaItem.ENTREGADO, EstadoEntregaItem.RETRASADO, EstadoEntregaItem.CANCELADO],
    [EstadoEntregaItem.ENTREGADO]: [], // Estado final
    [EstadoEntregaItem.RETRASADO]: [EstadoEntregaItem.ENTREGADO, EstadoEntregaItem.CANCELADO],
    [EstadoEntregaItem.CANCELADO]: [] // Estado final
  };

  return transicionesValidas[estadoAnterior]?.includes(estadoNuevo) ?? false;
}

/**
 * Obtiene el color asociado a un estado de entrega
 */
export function obtenerColorEstado(estado: EstadoEntregaItem): string {
  const colores: Record<EstadoEntregaItem, string> = {
    [EstadoEntregaItem.PENDIENTE]: 'bg-gray-100 text-gray-800',
    [EstadoEntregaItem.EN_PROCESO]: 'bg-blue-100 text-blue-800',
    [EstadoEntregaItem.PARCIAL]: 'bg-yellow-100 text-yellow-800',
    [EstadoEntregaItem.ENTREGADO]: 'bg-green-100 text-green-800',
    [EstadoEntregaItem.RETRASADO]: 'bg-red-100 text-red-800',
    [EstadoEntregaItem.CANCELADO]: 'bg-gray-100 text-gray-600'
  };

  return colores[estado] || 'bg-gray-100 text-gray-800';
}

/**
 * Obtiene el ícono asociado a un estado de entrega
 */
export function obtenerIconoEstado(estado: EstadoEntregaItem): string {
  const iconos: Record<EstadoEntregaItem, string> = {
    [EstadoEntregaItem.PENDIENTE]: 'Clock',
    [EstadoEntregaItem.EN_PROCESO]: 'Truck',
    [EstadoEntregaItem.PARCIAL]: 'Package',
    [EstadoEntregaItem.ENTREGADO]: 'CheckCircle',
    [EstadoEntregaItem.RETRASADO]: 'AlertTriangle',
    [EstadoEntregaItem.CANCELADO]: 'XCircle'
  };

  return iconos[estado] || 'Clock';
}
