/**
 * 📊 Utilidades de Métricas - Sistema de Trazabilidad GYS
 * 
 * Algoritmos para cálculo de KPIs, funciones de agregación
 * y optimización de consultas para métricas de rendimiento.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import type { EstadoEntregaItem } from '@/types/modelos';
import logger from '@/lib/logger';

// 📋 Interfaces para cálculos de métricas
export interface ItemMetrica {
  id: string;
  cantidad: number;
  cantidadAtendida: number;
  estadoEntrega: EstadoEntregaItem;
  fechaCreacion: Date;
  fechaEntregaEstimada?: Date;
  fechaEntregaReal?: Date;
  proyectoId: string;
  proveedorId?: string;
}

export interface MetricasCalculadas {
  totalItems: number;
  totalCantidad: number;
  totalAtendida: number;
  porcentajeProgreso: number;
  tiempoPromedioEntrega: number;
  eficienciaEntrega: number;
  itemsEntregados: number;
  itemsPendientes: number;
  itemsRetrasados: number;
}

export interface DistribucionEstado {
  estado: EstadoEntregaItem;
  cantidad: number;
  porcentaje: number;
}

export interface TendenciaMetrica {
  fecha: string;
  valor: number;
  cambio: number;
  porcentajeCambio: number;
}

export interface ConfiguracionKPI {
  umbralEficiencia: number; // % mínimo para considerar eficiente
  umbralRetraso: number; // días para considerar retrasado
  pesoTiempoEntrega: number; // peso en cálculo de eficiencia
  pesoCantidadEntregada: number; // peso en cálculo de eficiencia
}

// ⚙️ Configuración por defecto para KPIs
const CONFIG_KPI_DEFAULT: ConfiguracionKPI = {
  umbralEficiencia: 85,
  umbralRetraso: 7,
  pesoTiempoEntrega: 0.4,
  pesoCantidadEntregada: 0.6
};

/**
 * 📊 Calcular métricas principales de un conjunto de items
 */
export function calcularMetricasPrincipales(
  items: ItemMetrica[],
  config: Partial<ConfiguracionKPI> = {}
): MetricasCalculadas {
  try {
    const configuracion = { ...CONFIG_KPI_DEFAULT, ...config };
    
    if (!items || items.length === 0) {
      return {
        totalItems: 0,
        totalCantidad: 0,
        totalAtendida: 0,
        porcentajeProgreso: 0,
        tiempoPromedioEntrega: 0,
        eficienciaEntrega: 0,
        itemsEntregados: 0,
        itemsPendientes: 0,
        itemsRetrasados: 0
      };
    }

    // 📈 Cálculos básicos
    const totalItems = items.length;
    const totalCantidad = items.reduce((sum, item) => sum + item.cantidad, 0);
    const totalAtendida = items.reduce((sum, item) => sum + item.cantidadAtendida, 0);
    const porcentajeProgreso = totalCantidad > 0 ? (totalAtendida / totalCantidad) * 100 : 0;

    // 📊 Distribución por estado
    const itemsEntregados = items.filter(item => item.estadoEntrega === 'entregado').length;
  const itemsPendientes = items.filter(item => item.estadoEntrega === 'pendiente').length;
    const itemsRetrasados = calcularItemsRetrasados(items, configuracion.umbralRetraso);

    // ⏱️ Tiempo promedio de entrega
    const tiempoPromedioEntrega = calcularTiempoPromedioEntrega(items);

    // 🎯 Eficiencia de entrega
    const eficienciaEntrega = calcularEficienciaEntrega(items, configuracion);

    const metricas: MetricasCalculadas = {
      totalItems,
      totalCantidad,
      totalAtendida,
      porcentajeProgreso: Math.round(porcentajeProgreso * 100) / 100,
      tiempoPromedioEntrega: Math.round(tiempoPromedioEntrega * 100) / 100,
      eficienciaEntrega: Math.round(eficienciaEntrega * 100) / 100,
      itemsEntregados,
      itemsPendientes,
      itemsRetrasados
    };

    logger.info('Métricas principales calculadas', {
      totalItems: metricas.totalItems,
      porcentajeProgreso: metricas.porcentajeProgreso,
      eficiencia: metricas.eficienciaEntrega
    });

    return metricas;

  } catch (error) {
    logger.error('Error al calcular métricas principales', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      itemsCount: items?.length || 0
    });
    throw error;
  }
}

/**
 * 📊 Calcular distribución por estado
 */
