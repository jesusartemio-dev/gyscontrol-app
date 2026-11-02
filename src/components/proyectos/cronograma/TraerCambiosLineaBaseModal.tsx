'use client'

/**
 * TraerCambiosLineaBaseModal — "Traer cambios de la línea base".
 *
 * Muestra lo agregado o cambiado en la línea base desde que se creó el
 * cronograma de ejecución y aplica solo lo marcado. Nunca borra nada en
 * ejecución: se conservan horas registradas, jornadas y avance.
 */

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, AlertTriangle, CheckCircle2, GitPullRequestArrow, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CambiosLineaBase, ItemModificado } from '@/lib/cronogramaLineaBase/traerCambios'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  onSuccess: () => void
}

const TIPO_DEP: Record<string, string> = {
  finish_to_start: 'Fin-Comienzo', start_to_start: 'Comienzo-Comienzo', finish_to_finish: 'Fin-Fin', start_to_finish: 'Comienzo-Fin',
}
const lagTexto = (min: number) => (min === 0 ? '' : ` ${min > 0 ? '+' : '−'}${Math.abs(min) % 60 === 0 ? `${Math.abs(min) / 60} h` : `${Math.abs(min)} min`}`)
const valor = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : v === true ? 'Sí' : v === false ? 'No' : String(v))
const rango = (ini: string | null, fin: string | null) => (ini ? `${ini}${fin && fin !== ini ? ` → ${fin}` : ''}` : '')
/** Un modificado protegido solo se puede aplicar si tiene algún campo que no toca la programación. */
const aplicable = (m: ItemModificado) => !m.protegido || m.campos.some((c) => c.seguro)

