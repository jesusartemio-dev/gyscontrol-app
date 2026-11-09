'use client'

// "Texto / IA" del IPERC: una parte (una actividad, una fila o todo) como
// texto para copiar, mejorar en una IA (Claude, ChatGPT…) y pegar de vuelta.
// Antes de guardar se ve qué cambia (antes → después), qué filas se agregan y
// los errores; recién ahí se guarda todo junto (o nada).

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CopiarPegarTexto } from '@/components/portapapeles/CopiarPegarTexto'
import {
  INSTRUCCIONES_IA, etiquetaCampo, filasATexto, textoAFilas, textoNivel,
  type CampoIperc, type FilaIpercTexto,
} from '@/lib/iperc/textoIperc'
import type { IpercFila } from '@/types/iperc'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  /** Qué parte es: "EJECUCIÓN › Montaje de bandejas", "Fila 12", "IPERC completo". */
  titulo: string
  /** Filas de esta parte (las que se copian). */
  filasParte: IpercFila[]
  /** Todas las filas (para ubicar cualquier id que venga en el texto). */
  todasLasFilas: IpercFila[]
  onAplicado: (filas: IpercFila[]) => void
}

const CAMPOS_NIVEL: CampoIperc[] = ['severidad', 'probabilidad', 'severidadResidual', 'probabilidadResidual']

