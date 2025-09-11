/**
 * 📊 Utilidades de Gráficos - Sistema de Trazabilidad GYS
 * 
 * Transformación de datos para Recharts, formateo de fechas/números
 * y configuración de colores para visualizaciones.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import type { EstadoEntregaItem } from '@/types/modelos';
import logger from '@/lib/logger';

// 🎨 Paleta de colores del sistema GYS
export const COLORES_GYS = {
  // Colores principales
  primario: '#1e40af', // Azul corporativo
  secundario: '#3b82f6',
  acento: '#60a5fa',
  
  // Estados de entrega
  entregado: '#10b981', // Verde
  pendiente: '#f59e0b', // Amarillo
  retrasado: '#ef4444', // Rojo
  cancelado: '#6b7280', // Gris
  
  // Gradientes
  gradientes: {
    azul: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
    verde: ['#065f46', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
    amarillo: ['#92400e', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
    rojo: ['#991b1b', '#ef4444', '#f87171', '#fca5a5', '#fecaca'],
    gris: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6']
  },
  
  // Colores para métricas
  metricas: {
    excelente: '#10b981',
    bueno: '#3b82f6',
    regular: '#f59e0b',
    deficiente: '#ef4444'
  },
  
  // Colores para gráficos específicos
  graficos: {
    barras: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'],
    lineas: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    areas: ['#1e40af', '#10b981', '#f59e0b', '#ef4444'],
    pie: ['#1e40af', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  }
};

// 📅 Configuración de formato de fechas
export const FORMATOS_FECHA = {
  corto: 'DD/MM', // Para ejes de gráficos
  medio: 'DD/MM/YYYY', // Para tooltips
  largo: 'DD de MMMM, YYYY', // Para títulos
  iso: 'YYYY-MM-DD', // Para APIs
  hora: 'HH:mm', // Para timeline
  completo: 'DD/MM/YYYY HH:mm' // Para detalles
};

// 🔢 Configuración de formato de números
export const FORMATOS_NUMERO = {
  entero: '0,0',
  decimal: '0,0.0',
  porcentaje: '0.0%',
  moneda: 'S/ 0,0.00',
  monedaUSD: '$ 0,0.00',
  compacto: '0.0a' // 1.2k, 1.5M, etc.
};

// 📊 Interfaces para datos de gráficos
export interface DatosGraficoTemporal {
  fecha: string;
  fechaFormateada: string;
  entregados: number;
  pendientes: number;
  retrasados: number;
  total: number;
  porcentajeProgreso: number;
}

export interface DatosGraficoDistribucion {
  estado: EstadoEntregaItem;
  cantidad: number;
  porcentaje: number;
  color: string;
  label: string;
}

export interface DatosGraficoComparativo {
  proyecto: string;
  proyectoId: string;
  progreso: number;
  eficiencia: number;
  items: number;
  entregados: number;
  color: string;
  categoria: 'excelente' | 'bueno' | 'regular' | 'deficiente';
}

export interface DatosGraficoMetricas {
  metrica: string;
  valor: number;
  valorAnterior: number;
  cambio: number;
  porcentajeCambio: number;
  tendencia: 'subida' | 'bajada' | 'estable';
  color: string;
}

export interface ConfiguracionGrafico {
  tipo: 'linea' | 'barra' | 'area' | 'pie' | 'radar' | 'scatter';
  colores: string[];
  animaciones: boolean;
  responsive: boolean;
  leyenda: boolean;
  tooltip: boolean;
  grid: boolean;
  ejes: {
    x: {
      mostrar: boolean;
      formato?: string;
      rotacion?: number;
    };
    y: {
      mostrar: boolean;
      formato?: string;
      dominio?: [number, number];
    };
  };
}

/**
 * 📊 Transformar datos para gráfico temporal
 */
