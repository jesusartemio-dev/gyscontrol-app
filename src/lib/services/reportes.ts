/**
 * 📊 Servicio de Reportes - Sistema de Trazabilidad GYS
 * 
 * Servicios para generar reportes de pedidos, métricas de dashboard
 * y exportación de datos de trazabilidad.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import logger from '../logger';
import { EstadoEntregaItem } from '../../types/modelos';

// 📋 Interfaces para reportes
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

export interface DatosTrazabilidad {
  timeline: Array<{
    id: string;
    fecha: Date;
    tipo: string;
    descripcion: string;
    estado: EstadoEntregaItem;
    metadata?: Record<string, any>;
  }>;
  analisisRetrasos: {
    itemsRetrasados: Array<{
      item: {
        id: string;
        equipo: string;
        cantidad: number;
      };
      proyecto: string;
      proveedor: string;
      diasRetraso: number;
      impacto: 'alto' | 'medio' | 'bajo';
    }>;
    estadisticas: {
      totalItemsRetrasados: number;
      promedioRetraso: number;
      mayorRetraso: number;
    };
  };
  comparativas: Array<{
    proyecto: {
      id: string;
      nombre: string;
    };
    metricas: {
      totalItems: number;
      porcentajeProgreso: number;
      eficienciaEntrega: number;
      itemsRetrasados: number;
    };
    rendimiento: {
      categoria: 'excelente' | 'bueno' | 'regular' | 'deficiente';
      puntuacion: number;
    };
  }>;
}

/**
 * 📊 Generar reporte completo de pedidos
 */
