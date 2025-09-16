// ===================================================
// 📁 Archivo: SubtareaAccordion.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Componente acordeón para gestionar subtareas
//    Funciones: Lista expandible, CRUD, drag & drop, progreso
//
// 🧠 Funcionalidades:
//    - Acordeón expandible por tarea
//    - Lista de subtareas con acciones CRUD
//    - Drag & drop para reordenar
//    - Indicadores de progreso
//    - Estados de carga y error
//    - Formulario inline para crear/editar
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  MoreHorizontal,
  Save,
  X,
  Pause,
  XCircle,
  User as UserIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

import type { Tarea, Subtarea, User } from '@/types/modelos'
import {
  getSubtareasByTarea,
  createSubtarea,
  updateSubtarea,
  deleteSubtarea,
  reordenarSubtareas
} from '@/lib/services/subtareas'

// 📋 Props del componente
interface SubtareaAccordionProps {
  tareas: Tarea[]
  usuarios?: User[]
  onSubtareaChange?: (tareaId: string, subtareas: Subtarea[]) => void
  className?: string
}

// 🔧 Estado de subtarea para edición inline
interface SubtareaEditState {
  id?: string
  tareaId: string
  nombre: string
  descripcion: string
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'pausada'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  orden: number
  fechaInicio?: string
  fechaFin?: string
  horasEstimadas: number
  horasReales: number
  progreso: number
  asignadoId?: string
}