export function calcularDistribucionPorEstado(
  items: ItemMetrica[]
): DistribucionEstado[] {
  try {
    if (!items || items.length === 0) {
      return [];
    }

    const totalItems = items.length;
    const distribucion = new Map<EstadoEntregaItem, number>();

    // 🔢 Contar items por estado
    items.forEach(item => {
      const estado = item.estadoEntrega;
      distribucion.set(estado, (distribucion.get(estado) || 0) + 1);
    });

    // 📊 Convertir a array con porcentajes
    const resultado: DistribucionEstado[] = [];
    
    distribucion.forEach((cantidad, estado) => {
      const porcentaje = (cantidad / totalItems) * 100;
      resultado.push({
        estado,
        cantidad,
        porcentaje: Math.round(porcentaje * 100) / 100
      });
    });

    // 📈 Ordenar por cantidad descendente
    resultado.sort((a, b) => b.cantidad - a.cantidad);

    logger.info('Distribución por estado calculada', {
      totalEstados: resultado.length,
      totalItems
    });

    return resultado;

  } catch (error) {
    logger.error('Error al calcular distribución por estado', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return [];
  }
}

/**
 * ⏱️ Calcular tiempo promedio de entrega
 */
export function calcularTiempoPromedioEntrega(
  items: ItemMetrica[]
): number {
  try {
    const itemsEntregados = items.filter(item => 
      item.estadoEntrega === 'entregado' &&
      item.fechaEntregaReal &&
      item.fechaCreacion
    );

    if (itemsEntregados.length === 0) {
      return 0;
    }

    // 📅 Calcular días de entrega para cada item
    const tiemposEntrega = itemsEntregados.map(item => {
      const fechaCreacion = new Date(item.fechaCreacion);
      const fechaEntrega = new Date(item.fechaEntregaReal!);
      const diferenciaDias = (fechaEntrega.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(0, diferenciaDias); // No permitir valores negativos
    });

    // 📊 Calcular promedio
    const tiempoPromedio = tiemposEntrega.reduce((sum, tiempo) => sum + tiempo, 0) / tiemposEntrega.length;

    return tiempoPromedio;

  } catch (error) {
    logger.error('Error al calcular tiempo promedio de entrega', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return 0;
  }
}

/**
 * 🎯 Calcular eficiencia de entrega
 */
export function calcularEficienciaEntrega(
  items: ItemMetrica[],
  config: ConfiguracionKPI = CONFIG_KPI_DEFAULT
): number {
  try {
    if (!items || items.length === 0) {
      return 0;
    }

    // 📊 Métricas base
    const totalItems = items.length;
    const itemsEntregados = items.filter(item => item.estadoEntrega === 'entregado').length;
    const itemsRetrasados = calcularItemsRetrasados(items, config.umbralRetraso);

    // 📈 Eficiencia por cantidad entregada
    const eficienciaCantidad = totalItems > 0 ? (itemsEntregados / totalItems) * 100 : 0;

    // ⏱️ Eficiencia por tiempo de entrega
    const tiempoPromedio = calcularTiempoPromedioEntrega(items);
    const eficienciaTiempo = tiempoPromedio > 0 ? Math.max(0, 100 - (tiempoPromedio / config.umbralRetraso) * 20) : 100;

    // 🚫 Penalización por retrasos
    const penalizacionRetrasos = totalItems > 0 ? (itemsRetrasados / totalItems) * 30 : 0;

    // 🎯 Cálculo final ponderado
    const eficienciaFinal = (
      eficienciaCantidad * config.pesoCantidadEntregada +
      eficienciaTiempo * config.pesoTiempoEntrega
    ) - penalizacionRetrasos;

    return Math.max(0, Math.min(100, eficienciaFinal));

  } catch (error) {
    logger.error('Error al calcular eficiencia de entrega', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return 0;
  }
}

/**
 * ⚠️ Calcular items retrasados
 */
export function calcularItemsRetrasados(
  items: ItemMetrica[],
  umbralRetraso: number = 7
): number {
  try {
    const ahora = new Date();
    
    const itemsRetrasados = items.filter(item => {
      // ✅ Item ya entregado no cuenta como retrasado
      if (item.estadoEntrega === 'entregado') {
        return false;
      }

      // 📅 Verificar si tiene fecha estimada
      if (!item.fechaEntregaEstimada) {
        // 🔍 Si no tiene fecha estimada, usar fecha de creación + umbral
        const fechaLimite = new Date(item.fechaCreacion);
        fechaLimite.setDate(fechaLimite.getDate() + umbralRetraso);
        return ahora > fechaLimite;
      }

      // ⏰ Verificar si pasó la fecha estimada
      const fechaEstimada = new Date(item.fechaEntregaEstimada);
      return ahora > fechaEstimada;
    });

    return itemsRetrasados.length;

  } catch (error) {
    logger.error('Error al calcular items retrasados', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return 0;
  }
}

/**
 * 📈 Calcular tendencias temporales
 */
export function calcularTendencias(
  datosHistoricos: Array<{ fecha: Date; metricas: MetricasCalculadas }>,
  periodoComparacion: number = 7 // días
): {
  tendenciaProgreso: TendenciaMetrica[];
  tendenciaEficiencia: TendenciaMetrica[];
  resumenTendencias: {
    progresoPromedio: number;
    eficienciaPromedio: number;
    mejoraDiaria: number;
  };
} {
  try {
    if (!datosHistoricos || datosHistoricos.length === 0) {
      return {
        tendenciaProgreso: [],
        tendenciaEficiencia: [],
        resumenTendencias: {
          progresoPromedio: 0,
          eficienciaPromedio: 0,
          mejoraDiaria: 0
        }
      };
    }

    // 📊 Ordenar por fecha
    const datosOrdenados = [...datosHistoricos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    // 📈 Calcular tendencias de progreso
    const tendenciaProgreso: TendenciaMetrica[] = datosOrdenados.map((dato, index) => {
      const valorAnterior = index > 0 ? datosOrdenados[index - 1].metricas.porcentajeProgreso : dato.metricas.porcentajeProgreso;
      const cambio = dato.metricas.porcentajeProgreso - valorAnterior;
      const porcentajeCambio = valorAnterior > 0 ? (cambio / valorAnterior) * 100 : 0;

      return {
        fecha: dato.fecha.toISOString().split('T')[0],
        valor: dato.metricas.porcentajeProgreso,
        cambio,
        porcentajeCambio: Math.round(porcentajeCambio * 100) / 100
      };
    });

    // 🎯 Calcular tendencias de eficiencia
    const tendenciaEficiencia: TendenciaMetrica[] = datosOrdenados.map((dato, index) => {
      const valorAnterior = index > 0 ? datosOrdenados[index - 1].metricas.eficienciaEntrega : dato.metricas.eficienciaEntrega;
      const cambio = dato.metricas.eficienciaEntrega - valorAnterior;
      const porcentajeCambio = valorAnterior > 0 ? (cambio / valorAnterior) * 100 : 0;

      return {
        fecha: dato.fecha.toISOString().split('T')[0],
        valor: dato.metricas.eficienciaEntrega,
        cambio,
        porcentajeCambio: Math.round(porcentajeCambio * 100) / 100
      };
    });

    // 📊 Calcular resumen de tendencias
    const progresoPromedio = tendenciaProgreso.reduce((sum, t) => sum + t.valor, 0) / tendenciaProgreso.length;
    const eficienciaPromedio = tendenciaEficiencia.reduce((sum, t) => sum + t.valor, 0) / tendenciaEficiencia.length;
    
    // 📈 Calcular mejora diaria promedio
    const cambiosProgreso = tendenciaProgreso.slice(1).map(t => t.cambio);
    const mejoraDiaria = cambiosProgreso.length > 0 ? 
      cambiosProgreso.reduce((sum, cambio) => sum + cambio, 0) / cambiosProgreso.length : 0;

    return {
      tendenciaProgreso,
      tendenciaEficiencia,
      resumenTendencias: {
        progresoPromedio: Math.round(progresoPromedio * 100) / 100,
        eficienciaPromedio: Math.round(eficienciaPromedio * 100) / 100,
        mejoraDiaria: Math.round(mejoraDiaria * 100) / 100
      }
    };

  } catch (error) {
    logger.error('Error al calcular tendencias', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return {
      tendenciaProgreso: [],
      tendenciaEficiencia: [],
      resumenTendencias: {
        progresoPromedio: 0,
        eficienciaPromedio: 0,
        mejoraDiaria: 0
      }
    };
  }
}

/**
 * 🔍 Analizar anomalías en métricas
 */
export function analizarAnomalias(
  metricas: MetricasCalculadas,
  historico: MetricasCalculadas[],
  umbralDesviacion: number = 2
): {
  anomaliasDetectadas: Array<{
    metrica: string;
    valorActual: number;
    valorEsperado: number;
    desviacion: number;
    severidad: 'baja' | 'media' | 'alta';
  }>;
  recomendaciones: string[];
} {
  try {
    const anomalias: Array<{
      metrica: string;
      valorActual: number;
      valorEsperado: number;
      desviacion: number;
      severidad: 'baja' | 'media' | 'alta';
    }> = [];
    
    const recomendaciones: string[] = [];

    if (!historico || historico.length === 0) {
      return { anomaliasDetectadas: anomalias, recomendaciones };
    }

    // 📊 Calcular promedios históricos
    const promedios = {
      porcentajeProgreso: historico.reduce((sum, h) => sum + h.porcentajeProgreso, 0) / historico.length,
      eficienciaEntrega: historico.reduce((sum, h) => sum + h.eficienciaEntrega, 0) / historico.length,
      tiempoPromedioEntrega: historico.reduce((sum, h) => sum + h.tiempoPromedioEntrega, 0) / historico.length
    };

    // 📈 Calcular desviaciones estándar
    const desviaciones = {
      porcentajeProgreso: Math.sqrt(
        historico.reduce((sum, h) => sum + Math.pow(h.porcentajeProgreso - promedios.porcentajeProgreso, 2), 0) / historico.length
      ),
      eficienciaEntrega: Math.sqrt(
        historico.reduce((sum, h) => sum + Math.pow(h.eficienciaEntrega - promedios.eficienciaEntrega, 2), 0) / historico.length
      ),
      tiempoPromedioEntrega: Math.sqrt(
        historico.reduce((sum, h) => sum + Math.pow(h.tiempoPromedioEntrega - promedios.tiempoPromedioEntrega, 2), 0) / historico.length
      )
    };

    // 🔍 Detectar anomalías
    const metricas_a_analizar = [
      { nombre: 'porcentajeProgreso', actual: metricas.porcentajeProgreso, promedio: promedios.porcentajeProgreso, desviacion: desviaciones.porcentajeProgreso },
      { nombre: 'eficienciaEntrega', actual: metricas.eficienciaEntrega, promedio: promedios.eficienciaEntrega, desviacion: desviaciones.eficienciaEntrega },
      { nombre: 'tiempoPromedioEntrega', actual: metricas.tiempoPromedioEntrega, promedio: promedios.tiempoPromedioEntrega, desviacion: desviaciones.tiempoPromedioEntrega }
    ];

    metricas_a_analizar.forEach(metrica => {
      if (metrica.desviacion > 0) {
        const zScore = Math.abs(metrica.actual - metrica.promedio) / metrica.desviacion;
        
        if (zScore > umbralDesviacion) {
          const severidad: 'baja' | 'media' | 'alta' = 
            zScore > 3 ? 'alta' : zScore > 2.5 ? 'media' : 'baja';
          
          anomalias.push({
            metrica: metrica.nombre,
            valorActual: metrica.actual,
            valorEsperado: metrica.promedio,
            desviacion: zScore,
            severidad
          });

          // 💡 Generar recomendaciones
          if (metrica.nombre === 'eficienciaEntrega' && metrica.actual < metrica.promedio) {
            recomendaciones.push('Revisar procesos de entrega para mejorar eficiencia');
          }
          if (metrica.nombre === 'tiempoPromedioEntrega' && metrica.actual > metrica.promedio) {
            recomendaciones.push('Optimizar tiempos de entrega, considerar proveedores alternativos');
          }
          if (metrica.nombre === 'porcentajeProgreso' && metrica.actual < metrica.promedio) {
            recomendaciones.push('Acelerar procesamiento de pedidos pendientes');
          }
        }
      }
    });

    logger.info('Análisis de anomalías completado', {
      anomaliasDetectadas: anomalias.length,
      recomendaciones: recomendaciones.length
    });

    return { anomaliasDetectadas: anomalias, recomendaciones };

  } catch (error) {
    logger.error('Error al analizar anomalías', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return { anomaliasDetectadas: [], recomendaciones: [] };
  }
}

/**
 * 🎯 Calcular KPIs específicos por proyecto
 */
export function calcularKPIsPorProyecto(
  itemsPorProyecto: Map<string, ItemMetrica[]>,
  config: ConfiguracionKPI = CONFIG_KPI_DEFAULT
): Map<string, {
  metricas: MetricasCalculadas;
  ranking: number;
  categoria: 'excelente' | 'bueno' | 'regular' | 'deficiente';
}> {
  try {
    const resultados = new Map();
    const proyectosConMetricas: Array<{ proyectoId: string; eficiencia: number }> = [];

    // 📊 Calcular métricas para cada proyecto
    itemsPorProyecto.forEach((items, proyectoId) => {
      const metricas = calcularMetricasPrincipales(items, config);
      proyectosConMetricas.push({ proyectoId, eficiencia: metricas.eficienciaEntrega });
      
      resultados.set(proyectoId, {
        metricas,
        ranking: 0, // Se calculará después
        categoria: categorizarRendimiento(metricas.eficienciaEntrega, config)
      });
    });

    // 🏆 Calcular ranking
    proyectosConMetricas.sort((a, b) => b.eficiencia - a.eficiencia);
    proyectosConMetricas.forEach((proyecto, index) => {
      const datosProyecto = resultados.get(proyecto.proyectoId);
      if (datosProyecto) {
        datosProyecto.ranking = index + 1;
      }
    });

    logger.info('KPIs por proyecto calculados', {
      totalProyectos: resultados.size
    });

    return resultados;

  } catch (error) {
    logger.error('Error al calcular KPIs por proyecto', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return new Map();
  }
}

/**
 * 🏷️ Categorizar rendimiento basado en eficiencia
 */
function categorizarRendimiento(
  eficiencia: number,
  config: ConfiguracionKPI
): 'excelente' | 'bueno' | 'regular' | 'deficiente' {
  if (eficiencia >= config.umbralEficiencia + 10) return 'excelente';
  if (eficiencia >= config.umbralEficiencia) return 'bueno';
  if (eficiencia >= config.umbralEficiencia - 15) return 'regular';
  return 'deficiente';
}

/**
 * 🔄 Optimizar consulta de métricas (simulación)
 */
export function optimizarConsultaMetricas(
  filtros: {
    proyectoIds?: string[];
    fechaDesde?: Date;
    fechaHasta?: Date;
    estadosIncluidos?: EstadoEntregaItem[];
  }
): {
  queryOptimizada: string;
  indicesRecomendados: string[];
  estimacionTiempo: number;
} {
  try {
    let queryOptimizada = 'SELECT * FROM entrega_items';
    const condiciones: string[] = [];
    const indicesRecomendados: string[] = [];
    let estimacionTiempo = 100; // ms base

    // 🔍 Agregar filtros
    if (filtros.proyectoIds && filtros.proyectoIds.length > 0) {
      condiciones.push(`proyecto_id IN (${filtros.proyectoIds.map(id => `'${id}'`).join(', ')})`);
      indicesRecomendados.push('idx_entrega_items_proyecto_id');
      estimacionTiempo += 50;
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      if (filtros.fechaDesde && filtros.fechaHasta) {
        condiciones.push(`fecha_creacion BETWEEN '${filtros.fechaDesde.toISOString()}' AND '${filtros.fechaHasta.toISOString()}'`);
      } else if (filtros.fechaDesde) {
        condiciones.push(`fecha_creacion >= '${filtros.fechaDesde.toISOString()}'`);
      } else if (filtros.fechaHasta) {
        condiciones.push(`fecha_creacion <= '${filtros.fechaHasta.toISOString()}'`);
      }
      indicesRecomendados.push('idx_entrega_items_fecha_creacion');
      estimacionTiempo += 30;
    }

    if (filtros.estadosIncluidos && filtros.estadosIncluidos.length > 0) {
      condiciones.push(`estado_entrega IN (${filtros.estadosIncluidos.map(estado => `'${estado}'`).join(', ')})`);
      indicesRecomendados.push('idx_entrega_items_estado_entrega');
      estimacionTiempo += 20;
    }

    // 🔧 Construir query final
    if (condiciones.length > 0) {
      queryOptimizada += ' WHERE ' + condiciones.join(' AND ');
    }

    // 📊 Agregar optimizaciones
    queryOptimizada += ' ORDER BY fecha_creacion DESC';
    
    // 🎯 Índice compuesto recomendado
    if (indicesRecomendados.length > 1) {
      indicesRecomendados.push('idx_entrega_items_composite (proyecto_id, fecha_creacion, estado_entrega)');
    }

    logger.info('Consulta de métricas optimizada', {
      condiciones: condiciones.length,
      indicesRecomendados: indicesRecomendados.length,
      estimacionTiempo
    });

    return {
      queryOptimizada,
      indicesRecomendados,
      estimacionTiempo
    };

  } catch (error) {
    logger.error('Error al optimizar consulta de métricas', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return {
      queryOptimizada: 'SELECT * FROM entrega_items',
      indicesRecomendados: [],
      estimacionTiempo: 1000
    };
  }
}

/**
 * 📊 Generar datos para gráficos (transformación para Recharts)
 */
export function generarDatosGraficos(
  items: ItemMetrica[],
  tipoGrafico: 'temporal' | 'distribucion' | 'comparativo'
): {
  datos: any[];
  configuracion: {
    colores: string[];
    formatoFecha?: string;
    formatoNumero?: string;
  };
} {
  try {
    let datos: any[] = [];
    const colores = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];
    
    switch (tipoGrafico) {
      case 'temporal':
        datos = generarDatosTemporales(items);
        return {
          datos,
          configuracion: {
            colores,
            formatoFecha: 'DD/MM/YYYY',
            formatoNumero: '0,0'
          }
        };
        
      case 'distribucion':
        datos = generarDatosDistribucion(items);
        return {
          datos,
          configuracion: {
            colores: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
            formatoNumero: '0,0'
          }
        };
        
      case 'comparativo':
        datos = generarDatosComparativos(items);
        return {
          datos,
          configuracion: {
            colores,
            formatoNumero: '0.0%'
          }
        };
        
      default:
        return {
          datos: [],
          configuracion: { colores }
        };
    }
    
  } catch (error) {
    logger.error('Error al generar datos para gráficos', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      tipoGrafico
    });
    return {
      datos: [],
      configuracion: { colores: ['#1e40af'] }
    };
  }
}

/**
 * 📅 Generar datos temporales para gráficos
 */
function generarDatosTemporales(items: ItemMetrica[]): any[] {
  const datosPorFecha = new Map<string, {
    fecha: string;
    entregados: number;
    pendientes: number;
    retrasados: number;
    total: number;
  }>();

  items.forEach(item => {
    const fecha = item.fechaCreacion.toISOString().split('T')[0];
    
    if (!datosPorFecha.has(fecha)) {
      datosPorFecha.set(fecha, {
        fecha,
        entregados: 0,
        pendientes: 0,
        retrasados: 0,
        total: 0
      });
    }

    const datos = datosPorFecha.get(fecha)!;
    datos.total += 1;
    
    switch (item.estadoEntrega) {
      case 'entregado':
        datos.entregados += 1;
        break;
      case 'pendiente':
        datos.pendientes += 1;
        break;
      case 'retrasado':
        datos.retrasados += 1;
        break;
    }
  });

  return Array.from(datosPorFecha.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * 📊 Generar datos de distribución para gráficos
 */
function generarDatosDistribucion(items: ItemMetrica[]): any[] {
  const distribucion = calcularDistribucionPorEstado(items);
  
  return distribucion.map(item => ({
    estado: item.estado,
    cantidad: item.cantidad,
    porcentaje: item.porcentaje,
    label: `${item.estado} (${item.cantidad})`
  }));
}

/**
 * 📈 Generar datos comparativos para gráficos
 */
function generarDatosComparativos(items: ItemMetrica[]): any[] {
  const proyectos = new Map<string, ItemMetrica[]>();
  
  items.forEach(item => {
    if (!proyectos.has(item.proyectoId)) {
      proyectos.set(item.proyectoId, []);
    }
    proyectos.get(item.proyectoId)!.push(item);
  });

  const datos: any[] = [];
  
  proyectos.forEach((itemsProyecto, proyectoId) => {
    const metricas = calcularMetricasPrincipales(itemsProyecto);
    datos.push({
      proyecto: proyectoId,
      progreso: metricas.porcentajeProgreso,
      eficiencia: metricas.eficienciaEntrega,
      items: metricas.totalItems,
      entregados: metricas.itemsEntregados
    });
  });

  return datos.sort((a, b) => b.eficiencia - a.eficiencia);
}

export default {
  calcularMetricasPrincipales,
  calcularDistribucionPorEstado,
  calcularTiempoPromedioEntrega,
  calcularEficienciaEntrega,
  calcularItemsRetrasados,
  calcularTendencias,
  analizarAnomalias,
  calcularKPIsPorProyecto,
  optimizarConsultaMetricas,
  generarDatosGraficos
};
