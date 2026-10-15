'use client'

/**
 * MoverEdtFaseModal - Mueve un EDT (con sus actividades y tareas) a otra fase
 * del mismo cronograma, sin tocar fechas ni horas.
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface MoverEdtFaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  edtId: string
  edtNombre: string
  faseActualNombre: string
  onSuccess: () => void
}

export function MoverEdtFaseModal({ open, onOpenChange, proyectoId, edtId, edtNombre, faseActualNombre, onSuccess }: MoverEdtFaseModalProps) {
  const [fases, setFases] = useState<{ id: string; nombre: string }[]>([])
  const [faseDestinoId, setFaseDestinoId] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const url = `/api/proyectos/${proyectoId}/cronograma/edts/${edtId}/mover-fase`

  useEffect(() => {
    if (!open) return
    setFaseDestinoId('')
    setCargando(true)
    fetch(url)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setFases(d.data || []))
      .catch(() => toast.error('No se pudieron cargar las fases'))
      .finally(() => setCargando(false))
  }, [open, url])

  const mover = async () => {
    if (!faseDestinoId) return
    try {
      setEnviando(true)
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proyectoFaseId: faseDestinoId }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'No se pudo mover el EDT')
      toast.success(d.message || 'EDT movido')
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo mover el EDT')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Mover a otra fase
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium">{edtNombre}</p>
            <p className="text-gray-500">Fase actual: {faseActualNombre}</p>
          </div>

          <div className="space-y-2">
            <Label>Fase destino</Label>
            {cargando ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando fases...
              </div>
            ) : fases.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No hay otra fase en este cronograma.</p>
            ) : (
              <Select value={faseDestinoId} onValueChange={setFaseDestinoId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar fase..." /></SelectTrigger>
                <SelectContent>
                  {fases.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              El EDT pasa con todas sus actividades y tareas, al final de la fase destino. Las fechas, horas y dependencias no se modifican.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
            <Button onClick={mover} disabled={enviando || !faseDestinoId}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
              Mover
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
