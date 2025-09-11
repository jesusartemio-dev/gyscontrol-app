/**
 * 📊 Servicio de Cálculos de Aprovisionamiento
 * 
 * Implementa las fórmulas y algoritmos para:
 * - Cálculos de Gantt (fechas de inicio/fin, montos)
 * - Detección de fechas críticas
 * - Validaciones de coherencia
 * - Optimización temporal
 * 
 * @author GYS Team
 * @version 2.0.0
 */

import { addDays, subDays, differenceInDays, isAfter, isBefore, format } from 'date-fns';
import { es } from 'date-fns/locale';

// ✅ Types para cálculos de Gantt
export interface GanttCalculationResult {
  id: string;
  label: string;
  start: Date;
  end: Date;
  amount: number;
  estado: string;
  criticidad: 'baja' | 'media' | 'alta' | 'critica';
  diasRestantes: number;
  porcentajeAvance?: number;
}

export interface ListaGanttData {
  id: string;
  codigo: string;
  fechaNecesaria: Date;
  items: {
    tiempoEntregaDias: number;
    cantidad: number;
    precioElegido: number;
  }[];
  estado: string;
}

export interface PedidoGanttData {
  id: string;
  codigo: string;
  fechaNecesaria: Date;
  listaEquipoId: string;
  items: {
    tiempoEntregaDias: number;
    cantidadPedida: number;
    precioUnitario: number;
  }[];
  estado: string;
}

export interface CoherenciaResult {
  esCoherente: boolean;
  desviacionMonto: number;
  desviacionPorcentaje: number;
  alertas: string[];
  recomendaciones: string[];
}

/**
 * 🧮 Clase principal para cálculos de aprovisionamiento
 */
export class AprovisionamientoCalculos {
  
  /**
   * 📋 Calcula datos de Gantt para Listas de Equipos
   * 
   * Fórmula:
   * - fechaInicio = fechaNecesaria - MAX(tiempoEntregaDias)
   * - fechaFin = fechaNecesaria
   * - monto = SUM(cantidad * precioElegido)
   */
  static calcularGanttListas(listas: ListaGanttData[]): GanttCalculationResult[] {
    return listas.map(lista => {
      // 🔁 Calcular tiempo máximo de entrega
      const tiempoMaximo = Math.max(
        ...lista.items.map(item => item.tiempoEntregaDias),
        0 // fallback si no hay items
      );
      
      // 📅 Calcular fechas
      const fechaFin = lista.fechaNecesaria;
      const fechaInicio = subDays(fechaFin, tiempoMaximo);
      
      // 💰 Calcular monto proyectado
      const montoProyectado = lista.items.reduce(
        (total, item) => total + (item.cantidad * item.precioElegido),
        0
      );
      
      // ⚠️ Calcular criticidad
      const diasRestantes = differenceInDays(fechaFin, new Date());
      const criticidad = this.calcularCriticidad(diasRestantes, lista.estado);
      
      return {
        id: lista.id,
        label: lista.codigo,
        start: fechaInicio,
        end: fechaFin,
        amount: montoProyectado,
        estado: lista.estado,
        criticidad,
        diasRestantes
      };
    });
  }
  
