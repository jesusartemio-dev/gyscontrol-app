'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Plus, Trash2, AlertTriangle, Link2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

// Tipos de dependencia con descripciones
const TIPOS_DEPENDENCIA = {
  finish_to_start: {
    label: 'Termina-Inicia (FS)',
    descripcion: 'La tarea destino inicia cuando la tarea origen termina',
    icon: '→'
  },
  start_to_start: {
    label: 'Inicia-Inicia (SS)',
    descripcion: 'La tarea destino inicia cuando la tarea origen inicia',
    icon: '⇄'
  },
  finish_to_finish: {
    label: 'Termina-Termina (FF)',
    descripcion: 'La tarea destino termina cuando la tarea origen termina',
    icon: '⇥'
  },
  start_to_finish: {
    label: 'Inicia-Termina (SF)',
    descripcion: 'La tarea destino termina cuando la tarea origen inicia',
    icon: '⇤'
  }
}

interface Tarea {
  id: string
  nombre: string
  fechaInicio?: string | null
  fechaFin?: string | null
  edtNombre?: string
  actividadNombre?: string
  esHito?: boolean
}

interface Dependencia {
  id: string
  tareaOrigen: Tarea
  tareaDependiente: Tarea
  tipo: keyof typeof TIPOS_DEPENDENCIA
}

interface ProyectoDependencyManagerProps {
  proyectoId: string
  cronogramaId?: string
  tareas?: Tarea[]
  onDependenciaChange?: () => void
}

