'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { readSSEStream } from '@/lib/planTrabajo/sseClient'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

interface Props {
  proyectoId: string
  edtRefId: string
  nombreEdt: string
  disabled?: boolean
  /** El editor reemplaza SOLO este EDT en su estado local — el resto de EDTs (con sus ediciones locales sin guardar) no se toca. */
  onRegenerado: (edtFresco: PlanAlcanceDetalladoEdt) => void
}

/**
 * "Regenerar" a nivel de UN SOLO EDT (Bloque 4.2 sesión 5) — reprocesa
 * únicamente este EDT (una llamada Sonnet si es 'detallado', o el batch
 * mínimo de Haiku si es 'resumido'); el resto del alcance detallado queda
 * intacto en el servidor (ver aplicarAlcanceDeRegeneracion.ts). Mismo patrón
 * de diálogo que `BotonRegenerarSeccion.tsx`, con el checkbox adicional de
 * sobrescribir textos editados a mano.
 */
export function RegenerarEdtDialog({ proyectoId, edtRefId, nombreEdt, disabled, onRegenerado }: Props) {
  const [open, setOpen] = useState(false)
  const [instrucciones, setInstrucciones] = useState('')
  const [sobrescribir, setSobrescribir] = useState(false)
  const [running, setRunning] = useState(false)

  const handleConfirm = async () => {
    setRunning(true)
    setOpen(false)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/regenerar-seccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seccion: 'alcanceDetallado',
          edtRefId,
          instruccionesAdicionales: instrucciones.trim() || undefined,
          sobrescribirEditados: sobrescribir,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al regenerar el EDT')
      }
      await readSSEStream(res, () => {}, async (data) => {
        const advertencias = (data.advertencias as string[] | undefined) ?? []
        const edtRegenerado = data.edtRegenerado as PlanAlcanceDetalladoEdt | null
        if (edtRegenerado) onRegenerado(edtRegenerado)
        if (advertencias.length > 0) {
          toast.warning(`"${nombreEdt}" regenerado con advertencias — ver consola.`, { duration: 6000 })
          console.warn(`[plan-trabajo] Advertencias al regenerar EDT "${nombreEdt}":`, advertencias)
        } else {
          toast.success(`"${nombreEdt}" regenerado`)
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al regenerar el EDT')
    } finally {
      setRunning(false)
      setInstrucciones('')
      setSobrescribir(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled={disabled || running}
        onClick={() => setOpen(true)}
        title="Regenerar solo este EDT con IA"
      >
        {running ? <Loader2 size={12} className="mr-1 animate-spin" /> : <RefreshCw size={12} className="mr-1" />}
        Regenerar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerar &quot;{nombreEdt}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Se regenerará <span className="font-medium text-foreground">solo este EDT</span> con IA — el resto
              del alcance detallado (los demás EDTs) queda intacto, sin tocarse.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Instrucciones adicionales (opcional)</Label>
              <Textarea
                value={instrucciones}
                onChange={e => setInstrucciones(e.target.value)}
                placeholder="Ej: Enfatizar el uso de andamios certificados en esta actividad..."
                className="text-sm resize-none"
                rows={3}
                maxLength={2000}
              />
              <p className="text-[10px] text-muted-foreground text-right">{instrucciones.length}/2000</p>
            </div>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <Checkbox checked={sobrescribir} onCheckedChange={v => setSobrescribir(v === true)} className="mt-0.5" />
              <span>Sobrescribir también los textos editados manualmente en este EDT</span>
            </label>
            {sobrescribir && (
              <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                <span>Se perderán las descripciones/viñetas que hayas editado a mano dentro de este EDT.</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Regenerar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
