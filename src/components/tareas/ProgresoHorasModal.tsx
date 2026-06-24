'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Clock,
  RefreshCw,
  Save,
  User,
  AlertCircle,
  CheckCircle,
  PlusCircle,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface TareaAsignada {
  id: string
  nombre: string
  tipo: 'proyecto_tarea' | 'tarea'
  proyectoId: string
  proyectoNombre: string
  proyectoEdtId?: string | null
  edtNombre: string
  responsableId?: string
  horasPlan: number
  horasReales: number
  progreso: number
  estado: string
}

interface RegistroHora {
  id: string
  fecha: string
  usuarioId: string | null
  usuarioNombre: string
  horas: number
  descripcion: string
  origen: string
}

interface Props {
  tarea: TareaAsignada | null
  open: boolean
  onClose: () => void
  userId: string
  onActualizado: () => void
}

export function ProgresoHorasModal({ tarea, open, onClose, userId, onActualizado }: Props) {
  const { toast } = useToast()

  const [registros, setRegistros] = useState<RegistroHora[]>([])
  const [totalHoras, setTotalHoras] = useState(0)
  const [loading, setLoading] = useState(false)

  // Form horas aproximadas (solo si no hay registros y es owner)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(undefined)
  const [horasAprox, setHorasAprox] = useState('')
  const [descAprox, setDescAprox] = useState('')
  const [guardandoAprox, setGuardandoAprox] = useState(false)
  const [mostrarFormAprox, setMostrarFormAprox] = useState(false)

  // Horas del mes (para colorear el calendario)
  const [horasMes, setHorasMes] = useState<Record<string, number>>({})
  const [horasPorDia, setHorasPorDia] = useState<number>(9.5)
  const [mesCalendario, setMesCalendario] = useState<Date>(new Date())

  // Horas del día seleccionado (para detectar solapamiento)
  const [horasDia, setHorasDia] = useState<{
    horasRegistradas: number
    horasPorDia: number
    horasDisponibles: number
  } | null>(null)
  const [loadingHorasDia, setLoadingHorasDia] = useState(false)

  // Progreso
  const [progresoEdit, setProgresoEdit] = useState(0)
  const [guardandoProgreso, setGuardandoProgreso] = useState(false)
  const [marcarCompletada, setMarcarCompletada] = useState(false)

  const esOwner = !!tarea && !!tarea.responsableId && tarea.responsableId === userId
  const sinRegistros = registros.length === 0

  const cargarHoras = useCallback(async () => {
    if (!tarea || tarea.tipo !== 'proyecto_tarea') return
    setLoading(true)
    try {
      const res = await fetch(`/api/tareas/${tarea.id}/horas`)
      const json = await res.json()
      if (json.success) {
        setRegistros(json.data.registros)
        setTotalHoras(json.data.totalHoras)
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [tarea])

  const fetchHorasDia = useCallback(async (fecha: string) => {
    if (!fecha) return
    setLoadingHorasDia(true)
    try {
      const res = await fetch(`/api/horas-hombre/horas-dia?fecha=${fecha}`)
      const json = await res.json()
      if (json.success) setHorasDia(json.data)
    } catch {
      // silencioso
    } finally {
      setLoadingHorasDia(false)
    }
  }, [])

  const fetchHorasMes = useCallback(async (date: Date) => {
    try {
      const anio = date.getFullYear()
      const mes = date.getMonth() + 1
      const res = await fetch(`/api/horas-hombre/horas-mes?anio=${anio}&mes=${mes}`)
      const json = await res.json()
      if (json.success) {
        setHorasMes(json.data.dias)
        setHorasPorDia(json.data.horasPorDia)
      }
    } catch {
      // silencioso
    }
  }, [])

  useEffect(() => {
    if (open && tarea) {
      const hoy = new Date()
      setProgresoEdit(tarea.progreso)
      setMarcarCompletada(tarea.estado === 'completada')
      setHorasAprox('')
      setDescAprox('')
      setMostrarFormAprox(false)
      setHorasDia(null)
      setHorasMes({})
      setFechaSeleccionada(hoy)
      setMesCalendario(hoy)
      cargarHoras()
    }
  }, [open, tarea, cargarHoras])

  // Cargar horas del mes cuando se abre el form o cambia el mes
  useEffect(() => {
    if (mostrarFormAprox) {
      fetchHorasMes(mesCalendario)
    }
  }, [mostrarFormAprox, mesCalendario, fetchHorasMes])

  // Consultar horas del día cada vez que cambia la fecha seleccionada
  useEffect(() => {
    if (mostrarFormAprox && fechaSeleccionada) {
      fetchHorasDia(format(fechaSeleccionada, 'yyyy-MM-dd'))
    }
  }, [fechaSeleccionada, mostrarFormAprox, fetchHorasDia])

  const guardarProgreso = async () => {
    if (!tarea) return
    setGuardandoProgreso(true)
    try {
      const body: Record<string, unknown> = { tareaId: tarea.id, tipo: tarea.tipo }
      if (marcarCompletada) {
        body.estado = 'completada'
      } else {
        body.progreso = progresoEdit
      }
      const res = await fetch('/api/tareas/mis-asignadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Avance actualizado', description: marcarCompletada ? 'Tarea marcada como completada' : `${progresoEdit}%` })
      onActualizado()
      onClose()
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el avance', variant: 'destructive' })
    } finally {
      setGuardandoProgreso(false)
    }
  }

  const guardarHorasAprox = async () => {
    if (!tarea || !horasAprox || !descAprox.trim() || !fechaSeleccionada) {
      toast({ title: 'Completa todos los campos', variant: 'destructive' })
      return
    }
    const h = parseFloat(horasAprox)
    if (isNaN(h) || h <= 0) {
      toast({ title: 'Ingresa horas válidas', variant: 'destructive' })
      return
    }
    const fechaStr = format(fechaSeleccionada, 'yyyy-MM-dd')
    setGuardandoAprox(true)
    try {
      const res = await fetch('/api/horas-hombre/registrar-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: fechaStr,
          horas: h,
          descripcion: descAprox.trim(),
          proyectoId: tarea.proyectoId,
          proyectoEdtId: tarea.proyectoEdtId ?? undefined,
          proyectoTareaId: tarea.id,
          elementoTipo: 'tarea'
        })
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: json.error || 'No se pudieron guardar las horas', variant: 'destructive' })
        return
      }
      toast({ title: `${h}h registradas correctamente` })
      setHorasAprox('')
      setDescAprox('')
      setMostrarFormAprox(false)
      cargarHoras()
      onActualizado()
    } catch {
      toast({ title: 'Error al registrar horas', variant: 'destructive' })
    } finally {
      setGuardandoAprox(false)
    }
  }

  if (!tarea) return null

  const progresoDisplay = marcarCompletada ? 100 : progresoEdit

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-blue-600" />
            Horas y avance — {tarea.nombre}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{tarea.proyectoNombre} / {tarea.edtNombre}</p>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Resumen de horas */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border bg-gray-50 px-3 py-2">
              <div className="text-lg font-bold text-gray-900">{tarea.horasPlan > 0 ? `${tarea.horasPlan}h` : '—'}</div>
              <div className="text-xs text-gray-500">Planificadas</div>
            </div>
            <div className="rounded-lg border bg-blue-50 px-3 py-2">
              <div className="text-lg font-bold text-blue-700">{totalHoras > 0 ? `${totalHoras}h` : `${tarea.horasReales}h`}</div>
              <div className="text-xs text-blue-500">Registradas</div>
            </div>
            <div className="rounded-lg border bg-gray-50 px-3 py-2">
              <div className={`text-lg font-bold ${tarea.horasPlan > 0 && tarea.horasReales > tarea.horasPlan ? 'text-red-600' : 'text-gray-900'}`}>
                {tarea.horasPlan > 0 ? `${Math.max(0, Math.round((tarea.horasPlan - tarea.horasReales) * 10) / 10)}h` : '—'}
              </div>
              <div className="text-xs text-gray-500">Restantes</div>
            </div>
          </div>

          {/* Tabla de registros */}
          {tarea.tipo === 'proyecto_tarea' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Registros de horas</h3>
                <Button variant="ghost" size="sm" onClick={cargarHoras} disabled={loading} className="h-7 text-xs">
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Cargando...
                </div>
              ) : registros.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs">Usuario</TableHead>
                        <TableHead className="text-xs text-right">Horas</TableHead>
                        <TableHead className="text-xs">Descripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registros.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(r.fecha), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-xs">{r.usuarioNombre}</span>
                              {r.usuarioId === userId && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-200 text-blue-600">tú</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">{r.horas}h</TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-[200px] truncate" title={r.descripcion}>
                            {r.descripcion || <span className="text-gray-300">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-gray-400">
                  <Clock className="h-5 w-5 mx-auto mb-1 opacity-40" />
                  Sin registros de horas en el timesheet
                </div>
              )}

              {/* Horas aproximadas — solo si no hay registros y es owner */}
              {esOwner && sinRegistros && (
                <div className="mt-3">
                  {!mostrarFormAprox ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-dashed"
                      onClick={() => setMostrarFormAprox(true)}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                      Registrar horas aproximadas
                    </Button>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Horas aproximadas — se guardan en el timesheet
                      </div>
                      {/* Calendario con puntos de color por día */}
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <Calendar
                            mode="single"
                            selected={fechaSeleccionada}
                            onSelect={(d) => {
                              setFechaSeleccionada(d)
                              setHorasDia(null)
                            }}
                            month={mesCalendario}
                            onMonthChange={(m) => setMesCalendario(m)}
                            disabled={{ after: new Date() }}
                            className="rounded-md border"
                            components={{
                              Chevron: (props) => props.orientation === 'left'
                                ? <ChevronLeft className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />,
                              DayButton: ({ day, modifiers, className, children, ...btnProps }) => {
                                const dateStr = format(day.date, 'yyyy-MM-dd')
                                const horas = horasMes[dateStr] ?? 0
                                const dotColor = horas >= horasPorDia
                                  ? 'bg-red-400'
                                  : horas > 0
                                    ? 'bg-amber-400'
                                    : ''
                                return (
                                  <button className={cn(className, 'relative')} {...btnProps}>
                                    {children}
                                    {dotColor && (
                                      <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${dotColor}`} />
                                    )}
                                  </button>
                                )
                              }
                            }}
                          />
                        </div>

                        {/* Leyenda */}
                        <div className="flex gap-3 px-1 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />Con horas</span>
                          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-400" />Jornada completa</span>
                        </div>

                        {/* Fila: horas + indicador del día seleccionado */}
                        <div className="flex gap-3 items-start">
                          <div className="w-32 shrink-0">
                            <Label className="text-xs text-gray-600">Horas</Label>
                            <Input
                              type="number"
                              min="0.5"
                              step="0.5"
                              placeholder="8"
                              value={horasAprox}
                              onChange={e => setHorasAprox(e.target.value)}
                              className="h-8 text-xs mt-1"
                            />
                          </div>

                          <div className="flex-1 pt-5">
                            {loadingHorasDia ? (
                              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Consultando...
                              </p>
                            ) : horasDia ? (
                              <div className={`rounded px-2 py-1.5 text-[10px] flex items-center gap-1 ${
                                horasDia.horasDisponibles <= 0
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : horasDia.horasRegistradas > 0
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-green-50 text-green-700 border border-green-200'
                              }`}>
                                <Info className="h-2.5 w-2.5 shrink-0" />
                                {horasDia.horasDisponibles <= 0
                                  ? `Ya tiene ${horasDia.horasRegistradas}h (jornada completa de ${horasDia.horasPorDia}h)`
                                  : horasDia.horasRegistradas > 0
                                    ? `${horasDia.horasRegistradas}h registradas — quedan ${horasDia.horasDisponibles}h`
                                    : `Sin horas registradas ese día`
                                }
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Descripción del trabajo</Label>
                        <Textarea
                          placeholder="Describe brevemente el trabajo realizado..."
                          value={descAprox}
                          onChange={e => setDescAprox(e.target.value)}
                          rows={2}
                          className="text-xs mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={guardarHorasAprox}
                          disabled={guardandoAprox}
                        >
                          {guardandoAprox
                            ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            : <Save className="h-3 w-3 mr-1" />}
                          Guardar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMostrarFormAprox(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Avance */}
          <div className={`rounded-lg border p-3 space-y-3 ${esOwner ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-medium ${esOwner ? 'text-emerald-900' : 'text-gray-700'}`}>
                Avance de la tarea
              </h3>
              <span className={`text-sm font-semibold ${esOwner ? 'text-emerald-800' : 'text-gray-800'}`}>
                {progresoDisplay}%
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${progresoDisplay === 100 ? 'bg-green-500' : esOwner ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${progresoDisplay}%` }}
              />
            </div>

            {esOwner ? (
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progresoDisplay}
                  disabled={marcarCompletada}
                  onChange={e => setProgresoEdit(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 disabled:opacity-40"
                />
                <label className="flex items-center gap-2 text-xs text-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marcarCompletada}
                    onChange={e => setMarcarCompletada(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  <CheckCircle className="h-3.5 w-3.5" />
                  Marcar como completada (100%)
                </label>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Solo el responsable puede modificar el avance.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
          {esOwner && (
            <Button
              size="sm"
              onClick={guardarProgreso}
              disabled={guardandoProgreso}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {guardandoProgreso
                ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Guardar avance
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
