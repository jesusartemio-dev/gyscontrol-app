'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Plus, Trash2, AlertTriangle, Link2, X } from 'lucide-react'
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

        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">Dependencias del Proyecto</DialogTitle>
              <Button
                onClick={() => setShowCreateForm(v => !v)}
                size="sm"
                variant={showCreateForm ? 'secondary' : 'default'}
                className="h-7 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nueva
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            {/* Formulario de creación compacto */}
            {showCreateForm && (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-2.5">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Origen (predecesora)</Label>
                    <Select value={tareaOrigenId} onValueChange={setTareaOrigenId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seleccionar tarea..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tareasDisponibles.map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id} className="text-xs">
                            {getTareaDisplayName(tarea)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mb-1.5" />
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Destino (sucesora)</Label>
                    <Select value={tareaDependienteId} onValueChange={setTareaDependienteId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seleccionar tarea..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tareasDisponibles.map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id} className="text-xs">
                            {getTareaDisplayName(tarea)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
                    <Select value={tipo} onValueChange={(value: keyof typeof TIPOS_DEPENDENCIA) => setTipo(value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPOS_DEPENDENCIA).map(([key, info]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {info.icon} {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={crearDependencia} disabled={loading} size="sm" className="h-8 text-xs">
                    {loading ? 'Creando...' : 'Crear'}
                  </Button>
                  <Button onClick={() => setShowCreateForm(false)} variant="ghost" size="sm" className="h-8 text-xs px-2">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de dependencias como tabla compacta */}
            {dependencias.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay dependencias configuradas</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_90px_1fr_32px] gap-2 px-3 py-1.5 bg-muted/50 border-b text-[11px] font-medium text-muted-foreground">
                  <div>Origen</div>
                  <div className="text-center">Tipo</div>
                  <div>Destino</div>
                  <div />
                </div>
                {dependencias.map((dep) => (
                  <div
                    key={dep.id}
                    className="grid grid-cols-[1fr_90px_1fr_32px] gap-2 px-3 py-1.5 border-b last:border-0 hover:bg-muted/20 items-center text-xs"
                  >
                    <span className="truncate" title={dep.tareaOrigen?.nombre}>
                      {dep.tareaOrigen?.nombre || 'No encontrada'}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5 justify-center font-normal">
                      {TIPOS_DEPENDENCIA[dep.tipo]?.label || dep.tipo}
                    </Badge>
                    <span className="truncate" title={dep.tareaDependiente?.nombre}>
                      {dep.tareaDependiente?.nombre || 'No encontrada'}
                    </span>
                    <button
                      onClick={() => handleDeleteClick(dep.id)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              FS = Termina-Inicia · SS = Inicia-Inicia · FF = Termina-Termina · SF = Inicia-Termina
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Eliminar dependencia
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la relación entre las tareas. Esta acción no se puede deshacer.
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
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
