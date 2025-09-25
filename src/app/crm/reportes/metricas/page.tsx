'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, TrendingUp, BarChart3, Activity, Users, Target, Loader2, Calendar, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MetricasData {
  periodo: string
  totales: {
    cotizacionesGeneradas: number
    cotizacionesAprobadas: number
    proyectosCerrados: number
    valorTotalVendido: number
    margenTotalObtenido: number
    llamadasRealizadas: number
    reunionesAgendadas: number
    propuestasEnviadas: number
    emailsEnviados: number
  }
  promedios: {
    tiempoPromedioCierre: number
    tasaConversion: number
    valorPromedioProyecto: number
  }
  tendencias: Array<{
    periodo: string
    cotizaciones: number
    proyectos: number
    valor: number
    conversion: number
  }>
}

export default function MetricasReportPage() {
  const [metricasData, setMetricasData] = useState<MetricasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load metrics data from API
        const response = await fetch('/api/crm/reportes/metricas?periodo=2024-Q4')
        if (!response.ok) {
          throw new Error('Error al cargar datos de métricas')
        }
        const data = await response.json()

        setMetricasData(data)
      } catch (error) {
        console.error('Error loading metrics data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num)
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-3 w-3 text-green-600" />
    if (current < previous) return <ArrowDown className="h-3 w-3 text-red-600" />
    return null
  }

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600'
    if (current < previous) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando métricas detalladas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!metricasData) return null

  const currentPeriod = metricasData.tendencias[metricasData.tendencias.length - 1]
  const previousPeriod = metricasData.tendencias[metricasData.tendencias.length - 2]

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <PieChart className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Métricas Detalladas</h1>
            <p className="text-gray-600 mt-1">KPIs y métricas comerciales avanzadas</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Calendar className="h-3 w-3 mr-1" />
          {metricasData.periodo}
        </Badge>
      </div>

      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumen">Resumen Ejecutivo</TabsTrigger>
          <TabsTrigger value="conversion">Conversión</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
        </TabsList>

        {/* Resumen Ejecutivo */}
        <TabsContent value="resumen" className="space-y-6">
          {/* KPIs Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metricasData.promedios.tasaConversion.toFixed(1)}%
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(metricasData.promedios.tasaConversion, previousPeriod?.conversion || 0)}
                  <span className={`ml-1 ${getTrendColor(metricasData.promedios.tasaConversion, previousPeriod?.conversion || 0)}`}>
                    vs mes anterior
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Promedio Proyecto</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(metricasData.promedios.valorPromedioProyecto)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(metricasData.promedios.valorPromedioProyecto, previousPeriod?.valor / previousPeriod?.proyectos || 0)}
                  <span className={`ml-1 ${getTrendColor(metricasData.promedios.valorPromedioProyecto, previousPeriod?.valor / previousPeriod?.proyectos || 0)}`}>
                    vs mes anterior
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Promedio Cierre</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {metricasData.promedios.tiempoPromedioCierre} días
                </div>
                <p className="text-xs text-muted-foreground">
                  Desde cotización a cierre
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {((metricasData.totales.margenTotalObtenido / metricasData.totales.valorTotalVendido) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Margen sobre ventas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Embudo de Conversión</CardTitle>
              <CardDescription>
                Tasa de conversión en cada etapa del proceso comercial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cotizaciones Generadas</span>
                  <span className="text-sm">{metricasData.totales.cotizacionesGeneradas}</span>
                </div>
                <Progress value={100} className="h-3" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cotizaciones Aprobadas</span>
                  <span className="text-sm">{metricasData.totales.cotizacionesAprobadas}</span>
                </div>
                <Progress
                  value={(metricasData.totales.cotizacionesAprobadas / metricasData.totales.cotizacionesGeneradas) * 100}
                  className="h-3"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {((metricasData.totales.cotizacionesAprobadas / metricasData.totales.cotizacionesGeneradas) * 100).toFixed(1)}% de conversión
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Proyectos Cerrados</span>
                  <span className="text-sm">{metricasData.totales.proyectosCerrados}</span>
                </div>
                <Progress
                  value={(metricasData.totales.proyectosCerrados / metricasData.totales.cotizacionesGeneradas) * 100}
                  className="h-3"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {((metricasData.totales.proyectosCerrados / metricasData.totales.cotizacionesGeneradas) * 100).toFixed(1)}% de conversión final
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversión */}
        <TabsContent value="conversion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Conversión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                  <span className="text-sm">Cotizaciones → Aprobadas</span>
                  <span className="font-medium">
                    {((metricasData.totales.cotizacionesAprobadas / metricasData.totales.cotizacionesGeneradas) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                  <span className="text-sm">Aprobadas → Proyectos</span>
                  <span className="font-medium">
                    {((metricasData.totales.proyectosCerrados / metricasData.totales.cotizacionesAprobadas) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm font-medium">Conversión Total</span>
                  <span className="font-bold text-green-600">
                    {metricasData.promedios.tasaConversion.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valor por Etapa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                  <span className="text-sm">Valor Total Pipeline</span>
                  <span className="font-medium">{formatCurrency(metricasData.totales.valorTotalVendido)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                  <span className="text-sm">Valor Promedio Proyecto</span>
                  <span className="font-medium">{formatCurrency(metricasData.promedios.valorPromedioProyecto)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm font-medium">Margen Total</span>
                  <span className="font-bold text-green-600">{formatCurrency(metricasData.totales.margenTotalObtenido)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Actividad */}
        <TabsContent value="actividad" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Llamadas Realizadas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(metricasData.totales.llamadasRealizadas)}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(metricasData.totales.llamadasRealizadas / metricasData.totales.cotizacionesGeneradas)} por cotización
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reuniones Agendadas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricasData.totales.reunionesAgendadas}</div>
                <p className="text-xs text-muted-foreground">
                  {(metricasData.totales.reunionesAgendadas / metricasData.totales.cotizacionesGeneradas * 100).toFixed(1)}% de cotizaciones
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Propuestas Enviadas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricasData.totales.propuestasEnviadas}</div>
                <p className="text-xs text-muted-foreground">
                  {((metricasData.totales.propuestasEnviadas / metricasData.totales.cotizacionesGeneradas) * 100).toFixed(1)}% de conversión
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Enviados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(metricasData.totales.emailsEnviados)}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(metricasData.totales.emailsEnviados / metricasData.totales.cotizacionesGeneradas)} por cotización
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tendencias */}
        <TabsContent value="tendencias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolución Mensual</CardTitle>
              <CardDescription>
                Tendencias de rendimiento en los últimos 4 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metricasData.tendencias.map((periodo, index) => (
                  <div key={periodo.periodo} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{periodo.periodo}</h4>
                      <Badge variant="outline">{periodo.conversion.toFixed(1)}% conversión</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Cotizaciones:</span>
                        <span className="font-medium ml-1">{periodo.cotizaciones}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Proyectos:</span>
                        <span className="font-medium ml-1">{periodo.proyectos}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-medium ml-1">{formatCurrency(periodo.valor)}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={periodo.conversion} className="h-2" />
                      <div className="text-xs text-muted-foreground text-center mt-1">
                        Tasa de conversión
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}