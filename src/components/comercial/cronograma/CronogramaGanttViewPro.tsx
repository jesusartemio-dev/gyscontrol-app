'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  BarChart3,
  Target,
  TrendingUp,
  FileDown,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { convertToMSProjectXML, downloadMSProjectXML } from '@/lib/utils/msProjectXmlExport'
import { validarAntesDeExportar, autoCorregirInconsistencias } from '@/lib/validators/cronogramaRules-client'

interface CronogramaGanttViewProProps {
  cotizacionId: string
  cronogramaId?: string
  refreshKey?: number
}

interface GanttTask {
  id: string
  nombre: string
  tipo: 'cotizacion' | 'proyecto' | 'fase' | 'edt' | 'zona' | 'actividad' | 'tarea'
  fechaInicio: Date | null
  fechaFin: Date | null
  progreso: number
  estado: string
  nivel: number
  parentId?: string
  children?: GanttTask[]
  horasEstimadas?: number
  responsable?: string
  descripcion?: string
  color?: string
  dependencies?: string[]
  dependenciaId?: string // Para dependencias entre tareas
}

interface Dependency {
  id: string
  tareaOrigen: GanttTask
  tareaDependiente: GanttTask
  tipo: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lagMinutos: number
}

interface TimelineConfig {
  startDate: Date
  endDate: Date
  unit: 'days' | 'weeks' | 'months'
  unitWidth: number
  totalWidth: number
}

