'use client'

/**
 * CerrarJornadaModal - Modal wizard de 3 pasos para cerrar una jornada de campo
 *
 * Paso 1: Asignación de horas por tarea/miembro
 * Paso 2: Bloqueos (selección de tipo + descripción)
 * Paso 3: Progreso, avance del día, plan siguiente
 *
 * Defaults inteligentes: si un miembro aparece en N tareas,
 * se le asigna 9.5/N horas por tarea (redondeado a 0.5).
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Clock,
  Users,
  ListTodo,
  AlertTriangle,
  Calendar,
  Loader2,
  Plus,
  X,
  CheckCircle,
  Send,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  ShieldAlert
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TipoBloqueo {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
}

interface Bloqueo {
  tipoBloqueoId: string
  tipoBloqueoNombre: string
  descripcion: string
  impacto: string
}

interface MiembroCierre {
  id: string
  usuarioId: string
  nombre: string
  horas: number
}

interface TareaCierre {
  id: string
  nombre: string
  proyectoTareaId?: string | null
  porcentajeActual?: number
  miembros: MiembroCierre[]
}

interface CerrarJornadaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  proyecto: { codigo: string; nombre: string }
  fechaTrabajo: string
  objetivosDia?: string | null
  tareas: TareaCierre[]
  onSuccess: () => void
}

export function CerrarJornadaModal({
  open,
  onOpenChange,
  jornadaId,
  proyecto,
  fechaTrabajo,
  objetivosDia,
  tareas,
  onSuccess
}: CerrarJornadaModalProps) {
  const { toast } = useToast()

  // Wizard step (1=Horas, 2=Bloqueos, 3=Cierre)
  const [paso, setPaso] = useState<1 | 2 | 3>(1)

  // Estado
  const [submitting, setSubmitting] = useState(false)
  const [avanceDia, setAvanceDia] = useState('')
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [planSiguiente, setPlanSiguiente] = useState('')
  const [progresoTareas, setProgresoTareas] = useState<Record<string, number>>({})
  const [horasMiembros, setHorasMiembros] = useState<Record<string, number>>({})
  const [horasBase, setHorasBase] = useState<Record<string, string>>({})

  // Tipos de bloqueo from DB
  const [tiposBloqueo, setTiposBloqueo] = useState<TipoBloqueo[]>([])

  // Tareas vinculadas a cronograma (solo esas tienen progreso)
  const tareasConProgreso = tareas.filter(t => t.proyectoTareaId)

  // Calcular totales por persona
  const totalesPorPersona = useMemo(() => {
    const totales: Record<string, { nombre: string; total: number }> = {}
    for (const tarea of tareas) {
      for (const m of tarea.miembros) {
        if (!totales[m.usuarioId]) {
          totales[m.usuarioId] = { nombre: m.nombre, total: 0 }
        }
        totales[m.usuarioId].total += horasMiembros[m.id] ?? 0
      }
    }
    return totales
  }, [tareas, horasMiembros])

  const totalHoras = Object.values(totalesPorPersona).reduce((sum, p) => sum + p.total, 0)
  const totalMiembros = Object.keys(totalesPorPersona).length

  // Verificar que todas las horas estén asignadas (> 0)
  const todasHorasAsignadas = useMemo(() => {
    return tareas.every(t => t.miembros.every(m => (horasMiembros[m.id] ?? 0) > 0))
  }, [tareas, horasMiembros])

  // Cargar tipos de bloqueo
  useEffect(() => {
    if (open && tiposBloqueo.length === 0) {
      fetch('/api/configuracion/tipos-bloqueo')
        .then(res => res.json())
        .then((data: TipoBloqueo[]) => {
          setTiposBloqueo(data.filter(t => t.activo))
        })
        .catch(() => {})
    }
  }, [open, tiposBloqueo.length])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setPaso(1)
      setAvanceDia('')
      setBloqueos([])
      setNuevoBloqueo({ tipoBloqueoId: '', descripcion: '', impacto: '' })
      setPlanSiguiente('')

      // Inicializar progreso
      const inicial: Record<string, number> = {}
      tareas.forEach(t => {
        if (t.proyectoTareaId) {
          inicial[t.proyectoTareaId] = t.porcentajeActual ?? 0
        }
      })
      setProgresoTareas(inicial)

      // Calcular cuántas tareas tiene cada persona
      const tareasPerPersona: Record<string, number> = {}
      for (const tarea of tareas) {
        for (const m of tarea.miembros) {
          tareasPerPersona[m.usuarioId] = (tareasPerPersona[m.usuarioId] || 0) + 1
        }
      }

      // Defaults inteligentes por miembro
      const horasIniciales: Record<string, number> = {}
      const basesPorTarea: Record<string, number[]> = {}

      for (const tarea of tareas) {
        basesPorTarea[tarea.id] = []
        for (const m of tarea.miembros) {
          if (m.horas > 0) {
            horasIniciales[m.id] = m.horas
            basesPorTarea[tarea.id].push(m.horas)
          } else {
            const cantTareas = tareasPerPersona[m.usuarioId] || 1
            const defaultHoras = Math.round(9.5 / cantTareas * 2) / 2
            horasIniciales[m.id] = defaultHoras
            basesPorTarea[tarea.id].push(defaultHoras)
          }
        }
      }
      setHorasMiembros(horasIniciales)

      // Pre-llenar input "Aplicar" con el valor más común de cada tarea
      const basesIniciales: Record<string, string> = {}
      for (const tarea of tareas) {
        const valores = basesPorTarea[tarea.id] || []
        if (valores.length > 0) {
          const freq: Record<number, number> = {}
          for (const v of valores) freq[v] = (freq[v] || 0) + 1
          const moda = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
          basesIniciales[tarea.id] = moda[0]
        }
      }
      setHorasBase(basesIniciales)
    }
  }, [open, tareas])

  // Form para nuevo bloqueo
  const [nuevoBloqueo, setNuevoBloqueo] = useState({ tipoBloqueoId: '', descripcion: '', impacto: '' })

  const agregarBloqueo = () => {
    if (!nuevoBloqueo.tipoBloqueoId || !nuevoBloqueo.descripcion.trim()) return
    const tipo = tiposBloqueo.find(t => t.id === nuevoBloqueo.tipoBloqueoId)
    setBloqueos(prev => [...prev, {
      tipoBloqueoId: nuevoBloqueo.tipoBloqueoId,
      tipoBloqueoNombre: tipo?.nombre || '',
      descripcion: nuevoBloqueo.descripcion.trim(),
      impacto: nuevoBloqueo.impacto.trim()
    }])
    setNuevoBloqueo({ tipoBloqueoId: '', descripcion: '', impacto: '' })
  }

  const eliminarBloqueo = (index: number) => {
    setBloqueos(prev => prev.filter((_, i) => i !== index))
  }

  const actualizarHoras = (miembroId: string, horas: number) => {
    setHorasMiembros(prev => ({ ...prev, [miembroId]: horas }))
  }

  const aplicarHorasTarea = (tarea: TareaCierre) => {
    const valor = parseFloat(horasBase[tarea.id] || '0')
    if (valor > 0 && valor <= 24) {
      setHorasMiembros(prev => {
        const updated = { ...prev }
        for (const m of tarea.miembros) {
          updated[m.id] = valor
        }
        return updated
      })
    }
  }

  const handleSubmit = async () => {
    if (!avanceDia.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El avance del día es requerido' })
      return
    }

    if (!todasHorasAsignadas) {
      toast({ variant: 'destructive', title: 'Error', description: 'Todas las horas deben ser mayores a 0' })
      return
    }

    const bloqueosValidos = bloqueos.filter(b => b.tipoBloqueoId && b.descripcion.trim())

    try {
      setSubmitting(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/cerrar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avanceDia: avanceDia.trim(),
          bloqueos: bloqueosValidos.length > 0 ? bloqueosValidos.map(b => ({
            tipoBloqueoId: b.tipoBloqueoId,
            tipoBloqueoNombre: b.tipoBloqueoNombre,
            descripcion: b.descripcion.trim(),
            impacto: b.impacto.trim() || undefined
          })) : undefined,
          planSiguiente: planSiguiente.trim() || undefined,
          progresoTareas: Object.entries(progresoTareas).map(([proyectoTareaId, porcentaje]) => ({
            proyectoTareaId,
            porcentaje
          })),
          horasMiembros: Object.entries(horasMiembros).map(([miembroId, horas]) => ({
            miembroId,
            horas
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error cerrando jornada')
      }

      toast({
        title: 'Jornada cerrada',
        description: 'La jornada ha sido enviada para aprobación'
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error cerrando jornada'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const getProgresoColor = (pct: number) => {
    if (pct >= 100) return 'text-green-700 bg-green-100'
    if (pct >= 50) return 'text-blue-700 bg-blue-100'
    if (pct > 0) return 'text-amber-700 bg-amber-100'
    return 'text-gray-500 bg-gray-100'
  }

  // Step indicator helpers
  const stepDone = (step: number) => {
    if (step === 1) return todasHorasAsignadas && paso > 1
    if (step === 2) return paso > 2
    return false
  }

  const canGoToStep = (step: number) => {
    if (step === 1) return true
    if (step === 2) return todasHorasAsignadas
    if (step === 3) return todasHorasAsignadas
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-orange-600" />
            Cerrar Jornada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header: proyecto + step indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm">{proyecto.codigo}</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-500">{formatFecha(fechaTrabajo)}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="text-xs gap-1 px-1.5">
                  <ListTodo className="h-3 w-3" />{tareas.length}
                </Badge>
                <Badge variant="secondary" className="text-xs gap-1 px-1.5">
                  <Users className="h-3 w-3" />{totalMiembros}
                </Badge>
                {totalHoras > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1 px-1.5 font-semibold">
                    <Clock className="h-3 w-3" />{totalHoras}h
                  </Badge>
                )}
              </div>
            </div>

            {/* Step indicator - 3 steps */}
            <div className="flex items-center gap-1.5 px-1">
              {[
                { num: 1, label: 'Horas' },
                { num: 2, label: 'Bloqueos' },
                { num: 3, label: 'Cierre' }
              ].map((step, idx) => (
                <React.Fragment key={step.num}>
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />}
                  <button
                    type="button"
                    onClick={() => canGoToStep(step.num) && setPaso(step.num as 1 | 2 | 3)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      paso === step.num ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
                    } ${!canGoToStep(step.num) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      paso === step.num
                        ? 'bg-orange-600 text-white'
                        : stepDone(step.num)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {stepDone(step.num) ? <CheckCircle className="h-3 w-3" /> : step.num}
                    </span>
                    {step.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ===== PASO 1: Horas ===== */}
          {paso === 1 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-orange-600" />
                Horas por tarea <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                {tareas.map(tarea => (
                  <div key={tarea.id} className="rounded-lg border px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{tarea.nombre}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          placeholder="Hrs"
                          value={horasBase[tarea.id] ?? ''}
                          onChange={e => setHorasBase(prev => ({ ...prev, [tarea.id]: e.target.value }))}
                          className="w-16 h-7 text-xs text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => aplicarHorasTarea(tarea)}
                          disabled={!horasBase[tarea.id] || parseFloat(horasBase[tarea.id]) <= 0}
                          className="h-7 text-[11px] px-2"
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {tarea.miembros.map(m => (
                        <div key={m.id} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-600 min-w-0 truncate max-w-[100px]">{m.nombre}</span>
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={horasMiembros[m.id] ?? 0}
                            onChange={e => actualizarHoras(m.id, parseFloat(e.target.value) || 0)}
                            className="w-[4.5rem] h-7 text-xs text-center"
                          />
                          <span className="text-[11px] text-gray-400">h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales por persona */}
              {Object.keys(totalesPorPersona).length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
                  {Object.values(totalesPorPersona).map(p => (
                    <span
                      key={p.nombre}
                      className={`text-[11px] flex items-center gap-1 ${
                        p.total > 9.5 ? 'text-amber-600 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {p.nombre}: {p.total}h
                      {p.total > 0 && p.total <= 9.5 && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {p.total > 9.5 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== PASO 2: Bloqueos ===== */}
          {paso === 2 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Bloqueos del dia
              </Label>

              {/* Lista de bloqueos agregados */}
              {bloqueos.length > 0 && (
                <div className="space-y-1.5">
                  {bloqueos.map((bloqueo, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-200 rounded px-1.5 py-0.5">
                          {bloqueo.tipoBloqueoNombre}
                        </span>
                        <p className="text-sm mt-1 leading-snug">{bloqueo.descripcion}</p>
                        {bloqueo.impacto && (
                          <p className="text-xs text-amber-600 mt-0.5">Impacto: {bloqueo.impacto}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarBloqueo(index)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para agregar bloqueo */}
              <div className="rounded-lg border border-dashed border-gray-300 p-3 space-y-2">
                <Select
                  value={nuevoBloqueo.tipoBloqueoId}
                  onValueChange={val => setNuevoBloqueo(prev => ({ ...prev, tipoBloqueoId: val }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar tipo de bloqueo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposBloqueo.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium text-sm">{tipo.nombre}</span>
                          {tipo.descripcion && (
                            <span className="text-xs text-gray-500 leading-tight">{tipo.descripcion}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Ej: No llegaron los tubos de 4&quot; solicitados el lunes, se esperó hasta las 11am..."
                  value={nuevoBloqueo.descripcion}
                  onChange={e => setNuevoBloqueo(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={2}
                  className="text-sm resize-none"
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Ej: 4h perdidas, 3 personas paradas"
                    value={nuevoBloqueo.impacto}
                    onChange={e => setNuevoBloqueo(prev => ({ ...prev, impacto: e.target.value }))}
                    className="h-7 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarBloqueo}
                    disabled={!nuevoBloqueo.tipoBloqueoId || !nuevoBloqueo.descripcion.trim()}
                    className="h-7 text-xs px-3 text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>

              {bloqueos.length === 0 && (
                <p className="text-[11px] text-gray-400 leading-tight px-1">
                  Si no hubo bloqueos, puedes continuar al siguiente paso.
                </p>
              )}
            </div>
          )}

          {/* ===== PASO 3: Cierre ===== */}
          {paso === 3 && (
            <div className="space-y-4">
              {/* Progreso de tareas */}
              {tareasConProgreso.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Progreso de tareas
                  </Label>
                  <div className="space-y-2">
                    {tareasConProgreso.map(tarea => {
                      const progreso = progresoTareas[tarea.proyectoTareaId!] ?? 0
                      const changed = tarea.porcentajeActual !== undefined && tarea.porcentajeActual !== progreso
                      return (
                        <div key={tarea.id} className="rounded-lg border px-3 py-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm truncate flex-1">{tarea.nombre}</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getProgresoColor(progreso)}`}>
                              {progreso}%
                            </span>
                          </div>
                          <Slider
                            value={[progreso]}
                            onValueChange={([val]) => {
                              setProgresoTareas(prev => ({
                                ...prev,
                                [tarea.proyectoTareaId!]: val
                              }))
                            }}
                            max={100}
                            step={5}
                          />
                          {changed && (
                            <div className="text-[11px] text-gray-400">
                              {tarea.porcentajeActual}% → {progreso}%
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Avance del día */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Avance del dia <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Describe el avance logrado hoy..."
                  value={avanceDia}
                  onChange={e => setAvanceDia(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Plan siguiente */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Plan para manana
                </Label>
                <Textarea
                  placeholder="Que se planea hacer el proximo dia..."
                  value={planSiguiente}
                  onChange={e => setPlanSiguiente(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Resumen bloqueos si hay */}
              {bloqueos.filter(b => b.tipoBloqueoId).length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  <span className="text-[11px] text-gray-400">Bloqueos:</span>
                  {bloqueos.filter(b => b.tipoBloqueoId).map((b, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700">
                      {b.tipoBloqueoNombre}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Nota sutil */}
              <p className="text-[11px] text-gray-400 leading-tight">
                Al cerrar, la jornada sera enviada para aprobacion. Las horas apareceran en los timesheets una vez aprobada.
              </p>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex justify-between gap-2 pt-2 border-t">
            {paso === 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPaso(2)}
                  disabled={!todasHorasAsignadas}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
            {paso === 2 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaso(1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Atras
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPaso(3)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
            {paso === 3 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaso(2)}
                  disabled={submitting}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Atras
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !avanceDia.trim() || tareas.length === 0 || !todasHorasAsignadas}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Cerrando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1.5" />
                      Cerrar y Enviar
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
