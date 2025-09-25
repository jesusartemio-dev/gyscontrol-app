'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Target,
  TrendingUp,
  Activity,
  Calendar,
  DollarSign,
  Percent,
  Phone,
  Mail,
  Users,
  CheckCircle,
  Clock,
  BarChart3,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils/plantilla-utils'

interface Usuario {
  id: string
  name: string | null
  email: string
  role: string
}

interface MetricasData {
  totales: {
    cotizacionesGeneradas: number
    cotizacionesAprobadas: number
    proyectosCerrados: number
    valorTotalVendido: number
    margenTotalObtenido: number
    tiempoPromedioCierre: number
    tasaConversion: number
    valorPromedioProyecto: number
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
  rendimiento: {
    eficiencia: number
    productividad: number
    conversionProyectos: number
  }
}

interface Oportunidad {
  id: string
  nombre: string
  estado: string
  valorEstimado: number | null
  createdAt: string
  cliente: {
    nombre: string
    codigo: string
  }
}

interface Actividad {
  id: string
  tipo: string
  descripcion: string
  fecha: string
  resultado: string | null
  oportunidad: {
    nombre: string
    cliente?: { nombre: string }
  }
}

interface MetricasUsuarioProps {
  usuarioId: string
  usuario?: Usuario
}

export default function MetricasUsuario({ usuarioId, usuario }: MetricasUsuarioProps) {
  const [metricasData, setMetricasData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodoTipo, setPeriodoTipo] = useState('mensual')

  useEffect(() => {
    loadMetricas()
  }, [usuarioId, periodoTipo])

  const loadMetricas = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/crm/metricas/${usuarioId}?tipo=${periodoTipo}`)
      if (!response.ok) {
        throw new Error('Error al cargar métricas del usuario')
      }

      const data = await response.json()
      setMetricasData(data)
    } catch (err) {
      console.error('Error loading metricas:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar métricas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando métricas del usuario...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={loadMetricas} variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  if (!metricasData) return null

  const { usuario: userData, periodo, metricas, oportunidades, actividades, historialMetricas } = metricasData

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
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Métricas de {userData.name || userData.email}
            </h1>
            <p className="text-gray-600 mt-1">
              Rendimiento comercial detallado - {periodo.tipo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodoTipo} onValueChange={setPeriodoTipo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadMetricas} variant="outline" size="sm">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Información del período */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Período: {new Date(periodo.fechaInicio).toLocaleDateString('es-ES')} - {new Date(periodo.fechaFin).toLocaleDateString('es-ES')}
              </span>
            </div>
            <Badge variant="outline">
              {periodo.tipo.charAt(0).toUpperCase() + periodo.tipo.slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotizaciones Generadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totales.cotizacionesGeneradas}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.totales.cotizacionesAprobadas} aprobadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Vendido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metricas.totales.valorTotalVendido)}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.totales.proyectosCerrados} proyectos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.promedios.tasaConversion.toFixed(1)}%</div>
            <Progress value={metricas.promedios.tasaConversion} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productividad</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.rendimiento.productividad}</div>
            <p className="text-xs text-muted-foreground">
              actividades realizadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento Detallado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Rendimiento por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Eficiencia</span>
                <span>{metricas.rendimiento.eficiencia.toFixed(1)}%</span>
              </div>
              <Progress value={metricas.rendimiento.eficiencia} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Conversión a Proyectos</span>
                <span>{metricas.rendimiento.conversionProyectos.toFixed(1)}%</span>
              </div>
              <Progress value={metricas.rendimiento.conversionProyectos} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-blue-600">
                    {metricas.totales.llamadasRealizadas}
                  </div>
                  <div className="text-xs text-muted-foreground">Llamadas</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {metricas.totales.reunionesAgendadas}
                  </div>
                  <div className="text-xs text-muted-foreground">Reuniones</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-600">
                    {metricas.totales.emailsEnviados}
                  </div>
                  <div className="text-xs text-muted-foreground">Emails</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Oportunidades Activas
            </CardTitle>
            <CardDescription>
              {oportunidades.total} oportunidades en total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {oportunidades.lista.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay oportunidades activas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {oportunidades.lista.map((opp: Oportunidad) => (
                  <div key={opp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{opp.nombre}</h4>
                      <p className="text-xs text-muted-foreground">
                        {opp.cliente.nombre} • {formatCurrency(opp.valorEstimado || 0)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {opp.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividades Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Actividades Recientes
          </CardTitle>
          <CardDescription>
            Últimas actividades realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {actividades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividades recientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actividades.map((act: Actividad) => (
                <div key={act.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{act.tipo}</span>
                      {act.resultado && (
                        <Badge variant="outline" className="text-xs">
                          {act.resultado}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{act.descripcion}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(act.fecha).toLocaleDateString('es-ES')}</span>
                      {act.oportunidad.cliente && (
                        <span>{act.oportunidad.cliente.nombre}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}