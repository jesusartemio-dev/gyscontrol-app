'use client'

/**
 * DashboardProductividad - Métricas y analytics de productividad personal
 * 
 * Dashboard que muestra:
 * - Horas por semana/mes
 * - Eficiencia por proyecto
 * - Comparativas con objetivos
 * - Tendencias de productividad
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardProductividadProps {
  userId?: string
  periodo: 'semanal' | 'mensual'
  onRefresh?: () => void
}

interface MetricasProductividad {
  horasTotales: number
  horasPlanificadas: number
  eficiencia: number
  diasTrabajados: number
  proyectosActivos: number
  cumplimientoObjetivo: number
  tendenciaSemanal: number
  horasPorProyecto: { nombre: string; horas: number }[]
  distribucionTiempo: { nombre: string; horas: number; color: string }[]
  comparativaHistorica: { periodo: string; horas: number; objetivo: number }[]
  alertas: {
    tipo: 'bajo_rendimiento' | 'horas_exceso' | 'objetivo_pendiente'
    mensaje: string
    severidad: 'baja' | 'media' | 'alta'
  }[]
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export function DashboardProductividad({
  userId = 'current',
  periodo = 'mensual',
  onRefresh
}: DashboardProductividadProps) {
  const [metricas, setMetricas] = useState<MetricasProductividad | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodo)
  const [fechaLimite, setFechaLimite] = useState(new Date())
  const { toast } = useToast()

  useEffect(() => {
    loadProductividad()
  }, [periodoSeleccionado, fechaLimite])

  const loadProductividad = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(
        `/api/horas-hombre/productividad?userId=${userId}&periodo=${periodoSeleccionado}&fechaLimite=${format(fechaLimite, 'yyyy-MM-dd')}`
      )
      
      if (!response.ok) throw new Error('Error al cargar productividad')
      
      const data = await response.json()
      setMetricas(data.data)
    } catch (error) {
      console.error('Error cargando productividad:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las métricas de productividad',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const cambiarPeriodo = (nuevoPeriodo: 'semanal' | 'mensual') => {
    setPeriodoSeleccionado(nuevoPeriodo)
    if (nuevoPeriodo === 'semanal') {
      setFechaLimite(startOfWeek(new Date(), { weekStartsOn: 1 }))
    } else {
      setFechaLimite(startOfMonth(new Date()))
    }
  }

  const formatearEficiencia = (eficiencia: number) => {
    if (eficiencia >= 100) return { texto: 'Excelente', color: 'text-green-600', bg: 'bg-green-50' }
    if (eficiencia >= 80) return { texto: 'Buena', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (eficiencia >= 60) return { texto: 'Regular', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { texto: 'Baja', color: 'text-red-600', bg: 'bg-red-50' }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Cargando dashboard de productividad...</span>
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
            <p className="text-lg text-gray-600">No hay datos de productividad disponibles</p>
            <Button onClick={loadProductividad} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const eficienciaFormateada = formatearEficiencia(metricas.eficiencia)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard de Productividad</h2>
          <p className="text-gray-600">Análisis personal de rendimiento y eficiencia</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodoSeleccionado} onValueChange={(value) => cambiarPeriodo(value as 'semanal' | 'mensual')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadProductividad}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Horas Totales</p>
                <p className="text-2xl font-bold">{metricas.horasTotales}h</p>
                <p className="text-xs text-gray-500">{metricas.horasPlanificadas}h planificadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Eficiencia</p>
                <p className={`text-2xl font-bold ${eficienciaFormateada.color}`}>
                  {metricas.eficiencia.toFixed(1)}%
                </p>
                <Badge variant="outline" className={`text-xs ${eficienciaFormateada.bg}`}>
                  {eficienciaFormateada.texto}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Días Trabajados</p>
                <p className="text-2xl font-bold">{metricas.diasTrabajados}</p>
                <p className="text-xs text-gray-500">de 20 días</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Proyectos Activos</p>
                <p className="text-2xl font-bold">{metricas.proyectosActivos}</p>
                <p className="text-xs text-gray-500">
                  {metricas.tendenciaSemanal >= 0 ? '+' : ''}{metricas.tendenciaSemanal}% vs semana anterior
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horas por proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribución por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricas.horasPorProyecto}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nombre" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="horas" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparativa histórica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendencia vs Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metricas.comparativaHistorica}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="horas" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Horas Reales"
                />
                <Line 
                  type="monotone" 
                  dataKey="objetivo" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Objetivo"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de tiempo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribución de Tiempo por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metricas.distribucionTiempo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.nombre} ${(entry.percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="horas"
                >
                  {metricas.distribucionTiempo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {metricas.distribucionTiempo.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.nombre}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.horas}h</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de rendimiento */}
      {metricas.alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alertas de Rendimiento
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
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      alerta.severidad === 'alta' 
                        ? 'text-red-600' 
                        : alerta.severidad === 'media'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`} />
                    <span className="font-medium text-sm">{alerta.mensaje}</span>
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

export default DashboardProductividad