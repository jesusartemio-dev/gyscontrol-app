'use client'

/**
 * CerrarJornadaModal - Modal para cerrar una jornada de campo
 *
 * Permite registrar:
 * - Horas por tarea/miembro (requerido)
 * - Progreso de tareas (slider %)
 * - Avance del día (requerido)
 * - Bloqueos encontrados (opcional, compactos)
 * - Plan para el día siguiente (opcional)
 */

import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
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
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Bloqueo {
  descripcion: string
  impacto: string
  accion: string
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

  // Estado
  const [submitting, setSubmitting] = useState(false)
  const [avanceDia, setAvanceDia] = useState('')
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [planSiguiente, setPlanSiguiente] = useState('')
  const [progresoTareas, setProgresoTareas] = useState<Record<string, number>>({})
  const [horasMiembros, setHorasMiembros] = useState<Record<string, number>>({})
  const [horasBase, setHorasBase] = useState<Record<string, string>>({})

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

  // Reset al abrir
  React.useEffect(() => {
    if (open) {
      setAvanceDia('')
      setBloqueos([])
      setPlanSiguiente('')

      // Inicializar progreso
      const inicial: Record<string, number> = {}
      tareas.forEach(t => {
        if (t.proyectoTareaId) {
          inicial[t.proyectoTareaId] = t.porcentajeActual ?? 0
        }
      })
      setProgresoTareas(inicial)

      // Inicializar horas con defaults inteligentes
      const horasIniciales: Record<string, number> = {}
      const cantTareas = tareas.length
      const defaultHoras = cantTareas === 1 ? 9.5 : Math.round(9.5 / cantTareas * 2) / 2

      for (const tarea of tareas) {
        for (const m of tarea.miembros) {
          // Si el miembro ya tiene horas > 0 (editado previamente), usar ese valor
          horasIniciales[m.id] = m.horas > 0 ? m.horas : defaultHoras
        }
      }
      setHorasMiembros(horasIniciales)
    }
  }, [open, tareas])

  const agregarBloqueo = () => {
    setBloqueos(prev => [...prev, { descripcion: '', impacto: '', accion: '' }])
  }

  const actualizarBloqueo = (index: number, campo: keyof Bloqueo, valor: string) => {
    setBloqueos(prev => prev.map((b, i) => i === index ? { ...b, [campo]: valor } : b))
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

    const bloqueosValidos = bloqueos.filter(b => b.descripcion.trim())

    try {
      setSubmitting(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/cerrar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avanceDia: avanceDia.trim(),
          bloqueos: bloqueosValidos.length > 0 ? bloqueosValidos.map(b => ({
            descripcion: b.descripcion.trim(),
            impacto: b.impacto.trim() || undefined,
            accion: b.accion.trim() || undefined
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
          {/* Resumen compacto */}
          <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm">{proyecto.codigo}</span>
              <span className="text-xs text-gray-500 hidden sm:inline">·</span>
              <span className="text-xs text-gray-500 hidden sm:inline">{formatFecha(fechaTrabajo)}</span>
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

          {/* Horas por tarea */}
          <div className="space-y-2">
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

          {/* Progreso de tareas - integrado */}
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
              Avance del día <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Describe el avance logrado hoy..."
              value={avanceDia}
              onChange={e => setAvanceDia(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Bloqueos - compactos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Bloqueos
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={agregarBloqueo}
                className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Agregar
              </Button>
            </div>

            {bloqueos.length > 0 && (
              <div className="space-y-2">
                {bloqueos.map((bloqueo, index) => (
                  <div key={index} className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Descripcion del bloqueo"
                        value={bloqueo.descripcion}
                        onChange={e => actualizarBloqueo(index, 'descripcion', e.target.value)}
                        className="h-8 text-sm bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarBloqueo(index)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Impacto"
                        value={bloqueo.impacto}
                        onChange={e => actualizarBloqueo(index, 'impacto', e.target.value)}
                        className="h-7 text-xs bg-white"
                      />
                      <Input
                        placeholder="Accion tomada"
                        value={bloqueo.accion}
                        onChange={e => actualizarBloqueo(index, 'accion', e.target.value)}
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plan siguiente */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
              Plan para mañana
            </Label>
            <Textarea
              placeholder="Que se planea hacer el proximo dia..."
              value={planSiguiente}
              onChange={e => setPlanSiguiente(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Nota sutil */}
          <p className="text-[11px] text-gray-400 leading-tight">
            Al cerrar, la jornada sera enviada para aprobacion. Las horas apareceran en los timesheets una vez aprobada.
          </p>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
