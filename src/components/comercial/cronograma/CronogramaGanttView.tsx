'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react'

interface CronogramaGanttViewProps {
  cotizacionId: string
  refreshKey?: number
}

interface GanttItem {
  id: string
  nombre: string
  tipo: 'fase' | 'edt' | 'zona' | 'actividad' | 'tarea'
  fechaInicio: Date | null
  fechaFin: Date | null
  progreso: number
  estado: string
  nivel: number
}

interface GanttNodeProps {
  node: any
  level: number
  expandedNodes: Set<string>
  onToggle: (nodeId: string) => void
  minDate: Date
  maxDate: Date
  getTipoColor: (tipo: string) => string
  getEstadoColor: (estado: string) => string
  getEstadoTextColor: (estado: string) => string
}

function GanttNode({
  node,
  level,
  expandedNodes,
  onToggle,
  minDate,
  maxDate,
  getTipoColor,
  getEstadoColor,
  getEstadoTextColor
}: GanttNodeProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)

  // Obtener fechas del nodo
  const fechaInicio = node.type === 'fase'
    ? node.data?.fechaInicioPlan || node.data?.fechaInicioComercial || node.data?.fechaInicio
    : node.data?.fechaInicioComercial || node.data?.fechaInicio

  const fechaFin = node.type === 'fase'
    ? node.data?.fechaFinPlan || node.data?.fechaFinComercial || node.data?.fechaFin
    : node.data?.fechaFinComercial || node.data?.fechaFin

  const hasDates = fechaInicio && fechaFin

  if (!hasDates) {
    return null // No mostrar nodos sin fechas
  }

  const fechaInicioDate = new Date(fechaInicio)
  const fechaFinDate = new Date(fechaFin)

  const startOffset = ((fechaInicioDate.getTime() - minDate.getTime()) /
                      (maxDate.getTime() - minDate.getTime())) * 100
  const duration = ((fechaFinDate.getTime() - fechaInicioDate.getTime()) /
                   (maxDate.getTime() - minDate.getTime())) * 100

  const progreso = node.metadata?.progressPercentage || 0
  const estado = node.metadata?.status || 'pendiente'

  return (
    <>
      <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
        {/* Expand/collapse button */}
        <div className="w-8 flex justify-center">
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onToggle(node.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Element info with indentation */}
        <div className="flex-1 flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
          <Badge className={getTipoColor(node.type)}>
            {node.type}
          </Badge>
          <span className="font-medium truncate" title={node.nombre}>
            {node.nombre}
          </span>
        </div>

        {/* Timeline bar */}
        <div className="flex-1 relative h-8 bg-gray-100 rounded border">
          <div
            className={`absolute h-full rounded shadow-sm border flex items-center justify-center text-xs font-medium ${getEstadoTextColor(estado)}`}
            style={{
              left: `${Math.max(0, startOffset)}%`,
              width: `${Math.max(3, duration)}%`,
              backgroundColor: getEstadoColor(estado),
              minWidth: '80px',
              borderColor: getEstadoColor(estado),
              borderWidth: '2px'
            }}
          >
            <div className="px-2 truncate font-semibold">
              {node.nombre}
            </div>
          </div>

          {/* Progress overlay */}
          {progreso > 0 && (
            <div
              className="absolute h-full rounded-l opacity-40 bg-white border-r-2 border-gray-300"
              style={{
                left: `${Math.max(0, startOffset)}%`,
                width: `${Math.max(3, duration) * (progreso / 100)}%`,
                borderRightColor: getEstadoColor(estado)
              }}
            />
          )}
        </div>

        {/* Progress info */}
        <div className="w-20 text-center">
          <div className="text-sm font-medium">{progreso}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && node.children.map((child: any) => (
        <GanttNode
          key={child.id}
          node={child}
          level={level + 1}
          expandedNodes={expandedNodes}
          onToggle={onToggle}
          minDate={minDate}
          maxDate={maxDate}
          getTipoColor={getTipoColor}
          getEstadoColor={getEstadoColor}
          getEstadoTextColor={getEstadoTextColor}
        />
      ))}
    </>
  )
}

