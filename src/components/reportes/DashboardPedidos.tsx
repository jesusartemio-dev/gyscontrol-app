/**
 * 📊 Dashboard de Pedidos - Minimalista
 * @author GYS Team
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  CheckCircle,
  X,
  Activity,
  Truck,
  Calendar,
  ExternalLink,
  Eye
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import TrazabilidadTimeline from '@/components/trazabilidad/TrazabilidadTimeline'
import MetricasEntrega from '@/components/trazabilidad/MetricasEntrega'
import GraficoProgreso from '@/components/trazabilidad/GraficoProgreso'
import { generarReportePedidos, obtenerDashboardMetricas } from '@/lib/services/reportes'
import { type SerieGrafico } from '@/components/trazabilidad/GraficoProgreso'
import { MetricaEntrega } from '@/components/trazabilidad/MetricasEntrega'
import { EstadoEntregaItem } from '@/types/modelos'
import type { ReportePedidos, MetricasDashboard, FiltrosReporte } from '@/lib/services/reportes'

interface DashboardPedidosProps {
  proyectoId?: string
  className?: string
}

interface FiltrosState {
  fechaInicio: string
  fechaFin: string
  estado: string
  proyecto: string
  proveedor: string
}

interface ProyectoOption {
  id: string
  nombre: string
  codigo?: string
}

interface ProveedorOption {
  id: string
  nombre: string
  ruc?: string
}

interface AlertaCalculada {
  tipo: 'retrasado' | 'proximo' | 'completado' | 'critico'
  mensaje: string
  cantidad: number
  color: string
  icono: 'AlertTriangle' | 'Clock' | 'CheckCircle' | 'AlertTriangle'
}

interface PedidoItemDetalle {
  id: string
  equipo: {
    nombre: string
    codigo: string
    categoria: string
  }
  pedido: {
    id: string
    proyecto?: string
    proveedor?: string
  }
  cantidad: number
  cantidadAtendida: number
  estadoEntrega: string
  progreso: number
  observaciones?: string
}

// Transformar datos de gráficos
// API returns: { estado, cantidad, fecha }[] grouped by estado
// We need to transform into series format for the chart
function transformarDatosGraficos(graficos?: ReportePedidos['graficos']): SerieGrafico[] {
  if (!graficos?.progresoTemporal?.length) return []

  // Group data by estado and create data points
  const dataByEstado: Record<string, number> = {}
  const fecha = graficos.progresoTemporal[0]?.fecha || new Date().toISOString().split('T')[0]

  graficos.progresoTemporal.forEach(item => {
    const estado = (item as any).estado || 'pendiente'
    const cantidad = (item as any).cantidad || item.entregados || 0
    dataByEstado[estado] = (dataByEstado[estado] || 0) + cantidad
  })

  // Map estados to chart categories
  const entregados = (dataByEstado['entregado'] || 0) + (dataByEstado['ENTREGADO'] || 0)
  const pendientes = (dataByEstado['pendiente'] || 0) + (dataByEstado['PENDIENTE'] || 0)
  const enProceso = (dataByEstado['en_proceso'] || 0) + (dataByEstado['EN_PROCESO'] || 0) + (dataByEstado['atendido'] || 0) + (dataByEstado['ATENDIDO'] || 0)
  const retrasados = (dataByEstado['retrasado'] || 0) + (dataByEstado['RETRASADO'] || 0)
  const parcial = (dataByEstado['parcial'] || 0) + (dataByEstado['PARCIAL'] || 0)

  const series: SerieGrafico[] = [
    {
      id: 'entregados',
      nombre: 'Entregados',
      datos: [{
        fecha,
        valor: entregados,
        categoria: 'entregados',
        estado: 'completado' as const
      }],
      color: '#10b981',
      tipo: 'area' as const,
      visible: true,
      formato: 'entero',
      unidad: 'items'
    },
    {
      id: 'en_proceso',
      nombre: 'En Proceso',
      datos: [{
        fecha,
        valor: enProceso,
        categoria: 'en_proceso',
        estado: 'en_progreso' as const
      }],
      color: '#3b82f6',
      tipo: 'area' as const,
      visible: true,
      formato: 'entero',
      unidad: 'items'
    },
    {
      id: 'pendientes',
      nombre: 'Pendientes',
      datos: [{
        fecha,
        valor: pendientes,
        categoria: 'pendientes',
        estado: 'en_progreso' as const
      }],
      color: '#6366f1',
      tipo: 'area' as const,
      visible: true,
      formato: 'entero',
      unidad: 'items'
    },
    {
      id: 'parcial',
      nombre: 'Parcial',
      datos: [{
        fecha,
        valor: parcial,
        categoria: 'parcial',
        estado: 'en_progreso' as const
      }],
      color: '#8b5cf6',
      tipo: 'area' as const,
      visible: true,
      formato: 'entero',
      unidad: 'items'
    },
    {
      id: 'retrasados',
      nombre: 'Retrasados',
      datos: [{
        fecha,
        valor: retrasados,
        categoria: 'retrasados',
        estado: 'retrasado' as const
      }],
      color: '#f59e0b',
      tipo: 'area' as const,
      visible: true,
      formato: 'entero',
      unidad: 'items'
    }
  ]

  return series.filter(serie => serie.datos[0].valor > 0) // Only show series with data
}

// Transformar métricas - ahora genera métricas desde los datos disponibles
function transformarMetricasEntrega(dashboardMetricas: MetricasDashboard | null): MetricaEntrega[] {
  if (!dashboardMetricas) return []

  const metricas: MetricaEntrega[] = []
  const ahora = new Date()

  // If API returns metricas array, use it
  if (dashboardMetricas.metricas && dashboardMetricas.metricas.length > 0) {
    return dashboardMetricas.metricas.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      valor: m.valor,
      valorAnterior: m.valorAnterior,
      unidad: m.unidad,
      formato: m.formato,
      tendencia: m.tendencia === 'subida' ? 'subida' : m.tendencia === 'bajada' ? 'bajada' : 'estable',
      porcentajeCambio: m.porcentajeCambio,
      descripcion: m.descripcion,
      meta: m.meta,
      categoria: m.categoria,
      icono: <Package className="w-3 h-3" />,
      color: m.color,
      ultimaActualizacion: m.ultimaActualizacion
    }))
  }

  // Otherwise, generate metrics from resumenGeneral and kpis
  if (dashboardMetricas.resumenGeneral) {
    const resumen = dashboardMetricas.resumenGeneral

    metricas.push({
      id: 'total-items',
      titulo: 'Total Items',
      valor: resumen.totalItems,
      unidad: 'items',
      formato: 'entero',
      tendencia: 'estable',
      porcentajeCambio: 0,
      descripcion: 'Total de items en pedidos',
      categoria: 'principal',
      icono: <Package className="w-3 h-3" />,
      color: 'blue',
      ultimaActualizacion: ahora
    })

    metricas.push({
      id: 'progreso',
      titulo: 'Progreso General',
      valor: resumen.porcentajeProgreso,
      unidad: '%',
      formato: 'porcentaje',
      tendencia: resumen.porcentajeProgreso > 50 ? 'subida' : 'bajada',
      porcentajeCambio: resumen.porcentajeProgreso,
      descripcion: 'Porcentaje de completitud',
      meta: 100,
      categoria: 'principal',
      icono: <TrendingUp className="w-3 h-3" />,
      color: 'green',
      ultimaActualizacion: ahora
    })

    metricas.push({
      id: 'tiempo-promedio',
      titulo: 'Tiempo Promedio',
      valor: resumen.tiempoPromedioEntrega,
      unidad: 'días',
      formato: 'decimal',
      tendencia: resumen.tiempoPromedioEntrega < 7 ? 'subida' : 'bajada',
      porcentajeCambio: 0,
      descripcion: 'Tiempo promedio de entrega',
      categoria: 'secundaria',
      icono: <Clock className="w-3 h-3" />,
      color: 'yellow',
      ultimaActualizacion: ahora
    })
  }

  if (dashboardMetricas.kpis) {
    const kpis = dashboardMetricas.kpis

    metricas.push({
      id: 'items-entregados',
      titulo: 'Items Entregados',
      valor: kpis.itemsEntregados,
      unidad: 'items',
      formato: 'entero',
      tendencia: 'subida',
      porcentajeCambio: 0,
      descripcion: 'Items completamente entregados',
      categoria: 'principal',
      icono: <CheckCircle className="w-3 h-3" />,
      color: 'green',
      ultimaActualizacion: ahora
    })

    metricas.push({
      id: 'items-pendientes',
      titulo: 'Items Pendientes',
      valor: kpis.itemsPendientes,
      unidad: 'items',
      formato: 'entero',
      tendencia: kpis.itemsPendientes > 0 ? 'bajada' : 'estable',
      porcentajeCambio: 0,
      descripcion: 'Items pendientes de entrega',
      categoria: 'secundaria',
      icono: <Clock className="w-3 h-3" />,
      color: 'yellow',
      ultimaActualizacion: ahora
    })

    if (kpis.itemsRetrasados > 0) {
      metricas.push({
        id: 'items-retrasados',
        titulo: 'Items Retrasados',
        valor: kpis.itemsRetrasados,
        unidad: 'items',
        formato: 'entero',
        tendencia: 'bajada',
        porcentajeCambio: 0,
        descripcion: 'Items con retraso en entrega',
        categoria: 'critica',
        icono: <AlertTriangle className="w-3 h-3" />,
        color: 'red',
        ultimaActualizacion: ahora
      })
    }

    metricas.push({
      id: 'eficiencia',
      titulo: 'Eficiencia de Entrega',
      valor: kpis.eficienciaEntrega,
      unidad: '%',
      formato: 'porcentaje',
      tendencia: kpis.eficienciaEntrega >= 80 ? 'subida' : kpis.eficienciaEntrega >= 50 ? 'estable' : 'bajada',
      porcentajeCambio: kpis.eficienciaEntrega,
      descripcion: 'Tasa de entregas exitosas',
      meta: 90,
      categoria: kpis.eficienciaEntrega < 50 ? 'critica' : 'principal',
      icono: <Activity className="w-3 h-3" />,
      color: kpis.eficienciaEntrega >= 80 ? 'green' : kpis.eficienciaEntrega >= 50 ? 'yellow' : 'red',
      ultimaActualizacion: ahora
    })
  }

  return metricas
}

// Generate timeline events from metrics data
function generarEventosTimeline(metricas: MetricasDashboard | null): ReportePedidos['timeline'] {
  if (!metricas) return []

  const eventos: ReportePedidos['timeline'] = []
  const ahora = new Date()

  // Create events based on distribution by state
  metricas.distribucionPorEstado?.forEach((item, index) => {
    if (item.cantidad > 0) {
      const fechaEvento = new Date(ahora.getTime() - (index * 24 * 60 * 60 * 1000))

      let tipo: 'creacion' | 'preparacion' | 'envio' | 'transito' | 'entrega' | 'incidencia' | 'devolucion' | 'cancelacion' = 'creacion'
      let titulo = ''

      switch (item.estado) {
        case EstadoEntregaItem.ENTREGADO:
          tipo = 'entrega'
          titulo = `${item.cantidad} items entregados`
          break
        case EstadoEntregaItem.PENDIENTE:
          tipo = 'creacion'
          titulo = `${item.cantidad} items pendientes de entrega`
          break
        case EstadoEntregaItem.EN_PROCESO:
          tipo = 'transito'
          titulo = `${item.cantidad} items en proceso`
          break
        case EstadoEntregaItem.PARCIAL:
          tipo = 'envio'
          titulo = `${item.cantidad} items con entrega parcial`
          break
        case EstadoEntregaItem.RETRASADO:
          tipo = 'incidencia'
          titulo = `${item.cantidad} items retrasados`
          break
        case EstadoEntregaItem.CANCELADO:
          tipo = 'cancelacion'
          titulo = `${item.cantidad} items cancelados`
          break
        default:
          tipo = 'creacion'
          titulo = `${item.cantidad} items - ${item.estado}`
      }

      eventos.push({
        id: `event-${item.estado}-${index}`,
        fecha: fechaEvento,
        tipo,
        estado: item.estado,
        titulo,
        descripcion: `Representa ${item.porcentaje}% del total de items`,
        esHito: item.estado === EstadoEntregaItem.ENTREGADO && item.cantidad > 0
      })
    }
  })

  // Add summary event
  if (metricas.resumenGeneral) {
    eventos.unshift({
      id: 'event-resumen',
      fecha: ahora,
      tipo: 'creacion',
      estado: EstadoEntregaItem.EN_PROCESO,
      titulo: 'Resumen del período',
      descripcion: `Total: ${metricas.resumenGeneral.totalItems} items, Progreso: ${metricas.resumenGeneral.porcentajeProgreso}%`,
      esHito: true,
      metadata: {
        totalItems: metricas.resumenGeneral.totalItems,
        totalAtendida: metricas.resumenGeneral.totalAtendida,
        tiempoPromedio: metricas.resumenGeneral.tiempoPromedioEntrega
      }
    })
  }

  return eventos
}

export default function DashboardPedidos({ proyectoId, className = '' }: DashboardPedidosProps) {
  const router = useRouter()
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null)
  const [reporteData, setReporteData] = useState<ReportePedidos | null>(null)
  const [itemsDetalle, setItemsDetalle] = useState<PedidoItemDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exportando, setExportando] = useState(false)

  // Data for selectors
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([])
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([])

  // Dynamic alerts
  const [alertas, setAlertas] = useState<AlertaCalculada[]>([])

  // Mostrar último mes por defecto (filtra por fechaPedido del pedido padre)
  const [filtros, setFiltros] = useState<FiltrosState>({
    fechaInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    estado: 'todos',
    proyecto: proyectoId || 'todos',
    proveedor: 'todos'
  })

  // Fetch projects and providers on mount
  useEffect(() => {
    const fetchSelectorsData = async () => {
      try {
        const [proyectosRes, proveedoresRes] = await Promise.all([
          fetch('/api/proyectos?activos=true'),
          fetch('/api/proveedores')
        ])

        if (proyectosRes.ok) {
          const proyectosData = await proyectosRes.json()
          setProyectos(proyectosData.data || proyectosData || [])
        }

        if (proveedoresRes.ok) {
          const proveedoresData = await proveedoresRes.json()
          setProveedores(proveedoresData.data || proveedoresData || [])
        }
      } catch (error) {
        console.error('Error fetching selectors data:', error)
      }
    }

    fetchSelectorsData()
  }, [])

  const cargarDatos = useCallback(async () => {
    try {
      setRefreshing(true)

      // Solo incluir fechas si ambas están definidas para evitar filtros parciales
      const fechaDesde = filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined
      const fechaHasta = filtros.fechaFin ? new Date(filtros.fechaFin) : undefined

      const filtroReporte: FiltrosReporte = {
        // Solo enviar fechas si ambas son válidas
        fechaDesde: (fechaDesde && fechaHasta && !isNaN(fechaDesde.getTime())) ? fechaDesde : undefined,
        fechaHasta: (fechaDesde && fechaHasta && !isNaN(fechaHasta.getTime())) ? fechaHasta : undefined,
        estadoEntrega: filtros.estado !== 'todos' ? filtros.estado as EstadoEntregaItem : undefined,
        proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined,
        proveedorId: filtros.proveedor !== 'todos' ? filtros.proveedor : undefined
      }

      // Build query params for detailed items
      const queryParams = new URLSearchParams()
      queryParams.set('tipoReporte', 'detallado')
      queryParams.set('incluirDetalles', 'true')
      if (filtroReporte.proyectoId) queryParams.set('proyectoId', filtroReporte.proyectoId)
      if (filtroReporte.proveedorId) queryParams.set('proveedorId', filtroReporte.proveedorId)
      if (filtroReporte.estadoEntrega) queryParams.set('estadoEntrega', filtroReporte.estadoEntrega)
      if (filtroReporte.fechaDesde) queryParams.set('fechaDesde', filtroReporte.fechaDesde.toISOString())
      if (filtroReporte.fechaHasta) queryParams.set('fechaHasta', filtroReporte.fechaHasta.toISOString())

      const [metricasData, reporteResponse, detalleResponse] = await Promise.all([
        obtenerDashboardMetricas(filtroReporte),
        generarReportePedidos(filtroReporte),
        fetch(`/api/reportes/pedidos?${queryParams}`).then(r => r.json())
      ])

      // Generate timeline events from distribution data
      const timelineEvents = generarEventosTimeline(metricasData)
      const reporteConTimeline = {
        ...reporteResponse,
        timeline: timelineEvents
      }

      setMetricas(metricasData)
      setReporteData(reporteConTimeline)

      // Set detailed items
      if (detalleResponse.success && detalleResponse.data?.items) {
        setItemsDetalle(detalleResponse.data.items)
      }

      // Calculate dynamic alerts from real data
      const calculatedAlertas: AlertaCalculada[] = []

      // Alert for delayed items
      const retrasados = metricasData.kpis?.itemsRetrasados || 0
      if (retrasados > 0) {
        calculatedAlertas.push({
          tipo: 'retrasado',
          mensaje: `${retrasados} pedidos retrasados`,
          cantidad: retrasados,
          color: 'text-red-600',
          icono: 'AlertTriangle'
        })
      }

      // Alert for items close to deadline (pending items)
      const pendientes = metricasData.kpis?.itemsPendientes || 0
      if (pendientes > 0) {
        calculatedAlertas.push({
          tipo: 'proximo',
          mensaje: `${pendientes} entregas pendientes`,
          cantidad: pendientes,
          color: 'text-amber-600',
          icono: 'Clock'
        })
      }

      // Alert for completed items
      const entregados = metricasData.kpis?.itemsEntregados || 0
      if (entregados > 0) {
        calculatedAlertas.push({
          tipo: 'completado',
          mensaje: `${entregados} entregas completadas`,
          cantidad: entregados,
          color: 'text-green-600',
          icono: 'CheckCircle'
        })
      }

      // Critical alert if efficiency is below 50%
      const eficiencia = metricasData.kpis?.eficienciaEntrega || 0
      if (eficiencia < 50 && metricasData.resumenGeneral?.totalItems > 0) {
        calculatedAlertas.push({
          tipo: 'critico',
          mensaje: `Eficiencia crítica: ${eficiencia.toFixed(1)}%`,
          cantidad: Math.round(eficiencia),
          color: 'text-red-700',
          icono: 'AlertTriangle'
        })
      }

      setAlertas(calculatedAlertas)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filtros])

  const exportarReporte = async (formato: 'pdf' | 'excel' | 'csv') => {
    try {
      setExportando(true)

      if (!reporteData || !metricas) {
        toast.error('No hay datos para exportar')
        return
      }

      const fechaExport = new Date().toISOString().split('T')[0]
      const nombreArchivo = `reporte-pedidos-${fechaExport}`

      if (formato === 'csv') {
        // Generate CSV content
        const csvHeaders = ['Estado', 'Cantidad', 'Porcentaje', 'Total Cantidad', 'Cantidad Atendida']
        const csvRows = metricas.distribucionPorEstado?.map(item => [
          item.estado,
          item.cantidad,
          `${item.porcentaje}%`,
          (item as any).totalCantidad || 0,
          (item as any).cantidadAtendida || 0
        ]) || []

        // Add summary section
        const summaryRows = [
          [],
          ['=== RESUMEN GENERAL ==='],
          ['Total Items', metricas.resumenGeneral?.totalItems || 0],
          ['Total Cantidad', metricas.resumenGeneral?.totalCantidad || 0],
          ['Total Atendida', metricas.resumenGeneral?.totalAtendida || 0],
          ['Progreso %', `${metricas.resumenGeneral?.porcentajeProgreso || 0}%`],
          ['Tiempo Promedio Entrega', `${metricas.resumenGeneral?.tiempoPromedioEntrega || 0} días`],
          [],
          ['=== KPIs ==='],
          ['Items Entregados', metricas.kpis?.itemsEntregados || 0],
          ['Items Pendientes', metricas.kpis?.itemsPendientes || 0],
          ['Items Retrasados', metricas.kpis?.itemsRetrasados || 0],
          ['Eficiencia Entrega', `${metricas.kpis?.eficienciaEntrega || 0}%`]
        ]

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.join(',')),
          ...summaryRows.map(row => row.join(','))
        ].join('\n')

        // Download CSV
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${nombreArchivo}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('Reporte CSV descargado')
      } else if (formato === 'excel') {
        // Generate Excel-compatible content (Tab-separated for Excel compatibility)
        const excelHeaders = ['Estado\tCantidad\tPorcentaje\tTotal Cantidad\tCantidad Atendida']
        const excelRows = metricas.distribucionPorEstado?.map(item =>
          `${item.estado}\t${item.cantidad}\t${item.porcentaje}%\t${(item as any).totalCantidad || 0}\t${(item as any).cantidadAtendida || 0}`
        ) || []

        const summaryRows = [
          '',
          '=== RESUMEN GENERAL ===',
          `Total Items\t${metricas.resumenGeneral?.totalItems || 0}`,
          `Total Cantidad\t${metricas.resumenGeneral?.totalCantidad || 0}`,
          `Total Atendida\t${metricas.resumenGeneral?.totalAtendida || 0}`,
          `Progreso %\t${metricas.resumenGeneral?.porcentajeProgreso || 0}%`,
          `Tiempo Promedio Entrega\t${metricas.resumenGeneral?.tiempoPromedioEntrega || 0} días`,
          '',
          '=== KPIs ===',
          `Items Entregados\t${metricas.kpis?.itemsEntregados || 0}`,
          `Items Pendientes\t${metricas.kpis?.itemsPendientes || 0}`,
          `Items Retrasados\t${metricas.kpis?.itemsRetrasados || 0}`,
          `Eficiencia Entrega\t${metricas.kpis?.eficienciaEntrega || 0}%`
        ]

        const excelContent = [
          ...excelHeaders,
          ...excelRows,
          ...summaryRows
        ].join('\n')

        // Download as XLS (Excel will open tab-separated files)
        const blob = new Blob(['\ufeff' + excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${nombreArchivo}.xls`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('Reporte Excel descargado')
      } else if (formato === 'pdf') {
        // For PDF, generate a printable HTML and open print dialog
        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Reporte de Pedidos - ${fechaExport}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { color: #666; margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 10px 0; }
              .kpi-item { background: #f9f9f9; padding: 10px; border-radius: 4px; }
              .kpi-label { font-size: 12px; color: #666; }
              .kpi-value { font-size: 18px; font-weight: bold; color: #333; }
              .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
            </style>
          </head>
          <body>
            <h1>Reporte de Pedidos</h1>
            <p>Fecha de generación: ${new Date().toLocaleString('es-ES')}</p>
            <p>Período: ${filtros.fechaInicio} al ${filtros.fechaFin}</p>

            <h2>Resumen General</h2>
            <div class="kpi-grid">
              <div class="kpi-item">
                <div class="kpi-label">Total Items</div>
                <div class="kpi-value">${metricas.resumenGeneral?.totalItems || 0}</div>
              </div>
              <div class="kpi-item">
                <div class="kpi-label">Progreso</div>
                <div class="kpi-value">${metricas.resumenGeneral?.porcentajeProgreso || 0}%</div>
              </div>
              <div class="kpi-item">
                <div class="kpi-label">Items Entregados</div>
                <div class="kpi-value">${metricas.kpis?.itemsEntregados || 0}</div>
              </div>
              <div class="kpi-item">
                <div class="kpi-label">Items Retrasados</div>
                <div class="kpi-value">${metricas.kpis?.itemsRetrasados || 0}</div>
              </div>
            </div>

            <h2>Distribución por Estado</h2>
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Cantidad</th>
                  <th>Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                ${metricas.distribucionPorEstado?.map(item => `
                  <tr>
                    <td>${item.estado}</td>
                    <td>${item.cantidad}</td>
                    <td>${item.porcentaje}%</td>
                  </tr>
                `).join('') || '<tr><td colspan="3">Sin datos</td></tr>'}
              </tbody>
            </table>

            <h2>KPIs</h2>
            <table>
              <tr><td>Eficiencia de Entrega</td><td>${metricas.kpis?.eficienciaEntrega || 0}%</td></tr>
              <tr><td>Tiempo Promedio de Entrega</td><td>${metricas.resumenGeneral?.tiempoPromedioEntrega || 0} días</td></tr>
              <tr><td>Items Pendientes</td><td>${metricas.kpis?.itemsPendientes || 0}</td></tr>
            </table>

            <div class="footer">
              GYS Control - Sistema de Gestión de Pedidos
            </div>
          </body>
          </html>
        `

        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(printContent)
          printWindow.document.close()
          printWindow.print()
          toast.success('Reporte PDF listo para imprimir')
        } else {
          toast.error('No se pudo abrir la ventana de impresión')
        }
      }
    } catch (error) {
      console.error('Error al exportar:', error)
      toast.error('Error al exportar reporte')
    } finally {
      setExportando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const stats = useMemo(() => {
    if (!metricas) return null
    return {
      totalItems: metricas.resumenGeneral?.totalItems || 0,
      entregados: metricas.kpis?.itemsEntregados || 0,
      progreso: metricas.resumenGeneral?.porcentajeProgreso || 0,
      tiempoPromedio: metricas.resumenGeneral?.tiempoPromedioEntrega || 0,
      retrasados: metricas.kpis?.itemsRetrasados || 0,
      totalCantidad: metricas.resumenGeneral?.totalCantidad || 0,
      eficiencia: metricas.kpis?.eficienciaEntrega || 0
    }
  }, [metricas])

  const hasFilters = filtros.estado !== 'todos' || filtros.proyecto !== 'todos' || filtros.proveedor !== 'todos'

  const clearFilters = () => {
    setFiltros(prev => ({
      ...prev,
      estado: 'todos',
      proyecto: proyectoId || 'todos',
      proveedor: 'todos'
    }))
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50/50 ${className}`}>
      {/* Header sticky */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Dashboard de Pedidos</h1>
                <p className="text-[10px] text-muted-foreground">Métricas y trazabilidad de entregas</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cargarDatos}
                disabled={refreshing}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>

              <Select onValueChange={(v) => exportarReporte(v as 'pdf' | 'excel' | 'csv')} disabled={exportando}>
                <SelectTrigger className="h-7 w-[100px] text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  <span>Exportar</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf" className="text-xs">PDF</SelectItem>
                  <SelectItem value="excel" className="text-xs">Excel</SelectItem>
                  <SelectItem value="csv" className="text-xs">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats compactos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Items</span>
              <Package className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats?.totalItems || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Entregados</span>
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{stats?.entregados || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Progreso</span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-blue-600">{stats?.progreso || 0}%</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tiempo Prom.</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-amber-600">{stats?.tiempoPromedio || 0}d</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Retrasados</span>
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-red-600">{stats?.retrasados || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Eficiencia</span>
              <Truck className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-purple-600">{stats?.eficiencia || 0}%</p>
          </div>
        </div>

        {/* Filtros en línea */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <Input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className="h-8 w-[130px] text-xs"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <Input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
                className="h-8 w-[130px] text-xs"
              />
            </div>

            <Select value={filtros.estado} onValueChange={(v) => setFiltros(prev => ({ ...prev, estado: v }))}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <Filter className="h-3 w-3 mr-1 text-gray-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                <SelectItem value="pendiente" className="text-xs">Pendiente</SelectItem>
                <SelectItem value="en_proceso" className="text-xs">En Proceso</SelectItem>
                <SelectItem value="entregado" className="text-xs">Entregado</SelectItem>
                <SelectItem value="retrasado" className="text-xs">Retrasado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.proyecto} onValueChange={(v) => setFiltros(prev => ({ ...prev, proyecto: v }))}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos los proyectos</SelectItem>
                {proyectos.map((proyecto) => (
                  <SelectItem key={proyecto.id} value={proyecto.id} className="text-xs">
                    {proyecto.codigo ? `${proyecto.codigo} - ` : ''}{proyecto.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.proveedor} onValueChange={(v) => setFiltros(prev => ({ ...prev, proveedor: v }))}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos los proveedores</SelectItem>
                {proveedores.map((proveedor) => (
                  <SelectItem key={proveedor.id} value={proveedor.id} className="text-xs">
                    {proveedor.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-red-600">
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Tabs de contenido */}
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="h-8 p-0.5">
            <TabsTrigger value="resumen" className="text-xs h-7 px-3">Resumen</TabsTrigger>
            <TabsTrigger value="detalle" className="text-xs h-7 px-3">Detalle</TabsTrigger>
            <TabsTrigger value="graficos" className="text-xs h-7 px-3">Gráficos</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs h-7 px-3">Timeline</TabsTrigger>
            <TabsTrigger value="metricas" className="text-xs h-7 px-3">Métricas</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border">
                <div className="p-3 border-b">
                  <h3 className="text-sm font-medium">Resumen Ejecutivo</h3>
                  <p className="text-[10px] text-muted-foreground">Estado general de pedidos</p>
                </div>
                <div className="p-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Items</span>
                    <Badge variant="secondary" className="text-[10px]">{stats?.totalItems || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Items Entregados</span>
                    <Badge className="text-[10px] bg-green-100 text-green-700">{stats?.entregados || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Eficiencia</span>
                    <Badge variant="outline" className="text-[10px]">{stats?.eficiencia || 0}%</Badge>
                  </div>
                </div>
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/logistica/pedidos')}
                    className="w-full h-7 text-xs"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    Ir a Gestión de Pedidos
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg border">
                <div className="p-3 border-b">
                  <h3 className="text-sm font-medium">Alertas</h3>
                  <p className="text-[10px] text-muted-foreground">Elementos que requieren atención</p>
                </div>
                <div className="p-3 space-y-2">
                  {alertas.length === 0 ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span className="text-xs">Sin alertas pendientes</span>
                    </div>
                  ) : (
                    alertas.map((alerta, index) => (
                      <div key={index} className={`flex items-center gap-2 ${alerta.color}`}>
                        {alerta.icono === 'AlertTriangle' && <AlertTriangle className="h-3.5 w-3.5" />}
                        {alerta.icono === 'Clock' && <Clock className="h-3.5 w-3.5" />}
                        {alerta.icono === 'CheckCircle' && <CheckCircle className="h-3.5 w-3.5" />}
                        <span className="text-xs">{alerta.mensaje}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detalle" className="space-y-4">
            <div className="bg-white rounded-lg border">
              <div className="p-3 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Detalle de Items</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {itemsDetalle.length} items encontrados
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/logistica/pedidos')}
                  className="h-7 text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver todos
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[100px]">Código</TableHead>
                      <TableHead className="text-xs">Equipo</TableHead>
                      <TableHead className="text-xs">Proyecto</TableHead>
                      <TableHead className="text-xs">Proveedor</TableHead>
                      <TableHead className="text-xs text-center w-[80px]">Cantidad</TableHead>
                      <TableHead className="text-xs text-center w-[100px]">Progreso</TableHead>
                      <TableHead className="text-xs text-center w-[90px]">Estado</TableHead>
                      <TableHead className="text-xs w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsDetalle.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                          No hay items para mostrar con los filtros actuales
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemsDetalle.slice(0, 50).map((item) => {
                        const estadoColor = {
                          entregado: 'bg-green-100 text-green-700',
                          pendiente: 'bg-gray-100 text-gray-700',
                          en_proceso: 'bg-blue-100 text-blue-700',
                          atendido: 'bg-blue-100 text-blue-700',
                          parcial: 'bg-amber-100 text-amber-700',
                          retrasado: 'bg-red-100 text-red-700',
                          cancelado: 'bg-red-100 text-red-700'
                        }[item.estadoEntrega.toLowerCase()] || 'bg-gray-100 text-gray-700'

                        return (
                          <TableRow
                            key={item.id}
                            className="hover:bg-gray-50/50 cursor-pointer"
                            onClick={() => router.push(`/logistica/pedidos/${item.pedido.id}`)}
                          >
                            <TableCell className="py-2 font-mono text-xs">
                              {item.equipo.codigo}
                            </TableCell>
                            <TableCell className="py-2 text-xs max-w-[200px] truncate">
                              {item.equipo.nombre}
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground max-w-[150px] truncate">
                              {item.pedido.proyecto || '-'}
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground max-w-[150px] truncate">
                              {item.pedido.proveedor || '-'}
                            </TableCell>
                            <TableCell className="py-2 text-xs text-center">
                              <span className="font-medium">{item.cantidadAtendida}</span>
                              <span className="text-muted-foreground">/{item.cantidad}</span>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-1.5">
                                <Progress value={item.progreso} className="h-1.5 w-12 flex-shrink-0" />
                                <span className={`text-[10px] font-medium ${
                                  item.progreso >= 100 ? 'text-green-600' :
                                  item.progreso > 0 ? 'text-amber-600' : 'text-gray-400'
                                }`}>
                                  {item.progreso.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge className={`text-[10px] ${estadoColor}`}>
                                {item.estadoEntrega}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/logistica/pedidos/${item.pedido.id}`)}
                                className="h-6 w-6 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {itemsDetalle.length > 50 && (
                <div className="p-3 border-t text-center">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push('/logistica/pedidos')}
                    className="text-xs"
                  >
                    Ver todos los {itemsDetalle.length} items →
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="graficos" className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <GraficoProgreso
                series={transformarDatosGraficos(reporteData?.graficos)}
                configuracion={{
                  tipo: 'linea',
                  titulo: 'Progreso de Pedidos',
                  mostrarLeyenda: true,
                  mostrarGrid: true,
                  mostrarTooltip: true,
                  mostrarBrush: false,
                  mostrarMetas: false,
                  animaciones: true,
                  altura: 320
                }}
                cargando={refreshing}
                className="h-80"
              />
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <TrazabilidadTimeline
                eventos={reporteData?.timeline || []}
                cargando={refreshing}
                pedidoId={proyectoId}
                mostrarDetalles={true}
                animaciones={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="metricas" className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <MetricasEntrega
                metricas={transformarMetricasEntrega(metricas)}
                cargando={refreshing}
                titulo="Métricas de Entrega"
                animaciones={true}
                mostrarTendencias={true}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export { DashboardPedidos }
