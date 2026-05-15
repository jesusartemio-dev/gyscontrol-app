'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProyectoActivo {
  id: string
  codigo: string
  nombre: string
  color: string
}

export interface CeldaMasiva {
  userId: string
  fecha: string
}

interface Props {
  open: boolean
  onClose: () => void
  onDone: () => void
  celdas: CeldaMasiva[]
  proyectos: ProyectoActivo[]
}

export default function AsignacionMasivaModal({ open, onClose, onDone, celdas, proyectos }: Props) {
  const [proyectoId, setProyectoId] = useState('')
  const [notas, setNotas] = useState('')
  const [esExcepcional, setEsExcepcional] = useState(false)
  const [saving, setSaving] = useState(false)

  const tieneFinDeSemana = celdas.some(({ fecha }) => {
    const dow = new Date(fecha + 'T00:00:00.000Z').getUTCDay()
    return dow === 0 || dow === 6
  })

  const numPersonas = new Set(celdas.map((c) => c.userId)).size
  const numDias = new Set(celdas.map((c) => c.fecha)).size

  useEffect(() => {
    if (!open) {
      setProyectoId('')
      setNotas('')
      setEsExcepcional(false)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!proyectoId) return
    setSaving(true)
    try {
      const asignaciones = celdas.map(({ userId, fecha }) => ({
        userId,
        fecha,
        turno: 'dia_completo' as const,
        proyectoId,
        esExcepcional: tieneFinDeSemana ? esExcepcional : false,
        notas: notas.trim() || null,
      }))

      const res = await fetch('/api/planificacion/dia/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones }),
      })
      const result = await res.json()

      if (!res.ok && res.status !== 207) {
        toast.error(result?.error ?? 'Error al asignar celdas')
        return
      }

      const msgs: string[] = []
      if (result.creadas > 0)
        msgs.push(`✓ ${result.creadas} celda${result.creadas !== 1 ? 's' : ''} asignada${result.creadas !== 1 ? 's' : ''}`)
      if (result.actualizadas > 0)
        msgs.push(`✓ ${result.actualizadas} actualizada${result.actualizadas !== 1 ? 's' : ''}`)

      const omitidas: Array<{ razon: string }> = result.omitidas ?? []
      const aus = omitidas.filter((o) => o.razon === 'conflicto_ausencia').length
      const fin = omitidas.filter((o) => o.razon === 'fin_de_semana_no_excepcional').length
      const otro = omitidas.length - aus - fin

      if (aus) msgs.push(`⚠ ${aus} omitida${aus !== 1 ? 's' : ''} (ausencia)`)
      if (fin) msgs.push(`⚠ ${fin} omitida${fin !== 1 ? 's' : ''} (fin de semana)`)
      if (otro) msgs.push(`⚠ ${otro} omitida${otro !== 1 ? 's' : ''} (otro)`)

      toast.success(msgs.join(' · ') || 'Sin cambios')
      onDone()
      onClose()
    } catch {
      toast.error('Error al asignar celdas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignación masiva</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Vas a asignar{' '}
          <strong>
            {celdas.length} celda{celdas.length !== 1 ? 's' : ''}
          </strong>{' '}
          distribuidas en{' '}
          <strong>
            {numPersonas} persona{numPersonas !== 1 ? 's' : ''}
          </strong>{' '}
          y{' '}
          <strong>
            {numDias} día{numDias !== 1 ? 's' : ''}
          </strong>
          .
        </p>

        <div className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>
              Proyecto <span className="text-destructive">*</span>
            </Label>
            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto..." />
              </SelectTrigger>
              <SelectContent>
                {proyectos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: p.color }}
                      />
                      [{p.codigo}] {p.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Notas{' '}
              <span className="text-muted-foreground font-normal">(opcional, se aplican a todas)</span>
            </Label>
            <Textarea
              placeholder="Observaciones sobre esta asignación..."
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={200}
            />
          </div>

          {tieneFinDeSemana && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <input
                type="checkbox"
                id="masivo-excepcional"
                checked={esExcepcional}
                onChange={(e) => setEsExcepcional(e.target.checked)}
                className="h-4 w-4 rounded border-border flex-shrink-0"
              />
              <Label htmlFor="masivo-excepcional" className="cursor-pointer text-sm text-amber-800 dark:text-amber-200">
                Marcar como días excepcionales (la selección incluye fines de semana)
              </Label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!proyectoId || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar {celdas.length} celda{celdas.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
