'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Calendar,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Settings,
  Eye,
  EyeOff,
  BarChart3,
  Users,
  Target,
  TrendingUp,
  FileDown,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { convertToMSProjectXML, downloadMSProjectXML } from '@/lib/utils/msProjectXmlExport'
import { validarAntesDeExportar, autoCorregirInconsistencias } from '@/lib/validators/cronogramaRules'

interface CronogramaGanttViewProProps {
  cotizacionId: string
  refreshKey?: number
}

interface GanttTask {
  id: string
  nombre: string
  tipo: 'fase' | 'edt' | 'zona' | 'actividad' | 'tarea'
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

export function CronogramaGanttViewPro({ cotizacionId, refreshKey }: CronogramaGanttViewProProps) {
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

  // Filtros y búsqueda - start with all filters enabled to show everything initially
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(['fase', 'edt', 'zona', 'actividad', 'tarea']))
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set(['pendiente', 'en_progreso', 'completada', 'planificado']))
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [showDependencies, setShowDependencies] = useState(true)
  const [dependencyFilter, setDependencyFilter] = useState<'all' | 'with-dependencies' | 'without-dependencies'>('all')
  const [zoomLevel, setZoomLevel] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarioLaboral, setCalendarioLaboral] = useState<any>(null)
  const { toast } = useToast()

  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadGanttData()
  }, [cotizacionId, refreshKey])

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
    console.log('🔍 [GANTT PRO] Applying filters - tasks:', tasks.length, 'filtered:', filteredTasks.length)
  }, [tasks, searchTerm, typeFilters, statusFilters, dependencyFilter])

  useEffect(() => {
    calculateTimeline()
  }, [filteredTasks, zoomLevel])

  const loadGanttData = async () => {
    try {
      setLoading(true)
      console.log('🔍 [GANTT PRO] Starting loadGanttData for cotizacionId:', cotizacionId)

      // Skip cotizacion data loading for now - calendarioLaboral not critical
      console.log('ℹ️ Skipping cotización data load - not critical for dependencies display')
      setCalendarioLaboral(null)

      // Load tasks - try project API first, fallback to quote API
      let response;
      let apiPath = 'proyectos';

      console.log('🔍 [GANTT PRO] Trying project API first:', `/api/proyectos/${cotizacionId}/cronograma/tree`)
      response = await fetch(`/api/proyectos/${cotizacionId}/cronograma/tree`)

      if (!response.ok && response.status === 404) {
        console.log('⚠️ [GANTT PRO] Project API not found, trying quote API:', `/api/cotizaciones/${cotizacionId}/cronograma/tree`)
        apiPath = 'cotizaciones'
        response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree`)
      }

      if (!response.ok) {
        console.error('❌ ERROR: No se pudo cargar el árbol del cronograma:', response.status, response.statusText)
        console.error('❌ [GANTT PRO] Tried both project and quote APIs for ID:', cotizacionId)
        throw new Error('Error cargando datos del cronograma')
      }
      const data = await response.json()
      console.log('✅ TREE DATA LOADED:', data.data?.tree?.length || 0, 'tasks')
      console.log('🔍 [GANTT PRO] Raw tree data:', data.data?.tree)

      const processedTasks = processTreeData(data.data.tree)
      console.log('✅ PROCESSED TASKS:', processedTasks.length)
      console.log('🔍 [GANTT PRO] Processed tasks sample:', processedTasks.slice(0, 3))
      setTasks(processedTasks)

      // Load dependencies - try project API first, fallback to quote API
      let dependenciesResponse;
      console.log('🔍 [GANTT PRO] Loading dependencies from:', `/api/${apiPath}/${cotizacionId}/cronograma/dependencias`)
      dependenciesResponse = await fetch(`/api/${apiPath}/${cotizacionId}/cronograma/dependencias`)

      if (dependenciesResponse.ok) {
        const dependenciesData = await dependenciesResponse.json()
        console.log('✅ DEPENDENCIES RAW DATA:', dependenciesData.data?.length || 0, 'dependencies')
        console.log('🔍 [GANTT PRO] Raw dependencies data:', dependenciesData.data)
        const processedDependencies = processDependenciesData(dependenciesData.data || [], processedTasks)
        console.log('✅ PROCESSED DEPENDENCIES:', processedDependencies.length)
        console.log('🔍 [GANTT PRO] Processed dependencies sample:', processedDependencies.slice(0, 3))
        setDependencies(processedDependencies)
      } else {
        console.error('❌ ERROR: No se pudieron cargar las dependencias:', dependenciesResponse.status, dependenciesResponse.statusText)
        console.log('⚠️ [GANTT PRO] Dependencies not available for this entity type')
      }

      console.log('✅ [GANTT PRO] loadGanttData completed successfully')

    } catch (err) {
      console.error('❌ [GANTT PRO] Error in loadGanttData:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const processTreeData = (treeData: any[]): GanttTask[] => {
    console.log('🔍 [GANTT PRO] Processing tree data:', treeData?.length || 0, 'nodes')

    const processNode = (node: any, parentId?: string): GanttTask => {
      console.log('🔍 [GANTT PRO] Processing node:', node.id, node.type, node.nombre)

      // Extraer fechas según el tipo de nodo
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
        // Para tareas, las fechas están directamente en data.fechaInicio y data.fechaFin
        fechaInicio = node.data?.fechaInicio
        fechaFin = node.data?.fechaFin
      }

      console.log('🔍 [GANTT PRO] Node dates - inicio:', fechaInicio, 'fin:', fechaFin)

      // Validar y convertir fechas de manera segura
      let fechaInicioDate: Date | null = null
      let fechaFinDate: Date | null = null

      if (fechaInicio) {
        const date = new Date(fechaInicio)
        if (!isNaN(date.getTime())) {
          fechaInicioDate = date
          console.log('✅ [GANTT PRO] Valid fechaInicio:', fechaInicioDate.toISOString())
        } else {
          console.log('❌ [GANTT PRO] Invalid fechaInicio:', fechaInicio)
        }
      } else {
        console.log('⚠️ [GANTT PRO] No fechaInicio found for node:', node.id)
      }

      if (fechaFin) {
        const date = new Date(fechaFin)
        if (!isNaN(date.getTime())) {
          fechaFinDate = date
          console.log('✅ [GANTT PRO] Valid fechaFin:', fechaFinDate.toISOString())
        } else {
          console.log('❌ [GANTT PRO] Invalid fechaFin:', fechaFin)
        }
      } else {
        console.log('⚠️ [GANTT PRO] No fechaFin found for node:', node.id)
      }

      const task: GanttTask = {
        id: node.id,
        nombre: node.nombre,
        tipo: node.type,
        fechaInicio: fechaInicioDate,
        fechaFin: fechaFinDate,
        progreso: node.metadata?.progressPercentage || 0,
        estado: node.metadata?.status || 'pendiente',
        nivel: node.level,
        parentId,
        horasEstimadas: node.data?.horasEstimadas,
        responsable: node.data?.responsable,
        descripcion: node.data?.descripcion,
        dependenciaId: node.data?.dependenciaId, // Para dependencias entre tareas
        color: getTaskColor(node.type),
        children: node.children?.map((child: any) => processNode(child, node.id)) || []
      }

      console.log('✅ [GANTT PRO] Processed task:', task.id, task.nombre, 'dates:', task.fechaInicio?.toISOString(), task.fechaFin?.toISOString())

      return task
    }

    const result = treeData.map(node => processNode(node))
    console.log('✅ [GANTT PRO] Final processed tasks:', result.length)
    return result
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
    console.log('🔍 [GANTT PRO] applyFilters called with:', {
      tasksCount: tasks.length,
      searchTerm,
      typeFilters: Array.from(typeFilters),
      statusFilters: Array.from(statusFilters),
      dependencyFilter
    })

    let filtered = tasks
    console.log('🔍 [GANTT PRO] Starting with', filtered.length, 'tasks')

    // Filtro de búsqueda
    if (searchTerm) {
      const beforeSearch = filtered.length
      filtered = filtered.filter(task =>
        task.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      console.log('🔍 [GANTT PRO] After search filter:', filtered.length, 'of', beforeSearch)
    }

    // Filtro de tipos
    const beforeType = filtered.length
    filtered = filtered.filter(task => typeFilters.has(task.tipo))
    console.log('🔍 [GANTT PRO] After type filter:', filtered.length, 'of', beforeType, 'types allowed:', Array.from(typeFilters))

    // Filtro de estados - allow tasks without estado or with matching estado
    const beforeStatus = filtered.length
    const statusCounts = filtered.reduce((acc, task) => {
      const status = task.estado || 'undefined'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log('🔍 [GANTT PRO] Task status distribution:', statusCounts)
    console.log('🔍 [GANTT PRO] Sample task statuses:', filtered.slice(0, 3).map(t => ({ nombre: t.nombre, estado: t.estado })))

    filtered = filtered.filter(task => !task.estado || statusFilters.has(task.estado))
    console.log('🔍 [GANTT PRO] After status filter:', filtered.length, 'of', beforeStatus, 'statuses allowed:', Array.from(statusFilters))

    // Filtro de dependencias
    if (dependencyFilter === 'with-dependencies') {
      const beforeDep = filtered.length
      const taskIdsWithDependencies = new Set([
        ...dependencies.map(dep => dep.tareaOrigen.id),
        ...dependencies.map(dep => dep.tareaDependiente.id)
      ])
      filtered = filtered.filter(task => taskIdsWithDependencies.has(task.id))
      console.log('🔍 [GANTT PRO] After dependency filter (with):', filtered.length, 'of', beforeDep)
    } else if (dependencyFilter === 'without-dependencies') {
      const beforeDep = filtered.length
      const taskIdsWithDependencies = new Set([
        ...dependencies.map(dep => dep.tareaOrigen.id),
        ...dependencies.map(dep => dep.tareaDependiente.id)
      ])
      filtered = filtered.filter(task => !taskIdsWithDependencies.has(task.id))
      console.log('🔍 [GANTT PRO] After dependency filter (without):', filtered.length, 'of', beforeDep)
    }

    console.log('🔍 [GANTT PRO] Final filtered tasks:', filtered.length)
    console.log('🔍 [GANTT PRO] Sample filtered tasks:', filtered.slice(0, 3).map(t => ({ id: t.id, nombre: t.nombre, tipo: t.tipo })))

    setFilteredTasks(filtered)
  }, [tasks, searchTerm, typeFilters, statusFilters, dependencyFilter, dependencies])

  const calculateTimeline = useCallback(() => {
    console.log('🔍 [GANTT PRO] Calculating timeline for', filteredTasks.length, 'tasks')

    if (filteredTasks.length === 0) {
      console.log('⚠️ [GANTT PRO] No tasks to calculate timeline')
      return
    }

    const validTasks = filteredTasks.filter(task =>
      task.fechaInicio instanceof Date && !isNaN(task.fechaInicio.getTime()) &&
      task.fechaFin instanceof Date && !isNaN(task.fechaFin.getTime())
    )

    console.log('🔍 [GANTT PRO] Valid tasks with dates:', validTasks.length, 'of', filteredTasks.length)

    if (validTasks.length === 0) {
      console.log('❌ [GANTT PRO] No valid dates found in tasks')
      return
    }

    const dates = validTasks.flatMap(task => [task.fechaInicio!, task.fechaFin!])
    console.log('🔍 [GANTT PRO] All dates:', dates.map(d => d.toISOString()))

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    console.log('🔍 [GANTT PRO] Date range:', minDate.toISOString(), 'to', maxDate.toISOString())

    // Agregar buffer
    minDate.setDate(minDate.getDate() - 7)
    maxDate.setDate(maxDate.getDate() + 7)

    const diffTime = maxDate.getTime() - minDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    console.log('🔍 [GANTT PRO] Days difference:', diffDays)

    let unit: 'days' | 'weeks' | 'months' = 'weeks'
    let unitWidth = 40 * zoomLevel

    if (diffDays <= 90) {
      unit = 'days'
      unitWidth = 30 * zoomLevel
    } else if (diffDays <= 365) {
      unit = 'weeks'
      unitWidth = 40 * zoomLevel
    } else {
      unit = 'months'
      unitWidth = 60 * zoomLevel
    }

    const totalWidth = diffDays * (unitWidth / (unit === 'days' ? 1 : unit === 'weeks' ? 7 : 30))

    console.log('🔍 [GANTT PRO] Timeline config:', { unit, unitWidth, totalWidth, diffDays })

    setTimeline({
      startDate: minDate,
      endDate: maxDate,
      unit,
      unitWidth,
      totalWidth
    })

    console.log('✅ [GANTT PRO] Timeline calculated successfully')
  }, [filteredTasks, zoomLevel])

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

    return (
      <React.Fragment key={task.id}>
        <div className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors">
          {/* Task info column */}
          <div className="w-80 flex-shrink-0 p-3 border-r border-gray-200">
            <div className="flex items-center gap-2">
              {/* Expand/collapse button */}
              <div className="w-6 flex justify-center">
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

              {/* Task details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    className="text-xs px-2 py-0.5"
                    style={{ backgroundColor: task.color + '20', color: task.color, borderColor: task.color }}
                  >
                    {task.tipo}
                  </Badge>
                  <span className="font-medium text-sm truncate" title={task.nombre}>
                    {task.nombre}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {task.horasEstimadas && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.horasEstimadas}h
                    </span>
                  )}
                  {task.responsable && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {task.responsable}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0.5"
                    style={{
                      borderColor: getStatusColor(task.estado),
                      color: getStatusColor(task.estado)
                    }}
                  >
                    {task.estado}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline column */}
          <div className="flex-1 relative" style={{ height: '60px' }}>
            {task.fechaInicio instanceof Date && !isNaN(task.fechaInicio.getTime()) &&
             task.fechaFin instanceof Date && !isNaN(task.fechaFin.getTime()) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-2 h-8 rounded-md shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow"
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

                      {/* Task label */}
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 px-2">
                        <span className="truncate">{task.nombre}</span>
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

            {/* Dependency indicators on task bars */}
            {showDependencies && (() => {
              const taskDependencies = dependencies.filter(dep =>
                dep.tareaOrigen.id === task.id || dep.tareaDependiente.id === task.id
              )

              if (taskDependencies.length === 0) return null

              return (
                <>
                  {/* Start indicator */}
                  <div
                    className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-blue-600 text-white text-xs font-bold"
                    style={{
                      width: '16px',
                      zIndex: 100,
                      borderRadius: '0 4px 4px 0'
                    }}
                  >
                    →
                  </div>

                  {/* End indicator */}
                  <div
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-blue-600 text-white text-xs font-bold"
                    style={{
                      width: '16px',
                      zIndex: 100,
                      borderRadius: '4px 0 0 4px'
                    }}
                  >
                    ←
                  </div>

                  {/* Subtle border highlight */}
                  <div
                    className="absolute inset-0 pointer-events-none border-2 border-blue-400 rounded-md"
                    style={{
                      zIndex: 99,
                      opacity: 0.7
                    }}
                  />
                </>
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando diagrama de Gantt profesional...</p>
            <p className="text-sm text-muted-foreground mt-2">cotizacionId: {cotizacionId}</p>
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

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Diagrama de Gantt Profesional
              <Badge variant="secondary" className="ml-2">
                {filteredTasks.length} tareas
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Vista avanzada con filtros, zoom y análisis de dependencias
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportToMSProject} title="Exportar a Microsoft Project">
              <FileDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportToImage}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar tareas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            {/* Type filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Tipos:</span>
              {['fase', 'edt', 'actividad', 'tarea'].map(type => (
                <label key={type} className="flex items-center gap-1 text-sm">
                  <Checkbox
                    checked={typeFilters.has(type)}
                    onCheckedChange={(checked) => {
                      setTypeFilters(prev => {
                        const newSet = new Set(prev)
                        if (checked) {
                          newSet.add(type)
                        } else {
                          newSet.delete(type)
                        }
                        return newSet
                      })
                    }}
                  />
                  {type}
                </label>
              ))}
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Estados:</span>
              {['pendiente', 'en_progreso', 'completada', 'planificado'].map(status => (
                <label key={status} className="flex items-center gap-1 text-sm">
                  <Checkbox
                    checked={statusFilters.has(status)}
                    onCheckedChange={(checked) => {
                      setStatusFilters(prev => {
                        const newSet = new Set(prev)
                        if (checked) {
                          newSet.add(status)
                        } else {
                          newSet.delete(status)
                        }
                        return newSet
                      })
                    }}
                  />
                  {status}
                </label>
              ))}
            </div>

            {/* Critical path toggle */}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showCriticalPath}
                onCheckedChange={(checked) => setShowCriticalPath(checked === true)}
              />
              <Target className="h-4 w-4" />
              Camino crítico
            </label>

            {/* Dependencies toggle */}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showDependencies}
                onCheckedChange={(checked) => setShowDependencies(checked === true)}
              />
              <ArrowRight className="h-4 w-4" />
              Mostrar dependencias ({dependencies.length})
              {dependencies.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {dependencies.length} activas
                </Badge>
              )}
            </label>

            {/* Dependency filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Dependencias:</span>
              <Select value={dependencyFilter} onValueChange={(value: 'all' | 'with-dependencies' | 'without-dependencies') => setDependencyFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tareas</SelectItem>
                  <SelectItem value="with-dependencies">Con dependencias</SelectItem>
                  <SelectItem value="without-dependencies">Sin dependencias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Timeline header */}
        <div className="border-b bg-white sticky top-0 z-10">
          <div className="flex">
            {/* Task column header */}
            <div className="w-80 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50">
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
        <div className="max-h-96 overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No hay tareas que coincidan con los filtros</p>
              <p className="text-sm">Ajusta los filtros para ver más tareas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTasks.map(task => renderTaskRow(task))}
            </div>
          )}
        </div>

        {/* Footer with statistics */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Progreso general: {Math.round(filteredTasks.reduce((sum, task) => sum + task.progreso, 0) / filteredTasks.length)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Horas totales: {filteredTasks.reduce((sum, task) => sum + (task.horasEstimadas || 0), 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <span>Tareas críticas: {filteredTasks.filter(task => task.estado === 'en_progreso').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600" />
                <span>Dependencias activas: {dependencies.length}</span>
              </div>
            </div>
            <div className="text-gray-500">
              Zoom: {Math.round(zoomLevel * 100)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}