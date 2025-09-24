// ===================================================
// 📁 Archivo: ProyectoCronogramaMetrics.tsx
// 📌 Ubicación: src/components/proyectos/cronograma/ProyectoCronogramaMetrics.tsx
// 🔧 Descripción: Componente para mostrar métricas y KPIs del cronograma
// 🎯 Funcionalidades: Dashboard de métricas, progreso, eficiencia y alertas
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  BarChart3,
  Calendar,
  Users,
  Timer,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface ProyectoCronogramaMetricsProps {
  proyectoId: string
  cronogramaId?: string
}

interface MetricasData {
  totalEdts: number
  edtsPlanificados: number
  edtsEnProgreso: number
  edtsCompletados: number
  edtsRetrasados: number
  horasPlanTotal: number
  horasRealesTotal: number
  promedioAvance: number
  eficienciaGeneral: number
  cumplimientoFechas: number
  desviacionPresupuestaria: number
  fechaCalculo: string
}

export function ProyectoCronogramaMetrics({
  proyectoId,
  cronogramaId
}: ProyectoCronogramaMetricsProps) {
  const [metricas, setMetricas] = useState<MetricasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetricas()
  }, [proyectoId, cronogramaId])

  const loadMetricas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/edt/metricas`)

      if (!response.ok) {
        // If API doesn't exist or returns error, show empty state
        console.warn('Métricas API not available or error:', response.status)
        setMetricas(null)
        return
      }

      const data = await response.json()
      if (data.success) {
        setMetricas(data.data)
      } else {
        console.warn('API returned error:', data.error)
        setMetricas(null)
      }
    } catch (error) {
      console.error('Error loading métricas:', error)
      // Don't show error toast, just show empty state
      setMetricas(null)
    } finally {
      setLoading(false)
    }
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatHours = (hours: number | string) => {
    const numHours = typeof hours === 'string' ? parseFloat(hours) : hours
    return `${numHours.toFixed(1)}h`
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 100) return 'text-green-600'
    if (efficiency >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'text-green-600'
    if (progress >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!metricas) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay métricas disponibles
          </h3>
          <p className="text-gray-600 text-center">
            Las métricas se calcularán automáticamente cuando haya EDTs en el proyecto
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Métricas del Cronograma</h2>
          <p className="text-gray-600 mt-1">
            KPIs y indicadores de rendimiento del proyecto
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Actualizado: {new Date(metricas.fechaCalculo).toLocaleDateString('es-ES')}
        </Badge>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total EDTs */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total EDTs</p>
                <p className="text-3xl font-bold text-gray-900">{metricas.totalEdts}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Progreso General */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progreso General</p>
                <p className={`text-3xl font-bold ${getProgressColor(metricas.promedioAvance)}`}>
                  {formatPercentage(metricas.promedioAvance)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4">
              <Progress value={metricas.promedioAvance} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Eficiencia General */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Eficiencia</p>
                <p className={`text-3xl font-bold ${getEfficiencyColor(metricas.eficienciaGeneral)}`}>
                  {formatPercentage(metricas.eficienciaGeneral)}
                </p>
              </div>
              {metricas.eficienciaGeneral >= 100 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cumplimiento de Fechas */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cumplimiento</p>
                <p className={`text-3xl font-bold ${getProgressColor(metricas.cumplimientoFechas)}`}>
                  {formatPercentage(metricas.cumplimientoFechas)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalles por Estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estados de EDTs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Estados de EDTs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Planificados</span>
                </div>
                <span className="font-medium">{metricas.edtsPlanificados}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">En Progreso</span>
                </div>
                <span className="font-medium">{metricas.edtsEnProgreso}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completados</span>
                </div>
                <span className="font-medium">{metricas.edtsCompletados}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Retrasados</span>
                </div>
                <span className="font-medium">{metricas.edtsRetrasados}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Horas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Control de Horas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Horas Planificadas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatHours(metricas.horasPlanTotal)}
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Horas Reales</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatHours(metricas.horasRealesTotal)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Eficiencia por Horas</span>
                <span className={`font-medium ${getEfficiencyColor(metricas.eficienciaGeneral)}`}>
                  {formatPercentage(metricas.eficienciaGeneral)}
                </span>
              </div>
              <Progress value={Math.min(metricas.eficienciaGeneral, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas y Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metricas.edtsRetrasados > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">
                    {metricas.edtsRetrasados} EDT{metricas.edtsRetrasados > 1 ? 's' : ''} retrasado{metricas.edtsRetrasados > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-red-700">
                    Revisar cronograma y reasignar recursos si es necesario
                  </p>
                </div>
              </div>
            )}

            {metricas.eficienciaGeneral < 80 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">
                    Eficiencia por debajo del objetivo
                  </p>
                  <p className="text-sm text-yellow-700">
                    La eficiencia actual es del {formatPercentage(metricas.eficienciaGeneral)}.
                    Considerar optimizar procesos o capacitar al equipo.
                  </p>
                </div>
              </div>
            )}

            {metricas.cumplimientoFechas < 90 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">
                    Cumplimiento de fechas bajo
                  </p>
                  <p className="text-sm text-orange-700">
                    Solo el {formatPercentage(metricas.cumplimientoFechas)} de las tareas se completan a tiempo.
                    Revisar planificación y dependencias.
                  </p>
                </div>
              </div>
            )}

            {metricas.promedioAvance >= 90 && metricas.eficienciaGeneral >= 95 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">
                    ¡Excelente rendimiento!
                  </p>
                  <p className="text-sm text-green-700">
                    El proyecto está funcionando de manera óptima. Continuar con las mejores prácticas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}