  /**
   * 📦 Calcula datos de Gantt para Pedidos de Equipos
   * 
   * Fórmula:
   * - fechaInicio = fechaNecesaria - MAX(tiempoEntregaDias)
   * - fechaFin = fechaNecesaria
   * - monto = SUM(cantidadPedida * precioUnitario)
   */
  static calcularGanttPedidos(pedidos: PedidoGanttData[]): GanttCalculationResult[] {
    return pedidos.map(pedido => {
      // 🔁 Calcular tiempo máximo de entrega
      const tiempoMaximo = Math.max(
        ...pedido.items.map(item => item.tiempoEntregaDias),
        0
      );
      
      // 📅 Calcular fechas
      const fechaFin = pedido.fechaNecesaria;
      const fechaInicio = subDays(fechaFin, tiempoMaximo);
      
      // 💰 Calcular monto ejecutado
      const montoEjecutado = pedido.items.reduce(
        (total, item) => total + (item.cantidadPedida * item.precioUnitario),
        0
      );
      
      // ⚠️ Calcular criticidad
      const diasRestantes = differenceInDays(fechaFin, new Date());
      const criticidad = this.calcularCriticidad(diasRestantes, pedido.estado);
      
      // 📊 Calcular porcentaje de avance según estado
      const porcentajeAvance = this.calcularPorcentajeAvance(pedido.estado);
      
      return {
        id: pedido.id,
        label: pedido.codigo,
        start: fechaInicio,
        end: fechaFin,
        amount: montoEjecutado,
        estado: pedido.estado,
        criticidad,
        diasRestantes,
        porcentajeAvance
      };
    });
  }
  
  /**
   * ⚠️ Calcula el nivel de criticidad basado en días restantes y estado
   */
  private static calcularCriticidad(
    diasRestantes: number, 
    estado: string
  ): 'baja' | 'media' | 'alta' | 'critica' {
    // 🔴 Estados críticos
    if (['rechazado', 'cancelado'].includes(estado)) {
      return 'critica';
    }
    
    // 📅 Basado en días restantes
    if (diasRestantes < 0) {
      return 'critica'; // Ya venció
    } else if (diasRestantes <= 3) {
      return 'alta'; // Menos de 3 días
    } else if (diasRestantes <= 7) {
      return 'media'; // Menos de una semana
    } else {
      return 'baja'; // Más de una semana
    }
  }
  
  /**
   * 📊 Calcula porcentaje de avance según estado del pedido
   */
  private static calcularPorcentajeAvance(estado: string): number {
    const estadosAvance: Record<string, number> = {
      'borrador': 0,
      'enviado': 25,
      'atendido': 50,
      'parcial': 75,
      'entregado': 100,
      'cancelado': 0
    };
    
    return estadosAvance[estado] || 0;
  }
  
  /**
   * 🔍 Valida coherencia entre lista y sus pedidos asociados
   */
  static validarCoherenciaListaPedidos(
    lista: ListaGanttData,
    pedidos: PedidoGanttData[]
  ): CoherenciaResult {
    // 💰 Calcular montos
    const montoLista = lista.items.reduce(
      (total, item) => total + (item.cantidad * item.precioElegido),
      0
    );
    
    const montoPedidos = pedidos.reduce((total, pedido) => {
      return total + pedido.items.reduce(
        (subtotal, item) => subtotal + (item.cantidadPedida * item.precioUnitario),
        0
      );
    }, 0);
    
    // 📊 Calcular desviaciones
    const desviacionMonto = montoPedidos - montoLista;
    const desviacionPorcentaje = montoLista > 0 
      ? (desviacionMonto / montoLista) * 100 
      : 0;
    
    // ✅ Determinar coherencia
    const tolerancia = 0.01; // 1% de tolerancia
    const esCoherente = Math.abs(desviacionPorcentaje) <= tolerancia;
    
    // ⚠️ Generar alertas
    const alertas: string[] = [];
    const recomendaciones: string[] = [];
    
    if (!esCoherente) {
      if (desviacionMonto > 0) {
        alertas.push(`Pedidos exceden lista en ${AprovisionamientoUtils.formatearMonto(Math.abs(desviacionMonto))}`);
        recomendaciones.push('Revisar cantidades pedidas o ajustar precios en lista');
      } else {
        alertas.push(`Pedidos por debajo de lista en ${AprovisionamientoUtils.formatearMonto(Math.abs(desviacionMonto))}`);
        recomendaciones.push('Completar pedidos faltantes para ejecutar toda la lista');
      }
    }
    
    // 📅 Validar fechas
    const fechasInconsistentes = pedidos.filter(pedido => 
      isAfter(pedido.fechaNecesaria, lista.fechaNecesaria)
    );
    
    if (fechasInconsistentes.length > 0) {
      alertas.push(`${fechasInconsistentes.length} pedidos con fechas posteriores a la lista`);
      recomendaciones.push('Ajustar fechas de pedidos para cumplir cronograma de lista');
    }
    
    return {
      esCoherente,
      desviacionMonto,
      desviacionPorcentaje,
      alertas,
      recomendaciones
    };
  }
  