export function EditarIpercTextoDialog({ open, onOpenChange, proyectoId, titulo, filasParte, todasLasFilas, onAplicado }: Props) {
  const textoInicial = useMemo(
    () => filasATexto(filasParte as unknown as FilaIpercTexto[], { titulo }),
    [filasParte, titulo],
  )
  const [texto, setTexto] = useState(textoInicial)
  const [conInstrucciones, setConInstrucciones] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [abiertoCon, setAbiertoCon] = useState<string | null>(null)
  // Al abrir (o si cambió la parte), arranca con el texto actual.
  if (open && abiertoCon !== textoInicial) {
    setAbiertoCon(textoInicial)
    setTexto(textoInicial)
  }
  if (!open && abiertoCon !== null) setAbiertoCon(null)

  const resultado = useMemo(
    () => textoAFilas(texto, todasLasFilas as unknown as FilaIpercTexto[]),
    [texto, todasLasFilas],
  )
  const idsParte = useMemo(() => new Set(filasParte.map((f) => f.id)), [filasParte])
  const noVinieron = filasParte.filter((f) => !resultado.idsVistos.includes(f.id)).length
  const deOtrasPartes = resultado.idsVistos.filter((id) => !idsParte.has(id)).length
  const hayCambios = resultado.cambiadas.length + resultado.nuevas.length > 0
  const puedeGuardar = hayCambios && resultado.errores.length === 0 && !guardando
  const ultimaDeLaParte = filasParte[filasParte.length - 1]?.id ?? null

  const guardar = async () => {
    setGuardando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc/filas/lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualizar: resultado.cambiadas.map((c) => ({ id: c.id, cambios: c.cambios })),
          crear: resultado.nuevas.map((n) => ({ datos: n.datos, despuesDeId: n.despuesDeId ?? ultimaDeLaParte })),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `No se pudo guardar (HTTP ${res.status})`)
      onAplicado(body.data as IpercFila[])
      toast.success(
        [body.actualizadas ? `${body.actualizadas} fila(s) actualizada(s)` : '', body.creadas ? `${body.creadas} nueva(s)` : '']
          .filter(Boolean).join(' · ') || 'Guardado',
      )
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
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-700">IPERC · {titulo}</p>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Sparkles className="h-4 w-4 text-indigo-500" /> Editar con texto / IA
          </DialogTitle>
          <DialogDescription className="text-xs">
            Copiá, pegalo en Claude o ChatGPT, pedile los cambios y pegá acá su respuesta. Antes de guardar vas a ver qué cambia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={conInstrucciones} onCheckedChange={(v) => setConInstrucciones(v === true)} />
            Copiar con instrucciones para la IA
          </label>
          <CopiarPegarTexto
            conEtiqueta
            texto={conInstrucciones ? `${INSTRUCCIONES_IA}\n\n${texto}` : texto}
            onPegar={setTexto}
          />
        </div>

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          className="h-[34dvh] min-h-[180px] resize-y font-mono text-[12px] leading-relaxed"
        />

        {/* Resumen de lo que se va a guardar */}
        <div className="space-y-2 rounded-md border bg-muted/30 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{resultado.bloques} fila(s) en el texto:</span>
            <span className={resultado.cambiadas.length ? 'font-medium text-blue-700' : 'text-muted-foreground'}>
              {resultado.cambiadas.length} cambiada(s)
            </span>
            <span className={resultado.nuevas.length ? 'font-medium text-emerald-700' : 'text-muted-foreground'}>
              {resultado.nuevas.length} nueva(s)
            </span>
            <span className="text-muted-foreground">{resultado.sinCambios} sin cambios</span>
            {resultado.errores.length > 0 && <span className="font-medium text-red-600">{resultado.errores.length} error(es)</span>}
          </div>
          {noVinieron > 0 && (
            <p className="text-muted-foreground">
              {noVinieron} fila(s) de esta parte no vinieron en el texto: quedan como están (nunca se borra nada desde acá).
            </p>
          )}
          {deOtrasPartes > 0 && (
            <p className="text-amber-700">{deOtrasPartes} fila(s) del texto son de otra parte del IPERC: también se actualizan.</p>
          )}

          {resultado.errores.length > 0 && (
            <ul className="space-y-0.5 rounded border border-red-200 bg-red-50 p-2 text-red-700">
              {resultado.errores.slice(0, 12).map((e, i) => (
                <li key={i} className="flex gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{e}</li>
              ))}
              {resultado.errores.length > 12 && <li>… y {resultado.errores.length - 12} más</li>}
            </ul>
          )}
          {resultado.avisos.length > 0 && (
            <details className="text-muted-foreground">
              <summary className="cursor-pointer">{resultado.avisos.length} aviso(s)</summary>
              <ul className="mt-1 space-y-0.5">{resultado.avisos.slice(0, 20).map((a, i) => <li key={i}>• {a}</li>)}</ul>
            </details>
          )}

          {resultado.cambiadas.map((c) => {
            const cambiaNivel = c.campos.some((x) => CAMPOS_NIVEL.includes(x))
            const d = { ...c.antes, ...c.cambios }
            return (
              <details key={c.id} className="rounded border bg-white">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 px-2 py-1.5">
                  <span className="font-mono text-muted-foreground">#{c.numero}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.antes.tarea}</span>
                  <span className="text-blue-700">{c.campos.length} cambio(s)</span>
                </summary>
                <div className="space-y-1.5 border-t px-2 py-1.5">
                  {cambiaNivel && (
                    <p className="text-[11px]">
                      <span className="text-muted-foreground">Nivel:</span>{' '}
                      {textoNivel(c.antes.severidad, c.antes.probabilidad)} → <b>{textoNivel(d.severidad, d.probabilidad)}</b>
                      {' · '}<span className="text-muted-foreground">residual:</span>{' '}
                      {textoNivel(c.antes.severidadResidual, c.antes.probabilidadResidual)} → <b>{textoNivel(d.severidadResidual, d.probabilidadResidual)}</b>
                    </p>
                  )}
                  {c.campos.map((campo) => (
                    <div key={campo} className="text-[11px] leading-snug">
                      <p className="font-medium text-gray-700">{etiquetaCampo(campo)}</p>
                      <p className="text-red-700/80 line-through decoration-red-300">{String(c.antes[campo] ?? '') || '—'}</p>
                      <p className="text-emerald-800">{String((c.cambios as Record<string, unknown>)[campo] ?? '') || '—'}</p>
                    </div>
                  ))}
                </div>
              </details>
            )
          })}

          {resultado.nuevas.map((n, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5">
              <Plus className="h-3 w-3 text-emerald-700" />
              <span className="font-medium text-emerald-800">Nueva</span>
              <span className="min-w-0 flex-1 truncate">{n.datos.tarea} — {n.datos.peligro}</span>
              <span className="text-muted-foreground">{textoNivel(n.datos.severidad, n.datos.probabilidad)} → {textoNivel(n.datos.severidadResidual, n.datos.probabilidadResidual)}</span>
            </div>
          ))}

          {!hayCambios && resultado.errores.length === 0 && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sin cambios todavía: pegá la respuesta de la IA.
            </p>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={guardando}>Cancelar</Button>
          <Button size="sm" onClick={guardar} disabled={!puedeGuardar}>
            {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Guardar {hayCambios ? `(${resultado.cambiadas.length + resultado.nuevas.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
