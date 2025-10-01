// ===================================================
// 📁 Archivo: dashboard.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio para métricas y datos del dashboard
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-09-24
// ===================================================

export interface DashboardMetrics {
  totalProyectos: number
  proyectosActivos: number
  totalCotizaciones: number
  cotizacionesAprobadas: number
  ingresosTotales: number
  proyectosCompletados: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}

export async function obtenerMetricasDashboard(): Promise<DashboardMetrics> {
  // Mock implementation for testing
  return {
    totalProyectos: 25,
    proyectosActivos: 18,
    totalCotizaciones: 45,
    cotizacionesAprobadas: 32,
    ingresosTotales: 1250000,
    proyectosCompletados: 7
  }
}

export async function obtenerDatosGraficos(tipo: string): Promise<ChartData> {
  // Mock implementation for testing
  switch (tipo) {
    case 'proyectos':
      return {
        labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'],
        datasets: [{
          label: 'Proyectos',
          data: [12, 19, 15, 25, 22],
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)'
        }]
      }
    case 'ingresos':
      return {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Ingresos',
          data: [300000, 450000, 380000, 520000],
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgb(16, 185, 129)'
        }]
      }
    default:
      return {
        labels: [],
        datasets: []
      }
  }
}