export function transformarDatosTemporales(
  datos: Array<{
    fecha: Date | string;
    entregados?: number;
    pendientes?: number;
    retrasados?: number;
    [key: string]: any;
  }>,
  opciones: {
    formatoFecha?: keyof typeof FORMATOS_FECHA;
    incluirTotales?: boolean;
    incluirPorcentajes?: boolean;
  } = {}
): DatosGraficoTemporal[] {
  try {
    const { formatoFecha = 'corto', incluirTotales = true, incluirPorcentajes = true } = opciones;
    
    const datosTransformados: DatosGraficoTemporal[] = datos.map(item => {
      const fecha = typeof item.fecha === 'string' ? new Date(item.fecha) : item.fecha;
      const entregados = item.entregados || 0;
      const pendientes = item.pendientes || 0;
      const retrasados = item.retrasados || 0;
      const total = incluirTotales ? entregados + pendientes + retrasados : (item.total || 0);
      const porcentajeProgreso = total > 0 ? (entregados / total) * 100 : 0;
      
      return {
        fecha: fecha.toISOString().split('T')[0],
        fechaFormateada: formatearFecha(fecha, formatoFecha),
        entregados,
        pendientes,
        retrasados,
        total,
        porcentajeProgreso: incluirPorcentajes ? Math.round(porcentajeProgreso * 100) / 100 : 0
      };
    });
    
    // 📈 Ordenar por fecha
    datosTransformados.sort((a, b) => a.fecha.localeCompare(b.fecha));
    
    logger.info('Datos temporales transformados', {
      totalPuntos: datosTransformados.length,
      rangoFechas: {
        inicio: datosTransformados[0]?.fecha,
        fin: datosTransformados[datosTransformados.length - 1]?.fecha
      }
    });
    
    return datosTransformados;
    
  } catch (error) {
    logger.error('Error al transformar datos temporales', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      datosCount: datos?.length || 0
    });
    return [];
  }
}

/**
 * 🥧 Transformar datos para gráfico de distribución (pie/donut)
 */
