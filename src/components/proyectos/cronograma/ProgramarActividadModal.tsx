'use client'

/**
 * ProgramarActividadModal - Programa una actividad después de otra o en
 * paralelo con ella. La actividad se mueve en bloque con sus tareas; el nuevo
 * inicio lo calcula el servidor con el calendario laboral del proyecto.
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowRightToLine, Columns2, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export type ModoProgramacion = 'despues_de' | 'en_paralelo'

export interface ActividadCandidata {
  id: string
  nombre: string
  fechaInicio?: string
  fechaFin?: string
}

interface ProgramarActividadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  modo: ModoProgramacion
  actividadNodeId: string
  actividadNombre: string
  candidatas: ActividadCandidata[]
  onSuccess: () => void
}

// Las fechas del cronograma se muestran por día UTC, igual que en el árbol.
const fmtDia = (f?: string) =>
  f ? new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—'

export function ProgramarActividadModal({
  open,
  onOpenChange,
  proyectoId,
  modo,
  actividadNodeId,
  actividadNombre,
  candidatas,
  onSuccess,
}: ProgramarActividadModalProps) {
  const [referenciaId, setReferenciaId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setReferenciaId('')
  }, [open])

  const esDespues = modo === 'despues_de'
  const Icono = esDespues ? ArrowRightToLine : Columns2

  const handleProgramar = async () => {
    if (!referenciaId) return
    try {
      setSubmitting(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/tree/${actividadNodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programarRespecto: { modo, actividadId: referenciaId } }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo programar la actividad')

      toast.success(esDespues ? 'Actividad programada después de la seleccionada' : 'Actividad programada en paralelo')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo programar la actividad')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icono className="h-5 w-5" />
            {esDespues ? 'Programar después de…' : 'En paralelo con…'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium">{actividadNombre}</p>
          </div>

          <div className="space-y-2">
            <Label>{esDespues ? 'Empieza después de' : 'Empieza junto con'}</Label>
            {candidatas.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No hay otras actividades en este EDT.</p>
            ) : (
              <Select value={referenciaId} onValueChange={setReferenciaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar actividad..." />
                </SelectTrigger>
                <SelectContent>
                  {candidatas.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} ({fmtDia(c.fechaInicio)}–{fmtDia(c.fechaFin)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              {esDespues
                ? 'La actividad empezará el siguiente día laborable al fin de la seleccionada.'
                : 'La actividad empezará el mismo día que la seleccionada.'}
              {' '}Todas sus tareas se mueven en bloque, conservando su duración, según el calendario laboral del proyecto.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleProgramar} disabled={submitting || !referenciaId}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Icono className="h-4 w-4 mr-2" />}
              Programar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProgramarActividadModal
