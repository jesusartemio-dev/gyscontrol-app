'use client'

/**
 * EditarTareaModal - Modal para editar horas de una tarea existente
 *
 * Permite modificar las horas de cada miembro antes de cerrar la jornada
 */

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Clock,
  Users,
  Loader2,
  Pencil,
  Trash2
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
}

interface MiembroEditable {
  usuarioId: string
  nombre: string
  horas: number
  observaciones?: string
}

interface EditarTareaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  tarea: TareaData
  personalPlanificado: PersonalPlanificado[]
  onSuccess: () => void
}

export function EditarTareaModal({
  open,
  onOpenChange,
  jornadaId,
  tarea,
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

  // Inicializar miembros cuando se abre el modal
  useEffect(() => {
    if (open && tarea) {
      const miembrosIniciales = tarea.miembros.map(m => ({
        usuarioId: m.usuario.id,
        nombre: m.usuario.name || m.usuario.email.split('@')[0],
        horas: m.horas,
        observaciones: m.observaciones || undefined
      }))
      setMiembrosSeleccionados(miembrosIniciales)
    }
  }, [open, tarea])

  const nombreTarea = tarea.proyectoTarea?.nombre || tarea.nombreTareaExtra || 'Tarea sin nombre'
  const actividadNombre = tarea.proyectoTarea?.proyectoActividad?.nombre

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
            {/* Info de la tarea (solo lectura) */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-1">
              <div className="font-medium">{nombreTarea}</div>
              {actividadNombre && (
                <div className="text-sm text-gray-500">{actividadNombre}</div>
              )}
              {tarea.descripcion && (
                <div className="text-sm text-gray-600 mt-2">{tarea.descripcion}</div>
              )}
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
              <div className="border rounded-lg max-h-64 overflow-y-auto">
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
                  <span className="text-blue-800 font-medium">{nombreTarea}</span>
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
                  disabled={submitting || deleting || miembrosSeleccionados.length === 0}
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
              Se eliminará la tarea "{nombreTarea}" y todas las horas registradas para sus miembros.
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
