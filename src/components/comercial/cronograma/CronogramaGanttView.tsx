'use client'

/**
 * 📊 CronogramaGanttView - Vista Gantt del cronograma comercial
 *
 * Componente que muestra una vista Gantt interactiva del cronograma con EDTs y tareas.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, Calendar, ChevronLeft, ChevronRight, ChevronDown, ZoomIn, ZoomOut, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GanttFase {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string | null
  fechaFinPlan?: string | null
  estado: string
  porcentajeAvance: number
  edts: GanttEdt[]
}

interface GanttEdt {
  id: string
  nombre: string
  fechaInicioComercial: string | null
  fechaFinComercial: string | null
  estado: string
  prioridad: string
  horasEstimadas?: number | null
  responsable?: {
    id: string
    name: string | null
  }
  categoriaServicio?: {
    id: string
    nombre: string
  }
  tareas?: GanttTask[]
}

interface GanttTask {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  estado: string
  prioridad: string
  horasEstimadas?: number | null
  responsable?: {
    id: string
    name: string | null
  }
}

interface CronogramaGanttViewProps {
  cotizacionId: string
  refreshKey: number
}

export function CronogramaGanttView({
  cotizacionId,
  refreshKey
}: CronogramaGanttViewProps) {
  const [data, setData] = useState<GanttFase[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState(30) // days per column
  const [timeScale, setTimeScale] = useState<'days' | 'weeks' | 'months'>('months') // Time scale
  const [compactMode, setCompactMode] = useState(true) // Start in compact mode
  const [showLabels, setShowLabels] = useState(true) // Show labels beside bars
  const [showTooltips, setShowTooltips] = useState(true) // Show detailed tooltips

  // ✅ Nuevos estados para interactividad
  const [expandedEdts, setExpandedEdts] = useState<Set<string>>(new Set()) // EDTs expandidos/colapsados
  const [editingTask, setEditingTask] = useState<any>(null) // Tarea siendo editada
  const [editingEdt, setEditingEdt] = useState<any>(null) // EDT siendo editado
  const [draggedTask, setDraggedTask] = useState<any>(null) // Tarea siendo arrastrada
  const [dragOffset, setDragOffset] = useState(0) // Offset del drag

  const { toast } = useToast()

  // Load cronograma data
  useEffect(() => {
    loadCronogramaData()
  }, [cotizacionId, refreshKey])

  // Align currentDate when timeScale changes
  useEffect(() => {
    const newDate = new Date(currentDate)

    if (timeScale === 'months') {
      newDate.setDate(1) // Align to first day of month
    } else if (timeScale === 'weeks') {
      // Align to Monday of current week
      const dayOfWeek = newDate.getDay()
      const diff = newDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      newDate.setDate(diff)
    }

    setCurrentDate(newDate)
  }, [timeScale])

  const loadCronogramaData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizacion/${cotizacionId}/fases`)

      if (!response.ok) {
        throw new Error('Error al cargar datos del cronograma')
      }

      const result = await response.json()
      setData(result.data || [])
    } catch (error) {
      console.error('Error loading cronograma data:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del cronograma.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate date range for the timeline
  const getDateRange = () => {
    if (data.length === 0) return { start: new Date(), end: new Date() }

    let minDate = new Date()
    let maxDate = new Date()

    data.forEach(fase => {
      // Check fase dates
      if (fase.fechaInicioPlan) {
        const faseStart = new Date(fase.fechaInicioPlan)
        if (faseStart < minDate) minDate = faseStart
      }
      if (fase.fechaFinPlan) {
        const faseEnd = new Date(fase.fechaFinPlan)
        if (faseEnd > maxDate) maxDate = faseEnd
      }

      // Check EDT dates
      fase.edts.forEach(edt => {
        if (edt.fechaInicioComercial) {
          const edtStart = new Date(edt.fechaInicioComercial)
          if (edtStart < minDate) minDate = edtStart
        }
        if (edt.fechaFinComercial) {
          const edtEnd = new Date(edt.fechaFinComercial)
          if (edtEnd > maxDate) maxDate = edtEnd
        }

        // Check tasks dates too
        edt.tareas?.forEach((task: any) => {
          const taskStart = new Date(task.fechaInicio)
          const taskEnd = new Date(task.fechaFin)

          if (taskStart < minDate) minDate = taskStart
          if (taskEnd > maxDate) maxDate = taskEnd
        })
      })
    })

    return { start: minDate, end: maxDate }
  }

  const dateRange = getDateRange()

  // Generate timeline columns based on current view window
  const generateTimelineColumns = () => {
    const columns = []

    // Use currentDate as the center/starting point for the view window
    let startDate = new Date(currentDate)
    let endDate = new Date(currentDate)

    // Calculate view window based on time scale
    if (timeScale === 'months') {
      // Show 6 months view: 3 before and 3 after current month
      startDate.setMonth(startDate.getMonth() - 3)
      startDate.setDate(1) // First day of month
      endDate.setMonth(endDate.getMonth() + 3)
      endDate.setDate(0) // Last day of month
    } else if (timeScale === 'weeks') {
      // Show 8 weeks view: 4 before and 4 after current week
      const dayOfWeek = startDate.getDay()
      const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      startDate.setDate(diff - 28) // 4 weeks before
      endDate.setDate(diff + 27) // 4 weeks after (end of 4th week)
    } else { // days
      // Show zoomLevel * 10 days view
      startDate.setDate(startDate.getDate() - zoomLevel * 5)
      endDate.setDate(endDate.getDate() + zoomLevel * 5)
    }

    const current = new Date(startDate)

    while (current <= endDate) {
      columns.push(new Date(current))

      if (timeScale === 'months') {
        current.setMonth(current.getMonth() + 1)
      } else if (timeScale === 'weeks') {
        current.setDate(current.getDate() + 7)
      } else { // days
        current.setDate(current.getDate() + zoomLevel)
      }
    }

    return columns
  }

  const timelineColumns = React.useMemo(() => generateTimelineColumns(), [currentDate, timeScale, zoomLevel, data])

  // Calculate position and width for a task bar
  const calculateBarPosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const timelineStart = timelineColumns[0]
    const timelineEnd = timelineColumns[timelineColumns.length - 1]

    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    const taskDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    const leftPercent = ((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100
    const widthPercent = (taskDays / totalDays) * 100

    return {
      left: Math.max(0, leftPercent),
      width: Math.min(100 - leftPercent, widthPercent)
    }
  }

  // Get color based on status
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'completado': return 'bg-green-600 hover:bg-green-700'
      case 'en_progreso': return 'bg-blue-600 hover:bg-blue-700'
      case 'planificado': return 'bg-gray-600 hover:bg-gray-700'
      case 'detenido': return 'bg-yellow-600 hover:bg-yellow-700'
      case 'cancelado': return 'bg-red-600 hover:bg-red-700'
      default: return 'bg-gray-600 hover:bg-gray-700'
    }
  }

  // Get EDT color (always green for EDTs)
  const getEdtColor = () => {
    return 'bg-green-600 hover:bg-green-700'
  }

  // Get priority color
  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'border-l-red-500'
      case 'alta': return 'border-l-orange-500'
      case 'media': return 'border-l-yellow-500'
      case 'baja': return 'border-l-green-500'
      default: return 'border-l-gray-500'
    }
  }

  // Navigate timeline
  const navigateTimeline = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)

    if (timeScale === 'months') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (timeScale === 'weeks') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else { // days
      newDate.setDate(newDate.getDate() + (direction === 'next' ? zoomLevel : -zoomLevel))
    }

    setCurrentDate(newDate)
  }

  // Zoom controls
  const zoomIn = () => setZoomLevel(Math.max(7, zoomLevel - 7))
  const zoomOut = () => setZoomLevel(Math.min(90, zoomLevel + 7))

  // ✅ Nuevas funciones para interactividad
  const toggleEdtExpansion = (edtId: string) => {
    setExpandedEdts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(edtId)) {
        newSet.delete(edtId)
      } else {
        newSet.add(edtId)
      }
      return newSet
    })
  }

  const handleTaskClick = (task: any, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click para editar
      setEditingTask(task)
    }
  }

  const handleEdtClick = (edt: any, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click para editar EDT
      setEditingEdt(edt)
    }
  }

  const handleTaskContextMenu = (task: any, event: React.MouseEvent) => {
    event.preventDefault()
    // Aquí podríamos mostrar un menú contextual
    toast({
      title: "Menú contextual",
      description: `Opciones para tarea: ${task.nombre}`,
    })
  }

  const handleDragStart = (task: any, event: React.DragEvent) => {
    setDraggedTask(task)
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setDragOffset(event.clientX - rect.left)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOffset(0)
  }

  const handleDrop = async (event: React.DragEvent, targetDate: Date) => {
    if (!draggedTask) return

    event.preventDefault()

    try {
      // Calcular nueva fecha basada en posición de drop
      const duration = new Date(draggedTask.fechaFin).getTime() - new Date(draggedTask.fechaInicio).getTime()
      const newStartDate = targetDate
      const newEndDate = new Date(targetDate.getTime() + duration)

      // Actualizar tarea en el backend
      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/tarea/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaInicio: newStartDate.toISOString(),
          fechaFin: newEndDate.toISOString()
        })
      })

      if (response.ok) {
        toast({
          title: "Tarea actualizada",
          description: `Fechas de "${draggedTask.nombre}" actualizadas.`,
        })
        loadCronogramaData() // Recargar datos
      } else {
        throw new Error('Error al actualizar tarea')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea.",
        variant: "destructive"
      })
    }

    setDraggedTask(null)
    setDragOffset(0)
  }

  const saveTaskChanges = async (updatedTask: any) => {
    try {
      // Solo enviar campos que han cambiado y son válidos
      const dataToSend: any = {}

      if (updatedTask.nombre?.trim()) {
        dataToSend.nombre = updatedTask.nombre.trim()
      }

      if (updatedTask.fechaInicio) {
        dataToSend.fechaInicio = updatedTask.fechaInicio
      }

      if (updatedTask.fechaFin) {
        dataToSend.fechaFin = updatedTask.fechaFin
      }

      if (updatedTask.estado) {
        dataToSend.estado = updatedTask.estado
      }

      if (updatedTask.prioridad) {
        dataToSend.prioridad = updatedTask.prioridad
      }

      if (updatedTask.descripcion !== undefined) {
        dataToSend.descripcion = updatedTask.descripcion?.trim() || null
      }

      console.log('Enviando datos:', dataToSend) // Debug

      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/tarea/${updatedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Cambios guardados",
          description: `Tarea "${result.data.nombre}" actualizada.`,
        })
        setEditingTask(null)
        loadCronogramaData()
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData) // Debug

        // Mostrar mensaje específico según el error
        let errorMessage = "No se pudieron guardar los cambios."

        if (errorData.error) {
          if (errorData.error.includes('fecha de fin debe ser posterior')) {
            errorMessage = "La fecha de fin debe ser posterior a la fecha de inicio."
          } else if (errorData.error.includes('no puede ser anterior al inicio del EDT')) {
            errorMessage = "La fecha de inicio no puede ser anterior al inicio del EDT padre."
          } else if (errorData.error.includes('no puede ser posterior al fin del EDT')) {
            errorMessage = "La fecha de fin no puede ser posterior al fin del EDT padre."
          } else if (errorData.error.includes('no puede estar vacío')) {
            errorMessage = "El nombre de la tarea no puede estar vacío."
          } else if (errorData.error.includes('no es válida')) {
            errorMessage = "Una o más fechas no son válidas."
          } else {
            errorMessage = errorData.error
          }
        }

        toast({
          title: "Error de validación",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving task:', error) // Debug
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive"
      })
    }
  }

  const saveEdtChanges = async (updatedEdt: any) => {
    try {
      // Solo enviar campos que han cambiado y son válidos
      const dataToSend: any = {}

      if (updatedEdt.nombre?.trim()) {
        dataToSend.nombre = updatedEdt.nombre.trim()
      }

      if (updatedEdt.fechaInicioComercial !== undefined) {
        dataToSend.fechaInicioComercial = updatedEdt.fechaInicioComercial
      }

      if (updatedEdt.fechaFinComercial !== undefined) {
        dataToSend.fechaFinComercial = updatedEdt.fechaFinComercial
      }

      if (updatedEdt.estado) {
        dataToSend.estado = updatedEdt.estado
      }

      if (updatedEdt.prioridad) {
        dataToSend.prioridad = updatedEdt.prioridad
      }

      if (updatedEdt.descripcion !== undefined) {
        dataToSend.descripcion = updatedEdt.descripcion?.trim() || null
      }

      console.log('Enviando datos EDT:', dataToSend) // Debug

      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/edt/${updatedEdt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Cambios guardados",
          description: `EDT "${result.data.nombre}" actualizado.`,
        })
        setEditingEdt(null)
        loadCronogramaData()
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData) // Debug

        // Mostrar mensaje específico según el error
        let errorMessage = "No se pudieron guardar los cambios."

        if (errorData.error) {
          if (errorData.error.includes('fecha de fin debe ser posterior')) {
            errorMessage = "La fecha de fin debe ser posterior a la fecha de inicio."
          } else if (errorData.error.includes('no puede ser anterior al inicio de la fase')) {
            errorMessage = "La fecha de inicio no puede ser anterior al inicio de la fase padre."
          } else if (errorData.error.includes('no puede ser posterior al fin de la fase')) {
            errorMessage = "La fecha de fin no puede ser posterior al fin de la fase padre."
          } else if (errorData.error.includes('no puede estar vacío')) {
            errorMessage = "El nombre del EDT no puede estar vacío."
          } else if (errorData.error.includes('no es válida')) {
            errorMessage = "Una o más fechas no son válidas."
          } else {
            errorMessage = errorData.error
          }
        }

        toast({
          title: "Error de validación",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving EDT:', error) // Debug
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Vista Gantt del Cronograma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Vista Gantt del Cronograma
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Time Scale Selector */}
            <div className="flex items-center gap-1 mr-4">
              <span className="text-xs text-muted-foreground mr-2">Escala:</span>
              <Button
                variant={timeScale === 'days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeScale('days')}
                className="text-xs px-2"
              >
                Días
              </Button>
              <Button
                variant={timeScale === 'weeks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeScale('weeks')}
                className="text-xs px-2"
              >
                Semanas
              </Button>
              <Button
                variant={timeScale === 'months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeScale('months')}
                className="text-xs px-2"
              >
                Meses
              </Button>
            </div>

            {/* Display Options */}
            <Button
              variant={compactMode ? "default" : "outline"}
              size="sm"
              onClick={() => setCompactMode(!compactMode)}
              title={compactMode ? "Cambiar a vista normal" : "Cambiar a vista compacta"}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant={showLabels ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
              title={showLabels ? "Ocultar etiquetas" : "Mostrar etiquetas"}
            >
              📝
            </Button>
            <Button
              variant={showTooltips ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTooltips(!showTooltips)}
              title={showTooltips ? "Ocultar tooltips" : "Mostrar tooltips"}
            >
              💡
            </Button>

            {/* Zoom Controls - Only show for days scale */}
            {timeScale === 'days' && (
              <>
                <Button variant="outline" size="sm" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Current Date Range Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-md">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {timelineColumns.length > 0 && (() => {
                  const startDate = timelineColumns[0]
                  const endDate = timelineColumns[timelineColumns.length - 1]

                  if (timeScale === 'months') {
                    const startMonth = startDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
                    const endMonth = endDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
                    return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`
                  } else if (timeScale === 'weeks') {
                    return `${startDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  } else { // days
                    return `${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  }
                })()}
              </span>
            </div>

            {/* Navigation Controls */}
            <Button variant="outline" size="sm" onClick={() => navigateTimeline('prev')} title={`Ir al ${timeScale === 'months' ? 'mes' : timeScale === 'weeks' ? 'semana' : 'periodo'} anterior`}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateTimeline('next')} title={`Ir al ${timeScale === 'months' ? 'mes' : timeScale === 'weeks' ? 'semana' : 'periodo'} siguiente`}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay fases definidas</h3>
            <p className="text-muted-foreground">
              Crea fases para organizar el cronograma de la cotización en formato Gantt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Timeline Header */}
              <div className={`flex border-b ${compactMode ? 'mb-2' : 'mb-4'}`}>
                <div className={`${compactMode ? 'w-44' : 'w-60'} ${compactMode ? 'p-2' : 'p-4'} font-medium border-r bg-muted/50 text-sm`} style={{ width: compactMode ? '180px' : '240px' }}>
                  EDT / Tarea
                </div>
                <div
                  className="flex-1 flex relative"
                  onDrop={(e) => {
                    e.preventDefault()
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const percentage = x / rect.width
                    const timelineStart = timelineColumns[0]
                    const timelineEnd = timelineColumns[timelineColumns.length - 1]
                    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
                    const targetDate = new Date(timelineStart.getTime() + (percentage * totalDays))
                    handleDrop(e, targetDate)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {/* Today line indicator */}
                  {(() => {
                    const today = new Date()
                    today.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues
                    const timelineStart = new Date(timelineColumns[0])
                    timelineStart.setHours(0, 0, 0, 0) // Start of day
                    const timelineEnd = new Date(timelineColumns[timelineColumns.length - 1])
                    timelineEnd.setHours(23, 59, 59, 999) // End of day
                    
                    const totalMilliseconds = timelineEnd.getTime() - timelineStart.getTime()
                    const todayMilliseconds = today.getTime() - timelineStart.getTime()
                    const todayPosition = (todayMilliseconds / totalMilliseconds) * 100

                    if (todayPosition >= 0 && todayPosition <= 100) {
                      return (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-[1] pointer-events-none"
                          style={{ left: `${todayPosition}%` }}
                          title={`Hoy: ${today.toLocaleDateString('es-ES')}`}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-red-600 font-bold text-xs whitespace-nowrap bg-white/90 px-1 rounded shadow-sm">
                            HOY
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {timelineColumns.map((date, index) => (
                    <div
                      key={index}
                      className={`flex-1 ${compactMode ? 'p-1' : 'p-2'} text-center ${compactMode ? 'text-xs' : 'text-sm'} border-r min-w-20`}
                    >
                      {timeScale === 'days'
                        ? date.getDate().toString()
                        : timeScale === 'weeks'
                        ? date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toLowerCase()
                        : date.toLocaleDateString('es-ES', { month: 'short' })
                      }
                    </div>
                  ))}
                </div>
              </div>

              {/* Gantt Rows */}
              <div className={compactMode ? "space-y-1" : "space-y-2"}>
                {data.map((fase) => (
                  <div key={fase.id}>
                    {/* Fase Header Row */}
                    <div className={`flex border-2 border-blue-200 rounded-lg overflow-hidden ${compactMode ? 'h-12' : 'h-20'} bg-blue-50`}>
                      <div className={`${compactMode ? 'w-44' : 'w-60'} ${compactMode ? 'p-2' : 'p-4'} bg-blue-100 border-r flex flex-col justify-center`} style={{ width: compactMode ? '180px' : '240px' }}>
                        <div className={`font-bold ${compactMode ? 'text-sm leading-tight' : 'text-lg'} truncate text-blue-900`}>
                          📋 {fase.nombre}
                        </div>
                        <div className={`text-blue-700 flex items-center gap-1 ${compactMode ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                          <Calendar className={`h-3 w-3 ${compactMode ? 'hidden' : 'block'}`} />
                          <span className="truncate">
                            {fase.fechaInicioPlan && fase.fechaFinPlan ?
                              `${new Date(fase.fechaInicioPlan).toLocaleDateString('es-ES')} - ${new Date(fase.fechaFinPlan).toLocaleDateString('es-ES')}` :
                              'Fechas no definidas'
                            }
                          </span>
                        </div>
                        <div className={`flex gap-1 ${compactMode ? 'mt-0.5' : 'mt-1'}`}>
                          <Badge variant="outline" className={`${compactMode ? 'text-[10px] px-1 py-0 h-4' : 'text-xs'} leading-tight bg-blue-200 text-blue-800`}>
                            #{fase.orden} - {fase.nombre}
                          </Badge>
                          <Badge variant="secondary" className={`${compactMode ? 'text-[10px] px-1 py-0 h-4' : 'text-xs'} leading-tight`}>
                            {fase.estado.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className={`flex-1 relative ${compactMode ? 'h-12' : 'h-20'} bg-blue-25`}>
                        {fase.fechaInicioPlan && fase.fechaFinPlan && (() => {
                          const { left, width } = calculateBarPosition(fase.fechaInicioPlan, fase.fechaFinPlan)
                          return (
                            <>
                              <div
                                className={`absolute ${compactMode ? 'top-1 bottom-1' : 'top-2 bottom-2'} bg-blue-600 rounded`}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  minWidth: compactMode ? '30px' : '80px'
                                }}
                              />
                              {showLabels && (
                                <div
                                  className={`absolute ${compactMode ? 'top-1 bottom-1 left-2' : 'top-2 bottom-2 left-2'} text-blue-800 font-bold ${compactMode ? 'text-xs' : 'text-sm'}`}
                                  style={{
                                    left: `${left}%`,
                                    maxWidth: `${width}%`,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  📋 {fase.nombre}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* EDTs within this fase */}
                    {fase.edts.map((edt) => (
                      <div key={edt.id} className={`${compactMode ? 'ml-4' : 'ml-6'}`}>
                        {/* EDT Row */}
                        <div className={`flex border-2 rounded-lg overflow-hidden ${compactMode ? 'h-14' : 'h-20'} ${getPriorityColor(edt.prioridad)}`}>
                          <div className={`${compactMode ? 'w-44' : 'w-60'} ${compactMode ? 'p-1.5' : 'p-3'} bg-muted/30 border-r flex items-center justify-between`} style={{ width: compactMode ? '180px' : '240px' }}>
                            <div className="flex flex-col justify-center flex-1 min-h-0">
                              <div className={`font-medium ${compactMode ? 'text-xs leading-tight' : 'text-sm'} truncate`}>
                                🔧 {edt.nombre}
                              </div>
                              <div className={`text-muted-foreground flex items-center gap-1 ${compactMode ? 'text-[10px] mt-0.5' : 'text-xs mt-1'}`}>
                                <Calendar className={`h-2.5 w-2.5 ${compactMode ? 'hidden' : 'block'}`} />
                                <span className="truncate">
                                  {edt.fechaInicioComercial && edt.fechaFinComercial ?
                                    `${new Date(edt.fechaInicioComercial).toLocaleDateString('es-ES')} - ${new Date(edt.fechaFinComercial).toLocaleDateString('es-ES')}` :
                                    'Fechas no definidas'
                                  }
                                </span>
                              </div>
                              <div className={`flex gap-1 ${compactMode ? 'mt-0.5' : 'mt-1'}`}>
                                <Badge variant="outline" className={`${compactMode ? 'text-[9px] px-1 py-0 h-3' : 'text-[10px] px-1 py-0 h-4'} leading-tight`}>
                                  {edt.prioridad}
                                </Badge>
                                <Badge variant="secondary" className={`${compactMode ? 'text-[9px] px-1 py-0 h-3' : 'text-[10px] px-1 py-0 h-4'} leading-tight`}>
                                  {edt.estado.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            {/* Botón expandir/colapsar */}
                            {edt.tareas && edt.tareas.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEdtExpansion(edt.id)}
                                className="h-6 w-6 p-0 ml-2"
                                title={expandedEdts.has(edt.id) ? "Colapsar tareas" : "Expandir tareas"}
                              >
                                <ChevronDown
                                  className={`h-3 w-3 transition-transform ${expandedEdts.has(edt.id) ? 'rotate-180' : ''}`}
                                />
                              </Button>
                            )}
                          </div>
                          <div className={`flex-1 relative ${compactMode ? 'h-14' : 'h-20'} bg-gray-50`}>
                            {edt.fechaInicioComercial && edt.fechaFinComercial && (() => {
                              const { left, width } = calculateBarPosition(edt.fechaInicioComercial, edt.fechaFinComercial)
                              const edtStart = new Date(edt.fechaInicioComercial)
                              const edtEnd = new Date(edt.fechaFinComercial)
                              const durationDays = Math.ceil((edtEnd.getTime() - edtStart.getTime()) / (1000 * 60 * 60 * 24))

                              return (
                                <>
                                  <div
                                    className={`absolute ${compactMode ? 'top-2 bottom-2' : 'top-3 bottom-3'} ${getEdtColor()} rounded cursor-pointer transition-colors`}
                                    style={{
                                      left: `${left}%`,
                                      width: `${width}%`,
                                      minWidth: compactMode ? '40px' : '100px'
                                    }}
                                    title={showTooltips ? `EDT: ${edt.nombre}\nInicio: ${edtStart.toLocaleDateString('es-ES')}\nFin: ${edtEnd.toLocaleDateString('es-ES')}\nDuración: ${durationDays} día(s)\nEstado: ${edt.estado}\nPrioridad: ${edt.prioridad}\nCategoría: ${edt.categoriaServicio?.nombre || 'Sin categoría'}\nResponsable: ${edt.responsable?.name || 'No asignado'}\nTareas: ${edt.tareas?.length || 0}\n\n💡 Ctrl+Click para editar` : undefined}
                                    onClick={(e) => handleEdtClick(edt, e)}
                                  />
                                  {showLabels && (
                                    <div
                                      className={`absolute ${compactMode ? 'top-2 bottom-2 left-2' : 'top-3 bottom-3 left-2'} text-green-700 font-medium ${compactMode ? 'text-xs' : 'text-sm'}`}
                                      style={{
                                        left: `${left}%`,
                                        maxWidth: `${width}%`,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {edt.horasEstimadas ? `${edt.horasEstimadas}h` : '🔧'}
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Tasks Rows - Solo mostrar si EDT está expandido */}
                        {edt.tareas && edt.tareas.length > 0 && expandedEdts.has(edt.id) && (
                          <div className={`${compactMode ? 'ml-4' : 'ml-6'} relative`}>
                            {/* Container con altura dinámica basada en número de tareas */}
                            <div
                              className="relative"
                              style={{
                                height: `${edt.tareas.length * (compactMode ? 36 : 44)}px`,
                                minHeight: compactMode ? '36px' : '44px'
                              }}
                            >
                              {/* Task bars positioned absolutely in the timeline area */}
                              {edt.tareas.map((task: any, taskIndex: number) => {
                                const rowTop = taskIndex * (compactMode ? 36 : 44)
                                const { left, width } = calculateBarPosition(task.fechaInicio, task.fechaFin)
                                const taskStart = new Date(task.fechaInicio)
                                const taskEnd = new Date(task.fechaFin)
                                const durationDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24))

                                return (
                                  <div
                                    key={`bar-${task.id}`}
                                    draggable
                                    className={`absolute ${compactMode ? 'top-1 bottom-1' : 'top-2 bottom-2'} bg-orange-500 rounded cursor-pointer hover:bg-orange-600 transition-all select-none ${
                                      draggedTask?.id === task.id ? 'opacity-50 scale-105' : ''
                                    }`}
                                    style={{
                                      left: `${left}%`,
                                      width: `${width}%`,
                                      minWidth: compactMode ? '20px' : '40px',
                                      top: `${rowTop + (compactMode ? 2 : 4)}px`,
                                      height: compactMode ? '28px' : '36px'
                                    }}
                                    title={showTooltips ? `Tarea: ${task.nombre}\nInicio: ${taskStart.toLocaleDateString('es-ES')}\nFin: ${taskEnd.toLocaleDateString('es-ES')}\nDuración: ${durationDays} día(s)\nEstado: ${task.estado}\nPrioridad: ${task.prioridad}\nResponsable: ${task.responsable?.name || 'No asignado'}\n\n💡 Ctrl+Click para editar\n🎯 Arrastrar para mover` : undefined}
                                    onClick={(e) => handleTaskClick(task, e)}
                                    onContextMenu={(e) => handleTaskContextMenu(task, e)}
                                    onDragStart={(e) => handleDragStart(task, e)}
                                    onDragEnd={handleDragEnd}
                                  />
                                )
                              })}

                              {/* Task labels positioned absolutely */}
                              {showLabels && edt.tareas.map((task: any, taskIndex: number) => {
                                const rowTop = taskIndex * (compactMode ? 36 : 44)
                                const { left, width } = calculateBarPosition(task.fechaInicio, task.fechaFin)

                                return (
                                  <div
                                    key={`label-${task.id}`}
                                    className={`absolute ${compactMode ? 'top-0.5 left-1' : 'top-1 left-2'} text-orange-700 font-medium leading-tight ${compactMode ? 'text-[10px]' : 'text-xs'} max-w-full`}
                                    style={{
                                      left: `${left}%`,
                                      maxWidth: `calc(${width}% - 8px)`,
                                      top: `${rowTop + (compactMode ? 2 : 4)}px`,
                                      height: compactMode ? '28px' : '36px',
                                      overflow: 'hidden',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical' as any,
                                      lineHeight: compactMode ? '0.9' : '1',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {task.horasEstimadas ? `${task.horasEstimadas}h` : '✅'}
                                  </div>
                                )
                              })}

                              {/* Task info rows (left side) */}
                              {edt.tareas.map((task: any, taskIndex: number) => {
                                const rowTop = taskIndex * (compactMode ? 36 : 44)
                                return (
                                  <div
                                    key={`info-${task.id}`}
                                    className={`absolute left-0 border rounded overflow-hidden ${compactMode ? 'h-8' : 'h-10'}`}
                                    style={{
                                      top: `${rowTop}px`,
                                      width: compactMode ? '180px' : '240px' // Más ancho para mejor legibilidad
                                    }}
                                  >
                                    <div className={`${compactMode ? 'w-44' : 'w-60'} ${compactMode ? 'p-1' : 'p-1.5'} bg-muted/20 border-r h-full flex flex-col justify-center`}>
                                      <div className={`font-medium ${compactMode ? 'text-[10px] leading-tight' : 'text-xs'} max-w-full`} title={task.nombre} style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical' as any,
                                        overflow: 'hidden',
                                        lineHeight: compactMode ? '1.1' : '1.2'
                                      }}>
                                        ✅ {task.nombre}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Modal de edición de tarea */}
    <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarea</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Modifica las propiedades de la tarea seleccionada.
          </p>
        </DialogHeader>
        {editingTask && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-name">Nombre</Label>
              <Input
                id="task-name"
                value={editingTask.nombre || ''}
                onChange={(e) => setEditingTask({ ...editingTask, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-start">Fecha Inicio</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={editingTask.fechaInicio ? new Date(editingTask.fechaInicio).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingTask({
                    ...editingTask,
                    fechaInicio: new Date(e.target.value).toISOString()
                  })}
                />
              </div>
              <div>
                <Label htmlFor="task-end">Fecha Fin</Label>
                <Input
                  id="task-end"
                  type="date"
                  value={editingTask.fechaFin ? new Date(editingTask.fechaFin).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingTask({
                    ...editingTask,
                    fechaFin: new Date(e.target.value).toISOString()
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Prioridad</Label>
                <Select
                  value={editingTask.prioridad || 'media'}
                  onValueChange={(value) => setEditingTask({ ...editingTask, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-status">Estado</Label>
                <Select
                  value={editingTask.estado || 'pendiente'}
                  onValueChange={(value) => setEditingTask({ ...editingTask, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingTask(null)}>
            Cancelar
          </Button>
          <Button onClick={() => editingTask && saveTaskChanges(editingTask)}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de edición de EDT */}
    <Dialog open={!!editingEdt} onOpenChange={(open) => !open && setEditingEdt(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar EDT</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Modifica las propiedades del EDT seleccionado.
          </p>
        </DialogHeader>
        {editingEdt && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edt-name">Nombre</Label>
              <Input
                id="edt-name"
                value={editingEdt.nombre || ''}
                onChange={(e) => setEditingEdt({ ...editingEdt, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edt-start">Fecha Inicio</Label>
                <Input
                  id="edt-start"
                  type="date"
                  value={editingEdt.fechaInicioComercial ? new Date(editingEdt.fechaInicioComercial).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingEdt({
                    ...editingEdt,
                    fechaInicioComercial: new Date(e.target.value).toISOString()
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edt-end">Fecha Fin</Label>
                <Input
                  id="edt-end"
                  type="date"
                  value={editingEdt.fechaFinComercial ? new Date(editingEdt.fechaFinComercial).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingEdt({
                    ...editingEdt,
                    fechaFinComercial: new Date(e.target.value).toISOString()
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edt-priority">Prioridad</Label>
                <Select
                  value={editingEdt.prioridad || 'media'}
                  onValueChange={(value) => setEditingEdt({ ...editingEdt, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edt-status">Estado</Label>
                <Select
                  value={editingEdt.estado || 'planificado'}
                  onValueChange={(value) => setEditingEdt({ ...editingEdt, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planificado">Planificado</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="detenido">Detenido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingEdt(null)}>
            Cancelar
          </Button>
          <Button onClick={() => editingEdt && saveEdtChanges(editingEdt)}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}