'use client'

/**
 * AgregarTareaModal - Modal para agregar una tarea a una jornada activa
 *
 * Permite seleccionar:
 * - Actividad EDT (para filtrar tareas)
 * - Tarea del cronograma o tarea extra (existente o nueva)
 * - Miembros del equipo (horas se registran al cerrar la jornada)
 */

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Users,
  Loader2,
  Plus,
  FileText,
  Calendar
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

interface TareaExtraExistente {
  id: string
  nombre: string
  estado: string
  porcentaje: number
  edtNombre?: string
}

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
}

interface MiembroSeleccionado {
  usuarioId: string
  nombre: string
}

interface AgregarTareaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  proyectoId: string
  proyectoEdtId?: string | null
  fechaTrabajo?: string
  personalPlanificado: PersonalPlanificado[]
  onSuccess: () => void
}

const CREAR_NUEVA = '__crear_nueva__'

export function AgregarTareaModal({
  open,
  onOpenChange,
  jornadaId,
  proyectoId,
  proyectoEdtId,
  fechaTrabajo,
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
  const [tareasExtra, setTareasExtra] = useState<TareaExtraExistente[]>([])

  // Formulario
  const [tipoTarea, setTipoTarea] = useState<'cronograma' | 'extra'>('cronograma')
  const [actividadId, setActividadId] = useState('')
  const [tareaId, setTareaId] = useState('')
  // Extra: selector de existente o crear nueva
  const [extraSeleccion, setExtraSeleccion] = useState(CREAR_NUEVA)
  const [nombreTareaExtra, setNombreTareaExtra] = useState('')
  const [extraFechaInicio, setExtraFechaInicio] = useState('')
  const [extraFechaFin, setExtraFechaFin] = useState('')
  const [extraHorasPorPersona, setExtraHorasPorPersona] = useState<number | ''>('')
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState<MiembroSeleccionado[]>([])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setTipoTarea('cronograma')
      setActividadId('')
      setTareaId('')
      setExtraSeleccion(CREAR_NUEVA)
      setNombreTareaExtra('')
      // Default dates to fechaTrabajo (YYYY-MM-DD)
      const defaultDate = fechaTrabajo ? fechaTrabajo.slice(0, 10) : new Date().toISOString().slice(0, 10)
      setExtraFechaInicio(defaultDate)
      setExtraFechaFin(defaultDate)
      setExtraHorasPorPersona('')
      setMiembrosSeleccionados([])
      if (proyectoEdtId) {
        cargarActividades()
      }
      cargarTareasExtra()
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

  const cargarTareasExtra = async () => {
    try {
      const response = await fetch(`/api/horas-hombre/tareas-extra?proyectoId=${proyectoId}`)
      if (response.ok) {
        const data = await response.json()
        setTareasExtra(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error cargando tareas extra:', error)
    }
  }

  const toggleMiembro = (userId: string, nombre: string) => {
    setMiembrosSeleccionados(prev => {
      const existe = prev.find(m => m.usuarioId === userId)
      if (existe) {
        return prev.filter(m => m.usuarioId !== userId)
      }
      return [...prev, { usuarioId: userId, nombre }]
    })
  }

  const seleccionarTodosMiembros = () => {
    setMiembrosSeleccionados(
      personalPlanificado.map(p => ({
        usuarioId: p.userId,
        nombre: p.nombre
      }))
    )
  }

  // Determinar qué se envía al API
  const getSubmitPayload = () => {
    if (tipoTarea === 'cronograma') {
      return { proyectoTareaId: tareaId }
    }
    // Extra: existente o nueva
    if (extraSeleccion !== CREAR_NUEVA) {
      return { proyectoTareaId: extraSeleccion }
    }
    const personas = miembrosSeleccionados.length || 1
    const horasPP = extraHorasPorPersona || undefined
    return {
      nombreTareaExtra: nombreTareaExtra.trim(),
      fechaInicio: extraFechaInicio || undefined,
      fechaFin: extraFechaFin || undefined,
      horasEstimadas: horasPP ? horasPP * personas : undefined,
      personasEstimadas: personas
    }
  }

  const isExtraValid = () => {
    if (extraSeleccion !== CREAR_NUEVA) return true
    return nombreTareaExtra.trim().length > 0
  }

  const handleSubmit = async () => {
    // Validaciones
    if (tipoTarea === 'cronograma' && !tareaId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona una tarea del cronograma' })
      return
    }
    if (tipoTarea === 'extra' && !isExtraValid()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona una tarea extra o ingresa un nombre' })
      return
    }
    if (miembrosSeleccionados.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos un miembro' })
      return
    }

    try {
      setSubmitting(true)
      const payload = getSubmitPayload()
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/agregar-tarea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          miembros: miembrosSeleccionados.map(m => ({
            usuarioId: m.usuarioId
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

  const tareaSeleccionada = tareas.find(t => t.id === tareaId)
  const extraExistenteSeleccionada = tareasExtra.find(t => t.id === extraSeleccion)

  // Nombre para el resumen
  const getNombreResumen = () => {
    if (tipoTarea === 'cronograma' && tareaSeleccionada) return tareaSeleccionada.nombre
    if (tipoTarea === 'extra' && extraExistenteSeleccionada) return extraExistenteSeleccionada.nombre
    if (tipoTarea === 'extra' && nombreTareaExtra) return nombreTareaExtra
    return 'Selecciona una tarea'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-blue-600" />
            Agregar Tarea
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Tipo de tarea */}
          <Tabs value={tipoTarea} onValueChange={(v) => setTipoTarea(v as 'cronograma' | 'extra')}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="cronograma" className="text-xs gap-1.5">
                <ListTodo className="h-3.5 w-3.5" />
                Del cronograma
              </TabsTrigger>
              <TabsTrigger value="extra" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Tarea extra
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cronograma" className="space-y-2.5 mt-3">
              {proyectoEdtId ? (
                <>
                  {/* Actividad - inline */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <Label className="text-xs text-gray-600 shrink-0 sm:w-16">Actividad</Label>
                    <Select value={actividadId} onValueChange={setActividadId}>
                      <SelectTrigger className="h-auto min-h-8 py-1 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm flex-1">
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

                  {/* Tarea - inline */}
                  {actividadId && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                      <Label className="text-xs text-gray-600 shrink-0 sm:w-16">Tarea</Label>
                      <Select value={tareaId} onValueChange={setTareaId} disabled={loading}>
                        <SelectTrigger className="h-auto min-h-8 py-1 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm flex-1">
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
                <div className="text-center text-gray-500 text-xs py-3">
                  Sin EDT asignado. Usa &quot;Tarea extra&quot;.
                </div>
              )}
            </TabsContent>

            <TabsContent value="extra" className="space-y-2.5 mt-3">
              {/* Selector de tarea extra existente o crear nueva */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <Label className="text-xs text-gray-600 shrink-0 sm:w-16">Extra</Label>
                <Select value={extraSeleccion} onValueChange={(v) => { setExtraSeleccion(v); if (v !== CREAR_NUEVA) setNombreTareaExtra('') }}>
                  <SelectTrigger className="h-auto min-h-8 py-1 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm flex-1">
                    <SelectValue placeholder="Seleccionar o crear" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                    <SelectItem value={CREAR_NUEVA}>
                      <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <Plus className="h-3.5 w-3.5" />
                        Crear nueva tarea extra
                      </span>
                    </SelectItem>
                    {tareasExtra.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nombre} <span className="text-gray-400 text-xs ml-1">({t.porcentaje}%)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campos para crear nueva tarea extra */}
              {extraSeleccion === CREAR_NUEVA && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <Label className="text-xs text-gray-600 shrink-0 sm:w-16">Nombre *</Label>
                    <Input
                      placeholder="Ej: Limpieza de zona, Traslado de materiales"
                      value={nombreTareaExtra}
                      onChange={e => setNombreTareaExtra(e.target.value)}
                      className="h-8 text-sm flex-1"
                      autoFocus
                    />
                  </div>

                  {/* Fechas */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <Input
                      type="date"
                      value={extraFechaInicio}
                      onChange={e => setExtraFechaInicio(e.target.value)}
                      className="h-8 text-sm flex-1"
                      title="Fecha inicio"
                    />
                    <span className="text-xs text-gray-400">a</span>
                    <Input
                      type="date"
                      value={extraFechaFin}
                      onChange={e => setExtraFechaFin(e.target.value)}
                      className="h-8 text-sm flex-1"
                      min={extraFechaInicio}
                      title="Fecha fin"
                    />
                    <Input
                      type="number"
                      placeholder="Hrs/pers"
                      value={extraHorasPorPersona}
                      onChange={e => setExtraHorasPorPersona(e.target.value ? Number(e.target.value) : '')}
                      className="h-8 text-sm w-[5.5rem]"
                      min={0}
                      step={0.5}
                      title="Horas por persona"
                    />
                  </div>

                  {/* Total HH calculado */}
                  {extraHorasPorPersona && miembrosSeleccionados.length > 0 && (
                    <p className="text-xs text-gray-500 text-right">
                      {extraHorasPorPersona}h/pers × {miembrosSeleccionados.length} pers = <span className="font-medium text-gray-700">{extraHorasPorPersona * miembrosSeleccionados.length} HH</span>
                    </p>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Miembros */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-gray-600">
              <Users className="h-3.5 w-3.5" />
              Miembros ({miembrosSeleccionados.length})
            </Label>

            <button
              type="button"
              onClick={seleccionarTodosMiembros}
              className="w-full text-xs text-center py-1.5 border border-dashed rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              Seleccionar todo el personal planificado
            </button>

            {/* Lista de personal */}
            <div className="border rounded-lg max-h-44 overflow-y-auto">
              {personalPlanificado.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-xs">
                  No hay personal planificado
                </div>
              ) : (
                <div className="divide-y">
                  {personalPlanificado.map(p => {
                    const seleccionado = miembrosSeleccionados.find(m => m.usuarioId === p.userId)
                    return (
                      <label key={p.userId} className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer">
                        <Checkbox
                          checked={!!seleccionado}
                          onCheckedChange={() => toggleMiembro(p.userId, p.nombre)}
                        />
                        <span className="flex-1 min-w-0 text-sm truncate">
                          {p.nombre}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resumen compacto */}
          {miembrosSeleccionados.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="text-xs text-blue-800 truncate mr-2">
                {getNombreResumen()}
              </span>
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                {miembrosSeleccionados.length} pers.
              </Badge>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                miembrosSeleccionados.length === 0 ||
                (tipoTarea === 'cronograma' && !tareaId) ||
                (tipoTarea === 'extra' && !isExtraValid())
              }
              className="flex-1 sm:flex-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Agregar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
