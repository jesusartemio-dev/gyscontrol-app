'use client'

/**
 * SincronizarMsProjectModal — "Actualizar desde MS Project".
 *
 * Lee el archivo devuelto por MS Project (XML o Excel exportado desde GYS y
 * editado), muestra una vista previa de lo que cambiaría y solo aplica cuando
 * el usuario confirma. Cada elemento se reconoce por su GYS ID, así se
 * conservan horas registradas, avance y responsables.
 */

import React, { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, AlertTriangle, CheckCircle2, FileUp, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { leerExcelMsProject, leerMspdi, type FilaImportada } from '@/lib/cronogramaSync/leerArchivoMsProject'
import type { PlanSincronizacion } from '@/lib/cronogramaSync/sincronizar'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  cronogramaId?: string
  cronogramaNombre?: string
  onSuccess: () => void
}

const TIPO_DEP: Record<string, string> = {
  finish_to_start: 'Fin-Comienzo', start_to_start: 'Comienzo-Comienzo', finish_to_finish: 'Fin-Fin', start_to_finish: 'Comienzo-Fin',
}
const lagTexto = (min: number) => (min === 0 ? '' : ` ${min > 0 ? '+' : '−'}${Math.abs(min) % 60 === 0 ? `${Math.abs(min) / 60} h` : `${Math.abs(min)} min`}`)
const valor = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : v === true ? 'Sí' : v === false ? 'No' : String(v))

