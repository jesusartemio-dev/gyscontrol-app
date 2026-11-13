'use client'

// Actividades fijas del IPERC: las que van en todo trabajo y no salen del
// cronograma.
//
// El IPERC real abre con ACTIVIDADES GENERALES —movilización a planta,
// vigilancia COVID/dengue, orden y limpieza, desplazamiento en planta,
// izaje—, sigue con SISTEMA DE CONTROL DE ENERGIAS y cierra con CIERRE.
// Entran con la fila ya escrita, sin pasar por la IA, porque son siempre las
// mismas y el SSOMA ya las tiene redactadas.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ArrowLeft, ClipboardList, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

interface Actividad {
  id: string
  proceso: string
  actividad: string
  tarea: string
  orden: number
  puestoTrabajo: string
  factorRiesgo: string
  condicionActividad: string
  peligro: string
  riesgo: string
  consecuencia: string
  severidad: number
  probabilidad: string
  eliminar: string
  sustituir: string
  controlIngenieria: string
  controlAdministrativo: string
  controlReceptor: string
  accionesMejora: string
  responsables: string
  activo: boolean
  _count: { estructuraItems: number }
}

const PROBABILIDADES = ['A', 'B', 'C', 'D', 'E']
const FACTORES = [
  'FÍSICO', 'QUÍMICO', 'BIOLÓGICO', 'ERGONÓMICO', 'PSICOSOCIAL',
  'MECÁNICO', 'ELÉCTRICO', 'LOCATIVO', 'FISICOQUÍMICO',
]

