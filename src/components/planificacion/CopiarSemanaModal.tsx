'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onClose: () => void
  semanaActual: string
  departamentoId?: string
}

function toMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (day - 1))
  return d.toISOString().slice(0, 10)
}

function toISOWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  return new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10)
}

function isoWeekLabel(dateStr: string): string {
  return toISOWeek(dateStr)
}

export default function CopiarSemanaModal({ open, onClose, semanaActual, departamentoId }: Props) {
  const defaultOrigen = toMonday(addDaysStr(semanaActual, -7))
  const defaultDestino = toMonday(semanaActual)

  const [origenFecha, setOrigenFecha] = useState(defaultOrigen)
  const [destinoFecha, setDestinoFecha] = useState(defaultDestino)
  const [loading, setLoading] = useState(false)

  const handleOrigenChange = (val: string) => {
    if (!val) return
    setOrigenFecha(toMonday(val))
  }

  const handleDestinoChange = (val: string) => {
    if (!val) return
    setDestinoFecha(toMonday(val))
  }

  const handleCopiar = async () => {
    if (origenFecha === destinoFecha) {
      toast.error('La semana origen y destino no pueden ser iguales')
      return
    }
    setLoading(true)
    try {
      const body: Record<string, string> = {
        semanaOrigen: toISOWeek(origenFecha),
        semanaDestino: toISOWeek(destinoFecha),
      }
      if (departamentoId) body.departamentoId = departamentoId

      const res = await fetch('/api/planificacion/copiar-semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error?.mensaje ?? data.error ?? 'Error al copiar semana')
        return
      }

      const { celdasCreadas, celdasOmitidas, razonesOmision } = data
      const detallesOmision: string[] = []
      if (razonesOmision.celda_ya_existe > 0) detallesOmision.push(`${razonesOmision.celda_ya_existe} ya existente(s)`)
      if (razonesOmision.celda_excepcional > 0) detallesOmision.push(`${razonesOmision.celda_excepcional} excepcional(es) no copiada(s)`)
      if (razonesOmision.ausencia_destino > 0) detallesOmision.push(`${razonesOmision.ausencia_destino} con ausencia en destino`)
      if (razonesOmision.proyecto_inactivo > 0) detallesOmision.push(`${razonesOmision.proyecto_inactivo} proyecto(s) inactivo(s)`)

      if (celdasCreadas > 0) {
        const msg = celdasOmitidas > 0
          ? `Se crearon ${celdasCreadas} celda(s). Omitidas: ${celdasOmitidas} (${detallesOmision.join(', ')})`
          : `Se crearon ${celdasCreadas} celda(s) correctamente`
        toast.success(msg)
      } else {
        toast.warning(`No se crearon celdas. Omitidas: ${celdasOmitidas} (${detallesOmision.join(', ') || 'sin datos'})`)
      }

      onClose()
    } catch {
      toast.error('Error al copiar semana')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-sm rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Copiar semana</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <Label>Semana origen</Label>
            <input
              type="date"
              value={origenFecha}
              onChange={(e) => handleOrigenChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Semana: {isoWeekLabel(origenFecha)} (lunes: {origenFecha})</p>
          </div>

          <div className="space-y-1.5">
            <Label>Semana destino</Label>
            <input
              type="date"
              value={destinoFecha}
              onChange={(e) => handleDestinoChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Semana: {isoWeekLabel(destinoFecha)} (lunes: {destinoFecha})</p>
          </div>

          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Se copiarán las asignaciones de proyecto (no excepcionales, no ausencias) de la semana origen a la destino.
            Las celdas ya existentes en destino no serán sobreescritas.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleCopiar} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Copiar
          </Button>
        </div>
      </div>
    </div>
  )
}