export function SincronizarMsProjectModal({ open, onOpenChange, proyectoId, cronogramaId, cronogramaNombre, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<string>('')
  const [filas, setFilas] = useState<FilaImportada[] | null>(null)
  const [plan, setPlan] = useState<PlanSincronizacion | null>(null)
  const [eliminar, setEliminar] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(false)
  const [aplicando, setAplicando] = useState(false)

  const reiniciar = () => { setArchivo(''); setFilas(null); setPlan(null); setEliminar(new Set()) }

  const leerArchivo = async (file: File) => {
    if (!cronogramaId) return
    reiniciar()
    setArchivo(file.name)
    setCargando(true)
    try {
      let leidas: FilaImportada[]
      if (/\.xml$/i.test(file.name)) {
        leidas = leerMspdi(await file.text())
      } else {
        const cal = await fetch(`/api/proyectos/${proyectoId}/cronograma/calendario`).then((r) => (r.ok ? r.json() : null))
        const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: false })
        leidas = leerExcelMsProject(wb, cal?.horasPorDia || 8)
      }
      if (leidas.length === 0) throw new Error('El archivo no tiene tareas')
      setFilas(leidas)
      const r = await fetch(`/api/proyectos/${proyectoId}/cronograma/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronogramaId, filas: leidas }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'No se pudo leer el archivo')
      setPlan(data.plan)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo leer el archivo')
      reiniciar()
    } finally {
      setCargando(false)
    }
  }

  const aplicar = async () => {
    if (!cronogramaId || !filas) return
    setAplicando(true)
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/cronograma/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronogramaId, filas, aplicar: true, eliminar: [...eliminar] }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'No se pudo actualizar')
      const res = data.resultado
      toast.success('Cronograma actualizado desde MS Project', {
        description: `${res.actualizados} modificados · ${res.creados} nuevos · ${res.eliminados} eliminados · ${res.dependencias} dependencias`,
      })
      onSuccess()
      onOpenChange(false)
      reiniciar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar')
    } finally {
      setAplicando(false)
    }
  }

  const deps = plan?.dependencias
  const totalDeps = deps ? deps.agregar.length + deps.quitar.length + deps.cambiar.length : 0
  const sinCambios = plan && !plan.bloqueado && plan.cambios.length + plan.nuevos.length + plan.eliminados.length + totalDeps === 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!aplicando) { onOpenChange(o); if (!o) reiniciar() } }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Actualizar desde MS Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Sube el archivo que exportaste de <b>{cronogramaNombre || 'este cronograma'}</b> (XML o Excel) después de editarlo en MS Project.
            Solo se cambia lo que cambió; se conservan horas registradas, avance y responsables. Antes de aplicar verás todos los cambios.
          </p>

          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xml,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); e.target.value = '' }}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={cargando || aplicando}>
              {cargando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
              {archivo ? 'Elegir otro archivo' : 'Elegir archivo (.xml o .xlsx)'}
            </Button>
            {archivo && <span className="text-xs text-muted-foreground truncate">{archivo}</span>}
          </div>

          {plan && (
            <>
              {plan.bloqueado && (
                <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{plan.advertencias[0]}</span>
                </div>
              )}

              {!plan.bloqueado && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{plan.coincidencias} de {plan.totalFilas} filas reconocidas</Badge>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">{plan.cambios.length} modificados</Badge>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700">{plan.nuevos.length} nuevos</Badge>
                  <Badge variant="outline" className="border-red-300 text-red-700">{plan.eliminados.length} no están en el archivo</Badge>
                  <Badge variant="outline" className="border-violet-300 text-violet-700">{totalDeps} dependencias</Badge>
                </div>
              )}

              {sinCambios && (
                <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>El archivo coincide con el cronograma: no hay nada que actualizar.</span>
                </div>
              )}

              {plan.cambios.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">Modificados</h4>
                  <div className="rounded-md border divide-y">
                    {plan.cambios.map((c) => (
                      <div key={c.gysId} className="px-3 py-2">
                        <div className="font-medium">{c.nombre} <span className="text-xs text-muted-foreground">({c.tipo})</span></div>
                        {c.campos.map((k) => (
                          <div key={k.campo} className="text-xs text-muted-foreground">
                            {k.campo}: <span className="line-through">{valor(k.antes)}</span> → <span className="text-foreground font-medium">{valor(k.despues)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {plan.nuevos.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">Nuevos (se crearán)</h4>
                  <div className="rounded-md border divide-y">
                    {plan.nuevos.map((n) => (
                      <div key={n.fila} className="px-3 py-1.5 text-xs">
                        <span className="font-medium text-sm">{n.nombre}</span> — {n.tipo} en “{n.padre}”
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {plan.eliminados.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">No están en el archivo</h4>
                  <p className="text-xs text-muted-foreground">Marca los que quieras eliminar de GYS. Los que tienen horas o avance registrados no se pueden eliminar desde aquí.</p>
                  <div className="rounded-md border divide-y">
                    {plan.eliminados.map((e) => (
                      <label key={e.gysId} className={`flex items-center gap-2 px-3 py-1.5 ${e.protegido ? 'opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-red-600"
                          disabled={e.protegido}
                          checked={eliminar.has(e.gysId)}
                          onChange={(ev) => setEliminar((prev) => {
                            const s = new Set(prev)
                            if (ev.target.checked) s.add(e.gysId); else s.delete(e.gysId)
                            return s
                          })}
                        />
                        <span className="font-medium">{e.nombre}</span>
                        <span className="text-xs text-muted-foreground">({e.tipo}{e.protegido ? ` — no se elimina: ${e.motivo}` : ''})</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {deps && totalDeps > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium">Dependencias</h4>
                  <div className="rounded-md border divide-y text-xs">
                    {deps.agregar.map((d, i) => (
                      <div key={`a${i}`} className="px-3 py-1.5"><span className="text-emerald-700 font-medium">+ </span>{d.origenNombre} → {d.dependienteNombre} ({TIPO_DEP[d.tipo]}{lagTexto(d.lagMinutos)})</div>
                    ))}
                    {deps.cambiar.map((d, i) => (
                      <div key={`c${i}`} className="px-3 py-1.5"><span className="text-blue-700 font-medium">~ </span>{d.origenNombre} → {d.dependienteNombre}: {TIPO_DEP[d.antes!.tipo]}{lagTexto(d.antes!.lagMinutos)} → {TIPO_DEP[d.tipo]}{lagTexto(d.lagMinutos)}</div>
                    ))}
                    {deps.quitar.map((d, i) => (
                      <div key={`q${i}`} className="px-3 py-1.5"><span className="text-red-700 font-medium">− </span>{d.origenNombre} → {d.dependienteNombre}</div>
                    ))}
                  </div>
                </section>
              )}

              {!plan.bloqueado && plan.advertencias.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="font-medium flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-600" />Avisos</h4>
                  <ul className="list-disc pl-5 text-xs text-amber-800 space-y-0.5">
                    {plan.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </section>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={aplicando}>Cancelar</Button>
            <Button onClick={aplicar} disabled={!plan || plan.bloqueado || !!sinCambios || aplicando}>
              {aplicando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Aplicar cambios{eliminar.size > 0 ? ` (y eliminar ${eliminar.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SincronizarMsProjectModal
