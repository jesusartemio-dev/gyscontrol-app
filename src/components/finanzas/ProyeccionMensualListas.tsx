// ===================================================
// 📁 Archivo: ProyeccionMensualListas.tsx
// 📌 Ubicación: src/components/finanzas/ProyeccionMensualListas.tsx
// 🔧 Descripción: Componente para proyección mensual de costos basada en Listas técnicas
//
// 🧠 Uso: Analiza y proyecta costos mensuales basándose en las listas técnicas de equipos
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdvancedSearch, SearchCriterion, SearchField } from '@/components/ui/AdvancedSearch'
import VirtualList from '@/components/ui/VirtualList'
import { useLazyLoading, usePerformanceMetrics, useDebounce } from '@/hooks/useLazyLoading'
import { useCriticalPerformanceMonitoring } from '@/hooks/useAdvancedPerformanceMonitoring'
import type { PaginatedResponse } from '@/hooks/useLazyLoading'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { toast } from 'sonner'
import { getTodasLasListas } from '@/lib/services/listaEquipo'
import { getListaEquipoItems } from '@/lib/services/listaEquipoItem'
import { getProyectos } from '@/lib/services/proyecto'
import type { ListaEquipo, ListaEquipoItem, Proyecto } from '@/types/modelos'

// 🏗️ Interfaces específicas del componente
interface ProyeccionMensualDetalle {
  mes: string
  costoEstimado: number
  costoReal: number
  variacion: number
  variacionPorcentaje: number
  listasTotal: number
  listasAprobadas: number
  listasPendientes: number
  detalleEstados: {
    borrador: number
    revision: number
    aprobada: number
    rechazada: number
  }
  proyectosInvolucrados: string[]
}

interface ListaProyeccionDetalle {
  id: string
  nombre: string
  proyecto: string
  estado: string
  createdAt: string
  fechaVencimiento?: string
  montoEstimado: number
  montoReal?: number
  responsable?: {
    nombre: string
    email: string
  }
  prioridad?: 'baja' | 'media' | 'alta' | 'critica'
  estadoTiempo: 'a_tiempo' | 'proximo_vencimiento' | 'retrasado'
  alertas?: string[]
  observaciones?: string
}

const ListaCard = React.memo<{
  lista: ListaProyeccionDetalle
  index: number
  vistaDetallada: boolean
  formatDate: (date: string) => string
  formatCurrency: (amount: number) => string
  getEstadoColor: (estado: string) => string
  getTiempoColor: (estadoTiempo: string) => string
}>(({ lista, index, vistaDetallada, formatDate, formatCurrency, getEstadoColor, getTiempoColor }) => (
  <motion.div
    key={lista.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="border rounded-lg p-4 hover:shadow-md transition-all duration-200"
  >
    <div className="flex justify-between items-start mb-3">
      <div>
        <h4 className="font-semibold text-gray-900">{lista.nombre}</h4>
        <p className="text-sm text-gray-600">{lista.proyecto}</p>
      </div>
      <div className="flex items-center gap-2">
        {lista.estadoTiempo === 'retrasado' && (
          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">Retrasado</Badge>
        )}
        {lista.estadoTiempo === 'proximo_vencimiento' && (
          <Badge variant="secondary" className="text-xs">Próximo vencimiento</Badge>
        )}
        {lista.prioridad && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            lista.prioridad === 'critica' ? 'bg-red-100 text-red-800' :
            lista.prioridad === 'alta' ? 'bg-orange-100 text-orange-800' :
            lista.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {lista.prioridad === 'critica' ? '🔴' :
             lista.prioridad === 'alta' ? '🟠' :
             lista.prioridad === 'media' ? '🟡' : '🟢'} {lista.prioridad.toUpperCase()}
          </span>
        )}
        <Badge 
          variant={lista.estado === 'aprobada' ? 'default' : 'secondary'}
          className={getEstadoColor(lista.estado)}
        >
          {lista.estado}
        </Badge>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-3">
      <div>
        <span className="text-sm text-gray-500">Monto Estimado:</span>
        <p className="font-medium">{formatCurrency(lista.montoEstimado)}</p>
        {lista.montoReal && lista.montoReal !== lista.montoEstimado && (
          <>
            <span className="text-sm text-gray-500">Monto Real:</span>
            <p className={`font-medium ${
              lista.montoReal > lista.montoEstimado ? 'text-red-600' : 'text-green-600'
            }`}>{formatCurrency(lista.montoReal)}</p>
          </>
        )}
      </div>
      <div>
        <span className="text-sm text-gray-500">Fecha Creación:</span>
        <p className="font-medium">{formatDate(lista.createdAt)}</p>
        {lista.fechaVencimiento && (
          <>
            <span className="text-sm text-gray-500">Vencimiento:</span>
            <p className={`font-medium ${getTiempoColor(lista.estadoTiempo)}`}>
              {formatDate(lista.fechaVencimiento)}
            </p>
          </>
        )}
      </div>
    </div>

    {lista.alertas && lista.alertas.length > 0 && (
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">Alertas:</span>
        </div>
        {lista.alertas.map((alerta, index) => (
          <div key={index} className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded mb-1">
            {alerta}
          </div>
        ))}
      </div>
    )}

    {lista.responsable && (
      <div className="mb-3">
        <span className="text-sm text-gray-500">Responsable:</span>
        <p className="font-medium">{lista.responsable.nombre}</p>
        <p className="text-sm text-gray-600">{lista.responsable.email}</p>
      </div>
    )}

    {vistaDetallada && (
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Estado de Tiempo:</span>
            <p className={`font-medium ${getTiempoColor(lista.estadoTiempo)}`}>
              {lista.estadoTiempo === 'a_tiempo' ? 'A tiempo' :
               lista.estadoTiempo === 'proximo_vencimiento' ? 'Próximo vencimiento' :
               'Retrasado'}
            </p>
          </div>
        </div>
        {lista.observaciones && (
          <div className="mt-3">
            <span className="text-sm text-gray-500">Observaciones:</span>
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">
              {lista.observaciones}
            </p>
          </div>
        )}
      </div>
    )}
  </motion.div>
))