export function transformarDatosDistribucion(
  datos: Array<{
    estado: EstadoEntregaItem;
    cantidad: number;
    porcentaje?: number;
  }>,
  opciones: {
    incluirPorcentajes?: boolean;
    coloresPersonalizados?: Record<EstadoEntregaItem, string>;
  } = {}
): DatosGraficoDistribucion[] {
  try {
    const { incluirPorcentajes = true, coloresPersonalizados } = opciones;
    
    // 📊 Calcular total si es necesario
    const total = datos.reduce((sum, item) => sum + item.cantidad, 0);
    
    const datosTransformados: DatosGraficoDistribucion[] = datos.map(item => {
      const porcentaje = incluirPorcentajes && total > 0 ? 
        (item.cantidad / total) * 100 : (item.porcentaje || 0);
      
      // 🎨 Asignar color según estado
      let color: string;
      if (coloresPersonalizados && coloresPersonalizados[item.estado]) {
        color = coloresPersonalizados[item.estado];
      } else {
        switch (item.estado) {
          case 'entregado':
            color = COLORES_GYS.entregado;
            break;
          case 'pendiente':
            color = COLORES_GYS.pendiente;
            break;
          case 'retrasado':
            color = COLORES_GYS.retrasado;
            break;
          default:
            color = COLORES_GYS.cancelado;
        }
      }
      
      return {
        estado: item.estado,
        cantidad: item.cantidad,
        porcentaje: Math.round(porcentaje * 100) / 100,
        color,
        label: `${item.estado} (${item.cantidad})`
      };
    });
    
    // 📈 Ordenar por cantidad descendente
    datosTransformados.sort((a, b) => b.cantidad - a.cantidad);
    
    logger.info('Datos de distribución transformados', {
      totalCategorias: datosTransformados.length,
      totalItems: total
    });
    
    return datosTransformados;
    
  } catch (error) {
    logger.error('Error al transformar datos de distribución', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return [];
  }
}

/**
 * 📊 Transformar datos para gráfico comparativo
 */
export function transformarDatosComparativos(
  datos: Array<{
    proyecto: string;
    proyectoId: string;
    progreso: number;
    eficiencia: number;
    items: number;
    entregados: number;
    categoria?: 'excelente' | 'bueno' | 'regular' | 'deficiente';
  }>,
  opciones: {
    ordenarPor?: 'progreso' | 'eficiencia' | 'items';
    limite?: number;
  } = {}
): DatosGraficoComparativo[] {
  try {
    const { ordenarPor = 'eficiencia', limite } = opciones;
    
    const datosTransformados: DatosGraficoComparativo[] = datos.map((item, index) => {
      // 🏷️ Determinar categoría si no está definida
      let categoria = item.categoria;
      if (!categoria) {
        if (item.eficiencia >= 95) categoria = 'excelente';
        else if (item.eficiencia >= 85) categoria = 'bueno';
        else if (item.eficiencia >= 70) categoria = 'regular';
        else categoria = 'deficiente';
      }
      
      // 🎨 Asignar color según categoría
      const color = COLORES_GYS.metricas[categoria];
      
      return {
        proyecto: item.proyecto,
        proyectoId: item.proyectoId,
        progreso: Math.round(item.progreso * 100) / 100,
        eficiencia: Math.round(item.eficiencia * 100) / 100,
        items: item.items,
        entregados: item.entregados,
        color,
        categoria
      };
    });
    
    // 📈 Ordenar según criterio
    switch (ordenarPor) {
      case 'progreso':
        datosTransformados.sort((a, b) => b.progreso - a.progreso);
        break;
      case 'items':
        datosTransformados.sort((a, b) => b.items - a.items);
        break;
      case 'eficiencia':
      default:
        datosTransformados.sort((a, b) => b.eficiencia - a.eficiencia);
    }
    
    // ✂️ Aplicar límite si se especifica
    const resultado = limite ? datosTransformados.slice(0, limite) : datosTransformados;
    
    logger.info('Datos comparativos transformados', {
      totalProyectos: resultado.length,
      ordenadoPor: ordenarPor,
      limite
    });
    
    return resultado;
    
  } catch (error) {
    logger.error('Error al transformar datos comparativos', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return [];
  }
}

/**
 * 📈 Transformar datos para gráfico de métricas
 */
export function transformarDatosMetricas(
  datos: Array<{
    metrica: string;
    valor: number;
    valorAnterior?: number;
  }>
): DatosGraficoMetricas[] {
  try {
    const datosTransformados: DatosGraficoMetricas[] = datos.map(item => {
      const valorAnterior = item.valorAnterior || 0;
      const cambio = item.valor - valorAnterior;
      const porcentajeCambio = valorAnterior > 0 ? (cambio / valorAnterior) * 100 : 0;
      
      // 📊 Determinar tendencia
      let tendencia: 'subida' | 'bajada' | 'estable';
      if (Math.abs(porcentajeCambio) < 1) tendencia = 'estable';
      else if (cambio > 0) tendencia = 'subida';
      else tendencia = 'bajada';
      
      // 🎨 Asignar color según tendencia
      let color: string;
      switch (tendencia) {
        case 'subida':
          color = COLORES_GYS.entregado;
          break;
        case 'bajada':
          color = COLORES_GYS.retrasado;
          break;
        case 'estable':
        default:
          color = COLORES_GYS.pendiente;
      }
      
      return {
        metrica: item.metrica,
        valor: Math.round(item.valor * 100) / 100,
        valorAnterior: Math.round(valorAnterior * 100) / 100,
        cambio: Math.round(cambio * 100) / 100,
        porcentajeCambio: Math.round(porcentajeCambio * 100) / 100,
        tendencia,
        color
      };
    });
    
    logger.info('Datos de métricas transformados', {
      totalMetricas: datosTransformados.length
    });
    
    return datosTransformados;
    
  } catch (error) {
    logger.error('Error al transformar datos de métricas', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    return [];
  }
}

/**
 * 📅 Formatear fecha según formato especificado
 */
export function formatearFecha(
  fecha: Date | string,
  formato: keyof typeof FORMATOS_FECHA = 'medio'
): string {
  try {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    
    if (isNaN(fechaObj.getTime())) {
      return 'Fecha inválida';
    }
    
    const opciones: Intl.DateTimeFormatOptions = {};
    
    switch (formato) {
      case 'corto':
        return fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
      case 'medio':
        return fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      case 'largo':
        return fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
      case 'iso':
        return fechaObj.toISOString().split('T')[0];
      case 'hora':
        return fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      case 'completo':
        return fechaObj.toLocaleString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      default:
        return fechaObj.toLocaleDateString('es-PE');
    }
    
  } catch (error) {
    logger.error('Error al formatear fecha', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      fecha,
      formato
    });
    return 'Error en fecha';
  }
}

/**
 * 🔢 Formatear número según formato especificado
 */
export function formatearNumero(
  numero: number,
  formato: keyof typeof FORMATOS_NUMERO = 'entero'
): string {
  try {
    if (isNaN(numero)) {
      return '0';
    }
    
    switch (formato) {
      case 'entero':
        return new Intl.NumberFormat('es-PE').format(Math.round(numero));
      case 'decimal':
        return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(numero);
      case 'porcentaje':
        return new Intl.NumberFormat('es-PE', { style: 'percent', minimumFractionDigits: 1 }).format(numero / 100);
      case 'moneda':
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(numero);
      case 'monedaUSD':
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(numero);
      case 'compacto':
        return new Intl.NumberFormat('es-PE', { notation: 'compact', compactDisplay: 'short' }).format(numero);
      default:
        return numero.toString();
    }
    
  } catch (error) {
    logger.error('Error al formatear número', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      numero,
      formato
    });
    return numero.toString();
  }
}

/**
 * ⚙️ Generar configuración de gráfico
 */
export function generarConfiguracionGrafico(
  tipo: ConfiguracionGrafico['tipo'],
  opciones: Partial<ConfiguracionGrafico> = {}
): ConfiguracionGrafico {
  const configuracionBase: ConfiguracionGrafico = {
    tipo,
    colores: COLORES_GYS.graficos[tipo === 'pie' ? 'pie' : 'barras'],
    animaciones: true,
    responsive: true,
    leyenda: true,
    tooltip: true,
    grid: tipo !== 'pie',
    ejes: {
      x: {
        mostrar: tipo !== 'pie',
        formato: 'texto',
        rotacion: 0
      },
      y: {
        mostrar: tipo !== 'pie',
        formato: 'numero'
      }
    }
  };
  
  // 🔧 Configuraciones específicas por tipo
  switch (tipo) {
    case 'linea':
      configuracionBase.colores = COLORES_GYS.graficos.lineas;
      configuracionBase.ejes.x.formato = 'fecha';
      break;
    case 'area':
      configuracionBase.colores = COLORES_GYS.graficos.areas;
      configuracionBase.ejes.x.formato = 'fecha';
      break;
    case 'pie':
      configuracionBase.colores = COLORES_GYS.graficos.pie;
      configuracionBase.grid = false;
      configuracionBase.ejes.x.mostrar = false;
      configuracionBase.ejes.y.mostrar = false;
      break;
    case 'radar':
      configuracionBase.colores = COLORES_GYS.gradientes.azul;
      configuracionBase.grid = false;
      break;
  }
  
  // 🔄 Aplicar opciones personalizadas
  return {
    ...configuracionBase,
    ...opciones,
    ejes: {
      ...configuracionBase.ejes,
      ...opciones.ejes
    }
  };
}

/**
 * 🎨 Obtener paleta de colores para dataset
 */
export function obtenerPaletaColores(
  cantidad: number,
  tipo: 'gradiente' | 'contrastante' | 'monocromatico' = 'gradiente'
): string[] {
  try {
    if (cantidad <= 0) return [];
    
    switch (tipo) {
      case 'gradiente':
        return generarGradienteColores(COLORES_GYS.primario, cantidad);
      case 'contrastante':
        return COLORES_GYS.graficos.pie.slice(0, cantidad);
      case 'monocromatico':
        return COLORES_GYS.gradientes.azul.slice(0, cantidad);
      default:
        return COLORES_GYS.graficos.barras.slice(0, cantidad);
    }
    
  } catch (error) {
    logger.error('Error al obtener paleta de colores', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      cantidad,
      tipo
    });
    return [COLORES_GYS.primario];
  }
}

