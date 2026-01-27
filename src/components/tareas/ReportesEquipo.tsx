'use client'

/**
 * ReportesEquipo - Reportes de productividad para gestores y coordinadores
 * 
 * Dashboard que muestra:
 * - Horas por miembro del equipo
 * - Productividad del equipo
 * - Comparativas entre miembros
 * - Alertas de bajo rendimiento
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  UserCheck,
  UserX,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

interface ReportesEquipoProps {
  managerId?: string
  equipoId?: string
  periodo: 'semanal' | 'mensual'
  onRefresh?: () => void
}

interface MiembroEquipo {
  id: string
  nombre: string
  rol: string
  horasTotales: number
  horasPlanificadas: number
  eficiencia: number
  diasTrabajados: number
  proyectosActivos: number
  estado: 'excelente' | 'bueno' | 'regular' | 'bajo'
  alertas: string[]
}

interface MetricasEquipo {
  miembros: MiembroEquipo[]
  horasTotalesEquipo: number
  promedioEficiencia: number
  miembrosActivos: number
  alertas: {
    miembro: string
    tipo: 'bajo_rendimiento' | 'ausencia' | 'horas_exceso'
    mensaje: string
    severidad: 'baja' | 'media' | 'alta'
  }[]
  comparativaEficiencia: {
    nombre: string
    eficiencia: number
    horas: number
    proyectos: number
  }[]
  tendenciaEquipo: {
    periodo: string
    horas: number
    eficiencia: number
  }[]
  capacitacionNecesaria: {
    miembro: string
    area: string
    urgencia: 'baja' | 'media' | 'alta'
  }[]
}

export function ReportesEquipo({
  managerId = 'current',
  equipoId = 'default',
  periodo = 'mensual',
  onRefresh
}: ReportesEquipoProps) {
  const [metricas, setMetricas] = useState<MetricasEquipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodo)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [fechaLimite, setFechaLimite] = useState(new Date())
  const { toast } = useToast()

  useEffect(() => {
    loadReportesEquipo()
  }, [periodoSeleccionado, filtroEstado, fechaLimite])

  const loadReportesEquipo = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(
        `/api/horas-hombre/reportes-equipo?managerId=${managerId}&equipoId=${equipoId}&periodo=${periodoSeleccionado}&filtro=${filtroEstado}&fechaLimite=${format(fechaLimite, 'yyyy-MM-dd')}`
      )
      
      if (!response.ok) throw new Error('Error al cargar reportes del equipo')
      
      const data = await response.json()
      setMetricas(data.data)
    } catch (error) {
      console.error('Error cargando reportes del equipo:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los reportes del equipo',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'excelente':
        return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
      case 'bueno':
        return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
      case 'regular':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
      case 'bajo':
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
    }
  }

  const exportarReporte = async () => {
    try {
      const response = await fetch(
        `/api/horas-hombre/reportes-equipo/exportar?managerId=${managerId}&periodo=${periodoSeleccionado}`,
        { method: 'GET' }
      )
      
      if (!response.ok) throw new Error('Error al exportar reporte')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `reporte-equipo-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Reporte exportado',
        description: 'El reporte se descargó correctamente'
      })
    } catch (error) {
      console.error('Error exportando reporte:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar el reporte',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Cargando reportes del equipo...</span>
        </CardContent>
      </Card>
    )
  }

  if (!metricas) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">No hay datos del equipo disponibles</p>
            <Button onClick={loadReportesEquipo} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes de Equipo</h2>
          <p className="text-gray-600">Análisis de productividad y rendimiento del equipo</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodoSeleccionado} onValueChange={(value) => setPeriodoSeleccionado(value as 'semanal' | 'mensual')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="excelente">Excelente</SelectItem>
              <SelectItem value="bueno">Bueno</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="bajo">Bajo</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportarReporte}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={loadReportesEquipo}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas generales del equipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Miembros Activos</p>
                <p className="text-2xl font-bold">{metricas.miembrosActivos}</p>
                <p className="text-xs text-gray-500">de {metricas.miembros.length} miembros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Horas Totales</p>
                <p className="text-2xl font-bold">{metricas.horasTotalesEquipo}h</p>
                <p className="text-xs text-gray-500">en el período</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Eficiencia Promedio</p>
                <p className="text-2xl font-bold">{metricas.promedioEficiencia.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">del equipo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Alertas Activas</p>
                <p className="text-2xl font-bold">{metricas.alertas.length}</p>
                <p className="text-xs text-gray-500">requieren atención</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparativa de eficiencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Eficiencia por Miembro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricas.comparativaEficiencia} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="nombre" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="eficiencia" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Horas vs Proyectos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Distribución de Carga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={metricas.comparativaEficiencia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="horas" name="Horas" />
                <YAxis dataKey="proyectos" name="Proyectos" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter dataKey="eficiencia" fill="#3B82F6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de miembros del equipo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Estado de Miembros del Equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metricas.miembros.map((miembro) => {
              const estadoColor = getEstadoColor(miembro.estado)
              return (
                <div 
                  key={miembro.id} 
                  className={`p-4 rounded-lg border ${estadoColor.border} ${estadoColor.bg}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="font-medium">{miembro.nombre}</p>
                      <p className="text-sm text-gray-600">{miembro.rol}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{miembro.horasTotales}h</p>
                      <p className="text-xs text-gray-500">{miembro.horasPlanificadas}h plan</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{miembro.eficiencia.toFixed(1)}%</p>
                      <Badge variant="outline" className={`text-xs ${estadoColor.color} ${estadoColor.bg}`}>
                        {miembro.estado}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{miembro.diasTrabajados} días</p>
                      <p className="text-xs text-gray-500">trabajados</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{miembro.proyectosActivos}</p>
                      <p className="text-xs text-gray-500">proyectos</p>
                    </div>
                    <div className="text-center">
                      {miembro.alertas.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {miembro.alertas.length}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-green-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      )}
                    </div>
                  </div>
                  {miembro.alertas.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {miembro.alertas.map((alerta, index) => (
                        <p key={index} className="text-xs text-red-600">• {alerta}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alertas y recomendaciones */}
      {metricas.alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alertas de Gestión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metricas.alertas.map((alerta, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border-l-4 ${
                    alerta.severidad === 'alta' 
                      ? 'bg-red-50 border-red-400' 
                      : alerta.severidad === 'media'
                      ? 'bg-yellow-50 border-yellow-400'
                      : 'bg-blue-50 border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${
                        alerta.severidad === 'alta' 
                          ? 'text-red-600' 
                          : alerta.severidad === 'media'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`} />
                      <span className="font-medium text-sm">{alerta.miembro}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {alerta.tipo.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1">{alerta.mensaje}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capacitación recomendada */}
      {metricas.capacitacionNecesaria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Plan de Capacitación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metricas.capacitacionNecesaria.map((capacitacion, index) => (
                <div 
                  key={index} 
                  className="p-3 rounded-lg border border-blue-200 bg-blue-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{capacitacion.miembro}</p>
                      <p className="text-sm text-blue-700">{capacitacion.area}</p>
                    </div>
                    <Badge 
                      variant={capacitacion.urgencia === 'alta' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {capacitacion.urgencia} urgencia
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ReportesEquipo