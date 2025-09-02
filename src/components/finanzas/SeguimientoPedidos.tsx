// ===================================================
// 📁 Archivo: SeguimientoPedidos.tsx
// 📌 Ubicación: src/components/finanzas/SeguimientoPedidos.tsx
// 🔧 Descripción: Componente para seguimiento de pedidos con costos y tiempos reales
//
// 🧠 Uso: Monitorea el estado de pedidos, costos reales y tiempos de entrega
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  DollarSign,
  Truck,
  User,
  Building,
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { AdvancedSearch, SearchCriterion, SearchField } from '@/components/ui/AdvancedSearch'
import VirtualList from '@/components/ui/VirtualList'
import { toast } from 'sonner'
import { PedidoEquipo, PedidoEquipoItem } from '@/types'
import { getAllPedidoEquipos } from '@/lib/services/pedidoEquipo'
import { getPedidoEquipoItems } from '@/lib/services/pedidoEquipoItem'
import { formatCurrency } from '@/lib/utils/currency'
// Removed aprovisionamiento imports - functionality deprecated
import { useLazyLoading, usePerformanceMetrics } from '@/hooks/useLazyLoading'
import { useCriticalPerformanceMonitoring } from '@/hooks/useAdvancedPerformanceMonitoring'
import type { PaginatedResponse } from '@/hooks/useLazyLoading'

// 🎯 Tipos específicos para seguimiento
interface PedidoSeguimientoDetalle extends PedidoEquipo {
  montoTotal: number
  progreso: number
  diasRestantes: number
  estadoTiempo: 'a_tiempo' | 'proximo_vencimiento' | 'retrasado'
  itemsEntregados: number
  itemsTotal: number
  proveedorPrincipal: string
  proyectoNombre: string
  // Propiedades adicionales para seguimiento
  proyecto?: { id: string; nombre: string }
  proveedor?: { id: string; nombre: string }
  fechaEstimada: string
  prioridad?: 'baja' | 'media' | 'alta' | 'critica'
  itemsUrgentes: number
  alertas: string[]
  observaciones?: string
  montoReal?: number
  diasRetraso?: number
}

interface MetricasPedidos {
  totalPedidos: number
  montoTotal: number
  pedidosATiempo: number
  pedidosRetrasados: number
  progresoPromedio: number
  ahorroLogrado: number
}

interface SeguimientoPedidosProps {
  filtroProyecto?: string
  filtroEstado?: string
  onMetricasChange?: (metricas: MetricasPedidos) => void
  filtros?: any
  onDataChange?: (data: { pedidos: PedidoSeguimientoDetalle[], resumen: any }) => void
}