export function CronogramaGanttViewPro({ cotizacionId, cronogramaId, refreshKey }: CronogramaGanttViewProProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<GanttTask[]>([])
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [timeline, setTimeline] = useState<TimelineConfig>({
    startDate: new Date(),
    endDate: new Date(),
    unit: 'weeks',
    unitWidth: 40,
    totalWidth: 0
  })

  // Búsqueda y configuración de vista
  const [searchTerm, setSearchTerm] = useState('')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showDependencies, setShowDependencies] = useState(true)
  const [timeRangeMonths, setTimeRangeMonths] = useState(6) // Meses a mostrar

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarioLaboral, setCalendarioLaboral] = useState<any>(null)
  const { toast } = useToast()

  const timelineRef = useRef<HTMLDivElement>(null)
  const tasksContainerRef = useRef<HTMLDivElement>(null)

  // Constantes para dimensiones - Medium size for compact display
  const ROW_HEIGHT = 44
  const BAR_TOP_OFFSET = 6 // top-1.5
  const BAR_HEIGHT = 20 // h-5 = 20px
  const TASK_COLUMN_WIDTH = 320 // w-80 = 320px

  useEffect(() => {
    loadGanttData()
  }, [cotizacionId, cronogramaId, refreshKey])

  // Optional: Auto-expand tasks that have dependencies (commented out for manual control)
  // useEffect(() => {
  //   if (dependencies.length > 0 && tasks.length > 0) {
  //     const taskIdsWithDependencies = new Set([
  //       ...dependencies.map(dep => dep.tareaOrigen.id),
  //       ...dependencies.map(dep => dep.tareaDependiente.id)
  //     ])

  //     const newExpandedTasks = new Set(expandedTasks)

  //     // Function to expand parents recursively
  //     const expandParents = (taskId: string) => {
  //       const findParent = (tasks: GanttTask[], targetId: string): GanttTask | null => {
  //         for (const task of tasks) {
  //           if (task.id === targetId) return task
  //           if (task.children) {
  //             const found = findParent(task.children, targetId)
  //             if (found) return found
  //           }
  //         }
  //         return null
  //       }

  //       const task = findParent(tasks, taskId)
  //       if (task) {
  //         let currentTask = task
  //         while (currentTask.parentId) {
  //           newExpandedTasks.add(currentTask.parentId)
  //           const parent = findParent(tasks, currentTask.parentId)
  //           if (!parent) break
  //           currentTask = parent
  //         }
  //       } else {
  //         // Try to find by removing the prefix
  //         const cleanId = taskId.replace(/^tarea-/, '')
  //         const taskWithCleanId = findParent(tasks, cleanId)
  //         if (taskWithCleanId) {
  //           let currentTask = taskWithCleanId
  //           while (currentTask.parentId) {
  //             newExpandedTasks.add(currentTask.parentId)
  //             const parent = findParent(tasks, currentTask.parentId)
  //             if (!parent) break
  //             currentTask = parent
  //           }
  //         }
  //       }
  //     }

  //     // Expand all parents of tasks with dependencies
  //     taskIdsWithDependencies.forEach(taskId => {
  //       expandParents(taskId)
  //     })

  //     if (newExpandedTasks.size !== expandedTasks.size) {
  //       setExpandedTasks(newExpandedTasks)
  //     }
  //   }
  // }, [dependencies, tasks, expandedTasks])

  useEffect(() => {
    applyFilters()
  }, [tasks, searchTerm])

  useEffect(() => {
    calculateTimeline()
  }, [filteredTasks, zoomLevel, timeRangeMonths])

  const loadGanttData = async () => {
    try {
      setLoading(true)

      let response;
      let apiPath = 'proyectos';
      let entityData: any = null;
      let entityType: 'proyecto' | 'cotizacion' = 'proyecto';

      const entityResponse = await fetch(`/api/proyectos/${cotizacionId}`)

      if (entityResponse.ok) {
        const entityJson = await entityResponse.json()
        entityData = entityJson.data
        entityType = 'proyecto'
      } else {
        const cotizacionResponse = await fetch(`/api/cotizacion/${cotizacionId}`)
        if (cotizacionResponse.ok) {
          const cotizacionJson = await cotizacionResponse.json()
          entityData = cotizacionJson.data
          apiPath = 'cotizaciones'
          entityType = 'cotizacion'
        }
      }

      if (entityData?.calendarioLaboralId) {
        try {
          const calResponse = await fetch(`/api/configuracion/calendario-laboral/${entityData.calendarioLaboralId}`)
          if (calResponse.ok) {
            const calData = await calResponse.json()
            setCalendarioLaboral(calData.data)
          }
        } catch {
          // Calendar not critical
        }
      }

      const cronogramaParam = cronogramaId ? `?cronogramaId=${cronogramaId}` : ''
      response = await fetch(`/api/proyectos/${cotizacionId}/cronograma/tree${cronogramaParam}`)

      if (!response.ok && response.status === 404) {
        apiPath = 'cotizaciones'
        response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree${cronogramaParam}`)
      }

      if (!response.ok) {
        throw new Error('Error cargando datos del cronograma')
      }
      const data = await response.json()

      const processedChildren = processTreeData(data.data.tree, true)
      let processedTasks: GanttTask[] = processedChildren

      let projectFechaInicio: Date | null = null
      let projectFechaFin: Date | null = null

      const collectDates = (tasks: GanttTask[]): { starts: Date[], ends: Date[] } => {
        const starts: Date[] = []
        const ends: Date[] = []
        for (const task of tasks) {
          if (task.fechaInicio instanceof Date && !isNaN(task.fechaInicio.getTime())) {
            starts.push(task.fechaInicio)
          }
          if (task.fechaFin instanceof Date && !isNaN(task.fechaFin.getTime())) {
            ends.push(task.fechaFin)
          }
          if (task.children?.length) {
            const childDates = collectDates(task.children)
            starts.push(...childDates.starts)
            ends.push(...childDates.ends)
          }
        }
        return { starts, ends }
      }

      const allDates = collectDates(processedChildren)

      if (allDates.starts.length > 0) {
        projectFechaInicio = new Date(Math.min(...allDates.starts.map(d => d.getTime())))
      } else if (entityData?.fechaInicio) {
        projectFechaInicio = new Date(entityData.fechaInicio)
      }

      if (allDates.ends.length > 0) {
        projectFechaFin = new Date(Math.max(...allDates.ends.map(d => d.getTime())))
      } else if (entityData?.fechaFin) {
        projectFechaFin = new Date(entityData.fechaFin)
      }

      const rootNode: GanttTask = {
        id: entityData?.id || cotizacionId,
        nombre: entityData?.nombre || (entityType === 'proyecto' ? 'Proyecto' : 'Cotización'),
        tipo: entityType,
        fechaInicio: projectFechaInicio,
        fechaFin: projectFechaFin,
        progreso: entityData?.progresoGeneral || 0,
        estado: entityData?.estado || 'en_progreso',
        nivel: 0,
        color: entityType === 'proyecto' ? '#1e40af' : '#4f46e5',
        children: processedChildren
      }
      processedTasks = [rootNode]
      setTasks(processedTasks)

      const initialExpanded = new Set<string>()
      const expandLevels = (tasks: GanttTask[], maxLevel: number = 1) => {
        for (const task of tasks) {
          if (task.nivel <= maxLevel) {
            initialExpanded.add(task.id)
            if (task.children?.length) {
              expandLevels(task.children, maxLevel)
            }
          }
        }
      }
      expandLevels(processedTasks, 1)
      setExpandedTasks(initialExpanded)

      const dependenciesResponse = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/dependencias`)

      if (dependenciesResponse.ok) {
        const dependenciesData = await dependenciesResponse.json()
        const processedDependencies = processDependenciesData(dependenciesData.data || [], processedTasks)
        setDependencies(processedDependencies)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const processTreeData = (treeData: any[], adjustLevels: boolean = false): GanttTask[] => {
    const levelOffset = adjustLevels ? 1 : 0

    const processNode = (node: any, parentId?: string): GanttTask => {
      let fechaInicio: string | null = null
      let fechaFin: string | null = null

      if (node.type === 'fase') {
        fechaInicio = node.data?.fechaInicioPlan || node.data?.fechaInicioComercial || node.data?.fechaInicio
        fechaFin = node.data?.fechaFinPlan || node.data?.fechaFinComercial || node.data?.fechaFin
      } else if (node.type === 'edt') {
        fechaInicio = node.data?.fechaInicioComercial || node.data?.fechaInicio
        fechaFin = node.data?.fechaFinComercial || node.data?.fechaFin
      } else if (node.type === 'actividad') {
        fechaInicio = node.data?.fechaInicioComercial || node.data?.fechaInicio
        fechaFin = node.data?.fechaFinComercial || node.data?.fechaFin
      } else if (node.type === 'tarea') {
        fechaInicio = node.data?.fechaInicio
        fechaFin = node.data?.fechaFin
      }

      let fechaInicioDate: Date | null = null
      let fechaFinDate: Date | null = null

      if (fechaInicio) {
        const date = new Date(fechaInicio)
        if (!isNaN(date.getTime())) fechaInicioDate = date
      }

      if (fechaFin) {
        const date = new Date(fechaFin)
        if (!isNaN(date.getTime())) fechaFinDate = date
      }

      return {
        id: node.id,
        nombre: node.nombre,
        tipo: node.type,
        fechaInicio: fechaInicioDate,
        fechaFin: fechaFinDate,
        progreso: node.metadata?.progressPercentage || 0,
        estado: node.metadata?.status || 'pendiente',
        nivel: node.level + levelOffset,
        parentId,
        horasEstimadas: node.data?.horasEstimadas,
        responsable: typeof node.data?.responsable === 'object' && node.data?.responsable !== null
          ? (node.data.responsable.name || node.data.responsable.nombre || node.data.responsable.email || 'Sin nombre')
          : node.data?.responsable,
        descripcion: node.data?.descripcion,
        dependenciaId: node.data?.dependenciaId,
        color: getTaskColor(node.type),
        children: node.children?.map((child: any) => processNode(child, node.id)) || []
      }
    }

    return treeData.map(node => processNode(node))
  }

  const processDependenciesData = (dependenciesData: any[], tasks: GanttTask[]): Dependency[] => {
    return dependenciesData.map(dep => {
      // Buscar tarea por ID real (sin prefijo) o por ID con prefijo
      const tareaOrigen = tasks.find(t =>
        t.id === dep.tareaOrigenId ||
        t.id === `tarea-${dep.tareaOrigenId}`
      ) || {
        id: `tarea-${dep.tareaOrigenId}`, // Usar ID con prefijo para consistencia
        nombre: dep.tareaOrigen?.nombre || 'Tarea no encontrada',
        tipo: 'tarea' as const,
        fechaInicio: null,
        fechaFin: null,
        progreso: 0,
        estado: 'pendiente',
        nivel: 0
      }

      const tareaDependiente = tasks.find(t =>
        t.id === dep.tareaDependienteId ||
        t.id === `tarea-${dep.tareaDependienteId}`
      ) || {
        id: `tarea-${dep.tareaDependienteId}`, // Usar ID con prefijo para consistencia
        nombre: dep.tareaDependiente?.nombre || 'Tarea no encontrada',
        tipo: 'tarea' as const,
        fechaInicio: null,
        fechaFin: null,
        progreso: 0,
        estado: 'pendiente',
        nivel: 0
      }

      return {
        id: dep.id,
        tareaOrigen,
        tareaDependiente,
        tipo: dep.tipo,
        lagMinutos: dep.lagMinutos || 0
      }
    })
  }

  const getTaskColor = (tipo: string): string => {
    switch (tipo) {
      case 'cotizacion': return '#4f46e5' // indigo-600
      case 'proyecto': return '#1e40af' // blue-800
      case 'fase': return '#3b82f6' // blue-500
      case 'edt': return '#10b981' // emerald-500
      case 'zona': return '#f59e0b' // amber-500
      case 'actividad': return '#8b5cf6' // violet-500
      case 'tarea': return '#6b7280' // gray-500
      default: return '#6b7280'
    }
  }

  const getStatusColor = (estado: string): string => {
    switch (estado) {
      case 'completada':
      case 'completed': return '#10b981'
      case 'en_progreso':
      case 'in_progress': return '#f59e0b'
      case 'pendiente':
      case 'pending': return '#6b7280'
      case 'pausada':
      case 'paused': return '#f97316'
      case 'cancelada':
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const applyFilters = useCallback(() => {
    let filtered = tasks

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTasks(filtered)
  }, [tasks, searchTerm])

  const calculateTimeline = useCallback(() => {
    if (filteredTasks.length === 0) return

    const collectAllTasks = (tasks: GanttTask[]): GanttTask[] => {
      const result: GanttTask[] = []
      for (const task of tasks) {
        result.push(task)
        if (task.children?.length) {
          result.push(...collectAllTasks(task.children))
        }
      }
      return result
    }

    const allTasks = collectAllTasks(filteredTasks)
    const validTasks = allTasks.filter(task =>
      task.fechaInicio instanceof Date && !isNaN(task.fechaInicio.getTime()) &&
      task.fechaFin instanceof Date && !isNaN(task.fechaFin.getTime())
    )

    if (validTasks.length === 0) {
      const today = new Date()
      const endDate = new Date(today)
      const effectiveMonths = timeRangeMonths === 0 ? 6 : timeRangeMonths
      endDate.setMonth(endDate.getMonth() + effectiveMonths)
      setTimeline({
        startDate: today,
        endDate: endDate,
        unit: 'weeks',
        unitWidth: 40 * zoomLevel,
        totalWidth: effectiveMonths * 30 * (40 * zoomLevel / 7)
      })
      return
    }

    const dates = validTasks.flatMap(task => [task.fechaInicio!, task.fechaFin!])
    const projectMinDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const projectMaxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    let minDate: Date, maxDate: Date

    // Si timeRangeMonths es 0 ("Completo"), mostrar todo el proyecto
    if (timeRangeMonths === 0) {
      // Usar las fechas reales del proyecto con un pequeño buffer
      minDate = new Date(projectMinDate)
      maxDate = new Date(projectMaxDate)
      // Buffer de 7 días a cada lado
      minDate.setDate(minDate.getDate() - 7)
      maxDate.setDate(maxDate.getDate() + 7)
    } else {
      // Calcular el rango basado en timeRangeMonths centrado en el proyecto
      const projectDuration = projectMaxDate.getTime() - projectMinDate.getTime()
      const requestedDuration = timeRangeMonths * 30 * 24 * 60 * 60 * 1000

      if (requestedDuration >= projectDuration) {
        // Si el rango solicitado es mayor que el proyecto, centrar el proyecto
        const buffer = (requestedDuration - projectDuration) / 2
        minDate = new Date(projectMinDate.getTime() - buffer)
        maxDate = new Date(projectMaxDate.getTime() + buffer)
      } else {
        // Si el rango es menor, mostrar desde el inicio del proyecto
        minDate = new Date(projectMinDate)
        maxDate = new Date(projectMinDate.getTime() + requestedDuration)
      }

      // Buffer mínimo
      minDate.setDate(minDate.getDate() - 7)
      maxDate.setDate(maxDate.getDate() + 7)
    }

    const diffTime = maxDate.getTime() - minDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let unit: 'days' | 'weeks' | 'months' = 'weeks'
    let unitWidth = 40 * zoomLevel

    if (diffDays <= 60) {
      unit = 'days'
      unitWidth = 30 * zoomLevel
    } else if (diffDays <= 180) {
      unit = 'weeks'
      unitWidth = 40 * zoomLevel
    } else {
      unit = 'months'
      unitWidth = 60 * zoomLevel
    }

    const totalWidth = diffDays * (unitWidth / (unit === 'days' ? 1 : unit === 'weeks' ? 7 : 30))

    setTimeline({
      startDate: minDate,
      endDate: maxDate,
      unit,
      unitWidth,
      totalWidth
    })
  }, [filteredTasks, zoomLevel, timeRangeMonths])

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.3))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
  }

  // Función para obtener lista plana de tareas visibles con su índice de fila
  const getVisibleTasksWithIndex = useCallback((): Map<string, number> => {
    const taskIndexMap = new Map<string, number>()
    let rowIndex = 0

    const processTask = (task: GanttTask) => {
      taskIndexMap.set(task.id, rowIndex)
      rowIndex++

      if (expandedTasks.has(task.id) && task.children) {
        task.children.forEach(child => processTask(child))
      }
    }

    filteredTasks.forEach(task => processTask(task))
    return taskIndexMap
  }, [filteredTasks, expandedTasks])

  // Función para calcular la posición X de una tarea (en porcentaje)
  const getTaskXPosition = useCallback((task: GanttTask, position: 'start' | 'end'): number => {
    if (!task.fechaInicio || !task.fechaFin) return 0

    const timeRange = timeline.endDate.getTime() - timeline.startDate.getTime()
    if (timeRange === 0) return 0

    if (position === 'start') {
      return ((task.fechaInicio.getTime() - timeline.startDate.getTime()) / timeRange) * 100
    } else {
      return ((task.fechaFin.getTime() - timeline.startDate.getTime()) / timeRange) * 100
    }
  }, [timeline])

  // Función para renderizar las líneas de dependencia SVG
  // Usamos viewBox de 100 unidades de ancho para trabajar con porcentajes
  const renderDependencyLines = useCallback(() => {
    if (!showDependencies || dependencies.length === 0) return null

    const taskIndexMap = getVisibleTasksWithIndex()
    const lines: React.ReactNode[] = []

    // Contar tareas visibles para calcular altura total
    let visibleTaskCount = 0
    const countVisible = (tasks: GanttTask[]) => {
      tasks.forEach(task => {
        visibleTaskCount++
        if (expandedTasks.has(task.id) && task.children) {
          countVisible(task.children)
        }
      })
    }
    countVisible(filteredTasks)

    dependencies.forEach((dep, idx) => {
      const sourceTask = dep.tareaOrigen
      const targetTask = dep.tareaDependiente

      // Buscar índices de las tareas (pueden tener prefijo tarea-)
      let sourceIndex = taskIndexMap.get(sourceTask.id)
      let targetIndex = taskIndexMap.get(targetTask.id)

      // Intentar sin prefijo si no se encontró
      if (sourceIndex === undefined) {
        sourceIndex = taskIndexMap.get(sourceTask.id.replace('tarea-', ''))
      }
      if (targetIndex === undefined) {
        targetIndex = taskIndexMap.get(targetTask.id.replace('tarea-', ''))
      }

      // Intentar con prefijo si no se encontró
      if (sourceIndex === undefined) {
        sourceIndex = taskIndexMap.get(`tarea-${sourceTask.id}`)
      }
      if (targetIndex === undefined) {
        targetIndex = taskIndexMap.get(`tarea-${targetTask.id}`)
      }

      // Si alguna tarea no está visible, no dibujar la línea
      if (sourceIndex === undefined || targetIndex === undefined) return

      // Calcular posiciones X (0-100 para viewBox)
      let startX: number, endX: number

      switch (dep.tipo) {
        case 'finish_to_start':
          startX = getTaskXPosition(sourceTask, 'end')
          endX = getTaskXPosition(targetTask, 'start')
          break
        case 'start_to_start':
          startX = getTaskXPosition(sourceTask, 'start')
          endX = getTaskXPosition(targetTask, 'start')
          break
        case 'finish_to_finish':
          startX = getTaskXPosition(sourceTask, 'end')
          endX = getTaskXPosition(targetTask, 'end')
          break
        case 'start_to_finish':
          startX = getTaskXPosition(sourceTask, 'start')
          endX = getTaskXPosition(targetTask, 'end')
          break
        default:
          startX = getTaskXPosition(sourceTask, 'end')
          endX = getTaskXPosition(targetTask, 'start')
      }

      // Posiciones Y en píxeles (centro de la barra)
      const startY = sourceIndex * ROW_HEIGHT + BAR_TOP_OFFSET + BAR_HEIGHT / 2
      const endY = targetIndex * ROW_HEIGHT + BAR_TOP_OFFSET + BAR_HEIGHT / 2

      // Calcular control points para curva bezier suave
      const deltaY = endY - startY

      // Tipo de curva según dirección
      let pathD: string
      const curveOffset = 3

      if (Math.abs(deltaY) < ROW_HEIGHT) {
        // Tareas en filas cercanas - línea más directa
        pathD = `M ${startX} ${startY}
                 C ${startX + curveOffset} ${startY},
                   ${endX - curveOffset} ${endY},
                   ${endX} ${endY}`
      } else {
        // Tareas en filas distantes - curva en S
        const midY = (startY + endY) / 2
        pathD = `M ${startX} ${startY}
                 C ${startX + curveOffset} ${startY},
                   ${startX + curveOffset} ${midY},
                   ${(startX + endX) / 2} ${midY}
                 S ${endX - curveOffset} ${endY},
                   ${endX} ${endY}`
      }

      // Color y marcador según tipo de dependencia
      let depColor: string
      let markerId: string

      switch (dep.tipo) {
        case 'finish_to_start':
          depColor = '#3b82f6' // blue
          markerId = 'arrowhead'
          break
        case 'start_to_start':
          depColor = '#10b981' // green
          markerId = 'arrowhead-green'
          break
        case 'finish_to_finish':
          depColor = '#f59e0b' // amber
          markerId = 'arrowhead-amber'
          break
        case 'start_to_finish':
          depColor = '#ef4444' // red
          markerId = 'arrowhead-red'
          break
        default:
          depColor = '#3b82f6'
          markerId = 'arrowhead'
      }

      lines.push(
        <g key={`dep-${dep.id}-${idx}`} className="dependency-line">
          {/* Línea de dependencia */}
          <path
            d={pathD}
            fill="none"
            stroke={depColor}
            strokeWidth="0.5"
            strokeDasharray={dep.tipo === 'finish_to_start' ? 'none' : '2,1'}
            opacity="0.9"
            markerEnd={`url(#${markerId})`}
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: '2px' }}
          />
          {/* Círculo en el punto de inicio */}
          <circle
            cx={startX}
            cy={startY}
            r="0.8"
            fill={depColor}
            stroke="white"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: '1.5px' }}
          />
        </g>
      )
    })

    return lines
  }, [showDependencies, dependencies, getVisibleTasksWithIndex, getTaskXPosition, expandedTasks, filteredTasks])

  const handleExportToMSProject = () => {
    try {
      if (filteredTasks.length === 0) {
        toast({
          title: 'No hay tareas para exportar',
          description: 'Asegúrate de que hay tareas visibles en el Gantt.',
          variant: 'destructive'
        })
        return
      }

      // GYS-GEN-19: Validar consistencia antes de exportar
      const cronogramaParaValidar = { fases: [{ edts: [{ actividades: [{ tareas: filteredTasks }] }] }] }
      const errores = validarAntesDeExportar(cronogramaParaValidar)

      if (errores.length > 0) {
        console.warn('GYS-GEN-19: Inconsistencias detectadas:', errores)

        // Intentar auto-corrección
        const correccion = autoCorregirInconsistencias(cronogramaParaValidar, calendarioLaboral)

        if (correccion.exito) {
          toast({
            title: 'Corrección automática aplicada',
            description: `Se corrigieron ${correccion.correcciones.length} inconsistencias antes de exportar.`,
          })
          console.log('GYS-GEN-19: Auto-corrección aplicada:', correccion.correcciones)
        } else {
          toast({
            title: 'Advertencia de consistencia',
            description: `Se detectaron ${errores.length} inconsistencias. La exportación puede tener problemas.`,
            variant: 'destructive'
          })
          console.error('GYS-GEN-19: Falló auto-corrección:', correccion.errores)
        }
      }

      const xml = convertToMSProjectXML(filteredTasks, `Cronograma GYS - ${cotizacionId}`, calendarioLaboral)
      const filename = `cronograma-gys-${cotizacionId}-${new Date().toISOString().split('T')[0]}.xml`

      downloadMSProjectXML(xml, filename)

      toast({
        title: 'Exportación exitosa',
        description: `Archivo XML generado para Microsoft Project: ${filename}`,
      })
    } catch (error) {
      console.error('Error exportando a MS Project:', error)
      const errorMessage = error instanceof Error ? error.message : 'No se pudo generar el archivo XML. Inténtalo de nuevo.'

      toast({
        title: 'Error en exportación',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const exportToImage = () => {
    // Implementar exportación a imagen
    toast({
      title: 'Funcionalidad próximamente',
      description: 'La exportación a imagen estará disponible en la próxima versión.'
    })
  }

  const renderTaskRow = (task: GanttTask, level: number = 0): React.ReactNode => {
    const isExpanded = expandedTasks.has(task.id)
    const hasChildren = task.children && task.children.length > 0

    // Background colors based on hierarchy level
    const levelBackgrounds = [
      'bg-indigo-50/90 border-l-4 border-l-indigo-600', // Level 0: Proyecto
      'bg-blue-50/70 border-l-4 border-l-blue-500',     // Level 1: Fase
      'bg-green-50/50 border-l-4 border-l-green-400',   // Level 2: EDT
      'bg-amber-50/40 border-l-4 border-l-amber-300',   // Level 3: Actividad
      'bg-gray-50/30 border-l-4 border-l-gray-300',     // Level 4: Tarea
    ]
    const levelBackground = levelBackgrounds[level] || levelBackgrounds[3]

    // Level 0 gets more height for better visibility
    const rowHeight = level === 0 ? ROW_HEIGHT + 12 : ROW_HEIGHT

    return (
      <React.Fragment key={task.id}>
        <div className={`flex items-center border-b border-gray-100 hover:bg-gray-100/50 transition-colors ${levelBackground}`} style={{ height: `${rowHeight}px` }}>
          {/* Task info column */}
          <div className={`w-80 flex-shrink-0 px-2 border-r border-gray-200 ${level === 0 ? 'py-3' : 'py-1.5'}`}>
            <div
              className="flex items-center gap-1.5"
              style={{ paddingLeft: `${level * 12}px` }}
            >
              {/* Hierarchy connector lines */}
              {level > 0 && (
                <div className="relative flex items-center">
                  {/* Vertical line */}
                  <div
                    className="absolute border-l border-gray-300"
                    style={{
                      left: '-6px',
                      top: '-22px',
                      height: '28px'
                    }}
                  />
                  {/* Horizontal line */}
                  <div
                    className="absolute border-t border-gray-300"
                    style={{
                      left: '-6px',
                      width: '6px',
                      top: '6px'
                    }}
                  />
                </div>
              )}

              {/* Expand/collapse button */}
              <div className="w-6 flex justify-center flex-shrink-0">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-gray-200"
                    onClick={() => toggleTaskExpansion(task.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </Button>
                )}
              </div>

              {/* Task details - compact layout */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge
                    className={`text-[10px] px-1.5 py-0 leading-tight ${level === 0 ? 'font-semibold' : ''}`}
                    style={{
                      backgroundColor: task.color + (level === 0 ? '30' : '20'),
                      color: task.color,
                      borderColor: task.color
                    }}
                  >
                    {task.tipo}
                  </Badge>
                  <span
                    className={`truncate ${level === 0 ? 'font-semibold text-xs' : level === 1 ? 'font-medium text-xs' : 'font-normal text-[11px]'}`}
                    title={task.nombre}
                    style={{ color: level === 0 ? '#1f2937' : level === 1 ? '#374151' : '#6b7280' }}
                  >
                    {task.nombre}
                  </span>
                  {task.horasEstimadas && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400 flex-shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {task.horasEstimadas}h
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline column */}
          <div className="flex-1 relative" style={{ height: level === 0 ? '56px' : '44px' }}>
            {task.fechaInicio instanceof Date && !isNaN(task.fechaInicio.getTime()) &&
             task.fechaFin instanceof Date && !isNaN(task.fechaFin.getTime()) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute rounded-md shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${level === 0 ? 'top-4 h-6' : 'top-3 h-5'}`}
                      style={{
                        left: `${((task.fechaInicio.getTime() - timeline.startDate.getTime()) / (timeline.endDate.getTime() - timeline.startDate.getTime())) * 100}%`,
                        width: `${((task.fechaFin.getTime() - task.fechaInicio.getTime()) / (timeline.endDate.getTime() - timeline.startDate.getTime())) * 100}%`,
                        backgroundColor: getStatusColor(task.estado) + '40',
                        borderColor: getStatusColor(task.estado)
                      }}
                    >
                      {/* Progress bar */}
                      <div
                        className="h-full rounded-l-md opacity-60"
                        style={{
                          width: `${task.progreso}%`,
                          backgroundColor: getStatusColor(task.estado)
                        }}
                      />

                      {/* Task label with days and hours (name already in left column) */}
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 px-2">
                        <span className="truncate">
                          {Math.max(1, Math.ceil((task.fechaFin.getTime() - task.fechaInicio.getTime()) / (1000 * 60 * 60 * 24)))}d
                          {task.horasEstimadas ? ` · ${task.horasEstimadas}h` : ''}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2">
                      <div className="font-medium">{task.nombre}</div>
                      <div className="text-sm space-y-1">
                        <div>Inicio: {task.fechaInicio.toLocaleDateString('es-ES')}</div>
                        <div>Fin: {task.fechaFin.toLocaleDateString('es-ES')}</div>
                        <div>Progreso: {task.progreso}%</div>
                        <div>Estado: {task.estado}</div>
                        {task.horasEstimadas && <div>Horas: {task.horasEstimadas}</div>}
                        {task.descripcion && <div className="mt-2 text-gray-600">{task.descripcion}</div>}
                        {/* Dependency information */}
                        {(() => {
                          const taskDependencies = dependencies.filter(dep =>
                            dep.tareaOrigen.id === task.id || dep.tareaDependiente.id === task.id
                          )
                          if (taskDependencies.length > 0) {
                            return (
                              <div className="mt-2 pt-2 border-t border-gray-300">
                                <div className="font-medium text-blue-600 flex items-center gap-1">
                                  <ArrowRight className="h-3 w-3" />
                                  Dependencias ({taskDependencies.length}):
                                </div>
                                {taskDependencies.map(dep => (
                                  <div key={dep.id} className="text-xs text-blue-700 flex items-center gap-1">
                                    <span className="font-medium">
                                      {dep.tareaOrigen.id === task.id ? '→' : '←'}
                                    </span>
                                    <span className="font-medium">{dep.tipo}:</span>
                                    {dep.tareaOrigen.id === task.id ? dep.tareaDependiente.nombre : dep.tareaOrigen.nombre}
                                    {dep.lagMinutos > 0 && ` (+${dep.lagMinutos}min)`}
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Indicador sutil de tarea con dependencias - ahora las líneas SVG muestran las conexiones */}
            {showDependencies && (() => {
              const taskDependencies = dependencies.filter(dep =>
                dep.tareaOrigen.id === task.id || dep.tareaDependiente.id === task.id ||
                dep.tareaOrigen.id === `tarea-${task.id}` || dep.tareaDependiente.id === `tarea-${task.id}` ||
                dep.tareaOrigen.id === task.id.replace('tarea-', '') || dep.tareaDependiente.id === task.id.replace('tarea-', '')
              )

              if (taskDependencies.length === 0) return null

              // Solo mostrar un indicador de número de dependencias
              return (
                <div
                  className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    width: '16px',
                    height: '16px',
                    zIndex: 100
                  }}
                  title={`${taskDependencies.length} dependencia(s)`}
                >
                  {taskDependencies.length}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && task.children!.map(child => renderTaskRow(child, level + 1))}
      </React.Fragment>
    )
  }

  if (loading) {
    return (
      <Card className="border-indigo-100">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <BarChart3 className="h-6 w-6 animate-pulse text-indigo-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Cargando Gantt Pro...</p>
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
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-indigo-100">
      <CardContent className="p-0">
        {/* Single compact toolbar row */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50/50">
          {/* Left: Title + Stats */}
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold">Gantt Pro</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {filteredTasks.length}
            </Badge>
            {dependencies.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600">
                {dependencies.length} deps
              </Badge>
            )}
          </div>

          {/* Center: Search */}
          <div className="flex items-center gap-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-6 w-32 text-xs"
            />
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1">
            {dependencies.length > 0 && (
              <label className="flex items-center gap-1 text-[10px] cursor-pointer mr-1" title="Mostrar dependencias">
                <input
                  type="checkbox"
                  checked={showDependencies}
                  onChange={(e) => setShowDependencies(e.target.checked)}
                  className="h-3 w-3 rounded border-gray-300"
                />
                <ArrowRight className="h-3 w-3" />
              </label>
            )}
            <Select value={timeRangeMonths.toString()} onValueChange={(v) => setTimeRangeMonths(parseInt(v))}>
              <SelectTrigger className="h-6 w-24 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Completo</SelectItem>
                <SelectItem value="1">1 mes</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">1 año</SelectItem>
                <SelectItem value="24">2 años</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomOut} title="Alejar">
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleResetZoom} title="Restablecer">
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomIn} title="Acercar">
              <ZoomIn className="h-3 w-3" />
            </Button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExportToMSProject} title="Exportar MS Project">
              <FileDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={exportToImage} title="Descargar imagen">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Timeline header */}
        <div className="border-b bg-white sticky top-0 z-10">
          <div className="flex">
            {/* Task column header */}
            <div className="w-80 flex-shrink-0 py-2 px-2 border-r border-gray-200 bg-gray-50">
              <span className="font-medium text-sm">Tareas</span>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-x-auto" ref={timelineRef}>
              <div className="flex" style={{ width: `${timeline.totalWidth}px`, minWidth: '100%' }}>
                {/* Generate timeline units */}
                {Array.from({ length: Math.ceil((timeline.endDate.getTime() - timeline.startDate.getTime()) / (1000 * 60 * 60 * 24 * (timeline.unit === 'days' ? 1 : timeline.unit === 'weeks' ? 7 : 30))) }, (_, i) => {
                  const date = new Date(timeline.startDate)
                  if (timeline.unit === 'days') {
                    date.setDate(date.getDate() + i)
                  } else if (timeline.unit === 'weeks') {
                    date.setDate(date.getDate() + (i * 7))
                  } else {
                    date.setMonth(date.getMonth() + i)
                  }

                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 border-r border-gray-200 px-2 py-2 text-center"
                      style={{ width: timeline.unitWidth }}
                    >
                      <div className="text-xs font-medium text-gray-700">
                        {date.toLocaleDateString('es-ES', {
                          day: timeline.unit === 'days' ? 'numeric' : undefined,
                          month: timeline.unit === 'months' ? 'short' : timeline.unit === 'weeks' ? 'short' : undefined,
                          year: timeline.unit === 'months' ? 'numeric' : undefined
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="max-h-[500px] overflow-y-auto" ref={tasksContainerRef}>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No hay tareas que coincidan con los filtros</p>
              <p className="text-sm">Ajusta los filtros para ver más tareas</p>
            </div>
          ) : (
            <div className="relative">
              {/* Tareas */}
              <div className="divide-y divide-gray-100">
                {filteredTasks.map(task => renderTaskRow(task))}
              </div>

              {/* SVG Overlay para líneas de dependencia */}
              {showDependencies && dependencies.length > 0 && (() => {
                // Calcular altura total basada en tareas visibles
                let visibleCount = 0
                const countVisible = (tasks: GanttTask[]) => {
                  tasks.forEach(task => {
                    visibleCount++
                    if (expandedTasks.has(task.id) && task.children) {
                      countVisible(task.children)
                    }
                  })
                }
                countVisible(filteredTasks)
                const totalHeight = visibleCount * ROW_HEIGHT

                return (
                  <svg
                    className="absolute top-0 pointer-events-none"
                    viewBox={`0 0 100 ${totalHeight}`}
                    preserveAspectRatio="none"
                    style={{
                      left: TASK_COLUMN_WIDTH,
                      width: `calc(100% - ${TASK_COLUMN_WIDTH}px)`,
                      height: totalHeight,
                      overflow: 'visible',
                      zIndex: 50
                    }}
                  >
                    <defs>
                      {/* Marcadores de flecha para diferentes colores */}
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                      </marker>
                      <marker
                        id="arrowhead-green"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
                      </marker>
                      <marker
                        id="arrowhead-amber"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                      </marker>
                      <marker
                        id="arrowhead-red"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                      </marker>
                      <marker
                        id="arrowhead-reverse"
                        markerWidth="10"
                        markerHeight="7"
                        refX="1"
                        refY="3.5"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <polygon points="10 0, 0 3.5, 10 7" fill="#3b82f6" />
                      </marker>
                    </defs>
                    {renderDependencyLines()}
                  </svg>
                )
              })()}
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="px-3 py-2 border-t bg-gray-50/50">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span>{Math.round(filteredTasks.reduce((sum, task) => sum + task.progreso, 0) / Math.max(filteredTasks.length, 1))}%</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3 text-blue-600" />
                <span>{filteredTasks.reduce((sum, task) => sum + (task.horasEstimadas || 0), 0)}h</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-3 w-3 text-orange-600" />
                <span>{filteredTasks.filter(task => task.estado === 'en_progreso').length} activas</span>
              </div>
              {showDependencies && dependencies.length > 0 && (
                <>
                  <div className="w-px h-3 bg-gray-200" />
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-muted-foreground">Deps:</span>
                    <div className="flex items-center gap-0.5"><div className="w-3 h-0.5 bg-blue-500"></div><span>FS</span></div>
                    <div className="flex items-center gap-0.5"><div className="w-3 h-0.5 bg-emerald-500 border-dashed border-t"></div><span>SS</span></div>
                    <div className="flex items-center gap-0.5"><div className="w-3 h-0.5 bg-amber-500 border-dashed border-t"></div><span>FF</span></div>
                  </div>
                </>
              )}
            </div>
            <span className="text-muted-foreground">Zoom: {Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}