export function ProyectoDependencyManager({
  proyectoId,
  cronogramaId,
  tareas: tareasPropsRaw = [],
  onDependenciaChange
}: ProyectoDependencyManagerProps) {
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dependenciaToDelete, setDependenciaToDelete] = useState<string | null>(null)
  const [tareaOrigenId, setTareaOrigenId] = useState('')
  const [tareaDependienteId, setTareaDependienteId] = useState('')
  const [tipo, setTipo] = useState<keyof typeof TIPOS_DEPENDENCIA>('finish_to_start')
  const [loading, setLoading] = useState(false)
  const [tareasDisponibles, setTareasDisponibles] = useState<Tarea[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  // Cargar tareas disponibles desde la API
  useEffect(() => {
    const cargarTareasDisponibles = async () => {
      if (!isOpen) return

      try {
        const url = cronogramaId
          ? `/api/proyectos/${proyectoId}/cronograma/tareas-disponibles?cronogramaId=${cronogramaId}`
          : `/api/proyectos/${proyectoId}/cronograma/tareas-disponibles`

        const response = await fetch(url, { credentials: 'include' })

        if (response.ok) {
          const data = await response.json()
          setTareasDisponibles(data.data || [])
        } else {
          console.error('Error cargando tareas disponibles')
          // Fallback: usar tareas pasadas como props
          if (tareasPropsRaw.length > 0) {
            setTareasDisponibles(tareasPropsRaw)
          }
        }
      } catch (error) {
        console.error('Error cargando tareas:', error)
        // Fallback
        if (tareasPropsRaw.length > 0) {
          setTareasDisponibles(tareasPropsRaw)
        }
      }
    }

    cargarTareasDisponibles()
  }, [proyectoId, cronogramaId, isOpen, tareasPropsRaw])

  // Cargar dependencias existentes
  useEffect(() => {
    if (isOpen) {
      cargarDependencias()
    }
  }, [proyectoId, isOpen])

  const cargarDependencias = async () => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/dependencias`)
      if (response.ok) {
        const data = await response.json()
        setDependencias(data.data || [])
      }
    } catch (error) {
      console.error('Error cargando dependencias:', error)
    }
  }

  const crearDependencia = async () => {
    if (!tareaOrigenId || !tareaDependienteId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar ambas tareas',
        variant: 'destructive'
      })
      return
    }

    if (tareaOrigenId === tareaDependienteId) {
      toast({
        title: 'Error',
        description: 'No puede crear una dependencia de una tarea consigo misma',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/dependencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaOrigenId,
          tareaDependienteId,
          tipo
        })
      })

      if (response.ok) {
        toast({
          title: 'Dependencia creada',
          description: 'La dependencia se ha creado correctamente'
        })
        setShowCreateForm(false)
        setTareaOrigenId('')
        setTareaDependienteId('')
        cargarDependencias()
        onDependenciaChange?.()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al crear dependencia',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (dependenciaId: string) => {
    setDependenciaToDelete(dependenciaId)
    setShowDeleteDialog(true)
  }

  const eliminarDependencia = async () => {
    if (!dependenciaToDelete) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/proyectos/${proyectoId}/cronograma/dependencias/${dependenciaToDelete}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast({
          title: 'Dependencia eliminada',
          description: 'La dependencia se ha eliminado correctamente'
        })
        cargarDependencias()
        setShowDeleteDialog(false)
        setDependenciaToDelete(null)
        onDependenciaChange?.()
      } else {
        toast({
          title: 'Error',
          description: 'Error al eliminar dependencia',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTareaDisplayName = (tarea: Tarea) => {
    const nombreBase = tarea.nombre
    const edtInfo = tarea.edtNombre ? ` [${tarea.edtNombre}]` : ''

    if (!tarea.fechaInicio || !tarea.fechaFin) {
      return `${nombreBase}${edtInfo} (Sin fechas)${tarea.esHito ? ' 🎯' : ''}`
    }

    try {
      const fechaInicioObj = new Date(tarea.fechaInicio)
      const fechaFinObj = new Date(tarea.fechaFin)
      const fechaInicio = fechaInicioObj.toLocaleDateString('es-ES')
      const fechaFin = fechaFinObj.toLocaleDateString('es-ES')
      return `${nombreBase}${edtInfo} (${fechaInicio} - ${fechaFin})${tarea.esHito ? ' 🎯' : ''}`
    } catch {
      return `${nombreBase}${edtInfo}${tarea.esHito ? ' 🎯' : ''}`
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Link2 className="w-4 h-4 mr-2" />
            Gestionar Dependencias ({dependencias.length})
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Dependencias - Proyecto</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Lista de dependencias existentes */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Dependencias Existentes</h3>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Dependencia
                </Button>
              </div>

              {dependencias.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay dependencias configuradas</p>
                  <p className="text-sm">Las tareas se ejecutan de forma independiente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dependencias.map((dep) => (
                    <Card key={dep.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-wrap">
                            {/* Tarea origen */}
                            <Badge variant="outline" className="max-w-[200px] truncate">
                              {dep.tareaOrigen?.nombre || 'Tarea no encontrada'}
                            </Badge>

                            {/* Tipo de dependencia */}
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-blue-600">
                                {TIPOS_DEPENDENCIA[dep.tipo]?.icon || '→'}
                              </span>
                              <Badge variant="secondary">
                                {TIPOS_DEPENDENCIA[dep.tipo]?.label || dep.tipo}
                              </Badge>
                            </div>

                            {/* Tarea destino */}
                            <Badge variant="outline" className="max-w-[200px] truncate">
                              {dep.tareaDependiente?.nombre || 'Tarea no encontrada'}
                            </Badge>
                          </div>

                          <Button
                            onClick={() => handleDeleteClick(dep.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          {TIPOS_DEPENDENCIA[dep.tipo]?.descripcion || 'Tipo de dependencia desconocido'}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario de creación */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Crear Nueva Dependencia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tarea-origen">Tarea Origen (Predecesora)</Label>
                      <Select value={tareaOrigenId} onValueChange={setTareaOrigenId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tarea origen" />
                        </SelectTrigger>
                        <SelectContent>
                          {tareasDisponibles.map((tarea) => (
                            <SelectItem key={tarea.id} value={tarea.id}>
                              {getTareaDisplayName(tarea)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tarea-dependiente">Tarea Destino (Sucesora)</Label>
                      <Select value={tareaDependienteId} onValueChange={setTareaDependienteId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tarea destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {tareasDisponibles.map((tarea) => (
                            <SelectItem key={tarea.id} value={tarea.id}>
                              {getTareaDisplayName(tarea)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tipo">Tipo de Dependencia</Label>
                      <Select value={tipo} onValueChange={(value: keyof typeof TIPOS_DEPENDENCIA) => setTipo(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPOS_DEPENDENCIA).map(([key, info]) => (
                            <SelectItem key={key} value={key}>
                              <div>
                                <div className="font-medium">{info.label}</div>
                                <div className="text-xs text-gray-500">{info.descripcion}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <Button
                      onClick={() => setShowCreateForm(false)}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={crearDependencia} disabled={loading}>
                      {loading ? 'Creando...' : 'Crear Dependencia'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información de ayuda */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Información sobre Dependencias</h4>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1">
                      <li>• Las dependencias definen el orden de ejecución de las tareas</li>
                      <li>• El tipo más común es "Termina-Inicia" (FS): la sucesora comienza cuando la predecesora termina</li>
                      <li>• Las dependencias se visualizan en el diagrama de Gantt</li>
                      <li>• No se pueden crear ciclos (dependencias circulares)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar esta dependencia? Esta acción eliminará permanentemente
              la relación entre las tareas y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarDependencia}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Eliminando...' : 'Eliminar Dependencia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