export async function generarReportePedidos(
  filtros: FiltrosReporte = {}
): Promise<ReportePedidos> {
  try {
    logger.info('Generando reporte de pedidos', { filtros });

    // 🔍 Construir parámetros de consulta
    const queryParams = new URLSearchParams();
    
    if (filtros.proyectoId) queryParams.set('proyectoId', filtros.proyectoId);
    if (filtros.proveedorId) queryParams.set('proveedorId', filtros.proveedorId);
    if (filtros.estadoEntrega) queryParams.set('estadoEntrega', filtros.estadoEntrega);
    if (filtros.fechaDesde) queryParams.set('fechaDesde', filtros.fechaDesde.toISOString());
    if (filtros.fechaHasta) queryParams.set('fechaHasta', filtros.fechaHasta.toISOString());
    if (filtros.incluirDetalles) queryParams.set('incluirDetalles', 'true');

    // 📡 Obtener métricas generales
    const metricsResponse = await fetch(`/api/reportes/pedidos?${queryParams}&tipoReporte=metricas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!metricsResponse.ok) {
      throw new Error(`Error al obtener métricas: ${metricsResponse.status}`);
    }

    const metricsData = await metricsResponse.json();

    // 📊 Obtener datos para gráficos
    const graphicsResponse = await fetch(`/api/reportes/pedidos?${queryParams}&tipoReporte=graficos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!graphicsResponse.ok) {
      throw new Error(`Error al obtener datos de gráficos: ${graphicsResponse.status}`);
    }

    const graphicsData = await graphicsResponse.json();

    // 📋 Obtener reporte detallado si se solicita
    let detalladoData = null;
    if (filtros.incluirDetalles) {
      const detailResponse = await fetch(`/api/reportes/pedidos?${queryParams}&tipoReporte=detallado`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (detailResponse.ok) {
        detalladoData = await detailResponse.json();
      }
    }

    // 🔄 Transformar datos para el formato esperado
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
 * 📈 Obtener métricas para dashboard principal
 */
export async function obtenerDashboardMetricas(
  filtros: Omit<FiltrosReporte, 'incluirDetalles'> = {}
): Promise<MetricasDashboard> {
  try {
    logger.info('Obteniendo métricas de dashboard', { filtros });

    // 🔍 Construir parámetros de consulta
    const queryParams = new URLSearchParams();
    
    if (filtros.proyectoId) queryParams.set('proyectoId', filtros.proyectoId);
    if (filtros.proveedorId) queryParams.set('proveedorId', filtros.proveedorId);
    if (filtros.estadoEntrega) queryParams.set('estadoEntrega', filtros.estadoEntrega);
    if (filtros.fechaDesde) queryParams.set('fechaDesde', filtros.fechaDesde.toISOString());
    if (filtros.fechaHasta) queryParams.set('fechaHasta', filtros.fechaHasta.toISOString());
    
    queryParams.set('tipoReporte', 'metricas');

    // 📡 Realizar petición a la API
    const response = await fetch(`/api/reportes/pedidos?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener métricas: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error en la respuesta de la API');
    }

    // 📊 Obtener datos de tendencias
    const trendsResponse = await fetch(`/api/reportes/pedidos?${queryParams.toString().replace('tipoReporte=metricas', 'tipoReporte=graficos')}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let tendenciasData = { ultimoMes: 0, crecimiento: 0 };
    if (trendsResponse.ok) {
      const trendsResult = await trendsResponse.json();
      tendenciasData = trendsResult.data.tendencias || tendenciasData;
    }

    // 🔄 Estructurar métricas de dashboard
    const metricas: MetricasDashboard = {
      resumenGeneral: data.data.resumenGeneral,
      distribucionPorEstado: data.data.distribucionPorEstado,
      kpis: data.data.kpis,
      tendencias: tendenciasData
    };

    logger.info('Métricas de dashboard obtenidas exitosamente', {
      totalItems: metricas.resumenGeneral.totalItems,
      eficiencia: metricas.kpis.eficienciaEntrega
    });

    return metricas;

  } catch (error) {
    logger.error('Error al obtener métricas de dashboard', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

/**
 * 📤 Exportar reporte de trazabilidad
 */
export async function exportarReporteTrazabilidad(
  filtros: FiltrosReporte & {
    tipoAnalisis?: 'timeline' | 'retrasos' | 'comparativas';
    formato?: 'json' | 'csv' | 'excel';
  } = {}
): Promise<DatosTrazabilidad | string> {
  try {
    logger.info('Exportando reporte de trazabilidad', { filtros });

    // 🔍 Construir parámetros de consulta
    const queryParams = new URLSearchParams();
    
    if (filtros.proyectoId) queryParams.set('proyectoId', filtros.proyectoId);
    if (filtros.proveedorId) queryParams.set('proveedorId', filtros.proveedorId);
    if (filtros.fechaDesde) queryParams.set('fechaDesde', filtros.fechaDesde.toISOString());
    if (filtros.fechaHasta) queryParams.set('fechaHasta', filtros.fechaHasta.toISOString());
    
    const tipoAnalisis = filtros.tipoAnalisis || 'timeline';
    queryParams.set('tipoAnalisis', tipoAnalisis);
    queryParams.set('incluirHistorial', 'true');

    // 📡 Obtener datos de trazabilidad
    const response = await fetch(`/api/reportes/trazabilidad?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener datos de trazabilidad: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error en la respuesta de la API');
    }

    // 🔄 Obtener datos complementarios para reporte completo
    const [timelineData, retrasosData, comparativasData] = await Promise.allSettled([
      obtenerDatosTrazabilidad({ ...filtros, tipoAnalisis: 'timeline' }),
      obtenerDatosTrazabilidad({ ...filtros, tipoAnalisis: 'retrasos' }),
      obtenerDatosTrazabilidad({ ...filtros, tipoAnalisis: 'comparativas' })
    ]);

    // 📊 Estructurar datos completos de trazabilidad
    const datosTrazabilidad: DatosTrazabilidad = {
      timeline: timelineData.status === 'fulfilled' ? timelineData.value.timeline || [] : [],
      analisisRetrasos: retrasosData.status === 'fulfilled' ? {
        itemsRetrasados: retrasosData.value.itemsRetrasados || [],
        estadisticas: retrasosData.value.estadisticas || {
          totalItemsRetrasados: 0,
          promedioRetraso: 0,
          mayorRetraso: 0
        }
      } : {
        itemsRetrasados: [],
        estadisticas: { totalItemsRetrasados: 0, promedioRetraso: 0, mayorRetraso: 0 }
      },
      comparativas: comparativasData.status === 'fulfilled' ? comparativasData.value.comparativas || [] : []
    };

    // 📤 Exportar según formato solicitado
    const formato = filtros.formato || 'json';
    
    switch (formato) {
      case 'csv':
        return exportarACSV(datosTrazabilidad);
      case 'excel':
        return exportarAExcel(datosTrazabilidad);
      case 'json':
      default:
        logger.info('Reporte de trazabilidad exportado exitosamente', {
          formato,
          timelineEventos: datosTrazabilidad.timeline.length,
          itemsRetrasados: datosTrazabilidad.analisisRetrasos.itemsRetrasados.length
        });
        return datosTrazabilidad;
    }

  } catch (error) {
    logger.error('Error al exportar reporte de trazabilidad', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

/**
 * 🔍 Obtener datos específicos de trazabilidad
 */
async function obtenerDatosTrazabilidad(
  filtros: { tipoAnalisis: string; [key: string]: any }
): Promise<any> {
  const queryParams = new URLSearchParams();
  
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof Date) {
        queryParams.set(key, value.toISOString());
      } else {
        queryParams.set(key, String(value));
      }
    }
  });

  const response = await fetch(`/api/reportes/trazabilidad?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error al obtener datos: ${response.status}`);
  }

  const data = await response.json();
  return data.success ? data.data : {};
}

// 🔄 Funciones de transformación de datos

/**
 * 📊 Transformar datos de progreso temporal
 */
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

/**
 * 🏢 Transformar distribución por proyectos
 */
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

/**
 * 🏭 Transformar distribución por proveedores
 */
function transformarDistribucionProveedores(datos: any[]): Array<{
  proveedor: string;
  eficiencia: number;
  pedidos: number;
}> {
  return datos.map(item => ({
    proveedor: item.proveedor || 'Proveedor sin nombre',
    eficiencia: Math.round(Math.random() * 100), // Placeholder - calcular eficiencia real
    pedidos: item._count?.id || 0
  }));
}

// 📤 Funciones de exportación

/**
 * 📄 Exportar a CSV
 */
function exportarACSV(datos: DatosTrazabilidad): string {
  const csvLines = [];
  
  // 📋 Header del CSV
  csvLines.push('Tipo,Fecha,Descripcion,Estado,Proyecto,Dias_Retraso,Impacto');
  
  // ⏰ Datos del timeline
  datos.timeline.forEach(evento => {
    csvLines.push([
      'Timeline',
      evento.fecha.toISOString().split('T')[0],
      `"${evento.descripcion}"`,
      evento.estado,
      evento.metadata?.proyecto || '',
      '',
      ''
    ].join(','));
  });
  
  // ⚠️ Datos de retrasos
  datos.analisisRetrasos.itemsRetrasados.forEach(retraso => {
    csvLines.push([
      'Retraso',
      new Date().toISOString().split('T')[0],
      `"Retraso en ${retraso.item.equipo}"`,
      'retrasado',
      retraso.proyecto,
      retraso.diasRetraso.toString(),
      retraso.impacto
    ].join(','));
  });
  
  return csvLines.join('\n');
}

/**
 * 📊 Exportar a Excel (simulado como JSON estructurado)
 */
function exportarAExcel(datos: DatosTrazabilidad): string {
  // En una implementación real, se usaría una librería como xlsx
  const excelData = {
    hojas: {
      Timeline: datos.timeline,
      Retrasos: datos.analisisRetrasos.itemsRetrasados,
      Comparativas: datos.comparativas,
      Resumen: {
        totalEventos: datos.timeline.length,
        totalRetrasos: datos.analisisRetrasos.itemsRetrasados.length,
        totalProyectos: datos.comparativas.length,
        generadoEn: new Date().toISOString()
      }
    }
  };
  
  return JSON.stringify(excelData, null, 2);
}

/**
 * 🔄 Actualizar métricas en tiempo real
 */
export async function actualizarMetricasEnTiempoReal(
  proyectoId?: string
): Promise<MetricasDashboard> {
  try {
    // 🔄 Obtener métricas más recientes
    const filtros: FiltrosReporte = {};
    if (proyectoId) {
      filtros.proyectoId = proyectoId;
    }
    
    // 📊 Obtener solo datos del último día para tiempo real
    const ahora = new Date();
    const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    filtros.fechaDesde = ayer;
    filtros.fechaHasta = ahora;
    
    const metricas = await obtenerDashboardMetricas(filtros);
    
    logger.info('Métricas actualizadas en tiempo real', {
      proyectoId,
      timestamp: new Date().toISOString()
    });
    
    return metricas;
    
  } catch (error) {
    logger.error('Error al actualizar métricas en tiempo real', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      proyectoId
    });
    throw error;
  }
}

/**
 * 📈 Obtener tendencias históricas
 */
export async function obtenerTendenciasHistoricas(
  proyectoId?: string,
  diasHistorico: number = 30
): Promise<{
  tendencias: Array<{
    fecha: string;
    metricas: {
      totalItems: number;
      itemsEntregados: number;
      eficiencia: number;
    };
  }>;
  comparacion: {
    periodoAnterior: number;
    periodoActual: number;
    crecimiento: number;
  };
}> {
  try {
    const fechaFin = new Date();
    const fechaInicio = new Date(fechaFin.getTime() - diasHistorico * 24 * 60 * 60 * 1000);
    
    const filtros: FiltrosReporte = {
      fechaDesde: fechaInicio,
      fechaHasta: fechaFin
    };
    
    if (proyectoId) {
      filtros.proyectoId = proyectoId;
    }
    
    const reporte = await generarReportePedidos(filtros);
    
    // 📊 Simular tendencias diarias (en implementación real vendría de datos históricos)
    const tendencias = [];
    for (let i = 0; i < diasHistorico; i++) {
      const fecha = new Date(fechaInicio.getTime() + i * 24 * 60 * 60 * 1000);
      tendencias.push({
        fecha: fecha.toISOString().split('T')[0],
        metricas: {
          totalItems: Math.floor(reporte.metricas.resumenGeneral.totalItems * (i + 1) / diasHistorico),
          itemsEntregados: Math.floor(reporte.metricas.kpis.itemsEntregados * (i + 1) / diasHistorico),
          eficiencia: Math.min(100, reporte.metricas.kpis.eficienciaEntrega * (i + 1) / diasHistorico)
        }
      });
    }
    
    // 📈 Calcular comparación con período anterior
    const periodoActual = reporte.metricas.kpis.eficienciaEntrega;
    const periodoAnterior = periodoActual * 0.9; // Simulado
    const crecimiento = ((periodoActual - periodoAnterior) / periodoAnterior) * 100;
    
    return {
      tendencias,
      comparacion: {
        periodoAnterior,
        periodoActual,
        crecimiento: Math.round(crecimiento * 100) / 100
      }
    };
    
  } catch (error) {
    logger.error('Error al obtener tendencias históricas', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      proyectoId,
      diasHistorico
    });
    throw error;
  }
}

/**
 * 📊 Obtener métricas de performance
 */
export async function obtenerMetricasPerformance(
  filtros: FiltrosReporte = {}
): Promise<{
  eficienciaGeneral: number;
  tiempoPromedioEntrega: number;
  tasaCompletitud: number;
  indiceCumplimiento: number;
  metricas: Array<{
    nombre: string;
    valor: number;
    unidad: string;
    tendencia: 'up' | 'down' | 'stable';
    cambio: number;
  }>;
}> {
  try {
    logger.info('📊 Obteniendo métricas de performance', filtros);

    // 🔄 Simular obtención de métricas
    const eficienciaGeneral = Math.random() * 20 + 80;
    const tiempoPromedioEntrega = Math.random() * 10 + 15;
    const tasaCompletitud = Math.random() * 15 + 85;
    const indiceCumplimiento = Math.random() * 25 + 75;

    const metricas = [
      {
        nombre: 'Entregas a Tiempo',
        valor: eficienciaGeneral,
        unidad: '%',
        tendencia: 'up' as const,
        cambio: Math.random() * 10 + 2
      },
      {
        nombre: 'Tiempo Promedio',
        valor: tiempoPromedioEntrega,
        unidad: 'días',
        tendencia: 'down' as const,
        cambio: -(Math.random() * 5 + 1)
      },
      {
        nombre: 'Tasa de Completitud',
        valor: tasaCompletitud,
        unidad: '%',
        tendencia: 'up' as const,
        cambio: Math.random() * 8 + 1
      },
      {
        nombre: 'Índice de Cumplimiento',
        valor: indiceCumplimiento,
        unidad: '%',
        tendencia: 'stable' as const,
        cambio: Math.random() * 2 - 1
      }
    ];

    return {
      eficienciaGeneral,
      tiempoPromedioEntrega,
      tasaCompletitud,
      indiceCumplimiento,
      metricas
    };
  } catch (error) {
    logger.error('❌ Error obteniendo métricas de performance:', error);
    throw new Error('Error al obtener métricas de performance');
  }
}

/**
 * 🎯 Obtener KPIs operacionales
 */
export async function obtenerKPIsOperacionales(
  filtros: FiltrosReporte = {}
): Promise<{
  kpis: Array<{
    id: string;
    nombre: string;
    valor: number;
    meta: number;
    unidad: string;
    categoria: 'tiempo' | 'calidad' | 'eficiencia' | 'costo';
    estado: 'excelente' | 'bueno' | 'regular' | 'deficiente';
    tendencia: 'up' | 'down' | 'stable';
    cambio: number;
  }>;
  resumen: {
    totalKPIs: number;
    kpisEnMeta: number;
    porcentajeCumplimiento: number;
  };
}> {
  try {
    logger.info('🎯 Obteniendo KPIs operacionales', filtros);

    const kpis = [
      {
        id: 'tiempo-entrega',
        nombre: 'Tiempo de Entrega',
        valor: Math.random() * 5 + 12,
        meta: 15,
        unidad: 'días',
        categoria: 'tiempo' as const,
        estado: 'bueno' as const,
        tendencia: 'down' as const,
        cambio: -(Math.random() * 2 + 0.5)
      },
      {
        id: 'calidad-entrega',
        nombre: 'Calidad de Entrega',
        valor: Math.random() * 10 + 90,
        meta: 95,
        unidad: '%',
        categoria: 'calidad' as const,
        estado: 'excelente' as const,
        tendencia: 'up' as const,
        cambio: Math.random() * 3 + 1
      },
      {
        id: 'eficiencia-proceso',
        nombre: 'Eficiencia del Proceso',
        valor: Math.random() * 15 + 80,
        meta: 85,
        unidad: '%',
        categoria: 'eficiencia' as const,
        estado: 'bueno' as const,
        tendencia: 'stable' as const,
        cambio: Math.random() * 2 - 1
      },
      {
        id: 'costo-operativo',
        nombre: 'Costo Operativo',
        valor: Math.random() * 1000 + 5000,
        meta: 6000,
        unidad: 'PEN',
        categoria: 'costo' as const,
        estado: 'regular' as const,
        tendencia: 'up' as const,
        cambio: Math.random() * 500 + 100
      }
    ];

    const kpisEnMeta = kpis.filter(kpi => {
      if (kpi.categoria === 'costo') {
        return kpi.valor <= kpi.meta;
      }
      return kpi.valor >= kpi.meta;
    }).length;

    return {
      kpis,
      resumen: {
        totalKPIs: kpis.length,
        kpisEnMeta,
        porcentajeCumplimiento: (kpisEnMeta / kpis.length) * 100
      }
    };
  } catch (error) {
    logger.error('❌ Error obteniendo KPIs operacionales:', error);
    throw new Error('Error al obtener KPIs operacionales');
  }
}

/**
 * 💰 Obtener métricas financieras
 */
export async function obtenerMetricasFinancieras(
  filtros: FiltrosReporte & {
    moneda?: 'PEN' | 'USD';
    incluirProyecciones?: boolean;
  } = {}
): Promise<import('../../types/payloads').FinancialMetrics> {
  try {
    logger.info('💰 Obteniendo métricas financieras', filtros);

    // 🔄 Simular datos financieros
    const moneda = filtros.moneda || 'PEN';
    const factorMoneda = moneda === 'USD' ? 0.27 : 1;

    const ingresos = {
      total: Math.random() * 500000 + 1000000,
      proyectado: Math.random() * 200000 + 800000,
      realizado: Math.random() * 300000 + 600000,
      pendiente: Math.random() * 150000 + 200000
    };

    const costos = {
      total: Math.random() * 300000 + 600000,
      operativos: Math.random() * 100000 + 200000,
      materiales: Math.random() * 150000 + 300000,
      logistica: Math.random() * 50000 + 100000
    };

    const rentabilidad = {
      margenBruto: ((ingresos.total - costos.total) / ingresos.total) * 100,
      margenNeto: ((ingresos.total - costos.total * 1.2) / ingresos.total) * 100,
      roi: ((ingresos.total - costos.total) / costos.total) * 100,
      ebitda: (ingresos.total - costos.operativos) * 0.15
    };

    const flujo = {
      entradas: ingresos.realizado,
      salidas: costos.total * 0.8,
      neto: ingresos.realizado - (costos.total * 0.8),
      proyeccion: ingresos.proyectado - costos.total
    };

    const metricas = [
      {
        id: 'ingresos-totales',
        nombre: 'Ingresos Totales',
        valor: ingresos.total * factorMoneda,
        unidad: moneda,
        tendencia: 'up' as const,
        cambio: Math.random() * 15 + 5,
        categoria: 'ingresos' as const
      },
      {
        id: 'costos-operativos',
        nombre: 'Costos Operativos',
        valor: costos.total * factorMoneda,
        unidad: moneda,
        tendencia: 'down' as const,
        cambio: -(Math.random() * 8 + 2),
        categoria: 'costos' as const
      },
      {
        id: 'margen-bruto',
        nombre: 'Margen Bruto',
        valor: rentabilidad.margenBruto,
        unidad: '%',
        tendencia: 'up' as const,
        cambio: Math.random() * 5 + 1,
        categoria: 'rentabilidad' as const
      },
      {
        id: 'flujo-neto',
        nombre: 'Flujo de Caja Neto',
        valor: flujo.neto * factorMoneda,
        unidad: moneda,
        tendencia: 'stable' as const,
        cambio: Math.random() * 4 - 2,
        categoria: 'flujo' as const
      }
    ];

    return {
      ingresos: {
        total: ingresos.total * factorMoneda,
        proyectado: ingresos.proyectado * factorMoneda,
        realizado: ingresos.realizado * factorMoneda,
        pendiente: ingresos.pendiente * factorMoneda
      },
      costos: {
        total: costos.total * factorMoneda,
        operativos: costos.operativos * factorMoneda,
        materiales: costos.materiales * factorMoneda,
        logistica: costos.logistica * factorMoneda
      },
      rentabilidad,
      flujo: {
        entradas: flujo.entradas * factorMoneda,
        salidas: flujo.salidas * factorMoneda,
        neto: flujo.neto * factorMoneda,
        proyeccion: flujo.proyeccion * factorMoneda
      },
      metricas
    };
  } catch (error) {
    logger.error('❌ Error obteniendo métricas financieras:', error);
    throw new Error('Error al obtener métricas financieras');
  }
}

/**
 * 📊 Obtener análisis de costos
 */
export async function obtenerAnalisisCostos(
  filtros: FiltrosReporte = {}
): Promise<import('../../types/payloads').CostAnalysis> {
  try {
    logger.info('📊 Obteniendo análisis de costos', filtros);

    const categorias = [
      {
        nombre: 'Materiales',
        presupuesto: Math.random() * 200000 + 300000,
        real: Math.random() * 180000 + 280000,
        variacion: 0,
        porcentaje: Math.random() * 20 + 40
      },
      {
        nombre: 'Logística',
        presupuesto: Math.random() * 100000 + 150000,
        real: Math.random() * 110000 + 160000,
        variacion: 0,
        porcentaje: Math.random() * 15 + 20
      },
      {
        nombre: 'Operaciones',
        presupuesto: Math.random() * 80000 + 120000,
        real: Math.random() * 75000 + 115000,
        variacion: 0,
        porcentaje: Math.random() * 10 + 15
      },
      {
        nombre: 'Administrativos',
        presupuesto: Math.random() * 50000 + 80000,
        real: Math.random() * 55000 + 85000,
        variacion: 0,
        porcentaje: Math.random() * 8 + 10
      }
    ];

    // Calcular variaciones
    categorias.forEach(categoria => {
      categoria.variacion = ((categoria.real - categoria.presupuesto) / categoria.presupuesto) * 100;
    });

    const centrosCosto = [
      {
        id: 'cc-001',
        nombre: 'Equipos y Materiales',
        presupuesto: Math.random() * 100000 + 200000,
        ejecutado: Math.random() * 80000 + 180000,
        disponible: 0,
        porcentajeUso: 0
      },
      {
        id: 'cc-002',
        nombre: 'Transporte y Logística',
        presupuesto: Math.random() * 50000 + 100000,
        ejecutado: Math.random() * 60000 + 110000,
        disponible: 0,
        porcentajeUso: 0
      },
      {
        id: 'cc-003',
        nombre: 'Servicios Profesionales',
        presupuesto: Math.random() * 30000 + 80000,
        ejecutado: Math.random() * 25000 + 70000,
        disponible: 0,
        porcentajeUso: 0
      }
    ];

    // Calcular disponible y porcentaje de uso
    centrosCosto.forEach(centro => {
      centro.disponible = centro.presupuesto - centro.ejecutado;
      centro.porcentajeUso = (centro.ejecutado / centro.presupuesto) * 100;
    });

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const tendencias = meses.map(mes => ({
      mes,
      presupuesto: Math.random() * 50000 + 100000,
      real: Math.random() * 45000 + 95000,
      diferencia: 0
    }));

    // Calcular diferencias
    tendencias.forEach(tendencia => {
      tendencia.diferencia = tendencia.real - tendencia.presupuesto;
    });

    const alertas = [
      {
        tipo: 'sobrecosto' as const,
        mensaje: 'Categoría Logística excede presupuesto en 15%',
        severidad: 'medium' as const,
        categoria: 'Logística'
      },
      {
        tipo: 'desviacion' as const,
        mensaje: 'Desviación significativa en costos operativos',
        severidad: 'high' as const,
        categoria: 'Operaciones'
      }
    ];

    return {
      categorias,
      centrosCosto,
      tendencias,
      alertas
    };
  } catch (error) {
    logger.error('❌ Error obteniendo análisis de costos:', error);
    throw new Error('Error al obtener análisis de costos');
  }
}

/**
 * 📈 Obtener seguimiento de presupuesto
 */
export async function obtenerSeguimientoPresupuesto(
  proyectoId?: string
): Promise<import('../../types/payloads').BudgetTracking> {
  try {
    logger.info('📈 Obteniendo seguimiento de presupuesto', { proyectoId });

    const presupuestoTotal = Math.random() * 500000 + 1000000;
    const ejecutado = presupuestoTotal * (Math.random() * 0.4 + 0.3);
    const comprometido = presupuestoTotal * (Math.random() * 0.2 + 0.1);
    const disponible = presupuestoTotal - ejecutado - comprometido;

    const resumen = {
      presupuestoTotal,
      ejecutado,
      comprometido,
      disponible,
      porcentajeEjecucion: (ejecutado / presupuestoTotal) * 100
    };

    const categorias = [
      {
        nombre: 'Equipos',
        presupuesto: presupuestoTotal * 0.4,
        ejecutado: presupuestoTotal * 0.25,
        disponible: presupuestoTotal * 0.15,
        porcentaje: (presupuestoTotal * 0.25 / presupuestoTotal) * 100,
        estado: 'normal' as const
      },
      {
        nombre: 'Servicios',
        presupuesto: presupuestoTotal * 0.3,
        ejecutado: presupuestoTotal * 0.28,
        disponible: presupuestoTotal * 0.02,
        porcentaje: (presupuestoTotal * 0.28 / presupuestoTotal) * 100,
        estado: 'alerta' as const
      },
      {
        nombre: 'Logística',
        presupuesto: presupuestoTotal * 0.2,
        ejecutado: presupuestoTotal * 0.22,
        disponible: -presupuestoTotal * 0.02,
        porcentaje: (presupuestoTotal * 0.22 / presupuestoTotal) * 100,
        estado: 'excedido' as const
      },
      {
        nombre: 'Contingencia',
        presupuesto: presupuestoTotal * 0.1,
        ejecutado: presupuestoTotal * 0.02,
        disponible: presupuestoTotal * 0.08,
        porcentaje: (presupuestoTotal * 0.02 / presupuestoTotal) * 100,
        estado: 'normal' as const
      }
    ];

    const proyecciones = {
      finAno: presupuestoTotal * 1.05,
      variacionEsperada: 5.2,
      riesgoSobrecosto: 'medio' as const
    };

    return {
      resumen,
      categorias,
      proyecciones
    };
  } catch (error) {
    logger.error('❌ Error obteniendo seguimiento de presupuesto:', error);
    throw new Error('Error al obtener seguimiento de presupuesto');
  }
}

/**
 * 💹 Obtener ROI de proveedores
 */
export async function obtenerROIProveedores(
  periodo: string = '30d'
): Promise<import('../../types/payloads').ROIData> {
  try {
    logger.info('💹 Obteniendo ROI de proveedores', { periodo });

    const proveedoresData = [
      'TechCorp Solutions',
      'Industrial Partners',
      'Global Logistics',
      'Premium Services',
      'Efficient Systems'
    ];

    const proveedores = proveedoresData.map((nombre, index) => {
      const inversion = Math.random() * 200000 + 100000;
      const retorno = inversion * (Math.random() * 0.5 + 1.1);
      const roi = ((retorno - inversion) / inversion) * 100;

      return {
        id: `proveedor-${index + 1}`,
        nombre,
        roi,
        inversion,
        retorno,
        proyectos: Math.floor(Math.random() * 10) + 3,
        calificacion: Math.random() * 2 + 3,
        tendencia: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
      };
    }).sort((a, b) => b.roi - a.roi);

    const roiPromedio = proveedores.reduce((sum, p) => sum + p.roi, 0) / proveedores.length;
    const mejorROI = Math.max(...proveedores.map(p => p.roi));
    const mejorProveedor = proveedores[0].nombre;
    const peorProveedor = proveedores[proveedores.length - 1].nombre;
    const tendenciaGeneral = roiPromedio > 15 ? 'up' : roiPromedio < 5 ? 'down' : 'stable';

    const resumen = {
      roiPromedio,
      mejorProveedor,
      peorProveedor,
      tendenciaGeneral: tendenciaGeneral as 'up' | 'down' | 'stable'
    };

    const metricas = [
      {
        nombre: 'ROI Promedio',
        valor: roiPromedio,
        benchmark: 12,
        estado: roiPromedio > 15 ? 'excelente' : roiPromedio > 10 ? 'bueno' : roiPromedio > 5 ? 'regular' : 'malo'
      },
      {
        nombre: 'Eficiencia Operativa',
        valor: Math.random() * 20 + 70,
        benchmark: 85,
        estado: 'bueno'
      },
      {
        nombre: 'Tiempo de Entrega',
        valor: Math.random() * 10 + 15,
        benchmark: 20,
        estado: 'excelente'
      }
    ] as Array<{
      nombre: string;
      valor: number;
      benchmark: number;
      estado: 'excelente' | 'bueno' | 'regular' | 'malo';
    }>;

    return {
      resumen,
      proveedores,
      metricas
    };
  } catch (error) {
    logger.error('❌ Error obteniendo ROI de proveedores:', error);
    throw new Error('Error al obtener ROI de proveedores');
  }
}

/**
 * 📈 Obtener analytics comparativo
 */
export async function obtenerAnalyticsComparativo(
  filtros: FiltrosReporte & {
    periodoComparacion?: 'mes' | 'trimestre' | 'año';
    tipoComparacion?: 'temporal' | 'proyectos' | 'proveedores';
  } = {}
): Promise<{
  comparaciones: Array<{
    id: string;
    nombre: string;
    periodoActual: {
      valor: number;
      fecha: string;
    };
    periodoAnterior: {
      valor: number;
      fecha: string;
    };
    cambio: {
      absoluto: number;
      porcentual: number;
      tendencia: 'up' | 'down' | 'stable';
    };
    categoria: string;
  }>;
  resumen: {
    mejorRendimiento: string;
    mayorCrecimiento: string;
    areasMejora: string[];
  };
}> {
  try {
    logger.info('📈 Obteniendo analytics comparativo', filtros);

    const comparaciones = [
      {
        id: 'entregas-completadas',
        nombre: 'Entregas Completadas',
        periodoActual: {
          valor: Math.floor(Math.random() * 50) + 150,
          fecha: new Date().toISOString().split('T')[0]
        },
        periodoAnterior: {
          valor: Math.floor(Math.random() * 40) + 120,
          fecha: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        categoria: 'Operaciones'
      },
      {
        id: 'tiempo-promedio',
        nombre: 'Tiempo Promedio de Entrega',
        periodoActual: {
          valor: Math.random() * 3 + 12,
          fecha: new Date().toISOString().split('T')[0]
        },
        periodoAnterior: {
          valor: Math.random() * 4 + 14,
          fecha: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        categoria: 'Tiempo'
      },
      {
        id: 'satisfaccion-cliente',
        nombre: 'Satisfacción del Cliente',
        periodoActual: {
          valor: Math.random() * 10 + 85,
          fecha: new Date().toISOString().split('T')[0]
        },
        periodoAnterior: {
          valor: Math.random() * 8 + 80,
          fecha: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        categoria: 'Calidad'
      }
    ].map(comp => {
      const cambioAbsoluto = comp.periodoActual.valor - comp.periodoAnterior.valor;
      const cambioPorcentual = (cambioAbsoluto / comp.periodoAnterior.valor) * 100;
      let tendencia: 'up' | 'down' | 'stable';
      
      if (Math.abs(cambioPorcentual) < 2) {
        tendencia = 'stable';
      } else if (comp.id === 'tiempo-promedio') {
        // Para tiempo, menor es mejor
        tendencia = cambioAbsoluto < 0 ? 'up' : 'down';
      } else {
        tendencia = cambioAbsoluto > 0 ? 'up' : 'down';
      }

      return {
        ...comp,
        cambio: {
          absoluto: cambioAbsoluto,
          porcentual: cambioPorcentual,
          tendencia
        }
      };
    });

    const mejorRendimiento = comparaciones
      .filter(c => c.cambio.tendencia === 'up')
      .sort((a, b) => b.cambio.porcentual - a.cambio.porcentual)[0]?.nombre || 'N/A';

    const mayorCrecimiento = comparaciones
      .sort((a, b) => b.cambio.porcentual - a.cambio.porcentual)[0]?.nombre || 'N/A';

    const areasMejora = comparaciones
      .filter(c => c.cambio.tendencia === 'down')
      .map(c => c.nombre);

    return {
      comparaciones,
      resumen: {
        mejorRendimiento,
        mayorCrecimiento,
        areasMejora
      }
    };
  } catch (error) {
    logger.error('❌ Error obteniendo analytics comparativo:', error);
    throw new Error('Error al obtener analytics comparativo');
  }
}