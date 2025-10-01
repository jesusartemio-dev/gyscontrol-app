// ✅ Types y interfaces para el sistema de Reportes
// 📋 Basado en las funciones de servicios de reportes

import { EstadoEntregaItem } from './modelos'

// 📊 Interface para filtros de reportes
export interface FiltrosReporte {
  proyectoId?: string
  proveedorId?: string
  estadoEntrega?: EstadoEntregaItem
  fechaDesde?: Date
  fechaHasta?: Date
  incluirDetalles?: boolean
}

// 📈 Interface para métricas de dashboard
export interface MetricasDashboard {
  totalPedidos: number
  pedidosCompletados: number
  pedidosPendientes: number
  montoTotal: number
  eficienciaEntrega: number
  tiempoPromedioEntrega: number
}

// 📊 Interface para análisis comparativo
export interface AnalyticsComparativo {
  comparaciones: Array<{
    id: string
    nombre: string
    periodoActual: {
      valor: number
      fecha: string
    }
    periodoAnterior: {
      valor: number
      fecha: string
    }
    cambio: {
      absoluto: number
      porcentual: number
      tendencia: 'up' | 'down' | 'stable'
    }
    categoria: string
  }>
  resumen: {
    mejorRendimiento: string
    mayorCrecimiento: string
    areasMejora: string[]
  }
}

// 🎯 Interface para KPIs operacionales
export interface KPIData {
  kpis: Array<{
    id: string
    nombre: string
    valor: number
    meta: number
    unidad: string
    categoria: 'tiempo' | 'calidad' | 'eficiencia' | 'costo'
    estado: 'excelente' | 'bueno' | 'regular' | 'deficiente'
    tendencia: 'up' | 'down' | 'stable'
    cambio: number
  }>
  resumen: {
    totalKPIs: number
    kpisEnMeta: number
    porcentajeCumplimiento: number
  }
}

// 📊 Interface para métricas de performance
export interface PerformanceMetrics {
  eficienciaGeneral: number
  tiempoPromedioEntrega: number
  tasaCompletitud: number
  indiceCumplimiento: number
  metricas: Array<{
    nombre: string
    valor: number
    unidad: string
    tendencia: 'up' | 'down' | 'stable'
    cambio: number
  }>
}
