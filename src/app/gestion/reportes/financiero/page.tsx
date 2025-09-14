/**
 * 💰 Página de Reportes Financieros
 * 
 * Dashboard de análisis financiero y costos:
 * - Análisis de costos por proyecto y categoría
 * - Seguimiento de presupuestos y desviaciones
 * - ROI y rentabilidad por proveedor
 * - Proyecciones y tendencias financieras
 * - Alertas de sobrecostos
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
  FinancialMetrics,
  CostAnalysis,
  BudgetTracking,
  ROIData
} from '@/types'
import { obtenerMetricasFinancieras, obtenerAnalisisCostos, obtenerSeguimientoPresupuesto, obtenerROIProveedores } from '@/lib/services/reportes'
import type { FiltrosReporte } from '@/types/reportes'

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
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calculator,
  Target,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  CreditCard,
  Wallet,
  Building,
  Percent,
  ArrowLeft,
  Eye,
  Settings,
  FileText,
  Users,
  Package
} from 'lucide-react'

// 🧩 Custom Components
import GraficoProgreso from '@/components/equipos/GraficoProgreso'

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

const getBudgetStatus = (usado: number, total: number): { color: string; variant: "default" | "secondary" | "destructive" | "outline"; status: string } => {
  const porcentaje = (usado / total) * 100
  if (porcentaje >= 100) return { color: 'text-red-600', variant: 'destructive', status: 'Excedido' }
  if (porcentaje >= 90) return { color: 'text-orange-600', variant: 'secondary', status: 'Crítico' }
  if (porcentaje >= 75) return { color: 'text-yellow-600', variant: 'outline', status: 'Alerta' }
  return { color: 'text-green-600', variant: 'default', status: 'Normal' }
}

const getROIColor = (roi: number): string => {
  if (roi >= 20) return 'text-green-600'
  if (roi >= 10) return 'text-blue-600'
  if (roi >= 0) return 'text-yellow-600'
  return 'text-red-600'
}

// Componente que usa useSearchParams envuelto en Suspense
function FinancieroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  // 🔄 Estados principales
  const [metricas, setMetricas] = useState<FinancialMetrics | null>(null)
  const [costos, setCostos] = useState<CostAnalysis | null>(null)
  const [presupuesto, setPresupuesto] = useState<BudgetTracking | null>(null)
  const [roi, setRoi] = useState<ROIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // 🔍 Estados de filtros
  const [filtros, setFiltros] = useState({
    periodo: '30d',
    proyecto: 'todos',
    categoria: 'todos',
    moneda: 'USD',
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

      const filtrosReporte: FiltrosReporte = {
        proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined,
        proveedorId: undefined,
        estadoEntrega: undefined,
        fechaDesde: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
        fechaHasta: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined,
        incluirDetalles: true
      }

      const [metricsData, costosData, presupuestoData, roiData] = await Promise.all([
        obtenerMetricasFinancieras({
          ...filtrosReporte,
          moneda: filtros.moneda as 'USD' | 'PEN',
          incluirProyecciones: true
        }),
        obtenerAnalisisCostos(filtrosReporte),
        obtenerSeguimientoPresupuesto(filtrosReporte.proyectoId),
        obtenerROIProveedores(filtros.periodo) // Usar período por defecto ya que la función espera string
      ])

      setMetricas(metricsData)
      setCostos(costosData)
      setPresupuesto(presupuestoData)
      setRoi(roiData)
    } catch (err) {
      console.error('Error cargando métricas financieras:', err)
      setError('Error al cargar las métricas financieras')
      toast.error('Error al cargar los datos financieros')
    } finally {
      setLoading(false)
    }
  }

  // 📊 Exportar reporte
  const handleExport = async (formato: 'pdf' | 'excel') => {
    try {
      setExporting(true)
      // Aquí iría la lógica de exportación
      toast.success(`Reporte financiero ${formato.toUpperCase()} generado correctamente`)
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
        
        {/* Metrics Skeleton */}
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
            <BreadcrumbPage>Financiero</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 💰 Header con controles */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              Análisis Financiero
            </h1>
            <p className="text-muted-foreground">
              Métricas de costos, presupuestos y rentabilidad
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
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* 🔍 Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros Financieros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              
              {/* Moneda */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Moneda</label>
                <Select 
                  value={filtros.moneda} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, moneda: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                    <SelectItem value="PEN">Soles (PEN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Fecha personalizada */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Inicio</label>
                <Input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* 💰 Métricas financieras principales */}
      {metricas && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(metricas.costos.total, filtros.moneda)}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {(metricas.tendenciaCosto || 0) > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-600" />
                )}
                <span>{formatPercentage(Math.abs(metricas.tendenciaCosto || 0))} vs período anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presupuesto Usado</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatPercentage(metricas.porcentajePresupuesto || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(metricas.presupuestoUsado || 0, filtros.moneda)} de {formatCurrency(metricas.presupuestoTotal || 0, filtros.moneda)}
              </div>
              <Progress value={metricas.porcentajePresupuesto || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getROIColor(metricas.roiPromedio || 0)}`}>
                  {formatPercentage(metricas.roiPromedio || 0)}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {(metricas.tendenciaROI || 0) > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span>{formatPercentage(Math.abs(metricas.tendenciaROI || 0))} vs período anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ahorro Generado</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(metricas.flujo.neto || 0, filtros.moneda)}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {(metricas.tendenciaAhorro || 0) > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span>{formatPercentage(Math.abs(metricas.tendenciaAhorro || 0))} vs período anterior</span>
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
        <Tabs defaultValue="costos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="costos" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Análisis de Costos
            </TabsTrigger>
            <TabsTrigger value="presupuesto" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Presupuesto
            </TabsTrigger>
            <TabsTrigger value="roi" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ROI & Rentabilidad
            </TabsTrigger>
            <TabsTrigger value="proyecciones" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Proyecciones
            </TabsTrigger>
          </TabsList>

          {/* 💰 Tab Análisis de Costos */}
          <TabsContent value="costos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Distribución por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {costos?.categorias ? (
                    <GraficoProgreso
                      series={[
                        {
                          id: 'categorias',
                          nombre: 'Distribución por Categorías',
                          datos: costos.categorias.map(cat => ({
                            fecha: cat.nombre,
                            valor: cat.presupuesto,
                            categoria: cat.nombre
                          })),
                          color: '#3b82f6',
                          tipo: 'barra' as const,
                          visible: true,
                          formato: 'moneda' as const
                        }
                      ]}
                      configuracion={{
                        tipo: 'pie',
                        titulo: 'Distribución por Categorías',
                        mostrarLeyenda: true,
                        mostrarGrid: false,
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
                      <p className="text-muted-foreground">No hay datos de costos disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Evolución de Costos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {costos?.tendencias ? (
                    <GraficoProgreso
                      series={[
                        {
                          id: 'tendencias',
                          nombre: 'Evolución de Costos',
                          datos: costos.tendencias.map(t => ({
                            fecha: t.mes,
                            valor: t.real,
                            categoria: 'Real'
                          })),
                          color: '#ef4444',
                          tipo: 'linea' as const,
                          visible: true,
                          formato: 'moneda' as const
                        },
                        {
                          id: 'presupuesto',
                          nombre: 'Presupuesto',
                          datos: costos.tendencias.map(t => ({
                            fecha: t.mes,
                            valor: t.presupuesto,
                            categoria: 'Presupuesto'
                          })),
                          color: '#3b82f6',
                          tipo: 'linea' as const,
                          visible: true,
                          formato: 'moneda' as const
                        }
                      ]}
                      configuracion={{
                         tipo: 'linea',
                        titulo: 'Evolución de Costos',
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
                      <p className="text-muted-foreground">No hay datos de evolución disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 🎯 Tab Presupuesto */}
          <TabsContent value="presupuesto" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Seguimiento de Presupuesto por Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {presupuesto?.categorias ? (
                  <div className="space-y-4">
                    {presupuesto.categorias.map((categoria) => {
                      const status = getBudgetStatus(categoria.ejecutado, categoria.presupuesto)
                      const porcentaje = categoria.porcentaje
                      
                      return (
                        <div key={categoria.nombre} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{categoria.nombre}</h4>
                              <p className="text-sm text-muted-foreground">Categoría de Presupuesto</p>
                            </div>
                            <Badge variant={status.variant}>{status.status}</Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Gastado: {formatCurrency(categoria.ejecutado, filtros.moneda)}</span>
                              <span>Presupuesto: {formatCurrency(categoria.presupuesto, filtros.moneda)}</span>
                            </div>
                            <Progress value={Math.min(porcentaje, 100)} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{formatPercentage(porcentaje)} utilizado</span>
                              <span>Restante: {formatCurrency(Math.max(0, categoria.presupuesto - categoria.ejecutado), filtros.moneda)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay datos de presupuesto disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📈 Tab ROI & Rentabilidad */}
          <TabsContent value="roi" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    ROI por Proveedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {roi?.proveedores ? (
                    <div className="space-y-3">
                      {roi.proveedores.map((proveedor, index) => (
                        <div key={proveedor.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{proveedor.nombre}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(proveedor.inversion, filtros.moneda)} invertido
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-semibold ${getROIColor(proveedor.roi)}`}>
                              {formatPercentage(proveedor.roi)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(proveedor.retorno, filtros.moneda)} retorno
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay datos de ROI disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Rentabilidad por Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {roi?.proveedores ? (
                    <GraficoProgreso
                      series={[
                        {
                          id: 'roi-proveedores',
                          nombre: 'ROI por Proveedor',
                          datos: roi.proveedores.map(p => ({
                            fecha: p.nombre,
                            valor: p.roi,
                            categoria: p.nombre
                          })),
                          color: '#10b981',
                          tipo: 'barra' as const,
                          visible: true,
                          formato: 'porcentaje' as const
                        }
                      ]}
                      configuracion={{
                        tipo: 'barra',
                        titulo: 'ROI por Proveedor',
                        mostrarLeyenda: false,
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
                      <p className="text-muted-foreground">No hay datos de rentabilidad disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 🔮 Tab Proyecciones */}
          <TabsContent value="proyecciones" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Proyecciones Financieras
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Estimaciones basadas en tendencias históricas y datos actuales
                </p>
              </CardHeader>
              <CardContent>
                {metricas?.flujo ? (
                  <GraficoProgreso
                    series={[
                      {
                        id: 'flujo-proyeccion',
                        nombre: 'Proyección de Flujo',
                        datos: [
                          {
                            fecha: 'Entradas',
                            valor: metricas.flujo.entradas,
                            categoria: 'Entradas'
                          },
                          {
                            fecha: 'Salidas',
                            valor: metricas.flujo.salidas,
                            categoria: 'Salidas'
                          },
                          {
                            fecha: 'Neto',
                            valor: metricas.flujo.neto,
                            categoria: 'Neto'
                          },
                          {
                            fecha: 'Proyección',
                            valor: metricas.flujo.proyeccion,
                            categoria: 'Proyección'
                          }
                        ],
                        color: '#8b5cf6',
                        tipo: 'linea' as const,
                        visible: true,
                        formato: 'moneda' as const
                      }
                    ]}
                    configuracion={{
                      tipo: 'linea',
                      titulo: 'Proyección de Flujo de Caja',
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
                    <h3 className="text-lg font-semibold mb-2">Proyecciones no disponibles</h3>
                    <p className="text-muted-foreground">
                      Se necesitan más datos históricos para generar proyecciones precisas.
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
export default function ReportesFinancieroPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reportes financieros...</p>
        </div>
      </div>
    }>
      <FinancieroContent />
    </Suspense>
  )
}
