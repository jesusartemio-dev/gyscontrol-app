'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Users, Target, DollarSign, Activity, Clock, Award, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getUsuarios, Usuario } from '@/lib/services/usuario'

interface MetricasUsuario {
  usuarioId: string
  usuario: Usuario
  metaMensual: number | null
  metaTrimestral: number | null
  metricas: {
    cotizacionesGeneradas: number
    cotizacionesAprobadas: number
    proyectosCerrados: number
    valorTotalVendido: number
    margenTotalObtenido: number
    tiempoPromedioCierre?: number
    tasaConversion?: number
    valorPromedioProyecto?: number
    llamadasRealizadas: number
    reunionesAgendadas: number
    propuestasEnviadas: number
    emailsEnviados: number
  }
}

export default function RendimientoReportPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [metricas, setMetricas] = useState<MetricasUsuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load rendimiento data from API
        const response = await fetch('/api/crm/reportes/rendimiento')
        if (!response.ok) {
          throw new Error('Error al cargar datos de rendimiento')
        }
        const data = await response.json()

        // Transform API data to match component interface
        const metricasData: MetricasUsuario[] = data.comerciales.map((comercial: any) => ({
          usuarioId: comercial.usuarioId,
          usuario: comercial.usuario,
          metaMensual: comercial.metaMensual,
          metaTrimestral: comercial.metaTrimestral,
          metricas: comercial.metricas
        }))

        setMetricas(metricasData)
      } catch (error) {
        console.error('Error loading rendimiento data:', error)
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

  const getPerformanceColor = (value: number, thresholds: { good: number; medium: number }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.medium) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTopPerformer = (metric: keyof typeof metricas[0]['metricas']) => {
    return metricas.reduce((prev, current) => {
      const prevValue = typeof prev.metricas[metric] === 'number' ? prev.metricas[metric] as number : 0
      const currentValue = typeof current.metricas[metric] === 'number' ? current.metricas[metric] as number : 0
      return currentValue > prevValue ? current : prev
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando reporte de rendimiento...</p>
          </div>
        </div>
      </div>
    )
  }

  const totalCotizaciones = metricas.reduce((sum, m) => sum + m.metricas.cotizacionesGeneradas, 0)
  const totalValorVendido = metricas.reduce((sum, m) => sum + m.metricas.valorTotalVendido, 0)
  const totalProyectos = metricas.reduce((sum, m) => sum + m.metricas.proyectosCerrados, 0)
  const avgConversion = metricas.length > 0 ?
    metricas.reduce((sum, m) => sum + (m.metricas.tasaConversion || 0), 0) / metricas.length : 0

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
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reporte de Rendimiento</h1>
            <p className="text-gray-600 mt-1">Métricas de rendimiento por comercial</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cotizaciones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(totalCotizaciones)}</div>
            <p className="text-xs text-muted-foreground">Generadas este período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Vendido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValorVendido)}</div>
            <p className="text-xs text-muted-foreground">En proyectos cerrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos Cerrados</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatNumber(totalProyectos)}</div>
            <p className="text-xs text-muted-foreground">Éxitos comerciales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Conversión Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{avgConversion.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Cotizaciones → Proyectos</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Mayor Valor Vendido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const topSeller = getTopPerformer('valorTotalVendido')
              return (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-yellow-100 text-yellow-600">
                      {topSeller.usuario.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topSeller.usuario.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(topSeller.metricas.valorTotalVendido)}
                    </p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Más Cotizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const topGenerator = getTopPerformer('cotizacionesGeneradas')
              return (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {topGenerator.usuario.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topGenerator.usuario.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {topGenerator.metricas.cotizacionesGeneradas} cotizaciones
                    </p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Más Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const mostActive = getTopPerformer('llamadasRealizadas')
              return (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-100 text-green-600">
                      {mostActive.usuario.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{mostActive.usuario.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {mostActive.metricas.llamadasRealizadas} llamadas
                    </p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento Detallado por Comercial</CardTitle>
          <CardDescription>
            Métricas individuales de cada miembro del equipo comercial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {metricas.map((metrica, index) => (
              <motion.div
                key={metrica.usuarioId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {metrica.usuario.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{metrica.usuario.name}</h3>
                      <p className="text-sm text-muted-foreground">{metrica.usuario.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {metrica.metricas.tasaConversion?.toFixed(1)}% conversión
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(metrica.metricas.cotizacionesGeneradas, { good: 15, medium: 8 })}`}>
                      {metrica.metricas.cotizacionesGeneradas}
                    </div>
                    <div className="text-xs text-muted-foreground">Cotizaciones</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(metrica.metricas.proyectosCerrados, { good: 5, medium: 2 })}`}>
                      {metrica.metricas.proyectosCerrados}
                    </div>
                    <div className="text-xs text-muted-foreground">Proyectos</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(metrica.metricas.valorTotalVendido / 1000, { good: 300, medium: 150 })}`}>
                      {formatCurrency(metrica.metricas.valorTotalVendido).replace('$', '')}
                    </div>
                    <div className="text-xs text-muted-foreground">Valor Vendido</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getPerformanceColor(metrica.metricas.llamadasRealizadas, { good: 150, medium: 75 })}`}>
                      {metrica.metricas.llamadasRealizadas}
                    </div>
                    <div className="text-xs text-muted-foreground">Llamadas</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso vs. Objetivo</span>
                    <span>{((metrica.metricas.proyectosCerrados / 10) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(metrica.metricas.proyectosCerrados / 10) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    {metrica.metricas.proyectosCerrados} de 10 proyectos objetivo
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}