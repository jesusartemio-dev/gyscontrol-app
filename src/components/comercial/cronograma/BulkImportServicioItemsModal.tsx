'use client'

/**
 * 📦 BulkImportServicioItemsModal - Modal para importación masiva de ítems de servicio
 *
 * Modal de 3 pasos para crear múltiples tareas desde ítems de servicio:
 * 1. Selección de ítems
 * 2. Configuración de tareas
 * 3. Mapeo de dependencias
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Package,
  Settings,
  Link,
  Search,
  Clock,
  DollarSign,
  GripVertical,
  X
} from 'lucide-react'

interface CotizacionServicioItem {
  id: string
  nombre: string
  descripcion?: string
  categoria: string
  cantidad: number
  horaTotal: number
  costoInterno: number
  costoCliente: number
  recursoNombre?: string
  unidadServicioNombre?: string
  orden?: number
  yaImportado?: boolean
  tareaExistente?: {
    id: string
    nombre: string
  } | null
}

interface TaskConfig {
  servicioItemId: string
  nombre: string
  descripcion?: string
  fechaInicio: string
  fechaFin: string
  horasEstimadas: number
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  responsableId?: string
}

interface Dependency {
  id: string
  fromTaskIndex: number
  toTaskIndex: number
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  label: string
}

interface BulkImportServicioItemsModalProps {
  cotizacionId: string
  edtId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 1 | 2 | 3

export function BulkImportServicioItemsModal({
  cotizacionId,
  edtId,
  isOpen,
  onClose,
  onSuccess
}: BulkImportServicioItemsModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [servicioItems, setServicioItems] = useState<CotizacionServicioItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [taskConfigs, setTaskConfigs] = useState<TaskConfig[]>([])
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  // Cargar ítems de servicio disponibles
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadServicioItems()
    }
  }, [isOpen, currentStep])

  // Inicializar configuraciones de tareas cuando se seleccionan ítems
  useEffect(() => {
    if (selectedItems.size > 0 && currentStep === 2) {
      initializeTaskConfigs()
    }
  }, [selectedItems, currentStep])

  const loadServicioItems = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/${edtId}/servicio-items`)

      if (!response.ok) {
        throw new Error('Error al cargar ítems de servicio')
      }

      const data = await response.json()
      setServicioItems(data.data || [])
    } catch (error) {
      console.error('Error loading servicio items:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los ítems de servicio.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeTaskConfigs = () => {
    const selectedServicioItems = servicioItems.filter(item => selectedItems.has(item.id))
    const configs: TaskConfig[] = selectedServicioItems.map(item => ({
      servicioItemId: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion,
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: calculateFechaFin(new Date().toISOString().split('T')[0], item.horaTotal),
      horasEstimadas: item.horaTotal,
      prioridad: 'media' as const,
      responsableId: undefined
    }))
    setTaskConfigs(configs)
  }

  const calculateFechaFin = (fechaInicio: string, horasTotales: number): string => {
    if (!fechaInicio || !horasTotales || horasTotales <= 0) return fechaInicio

    const fechaInicioDate = new Date(fechaInicio)
    const diasTrabajo = Math.ceil(horasTotales / 8) // 8 horas por día

    let diasAgregados = 0
    let fechaActual = new Date(fechaInicioDate)

    while (diasAgregados < diasTrabajo) {
      fechaActual.setDate(fechaActual.getDate() + 1)
      // Solo contar días hábiles (0 = domingo, 6 = sábado)
      if (fechaActual.getDay() !== 0 && fechaActual.getDay() !== 6) {
        diasAgregados++
      }
    }

    return fechaActual.toISOString().split('T')[0]
  }

  const handleItemSelection = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredItems.map(item => item.id)
      setSelectedItems(new Set(allIds))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleTaskConfigChange = (index: number, field: keyof TaskConfig, value: any) => {
    const newConfigs = [...taskConfigs]
    newConfigs[index] = { ...newConfigs[index], [field]: value }

    // Auto-calcular fecha fin si cambian fecha inicio o horas
    if (field === 'fechaInicio' || field === 'horasEstimadas') {
      const config = newConfigs[index]
      if (config.fechaInicio && config.horasEstimadas > 0) {
        config.fechaFin = calculateFechaFin(config.fechaInicio, config.horasEstimadas)
      }
    }

    setTaskConfigs(newConfigs)
  }

  const handleNext = () => {
    if (currentStep === 1 && selectedItems.size === 0) {
      toast({
        title: 'Selección requerida',
        description: 'Debe seleccionar al menos un ítem de servicio.',
        variant: 'destructive'
      })
      return
    }

    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Preparar datos para el envío
      const batchData = {
        tasks: taskConfigs.map(config => ({
          nombre: config.nombre,
          descripcion: config.descripcion,
          fechaInicioCom: config.fechaInicio ? new Date(config.fechaInicio).toISOString() : undefined,
          fechaFinCom: config.fechaFin ? new Date(config.fechaFin).toISOString() : undefined,
          horasCom: config.horasEstimadas,
          prioridad: config.prioridad,
          responsableId: config.responsableId,
          cotizacionServicioItemId: config.servicioItemId
        })),
        dependencies: dependencies.map(dep => ({
          fromTaskIndex: dep.fromTaskIndex,
          toTaskIndex: dep.toTaskIndex,
          type: dep.type
        }))
      }

      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/${edtId}/tareas/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchData)
      })

      if (!response.ok) {
        throw new Error('Error al crear las tareas')
      }

      const result = await response.json()

      toast({
        title: 'Éxito',
        description: `Se crearon ${result.createdTasks?.length || 0} tareas exitosamente.`
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error creating tasks:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron crear las tareas.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setSelectedItems(new Set())
    setTaskConfigs([])
    setDependencies([])
    setSearchTerm('')
    onClose()
  }

  const filteredItems = servicioItems.filter(item =>
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const progressValue = (currentStep / 3) * 100

  const stepTitles = {
    1: 'Seleccionar Ítems de Servicio',
    2: 'Configurar Tareas',
    3: 'Definir Dependencias'
  }

  const stepDescriptions = {
    1: 'Selecciona los ítems de servicio que deseas convertir en tareas',
    2: 'Configura las propiedades de cada tarea seleccionada',
    3: 'Define las dependencias entre las tareas creadas'
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Importar Tareas desde Ítems de Servicio
          </DialogTitle>
          <DialogDescription>
            {stepDescriptions[currentStep]}
          </DialogDescription>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Paso {currentStep} de 3</span>
              <span>{Math.round(progressValue)}% completado</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <Step1ItemSelection
              items={filteredItems}
              selectedItems={selectedItems}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onItemSelection={handleItemSelection}
              onSelectAll={handleSelectAll}
              loading={loading}
            />
          )}

          {currentStep === 2 && (
            <Step2TaskConfiguration
              taskConfigs={taskConfigs}
              servicioItems={servicioItems}
              onConfigChange={handleTaskConfigChange}
            />
          )}

          {currentStep === 3 && (
            <Step3DependencyMapping
              taskConfigs={taskConfigs}
              servicioItems={servicioItems}
              dependencies={dependencies}
              onDependenciesChange={setDependencies}
              onTaskConfigsChange={setTaskConfigs}
            />
          )}
        </div>

        {/* Navigation Footer */}
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={selectedItems.size === 0}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creando...' : 'Crear Tareas'}
                <Check className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Step 1: Item Selection Component
