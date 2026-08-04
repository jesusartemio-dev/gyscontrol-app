'use client'

/**
 * MoverActividadEdtModal - Mueve una actividad (con sus tareas) de su EDT
 * actual a otro EDT de la MISMA fase, sin tocar fechas ni horas.
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EdtCandidato {
  id: string
  nombre: string
  edt?: { nombre: string } | null
}

interface MoverActividadEdtModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  actividadId: string
  actividadNombre: string
  edtActualNombre: string
  onSuccess: () => void
}

export function MoverActividadEdtModal({
  open,
  onOpenChange,
  proyectoId,
  actividadId,
  actividadNombre,
  edtActualNombre,
  onSuccess
}: MoverActividadEdtModalProps) {
  const { toast } = useToast()
  const [edtsCandidatos, setEdtsCandidatos] = useState<EdtCandidato[]>([])
  const [edtDestinoId, setEdtDestinoId] = useState('')
  const [loadingEdts, setLoadingEdts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEdtDestinoId('')
      cargarEdtsCandidatos()
    }
  }, [open])

  const cargarEdtsCandidatos = async () => {
    try {
      setLoadingEdts(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/actividades/${actividadId}/mover-edt`)
      if (!response.ok) throw new Error('Error al cargar EDTs')
      const data = await response.json()
      setEdtsCandidatos(data.data || [])
    } catch (error) {
      console.error('Error cargando EDTs candidatos:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los EDTs de la fase' })
    } finally {
      setLoadingEdts(false)
    }
  }

  const handleMover = async () => {
    if (!edtDestinoId) return
    try {
      setSubmitting(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/actividades/${actividadId}/mover-edt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proyectoEdtId: edtDestinoId })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al mover la actividad')

      toast({ title: 'Actividad movida', description: data.message })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error moviendo actividad:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo mover la actividad'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Mover a otro EDT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium">{actividadNombre}</p>
            <p className="text-gray-500">EDT actual: {edtActualNombre}</p>
          </div>

          <div className="space-y-2">
            <Label>EDT destino (misma fase)</Label>
            {loadingEdts ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando EDTs...
              </div>
            ) : edtsCandidatos.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                No hay otro EDT en esta fase para mover la actividad.
              </p>
            ) : (
              <Select value={edtDestinoId} onValueChange={setEdtDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar EDT..." />
                </SelectTrigger>
                <SelectContent>
                  {edtsCandidatos.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.edt?.nombre ? `${e.edt.nombre} - ${e.nombre}` : e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              La actividad y todas sus tareas se reasignan al nuevo EDT. Las fechas y horas no se modifican.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleMover} disabled={submitting || !edtDestinoId}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
              Mover
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MoverActividadEdtModal