const SubtareaAccordion: React.FC<SubtareaAccordionProps> = ({
  tareas,
  usuarios = [],
  onSubtareaChange,
  className
}) => {
  // 🔄 Estados del componente
  const [subtareasPorTarea, setSubtareasPorTarea] = useState<Record<string, Subtarea[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [editingSubtarea, setEditingSubtarea] = useState<SubtareaEditState | null>(null)
  const [deletingSubtarea, setDeletingSubtarea] = useState<Subtarea | null>(null)
  const [expandedTareas, setExpandedTareas] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  // 🔄 Cargar subtareas cuando se expande una tarea
  const loadSubtareas = async (tareaId: string) => {
    if (subtareasPorTarea[tareaId]) return // Ya cargadas
    
    try {
      setLoading(prev => ({ ...prev, [tareaId]: true }))
      const subtareas = await getSubtareasByTarea(tareaId)
      setSubtareasPorTarea(prev => ({ ...prev, [tareaId]: subtareas }))
      onSubtareaChange?.(tareaId, subtareas)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las subtareas',
        variant: 'destructive'
      })
    } finally {
      setLoading(prev => ({ ...prev, [tareaId]: false }))
    }
  }

  // 🔄 Manejar expansión de acordeón
  const handleAccordionChange = (tareaId: string, isExpanded: boolean) => {
    const newExpanded = new Set(expandedTareas)
    if (isExpanded) {
      newExpanded.add(tareaId)
      loadSubtareas(tareaId)
    } else {
      newExpanded.delete(tareaId)
    }
    setExpandedTareas(newExpanded)
  }

  // ➕ Iniciar creación de subtarea
  const startCreatingSubtarea = (tareaId: string) => {
    const subtareas = subtareasPorTarea[tareaId] || []
    const siguienteOrden = subtareas.length + 1
    
    setEditingSubtarea({
      tareaId,
      nombre: '',
      descripcion: '',
      estado: 'pendiente',
      prioridad: 'media',
      orden: siguienteOrden,
      horasEstimadas: 0,
      horasReales: 0,
      progreso: 0
    })
  }

  // ✏️ Iniciar edición de subtarea
  const startEditingSubtarea = (subtarea: Subtarea) => {
    setEditingSubtarea({
      id: subtarea.id,
      tareaId: subtarea.tareaId,
      nombre: subtarea.nombre,
      descripcion: subtarea.descripcion || '',
      estado: subtarea.estado,
      prioridad: 'media', // Default priority since Subtarea interface doesn't have prioridad property
      orden: 1, // Default order since Subtarea interface doesn't have orden property
      fechaInicio: subtarea.fechaInicio ? new Date(subtarea.fechaInicio).toISOString().slice(0, 16) : '',
      fechaFin: subtarea.fechaFin ? new Date(subtarea.fechaFin).toISOString().slice(0, 16) : '',
      horasEstimadas: subtarea.horasPlan,
      horasReales: subtarea.horasReales,
      progreso: subtarea.porcentajeCompletado, // Use porcentajeCompletado instead of progreso
      asignadoId: subtarea.asignadoId || ''
    })
  }

  // 💾 Guardar subtarea (crear o actualizar)
  const saveSubtarea = async () => {
    if (!editingSubtarea) return
    
    try {
      const data = {
        ...editingSubtarea,
        fechaInicio: editingSubtarea.fechaInicio || new Date().toISOString().split('T')[0], // Default to today
        fechaFin: editingSubtarea.fechaFin || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days from now
        asignadoId: editingSubtarea.asignadoId || undefined
      }
      
      let resultado: Subtarea
      
      if (editingSubtarea.id) {
        // Actualizar
        resultado = await updateSubtarea(editingSubtarea.id, data)
        toast({
          title: 'Subtarea actualizada',
          description: 'La subtarea se ha actualizado correctamente'
        })
      } else {
        // Crear
        resultado = await createSubtarea(data)
        toast({
          title: 'Subtarea creada',
          description: 'La subtarea se ha creado correctamente'
        })
      }
      
      // Actualizar lista local
      const tareaId = editingSubtarea.tareaId
      const subtareasActuales = subtareasPorTarea[tareaId] || []
      
      let nuevasSubtareas: Subtarea[]
      if (editingSubtarea.id) {
        nuevasSubtareas = subtareasActuales.map(s => s.id === resultado.id ? resultado : s)
      } else {
        nuevasSubtareas = [...subtareasActuales, resultado]
      }
      
      setSubtareasPorTarea(prev => ({ ...prev, [tareaId]: nuevasSubtareas }))
      onSubtareaChange?.(tareaId, nuevasSubtareas)
      setEditingSubtarea(null)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar subtarea'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  // 🗑️ Eliminar subtarea
  const handleDeleteSubtarea = async (subtarea: Subtarea) => {
    try {
      await deleteSubtarea(subtarea.id)
      
      // Actualizar lista local
      const subtareasActuales = subtareasPorTarea[subtarea.tareaId] || []
      const nuevasSubtareas = subtareasActuales.filter(s => s.id !== subtarea.id)
      
      setSubtareasPorTarea(prev => ({ ...prev, [subtarea.tareaId]: nuevasSubtareas }))
      onSubtareaChange?.(subtarea.tareaId, nuevasSubtareas)
      setDeletingSubtarea(null)
      
      toast({
        title: 'Subtarea eliminada',
        description: 'La subtarea se ha eliminado correctamente'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la subtarea',
        variant: 'destructive'
      })
    }
  }

  // 🎨 Configuración de estilos
  const estadoConfig = {
    pendiente: { color: 'bg-gray-100 text-gray-800', icon: Circle, label: 'Pendiente' },
    en_progreso: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'En Progreso' },
    completada: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completada' },
    pausada: { color: 'bg-yellow-100 text-yellow-800', icon: Pause, label: 'Pausada' },
    cancelada: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelada' }
  }

  const prioridadConfig = {
    baja: { color: 'bg-gray-100 text-gray-800', label: 'Baja' },
    media: { color: 'bg-yellow-100 text-yellow-800', label: 'Media' },
    alta: { color: 'bg-orange-100 text-orange-800', label: 'Alta' },
    critica: { color: 'bg-red-100 text-red-800', label: 'Crítica' }
  }

  // 📊 Calcular progreso de tarea basado en subtareas
  const calcularProgresoTarea = (tareaId: string): number => {
    const subtareas = subtareasPorTarea[tareaId] || []
    if (subtareas.length === 0) return 0
    
    const progresoTotal = subtareas.reduce((sum, subtarea) => sum + subtarea.porcentajeCompletado, 0)
    return Math.round(progresoTotal / subtareas.length)
  }

  return (
    <div className={className}>
      <Accordion type="multiple" className="space-y-4">
        {tareas.map((tarea) => {
          const subtareas = subtareasPorTarea[tarea.id] || []
          const isExpanded = expandedTareas.has(tarea.id)
          const isLoading = loading[tarea.id]
          const progresoCalculado = calcularProgresoTarea(tarea.id)
          
          return (
            <AccordionItem key={tarea.id} value={tarea.id} className="border rounded-lg">
              <AccordionTrigger
                className="px-4 py-3 hover:no-underline"
                onClick={() => handleAccordionChange(tarea.id, !isExpanded)}
              >
                <div className="flex items-center justify-between w-full mr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">{tarea.nombre}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={estadoConfig[tarea.estado].color}>
                        {estadoConfig[tarea.estado].label}
                      </Badge>
                      
                      <Badge variant="outline" className={prioridadConfig[tarea.prioridad].color}>
                        {prioridadConfig[tarea.prioridad].label}
                      </Badge>
                      
                      {subtareas.length > 0 && (
                        <Badge variant="secondary">
                          {subtareas.length} subtarea{subtareas.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {subtareas.length > 0 && (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={progresoCalculado} className="w-16" />
                        <span className="text-sm text-muted-foreground">
                          {progresoCalculado}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {/* 📝 Descripción de la tarea */}
                      {tarea.descripcion && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                          {tarea.descripcion}
                        </div>
                      )}
                      
                      {/* ➕ Botón para agregar subtarea */}
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Subtareas</h4>
                        <Button
                          size="sm"
                          onClick={() => startCreatingSubtarea(tarea.id)}
                          disabled={Boolean(editingSubtarea)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar Subtarea
                        </Button>
                      </div>
                      
                      {/* 🔄 Estado de carga */}
                      {isLoading && (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      )}
                      
                      {/* 📋 Lista de subtareas */}
                      {!isLoading && (
                        <div className="space-y-2">
                          {subtareas.map((subtarea, index) => {
                            const EstadoIcon = estadoConfig[subtarea.estado].icon
                            const usuarioAsignado = usuarios.find(u => u.id === subtarea.asignadoId)
                            
                            return (
                              <motion.div
                                key={subtarea.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <Card className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                      
                                      <EstadoIcon className="h-4 w-4" />
                                      
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{subtarea.nombre}</span>
                                          <Badge variant="outline" className={prioridadConfig['media'].color}>
                                            {prioridadConfig['media'].label}
                                          </Badge>
                                        </div>
                                        
                                        {subtarea.descripcion && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {subtarea.descripcion}
                                          </p>
                                        )}
                                        
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                          {usuarioAsignado && (
                                            <div className="flex items-center gap-1">
                                              <UserIcon className="h-3 w-3" />
                                               {usuarioAsignado.name}
                                            </div>
                                          )}
                                          
                                          {subtarea.horasPlan > 0 && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {subtarea.horasPlan}h est.
                                            </div>
                                          )}
                                          
                                          <div className="flex items-center gap-2">
                                            <Progress value={subtarea.porcentajeCompletado} className="w-12 h-2" />
                                             <span>{subtarea.porcentajeCompletado}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => startEditingSubtarea(subtarea)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => setDeletingSubtarea(subtarea)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Eliminar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </Card>
                              </motion.div>
                            )
                          })}
                          
                          {/* 📝 Formulario de edición inline */}
                          {editingSubtarea && editingSubtarea.tareaId === tarea.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <Card className="p-4 border-primary">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">
                                      {editingSubtarea.id ? 'Editar Subtarea' : 'Nueva Subtarea'}
                                    </h5>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingSubtarea(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <Input
                                        placeholder="Nombre de la subtarea"
                                        value={editingSubtarea.nombre}
                                        onChange={(e) => setEditingSubtarea(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                                      />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                      <Textarea
                                        placeholder="Descripción (opcional)"
                                        value={editingSubtarea.descripcion}
                                        onChange={(e) => setEditingSubtarea(prev => prev ? { ...prev, descripcion: e.target.value } : null)}
                                        rows={2}
                                      />
                                    </div>
                                    
                                    <Select
                                      value={editingSubtarea.estado}
                                      onValueChange={(value: any) => setEditingSubtarea(prev => prev ? { ...prev, estado: value } : null)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(estadoConfig).map(([key, config]) => (
                                          <SelectItem key={key} value={key}>
                                            {config.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Select
                                      value={editingSubtarea.prioridad}
                                      onValueChange={(value: any) => setEditingSubtarea(prev => prev ? { ...prev, prioridad: value } : null)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(prioridadConfig).map(([key, config]) => (
                                          <SelectItem key={key} value={key}>
                                            {config.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Input
                                      type="number"
                                      placeholder="Horas estimadas"
                                      value={editingSubtarea.horasEstimadas}
                                      onChange={(e) => setEditingSubtarea(prev => prev ? { ...prev, horasEstimadas: Number(e.target.value) } : null)}
                                    />
                                    
                                    <Input
                                      type="number"
                                      placeholder="Progreso (%)"
                                      min="0"
                                      max="100"
                                      value={editingSubtarea.progreso}
                                      onChange={(e) => setEditingSubtarea(prev => prev ? { ...prev, progreso: Number(e.target.value) } : null)}
                                    />
                                  </div>
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setEditingSubtarea(null)}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button onClick={saveSubtarea}>
                                      <Save className="h-4 w-4 mr-2" />
                                      Guardar
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )}
                          
                          {/* 📭 Estado vacío */}
                          {subtareas.length === 0 && !editingSubtarea && (
                            <div className="text-center py-8 text-muted-foreground">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No hay subtareas para esta tarea</p>
                              <p className="text-sm">Haz clic en "Agregar Subtarea" para comenzar</p>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      
      {/* 🗑️ Diálogo de confirmación para eliminar */}
      <AlertDialog open={Boolean(deletingSubtarea)} onOpenChange={() => setDeletingSubtarea(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar subtarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La subtarea "{deletingSubtarea?.nombre}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSubtarea && handleDeleteSubtarea(deletingSubtarea)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SubtareaAccordion