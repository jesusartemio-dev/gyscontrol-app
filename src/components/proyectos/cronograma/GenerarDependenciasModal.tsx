'use client'

/**
 * GenerarDependenciasModal - "Generar dependencias desde las fechas" para una
 * fase, EDT o actividad: muestra lo que se deduce de las fechas actuales
 * (FC, CC, con desfase) para revisar y crear solo lo marcado. No mueve fechas.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertTriangle, ArrowRight, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Propuesta {
  clave: string
  origenNombre: string
  dependienteNombre: string
  tipo: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lagMinutos: number
  grupo: string
  motivo: string
}

const CORTO: Record<Propuesta['tipo'], string> = {
  finish_to_start: 'FC', start_to_start: 'CC', finish_to_finish: 'FF', start_to_finish: 'CF',
}

function desfase(min: number, hpd: number): string {
  if (!min) return ''
  const h = Math.abs(min) / 60
  const r2 = (n: number) => Math.round(n * 100) / 100
  return `${min > 0 ? '+' : '-'}${h >= hpd ? `${r2(h / hpd)}d` : `${r2(h)}h`}`
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  /** "fase-…", "edt-…" o "actividad-…" */
  nodeId: string
  nodeNombre: string
  horasPorDia: number
  onSuccess: () => void
}

export function GenerarDependenciasModal({ open, onOpenChange, proyectoId, nodeId, nodeNombre, horasPorDia, onSuccess }: Props) {
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [avisos, setAvisos] = useState<string[]>([])
  const [conPredecesoras, setConPredecesoras] = useState(0)
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const url = `/api/proyectos/${proyectoId}/cronograma/dependencias/inferir`

  useEffect(() => {
    if (!open) return
    setCargando(true)
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeId }) })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'No se pudo calcular')
        setPropuestas(d.data.propuestas)
        setAvisos(d.data.avisos)
        setConPredecesoras(d.data.conPredecesoras)
        setMarcadas(new Set(d.data.propuestas.map((p: Propuesta) => p.clave)))
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'No se pudo calcular'))
      .finally(() => setCargando(false))
  }, [open, url, nodeId])

  const grupos = useMemo(() => {
    const g = new Map<string, Propuesta[]>()
    for (const p of propuestas) g.set(p.grupo, [...(g.get(p.grupo) ?? []), p])
    return [...g]
  }, [propuestas])

  const alternar = (clave: string) =>
    setMarcadas((prev) => {
      const s = new Set(prev)
      if (s.has(clave)) s.delete(clave)
      else s.add(clave)
      return s
    })

  const crear = async () => {
    try {
      setEnviando(true)
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, aplicar: true, claves: [...marcadas] }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'No se pudieron crear')
      toast.success(`${d.data.creadas} dependencia(s) creadas`, { description: 'Se exportan a MS Project. Las fechas no cambiaron.' })
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron crear')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5" /> Generar dependencias desde las fechas
          </DialogTitle>
          <DialogDescription>
            {nodeNombre}: se deducen de cómo están hoy las fechas (empieza cuando termina → FC, a la vez → CC).
            Las fechas no se mueven. Las tareas que ya tienen predecesoras no se tocan.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
          {cargando ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando…
            </div>
          ) : (
            <>
              {propuestas.length === 0 && (
                <p className="py-4 text-sm text-gray-500">No hay dependencias nuevas que deducir.</p>
              )}
              {grupos.map(([grupo, lista]) => (
                <div key={grupo} className="rounded-md border">
                  <div className="border-b bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">{grupo}</div>
                  {lista.map((p) => (
                    <label key={p.clave} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50">
                      <Checkbox checked={marcadas.has(p.clave)} onCheckedChange={() => alternar(p.clave)} />
                      <span className="min-w-0 flex-1 truncate" title={p.origenNombre}>{p.origenNombre}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1 truncate font-medium" title={p.dependienteNombre}>{p.dependienteNombre}</span>
                      <span className="w-16 shrink-0 text-right font-mono text-[11px] text-blue-700" title={p.motivo}>
                        {CORTO[p.tipo]}{desfase(p.lagMinutos, horasPorDia)}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
              {avisos.length > 0 && (
                <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3">
                  {avisos.map((a, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {a}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {marcadas.size} de {propuestas.length} marcadas{conPredecesoras ? ` · ${conPredecesoras} tarea(s) ya tenían predecesoras` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
            <Button onClick={crear} disabled={enviando || cargando || marcadas.size === 0}>
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Crear {marcadas.size} dependencia(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
