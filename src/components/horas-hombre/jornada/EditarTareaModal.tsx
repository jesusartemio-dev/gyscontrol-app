'use client'

/**
 * EditarTareaModal - Modal para editar una tarea existente de la jornada
 *
 * Permite:
 * - Cambiar la tarea (del cronograma o tarea extra)
 * - Modificar miembros y horas
 * - Eliminar la tarea
 */

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clock,
  Users,
  Loader2,
  Pencil,
  Trash2,
  ListTodo,
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Usuario {
  id: string
  name: string | null
  email: string
}

interface MiembroTarea {
  id: string
  usuario: Usuario
  horas: number
  observaciones?: string | null
}

interface TareaData {
  id: string
  proyectoTarea?: {
    id: string
    nombre: string
    proyectoActividad?: { nombre: string } | null
  } | null
  nombreTareaExtra?: string | null
  descripcion?: string | null
  miembros: MiembroTarea[]
}

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
}

interface MiembroEditable {
  usuarioId: string
  nombre: string
  horas: number
  observaciones?: string
}

interface TareaDelCronograma {
  id: string
  nombre: string
}

interface Actividad {
  id: string
  nombre: string
  tareas: TareaDelCronograma[]
}

interface EditarTareaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  tarea: TareaData
  proyectoEdtId?: string | null
  personalPlanificado: PersonalPlanificado[]
  onSuccess: () => void
}

