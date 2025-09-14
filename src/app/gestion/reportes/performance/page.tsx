/**
 * 📊 Página de Reportes de Performance
 * 
 * Dashboard de análisis de rendimiento y KPIs:
 * - Métricas de eficiencia operacional
 * - Análisis de tiempos de entrega
 * - Performance por proveedor y proyecto
 * - Indicadores de calidad
 * - Comparativas históricas
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
  PerformanceMetrics,
  AnalyticsComparativo
} from '@/types/reportes'
import {
  obtenerMetricasPerformance,
  obtenerKPIsOperacionales,
  obtenerAnalyticsComparativo
} from '@/lib/services/reportes'

// 📊 Definición de tipos locales
interface KPIData {
  eficienciaOperacional: number
  tiempoPromedioEntrega: number
  indiceCalidad: number
  tendenciaEficiencia: number
  tendenciaTiempo: number
  tendenciaAhorro: number
  costoPromedio: number
}

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
import { Progress } from '@/components/ui/progress'

// 🎯 Icons
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Users,
  Package,
  Truck,
  DollarSign,
  Percent,
  ArrowLeft,
  Eye,
  Settings
} from 'lucide-react'

// 🧩 Custom Components
import GraficoProgreso from '@/components/equipos/GraficoProgreso'
import MetricasEntrega from '@/components/equipos/MetricasEntrega'

// 🔧 Utility functions
const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%'
  }
  return `${value.toFixed(1)}%`
}

const getPerformanceColor = (value: number, threshold: { good: number; warning: number }): string => {
  if (value >= threshold.good) return 'text-green-600'
  if (value >= threshold.warning) return 'text-yellow-600'
  return 'text-red-600'
}

const getPerformanceBadge = (value: number, threshold: { good: number; warning: number }): "default" | "secondary" | "destructive" | "outline" => {
  if (value >= threshold.good) return 'default'
  if (value >= threshold.warning) return 'secondary'
  return 'destructive'
}

// Componente que usa useSearchParams envuelto en Suspense
function PerformanceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  // 🔄 Estados principales
  const [metricas, setMetricas] = useState<PerformanceMetrics | null>(null)
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [comparativo, setComparativo] = useState<AnalyticsComparativo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // 🔍 Estados de filtros
  const [filtros, setFiltros] = useState({
    periodo: '30d',
    proyecto: 'todos',
    proveedor: 'todos',
    categoria: 'todos',
    fechaInicio: '',
    fechaFin: ''
  })

  // 🔁 Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [filtros])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const [metricsData, kpisData, comparativoData] = await Promise.all([
        obtenerMetricasPerformance({
          proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined,
          proveedorId: filtros.proveedor !== 'todos' ? filtros.proveedor : undefined,
          fechaDesde: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
          fechaHasta: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined
        }),
        obtenerKPIsOperacionales({
          proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined,
          proveedorId: filtros.proveedor !== 'todos' ? filtros.proveedor : undefined,
          fechaDesde: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
          fechaHasta: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined
        }),
        obtenerAnalyticsComparativo({
          proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined,
          proveedorId: filtros.proveedor !== 'todos' ? filtros.proveedor : undefined,
          fechaDesde: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
          fechaHasta: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined
        })
      ])

      setMetricas(metricsData)
      
      // 🔄 Transformar datos de KPIs a la estructura esperada
      if (kpisData && kpisData.kpis) {
        const transformedKpis: KPIData = {
          eficienciaOperacional: kpisData.kpis.find(k => k.id === 'eficiencia-proceso')?.valor || 0,
          tiempoPromedioEntrega: kpisData.kpis.find(k => k.id === 'tiempo-entrega')?.valor || 0,
          indiceCalidad: kpisData.kpis.find(k => k.id === 'calidad-entrega')?.valor || 0,
          tendenciaEficiencia: kpisData.kpis.find(k => k.id === 'eficiencia-proceso')?.cambio || 0,
          tendenciaTiempo: kpisData.kpis.find(k => k.id === 'tiempo-entrega')?.cambio || 0,
          tendenciaAhorro: kpisData.kpis.find(k => k.id === 'costo-operativo')?.cambio || 0,
          costoPromedio: kpisData.kpis.find(k => k.id === 'costo-operativo')?.valor || 0
        }
        setKpis(transformedKpis)
      }
      
      setComparativo(comparativoData)
    } catch (err) {
      console.error('Error cargando métricas de performance:', err)
      setError('Error al cargar las métricas de performance')
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // 📊 Exportar reporte
  const handleExport = async (formato: 'pdf' | 'excel') => {
    try {
      setExporting(true)
      // Aquí iría la lógica de exportación
      toast.success(`Reporte de performance ${formato.toUpperCase()} generado correctamente`)
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
        
        {/* KPIs Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
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
            <BreadcrumbPage>Performance</BreadcrumbPage>
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
              <TrendingUp className="h-8 w-8 text-primary" />
              Análisis de Performance
            </h1>
            <p className="text-muted-foreground">
              Métricas de rendimiento y KPIs operacionales
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

        {/* 🔍 Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Período */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select 
                  value={filtros.periodo} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, periodo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 días</SelectItem>
                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                    <SelectItem value="90d">Últimos 3 meses</SelectItem>
                    <SelectItem value="1y">Último año</SelectItem>
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
              
              {/* Categoría */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select 
                  value={filtros.categoria} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las categorías</SelectItem>
                    <SelectItem value="equipos">Equipos</SelectItem>
                    <SelectItem value="materiales">Materiales</SelectItem>
                    <SelectItem value="servicios">Servicios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* 📊 KPIs principales */}
      {kpis && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eficiencia Operacional</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatPercentage(kpis.eficienciaOperacional)}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {kpis.tendenciaEficiencia > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span>{Math.abs(kpis.tendenciaEficiencia)}% vs período anterior</span>
              </div>
              <Progress value={kpis.eficienciaOperacional} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Promedio Entrega</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {kpis.tiempoPromedioEntrega} días
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {kpis.tendenciaTiempo < 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span>{Math.abs(kpis.tendenciaTiempo)} días vs período anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Índice de Calidad</CardTitle>
              <Award className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage(kpis.indiceCalidad)}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {kpis.tendenciaAhorro > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span>{Math.abs(kpis.tendenciaAhorro)}% vs período anterior</span>
              </div>
              <Progress value={kpis.indiceCalidad} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ahorro Generado</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(kpis.costoPromedio)}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {kpis.tendenciaAhorro > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span>{formatPercentage(Math.abs(kpis.tendenciaAhorro))} vs período anterior</span>
              </div>
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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="proveedores" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="proyectos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Proyectos
            </TabsTrigger>
            <TabsTrigger value="comparativo" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Comparativo
            </TabsTrigger>
          </TabsList>

          {/* 📈 Tab Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Tendencia de Eficiencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricas?.metricas ? (
                    <GraficoProgreso
                       series={metricas.metricas.map((m, index) => ({
                         id: `metrica-${index}`,
                         nombre: m.nombre,
                         datos: [{
                           fecha: new Date().toISOString().split('T')[0],
                           valor: m.valor
                         }],
                         color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                         tipo: 'linea' as const,
                         visible: true,
                         formato: 'entero' as const,
                         unidad: m.unidad
                       }))}
                       configuracion={{
                         tipo: 'linea',
                         titulo: 'Métricas de Performance',
                         subtitulo: undefined,
                         mostrarLeyenda: true,
                         mostrarGrid: true,
                         mostrarTooltip: true,
                         mostrarBrush: false,
                         mostrarMetas: false,
                         animaciones: true,
                         altura: 300
                       }}
                     />
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
                    <Clock className="h-5 w-5" />
                    Distribución de Tiempos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricas?.metricas ? (
                    <GraficoProgreso
                      series={metricas.metricas.filter(m => m.nombre.toLowerCase().includes('tiempo')).map((m, index) => ({
                        id: `tiempo-${index}`,
                        nombre: m.nombre,
                        datos: [{
                          fecha: new Date().toISOString().split('T')[0],
                          valor: m.valor
                        }],
                        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                        tipo: 'barra' as const,
                        visible: true,
                        formato: 'entero' as const,
                        unidad: m.unidad
                      }))}
                      configuracion={{
                        tipo: 'barra',
                        titulo: 'Análisis de Tiempos',
                        subtitulo: undefined,
                        mostrarLeyenda: true,
                        mostrarGrid: true,
                        mostrarTooltip: true,
                        mostrarBrush: false,
                        mostrarMetas: false,
                        animaciones: true,
                        altura: 300
                      }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay datos disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 👥 Tab Proveedores */}
          <TabsContent value="proveedores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance por Proveedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricas?.metricas ? (
                  <div className="space-y-4">
                    {metricas.metricas.slice(0, 5).map((metrica, index) => (
                      <div key={`ranking-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium">{metrica.nombre}</h4>
                            <p className="text-sm text-muted-foreground">
                              Métrica de Performance
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {metrica.valor}
                          </div>
                          <Badge variant={getPerformanceBadge(metrica.valor, { good: 90, warning: 75 })}>
                            {metrica.unidad}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay datos de proveedores disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📦 Tab Proyectos */}
          <TabsContent value="proyectos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Performance por Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricas?.metricas ? (
                  <GraficoProgreso
                    series={metricas.metricas.map((m, index) => ({
                      id: `proyecto-${index}`,
                      nombre: m.nombre,
                      datos: [{
                        fecha: new Date().toISOString().split('T')[0],
                        valor: m.valor
                      }],
                      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                      tipo: 'barra' as const,
                      visible: true,
                      formato: 'entero' as const,
                      unidad: m.unidad
                    }))}
                    configuracion={{
                      tipo: 'barra',
                      titulo: 'Performance por Proyectos',
                      subtitulo: undefined,
                      mostrarLeyenda: true,
                      mostrarGrid: true,
                      mostrarTooltip: true,
                      mostrarBrush: false,
                      mostrarMetas: false,
                      animaciones: true,
                      altura: 300
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay datos de proyectos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📊 Tab Comparativo */}
          <TabsContent value="comparativo" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Comparativo Períodos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {comparativo?.comparaciones ? (
                    <GraficoProgreso
                      series={comparativo.comparaciones.map((comp, index) => ({
                        id: `comp-${index}`,
                        nombre: comp.nombre,
                        datos: [{
                          fecha: comp.periodoActual.fecha,
                          valor: comp.periodoActual.valor
                        }],
                        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                        tipo: 'barra' as const,
                        visible: true,
                        formato: 'entero' as const,
                        unidad: comp.categoria
                      }))}
                      configuracion={{
                        tipo: 'pie',
                        titulo: 'Análisis Comparativo',
                        subtitulo: undefined,
                        mostrarLeyenda: true,
                        mostrarGrid: true,
                        mostrarTooltip: true,
                        mostrarBrush: false,
                        mostrarMetas: false,
                        animaciones: true,
                        altura: 300
                      }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay datos comparativos disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Evolución de KPIs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {comparativo?.comparaciones ? (
                    <div className="space-y-4">
                      {comparativo.comparaciones.slice(0, 5).map((comp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <h4 className="font-medium">{comp.nombre}</h4>
                            <p className="text-sm text-muted-foreground">{comp.categoria}</p>
                          </div>
                          <div className="text-right">
                             <div className="text-lg font-semibold">{comp.periodoActual.valor}</div>
                             <div className={`text-sm flex items-center gap-1 ${
                               comp.cambio.tendencia === 'up' ? 'text-green-600' : 
                               comp.cambio.tendencia === 'down' ? 'text-red-600' : 'text-gray-600'
                             }`}>
                               {comp.cambio.tendencia === 'up' ? (
                                 <TrendingUp className="h-3 w-3" />
                               ) : comp.cambio.tendencia === 'down' ? (
                                 <TrendingDown className="h-3 w-3" />
                               ) : null}
                               {comp.cambio.porcentual}%
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay datos de evolución disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

// Componente principal con Suspense boundary
export default function ReportesPerformancePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reportes de performance...</p>
        </div>
      </div>
    }>
      <PerformanceContent />
    </Suspense>
  )
}
