'use client'

// ===================================================
// 📁 EditarControlesDialog
// 📌 Agregar y quitar controles de una fila, uno por uno.
//
// El SSOMA los escribe como viñetas, no como párrafo. Antes se editaban en un
// textarea con todo pegado ("Capacitación en… Trabajar en equipo… Identificar
// y verificar…" en una sola frase) y no había forma de quitar uno sin reescribir
// el resto.
//
// Al guardar se recalcula el riesgo residual: la regla del SSOMA dice que
// ingeniería sube la severidad residual y administrativo la probabilidad, así
// que agregar o quitar un control cambia la valoración.
// ===================================================

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Plus, X } from 'lucide-react'
import { itemsDeControl, calcularResidual } from '@/lib/iperc/riesgoResidual'
import type { IpercFila } from '@/types/iperc'

type Campo = 'eliminar' | 'sustituir' | 'controlIngenieria' | 'controlAdministrativo' | 'controlReceptor'

const CAMPOS: Array<{ campo: Campo; label: string; ayuda: string; color: string }> = [
  { campo: 'eliminar', label: 'Eliminación', ayuda: 'Quitar el peligro de raíz. Rara vez aplica en campo.', color: 'text-muted-foreground' },
  { campo: 'sustituir', label: 'Sustitución', ayuda: 'Reemplazar por algo menos peligroso.', color: 'text-muted-foreground' },
  { campo: 'controlIngenieria', label: 'Ingeniería', ayuda: 'Barreras, aislamiento, guardas. Sube la severidad residual en 1.', color: 'text-blue-700' },
  { campo: 'controlAdministrativo', label: 'Administrativo', ayuda: 'Procedimientos, PETAR, capacitación. Sube la probabilidad residual en 1.', color: 'text-orange-700' },
  { campo: 'controlReceptor', label: 'EPP', ayuda: 'Equipo de protección personal. No modifica la valoración.', color: 'text-green-700' },
]

interface Props {
  proyectoId: string
  fila: IpercFila | null
  onClose: () => void
  onGuardado: () => Promise<void> | void
}

export function EditarControlesDialog({ proyectoId, fila, onClose, onGuardado }: Props) {
  const [items, setItems] = useState<Record<Campo, string[]>>({
    eliminar: [], sustituir: [], controlIngenieria: [], controlAdministrativo: [], controlReceptor: [],
  })
  const [nuevo, setNuevo] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!fila) return
    setItems({
      eliminar: itemsDeControl(fila.eliminar),
      sustituir: itemsDeControl(fila.sustituir),
      controlIngenieria: itemsDeControl(fila.controlIngenieria),
      controlAdministrativo: itemsDeControl(fila.controlAdministrativo),
      controlReceptor: itemsDeControl(fila.controlReceptor),
    })
    setNuevo({})
  }, [fila])

  if (!fila) return null

  const agregar = (campo: Campo) => {
    const texto = (nuevo[campo] ?? '').trim()
    if (!texto) return
    setItems(prev => ({ ...prev, [campo]: [...prev[campo], texto] }))
    setNuevo(prev => ({ ...prev, [campo]: '' }))
  }
  const quitar = (campo: Campo, i: number) =>
    setItems(prev => ({ ...prev, [campo]: prev[campo].filter((_, j) => j !== i) }))

  // Se muestra el residual que va a quedar, para que el cambio no sorprenda.
  const residual = calcularResidual(
    fila.severidad,
    fila.probabilidad,
    items.controlIngenieria.join('\n'),
    items.controlAdministrativo.join('\n'),
  )
  const cambiaResidual =
    residual.severidadResidual !== fila.severidadResidual ||
    residual.probabilidadResidual !== fila.probabilidadResidual

  const guardar = async () => {
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/iperc/filas/${fila.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminar: items.eliminar.join('\n') || 'NA',
          sustituir: items.sustituir.join('\n') || 'NA',
          controlIngenieria: items.controlIngenieria.join('\n'),
          controlAdministrativo: items.controlAdministrativo.join('\n'),
          controlReceptor: items.controlReceptor.join('\n'),
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        toast.error(d.error ?? 'No se pudieron guardar los controles')
        return
      }
      toast.success('Controles actualizados')
      onClose()
      await onGuardado()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={!!fila} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="text-base">Controles de la fila {fila.numero}</DialogTitle>
          <DialogDescription className="text-xs">
            {fila.peligro} — {fila.riesgo}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {CAMPOS.map(({ campo, label, ayuda, color }) => (
            <div key={campo} className="rounded-md border p-2.5">
              <p className={`text-xs font-bold ${color}`}>{label}</p>
              <p className="mb-1.5 text-[11px] text-muted-foreground">{ayuda}</p>
              {items[campo].length === 0 ? (
                <p className="mb-1.5 text-[11px] italic text-muted-foreground">Sin controles.</p>
              ) : (
                <ul className="mb-1.5 space-y-1">
                  {items[campo].map((x, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
                      <span className="flex-1">{x}</span>
                      <button
                        type="button"
                        onClick={() => quitar(campo, i)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        title="Quitar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-1.5">
                <Input
                  value={nuevo[campo] ?? ''}
                  onChange={e => setNuevo(prev => ({ ...prev, [campo]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(campo) } }}
                  placeholder="Agregar un control…"
                  className="h-7 text-xs"
                />
                <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={() => agregar(campo)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t pt-3">
          <p className="mb-2 text-[11px]">
            Riesgo residual:{' '}
            <span className="font-mono font-semibold">
              S{residual.severidadResidual} {residual.probabilidadResidual}
            </span>
            {cambiaResidual && (
              <span className="ml-1 text-amber-700">
                (cambia desde S{fila.severidadResidual} {fila.probabilidadResidual})
              </span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
