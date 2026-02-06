'use client'

/**
 * CerrarJornadaModal - Modal para cerrar una jornada de campo
 *
 * Permite registrar:
 * - Progreso de tareas (slider %)
 * - Avance del día (requerido)
 * - Bloqueos encontrados (opcional, compactos)
 * - Plan para el día siguiente (opcional)
 */

import React, { useState } from 'react'
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

interface TareaResumen {
  id: string
  nombre: string
  miembros: number
  horas: number
  proyectoTareaId?: string | null
  porcentajeActual?: number
}

interface CerrarJornadaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  proyecto: { codigo: string; nombre: string }
  fechaTrabajo: string
  objetivosDia?: string | null
  tareasResumen: TareaResumen[]
  totalHoras: number
  totalMiembros: number
  onSuccess: () => void
}

export function CerrarJornadaModal({
  open,
  onOpenChange,
  jornadaId,
  proyecto,
  fechaTrabajo,
  objetivosDia,
  tareasResumen,
  totalHoras,
  totalMiembros,
  onSuccess
}: CerrarJornadaModalProps) {
  const { toast } = useToast()

  // Estado
  const [submitting, setSubmitting] = useState(false)
  const [avanceDia, setAvanceDia] = useState('')
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [planSiguiente, setPlanSiguiente] = useState('')
  const [progresoTareas, setProgresoTareas] = useState<Record<string, number>>({})

  // Tareas vinculadas a cronograma (solo esas tienen progreso)
  const tareasConProgreso = tareasResumen.filter(t => t.proyectoTareaId)

  // Reset al abrir
  React.useEffect(() => {
    if (open) {
      setAvanceDia('')
      setBloqueos([])
      setPlanSiguiente('')
      const inicial: Record<string, number> = {}
      tareasResumen.forEach(t => {
        if (t.proyectoTareaId) {
          inicial[t.proyectoTareaId] = t.porcentajeActual ?? 0
        }
      })
      setProgresoTareas(inicial)
    }
  }, [open])

  const agregarBloqueo = () => {
    setBloqueos(prev => [...prev, { descripcion: '', impacto: '', accion: '' }])
  }

  const actualizarBloqueo = (index: number, campo: keyof Bloqueo, valor: string) => {
    setBloqueos(prev => prev.map((b, i) => i === index ? { ...b, [campo]: valor } : b))
  }

  const eliminarBloqueo = (index: number) => {
    setBloqueos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!avanceDia.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El avance del día es requerido' })
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
                <ListTodo className="h-3 w-3" />{tareasResumen.length}
              </Badge>
              <Badge variant="secondary" className="text-xs gap-1 px-1.5">
                <Users className="h-3 w-3" />{totalMiembros}
              </Badge>
              <Badge variant="secondary" className="text-xs gap-1 px-1.5 font-semibold">
                <Clock className="h-3 w-3" />{totalHoras}h
              </Badge>
            </div>
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
              disabled={submitting || !avanceDia.trim() || tareasResumen.length === 0}
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