const ProyeccionCard = React.memo<{
  proyeccion: ProyeccionMensualDetalle
  index: number
  isSelected: boolean
  vistaDetallada: boolean
  formatMes: (mes: string) => string
  formatCurrency: (amount: number) => string
  getVariacionColor: (variacion: number) => string
  getEstadoColor: (estado: string) => string
}>(({ proyeccion, index, isSelected, vistaDetallada, formatMes, formatCurrency, getVariacionColor, getEstadoColor }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.1 }}
    className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
    }`}
  >
    <div className="flex justify-between items-start mb-3">
      <h4 className="font-semibold text-lg">{formatMes(proyeccion.mes)}</h4>
      <div className="flex items-center gap-2">
        {proyeccion.variacionPorcentaje !== 0 && (
          <Badge variant={proyeccion.variacionPorcentaje > 0 ? 'secondary' : 'default'} className={proyeccion.variacionPorcentaje > 0 ? 'bg-red-100 text-red-800' : ''}>
            {proyeccion.variacionPorcentaje > 0 ? '+' : ''}{proyeccion.variacionPorcentaje.toFixed(1)}%
          </Badge>
        )}
        {proyeccion.listasAprobadas === proyeccion.listasTotal && proyeccion.listasTotal > 0 && (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />Completo
          </Badge>
        )}
        {proyeccion.variacionPorcentaje < 0 ? (
          <TrendingDown className="h-5 w-5 text-green-600" />
        ) : proyeccion.variacionPorcentaje > 0 ? (
          <TrendingUp className="h-5 w-5 text-red-600" />
        ) : (
          <div className="h-5 w-5" />
        )}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <span className="text-sm text-gray-500">Costo Estimado:</span>
        <p className="text-xl font-bold text-blue-600">
          {formatCurrency(proyeccion.costoEstimado)}
        </p>
      </div>
      <div>
        <span className="text-sm text-gray-500">Costo Real:</span>
        <p className={`text-xl font-bold ${
          proyeccion.costoReal > proyeccion.costoEstimado ? 'text-red-600' : 'text-green-600'
        }`}>
          {formatCurrency(proyeccion.costoReal)}
        </p>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">{proyeccion.listasTotal}</p>
        <p className="text-xs text-gray-500">Total Listas</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-green-600">{proyeccion.listasAprobadas}</p>
        <p className="text-xs text-gray-500">Aprobadas</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-orange-600">{proyeccion.listasPendientes}</p>
        <p className="text-xs text-gray-500">Pendientes</p>
      </div>
    </div>

    {vistaDetallada && (
      <div className="mt-4 pt-4 border-t space-y-3">
        <div>
          <h5 className="font-medium mb-2">Detalle por Estado:</h5>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(proyeccion.detalleEstados).map(([estado, cantidad]) => (
              <div key={estado} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm capitalize">{estado}:</span>
                <Badge variant="outline" className={getEstadoColor(estado)}>
                  {cantidad}
                </Badge>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h5 className="font-medium mb-2">Proyectos Involucrados:</h5>
          <div className="flex flex-wrap gap-1">
            {proyeccion.proyectosInvolucrados.map((proyecto, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {proyecto}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    )}
  </motion.div>
))

interface ProyeccionMensualListasProps {
  mesSeleccionado?: string
  filtros?: any
  onProyeccionChange?: (proyecciones: ProyeccionMensualDetalle[]) => void
  onDataChange?: (data: any) => void
}

export default function ProyeccionMensualListas({ 
  mesSeleccionado = new Date().toISOString().slice(0, 7),
  filtros,
  onProyeccionChange,
  onDataChange
}: ProyeccionMensualListasProps) {
  // 🔧 Ref para filtros anteriores para evitar re-renders infinitos
  const filtrosAnterioresRef = useRef<string>('{}')
  
  // 🔧 Memoize filtros to prevent infinite re-renders
  const filtrosMemoized = useMemo(() => {
    if (!filtros) return {}
    
    const filtrosString = JSON.stringify(filtros)
    // Solo actualizar si los filtros realmente han cambiado
    if (filtrosString === filtrosAnterioresRef.current) {
      return JSON.parse(filtrosAnterioresRef.current)
    }
    
    filtrosAnterioresRef.current = filtrosString
    return filtros
  }, [filtros])
  
  // 🔧 Memoize periodo inicial para evitar re-renders infinitos
  const periodoInicial = useMemo(() => mesSeleccionado, [])
  
  // 📅 Generar lista estática de períodos disponibles (últimos 12 meses + próximos 6)
  const periodosDisponibles = useMemo(() => {
    const periodos = []
    const fechaBase = new Date()
    
    // Últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth() - i, 1)
      periodos.push(fecha.toISOString().slice(0, 7))
    }
    
    // Próximos 6 meses
    for (let i = 1; i <= 6; i++) {
      const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, 1)
      periodos.push(fecha.toISOString().slice(0, 7))
    }
    
    return periodos
  }, [])

  // 📊 Monitoreo de rendimiento crítico
  const { 
    metrics: performanceMetrics, 
    startInteraction, 
    endInteraction,
    trackInteraction 
  } = useCriticalPerformanceMonitoring('ProyeccionMensualListas')
  
  // 🔄 Estados principales
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [proyeccionesMensuales, setProyeccionesMensuales] = useState<ProyeccionMensualDetalle[]>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoInicial)
  const [vistaDetallada, setVistaDetallada] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [proyeccionSeleccionada, setProyeccionSeleccionada] = useState<string | null>(null)
  
  // Referencias para evitar bucles infinitos
  const listasRef = useRef<ListaEquipo[]>([])
  const itemsRef = useRef<ListaEquipoItem[]>([])
  const isInitialLoadRef = useRef(true)
  const onProyeccionChangeRef = useRef(onProyeccionChange)
  const onDataChangeRef = useRef(onDataChange)
  
  // Actualizar refs cuando cambien las props
  useEffect(() => {
    onProyeccionChangeRef.current = onProyeccionChange
    onDataChangeRef.current = onDataChange
  }, [onProyeccionChange, onDataChange])
  
  // 🚀 Estados de virtualización y rendimiento
  const [useVirtualization, setUseVirtualization] = useState(true)
  const [shouldUseVirtualization, setShouldUseVirtualization] = useState(false)
  
  // 🔍 Estados de búsqueda y filtros
  const [busquedaLocal, setBusquedaLocal] = useState('')
  const [filtroProyectoLocal, setFiltroProyectoLocal] = useState('')
  const [mostrarBusquedaAvanzada, setMostrarBusquedaAvanzada] = useState(false)
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false)
  const [criteriosBusqueda, setCriteriosBusqueda] = useState<SearchCriterion[]>([])
  
  // 📄 Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  
  // 🎯 Lazy loading con hook personalizado
  const {
    items: datosLazyLoading,
    loading: loadingLazy,
    error: errorLazy,
    loadMore,
    hasMore,
    reset: resetLazyLoading
  } = useLazyLoading<ListaProyeccionDetalle>(
    useCallback(async (page: number, limit: number) => {
      const startTime = performance.now()
      
      try {
        // Simular carga de datos paginados
        const offset = (page - 1) * limit
        const listasSlice = listas.slice(offset, offset + limit)
        
        const listasDetalle: ListaProyeccionDetalle[] = listasSlice.map(lista => ({
          id: lista.id,
          nombre: lista.nombre,
          proyecto: lista.proyecto?.nombre || 'Sin proyecto',
          estado: lista.estado || 'borrador',
          createdAt: lista.createdAt,
          fechaVencimiento: lista.updatedAt, // Usando updatedAt como fecha de vencimiento temporal
          montoEstimado: 0, // Calculado desde items
          montoReal: 0, // Calculado desde items
          responsable: undefined, // No disponible en ListaEquipo
          prioridad: 'media' as const, // Valor por defecto
          estadoTiempo: 'a_tiempo' as const,
          alertas: [],
          observaciones: '' // No disponible en ListaEquipo
        }))
        
        const endTime = performance.now()
        trackInteraction('lazy-load-data', endTime - startTime)
        
        return {
          items: listasDetalle,
          total: listas.length,
          hasMore: offset + limit < listas.length,
          page: Math.floor(offset / limit) + 1
        } as PaginatedResponse<ListaProyeccionDetalle>
      } catch (error) {
        console.error('Error en lazy loading:', error)
        throw error
      }
    }, [listas, trackInteraction])
  )
  
  // 📊 Función para calcular proyecciones mensuales
  // 🧮 Función interna para calcular proyecciones sin dependencias de useCallback
  const calcularProyeccionesMensualesInterno = (
    listasData: ListaEquipo[],
    itemsData: ListaEquipoItem[],
    periodo: string
  ): ProyeccionMensualDetalle[] => {
    const proyecciones: ProyeccionMensualDetalle[] = []
    const fechaBase = new Date(periodo)
    
    // Generar proyecciones para los próximos 6 meses
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, 1)
      const mesKey = fecha.toISOString().slice(0, 7)
      
      // Filtrar listas del mes
      const listasDelMes = listasData.filter(lista => {
        const fechaLista = new Date(lista.createdAt)
        return fechaLista.getFullYear() === fecha.getFullYear() && 
               fechaLista.getMonth() === fecha.getMonth()
      })
      
      // Calcular detalle de estados
      const detalleEstados = {
        borrador: listasDelMes.filter(l => l.estado === 'borrador').length,
        revision: listasDelMes.filter(l => l.estado === 'por_revisar').length,
        aprobada: listasDelMes.filter(l => l.estado === 'aprobado').length,
        rechazada: listasDelMes.filter(l => l.estado === 'rechazado').length
      }
      
      // Filtrar items del mes
      const itemsDelMes = itemsData.filter(item =>
        listasDelMes.some(lista => lista.id === item.listaId)
      )
      
      // Calcular costos
      const costoEstimado = itemsDelMes.reduce((sum, item) => {
        const precio = item.precioElegido || 0
        const cantidad = item.cantidad || 1
        return sum + (precio * cantidad)
      }, 0)
      
      // Calcular costo real (solo items de listas aprobadas)
      const itemsAprobados = itemsDelMes.filter(item => {
        const lista = listasDelMes.find(l => l.id === item.listaId)
        return lista?.estado === 'aprobado'
      })
      
      const costoReal = itemsAprobados.reduce((sum, item) => {
        const precio = item.precioElegido || 0
        const cantidad = item.cantidad || 1
        return sum + (precio * cantidad)
      }, 0)
      
      const variacion = costoReal - costoEstimado
      const variacionPorcentaje = costoEstimado > 0 ? (variacion / costoEstimado) * 100 : 0
      
      // Obtener proyectos involucrados
      const proyectosInvolucrados = [...new Set(
        listasDelMes.map(lista => lista.proyecto?.nombre).filter(Boolean)
      )] as string[]
      
      proyecciones.push({
        mes: mesKey,
        costoEstimado,
        costoReal,
        variacion,
        variacionPorcentaje,
        listasTotal: listasDelMes.length,
        listasAprobadas: detalleEstados.aprobada,
        listasPendientes: detalleEstados.borrador + detalleEstados.revision,
        detalleEstados,
        proyectosInvolucrados
      })
    }
    
    return proyecciones
  }
  
  // ✅ Función eliminada para evitar dependencia circular
  
  // 🔄 Función para cargar datos reales
  const cargarDatosReales = useCallback(async (periodo?: string) => {
    setLoading(true)
    try {
      setError(null)
      
      // Cargar datos en paralelo para mejor rendimiento
      const [listasData, itemsData] = await Promise.all([
        getTodasLasListas(),
        getListaEquipoItems()
      ])
      
      if (listasData && itemsData) {
        setListas(listasData)
        setItems(itemsData)
        listasRef.current = listasData
        itemsRef.current = itemsData
        
        // Usar el período pasado como parámetro o el período actual del estado
        const periodoAUsar = periodo || periodoSeleccionado
        
        // Calcular proyecciones mensuales usando el período especificado
        const proyecciones = calcularProyeccionesMensualesInterno(listasData, itemsData, periodoAUsar)
        setProyeccionesMensuales(proyecciones)
        
        // Solo notificar cambios si no es la carga inicial para evitar bucles
        if (!isInitialLoadRef.current) {
          if (onProyeccionChangeRef.current) {
            onProyeccionChangeRef.current(proyecciones)
          }
          
          if (onDataChangeRef.current) {
            const dashboardData = { proyecciones, listas: listasData, items: itemsData }
            onDataChangeRef.current(dashboardData)
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      setError('Error al cargar las proyecciones mensuales')
    } finally {
      setLoading(false)
      isInitialLoadRef.current = false
    }
  }, [])
  
  // 🚀 Efecto principal para cargar datos inicial
  useEffect(() => {
    if (isInitialLoadRef.current) {
      const cargarDatosIniciales = async () => {
        setLoading(true)
        try {
          setError(null)
          
          // Cargar datos en paralelo para mejor rendimiento
          const [listasData, itemsData] = await Promise.all([
            getTodasLasListas(),
            getListaEquipoItems()
          ])
          
          if (listasData && itemsData) {
            setListas(listasData)
            setItems(itemsData)
            listasRef.current = listasData
            itemsRef.current = itemsData
            
            // Calcular proyecciones mensuales usando el período inicial
            const proyecciones = calcularProyeccionesMensualesInterno(listasData, itemsData, periodoSeleccionado)
            setProyeccionesMensuales(proyecciones)
          }
        } catch (error) {
          console.error('Error al cargar datos iniciales:', error)
          setError('Error al cargar las proyecciones mensuales')
        } finally {
          setLoading(false)
          isInitialLoadRef.current = false
        }
      }
      
      cargarDatosIniciales()
    }
  }, [])
  
  // 🔄 Efecto para recalcular proyecciones cuando cambia el período (DESHABILITADO TEMPORALMENTE)
  // useEffect(() => {
  //   if (!isInitialLoadRef.current && listasRef.current.length > 0 && itemsRef.current.length > 0) {
  //     // Throttle para evitar ejecuciones demasiado frecuentes
  //     const timeoutId = setTimeout(() => {
  //       const nuevasProyecciones = calcularProyeccionesMensualesInterno(listasRef.current, itemsRef.current, periodoSeleccionado)
  //       setProyeccionesMensuales(nuevasProyecciones)
  //       
  //       // Notificar cambios al componente padre
  //       if (onProyeccionChangeRef.current) {
  //         onProyeccionChangeRef.current(nuevasProyecciones)
  //       }
  //     }, 300) // 300ms de throttle
  //     
  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [filtrosMemoized, periodoSeleccionado])
  
  // 🔄 Función para actualizar proyecciones con filtros
  const actualizarProyecciones = useCallback(async (filtrosPersonalizados?: any) => {
    // Solo actualizar si hay datos disponibles
    if (!listas.length || !items.length) return
    
    try {
      setActualizando(true)
      
      // Recalcular proyecciones con filtros aplicados
      const nuevasProyecciones = calcularProyeccionesMensualesInterno(listas, items, periodoSeleccionado)
      setProyeccionesMensuales(nuevasProyecciones)
      
      if (filtrosPersonalizados && onDataChangeRef.current) {
        // Aplicar filtros personalizados aquí
        const dashboardData = { 
          proyecciones: nuevasProyecciones, 
          listas: listas, 
          items: items 
        }
        onDataChangeRef.current(dashboardData)
      }
      
    } catch (error) {
      console.error('Error al actualizar proyecciones:', error)
      toast.error('Error al actualizar las proyecciones')
    } finally {
      setActualizando(false)
    }
  }, [listas, items, periodoSeleccionado])
  
  // ✅ useEffect duplicado eliminado para evitar bucle infinito
  
  // 🔍 Configuración de campos de búsqueda avanzada
  const camposBusqueda: SearchField[] = [
    { key: 'nombre', label: 'Nombre de Lista', type: 'text' },
    { key: 'proyecto', label: 'Proyecto', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'select', options: [
      { value: 'borrador', label: 'Borrador' },
      { value: 'revision', label: 'En Revisión' },
      { value: 'aprobada', label: 'Aprobada' },
      { value: 'rechazada', label: 'Rechazada' }
    ]},
    { key: 'montoEstimado', label: 'Monto Estimado', type: 'number' },
    { key: 'createdAt', label: 'Fecha de Creación', type: 'date' }
  ]
  
  // 🔍 Función para aplicar criterios de búsqueda avanzada
  const aplicarCriteriosBusqueda = (proyeccion: ProyeccionMensualDetalle, criterios: SearchCriterion[]): boolean => {
    if (criterios.length === 0) return true
    
    return criterios.every(criterio => {
      const valor = (proyeccion as any)[criterio.field]
      
      switch (criterio.operator) {
        case 'equals':
          return valor === criterio.value
        case 'contains':
          return valor?.toString().toLowerCase().includes(criterio.value?.toString().toLowerCase())
        case 'greater_than':
          return Number(valor) > Number(criterio.value)
        case 'less_than':
          return Number(valor) < Number(criterio.value)
        case 'between':
          if (Array.isArray(criterio.value) && criterio.value.length === 2) {
            const [min, max] = criterio.value
            return Number(valor) >= Number(min) && Number(valor) <= Number(max)
          }
          return false
        case 'date_between':
          if (Array.isArray(criterio.value) && criterio.value.length === 2) {
            const [fechaInicio, fechaFin] = criterio.value
            const fechaValor = new Date(valor)
            return fechaValor >= new Date(fechaInicio) && fechaValor <= new Date(fechaFin)
          }
          return false
        default:
          return true
      }
    })
  }
  
  // 🎨 Funciones de utilidad para colores y formato
  const getEstadoColor = useCallback((estado: string) => {
    switch (estado) {
      case 'aprobada': return 'bg-green-100 text-green-800'
      case 'revision': return 'bg-yellow-100 text-yellow-800'
      case 'rechazada': return 'bg-red-100 text-red-800'
      case 'borrador': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])
  
  const getTiempoColor = useCallback((estadoTiempo: string) => {
    switch (estadoTiempo) {
      case 'retrasado': return 'text-red-600'
      case 'proximo_vencimiento': return 'text-yellow-600'
      case 'a_tiempo': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }, [])
  
  const formatDate = useCallback((dateString: string): string => {
    const fecha = new Date(dateString)
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])
  
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }, [])
  
  const getVariacionColor = useCallback((variacion: number) => {
    if (variacion > 0) return 'text-red-600'
    if (variacion < 0) return 'text-green-600'
    return 'text-gray-600'
  }, [])
  
  const formatMes = useCallback((mes: string): string => {
    const fecha = new Date(mes + '-01')
    return fecha.toLocaleDateString('es-ES', { 
      month: 'long',
      year: 'numeric' 
    })
  }, [])

  // 🔍 Aplicar filtros con memoización y métricas de rendimiento
  const proyeccionesFiltradas = useMemo(() => {
    if (loading || error) return []
    
    const interactionId = startInteraction('filter-proyecciones')
    const startTime = performance.now()
    
    const filtered = proyeccionesMensuales.filter(proyeccion => {
      // Filtro de búsqueda local
      if (busquedaLocal) {
        const searchTerm = busquedaLocal.toLowerCase()
        const matchesSearch = 
          formatMes(proyeccion.mes).toLowerCase().includes(searchTerm) ||
          proyeccion.proyectosInvolucrados.some(p => p.toLowerCase().includes(searchTerm))
        
        if (!matchesSearch) return false
      }
      
      // Filtro de proyecto
      if (filtroProyectoLocal) {
        if (!proyeccion.proyectosInvolucrados.includes(filtroProyectoLocal)) {
          return false
        }
      }
      
      // Aplicar criterios de búsqueda avanzada
      if (!aplicarCriteriosBusqueda(proyeccion, criteriosBusqueda)) {
        return false
      }
      
      return true
    })
    
    const endTime = performance.now()
    endInteraction(interactionId.toString())
    trackInteraction('filter-proyecciones', endTime - startTime)
    
    return filtered
  }, [loading, error, proyeccionesMensuales, busquedaLocal, filtroProyectoLocal, criteriosBusqueda, formatMes, startInteraction, endInteraction, trackInteraction])
  
  // 🔄 Ordenar proyecciones con métricas de rendimiento
  const proyeccionesOrdenadas = useMemo(() => {
    if (loading || error) return []
    
    const startTime = performance.now()
    
    const sorted = [...proyeccionesFiltradas].sort((a, b) => {
      return new Date(a.mes).getTime() - new Date(b.mes).getTime()
    })
    
    const endTime = performance.now()
    trackInteraction('sort-proyecciones', endTime - startTime)
    
    return sorted
  }, [loading, error, proyeccionesFiltradas, trackInteraction])
  
  // 🚀 Determinar si usar virtualización
  const shouldUseVirtualizationValue = useMemo(() => {
    return proyeccionesOrdenadas.length > 50
  }, [proyeccionesOrdenadas.length])
  
  // 📄 Aplicar paginación tradicional o preparar datos para virtualización
  const proyeccionesPaginadas = useMemo(() => {
    if (loading || error) return []
    
    if (shouldUseVirtualizationValue && useVirtualization) {
      return proyeccionesOrdenadas // VirtualList manejará la paginación
    }
    
    const totalItemsFiltrados = proyeccionesOrdenadas.length
    const indiceInicio = (paginaActual - 1) * itemsPorPagina
    const indiceFin = indiceInicio + itemsPorPagina
    const paginadas = proyeccionesOrdenadas.slice(indiceInicio, indiceFin)
    
    // Actualizar totalItems si es necesario
    if (totalItems !== totalItemsFiltrados) {
      setTotalItems(totalItemsFiltrados)
    }
    
    return paginadas
  }, [loading, error, proyeccionesOrdenadas, paginaActual, itemsPorPagina, shouldUseVirtualizationValue, useVirtualization, totalItems])
  
  const totalPaginas = useMemo(() => {
    return Math.ceil(totalItems / itemsPorPagina)
  }, [totalItems, itemsPorPagina])

  // 🔄 Estados de carga
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Cargando proyecciones...</span>
          </div>
        </CardHeader>
        <CardContent>
          {/* 🔍 Búsqueda avanzada */}
          {mostrarBusquedaAvanzada && (
            <div className="mb-6">
              <AdvancedSearch
                fields={camposBusqueda}
                onSearch={setCriteriosBusqueda}
                onClear={() => setCriteriosBusqueda([])}
                className="bg-green-50 border-green-200"
              />
            </div>
          )}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
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
            <AlertCircle className="h-8 w-8 mr-2" />
            <div>
              <p className="font-medium">Error al cargar proyecciones</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => cargarDatosReales()}
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
              <BarChart3 className="h-5 w-5" />
              Proyección Mensual - Listas Técnicas
            </CardTitle>
            <CardDescription>
              Análisis de costos basado en {listas.length} listas técnicas y {items.length} items
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* 🔍 Campo de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar proyecciones..."
                value={busquedaLocal}
                onChange={(e) => setBusquedaLocal(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* 📅 Selector de período */}
            <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodosDisponibles.map(periodo => (
                  <SelectItem key={periodo} value={periodo}>
                    {formatMes(periodo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 🔄 Botón de actualización */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => actualizarProyecciones()}
              disabled={actualizando}
            >
              {actualizando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            
            {/* 👁️ Toggle vista detallada */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVistaDetallada(!vistaDetallada)}
            >
              {vistaDetallada ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            {/* 🔍 Toggle búsqueda avanzada */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarBusquedaAvanzada(!mostrarBusquedaAvanzada)}
            >
              <Search className="h-4 w-4" />
            </Button>
            
            {/* ⚙️ Toggle filtros avanzados */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* 🔍 Búsqueda avanzada */}
        {mostrarBusquedaAvanzada && (
          <div className="mt-4">
            <AdvancedSearch
              fields={camposBusqueda}
              onSearch={setCriteriosBusqueda}
              onClear={() => setCriteriosBusqueda([])}
              className="bg-green-50 border-green-200"
            />
          </div>
        )}
        
        {/* 🎛️ Filtros avanzados */}
        {mostrarFiltrosAvanzados && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Proyecto:</label>
                <Select value={filtroProyectoLocal} onValueChange={setFiltroProyectoLocal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los proyectos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proyectos</SelectItem>
                    {Array.from(new Set(proyeccionesMensuales.flatMap(p => p.proyectosInvolucrados))).map(proyecto => (
                      <SelectItem key={proyecto} value={proyecto}>
                        {proyecto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* 📊 Renderizado de proyecciones */}
          {shouldUseVirtualizationValue && useVirtualization ? (
            <VirtualList
              items={proyeccionesPaginadas}
              itemHeight={200}
              containerHeight={600}
              renderItem={(proyeccion, index, isVisible) => {
                const isSelected = proyeccionSeleccionada === proyeccion.mes
                
                return (
                  <div
                    onClick={() => {
                      setProyeccionSeleccionada(
                        proyeccionSeleccionada === proyeccion.mes ? null : proyeccion.mes
                      )
                    }}
                    className="cursor-pointer"
                  >
                    <ProyeccionCard
                      proyeccion={proyeccion}
                      index={index}
                      isSelected={isSelected}
                      vistaDetallada={vistaDetallada}
                      formatMes={formatMes}
                      formatCurrency={formatCurrency}
                      getVariacionColor={getVariacionColor}
                      getEstadoColor={getEstadoColor}
                    />
                  </div>
                )
              }}
              emptyComponent={
                <div className="text-center py-8 text-gray-500">
                  No se encontraron proyecciones para los criterios seleccionados
                </div>
              }
            />
          ) : (
            proyeccionesPaginadas.map((proyeccion, index) => {
              const isSelected = proyeccionSeleccionada === proyeccion.mes
              
              return (
                <div
                  key={proyeccion.mes}
                  onClick={() => {
                    setProyeccionSeleccionada(
                      proyeccionSeleccionada === proyeccion.mes ? null : proyeccion.mes
                    )
                  }}
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  } cursor-pointer`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-lg">{formatMes(proyeccion.mes)}</h4>
                    <div className="flex items-center gap-2">
                      {proyeccion.variacionPorcentaje !== 0 && (
                        <Badge variant={proyeccion.variacionPorcentaje > 0 ? 'secondary' : 'default'} className={proyeccion.variacionPorcentaje > 0 ? 'bg-red-100 text-red-800' : ''}>
                          {proyeccion.variacionPorcentaje > 0 ? '+' : ''}{proyeccion.variacionPorcentaje.toFixed(1)}%
                        </Badge>
                      )}
                      {proyeccion.listasAprobadas === proyeccion.listasTotal && proyeccion.listasTotal > 0 && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />Completo
                        </Badge>
                      )}
                      {proyeccion.variacionPorcentaje < 0 ? (
                        <TrendingDown className="h-5 w-5 text-green-600" />
                      ) : proyeccion.variacionPorcentaje > 0 ? (
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      ) : (
                        <div className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Costo Estimado:</span>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(proyeccion.costoEstimado)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Costo Real:</span>
                      <p className={`text-xl font-bold ${
                        proyeccion.costoReal > proyeccion.costoEstimado ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(proyeccion.costoReal)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{proyeccion.listasTotal}</p>
                      <p className="text-xs text-gray-500">Total Listas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{proyeccion.listasAprobadas}</p>
                      <p className="text-xs text-gray-500">Aprobadas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{proyeccion.listasPendientes}</p>
                      <p className="text-xs text-gray-500">Pendientes</p>
                    </div>
                  </div>

                  {proyeccion.listasPendientes > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-700">
                          {proyeccion.listasPendientes} listas pendientes de aprobación
                        </span>
                      </div>
                    </div>
                  )}

                  {vistaDetallada && isSelected && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Detalle por Estado:</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(proyeccion.detalleEstados).map(([estado, cantidad]) => (
                            cantidad > 0 && (
                              <div key={estado} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-sm capitalize">{estado}:</span>
                                <Badge variant="outline" className={getEstadoColor(estado)}>
                                  {cantidad}
                                </Badge>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                      
                      {proyeccion.proyectosInvolucrados.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Proyectos Involucrados:</h5>
                          <div className="flex flex-wrap gap-1">
                            {proyeccion.proyectosInvolucrados.map((proyecto, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {proyecto}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {proyeccion.variacion !== 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Análisis de Variación:</h5>
                          <div className="p-3 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Diferencia:</span>
                              <span className={`font-medium ${
                                proyeccion.variacion < 0 ?
                                'text-green-600' : 'text-red-600'
                              }`}>
                                {proyeccion.variacion < 0 ?
                                  `Ahorro de ${formatCurrency(Math.abs(proyeccion.variacion))}` :
                                  `Sobrecosto de ${formatCurrency(proyeccion.variacion)}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
        
        {/* 🚀 Controles de virtualización */}
        {shouldUseVirtualizationValue && (
          <div className="mt-6 flex justify-between items-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700">Modo de visualización:</span>
              <Button
                variant={useVirtualization ? "default" : "outline"}
                size="sm"
                onClick={() => setUseVirtualization(true)}
              >
                Virtual
              </Button>
              <Button
                variant={!useVirtualization ? "default" : "outline"}
                size="sm"
                onClick={() => setUseVirtualization(false)}
              >
                Tradicional
              </Button>
            </div>
            <div className="text-sm text-blue-600">
              Mostrando {proyeccionesOrdenadas.length} proyecciones
            </div>
          </div>
        )}
        
        {/* 📄 Controles de paginación tradicional */}
        {!useVirtualization && totalItems > itemsPorPagina && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <Select value={itemsPorPagina.toString()} onValueChange={(value) => {
                setItemsPorPagina(Number(value))
                setPaginaActual(1)
              }}>
                <SelectTrigger className="w-20">
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
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(1)}
                disabled={paginaActual === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                disabled={paginaActual === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPorPagina)) }, (_, i) => {
                  let pageNumber
                  
                  if (totalPaginas <= 5) {
                    pageNumber = i + 1
                  } else if (paginaActual <= 3) {
                    pageNumber = i + 1
                  } else if (paginaActual >= totalPaginas - 2) {
                    pageNumber = totalPaginas - 4 + i
                  } else {
                    pageNumber = paginaActual - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={paginaActual === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaginaActual(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                disabled={paginaActual === totalPaginas}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaActual === totalPaginas}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 📊 Resumen total */}
        {proyeccionesMensuales.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Resumen de Proyección (6 meses)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(proyeccionesMensuales.reduce((sum, p) => sum + p.costoEstimado, 0))}
                </p>
                <p className="text-sm text-gray-600">Costo Total Estimado</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(proyeccionesMensuales.reduce((sum, p) => sum + p.costoReal, 0))}
                </p>
                <p className="text-sm text-gray-600">Costo Total Real</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {proyeccionesMensuales.reduce((sum, p) => sum + p.listasTotal, 0)}
                </p>
                <p className="text-sm text-gray-600">Total de Listas</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}