// 🎯 Componente de tarjeta de pedido memoizado para rendimiento
const PedidoCard = React.memo<{
  pedido: PedidoSeguimientoDetalle
  index: number
  vistaDetallada: boolean
  formatDate: (date: string) => string
  formatCurrency: (amount: number) => string
  getEstadoColor: (estado: string) => string
  getTiempoColor: (estadoTiempo: string) => string
}>(({ pedido, index, vistaDetallada, formatDate, formatCurrency, getEstadoColor, getTiempoColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
  >
    {/* 📋 Header del pedido */}
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold text-lg">
            {pedido.codigo || `PED-${pedido.id.slice(-6)}`}
          </h3>
          <Badge className={getEstadoColor(pedido.estado)}>
            {pedido.estado.charAt(0).toUpperCase() + pedido.estado.slice(1)}
          </Badge>
          {pedido.estadoTiempo === 'retrasado' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          {pedido.estadoTiempo === 'proximo_vencimiento' && (
            <Clock className="h-4 w-4 text-yellow-500" />
          )}
          {/* 🚨 Indicador de prioridad */}
          {pedido.prioridad && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              pedido.prioridad === 'critica' ? 'bg-red-100 text-red-800' :
              pedido.prioridad === 'alta' ? 'bg-orange-100 text-orange-800' :
              pedido.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {pedido.prioridad === 'critica' ? '🔴' :
               pedido.prioridad === 'alta' ? '🟠' :
               pedido.prioridad === 'media' ? '🟡' : '🟢'} {pedido.prioridad.toUpperCase()}
            </span>
          )}
          {/* 🚨 Items urgentes */}
          {pedido.itemsUrgentes > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              🚨 {pedido.itemsUrgentes} urgentes
            </span>
          )}
        </div>
        <p className="text-gray-600 mb-1">{pedido.proyectoNombre}</p>
        <p className="text-sm text-gray-500">{pedido.proveedorPrincipal}</p>
      </div>
      
      {/* 💰 Información financiera */}
      <div className="text-right">
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(pedido.montoTotal)}</p>
        <p className="text-sm text-gray-600">{pedido.itemsTotal} items</p>
      </div>
    </div>

    {/* 🚨 Alertas */}
    {pedido.alertas && pedido.alertas.length > 0 && (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-sm font-medium text-red-800 mb-2">⚠️ Alertas</div>
        <div className="space-y-1">
          {pedido.alertas.map((alerta, index) => (
            <div key={index} className="text-xs text-red-700">
              • {alerta}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 📊 Progreso y métricas */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progreso</span>
          <span className="text-sm font-semibold">{pedido.progreso.toFixed(0)}%</span>
        </div>
        <Progress value={pedido.progreso} className="h-2" />
        <p className="text-xs text-gray-500 mt-1">
          {pedido.itemsEntregados} de {pedido.itemsTotal} items entregados
        </p>
        {pedido.itemsUrgentes > 0 && (
          <p className="text-xs text-red-600 font-medium mt-1">
            🚨 {pedido.itemsUrgentes} urgentes
          </p>
        )}
      </div>
      
      <div className="text-center">
        <Calendar className="h-5 w-5 text-gray-400 mx-auto mb-1" />
        <p className="text-sm text-gray-600">Fecha Estimada</p>
        <p className="font-semibold">{formatDate(pedido.fechaEstimada)}</p>
        {pedido.montoReal && pedido.montoReal !== pedido.montoTotal && (
          <p className="text-xs text-gray-600 mt-1">
            Real: {formatCurrency(pedido.montoReal)}
          </p>
        )}
      </div>
      
      <div className="text-center">
        <Clock className="h-5 w-5 text-gray-400 mx-auto mb-1" />
        <p className="text-sm text-gray-600">Días Restantes</p>
        <p className={`font-semibold ${getTiempoColor(pedido.estadoTiempo)}`}>
          {pedido.diasRestantes > 0 ? pedido.diasRestantes : 'Vencido'}
        </p>
        {pedido.diasRetraso && pedido.diasRetraso > 0 && (
          <p className="text-xs text-red-600 font-medium mt-1">
            ⏰ {pedido.diasRetraso} días de retraso
          </p>
        )}
      </div>
    </div>

    {/* 🔍 Vista detallada */}
    {vistaDetallada && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="border-t pt-4 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Fecha de Pedido:</p>
            <p className="font-semibold">{formatDate(pedido.fechaPedido)}</p>
          </div>
          <div>
            <p className="text-gray-600">Responsable:</p>
            <p className="font-semibold">{pedido.responsable?.name || 'No asignado'}</p>
          </div>
        </div>
        
        {pedido.observaciones && (
          <div>
            <p className="text-gray-600 text-sm">Observaciones:</p>
            <p className="text-sm bg-gray-50 p-2 rounded">{pedido.observaciones}</p>
          </div>
        )}
      </motion.div>
    )}
  </motion.div>
))

PedidoCard.displayName = 'PedidoCard'

export default function SeguimientoPedidos({ 
  filtroProyecto = '__ALL__',
  filtroEstado = '__ALL__',
  onMetricasChange,
  filtros = {},
  onDataChange
}: SeguimientoPedidosProps) {
  // 📊 Monitoreo de rendimiento crítico
  const { 
    metrics: performanceMetrics, 
    startInteraction, 
    endInteraction,
    trackInteraction 
  } = useCriticalPerformanceMonitoring('SeguimientoPedidos')
  
  // 🔄 Estados principales
  const [loading, setLoading] = useState(true)
  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [items, setItems] = useState<PedidoEquipoItem[]>([])
  const [pedidosDetalle, setPedidosDetalle] = useState<PedidoSeguimientoDetalle[]>([])
  const [metricas, setMetricas] = useState<MetricasPedidos>({
    totalPedidos: 0,
    montoTotal: 0,
    pedidosATiempo: 0,
    pedidosRetrasados: 0,
    progresoPromedio: 0,
    ahorroLogrado: 0
  })
  const [error, setError] = useState<string | null>(null)
  const [actualizando, setActualizando] = useState(false)

  // 🎛️ Estados de filtros locales
  const [busquedaLocal, setBusquedaLocal] = useState('')
  const [filtroEstadoLocal, setFiltroEstadoLocal] = useState(filtroEstado)
  const [filtroProyectoLocal, setFiltroProyectoLocal] = useState(filtroProyecto)
  const [ordenamiento, setOrdenamiento] = useState<'fecha' | 'monto' | 'progreso'>('fecha')
  const [vistaDetallada, setVistaDetallada] = useState(false)
  
  // 🔍 Filtros avanzados
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('__ALL__')
  const [filtroEstadoTiempo, setFiltroEstadoTiempo] = useState<string>('__ALL__')
  const [filtroMontoMin, setFiltroMontoMin] = useState<string>('')
  const [filtroMontoMax, setFiltroMontoMax] = useState<string>('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState<string>('')
  const [filtroFechaFin, setFiltroFechaFin] = useState<string>('')
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false)
  
  // 🔍 Estados para búsqueda avanzada
  const [criteriosBusqueda, setCriteriosBusqueda] = useState<SearchCriterion[]>([])
  const [mostrarBusquedaAvanzada, setMostrarBusquedaAvanzada] = useState(false)
  
  // 📄 Estados de paginación y virtualización
  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [useVirtualization, setUseVirtualization] = useState(false)
  
  // 🚀 Hooks de rendimiento
   const { logMetric } = usePerformanceMetrics('SeguimientoPedidos')
   
   // 📊 Función para medir rendimiento
   const measurePerformance = useCallback((operation: string, fn: () => any) => {
     const start = performance.now()
     const result = fn()
     const duration = performance.now() - start
     logMetric(operation, duration)
     return { result, duration }
   }, [logMetric])

  // 📊 Cargar datos reales del sistema
  const cargarDatosPedidos = async () => {
    const interactionId = startInteraction('load-pedidos-data')
    try {
      setLoading(true)
      setError(null)
      
      // 📦 Obtener pedidos e items reales
      const [pedidosData, itemsData] = await Promise.all([
        getAllPedidoEquipos(),
        getPedidoEquipoItems()
      ])

      if (pedidosData && itemsData) {
        setPedidos(pedidosData)
        setItems(itemsData)
        
        // 📈 Procesar datos para seguimiento detallado
        const pedidosConDetalle = procesarPedidosParaSeguimiento(pedidosData, itemsData)
        setPedidosDetalle(pedidosConDetalle)
        
        // 📊 Calcular métricas
        const metricasCalculadas = calcularMetricasPedidos(pedidosConDetalle)
        setMetricas(metricasCalculadas)
        
        // 📡 Notificar cambios al componente padre
        if (onMetricasChange) {
          onMetricasChange(metricasCalculadas)
        }
        
        if (onDataChange) {
          onDataChange({ pedidos: pedidosConDetalle, resumen: metricasCalculadas })
        }
      }
      
    } catch (error) {
      console.error('Error cargando datos de pedidos:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar pedidos')
      toast.error('Error al cargar el seguimiento de pedidos')
    } finally {
      setLoading(false)
      endInteraction('load-pedidos-data')
    }
  }

  useEffect(() => {
    cargarDatosPedidos()
  }, [onMetricasChange, filtros])

  // 🧮 Procesar pedidos para seguimiento detallado
  const procesarPedidosParaSeguimiento = (
    pedidosData: PedidoEquipo[], 
    itemsData: PedidoEquipoItem[]
  ): PedidoSeguimientoDetalle[] => {
    return pedidosData.map(pedido => {
      // 📦 Items del pedido
      const itemsPedido = itemsData.filter(item => item.pedidoId === pedido.id)
      
      // 💰 Calcular monto total
      const montoTotal = itemsPedido.reduce((sum, item) => {
        // Usar precioUnitario del item o precioElegido de la lista
        const precio = item.precioUnitario || item.listaEquipoItem?.precioElegido || 0
        return sum + (precio * item.cantidadPedida)
      }, 0)
      
      // 📊 Calcular progreso basado en items entregados
      const itemsEntregados = itemsPedido.filter(item => item.estado === 'entregado').length
      const itemsTotal = itemsPedido.length
      const progreso = itemsTotal > 0 ? (itemsEntregados / itemsTotal) * 100 : 0
      
      // ⏰ Calcular días restantes y estado de tiempo
      const fechaEstimada = new Date(pedido.fechaEntregaEstimada || pedido.fechaNecesaria)
      const fechaActual = new Date()
      const diasRestantes = Math.ceil((fechaEstimada.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24))
      
      let estadoTiempo: 'a_tiempo' | 'proximo_vencimiento' | 'retrasado'
      if (diasRestantes < 0) {
        estadoTiempo = 'retrasado'
      } else if (diasRestantes <= 3) {
        estadoTiempo = 'proximo_vencimiento'
      } else {
        estadoTiempo = 'a_tiempo'
      }
      
      // 🏢 Información adicional
      const proveedorPrincipal = 'Sin proveedor' // TODO: Obtener de la lista o items
      const proyectoNombre = 'Sin proyecto' // TODO: Obtener usando proyectoId
      
      // 🚨 Calcular alertas y propiedades adicionales
      const alertas: string[] = []
      if (diasRestantes < 0) {
        alertas.push(`Pedido vencido hace ${Math.abs(diasRestantes)} días`)
      } else if (diasRestantes <= 3) {
        alertas.push(`Vence en ${diasRestantes} días`)
      }
      
      const itemsUrgentes = itemsPedido.filter(item => {
        // Considerar urgente si el item está pendiente y el pedido está próximo a vencer
        return item.estado === 'pendiente' && diasRestantes <= 7
      }).length
      
      const diasRetraso = diasRestantes < 0 ? Math.abs(diasRestantes) : 0
      
      return {
        ...pedido,
        montoTotal,
        progreso,
        diasRestantes,
        estadoTiempo,
        itemsEntregados,
        itemsTotal,
        proveedorPrincipal,
        proyectoNombre,
        fechaEstimada: pedido.fechaEntregaEstimada || pedido.fechaNecesaria,
        prioridad: 'media' as const, // TODO: Obtener de la base de datos
        itemsUrgentes,
        alertas,
        observaciones: pedido.observacion,
        montoReal: undefined, // TODO: Calcular monto real basado en entregas
        diasRetraso: diasRetraso > 0 ? diasRetraso : undefined
      }
    })
  }

  // 📊 Calcular métricas de pedidos
  const calcularMetricasPedidos = (pedidosDetalle: PedidoSeguimientoDetalle[]): MetricasPedidos => {
    const totalPedidos = pedidosDetalle.length
    const montoTotal = pedidosDetalle.reduce((sum, p) => sum + p.montoTotal, 0)
    const pedidosATiempo = pedidosDetalle.filter(p => p.estadoTiempo === 'a_tiempo').length
    const pedidosRetrasados = pedidosDetalle.filter(p => p.estadoTiempo === 'retrasado').length
    const progresoPromedio = totalPedidos > 0 ? 
      pedidosDetalle.reduce((sum, p) => sum + p.progreso, 0) / totalPedidos : 0
    
    // 💰 Calcular ahorro (simulado basado en diferencias de precio)
    const ahorroLogrado = montoTotal * 0.05 // 5% de ahorro promedio
    
    return {
      totalPedidos,
      montoTotal,
      pedidosATiempo,
      pedidosRetrasados,
      progresoPromedio,
      ahorroLogrado
    }
  }

  // 🔍 Definir campos de búsqueda disponibles
  const camposBusqueda: SearchField[] = [
    { key: 'codigo', label: 'Código', type: 'text' },
    { key: 'proyectoNombre', label: 'Proyecto', type: 'text' },
    { key: 'proveedorPrincipal', label: 'Proveedor', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'select', options: [
      { value: 'enviado', label: 'Enviado' },
      { value: 'atendido', label: 'Atendido' },
      { value: 'parcial', label: 'Parcial' },
      { value: 'entregado', label: 'Entregado' }
    ]},
    { key: 'prioridad', label: 'Prioridad', type: 'select', options: [
      { value: 'baja', label: 'Baja' },
      { value: 'media', label: 'Media' },
      { value: 'alta', label: 'Alta' },
      { value: 'critica', label: 'Crítica' }
    ]},
    { key: 'estadoTiempo', label: 'Estado de Tiempo', type: 'select', options: [
      { value: 'a_tiempo', label: 'A Tiempo' },
      { value: 'proximo_vencimiento', label: 'Próximo Vencimiento' },
      { value: 'retrasado', label: 'Retrasado' }
    ]},
    { key: 'montoTotal', label: 'Monto Total', type: 'number' },
    { key: 'progreso', label: 'Progreso (%)', type: 'number' },
    { key: 'fechaPedido', label: 'Fecha de Pedido', type: 'date' },
    { key: 'fechaEstimada', label: 'Fecha Estimada', type: 'date' },
    { key: 'diasRestantes', label: 'Días Restantes', type: 'number' },
    { key: 'itemsTotal', label: 'Total de Items', type: 'number' },
    { key: 'itemsEntregados', label: 'Items Entregados', type: 'number' },
    { key: 'itemsUrgentes', label: 'Items Urgentes', type: 'number' }
  ]

  // 🔍 Función para aplicar criterios de búsqueda avanzada
  const aplicarCriteriosBusqueda = (pedido: PedidoSeguimientoDetalle, criterios: SearchCriterion[]): boolean => {
    if (criterios.length === 0) return true
    
    return criterios.every(criterio => {
      const valor = pedido[criterio.field as keyof PedidoSeguimientoDetalle]
      
      switch (criterio.operator) {
        case 'equals':
          return valor === criterio.value
        case 'contains':
          return String(valor).toLowerCase().includes(String(criterio.value).toLowerCase())
        case 'startsWith':
          return String(valor).toLowerCase().startsWith(String(criterio.value).toLowerCase())
        case 'endsWith':
          return String(valor).toLowerCase().endsWith(String(criterio.value).toLowerCase())
        case 'greaterThan':
          return Number(valor) > Number(criterio.value)
        case 'lessThan':
          return Number(valor) < Number(criterio.value)
        case 'greaterThanOrEqual':
          return Number(valor) >= Number(criterio.value)
        case 'lessThanOrEqual':
          return Number(valor) <= Number(criterio.value)
        case 'between':
          if (Array.isArray(criterio.value) && criterio.value.length === 2) {
            return Number(valor) >= Number(criterio.value[0]) && Number(valor) <= Number(criterio.value[1])
          }
          return false
        case 'dateAfter':
          return new Date(String(valor)) > new Date(String(criterio.value))
        case 'dateBefore':
          return new Date(String(valor)) < new Date(String(criterio.value))
        case 'dateRange':
          if (Array.isArray(criterio.value) && criterio.value.length === 2) {
            const fecha = new Date(String(valor))
            return fecha >= new Date(String(criterio.value[0])) && fecha <= new Date(String(criterio.value[1]))
          }
          return false
        default:
          return true
      }
    })
  }

  // 🔍 Filtrar pedidos con memoización para rendimiento
  const pedidosFiltrados = useMemo(() => {
    const interactionId = startInteraction('filter-pedidos')
    const { result: filtered, duration } = measurePerformance('filter', () => {
      return pedidosDetalle.filter(pedido => {
      // Búsqueda simple
      const cumpleBusqueda = busquedaLocal === '' || 
        pedido.proyectoNombre.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
        pedido.proveedorPrincipal.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
        pedido.codigo?.toLowerCase().includes(busquedaLocal.toLowerCase())
      
      // Filtros básicos
      const cumpleEstado = filtroEstadoLocal === '__ALL__' || pedido.estado === filtroEstadoLocal
      const cumpleProyecto = filtroProyectoLocal === '__ALL__' || 
        pedido.proyectoNombre.toLowerCase().includes(filtroProyectoLocal.toLowerCase())
      
      // Filtros avanzados tradicionales
      const cumplePrioridad = filtroPrioridad === '__ALL__' || pedido.prioridad === filtroPrioridad
      const cumpleEstadoTiempo = filtroEstadoTiempo === '__ALL__' || pedido.estadoTiempo === filtroEstadoTiempo
      
      // Filtro por monto
      const montoMin = filtroMontoMin ? parseFloat(filtroMontoMin) : 0
      const montoMax = filtroMontoMax ? parseFloat(filtroMontoMax) : Infinity
      const cumpleMonto = pedido.montoTotal >= montoMin && pedido.montoTotal <= montoMax
      
      // Filtro por fechas
      const fechaInicio = filtroFechaInicio ? new Date(filtroFechaInicio) : null
      const fechaFin = filtroFechaFin ? new Date(filtroFechaFin) : null
      const fechaPedido = new Date(pedido.fechaPedido)
      
      const cumpleFecha = (!fechaInicio || fechaPedido >= fechaInicio) && 
                         (!fechaFin || fechaPedido <= fechaFin)
      
      // Criterios de búsqueda avanzada
      const cumpleCriteriosAvanzados = aplicarCriteriosBusqueda(pedido, criteriosBusqueda)
      
        return cumpleBusqueda && cumpleEstado && cumpleProyecto && 
               cumplePrioridad && cumpleEstadoTiempo && cumpleMonto && cumpleFecha &&
               cumpleCriteriosAvanzados
      })
    })
    
    endInteraction('filter-pedidos')
    return filtered
  }, [pedidosDetalle, busquedaLocal, filtroEstadoLocal, filtroProyectoLocal, 
      filtroPrioridad, filtroEstadoTiempo, filtroMontoMin, filtroMontoMax, 
      filtroFechaInicio, filtroFechaFin, criteriosBusqueda, measurePerformance, startInteraction, endInteraction])

  // 📈 Ordenar pedidos con memoización
  const pedidosOrdenados = useMemo(() => {
    const { result: sorted } = measurePerformance('sort', () => {
      return [...pedidosFiltrados].sort((a, b) => {
        switch (ordenamiento) {
          case 'monto':
            return b.montoTotal - a.montoTotal
          case 'progreso':
            return b.progreso - a.progreso
          case 'fecha':
          default:
            return new Date(b.fechaPedido).getTime() - new Date(a.fechaPedido).getTime()
        }
      })
    })
    
    return sorted
  }, [pedidosFiltrados, ordenamiento, measurePerformance])

  // 📄 Aplicar paginación
  const totalItemsFiltrados = pedidosOrdenados.length
  const indiceInicio = (paginaActual - 1) * itemsPorPagina
  const indiceFin = indiceInicio + itemsPorPagina
  const pedidosPaginados = pedidosOrdenados.slice(indiceInicio, indiceFin)
  const totalPaginas = Math.ceil(totalItemsFiltrados / itemsPorPagina)
  
  // 🚀 Determinar automáticamente si usar virtualización
  useEffect(() => {
    const shouldUseVirtualization = totalItemsFiltrados > 100
    if (shouldUseVirtualization !== useVirtualization) {
      setUseVirtualization(shouldUseVirtualization)
    }
  }, [totalItemsFiltrados, useVirtualization])

  // 🔄 Actualizar total de items cuando cambian los filtros
  useEffect(() => {
    setTotalItems(totalItemsFiltrados)
    // Resetear a la primera página si la actual está fuera de rango
    if (paginaActual > totalPaginas && totalPaginas > 0) {
      setPaginaActual(1)
    }
  }, [busquedaLocal, filtroEstadoLocal, filtroProyectoLocal, filtroPrioridad, 
      filtroEstadoTiempo, filtroMontoMin, filtroMontoMax, filtroFechaInicio, 
      filtroFechaFin, totalItemsFiltrados, paginaActual, totalPaginas])

  // La función formatCurrency ahora se importa desde @/lib/utils/currency

  // 📅 Formatear fecha
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // 🎨 Obtener color de estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'entregado': return 'bg-green-100 text-green-800'
      case 'atendido': return 'bg-blue-100 text-blue-800'
      case 'parcial': return 'bg-yellow-100 text-yellow-800'
      case 'enviado': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 🎨 Obtener color de tiempo
  const getTiempoColor = (estadoTiempo: string) => {
    switch (estadoTiempo) {
      case 'a_tiempo': return 'text-green-600'
      case 'proximo_vencimiento': return 'text-yellow-600'
      case 'retrasado': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Cargando seguimiento de pedidos...</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertTriangle className="h-8 w-8 mr-2" />
            <div>
              <p className="font-medium">Error al cargar seguimiento</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={cargarDatosPedidos}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Seguimiento de Pedidos en Tiempo Real
            </CardTitle>
            <CardDescription>
              Monitoreo de {pedidos.length} pedidos activos con {items.length} items
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setVistaDetallada(!vistaDetallada)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {vistaDetallada ? 'Vista Simple' : 'Vista Detallada'}
            </Button>
            <Button 
              variant={useVirtualization ? "default" : "outline"}
              size="sm"
              onClick={() => setUseVirtualization(!useVirtualization)}
              title={`${useVirtualization ? 'Desactivar' : 'Activar'} virtualización para mejor rendimiento`}
            >
              🚀 Virtual: {useVirtualization ? 'ON' : 'OFF'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={cargarDatosPedidos}
              disabled={actualizando}
            >
              {actualizando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {actualizando ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 🎛️ Controles de filtrado y ordenamiento */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por proyecto, proveedor, código..."
              value={busquedaLocal}
              onChange={(e) => setBusquedaLocal(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={filtroEstadoLocal} onValueChange={setFiltroEstadoLocal}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="atendido">Atendido</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="entregado">Entregado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ordenamiento} onValueChange={(value: 'fecha' | 'monto' | 'progreso') => setOrdenamiento(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fecha">Por Fecha</SelectItem>
              <SelectItem value="monto">Por Monto</SelectItem>
              <SelectItem value="progreso">Por Progreso</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarBusquedaAvanzada(!mostrarBusquedaAvanzada)}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Búsqueda Avanzada
            {mostrarBusquedaAvanzada ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros Avanzados
            {mostrarFiltrosAvanzados ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* 🔍 Búsqueda avanzada */}
         {mostrarBusquedaAvanzada && (
           <div className="mb-6">
             <AdvancedSearch
               fields={camposBusqueda}
               onSearch={setCriteriosBusqueda}
               onClear={() => setCriteriosBusqueda([])}
               className="bg-blue-50 border-blue-200"
             />
           </div>
         )}
        
        {/* 🔍 Filtros avanzados */}
        {mostrarFiltrosAvanzados && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium mb-4 text-blue-900">Filtros Avanzados</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtro por prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todas</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por estado de tiempo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Tiempo</label>
                <Select value={filtroEstadoTiempo} onValueChange={setFiltroEstadoTiempo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todos</SelectItem>
                    <SelectItem value="a_tiempo">A Tiempo</SelectItem>
                    <SelectItem value="proximo_vencer">Próximo a Vencer</SelectItem>
                    <SelectItem value="retrasado">Retrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por monto mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Mínimo</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filtroMontoMin}
                  onChange={(e) => setFiltroMontoMin(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Filtro por monto máximo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Máximo</label>
                <Input
                  type="number"
                  placeholder="Sin límite"
                  value={filtroMontoMax}
                  onChange={(e) => setFiltroMontoMax(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Filtro por fecha de inicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                <Input
                  type="date"
                  value={filtroFechaInicio}
                  onChange={(e) => setFiltroFechaInicio(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Filtro por fecha de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                <Input
                  type="date"
                  value={filtroFechaFin}
                  onChange={(e) => setFiltroFechaFin(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Botones de acción para filtros */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiltroPrioridad('__ALL__')
                  setFiltroEstadoTiempo('__ALL__')
                  setFiltroMontoMin('')
                  setFiltroMontoMax('')
                  setFiltroFechaInicio('')
                  setFiltroFechaFin('')
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* 🚀 Información de rendimiento */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800">
              ⚡ Rendimiento: {totalItemsFiltrados} pedidos filtrados | 
              {useVirtualization ? 'Virtualización activa' : 'Paginación tradicional'}
            </div>
          </div>
        )}

        {/* 📊 Lista de pedidos optimizada */}
        {useVirtualization ? (
          <VirtualList<PedidoSeguimientoDetalle>
            items={pedidosOrdenados}
            itemHeight={vistaDetallada ? 350 : 220}
            containerHeight={600}
            renderItem={(pedido, index) => (
              <PedidoCard 
                key={pedido.id}
                pedido={pedido}
                index={index}
                vistaDetallada={vistaDetallada}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                getEstadoColor={getEstadoColor}
                getTiempoColor={getTiempoColor}
              />
            )}
            overscan={3}
            onEndReached={undefined}
            loading={loading}
            className="space-y-4"
            emptyComponent={
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
                <p className="text-gray-600">No se encontraron pedidos que coincidan con los filtros aplicados.</p>
              </div>
            }
          />
        ) : (
          <div className="space-y-4">
            {pedidosPaginados.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
                <p className="text-gray-600">No se encontraron pedidos que coincidan con los filtros aplicados.</p>
              </div>
            ) : (
              pedidosPaginados.map((pedido: PedidoSeguimientoDetalle, index: number) => (
                <PedidoCard 
                  key={pedido.id}
                  pedido={pedido}
                  index={index}
                  vistaDetallada={vistaDetallada}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  getEstadoColor={getEstadoColor}
                  getTiempoColor={getTiempoColor}
                />
              ))
            )}
          </div>
        )}

        {/* 📄 Controles de paginación (solo si no está virtualizado) */}
        {!useVirtualization && totalItemsFiltrados > itemsPorPagina && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Mostrando {indiceInicio + 1}-{Math.min(indiceFin, totalItemsFiltrados)} de {totalItemsFiltrados} pedidos</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={itemsPorPagina.toString()} onValueChange={(value) => {
                setItemsPorPagina(Number(value))
                setPaginaActual(1)
              }}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">por página</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(1)}
                disabled={paginaActual === 1}
              >
                ««
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                disabled={paginaActual === 1}
              >
                ‹
              </Button>
              
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let pageNum;
                  if (totalPaginas <= 5) {
                    pageNum = i + 1;
                  } else if (paginaActual <= 3) {
                    pageNum = i + 1;
                  } else if (paginaActual >= totalPaginas - 2) {
                    pageNum = totalPaginas - 4 + i;
                  } else {
                    pageNum = paginaActual - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={paginaActual === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaginaActual(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                disabled={paginaActual === totalPaginas}
              >
                ›
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaActual === totalPaginas}
              >
                »»
              </Button>
            </div>
          </div>
        )}

        {/* 📊 Resumen de métricas */}
        {totalItemsFiltrados > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumen de Seguimiento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Progreso Promedio</p>
                <p className="text-xl font-bold text-blue-600">{metricas.progresoPromedio.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">A Tiempo</p>
                <p className="text-xl font-bold text-green-600">{metricas.pedidosATiempo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Retrasados</p>
                <p className="text-xl font-bold text-red-600">{metricas.pedidosRetrasados}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(metricas.montoTotal)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}