  /**
   * 📅 Detecta fechas críticas en el cronograma
   */
  static detectarFechasCriticas(
    ganttData: GanttCalculationResult[]
  ): {
    fechasCriticas: Date[];
    elementosCriticos: GanttCalculationResult[];
    recomendaciones: string[];
  } {
    const hoy = new Date();
    const fechasCriticas: Date[] = [];
    const elementosCriticos: GanttCalculationResult[] = [];
    const recomendaciones: string[] = [];
    
    ganttData.forEach(elemento => {
      // 🔴 Elementos ya vencidos
      if (isBefore(elemento.end, hoy)) {
        elementosCriticos.push(elemento);
        fechasCriticas.push(elemento.end);
        recomendaciones.push(`${elemento.label}: Fecha vencida - Revisar estado y reprogramar`);
      }
      // 🟡 Elementos próximos a vencer (menos de 7 días)
      else if (elemento.diasRestantes <= 7 && elemento.diasRestantes > 0) {
        if (elemento.criticidad === 'alta' || elemento.criticidad === 'critica') {
          elementosCriticos.push(elemento);
          fechasCriticas.push(elemento.end);
          recomendaciones.push(`${elemento.label}: Vence en ${elemento.diasRestantes} días - Priorizar`);
        }
      }
    });
    
    return {
      fechasCriticas: [...new Set(fechasCriticas)], // Eliminar duplicados
      elementosCriticos,
      recomendaciones
    };
  }
  
  /**
   * 🎯 Optimiza cronograma para minimizar riesgos
   */
  static optimizarCronograma(
    ganttData: GanttCalculationResult[]
  ): {
    cronogramaOptimizado: GanttCalculationResult[];
    mejoras: string[];
    riesgosIdentificados: string[];
  } {
    const cronogramaOptimizado = [...ganttData];
    const mejoras: string[] = [];
    const riesgosIdentificados: string[] = [];
    
    // 🔍 Identificar conflictos de fechas
    const elementosOrdenados = cronogramaOptimizado.sort(
      (a, b) => a.end.getTime() - b.end.getTime()
    );
    
    // 📊 Analizar carga de trabajo por período
    const cargaPorFecha = new Map<string, number>();
    
    elementosOrdenados.forEach(elemento => {
      const fechaKey = format(elemento.end, 'yyyy-MM-dd');
      const cargaActual = cargaPorFecha.get(fechaKey) || 0;
      cargaPorFecha.set(fechaKey, cargaActual + elemento.amount);
      
      // ⚠️ Detectar sobrecarga (más de 3 elementos en la misma fecha)
      if (cargaActual > 0) {
        riesgosIdentificados.push(
          `Sobrecarga en ${format(elemento.end, 'dd/MM/yyyy', { locale: es })}: múltiples entregas`
        );
        mejoras.push(
          `Considerar escalonar entregas de ${elemento.label} para distribuir carga`
        );
      }
    });
    
    // 🎯 Sugerir optimizaciones
    const elementosCriticos = elementosOrdenados.filter(
      el => el.criticidad === 'alta' || el.criticidad === 'critica'
    );
    
    if (elementosCriticos.length > 0) {
      mejoras.push(
        `Priorizar ${elementosCriticos.length} elementos críticos: ${elementosCriticos.map(el => el.label).join(', ')}`
      );
    }
    
    return {
      cronogramaOptimizado,
      mejoras,
      riesgosIdentificados
    };
  }
  