/**
 * 🌈 Generar gradiente de colores
 */
function generarGradienteColores(colorBase: string, cantidad: number): string[] {
  const colores: string[] = [];
  
  // 🎨 Convertir hex a RGB
  const hex = colorBase.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 🔄 Generar variaciones
  for (let i = 0; i < cantidad; i++) {
    const factor = 1 - (i * 0.15); // Oscurecer gradualmente
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    
    const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    colores.push(newHex);
  }
  
  return colores;
}

/**
 * 📊 Generar datos de ejemplo para testing
 */
export function generarDatosEjemplo(
  tipo: 'temporal' | 'distribucion' | 'comparativo' | 'metricas',
  cantidad: number = 10
): any[] {
  const datos: any[] = [];
  
  switch (tipo) {
    case 'temporal':
      for (let i = 0; i < cantidad; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - (cantidad - i));
        datos.push({
          fecha,
          entregados: Math.floor(Math.random() * 50) + 10,
          pendientes: Math.floor(Math.random() * 30) + 5,
          retrasados: Math.floor(Math.random() * 10)
        });
      }
      break;
      
    case 'distribucion':
      datos.push(
        { estado: 'entregado' as EstadoEntregaItem, cantidad: 45 },
        { estado: 'pendiente' as EstadoEntregaItem, cantidad: 30 },
        { estado: 'retrasado' as EstadoEntregaItem, cantidad: 15 }
      );
      break;
      
    case 'comparativo':
      for (let i = 0; i < cantidad; i++) {
        datos.push({
          proyecto: `Proyecto ${i + 1}`,
          proyectoId: `proj-${i + 1}`,
          progreso: Math.random() * 100,
          eficiencia: Math.random() * 100,
          items: Math.floor(Math.random() * 100) + 10,
          entregados: Math.floor(Math.random() * 80) + 5
        });
      }
      break;
      
    case 'metricas':
      const metricas = ['Eficiencia', 'Progreso', 'Calidad', 'Tiempo'];
      metricas.forEach(metrica => {
        datos.push({
          metrica,
          valor: Math.random() * 100,
          valorAnterior: Math.random() * 100
        });
      });
      break;
  }
  
  return datos;
}

export default {
  COLORES_GYS,
  FORMATOS_FECHA,
  FORMATOS_NUMERO,
  transformarDatosTemporales,
  transformarDatosDistribucion,
  transformarDatosComparativos,
  transformarDatosMetricas,
  formatearFecha,
  formatearNumero,
  generarConfiguracionGrafico,
  obtenerPaletaColores,
  generarDatosEjemplo
};
