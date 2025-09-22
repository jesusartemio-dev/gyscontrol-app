'use client'

/**
 * 📊 CronogramaMetrics - Dashboard de métricas del cronograma comercial
 *
 * Componente que muestra métricas calculadas en tiempo real del cronograma.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Target,
  PieChart
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MetricData {
  totalEdts: number
  totalTareas: number
  totalHorasEstimadas: number
  responsablesUnicos: number
  edtsPorPrioridad: Record<string, number>
  edtsPorEstado: Record<string, number>
  tareasPorPrioridad: Record<string, number>
  tareasPorEstado: Record<string, number>
  progresoPromedio: number
  edtsCompletados: number
  tareasCompletadas: number
  fechaMasTemprana: string | null
  fechaMasTardia: string | null
}

interface CronogramaMetricsProps {
  cotizacionId: string
  refreshKey: number
}

export function CronogramaMetrics({
  cotizacionId,
  refreshKey
}: CronogramaMetricsProps) {
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Load and calculate metrics
  useEffect(() => {
    loadMetrics()
  }, [cotizacionId, refreshKey])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma`)

      if (!response.ok) {
        throw new Error('Error al cargar datos del cronograma')
      }

      const result = await response.json()
      const edts = result.data || []

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(edts)
      setMetrics(calculatedMetrics)
    } catch (error) {
      console.error('Error loading metrics:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las métricas.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (edts: any[]): MetricData => {
    const totalEdts = edts.length
    let totalTareas = 0
    let totalHorasEstimadas = 0
    const responsablesSet = new Set<string>()
    const edtsPorPrioridad: Record<string, number> = {}
    const edtsPorEstado: Record<string, number> = {}
    const tareasPorPrioridad: Record<string, number> = {}
    const tareasPorEstado: Record<string, number> = {}

    let fechaMasTemprana: string | null = null
    let fechaMasTardia: string | null = null
    let edtsCompletados = 0
    let tareasCompletadas = 0

    edts.forEach(edt => {
      // EDT metrics
      totalHorasEstimadas += edt.horasEstimadas || 0
      if (edt.responsableId) responsablesSet.add(edt.responsableId)

      // Priority and status counts
      edtsPorPrioridad[edt.prioridad] = (edtsPorPrioridad[edt.prioridad] || 0) + 1
      edtsPorEstado[edt.estado || 'planificado'] = (edtsPorEstado[edt.estado || 'planificado'] || 0) + 1

      // Date tracking
      if (edt.fechaInicioComercial && (!fechaMasTemprana || edt.fechaInicioComercial < fechaMasTemprana)) {
        fechaMasTemprana = edt.fechaInicioComercial
      }
      if (edt.fechaFinComercial && (!fechaMasTardia || edt.fechaFinComercial > fechaMasTardia)) {
        fechaMasTardia = edt.fechaFinComercial
      }

      // Task metrics
      if (edt.tareas) {
        totalTareas += edt.tareas.length
        edt.tareas.forEach((tarea: any) => {
          totalHorasEstimadas += tarea.horasEstimadas || 0
          if (tarea.responsableId) responsablesSet.add(tarea.responsableId)

          tareasPorPrioridad[tarea.prioridad] = (tareasPorPrioridad[tarea.prioridad] || 0) + 1
          tareasPorEstado[tarea.estado || 'pendiente'] = (tareasPorEstado[tarea.estado || 'pendiente'] || 0) + 1

          if (tarea.estado === 'completado') tareasCompletadas++
        })
      }

      if (edt.estado === 'completado') edtsCompletados++
    })

    const progresoPromedio = totalEdts > 0 ? (edtsCompletados / totalEdts) * 100 : 0

    return {
      totalEdts,
      totalTareas,
      totalHorasEstimadas,
      responsablesUnicos: responsablesSet.size,
      edtsPorPrioridad,
      edtsPorEstado,
      tareasPorPrioridad,
      tareasPorEstado,
      progresoPromedio,
      edtsCompletados,
      tareasCompletadas,
      fechaMasTemprana,
      fechaMasTardia
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No hay datos</h3>
        <p className="text-muted-foreground">
          No se pudieron calcular las métricas del cronograma.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total EDTs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEdts}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.edtsCompletados} completados
            </p>
            {metrics.totalEdts > 0 && (
              <Progress
                value={(metrics.edtsCompletados / metrics.totalEdts) * 100}
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tareas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTareas}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.tareasCompletadas} completadas
            </p>
            {metrics.totalTareas > 0 && (
              <Progress
                value={(metrics.tareasCompletadas / metrics.totalTareas) * 100}
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Estimadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalHorasEstimadas}h</div>
            <p className="text-xs text-muted-foreground">
              Tiempo total planificado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responsables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responsablesUnicos}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios asignados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribución por Prioridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">EDTs por Prioridad</h4>
              <div className="space-y-2">
                {Object.entries(metrics.edtsPorPrioridad).map(([prioridad, count]) => (
                  <div key={prioridad} className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">
                      {prioridad}
                    </Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {metrics.totalTareas > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tareas por Prioridad</h4>
                <div className="space-y-2">
                  {Object.entries(metrics.tareasPorPrioridad).map(([prioridad, count]) => (
                    <div key={prioridad} className="flex items-center justify-between">
                      <Badge variant="secondary" className="capitalize">
                        {prioridad}
                      </Badge>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estado del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Progreso General</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">EDTs Completados</span>
                  <span className="text-sm font-medium">
                    {metrics.edtsCompletados}/{metrics.totalEdts}
                  </span>
                </div>
                <Progress value={metrics.progresoPromedio} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {metrics.progresoPromedio.toFixed(1)}% completado
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Estado de EDTs</h4>
              <div className="space-y-2">
                {Object.entries(metrics.edtsPorEstado).map(([estado, count]) => (
                  <div key={estado} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {estado === 'completado' && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {estado === 'en_progreso' && <Clock className="h-3 w-3 text-blue-500" />}
                      {estado === 'planificado' && <Calendar className="h-3 w-3 text-gray-500" />}
                      {estado === 'detenido' && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                      <span className="text-sm capitalize">{estado.replace('_', ' ')}</span>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {metrics.fechaMasTemprana && metrics.fechaMasTardia && (
              <div>
                <h4 className="text-sm font-medium mb-2">Cronograma</h4>
                <div className="text-sm text-muted-foreground">
                  <p>Inicio: {new Date(metrics.fechaMasTemprana).toLocaleDateString('es-ES')}</p>
                  <p>Fin: {new Date(metrics.fechaMasTardia).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}