/**
 * Servicio de Reportes - Sistema de Trazabilidad GYS
 *
 * Servicios para generar reportes de pedidos y métricas de dashboard.
 */

import logger from '../logger';
import { EstadoEntregaItem } from '../../types/modelos';

export interface FiltrosReporte {
  proyectoId?: string;
  proveedorId?: string;
  estadoEntrega?: EstadoEntregaItem;
  fechaDesde?: Date;
  fechaHasta?: Date;
  incluirDetalles?: boolean;
}

export interface MetricasDashboard {
  resumenGeneral: {
    totalItems: number;
    totalCantidad: number;
    totalAtendida: number;
    porcentajeProgreso: number;
    tiempoPromedioEntrega: number;
  };
  distribucionPorEstado: Array<{
    estado: EstadoEntregaItem;
    cantidad: number;
    porcentaje: number;
  }>;
  kpis: {
    itemsEntregados: number;
    itemsPendientes: number;
    itemsRetrasados: number;
    eficienciaEntrega: number;
  };
  tendencias: {
    ultimoMes: number;
    crecimiento: number;
  };
  metricas?: Array<{
    id: string;
    titulo: string;
    valor: number;
    valorAnterior?: number;
    unidad: string;
    formato: 'entero' | 'decimal' | 'porcentaje' | 'moneda' | 'tiempo';
    tendencia: 'subida' | 'bajada' | 'estable';
    porcentajeCambio: number;
    descripcion?: string;
    meta?: number;
    categoria: 'principal' | 'secundaria' | 'critica';
    color: string;
    ultimaActualizacion: Date;
  }>;
}

export interface ReportePedidos {
  metricas: MetricasDashboard;
  graficos: {
    progresoTemporal: Array<{
      fecha: string;
      entregados: number;
      pendientes: number;
      retrasados: number;
    }>;
    distribucionProyectos: Array<{
      proyecto: string;
      progreso: number;
      items: number;
    }>;
    distribucionProveedores: Array<{
      proveedor: string;
      eficiencia: number;
      pedidos: number;
    }>;
  };
  timeline?: Array<{
    id: string;
    fecha: Date;
    tipo: 'creacion' | 'preparacion' | 'envio' | 'transito' | 'entrega' | 'incidencia' | 'devolucion' | 'cancelacion';
    estado: EstadoEntregaItem;
    titulo: string;
    descripcion?: string;
    responsable?: string;
    ubicacion?: string;
    observaciones?: string;
    metadata?: Record<string, any>;
    esHito?: boolean;
    duracion?: number;
  }>;
  detallado?: {
    items: Array<{
      id: string;
      equipo: string;
      proyecto: string;
      proveedor: string;
      cantidad: number;
      cantidadAtendida: number;
      estadoEntrega: EstadoEntregaItem;
      progreso: number;
      fechaEntregaEstimada?: Date;
      fechaEntregaReal?: Date;
    }>;
    resumen: {
      totalItems: number;
      progresoPromedio: number;
    };
  };
}

/**
 * Generar reporte completo de pedidos
 */
