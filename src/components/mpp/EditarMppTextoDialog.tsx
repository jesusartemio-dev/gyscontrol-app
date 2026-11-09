'use client'

// "Texto / IA" del MPP: un grupo de EPP (una parte del cuerpo o todos) como
// texto para copiar, revisar con una IA y pegar de vuelta. Antes de guardar
// se ve qué puestos se agregan / quitan a cada EPP; Guardar aplica todo junto.

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CopiarPegarTexto } from '@/components/portapapeles/CopiarPegarTexto'
import { instruccionesMpp, itemsATexto, textoAItems, type ItemMppTexto } from '@/lib/mpp/textoMpp'

interface Props<T extends ItemMppTexto> {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  titulo: string
  /** EPP de esta parte (los que se copian). */
  itemsParte: T[]
  /** Todos los EPP del MPP (para ubicar cualquiera que venga en el texto). */
  todosLosItems: T[]
  puestos: string[]
  onAplicado: (items: T[]) => void
}

export function EditarMppTextoDialog<T extends ItemMppTexto>({
  open, onOpenChange, proyectoId, titulo, itemsParte, todosLosItems, puestos, onAplicado,
}: Props<T>) {
  const textoInicial = useMemo(() => itemsATexto(itemsParte, puestos, titulo), [itemsParte, puestos, titulo])
  const [texto, setTexto] = useState(textoInicial)
  const [conInstrucciones, setConInstrucciones] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [abiertoCon, setAbiertoCon] = useState<string | null>(null)
  if (open && abiertoCon !== textoInicial) {
    setAbiertoCon(textoInicial)
    setTexto(textoInicial)
  }
  if (!open && abiertoCon !== null) setAbiertoCon(null)

  const res = useMemo(() => textoAItems(texto, todosLosItems, puestos), [texto, todosLosItems, puestos])
  const puedeGuardar = res.cambios.length > 0 && res.errores.length === 0 && !guardando

  const guardar = async () => {
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/mpp/items/lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cambios: res.cambios.map((c) => ({
            id: c.id,
            asignaciones: c.asignaciones,
            ...(c.obsCambia ? { observaciones: c.observaciones ?? null } : {}),
          })),
        }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error ?? `No se pudo guardar (HTTP ${r.status})`)
      onAplicado(body.items as T[])
      toast.success(`${body.actualizados} EPP actualizado(s)`)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!guardando) onOpenChange(o) }}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-3 overflow-y-auto p-3 sm:p-5">
        <DialogHeader className="space-y-1 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-700">MPP · {titulo}</p>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Sparkles className="h-4 w-4 text-indigo-500" /> Editar con texto / IA
          </DialogTitle>
          <DialogDescription className="text-xs">
            Copiá, pegalo en Claude o ChatGPT, pedile que revise quién usa cada EPP y pegá acá su respuesta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={conInstrucciones} onCheckedChange={(v) => setConInstrucciones(v === true)} />
            Copiar con instrucciones para la IA
          </label>
          <CopiarPegarTexto
            conEtiqueta
            texto={conInstrucciones ? `${instruccionesMpp(puestos)}\n\n${texto}` : texto}
            onPegar={setTexto}
          />
        </div>

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          className="h-[34dvh] min-h-[180px] resize-y font-mono text-[12px] leading-relaxed"
        />

        <div className="space-y-2 rounded-md border bg-muted/30 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{res.bloques} EPP en el texto:</span>
            <span className={res.cambios.length ? 'font-medium text-blue-700' : 'text-muted-foreground'}>{res.cambios.length} con cambios</span>
            <span className="text-muted-foreground">{res.sinCambios} sin cambios</span>
            {res.errores.length > 0 && <span className="font-medium text-red-600">{res.errores.length} error(es)</span>}
          </div>
          {res.errores.length > 0 && (
            <ul className="space-y-0.5 rounded border border-red-200 bg-red-50 p-2 text-red-700">
              {res.errores.slice(0, 12).map((e, i) => (
                <li key={i} className="flex gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{e}</li>
              ))}
            </ul>
          )}
          {res.cambios.map((c) => (
            <div key={c.id} className="space-y-0.5 rounded border bg-white px-2 py-1.5">
              <p className="font-medium"><span className="font-mono text-muted-foreground">#{c.orden}</span> {c.nombre}</p>
              {c.agregados.length > 0 && <p className="text-emerald-700">+ {c.agregados.join(', ')}</p>}
              {c.quitados.length > 0 && <p className="text-red-700">− {c.quitados.join(', ')}</p>}
              {c.obsCambia && <p className="text-blue-700">Observaciones: {c.observaciones || '(sin observaciones)'}</p>}
            </div>
          ))}
          {!res.cambios.length && !res.errores.length && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sin cambios todavía: pegá la respuesta de la IA.
            </p>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={guardando}>Cancelar</Button>
          <Button size="sm" onClick={guardar} disabled={!puedeGuardar}>
            {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Guardar {res.cambios.length ? `(${res.cambios.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