export function CronogramaGanttView({ cotizacionId, refreshKey }: CronogramaGanttViewProps) {
  const [treeData, setTreeData] = useState<any[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))
  const [timelineGranularity, setTimelineGranularity] = useState<'dias' | 'semanas' | 'meses'>('meses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGanttData()
  }, [cotizacionId, refreshKey])

  const loadGanttData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree`)

      if (!response.ok) {
        throw new Error('Error cargando datos del cronograma')
      }

      const data = await response.json()
      setTreeData(data.data.tree)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'fase': return 'bg-blue-100 text-blue-800'
      case 'edt': return 'bg-green-100 text-green-800'
      case 'zona': return 'bg-yellow-100 text-yellow-800'
      case 'actividad': return 'bg-purple-100 text-purple-800'
      case 'tarea': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada':
      case 'completed': return '#10b981' // green-500
      case 'en_progreso':
      case 'in_progress': return '#f59e0b' // amber-500
      case 'pendiente':
      case 'pending': return '#6b7280' // gray-500
      case 'pausada':
      case 'paused': return '#f97316' // orange-500
      case 'cancelada':
      case 'cancelled': return '#ef4444' // red-500
      default: return '#6b7280' // gray-500
    }
  }

  const getEstadoTextColor = (estado: string) => {
    switch (estado) {
      case 'completada':
      case 'completed': return 'text-white'
      case 'en_progreso':
      case 'in_progress': return 'text-black'
      case 'pendiente':
      case 'pending': return 'text-white'
      case 'pausada':
      case 'paused': return 'text-white'
      case 'cancelada':
      case 'cancelled': return 'text-white'
      default: return 'text-white'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando diagrama de Gantt...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-600 text-center mb-4">{error}</p>
          <Button onClick={loadGanttData} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Función para obtener todos los elementos con fechas
  const getAllItemsWithDates = (nodes: any[]): GanttItem[] => {
    const items: GanttItem[] = []

    const processNode = (node: any) => {
      const fechaInicio = node.type === 'fase'
        ? node.data?.fechaInicioPlan || node.data?.fechaInicioComercial || node.data?.fechaInicio
        : node.data?.fechaInicioComercial || node.data?.fechaInicio

      const fechaFin = node.type === 'fase'
        ? node.data?.fechaFinPlan || node.data?.fechaFinComercial || node.data?.fechaFin
        : node.data?.fechaFinComercial || node.data?.fechaFin

      if (fechaInicio || fechaFin) {
        items.push({
          id: node.id,
          nombre: node.nombre,
          tipo: node.type,
          fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          progreso: node.metadata?.progressPercentage || 0,
          estado: node.metadata?.status || 'pendiente',
          nivel: node.level
        })
      }

      if (node.children) {
        node.children.forEach(processNode)
      }
    }

    nodes.forEach(processNode)
    return items
  }

  const allItemsWithDates = getAllItemsWithDates(treeData)

  if (allItemsWithDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Diagrama de Gantt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No hay elementos con fechas programadas</p>
            <p className="text-sm">
              Los elementos del cronograma necesitan fechas de inicio y fin para mostrarse en el diagrama de Gantt.
            </p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Actualizar vista
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calcular el rango de fechas para el diagrama según granularidad
  const calculateVisibleDateRange = (items: GanttItem[], granularity: 'dias' | 'semanas' | 'meses') => {
    const allDates = items.flatMap(item => [item.fechaInicio!, item.fechaFin!])
    const projectMinDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const projectMaxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    let visibleMinDate = new Date(projectMinDate)
    let visibleMaxDate = new Date(projectMaxDate)

    if (granularity === 'meses') {
      // Mostrar todo el proyecto con buffer
      visibleMinDate.setDate(visibleMinDate.getDate() - 7)
      visibleMaxDate.setDate(visibleMaxDate.getDate() + 7)
    } else if (granularity === 'semanas') {
      // Mostrar últimos 3 meses del proyecto
      const threeMonthsAgo = new Date(projectMaxDate)
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      visibleMinDate = new Date(Math.max(projectMinDate.getTime(), threeMonthsAgo.getTime()))
      visibleMinDate.setDate(visibleMinDate.getDate() - 3) // Buffer pequeño
      visibleMaxDate.setDate(visibleMaxDate.getDate() + 3)
    } else if (granularity === 'dias') {
      // Mostrar últimos 2 meses del proyecto para mejor distribución
      const twoMonthsAgo = new Date(projectMaxDate)
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      visibleMinDate = new Date(Math.max(projectMinDate.getTime(), twoMonthsAgo.getTime()))
      visibleMinDate.setDate(visibleMinDate.getDate() - 3) // Buffer pequeño
      visibleMaxDate.setDate(visibleMaxDate.getDate() + 3)
    }

    return { minDate: visibleMinDate, maxDate: visibleMaxDate, projectMinDate, projectMaxDate }
  }

  const { minDate, maxDate, projectMinDate, projectMaxDate } = calculateVisibleDateRange(allItemsWithDates, timelineGranularity)

  // Generar escala de tiempo configurable
  const generateTimelineScale = (startDate: Date, endDate: Date, granularity: 'dias' | 'semanas' | 'meses') => {
    const scale: { date: Date; label: string; position: number }[] = []
    const totalDuration = endDate.getTime() - startDate.getTime()

    if (granularity === 'meses') {
      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)

      while (currentDate <= endDate) {
        const position = ((currentDate.getTime() - startDate.getTime()) / totalDuration) * 100
        if (position >= 0 && position <= 100) {
          scale.push({
            date: new Date(currentDate),
            label: currentDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
            position
          })
        }
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    } else if (granularity === 'semanas') {
      // Generar semanas (cada lunes)
      let currentDate = new Date(startDate)
      currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1) // Ir al lunes anterior

      while (currentDate <= endDate) {
        const position = ((currentDate.getTime() - startDate.getTime()) / totalDuration) * 100
        if (position >= 0 && position <= 100) {
          const weekStart = new Date(currentDate)
          const weekEnd = new Date(currentDate)
          weekEnd.setDate(weekEnd.getDate() + 6)

          scale.push({
            date: new Date(currentDate),
            label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
            position
          })
        }
        currentDate.setDate(currentDate.getDate() + 7) // Siguiente semana
      }
    } else if (granularity === 'dias') {
      // Generar días (solo días hábiles o cada pocos días para evitar sobrecarga)
      let currentDate = new Date(startDate)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Si hay muchos días, mostrar cada 7 días para evitar sobrecarga visual
      const step = daysDiff > 60 ? 7 : 1

      for (let i = 0; i <= daysDiff; i += step) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)

        if (date <= endDate) {
          const position = ((date.getTime() - startDate.getTime()) / totalDuration) * 100
          scale.push({
            date: new Date(date),
            label: date.getDate().toString(),
            position
          })
        }
      }
    }

    return scale
  }

  const timelineScale = generateTimelineScale(minDate, maxDate, timelineGranularity)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Diagrama de Gantt
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="granularity" className="text-sm">Escala:</Label>
              <select
                id="granularity"
                value={timelineGranularity}
                onChange={(e) => setTimelineGranularity(e.target.value as 'dias' | 'semanas' | 'meses')}
                className="text-sm border rounded px-2 py-1 bg-white"
              >
                <option value="dias">Días</option>
                <option value="semanas">Semanas</option>
                <option value="meses">Meses</option>
              </select>
            </div>
            <Badge variant="secondary">
              {allItemsWithDates.length} elementos programados
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline header with scale */}
          <div className="space-y-2">
            {/* Timeline scale */}
            <div className="relative h-8 bg-gray-100 rounded-lg border overflow-hidden">
              {timelineScale.map((tick, index) => (
                <div
                  key={index}
                  className="absolute top-0 h-full border-r border-gray-300 flex items-center"
                  style={{ left: `${tick.position}%` }}
                >
                  <div className="px-2 text-xs font-medium text-gray-700 bg-white rounded shadow-sm ml-1">
                    {tick.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline header */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-48 font-medium">Elemento</div>
              <div className="flex-1 text-sm text-gray-600">
                {timelineGranularity === 'meses' && `Proyecto completo: ${projectMinDate.toLocaleDateString('es-ES')} - ${projectMaxDate.toLocaleDateString('es-ES')}`}
                {timelineGranularity === 'semanas' && `Últimos 3 meses: ${minDate.toLocaleDateString('es-ES')} - ${maxDate.toLocaleDateString('es-ES')}`}
                {timelineGranularity === 'dias' && `Últimos 2 meses: ${minDate.toLocaleDateString('es-ES')} - ${maxDate.toLocaleDateString('es-ES')}`}
              </div>
            </div>
          </div>

          {/* Gantt items jerárquicos */}
          <div className="space-y-1">
            {treeData.map((node) => (
              <GanttNode
                key={node.id}
                node={node}
                level={0}
                expandedNodes={expandedNodes}
                onToggle={toggleNodeExpansion}
                minDate={minDate}
                maxDate={maxDate}
                getTipoColor={getTipoColor}
                getEstadoColor={getEstadoColor}
                getEstadoTextColor={getEstadoTextColor}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Leyenda</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Fase</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>EDT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Zona</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>Actividad</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span>Tarea</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}