export default function CatalogoActividadesIpercPage() {
  const [items, setItems] = useState<Actividad[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Partial<Actividad> | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch('/api/seguridad/catalogo-actividades-iperc')
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo cargar'); return }
      setItems(d.items ?? [])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!editando) return
    setGuardando(true)
    try {
      const esNuevo = !editando.id
      const r = await fetch('/api/seguridad/catalogo-actividades-iperc', {
        method: esNuevo ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo guardar'); return }
      toast.success(esNuevo ? 'Actividad agregada' : 'Actualizada')
      setEditando(null)
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (a: Actividad) => {
    if (!confirm(
      `Quitar "${a.tarea}" del catálogo.\n\n` +
      'Los IPERC ya generados no se tocan: sus filas son copias.\n\n¿Continuar?'
    )) return
    const r = await fetch(`/api/seguridad/catalogo-actividades-iperc?id=${a.id}`, { method: 'DELETE' })
    if (!r.ok) { toast.error('No se pudo quitar'); return }
    toast.success('Quitada del catálogo')
    await cargar()
  }

  const procesos = [...new Set(items.map(i => i.proceso))]

  return (
    <div className="container mx-auto space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/seguridad">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Seguridad</Button>
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ClipboardList className="h-5 w-5 text-sky-600" /> Actividades fijas del IPERC
          </h1>
        </div>
        <Button size="sm" onClick={() => setEditando({ proceso: procesos[0] ?? 'ACTIVIDADES GENERALES' })}>
          <Plus className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Las que van en todo trabajo y no salen del cronograma: movilización a planta, vigilancia
        COVID/dengue, orden y limpieza, desplazamiento, izaje, bloqueo de energía y el cierre.
        Entran en el IPERC con la fila ya escrita, sin pasar por la IA. Un cambio acá entra en los
        próximos IPERC que se generen; los ya emitidos no se tocan.
      </p>

      {cargando ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : (
        procesos.map(proceso => (
          <div key={proceso}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {proceso}
            </p>
            <div className="space-y-1.5">
              {items.filter(i => i.proceso === proceso).map(a => (
                <div
                  key={a.id}
                  className={`rounded border p-2.5 ${a.activo ? 'bg-white' : 'bg-slate-50 opacity-60'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.actividad}</p>
                      <p className="text-xs text-muted-foreground">{a.tarea}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{a.factorRiesgo}</Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        S{a.severidad}{a.probabilidad}
                      </Badge>
                      {!a.activo && <Badge variant="outline" className="text-[10px]">inactiva</Badge>}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditando({ ...a })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => borrar(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="mt-1 text-[11px]">
                    <span className="font-semibold text-gray-600">Peligro: </span>{a.peligro}
                  </p>
                  <p className="text-[11px]">
                    <span className="font-semibold text-gray-600">Riesgo: </span>{a.riesgo}
                    <span className="text-muted-foreground"> → {a.consecuencia}</span>
                  </p>

                  <div className="mt-1 flex flex-wrap gap-1">
                    {([
                      ['ELI', a.eliminar], ['SUS', a.sustituir], ['ING', a.controlIngenieria],
                      ['ADM', a.controlAdministrativo], ['EPP', a.controlReceptor],
                    ] as const).map(([et, t]) => {
                      const tiene = !!t && t.trim() !== '' && t.trim().toUpperCase() !== 'NA'
                      return (
                        <span
                          key={et}
                          title={tiene ? t : 'sin controles'}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            tiene ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          {et}{tiene ? ` ${t.split('\n').filter(Boolean).length}` : ''}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={!!editando} onOpenChange={v => { if (!v) setEditando(null) }}>
        <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editando?.id ? 'Editar actividad fija' : 'Nueva actividad fija'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Entra en los próximos IPERC que se generen. Los ya emitidos conservan lo suyo.
            </DialogDescription>
          </DialogHeader>

          {editando && (
            <>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Campo label="Proceso">
                    <Input className="h-8 text-xs" list="procesos-fijos"
                      value={editando.proceso ?? ''}
                      onChange={e => setEditando({ ...editando, proceso: e.target.value.toUpperCase() })} />
                    <datalist id="procesos-fijos">
                      {procesos.map(p => <option key={p} value={p} />)}
                    </datalist>
                  </Campo>
                  <Campo label="Actividad">
                    <Input className="h-8 text-xs" value={editando.actividad ?? ''}
                      onChange={e => setEditando({ ...editando, actividad: e.target.value })} />
                  </Campo>
                  <Campo label="Tarea">
                    <Input className="h-8 text-xs" value={editando.tarea ?? ''}
                      onChange={e => setEditando({ ...editando, tarea: e.target.value })} />
                  </Campo>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Campo label="Puesto de trabajo">
                    <Input className="h-8 text-xs" value={editando.puestoTrabajo ?? ''}
                      onChange={e => setEditando({ ...editando, puestoTrabajo: e.target.value })} />
                  </Campo>
                  <Campo label="Factor de riesgo">
                    <select className="h-8 w-full rounded border bg-background px-2 text-xs"
                      value={editando.factorRiesgo ?? 'FÍSICO'}
                      onChange={e => setEditando({ ...editando, factorRiesgo: e.target.value })}>
                      {FACTORES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Condición">
                    <select className="h-8 w-full rounded border bg-background px-2 text-xs"
                      value={editando.condicionActividad ?? 'Rutinaria'}
                      onChange={e => setEditando({ ...editando, condicionActividad: e.target.value })}>
                      <option value="Rutinaria">Rutinaria</option>
                      <option value="No Rutinaria">No Rutinaria</option>
                    </select>
                  </Campo>
                </div>

                <Campo label="Peligro">
                  <Input className="h-8 text-xs" value={editando.peligro ?? ''}
                    onChange={e => setEditando({ ...editando, peligro: e.target.value })} />
                </Campo>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Campo label="Riesgo">
                    <Input className="h-8 text-xs" value={editando.riesgo ?? ''}
                      onChange={e => setEditando({ ...editando, riesgo: e.target.value })} />
                  </Campo>
                  <Campo label="Consecuencia">
                    <Input className="h-8 text-xs" value={editando.consecuencia ?? ''}
                      onChange={e => setEditando({ ...editando, consecuencia: e.target.value })} />
                  </Campo>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Campo label="Severidad (1 catastrófica … 5 menor)">
                    <select className="h-8 w-full rounded border bg-background px-2 text-xs"
                      value={editando.severidad ?? 3}
                      onChange={e => setEditando({ ...editando, severidad: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Probabilidad (A común … E casi imposible)">
                    <select className="h-8 w-full rounded border bg-background px-2 text-xs"
                      value={editando.probabilidad ?? 'C'}
                      onChange={e => setEditando({ ...editando, probabilidad: e.target.value })}>
                      {PROBABILIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Campo>
                </div>

                <p className="pt-1 text-[11px] text-muted-foreground">
                  Controles: un control por línea. El residual lo calcula la regla del SSOMA, no se
                  carga acá.
                </p>
                {([
                  ['eliminar', 'Eliminar'], ['sustituir', 'Sustituir'],
                  ['controlIngenieria', 'Ingeniería'], ['controlAdministrativo', 'Administrativo'],
                  ['controlReceptor', 'EPP / Receptor'],
                ] as const).map(([campo, label]) => (
                  <Campo key={campo} label={label}>
                    <Textarea
                      className="min-h-[52px] text-xs"
                      value={(editando[campo] as string) === 'NA' ? '' : ((editando[campo] as string) ?? '')}
                      onChange={e => setEditando({ ...editando, [campo]: e.target.value })}
                    />
                  </Campo>
                ))}

                <div className="grid gap-2 sm:grid-cols-2">
                  <Campo label="Acciones de mejora">
                    <Input className="h-8 text-xs" value={editando.accionesMejora ?? ''}
                      onChange={e => setEditando({ ...editando, accionesMejora: e.target.value })} />
                  </Campo>
                  <Campo label="Responsables">
                    <Input className="h-8 text-xs" value={editando.responsables ?? ''}
                      onChange={e => setEditando({ ...editando, responsables: e.target.value })} />
                  </Campo>
                </div>

                {editando.id && (
                  <div className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-xs font-medium">Activa</p>
                      <p className="text-[11px] text-muted-foreground">
                        Si se desactiva, deja de entrar en los IPERC nuevos.
                      </p>
                    </div>
                    <Switch
                      checked={editando.activo ?? true}
                      onCheckedChange={v => setEditando({ ...editando, activo: v })}
                    />
                  </div>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>
                  Cancelar
                </Button>
                <Button onClick={guardar} disabled={guardando || !editando.tarea || !editando.peligro}>
                  {guardando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}