function Step1ItemSelection({
  items,
  selectedItems,
  searchTerm,
  onSearchChange,
  onItemSelection,
  onSelectAll,
  loading
}: {
  items: CotizacionServicioItem[]
  selectedItems: Set<string>
  searchTerm: string
  onSearchChange: (value: string) => void
  onItemSelection: (itemId: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  loading: boolean
}) {
  const allSelected = items.length > 0 && selectedItems.size === items.length
  const someSelected = selectedItems.size > 0 && selectedItems.size < items.length

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ítems de servicio..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Select All */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all"
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className={someSelected ? "data-[state=checked]:bg-orange-500" : ""}
        />
        <Label htmlFor="select-all" className="text-sm font-medium">
          Seleccionar todos ({items.length} ítems)
        </Label>
      </div>

      <Separator />

      {/* Items List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando ítems de servicio...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron ítems de servicio
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
            >
              <Checkbox
                id={`item-${item.id}`}
                checked={selectedItems.has(item.id)}
                onCheckedChange={(checked) => onItemSelection(item.id, checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor={`item-${item.id}`} className="font-medium text-sm cursor-pointer">
                    {item.nombre}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {item.categoria}
                  </Badge>
                </div>
                {item.descripcion && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {item.descripcion}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.horaTotal}h
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${item.costoInterno.toFixed(2)}
                  </span>
                  {item.recursoNombre && (
                    <span>Recurso: {item.recursoNombre}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedItems.size > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedItems.size} ítem(s) seleccionado(s)
        </div>
      )}
    </div>
  )
}

// Step 2: Task Configuration Component
function Step2TaskConfiguration({
  taskConfigs,
  servicioItems,
  onConfigChange
}: {
  taskConfigs: TaskConfig[]
  servicioItems: CotizacionServicioItem[]
  onConfigChange: (index: number, field: keyof TaskConfig, value: any) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Configura las propiedades de cada tarea. Los valores se calculan automáticamente basándose en los ítems de servicio.
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {taskConfigs.map((config, index) => {
          const servicioItem = servicioItems.find(item => item.id === config.servicioItemId)

          return (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Tarea {index + 1}: {servicioItem?.nombre}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`nombre-${index}`} className="text-xs">Nombre de la Tarea</Label>
                  <Input
                    id={`nombre-${index}`}
                    value={config.nombre}
                    onChange={(e) => onConfigChange(index, 'nombre', e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor={`prioridad-${index}`} className="text-xs">Prioridad</Label>
                  <Select
                    value={config.prioridad}
                    onValueChange={(value) => onConfigChange(index, 'prioridad', value)}
                  >
                    <SelectTrigger className="text-sm">
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
                  <Label htmlFor={`fechaInicio-${index}`} className="text-xs">Fecha Inicio</Label>
                  <Input
                    id={`fechaInicio-${index}`}
                    type="date"
                    value={config.fechaInicio}
                    onChange={(e) => onConfigChange(index, 'fechaInicio', e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor={`fechaFin-${index}`} className="text-xs">Fecha Fin</Label>
                  <Input
                    id={`fechaFin-${index}`}
                    type="date"
                    value={config.fechaFin}
                    onChange={(e) => onConfigChange(index, 'fechaFin', e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor={`horas-${index}`} className="text-xs">Horas Estimadas</Label>
                  <Input
                    id={`horas-${index}`}
                    type="number"
                    step="0.5"
                    value={config.horasEstimadas}
                    onChange={(e) => onConfigChange(index, 'horasEstimadas', parseFloat(e.target.value) || 0)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`descripcion-${index}`} className="text-xs">Descripción</Label>
                <Textarea
                  id={`descripcion-${index}`}
                  value={config.descripcion || ''}
                  onChange={(e) => onConfigChange(index, 'descripcion', e.target.value)}
                  placeholder="Descripción de la tarea..."
                  className="text-sm"
                  rows={2}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Step 3: Advanced Dependency Mapping Component
function Step3DependencyMapping({
  taskConfigs,
  servicioItems,
  dependencies,
  onDependenciesChange,
  onTaskConfigsChange
}: {
  taskConfigs: TaskConfig[]
  servicioItems: CotizacionServicioItem[]
  dependencies: Dependency[]
  onDependenciesChange: (deps: Dependency[]) => void
  onTaskConfigsChange: (configs: TaskConfig[]) => void
}) {
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [draggedTask, setDraggedTask] = useState<number | null>(null)
  const [dragOverTask, setDragOverTask] = useState<number | null>(null)
  const { toast } = useToast()

  // Dependency type labels
  const dependencyTypes = {
    finish_to_start: 'Termina → Comienza',
    start_to_start: 'Comienza → Comienza',
    finish_to_finish: 'Termina → Termina',
    start_to_finish: 'Comienza → Termina'
  }

  // Validate dependency cycles
  const hasCycle = (newDeps: Dependency[]): boolean => {
    const graph: { [key: number]: number[] } = {}

    // Build adjacency list
    newDeps.forEach(dep => {
      if (!graph[dep.fromTaskIndex]) graph[dep.fromTaskIndex] = []
      graph[dep.fromTaskIndex].push(dep.toTaskIndex)
    })

    // DFS to detect cycles
    const visited = new Set<number>()
    const recStack = new Set<number>()

    const hasCycleDFS = (node: number): boolean => {
      if (recStack.has(node)) return true
      if (visited.has(node)) return false

      visited.add(node)
      recStack.add(node)

      const neighbors = graph[node] || []
      for (const neighbor of neighbors) {
        if (hasCycleDFS(neighbor)) return true
      }

      recStack.delete(node)
      return false
    }

    for (let i = 0; i < taskConfigs.length; i++) {
      if (hasCycleDFS(i)) return true
    }

    return false
  }

  const addDependency = (fromIndex: number, toIndex: number, type: Dependency['type']) => {
    if (fromIndex === toIndex) return // No self-dependencies

    // Check if dependency already exists
    const existingDep = dependencies.find(dep =>
      dep.fromTaskIndex === fromIndex && dep.toTaskIndex === toIndex
    )
    if (existingDep) return

    const newDeps = [...dependencies, {
      id: `dep-${fromIndex}-${toIndex}-${Date.now()}`,
      fromTaskIndex: fromIndex,
      toTaskIndex: toIndex,
      type,
      label: dependencyTypes[type]
    }]

    // Validate cycles
    if (hasCycle(newDeps)) {
      toast({
        title: 'Error de dependencia',
        description: 'Esta dependencia crearía un ciclo. No se puede agregar.',
        variant: 'destructive'
      })
      return
    }

    onDependenciesChange(newDeps)
  }

  const removeDependency = (depId: string) => {
    onDependenciesChange(dependencies.filter(dep => dep.id !== depId))
  }

  const handleDragStart = (e: React.DragEvent, taskIndex: number) => {
    setDraggedTask(taskIndex)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, taskIndex: number) => {
    e.preventDefault()
    setDragOverTask(taskIndex)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverTask(null)
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedTask === null || draggedTask === targetIndex) return

    // Reorder tasks
    const newConfigs = [...taskConfigs]
    const [removed] = newConfigs.splice(draggedTask, 1)
    newConfigs.splice(targetIndex, 0, removed)

    // Update dependencies to reflect new indices
    const updatedDeps = dependencies.map(dep => ({
      ...dep,
      fromTaskIndex: dep.fromTaskIndex === draggedTask ? targetIndex :
                    dep.fromTaskIndex > draggedTask && dep.fromTaskIndex <= targetIndex ? dep.fromTaskIndex - 1 :
                    dep.fromTaskIndex < draggedTask && dep.fromTaskIndex >= targetIndex ? dep.fromTaskIndex + 1 : dep.fromTaskIndex,
      toTaskIndex: dep.toTaskIndex === draggedTask ? targetIndex :
                  dep.toTaskIndex > draggedTask && dep.toTaskIndex <= targetIndex ? dep.toTaskIndex - 1 :
                  dep.toTaskIndex < draggedTask && dep.toTaskIndex >= targetIndex ? dep.toTaskIndex + 1 : dep.toTaskIndex
    }))

    // Update parent component
    onTaskConfigsChange(newConfigs)
    onDependenciesChange(updatedDeps)

    setDraggedTask(null)
    setDragOverTask(null)
  }

  const getDependenciesForTask = (taskIndex: number) => {
    return dependencies.filter(dep => dep.fromTaskIndex === taskIndex || dep.toTaskIndex === taskIndex)
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Define las dependencias entre las tareas y ordena su secuencia. Arrastra las tareas para reordenarlas.
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
        <span className="text-xs font-medium">Tipos de dependencia:</span>
        {Object.entries(dependencyTypes).map(([key, label]) => (
          <Badge key={key} variant="outline" className="text-xs">
            {label}
          </Badge>
        ))}
      </div>

      {/* Task List with Dependencies */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {taskConfigs.map((config, index) => {
          const servicioItem = servicioItems.find(item => item.id === config.servicioItemId)
          const taskDeps = getDependenciesForTask(index)
          const isDraggedOver = dragOverTask === index
          const isDragging = draggedTask === index

          return (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                p-4 border rounded-lg cursor-move transition-all
                ${isDraggedOver ? 'border-primary bg-primary/5' : 'border-border'}
                ${isDragging ? 'opacity-50' : 'opacity-100'}
                hover:shadow-md
              `}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{config.nombre}</span>
                    {servicioItem?.yaImportado && (
                      <Badge variant="secondary" className="text-xs">
                        Ya importado
                      </Badge>
                    )}
                  </div>

                  {taskDeps.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {taskDeps.map(dep => {
                        const isFrom = dep.fromTaskIndex === index
                        const otherTask = isFrom ? taskConfigs[dep.toTaskIndex] : taskConfigs[dep.fromTaskIndex]
                        return (
                          <Badge
                            key={dep.id}
                            variant={isFrom ? "default" : "secondary"}
                            className="text-xs cursor-pointer hover:opacity-80"
                            onClick={() => removeDependency(dep.id)}
                          >
                            {isFrom ? '→' : '←'} {otherTask?.nombre} ({dep.label})
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Dependency Actions */}
                <div className="flex gap-1">
                  {selectedTask !== null && selectedTask !== index && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addDependency(selectedTask, index, 'finish_to_start')}
                        className="h-6 px-2 text-xs"
                      >
                        →
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addDependency(selectedTask, index, 'start_to_start')}
                        className="h-6 px-2 text-xs"
                      >
                        ⇄
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant={selectedTask === index ? "default" : "outline"}
                    onClick={() => setSelectedTask(selectedTask === index ? null : index)}
                    className="h-6 px-2 text-xs"
                  >
                    {selectedTask === index ? 'Cancelar' : 'Conectar'}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {dependencies.length > 0 && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-2">Dependencias definidas ({dependencies.length})</div>
          <div className="space-y-1">
            {dependencies.map(dep => (
              <div key={dep.id} className="flex items-center justify-between text-xs">
                <span>
                  Tarea {dep.fromTaskIndex + 1} <span className="text-muted-foreground">({dep.label})</span> Tarea {dep.toTaskIndex + 1}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeDependency(dep.id)}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTask !== null && (
        <div className="text-xs text-muted-foreground">
          Selecciona otra tarea para crear una dependencia desde "{taskConfigs[selectedTask]?.nombre}"
        </div>
      )}
    </div>
  )
}