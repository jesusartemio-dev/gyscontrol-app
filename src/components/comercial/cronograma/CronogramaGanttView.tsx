'use client'

/**
 * CronogramaGanttView - Vista de Gantt simplificada
 * Muestra el cronograma en formato de diagrama de Gantt
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, AlertCircle, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react'

interface CronogramaGanttViewProps {
  cotizacionId: string
  refreshKey?: number
}

interface GanttItem {
  id: string
  nombre: string
  tipo: 'cotizacion' | 'proyecto' | 'fase' | 'edt' | 'zona' | 'actividad' | 'tarea'
  fechaInicio: Date | null
  fechaFin: Date | null
  progreso: number
  estado: string
  nivel: number
  children?: any[]
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
}

function GanttNode({
  node,
  level,
  expandedNodes,
  onToggle,
  minDate,
  maxDate,
  getTipoColor,
  getEstadoColor
}: GanttNodeProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)

  // Obtener fechas del nodo según su tipo
  let fechaInicio: string | undefined
  let fechaFin: string | undefined

  if (node.type === 'cotizacion' || node.type === 'proyecto') {
    fechaInicio = node.data?.fechaInicioComercial || node.data?.fechaInicio
    fechaFin = node.data?.fechaFinComercial || node.data?.fechaFin
  } else if (node.type === 'fase') {
    fechaInicio = node.data?.fechaInicioPlan || node.data?.fechaInicioComercial || node.data?.fechaInicio
    fechaFin = node.data?.fechaFinPlan || node.data?.fechaFinComercial || node.data?.fechaFin
  } else {
    fechaInicio = node.data?.fechaInicioComercial || node.data?.fechaInicio
    fechaFin = node.data?.fechaFinComercial || node.data?.fechaFin
  }

  if (!fechaInicio || !fechaFin) return null

  const fechaInicioDate = new Date(fechaInicio)
  const fechaFinDate = new Date(fechaFin)

  if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime())) return null

  const startOffset = ((fechaInicioDate.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100
  const duration = ((fechaFinDate.getTime() - fechaInicioDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100
  const progreso = node.metadata?.progressPercentage || 0
  const estado = node.metadata?.status || 'pendiente'
  const duracionDias = Math.max(1, Math.ceil((fechaFinDate.getTime() - fechaInicioDate.getTime()) / (1000 * 60 * 60 * 24)))
  const estadoColor = getEstadoColor(estado)

  // Level-based styling
  const levelStyles = [
    { bg: 'bg-indigo-50/80', border: 'border-l-indigo-500' },
    { bg: 'bg-blue-50/60', border: 'border-l-blue-400' },
    { bg: 'bg-emerald-50/50', border: 'border-l-emerald-400' },
    { bg: 'bg-amber-50/40', border: 'border-l-amber-300' },
    { bg: 'bg-gray-50/30', border: 'border-l-gray-300' },
  ]
  const style = levelStyles[Math.min(level, levelStyles.length - 1)]

  return (
    <>
      <div className={`flex items-center gap-3 py-2 px-3 border-b border-gray-100 hover:bg-gray-50/50 border-l-4 ${style.bg} ${style.border}`}>
        {/* Expand/collapse */}
        <div className="w-6 flex justify-center flex-shrink-0">
          {hasChildren && (
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onToggle(node.id)}>
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>

        {/* Element info */}
        <div className="w-48 flex items-center gap-1.5 flex-shrink-0" style={{ paddingLeft: `${level * 12}px` }}>
          <Badge className={`text-[10px] px-1.5 py-0 ${getTipoColor(node.type)}`}>
            {node.type}
          </Badge>
          <span className={`truncate ${level === 0 ? 'font-semibold text-xs' : 'text-xs'}`} title={node.nombre}>
            {node.nombre}
          </span>
        </div>

        {/* Timeline bar */}
        <div className="flex-1 relative h-6 bg-gray-100 rounded">
          <div
            className="absolute h-full rounded shadow-sm flex items-center justify-center text-[10px] font-medium text-white"
            style={{
              left: `${Math.max(0, startOffset)}%`,
              width: `${Math.max(2, duration)}%`,
              backgroundColor: estadoColor,
              minWidth: '60px'
            }}
          >
            <span className="px-1.5 truncate">
              {duracionDias}d{node.data?.horasEstimadas ? ` · ${node.data.horasEstimadas}h` : ''}
            </span>
          </div>

          {/* Progress overlay */}
          {progreso > 0 && (
            <div
              className="absolute h-full rounded-l bg-white/30"
              style={{
                left: `${Math.max(0, startOffset)}%`,
                width: `${Math.max(2, duration) * (progreso / 100)}%`
              }}
            />
          )}
        </div>

        {/* Progress */}
        <div className="w-16 flex items-center gap-1.5 flex-shrink-0">
          <div className="w-8 bg-gray-200 rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progreso}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground w-7">{progreso}%</span>
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

      // First, load entity data (cotización or proyecto)
      let entityData: any = null
      let entityType: 'cotizacion' | 'proyecto' = 'cotizacion'
      let apiPath = 'cotizaciones'

      // Try proyecto API first
      const proyectoResponse = await fetch(`/api/proyectos/${cotizacionId}`)
      if (proyectoResponse.ok) {
        const proyectoJson = await proyectoResponse.json()
        entityData = proyectoJson.data
        entityType = 'proyecto'
        apiPath = 'proyectos'
      } else {
        // Fallback to cotización API
        const cotizacionResponse = await fetch(`/api/cotizacion/${cotizacionId}`)
        if (cotizacionResponse.ok) {
          const cotizacionJson = await cotizacionResponse.json()
          entityData = cotizacionJson.data
          entityType = 'cotizacion'
          apiPath = 'cotizaciones'
        }
      }

      // Load tree data
      const response = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/tree`)

      if (!response.ok) {
        // Try alternate API if first one fails
        const altResponse = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree`)
        if (!altResponse.ok) {
          throw new Error('Error cargando datos del cronograma')
        }
        const altData = await altResponse.json()
        const processedTree = processTreeWithRoot(altData.data.tree, entityData, entityType)
        setTreeData(processedTree)

        // Auto-expand levels 0 and 1
        const expandLevelsAlt = (nodes: any[], maxLevel: number = 1): Set<string> => {
          const expanded = new Set<string>()
          const traverse = (nodeList: any[]) => {
            for (const node of nodeList) {
              if (node.level <= maxLevel) {
                expanded.add(node.id)
                if (node.children && node.children.length > 0) {
                  traverse(node.children)
                }
              }
            }
          }
          traverse(nodes)
          return expanded
        }
        setExpandedNodes(expandLevelsAlt(processedTree, 1))
        return
      }

      const data = await response.json()
      const processedTree = processTreeWithRoot(data.data.tree, entityData, entityType)
      setTreeData(processedTree)

      // Auto-expand levels 0 and 1
      const expandLevels = (nodes: any[], maxLevel: number = 1): Set<string> => {
        const expanded = new Set<string>()
        const traverse = (nodeList: any[]) => {
          for (const node of nodeList) {
            if (node.level <= maxLevel) {
              expanded.add(node.id)
              if (node.children && node.children.length > 0) {
                traverse(node.children)
              }
            }
          }
        }
        traverse(nodes)
        return expanded
      }
      setExpandedNodes(expandLevels(processedTree, 1))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Process tree and add root node at level 0
  const processTreeWithRoot = (tree: any[], entityData: any, entityType: 'cotizacion' | 'proyecto'): any[] => {
    if (!tree || tree.length === 0) return []

    const adjustLevels = (nodes: any[]): any[] => {
      return nodes.map(node => ({
        ...node,
        level: (node.level || 0) + 1,
        children: node.children ? adjustLevels(node.children) : []
      }))
    }

    const adjustedChildren = adjustLevels(tree)

    const collectDates = (nodes: any[]): { starts: Date[], ends: Date[] } => {
      const starts: Date[] = []
      const ends: Date[] = []

      for (const node of nodes) {
        const fechaInicio = node.type === 'fase'
          ? node.data?.fechaInicioPlan || node.data?.fechaInicioComercial || node.data?.fechaInicio
          : node.data?.fechaInicioComercial || node.data?.fechaInicio

        const fechaFin = node.type === 'fase'
          ? node.data?.fechaFinPlan || node.data?.fechaFinComercial || node.data?.fechaFin
          : node.data?.fechaFinComercial || node.data?.fechaFin

        if (fechaInicio) {
          const date = new Date(fechaInicio)
          if (!isNaN(date.getTime())) starts.push(date)
        }
        if (fechaFin) {
          const date = new Date(fechaFin)
          if (!isNaN(date.getTime())) ends.push(date)
        }

        if (node.children?.length > 0) {
          const childDates = collectDates(node.children)
          starts.push(...childDates.starts)
          ends.push(...childDates.ends)
        }
      }

      return { starts, ends }
    }

    const allDates = collectDates(tree)

    let rootFechaInicio: Date | null = null
    let rootFechaFin: Date | null = null

    if (allDates.starts.length > 0) {
      rootFechaInicio = new Date(Math.min(...allDates.starts.map(d => d.getTime())))
    } else if (entityData?.fechaInicio) {
      rootFechaInicio = new Date(entityData.fechaInicio)
    }

    if (allDates.ends.length > 0) {
      rootFechaFin = new Date(Math.max(...allDates.ends.map(d => d.getTime())))
    } else if (entityData?.fechaFin) {
      rootFechaFin = new Date(entityData.fechaFin)
    }

    const rootNode = {
      id: entityData?.id || 'root',
      nombre: entityData?.nombre || (entityType === 'proyecto' ? 'Proyecto' : 'Cotización'),
      type: entityType,
      level: 0,
      data: {
        fechaInicio: rootFechaInicio?.toISOString(),
        fechaFin: rootFechaFin?.toISOString(),
        fechaInicioComercial: rootFechaInicio?.toISOString(),
        fechaFinComercial: rootFechaFin?.toISOString()
      },
      metadata: {
        progressPercentage: entityData?.progresoGeneral || 0,
        status: entityData?.estado || 'en_progreso'
      },
      children: adjustedChildren
    }

    return [rootNode]
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
      case 'cotizacion': return 'bg-indigo-500/20 text-indigo-700 border-indigo-500'
      case 'proyecto': return 'bg-indigo-500/20 text-indigo-700 border-indigo-500'
      case 'fase': return 'bg-blue-500/20 text-blue-700 border-blue-500'
      case 'edt': return 'bg-emerald-500/20 text-emerald-700 border-emerald-500'
      case 'zona': return 'bg-amber-500/20 text-amber-700 border-amber-500'
      case 'actividad': return 'bg-purple-500/20 text-purple-700 border-purple-500'
      case 'tarea': return 'bg-gray-500/20 text-gray-700 border-gray-500'
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500'
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada':
      case 'completed': return '#10b981'
      case 'en_progreso':
      case 'in_progress': return '#3b82f6'
      case 'pendiente':
      case 'pending': return '#6b7280'
      case 'pausada':
      case 'paused': return '#f97316'
      case 'cancelada':
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <Card className="border-indigo-100">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Cargando Gantt...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
          <p className="text-sm text-red-600 text-center mb-3">{error}</p>
          <Button onClick={loadGanttData} variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
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
      let fechaInicio: string | undefined
      let fechaFin: string | undefined

      if (node.type === 'cotizacion' || node.type === 'proyecto') {
        fechaInicio = node.data?.fechaInicioComercial || node.data?.fechaInicio
        fechaFin = node.data?.fechaFinComercial || node.data?.fechaFin
      } else if (node.type === 'fase') {
        fechaInicio = node.data?.fechaInicioPlan || node.data?.fechaInicioComercial || node.data?.fechaInicio
        fechaFin = node.data?.fechaFinPlan || node.data?.fechaFinComercial || node.data?.fechaFin
      } else {
        fechaInicio = node.data?.fechaInicioComercial || node.data?.fechaInicio
        fechaFin = node.data?.fechaFinComercial || node.data?.fechaFin
      }

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
      <Card className="border-indigo-100">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">Sin elementos programados</p>
            <p className="text-xs mb-3">Añade fechas a las tareas para verlas en el Gantt</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Actualizar
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
    <Card className="border-indigo-100">
      <CardContent className="p-0">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-normal">
              {allItemsWithDates.length} elementos
            </Badge>
            <span className="text-xs text-muted-foreground">
              {projectMinDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} → {projectMaxDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </span>
          </div>
          <Select value={timelineGranularity} onValueChange={(v: 'dias' | 'semanas' | 'meses') => setTimelineGranularity(v)}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dias">Días</SelectItem>
              <SelectItem value="semanas">Semanas</SelectItem>
              <SelectItem value="meses">Meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline scale */}
        <div className="relative h-6 bg-gray-100 border-b overflow-hidden">
          {timelineScale.map((tick, index) => (
            <div
              key={index}
              className="absolute top-0 h-full border-r border-gray-200 flex items-center"
              style={{ left: `${tick.position}%` }}
            >
              <span className="px-1.5 text-[10px] font-medium text-gray-600">{tick.label}</span>
            </div>
          ))}
        </div>

        {/* Gantt items */}
        <div className="max-h-[400px] overflow-y-auto">
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
            />
          ))}
        </div>

        {/* Compact Legend */}
        <div className="flex items-center gap-3 px-3 py-2 border-t bg-gray-50/50 text-[10px]">
          <span className="text-muted-foreground">Tipos:</span>
          <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded bg-blue-500"></div><span>Fase</span></div>
          <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded bg-emerald-500"></div><span>EDT</span></div>
          <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded bg-purple-500"></div><span>Actividad</span></div>
          <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded bg-gray-500"></div><span>Tarea</span></div>
        </div>
      </CardContent>
    </Card>
  )
}