export function TraerCambiosLineaBaseModal({ open, onOpenChange, proyectoId, onSuccess }: Props) {
  const [cambios, setCambios] = useState<CambiosLineaBase | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(false)
  const [aplicando, setAplicando] = useState(false)

  useEffect(() => {
    if (!open) { setCambios(null); setSel(new Set()); return }
    let vivo = true
    setCargando(true)
    fetch(`/api/proyectos/${proyectoId}/cronograma/traer-linea-base`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'No se pudo comparar'); return d.cambios as CambiosLineaBase })
      .then((c) => {
        if (!vivo) return
        setCambios(c)
        // Lo nuevo y las dependencias van marcados; los modificados no (ejecución
        // puede estar reprogramada a propósito). Los homónimos tampoco: marcarlos
        // por defecto duplicaría una tarea que ya existe.
        setSel(new Set([
          ...c.nuevos.filter((n) => !n.homonimoEnEjecucion).map((n) => n.clave),
          ...c.dependencias.map((d) => d.clave),
        ]))
      })
      .catch((e) => { toast.error(e instanceof Error ? e.message : 'No se pudo comparar'); onOpenChange(false) })
      .finally(() => vivo && setCargando(false))
    return () => { vivo = false }
  }, [open, proyectoId, onOpenChange])

  const alternar = (clave: string, on: boolean) => setSel((prev) => { const s = new Set(prev); if (on) s.add(clave); else s.delete(clave); return s })

  const aplicar = async () => {
    setAplicando(true)
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/cronograma/traer-linea-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seleccion: [...sel] }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'No se pudo aplicar')
      const res = data.resultado
      toast.success('Cambios de la línea base aplicados', {
        description: `${res.creados} nuevos · ${res.actualizados} modificados · ${res.dependencias} dependencias`,
      })
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo aplicar')
    } finally {
      setAplicando(false)
    }
  }

  const c = cambios
  const sinCambios = c && !c.bloqueado && c.nuevos.length + c.modificados.length + c.dependencias.length === 0
  const marcados = c ? [...sel].filter((k) => c.nuevos.some((n) => n.clave === k) || c.modificados.some((m) => m.clave === k) || c.dependencias.some((d) => d.clave === k)).length : 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!aplicando) onOpenChange(o) }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequestArrow className="h-5 w-5" />
            Traer cambios de la línea base
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Compara la línea base{c ? <> (<b>{c.lineaBase.nombre}</b>)</> : null} con este cronograma de ejecución.
            No se borra nada: se conservan horas registradas, jornadas y avance. Marca lo que quieras traer.
          </p>

          {cargando && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Comparando…</div>
          )}

          {c && (
            <>
              {c.bloqueado && (
                <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{c.advertencias[0]}</span>
                </div>
              )}

              {!c.bloqueado && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700">{c.nuevos.length} nuevos</Badge>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">{c.modificados.length} modificados</Badge>
                  <Badge variant="outline" className="border-violet-300 text-violet-700">{c.dependencias.length} dependencias</Badge>
                  <Badge variant="outline" className="border-red-300 text-red-700">{c.quitados.length} ya no están en la línea base</Badge>
                </div>
              )}

              {sinCambios && (
                <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Ejecución ya tiene todo lo de la línea base: no hay nada que traer.</span>
                </div>
              )}

              {c.nuevos.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">Nuevos en la línea base (se crearán en ejecución)</h4>
                  <div className="rounded-md border divide-y">
                    {c.nuevos.map((n) => (
                      <label key={n.clave} className="flex items-start gap-2 px-3 py-2 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 mt-0.5 accent-emerald-600" checked={sel.has(n.clave)} onChange={(e) => alternar(n.clave, e.target.checked)} />
                        <div className="min-w-0">
                          <div><span className="font-medium">{n.nombre}</span> <span className="text-xs text-muted-foreground">({n.tipo} en “{n.ubicacion}” · {rango(n.inicio, n.fin)} · {n.horas} h)</span></div>
                          {(n.creaEdt || n.creaFase) && (
                            <div className="text-xs text-amber-700">Se creará también {n.creaFase ? `la fase “${n.creaFase}” y ` : ''}el EDT “{n.creaEdt}”.</div>
                          )}
                          {n.homonimoEnEjecucion && (
                            <div className="text-xs text-red-700">
                              Ya hay un “{n.nombre}” en este mismo sitio. Figura como nuevo porque el nombre está repetido en la línea base y no se puede saber cuál es cuál: marcarlo lo duplicaría.
                            </div>
                          )}
                          {n.tareas.map((t, i) => (
                            <div key={i} className="text-xs text-muted-foreground">• {t.nombre} ({rango(t.inicio, t.fin)} · {t.horas} h)</div>
                          ))}
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Sus dependencias con otras tareas se crean junto con ellos.</p>
                </section>
              )}

              {c.modificados.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">Modificados en la línea base</h4>
                  <p className="text-xs text-muted-foreground">
                    No vienen marcados: ejecución puede estar reprogramada a propósito. En tareas con horas o avance solo se aplican nombre, descripción y responsable.
                  </p>
                  <div className="rounded-md border divide-y">
                    {c.modificados.map((m) => (
                      <label key={m.clave} className={`flex items-start gap-2 px-3 py-2 ${aplicable(m) ? 'cursor-pointer' : 'opacity-60'}`}>
                        <input type="checkbox" className="h-4 w-4 mt-0.5 accent-blue-600" disabled={!aplicable(m)} checked={sel.has(m.clave)} onChange={(e) => alternar(m.clave, e.target.checked)} />
                        <div className="min-w-0">
                          <div><span className="font-medium">{m.nombre}</span> <span className="text-xs text-muted-foreground">({m.tipo} en “{m.ubicacion}”)</span></div>
                          {m.protegido && <div className="text-xs text-amber-700">La tarea {m.protegido}: no se cambia su programación.</div>}
                          {m.campos.map((k) => (
                            <div key={k.campo} className={`text-xs ${m.protegido && !k.seguro ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'}`}>
                              {k.campo}: <span className={m.protegido && !k.seguro ? '' : 'line-through'}>{valor(k.antes)}</span> → <span className={m.protegido && !k.seguro ? '' : 'text-foreground font-medium'}>{valor(k.despues)}</span>
                            </div>
                          ))}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {c.dependencias.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">Dependencias entre tareas existentes</h4>
                  <div className="rounded-md border divide-y text-xs">
                    {c.dependencias.map((d) => (
                      <label key={d.clave} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={sel.has(d.clave)} onChange={(e) => alternar(d.clave, e.target.checked)} />
                        <span>
                          {d.antes ? <span className="text-blue-700 font-medium">~ </span> : <span className="text-emerald-700 font-medium">+ </span>}
                          {d.origenNombre} → {d.dependienteNombre} (
                          {d.antes ? <>{TIPO_DEP[d.antes.tipo]}{lagTexto(d.antes.lagMinutos)} → </> : null}
                          {TIPO_DEP[d.tipo]}{lagTexto(d.lagMinutos)})
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {c.quitados.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">Ya no están en la línea base</h4>
                  <p className="text-xs text-muted-foreground">Solo informativo: si corresponde quitarlas de ejecución, hazlo a mano.</p>
                  <div className="rounded-md border divide-y text-xs">
                    {c.quitados.map((q, i) => (
                      <div key={i} className="px-3 py-1.5">
                        <span className="font-medium text-sm">{q.nombre}</span> ({q.tipo} en “{q.ubicacion}”){q.conAvance ? ' — tiene horas o avance' : ''}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {!c.bloqueado && c.advertencias.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-600" />Avisos</h4>
                  <ul className="list-disc pl-5 text-xs text-amber-800 space-y-0.5">
                    {c.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </section>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={aplicando}>Cancelar</Button>
            <Button onClick={aplicar} disabled={!c || c.bloqueado || !!sinCambios || marcados === 0 || aplicando}>
              {aplicando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitPullRequestArrow className="h-4 w-4 mr-2" />}
              Aplicar {marcados > 0 ? `(${marcados})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TraerCambiosLineaBaseModal
