'use client'

/**
 * AgregarTareaModal - Modal para agregar tareas a una jornada activa
 *
 * Permite seleccionar:
 * - Actividad EDT (para filtrar tareas)
 * - Una o varias tareas del cronograma (lista con checkbox y % de avance), o
 *   una tarea extra (existente o nueva)
 * - Miembros del equipo (horas se registran al cerrar la jornada)
 *
 * Las tareas del cronograma son multi-selección: el mismo grupo de miembros se
 * agrega a cada tarea marcada. El API solo acepta una tarea por request, así que
 * el envío es un POST por tarea, secuencial y con reporte de fallos parciales.
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
  /** porcentajeCompletado de ProyectoTarea (el API lo expone como `progreso`) */
  progreso?: number | null
  estado?: string
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
  /** IDs de ProyectoTarea que ya están en la jornada — se muestran deshabilitados */
  tareasYaAgregadasIds?: string[]
  onSuccess: () => void
}

export function AgregarTareaModal({
  open,
  onOpenChange,
  jornadaId,
  proyectoId,
  proyectoEdtId,
  fechaTrabajo,
  personalPlanificado,
  tareasYaAgregadasIds = [],
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

  // EDT: si la jornada no tiene EDT asignado (p. ej. creada automáticamente desde
  // la asistencia), se permite elegir uno del proyecto para ver el cronograma.
  type EdtOpcion = { id: string; nombre: string; edt?: { nombre?: string } | null }
  const [edts, setEdts] = useState<EdtOpcion[]>([])
  const [edtLocal, setEdtLocal] = useState('')
  const edtEfectivo = proyectoEdtId || edtLocal

  // Formulario
  const [tipoTarea, setTipoTarea] = useState<'cronograma' | 'extra'>('cronograma')
  const [actividadId, setActividadId] = useState('')
  // Multi-selección: el mismo equipo se agrega a todas las tareas marcadas
  const [tareaIds, setTareaIds] = useState<string[]>([])
  // Extra: puede estar en modo "seleccionar existente" o "crear nueva"
  const [creandoNuevaExtra, setCreandoNuevaExtra] = useState(false)
  const [extraSeleccion, setExtraSeleccion] = useState('') // id del extra existente seleccionado
  const [nombreTareaExtra, setNombreTareaExtra] = useState('')
  const [extraFechaInicio, setExtraFechaInicio] = useState('')
  const [extraFechaFin, setExtraFechaFin] = useState('')
  const [extraHorasPorPersona, setExtraHorasPorPersona] = useState<number | ''>('')
  const [extraResponsableId, setExtraResponsableId] = useState<string>('') // '' = sin responsable
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState<MiembroSeleccionado[]>([])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setTipoTarea('cronograma')
      setActividadId('')
      setTareaIds([])
      setCreandoNuevaExtra(false)
      setExtraSeleccion('')
      setNombreTareaExtra('')
      // Default dates to fechaTrabajo (YYYY-MM-DD)
      const defaultDate = fechaTrabajo ? fechaTrabajo.slice(0, 10) : new Date().toISOString().slice(0, 10)
      setExtraFechaInicio(defaultDate)
      setExtraFechaFin(defaultDate)
      setExtraHorasPorPersona('')
      setExtraResponsableId('')
      setMiembrosSeleccionados([])
      setEdtLocal('')
      setErrorEdts(null)
      setActividades([])
      setActividadId('')
      // Si la jornada no tiene EDT, cargar los EDT del proyecto para elegir uno.
      if (!proyectoEdtId) cargarEdts()
      cargarTareasExtra()
    }
  }, [open, proyectoEdtId])

  // Cargar actividades del EDT efectivo (el de la jornada o el elegido localmente).
  useEffect(() => {
    if (open && edtEfectivo) cargarActividades(edtEfectivo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edtEfectivo])

  // Actualizar tareas cuando cambia la actividad
  useEffect(() => {
    if (actividadId) {
      const actividadSeleccionada = actividades.find(a => a.id === actividadId)
      setTareas(actividadSeleccionada?.tareas || [])
    } else {
      setTareas([])
    }
    setTareaIds([])
  }, [actividadId, actividades])

  // Si el EDT tiene una sola actividad, seleccionarla sola: la lista de tareas
  // queda visible de entrada en vez de exigir un clic que no aporta nada.
  useEffect(() => {
    if (actividades.length === 1 && !actividadId) setActividadId(actividades[0].id)
  }, [actividades, actividadId])

  const cargarActividades = async (edtId: string) => {
    if (!edtId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/horas-hombre/actividades-edt/${edtId}`)
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

  const [errorEdts, setErrorEdts] = useState<string | null>(null)

  // Persiste el EDT elegido en la jornada de inmediato (no depende de llegar a
  // enviar una tarea): así, si el usuario tiene que elegirlo manualmente porque
  // la auto-selección falló, queda guardado igual.
  // El backend solo permite fijar el EDT una vez (rechaza si la jornada ya
  // tiene uno) — si esto falla, la selección local queda desincronizada del
  // EDT realmente guardado, así que hay que revertirla y avisar en vez de
  // dejar que el usuario siga eligiendo tareas de un EDT que nunca se va a
  // guardar.
  const persistirEdt = async (edtId: string) => {
    try {
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proyectoEdtId: edtId })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setEdtLocal('')
        toast({
          variant: 'destructive',
          title: 'No se pudo fijar el EDT',
          description: data?.error || 'Esta jornada ya tiene un EDT asignado distinto.'
        })
      }
    } catch (error) {
      console.error('Error guardando EDT en la jornada:', error)
      setEdtLocal('')
    }
  }

  const seleccionarEdtLocal = (edtId: string) => {
    setEdtLocal(edtId)
    if (edtId) persistirEdt(edtId)
  }

  // EDTs de ejecución del proyecto (para elegir cuando la jornada no tiene uno).
  const cargarEdts = async () => {
    try {
      setErrorEdts(null)
      const response = await fetch(`/api/proyecto-edt?proyectoId=${proyectoId}&tipoCronograma=ejecucion`)
      if (!response.ok) {
        setErrorEdts('No se pudo cargar la lista de EDT. Intenta recargar la página.')
        return
      }
      const data = await response.json()
      const lista: EdtOpcion[] = Array.isArray(data) ? data : []
      // Dedupe por nombre, igual que el formulario manual de jornada.
      const vistos = new Set<string>()
      const unicos = lista.filter((e) => {
        if (vistos.has(e.nombre)) return false
        vistos.add(e.nombre)
        return true
      })
      setEdts(unicos)
      if (unicos.length === 0) {
        setErrorEdts('Este proyecto no tiene EDT de ejecución configurados.')
        return
      }
      // Preseleccionar el EDT de Construcción ("CON…") si existe, como el manual.
      // Solo se marca en el formulario (sin persistir todavía): la jornada solo
      // admite fijar el EDT una vez, así que persistir esta suposición antes de
      // que el usuario confirme le impediría luego elegir un EDT distinto (p.
      // ej. CMM) — toda tarea que envíe sería rechazada por no coincidir con el
      // EDT ya guardado.
      const con = unicos.find((e) => e.edt?.nombre?.toUpperCase().startsWith('CON'))
      if (con) setEdtLocal(con.id)
    } catch (error) {
      console.error('Error cargando EDTs:', error)
      setErrorEdts('No se pudo cargar la lista de EDT. Intenta recargar la página.')
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

  // Tareas que todavía se pueden marcar (las ya agregadas a la jornada quedan fuera)
  const tareasSeleccionables = tareas.filter(t => !tareasYaAgregadasIds.includes(t.id))
  const todasMarcadas = tareasSeleccionables.length > 0 && tareaIds.length === tareasSeleccionables.length

  const toggleTarea = (id: string) => {
    setTareaIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const toggleTodasLasTareas = () => {
    setTareaIds(todasMarcadas ? [] : tareasSeleccionables.map(t => t.id))
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

  // Payload de la rama "extra" (la de cronograma se arma por tarea en handleSubmit)
  const getExtraPayload = () => {
    if (creandoNuevaExtra) {
      const personas = miembrosSeleccionados.length || 1
      const horasPP = extraHorasPorPersona || undefined
      return {
        nombreTareaExtra: nombreTareaExtra.trim(),
        fechaInicio: extraFechaInicio || undefined,
        fechaFin: extraFechaFin || undefined,
        horasEstimadas: horasPP ? horasPP * personas : undefined,
        personasEstimadas: personas,
        responsableId: extraResponsableId || null
      }
    }
    return { proyectoTareaId: extraSeleccion }
  }

  const isExtraValid = () => {
    if (creandoNuevaExtra) return nombreTareaExtra.trim().length > 0
    return extraSeleccion.length > 0
  }

  // Un POST por tarea (el API acepta una sola por request). Devuelve los IDs que
  // fallaron para poder dejarlos marcados y no re-enviar los que sí entraron.
  const enviarTarea = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/agregar-tarea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        miembros: miembrosSeleccionados.map(m => ({ usuarioId: m.usuarioId }))
      })
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Error agregando tarea')
    return data
  }

  const handleSubmit = async () => {
    // Validaciones
    if (tipoTarea === 'cronograma' && tareaIds.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos una tarea del cronograma' })
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

      if (tipoTarea === 'extra') {
        const data = await enviarTarea(getExtraPayload())
        toast({ title: 'Tarea agregada', description: data?.message })
        onSuccess()
        onOpenChange(false)
        return
      }

      // Cronograma: secuencial para no competir por fijar el EDT de la jornada.
      // Si la jornada no tenía EDT, se manda el elegido para fijarlo en ella.
      const edtAFijar = proyectoEdtId ? undefined : (edtLocal || undefined)
      const fallidas: string[] = []
      let exitosas = 0

      for (const id of tareaIds) {
        try {
          await enviarTarea({ proyectoTareaId: id, proyectoEdtId: edtAFijar })
          exitosas++
        } catch (error) {
          console.error(`Error agregando tarea ${id}:`, error)
          fallidas.push(id)
        }
      }

      if (exitosas > 0) onSuccess()

      if (fallidas.length === 0) {
        toast({
          title: exitosas === 1 ? 'Tarea agregada' : `${exitosas} tareas agregadas`,
          description: `${miembrosSeleccionados.length} miembro(s) por tarea`
        })
        onOpenChange(false)
      } else {
        // Deja marcadas solo las que fallaron: reintentar no duplica las que entraron.
        setTareaIds(fallidas)
        toast({
          variant: 'destructive',
          title: exitosas > 0 ? 'Algunas tareas no se agregaron' : 'No se pudo agregar',
          description: `${fallidas.length} de ${exitosas + fallidas.length} fallaron: ${fallidas
            .map(id => tareas.find(t => t.id === id)?.nombre || id)
            .join(', ')}`
        })
      }

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

  const extraExistenteSeleccionada = tareasExtra.find(t => t.id === extraSeleccion)

  // Nombre para el resumen
  const getNombreResumen = () => {
    if (tipoTarea === 'cronograma') {
      if (tareaIds.length === 0) return 'Selecciona una tarea'
      if (tareaIds.length === 1) return tareas.find(t => t.id === tareaIds[0])?.nombre || '1 tarea'
      return `${tareaIds.length} tareas seleccionadas`
    }
    if (extraExistenteSeleccionada) return extraExistenteSeleccionada.nombre
    if (nombreTareaExtra) return nombreTareaExtra
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
              {/* Selector de EDT solo cuando la jornada no tiene uno asignado */}
              {!proyectoEdtId && (
                edts.length > 0 ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <Label className="text-xs text-gray-600 shrink-0 sm:w-16">EDT</Label>
                    <Select value={edtLocal} onValueChange={seleccionarEdtLocal}>
                      <SelectTrigger className="h-auto min-h-8 py-1 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm flex-1">
                        <SelectValue placeholder="Seleccionar EDT" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                        {edts.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.edt?.nombre ? `${e.edt.nombre} - ${e.nombre}` : e.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : errorEdts ? (
                  <div className="text-center text-amber-600 text-xs py-3">
                    {errorEdts}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-xs py-3">
                    Este proyecto no tiene cronograma de ejecución (EDT). Usa &quot;Tarea extra&quot;.
                  </div>
                )
              )}

              {edtEfectivo && (
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
                            <span className="flex items-center gap-1.5">
                              <span>{a.nombre}</span>
                              <span className={`text-[11px] shrink-0 px-1.5 py-0 rounded-full ${
                                a.tareas.length === 0
                                  ? 'bg-gray-100 text-gray-400'
                                  : 'bg-blue-50 text-blue-600'
                              }`}>
                                {a.tareas.length === 0
                                  ? 'sin tareas'
                                  : `${a.tareas.length} ${a.tareas.length === 1 ? 'tarea' : 'tareas'}`}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tareas - lista visible con checkbox y % de avance.
                      Antes era un segundo Select: al elegir actividad no se veía
                      nada y parecía que no había tareas. */}
                  {actividadId && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-600">
                          Tareas ({tareaIds.length} de {tareasSeleccionables.length})
                        </Label>
                        {tareasSeleccionables.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleTodasLasTareas}
                            className="text-[11px] text-blue-600 hover:underline"
                          >
                            {todasMarcadas ? 'Ninguna' : 'Todas'}
                          </button>
                        )}
                      </div>

                      <div className="border rounded-lg max-h-52 overflow-y-auto">
                        {loading ? (
                          <div className="p-3 flex items-center justify-center text-gray-400 text-xs gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Cargando tareas...
                          </div>
                        ) : tareas.length === 0 ? (
                          <div className="p-3 text-center text-gray-500 text-xs">
                            Esta actividad no tiene tareas pendientes (todas completadas). Usa &quot;Tarea extra&quot;.
                          </div>
                        ) : (
                          <div className="divide-y">
                            {tareas.map(t => {
                              const yaAgregada = tareasYaAgregadasIds.includes(t.id)
                              const pct = Math.max(0, Math.min(100, t.progreso ?? 0))
                              return (
                                <label
                                  key={t.id}
                                  className={`flex items-center gap-2.5 px-2.5 py-1.5 ${
                                    yaAgregada ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                                  }`}
                                >
                                  <Checkbox
                                    checked={tareaIds.includes(t.id)}
                                    disabled={yaAgregada}
                                    onCheckedChange={() => toggleTarea(t.id)}
                                  />
                                  <span className="flex-1 min-w-0 text-sm">{t.nombre}</span>
                                  {yaAgregada ? (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                      Ya agregada
                                    </Badge>
                                  ) : (
                                    <span className="flex items-center gap-1.5 shrink-0">
                                      <span className="w-10 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                        <span
                                          className={`block h-full rounded-full ${
                                            pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300'
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </span>
                                      <span className="text-[11px] tabular-nums w-9 text-right text-gray-500">
                                        {pct}%
                                      </span>
                                    </span>
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="extra" className="space-y-2.5 mt-3">
              {!creandoNuevaExtra ? (
                <>
                  {/* Selector de tarea extra existente */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <Label className="text-xs text-gray-600 shrink-0 sm:w-16">Extra</Label>
                    <Select value={extraSeleccion} onValueChange={(v) => setExtraSeleccion(v)}>
                      <SelectTrigger className="h-auto min-h-8 py-1 !whitespace-normal [&_[data-slot=select-value]]:!line-clamp-2 text-sm flex-1">
                        <SelectValue placeholder={tareasExtra.length === 0 ? 'No hay tareas extras' : 'Seleccionar tarea extra...'} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[250px] max-w-[calc(100vw-4rem)]">
                        {tareasExtra.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-gray-400 text-center">No hay tareas extras</div>
                        ) : (
                          tareasExtra.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nombre} <span className="text-gray-400 text-xs ml-1">({t.porcentaje}%)</span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botón separado para crear nueva */}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreandoNuevaExtra(true)
                        setExtraSeleccion('')
                        setNombreTareaExtra('')
                      }}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Crear nueva tarea extra
                    </Button>
                  </div>
                </>
              ) : (
                /* Formulario de creación de nueva tarea extra */
                <div className="border-2 border-blue-200 rounded-lg bg-blue-50/40 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Datos de la nueva tarea extra
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCreandoNuevaExtra(false)
                        setNombreTareaExtra('')
                        setExtraResponsableId('')
                      }}
                      className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </Button>
                  </div>

                  {/* Nombre */}
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

                  {/* Responsable (opcional) */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <Label className="text-xs text-gray-600 shrink-0 sm:w-16">Resp.</Label>
                    <Select value={extraResponsableId || '__none__'} onValueChange={(v) => setExtraResponsableId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Sin responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin responsable</SelectItem>
                        {personalPlanificado.map((p) => (
                          <SelectItem key={p.userId} value={p.userId}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Total HH calculado */}
                  {extraHorasPorPersona && miembrosSeleccionados.length > 0 && (
                    <p className="text-xs text-gray-500 text-right">
                      {extraHorasPorPersona}h/pers × {miembrosSeleccionados.length} pers = <span className="font-medium text-gray-700">{extraHorasPorPersona * miembrosSeleccionados.length} HH</span>
                    </p>
                  )}
                </div>
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
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 shrink-0">
                {tipoTarea === 'cronograma' && tareaIds.length > 1
                  ? `${tareaIds.length} × ${miembrosSeleccionados.length} pers.`
                  : `${miembrosSeleccionados.length} pers.`}
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
                (tipoTarea === 'cronograma' && tareaIds.length === 0) ||
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
                  {tipoTarea === 'cronograma' && tareaIds.length > 1
                    ? `Agregar ${tareaIds.length} tareas`
                    : 'Agregar'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