export async function generarReportePedidos(
  filtros: FiltrosReporte = {}
): Promise<ReportePedidos> {
  try {
    logger.info('Generando reporte de pedidos', { filtros });

    const queryParams = new URLSearchParams();

    if (filtros.proyectoId) queryParams.set('proyectoId', filtros.proyectoId);
    if (filtros.proveedorId) queryParams.set('proveedorId', filtros.proveedorId);
    if (filtros.estadoEntrega) queryParams.set('estadoEntrega', filtros.estadoEntrega);

    if (filtros.fechaDesde instanceof Date && !isNaN(filtros.fechaDesde.getTime())) {
      queryParams.set('fechaDesde', filtros.fechaDesde.toISOString());
    }
    if (filtros.fechaHasta instanceof Date && !isNaN(filtros.fechaHasta.getTime())) {
      queryParams.set('fechaHasta', filtros.fechaHasta.toISOString());
    }
    if (filtros.incluirDetalles) queryParams.set('incluirDetalles', 'true');

    queryParams.set('tipoReporte', 'metricas');
    const metricsResponse = await fetch(`/api/reportes/pedidos?${queryParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!metricsResponse.ok) {
      throw new Error(`Error al obtener métricas: ${metricsResponse.status}`);
    }

    const metricsData = await metricsResponse.json();

    const graphicsResponse = await fetch(`/api/reportes/pedidos?${queryParams}&tipoReporte=graficos`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!graphicsResponse.ok) {
      throw new Error(`Error al obtener datos de gráficos: ${graphicsResponse.status}`);
    }

    const graphicsData = await graphicsResponse.json();

    let detalladoData = null;
    if (filtros.incluirDetalles) {
      const detailResponse = await fetch(`/api/reportes/pedidos?${queryParams}&tipoReporte=detallado`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (detailResponse.ok) {
        detalladoData = await detailResponse.json();
      }
    }

    const reporte: ReportePedidos = {
      metricas: {
        resumenGeneral: metricsData.data.resumenGeneral,
        distribucionPorEstado: metricsData.data.distribucionPorEstado,
        kpis: metricsData.data.kpis,
        tendencias: {
          ultimoMes: graphicsData.data.tendencias?.ultimoMes || 0,
          crecimiento: graphicsData.data.tendencias?.crecimiento || 0
        }
      },
      graficos: {
        progresoTemporal: transformarProgresoTemporal(graphicsData.data.progresoTemporal || []),
        distribucionProyectos: transformarDistribucionProyectos(graphicsData.data.distribucionProyectos || []),
        distribucionProveedores: transformarDistribucionProveedores(graphicsData.data.distribucionProveedores || [])
      },
      detallado: detalladoData ? {
        items: detalladoData.data.items || [],
        resumen: detalladoData.data.resumen || { totalItems: 0, progresoPromedio: 0 }
      } : undefined
    };

    logger.info('Reporte de pedidos generado exitosamente', {
      totalItems: reporte.metricas.resumenGeneral.totalItems,
      porcentajeProgreso: reporte.metricas.resumenGeneral.porcentajeProgreso
    });

    return reporte;

  } catch (error) {
    logger.error('Error al generar reporte de pedidos', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

/**
 * Obtener métricas para dashboard principal
 */
export async function obtenerDashboardMetricas(
  filtros: Omit<FiltrosReporte, 'incluirDetalles'> = {}
): Promise<MetricasDashboard> {
  try {
    logger.info('Obteniendo métricas de dashboard', { filtros });

    const queryParams = new URLSearchParams();

    if (filtros.proyectoId) queryParams.set('proyectoId', filtros.proyectoId);
    if (filtros.proveedorId) queryParams.set('proveedorId', filtros.proveedorId);
    if (filtros.estadoEntrega) queryParams.set('estadoEntrega', filtros.estadoEntrega);

    if (filtros.fechaDesde instanceof Date && !isNaN(filtros.fechaDesde.getTime())) {
      queryParams.set('fechaDesde', filtros.fechaDesde.toISOString());
    }
    if (filtros.fechaHasta instanceof Date && !isNaN(filtros.fechaHasta.getTime())) {
      queryParams.set('fechaHasta', filtros.fechaHasta.toISOString());
    }

    queryParams.set('tipoReporte', 'metricas');

    const response = await fetch(`/api/reportes/pedidos?${queryParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener métricas: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error en la respuesta de la API');
    }

    const trendsResponse = await fetch(`/api/reportes/pedidos?${queryParams.toString().replace('tipoReporte=metricas', 'tipoReporte=graficos')}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    let tendenciasData = { ultimoMes: 0, crecimiento: 0 };
    if (trendsResponse.ok) {
      const trendsResult = await trendsResponse.json();
      tendenciasData = trendsResult.data.tendencias || tendenciasData;
    }

    const metricas: MetricasDashboard = {
      resumenGeneral: data.data.resumenGeneral,
      distribucionPorEstado: data.data.distribucionPorEstado,
      kpis: data.data.kpis,
      tendencias: tendenciasData
    };

    return metricas;

  } catch (error) {
    logger.error('Error al obtener métricas de dashboard', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

// Transform functions

function transformarProgresoTemporal(datos: any[]): Array<{
  fecha: string;
  entregados: number;
  pendientes: number;
  retrasados: number;
}> {
  return datos.map(item => ({
    fecha: item.fecha || new Date().toISOString().split('T')[0],
    entregados: item.estado === 'entregado' ? item.cantidad : 0,
    pendientes: item.estado === 'pendiente' ? item.cantidad : 0,
    retrasados: item.estado === 'retrasado' ? item.cantidad : 0
  }));
}

function transformarDistribucionProyectos(datos: any[]): Array<{
  proyecto: string;
  progreso: number;
  items: number;
}> {
  return datos.map(item => ({
    proyecto: item.proyecto || 'Proyecto sin nombre',
    progreso: Math.round(((item._sum?.cantidadAtendida || 0) / (item._sum?.cantidad || 1)) * 100),
    items: item._count?.id || 0
  }));
}

function transformarDistribucionProveedores(datos: any[]): Array<{
  proveedor: string;
  eficiencia: number;
  pedidos: number;
}> {
  return datos.map(item => ({
    proveedor: item.proveedor || 'Proveedor sin nombre',
    eficiencia: 0, // TODO: calculate from real delivery data
    pedidos: item._count?.id || 0
  }));
}