  /**
   * 📈 Calcula métricas de rendimiento del aprovisionamiento
   */
  static calcularMetricasRendimiento(
    listas: GanttCalculationResult[],
    pedidos: GanttCalculationResult[]
  ): {
    porcentajeEjecucion: number;
    desviacionPromedio: number;
    elementosEnRiesgo: number;
    eficienciaTemporal: number;
    recomendacionesGenerales: string[];
  } {
    // 📊 Calcular porcentaje de ejecución
    const montoTotalListas = listas.reduce((sum, lista) => sum + lista.amount, 0);
    const montoTotalPedidos = pedidos.reduce((sum, pedido) => sum + pedido.amount, 0);
    
    const porcentajeEjecucion = montoTotalListas > 0 
      ? (montoTotalPedidos / montoTotalListas) * 100 
      : 0;
    
    // 📅 Calcular eficiencia temporal
    const elementosATiempo = [...listas, ...pedidos].filter(
      el => el.diasRestantes >= 0
    ).length;
    
    const totalElementos = listas.length + pedidos.length;
    const eficienciaTemporal = totalElementos > 0 
      ? (elementosATiempo / totalElementos) * 100 
      : 100;
    
    // ⚠️ Contar elementos en riesgo
    const elementosEnRiesgo = [...listas, ...pedidos].filter(
      el => el.criticidad === 'alta' || el.criticidad === 'critica'
    ).length;
    
    // 📊 Calcular desviación promedio
    const desviaciones = pedidos.map(pedido => {
      const listaCorrespondiente = listas.find(lista => 
        lista.label === pedido.label.replace('PED-', 'LST-')
      );
      
      if (listaCorrespondiente) {
        return Math.abs(pedido.amount - listaCorrespondiente.amount);
      }
      return 0;
    });
    
    const desviacionPromedio = desviaciones.length > 0 
      ? desviaciones.reduce((sum, dev) => sum + dev, 0) / desviaciones.length 
      : 0;
    
    // 💡 Generar recomendaciones
    const recomendacionesGenerales: string[] = [];
    
    if (porcentajeEjecucion < 80) {
      recomendacionesGenerales.push('Acelerar proceso de pedidos para mejorar ejecución');
    }
    
    if (eficienciaTemporal < 90) {
      recomendacionesGenerales.push('Revisar planificación temporal para reducir retrasos');
    }
    
    if (elementosEnRiesgo > 0) {
      recomendacionesGenerales.push(`Atender ${elementosEnRiesgo} elementos en riesgo prioritariamente`);
    }
    
    if (desviacionPromedio > montoTotalListas * 0.1) {
      recomendacionesGenerales.push('Revisar precisión de estimaciones en listas');
    }
    
    return {
      porcentajeEjecucion,
      desviacionPromedio,
      elementosEnRiesgo,
      eficienciaTemporal,
      recomendacionesGenerales
    };
  }
}

// 🔧 Utilidades auxiliares
export const AprovisionamientoUtils = {
  /**
   * 🎨 Obtiene color según criticidad
   */
  getColorByCriticidad(criticidad: string): string {
    const colores = {
      'baja': '#10b981',    // Verde
      'media': '#f59e0b',   // Amarillo
      'alta': '#ef4444',    // Rojo
      'critica': '#7c2d12'  // Rojo oscuro
    };
    return colores[criticidad as keyof typeof colores] || '#6b7280';
  },
  
  /**
   * 📅 Formatea fecha para display
   */
  formatearFecha(fecha: Date): string {
    return format(fecha, 'dd/MM/yyyy', { locale: es });
  },
  
  /**
   * 💰 Formatea monto en soles
   */
  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(monto);
  },
  
  /**
   * 📊 Formatea porcentaje
   */
  formatearPorcentaje(porcentaje: number): string {
    return `${porcentaje.toFixed(1)}%`;
  }
};
