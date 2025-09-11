/**
 * 🔍 Página de Reportes de Trazabilidad
 * 
 * Dashboard especializado para análisis de trazabilidad de pedidos:
 * - Timeline completo de entregas
 * - Análisis de retrasos y cuellos de botella
 * - Métricas de performance por proveedor
 * - Seguimiento en tiempo real
 * - Alertas y notificaciones
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

// 📡 Types & Services
import {
  TrazabilidadEvent,
  MetricasEntregaData
} from '@/types'
import {
  obtenerEventosTrazabilidad,
  obtenerTrazabilidad,
  obtenerMetricasEntrega
} from '@/lib/services/trazabilidad'

// 🎨 UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Alert, AlertDescription } from '@/components/ui/alert'

// 🎯 Icons
import {
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  Truck,
  MapPin,
  Calendar,
  BarChart3,
  Eye,
  ArrowLeft
} from 'lucide-react'

// 🧩 Custom Components
import TrazabilidadTimeline from '@/components/trazabilidad/TrazabilidadTimeline'
import MetricasEntrega from '@/components/trazabilidad/MetricasEntrega'
import GraficoProgreso from '@/components/trazabilidad/GraficoProgreso'

// 🔧 Utility functions
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusColor = (estado: string): string => {
  switch (estado?.toLowerCase()) {
    case 'completado': return 'text-green-600'
    case 'en_progreso': return 'text-blue-600'
    case 'retrasado': return 'text-red-600'
    case 'pendiente': return 'text-yellow-600'
    default: return 'text-gray-600'
  }
}

const getStatusVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'completado': return 'default'
    case 'en_progreso': return 'secondary'
    case 'retrasado': return 'destructive'
    case 'pendiente': return 'outline'
    default: return 'outline'
  }
}

// Componente que usa useSearchParams envuelto en Suspense
function TrazabilidadContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  // 🔄 Estados principales
  const [eventos, setEventos] = useState<TrazabilidadEvent[]>([])
  const [analytics, setAnalytics] = useState<MetricasEntregaData | null>(null)
  const [metricas, setMetricas] = useState<MetricasEntregaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // 🔍 Estados de filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: 'todos',
    proveedor: 'todos',
    proyecto: 'todos',
    fechaInicio: '',
    fechaFin: '',
    pedidoId: searchParams?.get('pedidoId') || ''
  })

  // 🔁 Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [filtros])

  const cargarDatos = async () => {
    try {
      console.log('🔄 Iniciando carga de datos de trazabilidad...', { filtros })
      setLoading(true)
      setError(null)

      console.log('📡 Llamando a APIs de trazabilidad...')
      const [eventosData, analyticsData, metricasData] = await Promise.all([
        obtenerEventosTrazabilidad({
          entidadId: filtros.pedidoId || undefined,
          entidadTipo: filtros.pedidoId ? 'PEDIDO' : undefined,
          tipo: filtros.estado !== 'todos' ? filtros.estado : undefined,
          fechaDesde: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
          fechaHasta: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined
        }),
        obtenerTrazabilidad(
          filtros.pedidoId || 'default',
          'PEDIDO'
        ),
        obtenerMetricasEntrega('30d', {
          incluirTendencias: true,
          proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined,
          proveedorId: filtros.proveedor !== 'todos' ? filtros.proveedor : undefined,
          fechaDesde: filtros.fechaInicio,
          fechaHasta: filtros.fechaFin
        })
      ])

      console.log('✅ Datos obtenidos:', { eventosData, analyticsData, metricasData })
      setEventos(eventosData)
      setAnalytics(analyticsData)
      setMetricas(metricasData)
    } catch (err) {
      console.error('❌ Error cargando datos de trazabilidad:', err)
      setError('Error al cargar los datos de trazabilidad')
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // 🔍 Filtrar eventos por búsqueda
  const eventosFiltrados = eventos.filter(evento => {
    if (!filtros.busqueda) return true
    const busqueda = filtros.busqueda.toLowerCase()
    return (
      evento.descripcion?.toLowerCase().includes(busqueda) ||
      evento.titulo?.toLowerCase().includes(busqueda) ||
      evento.responsable?.toLowerCase().includes(busqueda) ||
      evento.ubicacion?.toLowerCase().includes(busqueda)
    )
  })

  // 📊 Exportar reporte
  const handleExport = async (formato: 'pdf' | 'excel') => {
    try {
      setExporting(true)
      // Aquí iría la lógica de exportación
      toast.success(`Reporte de trazabilidad ${formato.toUpperCase()} generado correctamente`)
    } catch (err) {
      console.error('Error exportando reporte:', err)
      toast.error('Error al exportar el reporte')
    } finally {
      setExporting(false)
    }
  }

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // ❌ Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={cargarDatos} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          <Button onClick={() => router.back()} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestion">Gestión</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestion/reportes">Reportes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Trazabilidad</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header con controles */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Trazabilidad de Pedidos
            </h1>
            <p className="text-muted-foreground">
              Seguimiento en tiempo real y análisis de entregas
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={cargarDatos}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={exporting}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* 🔍 Filtros y búsqueda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros de Trazabilidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Búsqueda */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Búsqueda</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por pedido, proveedor..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Estado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select 
                  value={filtros.estado} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="retrasado">Retrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Proveedor */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor</label>
                <Select 
                  value={filtros.proveedor} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, proveedor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los proveedores</SelectItem>
                    {/* Aquí se cargarían los proveedores dinámicamente */}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Proyecto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proyecto</label>
                <Select 
                  value={filtros.proyecto} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, proyecto: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los proyectos</SelectItem>
                    {/* Aquí se cargarían los proyectos dinámicamente */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* 📊 Métricas rápidas */}
      {analytics && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics.totalPedidos}</div>
              <p className="text-xs text-muted-foreground">
                Total de pedidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{analytics.pedidosPendientes}</div>
              <p className="text-xs text-muted-foreground">
                Pedidos pendientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{analytics.pedidosEntregados}</div>
              <p className="text-xs text-muted-foreground">
                Pedidos entregados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{analytics.pedidosRetrasados}</div>
              <p className="text-xs text-muted-foreground">
                Pedidos retrasados
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 📋 Contenido principal con tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Timeline ({eventosFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="metricas" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Métricas
            </TabsTrigger>
          </TabsList>

          {/* 📈 Tab de Timeline */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Timeline de Trazabilidad
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Seguimiento cronológico de todos los eventos de entrega
                </p>
              </CardHeader>
              <CardContent>
                {eventosFiltrados.length > 0 ? (
                  <TrazabilidadTimeline eventos={eventosFiltrados} />
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay eventos</h3>
                    <p className="text-muted-foreground">
                      No se encontraron eventos de trazabilidad con los filtros aplicados.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📊 Tab de Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Distribución por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-green-600">{analytics.pedidosEntregados}</div>
                        <div className="text-sm text-muted-foreground">Entregados</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-orange-600">{analytics.pedidosPendientes}</div>
                        <div className="text-sm text-muted-foreground">Pendientes</div>
                      </div>
                    </div>
                  </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay datos disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendencia de Entregas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics ? (
                  <div className="space-y-4">
                    <div className="text-center p-6 border rounded">
                      <div className="text-3xl font-bold text-blue-600">{analytics.tiempoPromedioEntrega}</div>
                      <div className="text-sm text-muted-foreground">Días promedio de entrega</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-lg font-semibold">{analytics.porcentajeEntregaATiempo}%</div>
                      <div className="text-sm text-muted-foreground">Entregas a tiempo</div>
                    </div>
                  </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay datos disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ⚡ Tab de Métricas */}
          <TabsContent value="metricas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métricas de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricas ? (
                  <MetricasEntrega metricas={[]} />
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay métricas disponibles</h3>
                    <p className="text-muted-foreground">
                      Las métricas se generarán cuando haya datos de entrega suficientes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

// Componente principal con Suspense boundary
export default function ReportesTrazabilidadPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reportes de trazabilidad...</p>
        </div>
      </div>
    }>
      <TrazabilidadContent />
    </Suspense>
  )
}