export function EditarTareaModal({
  open,
  onOpenChange,
  jornadaId,
  tarea,
  proyectoEdtId,
  personalPlanificado,
  onSuccess
}: EditarTareaModalProps) {
  const { toast } = useToast()

  // Estado
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [horasBase, setHorasBase] = useState(8)
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState<MiembroEditable[]>([])

  // Task selection state
  const [tipoTarea, setTipoTarea] = useState<'cronograma' | 'extra'>('cronograma')
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [tareasDisponibles, setTareasDisponibles] = useState<TareaDelCronograma[]>([])
  const [actividadId, setActividadId] = useState('')
  const [tareaId, setTareaId] = useState('')
  const [nombreTareaExtra, setNombreTareaExtra] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loadingActividades, setLoadingActividades] = useState(false)

  // Inicializar cuando se abre el modal
  useEffect(() => {
    if (open && tarea) {
      // Initialize members
      const miembrosIniciales = tarea.miembros.map(m => ({
        usuarioId: m.usuario.id,
        nombre: m.usuario.name || m.usuario.email.split('@')[0],
        horas: m.horas,
        observaciones: m.observaciones || undefined
      }))
      setMiembrosSeleccionados(miembrosIniciales)

      // Initialize task type
      if (tarea.proyectoTarea) {
        setTipoTarea('cronograma')
        setTareaId(tarea.proyectoTarea.id)
        setNombreTareaExtra('')
      } else {
        setTipoTarea('extra')
        setTareaId('')
        setNombreTareaExtra(tarea.nombreTareaExtra || '')
      }
      setDescripcion(tarea.descripcion || '')

      // Load activities if EDT available
      if (proyectoEdtId) {
        cargarActividades()
      }
    }
  }, [open, tarea, proyectoEdtId])

  // Set actividadId once actividades are loaded (for cronograma tasks)
  useEffect(() => {
    if (actividades.length > 0 && tarea?.proyectoTarea?.proyectoActividad) {
      const actNombre = tarea.proyectoTarea.proyectoActividad.nombre
      const found = actividades.find(a => a.nombre === actNombre)
      if (found) {
        setActividadId(found.id)
      }
    }
  }, [actividades, tarea])

  // Update available tasks when activity changes
  useEffect(() => {
    if (actividadId) {
      const actividadSeleccionada = actividades.find(a => a.id === actividadId)
      setTareasDisponibles(actividadSeleccionada?.tareas || [])
    } else {
      setTareasDisponibles([])
    }
  }, [actividadId, actividades])

  const cargarActividades = async () => {
    if (!proyectoEdtId) return
    try {
      setLoadingActividades(true)
      const response = await fetch(`/api/horas-hombre/actividades-edt/${proyectoEdtId}`)
      if (response.ok) {
        const data = await response.json()
        setActividades(data.actividades || [])
      }
    } catch (error) {
      console.error('Error cargando actividades:', error)
    } finally {
      setLoadingActividades(false)
    }
  }

  const toggleMiembro = (userId: string, nombre: string) => {
    setMiembrosSeleccionados(prev => {
      const existe = prev.find(m => m.usuarioId === userId)
      if (existe) {
        return prev.filter(m => m.usuarioId !== userId)
      }
      return [...prev, { usuarioId: userId, nombre, horas: horasBase }]
    })
  }

  const actualizarHorasMiembro = (userId: string, horas: number) => {
    setMiembrosSeleccionados(prev =>
      prev.map(m => m.usuarioId === userId ? { ...m, horas } : m)
    )
  }

  const aplicarHorasBase = () => {
    setMiembrosSeleccionados(prev =>
      prev.map(m => ({ ...m, horas: horasBase }))
    )
  }

  const handleSubmit = async () => {
    // Validations
    if (tipoTarea === 'cronograma' && !tareaId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona una tarea del cronograma' })
      return
    }
    if (tipoTarea === 'extra' && !nombreTareaExtra.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingresa el nombre de la tarea extra' })
      return
    }
    if (miembrosSeleccionados.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos un miembro' })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/tarea/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoTareaId: tipoTarea === 'cronograma' ? tareaId : null,
          nombreTareaExtra: tipoTarea === 'extra' ? nombreTareaExtra.trim() : null,
          descripcion: descripcion.trim() || null,
          miembros: miembrosSeleccionados.map(m => ({
            usuarioId: m.usuarioId,
            horas: m.horas,
            observaciones: m.observaciones
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando tarea')
      }

      toast({
        title: 'Tarea actualizada',
        description: data.message
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error actualizando tarea'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/tarea/${tarea.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error eliminando tarea')
      }

      toast({
        title: 'Tarea eliminada',
        description: 'La tarea ha sido eliminada correctamente'
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error eliminando tarea'
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const totalHoras = miembrosSeleccionados.reduce((sum, m) => sum + m.horas, 0)
  const tareaSeleccionadaCronograma = tareasDisponibles.find(t => t.id === tareaId)
  const nombreResumen = tipoTarea === 'cronograma' && tareaSeleccionadaCronograma
    ? tareaSeleccionadaCronograma.nombre
    : tipoTarea === 'extra' && nombreTareaExtra
      ? nombreTareaExtra
      : 'Selecciona una tarea'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Editar Tarea
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Task selection */}
            <Tabs value={tipoTarea} onValueChange={(v) => setTipoTarea(v as 'cronograma' | 'extra')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cronograma">
                  <ListTodo className="h-4 w-4 mr-2" />
                  Del cronograma
                </TabsTrigger>
                <TabsTrigger value="extra">
                  <FileText className="h-4 w-4 mr-2" />
                  Tarea extra
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cronograma" className="space-y-4 mt-4">
                {proyectoEdtId ? (
                  <>
                    <div className="space-y-2">
                      <Label>Actividad EDT</Label>
                      <Select value={actividadId} onValueChange={setActividadId} disabled={loadingActividades}>
                        <SelectTrigger className="h-auto min-h-9 py-1.5 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm">
                          <SelectValue placeholder="Seleccionar actividad" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                          {actividades.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {actividadId && (
                      <div className="space-y-2">
                        <Label>Tarea</Label>
                        <Select value={tareaId} onValueChange={setTareaId}>
                          <SelectTrigger className="h-auto min-h-9 py-1.5 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm">
                            <SelectValue placeholder="Seleccionar tarea" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                            {tareasDisponibles.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Esta jornada no tiene un EDT asignado.
                    <br />
                    Usa &quot;Tarea extra&quot; para asignar tareas.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="extra" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nombre de la tarea *</Label>
                  <Input
                    placeholder="Ej: Limpieza de zona, Traslado de materiales"
                    value={nombreTareaExtra}
                    onChange={e => setNombreTareaExtra(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                placeholder="Detalles adicionales de la tarea..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={2}
              />
            </div>

            {/* Horas base y miembros */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Miembros y horas ({miembrosSeleccionados.length} seleccionados)
                </Label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">Horas base:</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={horasBase}
                    onChange={e => setHorasBase(parseFloat(e.target.value) || 8)}
                    className="w-16 h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={aplicarHorasBase}
                    disabled={miembrosSeleccionados.length === 0}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>

              {/* Lista de personal planificado */}
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {personalPlanificado.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No hay personal planificado
                  </div>
                ) : (
                  <div className="divide-y">
                    {personalPlanificado.map(p => {
                      const seleccionado = miembrosSeleccionados.find(m => m.usuarioId === p.userId)
                      return (
                        <div key={p.userId} className="flex items-center gap-3 p-3">
                          <Checkbox
                            checked={!!seleccionado}
                            onCheckedChange={() => toggleMiembro(p.userId, p.nombre)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {p.nombre}
                            </div>
                          </div>
                          {seleccionado && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0.5"
                                max="24"
                                step="0.5"
                                value={seleccionado.horas}
                                onChange={e => actualizarHorasMiembro(p.userId, parseFloat(e.target.value) || 0)}
                                className="w-16 h-8 text-sm text-center"
                              />
                              <span className="text-sm text-gray-500">h</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Resumen */}
            {miembrosSeleccionados.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800 font-medium">{nombreResumen}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {miembrosSeleccionados.length} personas
                    </Badge>
                    <Badge className="bg-blue-600">
                      <Clock className="h-3 w-3 mr-1" />
                      {totalHoras}h total
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={submitting || deleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting || deleting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitting || deleting ||
                    miembrosSeleccionados.length === 0 ||
                    (tipoTarea === 'cronograma' && !tareaId) ||
                    (tipoTarea === 'extra' && !nombreTareaExtra.trim())
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la tarea y todas las horas registradas para sus miembros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
