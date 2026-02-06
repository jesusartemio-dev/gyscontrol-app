'use client'

/**
 * AgregarTareaModal - Modal para agregar una tarea a una jornada activa
 *
 * Permite seleccionar:
 * - Actividad EDT (para filtrar tareas)
 * - Tarea del cronograma o tarea extra
 * - Miembros con sus horas individuales
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
  ListTodo,
  Clock,
  Users,
  Loader2,
  Plus,
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TareaDelCronograma {
  id: string
  nombre: string
}

interface Actividad {
  id: string
  nombre: string
  tareas: TareaDelCronograma[]
}

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
}

interface MiembroSeleccionado {
  usuarioId: string
  nombre: string
  horas: number
  observaciones?: string
}

interface AgregarTareaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  proyectoId: string
  proyectoEdtId?: string | null
  personalPlanificado: PersonalPlanificado[]
  onSuccess: () => void
}

export function AgregarTareaModal({
  open,
  onOpenChange,
  jornadaId,
  proyectoId,
  proyectoEdtId,
  personalPlanificado,
  onSuccess
}: AgregarTareaModalProps) {
  const { toast } = useToast()

  // Estado de carga
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Datos de selección
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [tareas, setTareas] = useState<TareaDelCronograma[]>([])

  // Formulario
  const [tipoTarea, setTipoTarea] = useState<'cronograma' | 'extra'>('cronograma')
  const [actividadId, setActividadId] = useState('')
  const [tareaId, setTareaId] = useState('')
  const [nombreTareaExtra, setNombreTareaExtra] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [horasBase, setHorasBase] = useState(8)
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState<MiembroSeleccionado[]>([])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setTipoTarea('cronograma')
      setActividadId('')
      setTareaId('')
      setNombreTareaExtra('')
      setDescripcion('')
      setHorasBase(8)
      setMiembrosSeleccionados([])
      if (proyectoEdtId) {
        cargarActividades()
      }
    }
  }, [open, proyectoEdtId])

  // Actualizar tareas cuando cambia la actividad
  useEffect(() => {
    if (actividadId) {
      const actividadSeleccionada = actividades.find(a => a.id === actividadId)
      setTareas(actividadSeleccionada?.tareas || [])
    } else {
      setTareas([])
    }
    setTareaId('')
  }, [actividadId, actividades])

  const cargarActividades = async () => {
    if (!proyectoEdtId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/horas-hombre/actividades-edt/${proyectoEdtId}`)
      if (response.ok) {
        const data = await response.json()
        setActividades(data.actividades || [])
      }
    } catch (error) {
      console.error('Error cargando actividades:', error)
    } finally {
      setLoading(false)
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

  const seleccionarTodosMiembros = () => {
    setMiembrosSeleccionados(
      personalPlanificado.map(p => ({
        usuarioId: p.userId,
        nombre: p.nombre,
        horas: horasBase
      }))
    )
  }

  const aplicarHorasBase = () => {
    setMiembrosSeleccionados(prev =>
      prev.map(m => ({ ...m, horas: horasBase }))
    )
  }

  const handleSubmit = async () => {
    // Validaciones
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
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/agregar-tarea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoTareaId: tipoTarea === 'cronograma' ? tareaId : undefined,
          nombreTareaExtra: tipoTarea === 'extra' ? nombreTareaExtra.trim() : undefined,
          descripcion: descripcion.trim() || undefined,
          miembros: miembrosSeleccionados.map(m => ({
            usuarioId: m.usuarioId,
            horas: m.horas,
            observaciones: m.observaciones
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error agregando tarea')
      }

      toast({
        title: 'Tarea agregada',
        description: data.message
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error agregando tarea'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const totalHoras = miembrosSeleccionados.reduce((sum, m) => sum + m.horas, 0)
  const tareaSeleccionada = tareas.find(t => t.id === tareaId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Agregar Tarea
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tipo de tarea */}
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
                  {/* Actividad */}
                  <div className="space-y-2">
                    <Label>Actividad EDT</Label>
                    <Select value={actividadId} onValueChange={setActividadId}>
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

                  {/* Tarea */}
                  {actividadId && (
                    <div className="space-y-2">
                      <Label>Tarea</Label>
                      <Select value={tareaId} onValueChange={setTareaId} disabled={loading}>
                        <SelectTrigger className="h-auto min-h-9 py-1.5 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm">
                          <SelectValue placeholder="Seleccionar tarea" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                          {tareas.map(t => (
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
                  Usa "Tarea extra" para agregar tareas.
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={seleccionarTodosMiembros}
              className="w-full"
            >
              Seleccionar todo el personal planificado
            </Button>

            {/* Lista de personal planificado */}
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {personalPlanificado.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No hay personal planificado para esta jornada
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
                <span className="text-blue-800">
                  {tipoTarea === 'cronograma' && tareaSeleccionada ? (
                    <span className="font-medium">{tareaSeleccionada.nombre}</span>
                  ) : tipoTarea === 'extra' && nombreTareaExtra ? (
                    <span className="font-medium">{nombreTareaExtra}</span>
                  ) : (
                    'Selecciona una tarea'
                  )}
                </span>
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
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                miembrosSeleccionados.length === 0 ||
                (tipoTarea === 'cronograma' && !tareaId) ||
                (tipoTarea === 'extra' && !nombreTareaExtra.trim())
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Tarea
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
