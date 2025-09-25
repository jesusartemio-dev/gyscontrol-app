'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Star, Building2, Loader2, Award, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { getClientes } from '@/lib/services/cliente'

interface Cliente {
  id: string
  nombre: string
  ruc?: string
  sector?: string
  tamanoEmpresa?: string
  frecuenciaCompra?: string
  estadoRelacion?: string
  calificacion?: number
  potencialAnual?: number
  ultimoProyecto?: string
}

interface ClienteMetrics {
  cliente: Cliente
  metricas: {
    totalProyectos: number
    valorTotal: number
    ultimoProyecto: string | null
    frecuenciaPromedio: number
    satisfaccion: number
  }
}

export default function ClientesReportPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteMetrics, setClienteMetrics] = useState<ClienteMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load client metrics from API
        const response = await fetch('/api/crm/reportes/clientes')
        if (!response.ok) {
          throw new Error('Error al cargar datos de clientes')
        }
        const data = await response.json()

        // Transform API data to match component interface
        const metricsData: ClienteMetrics[] = data.clientes.map((clienteData: any) => ({
          cliente: clienteData.cliente,
          metricas: clienteData.metricas
        }))

        setClienteMetrics(metricsData)
      } catch (error) {
        console.error('Error loading client report data:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getEstadoBadgeVariant = (estado?: string) => {
    switch (estado) {
      case 'cliente_activo': return 'default'
      case 'prospecto': return 'secondary'
      case 'cliente_inactivo': return 'outline'
      default: return 'outline'
    }
  }

  const getEstadoLabel = (estado?: string) => {
    switch (estado) {
      case 'cliente_activo': return 'Cliente Activo'
      case 'prospecto': return 'Prospecto'
      case 'cliente_inactivo': return 'Inactivo'
      default: return 'Sin Estado'
    }
  }

  const getSatisfaccionColor = (satisfaccion: number) => {
    if (satisfaccion >= 80) return 'text-green-600'
    if (satisfaccion >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTopClients = (metric: keyof typeof clienteMetrics[0]['metricas']) => {
    return clienteMetrics
      .sort((a, b) => (b.metricas[metric] as number) - (a.metricas[metric] as number))
      .slice(0, 5)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando reporte de clientes...</p>
          </div>
        </div>
      </div>
    )
  }

  const totalClientes = clienteMetrics.length
  const clientesActivos = clienteMetrics.filter(c => c.cliente.estadoRelacion === 'cliente_activo').length
  const valorTotalCartera = clienteMetrics.reduce((sum, c) => sum + c.metricas.valorTotal, 0)
  const satisfaccionPromedio = clienteMetrics.length > 0 ?
    clienteMetrics.reduce((sum, c) => sum + c.metricas.satisfaccion, 0) / clienteMetrics.length : 0

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
          <div className="p-2 bg-orange-100 rounded-lg">
            <Users className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reporte de Clientes</h1>
            <p className="text-gray-600 mt-1">Análisis de clientes, historial y satisfacción</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              {clientesActivos} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Cartera</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(valorTotalCartera)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total de contratos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfacción Promedio</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{satisfaccionPromedio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Calificación promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frecuencia Promedio</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {clienteMetrics.length > 0 ?
                (clienteMetrics.reduce((sum, c) => sum + c.metricas.frecuenciaPromedio, 0) / clienteMetrics.length).toFixed(1) : 0} meses
            </div>
            <p className="text-xs text-muted-foreground">
              Entre proyectos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients by Different Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top by Valor Total */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Top Clientes por Valor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTopClients('valorTotal').map((metric, index) => (
                <div key={metric.cliente.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {metric.cliente.nombre.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{metric.cliente.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {metric.metricas.totalProyectos} proyectos • {formatCurrency(metric.metricas.valorTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top by Satisfacción */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Top Clientes por Satisfacción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clienteMetrics
                .sort((a, b) => b.metricas.satisfaccion - a.metricas.satisfaccion)
                .slice(0, 5)
                .map((metric, index) => (
                <div key={metric.cliente.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {metric.cliente.nombre.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{metric.cliente.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Satisfacción: {metric.metricas.satisfaccion}% • {metric.metricas.satisfaccion}/5 ⭐
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Client List */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado de Clientes</CardTitle>
          <CardDescription>
            Métricas individuales de rendimiento y satisfacción por cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {clienteMetrics.map((metric) => (
              <motion.div
                key={metric.cliente.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {metric.cliente.nombre.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{metric.cliente.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getEstadoBadgeVariant(metric.cliente.estadoRelacion) as any}>
                          {getEstadoLabel(metric.cliente.estadoRelacion)}
                        </Badge>
                        {metric.cliente.sector && (
                          <Badge variant="outline">{metric.cliente.sector}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getSatisfaccionColor(metric.metricas.satisfaccion)}`}>
                      {metric.metricas.satisfaccion}%
                    </div>
                    <div className="text-xs text-muted-foreground">Satisfacción</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{metric.metricas.totalProyectos}</div>
                    <div className="text-xs text-muted-foreground">Proyectos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{formatCurrency(metric.metricas.valorTotal)}</div>
                    <div className="text-xs text-muted-foreground">Valor Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{metric.metricas.frecuenciaPromedio.toFixed(1)} meses</div>
                    <div className="text-xs text-muted-foreground">Frecuencia</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-600">{metric.metricas.satisfaccion}/5 ⭐</div>
                    <div className="text-xs text-muted-foreground">Calificación</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Último proyecto: {metric.metricas.ultimoProyecto ? formatDate(metric.metricas.ultimoProyecto) : 'N/A'}</span>
                    <span>Potencial: {metric.cliente.potencialAnual ? formatCurrency(metric.cliente.potencialAnual) : 'N/A'}</span>
                  </div>
                  <Progress value={metric.metricas.satisfaccion} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    Nivel de satisfacción del cliente
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