// Predecesoras de una tarea, como la columna Predecesoras de MS Project: cualquier
// tarea del cronograma (de otra actividad, EDT o fase) con tipo y desfase.
// Cada cambio se guarda al instante. Modo manual: una dependencia no mueve
// fechas sola; si no se cumple se avisa y se puede "Ajustar" esta tarea.

'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { AlertTriangle, Link2, Plus, Trash2, Wand2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { TreeNode } from './types'

type Tipo = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

const TIPOS: { value: Tipo; corto: string; largo: string }[] = [
  { value: 'finish_to_start', corto: 'FC', largo: 'Fin → Comienzo' },
  { value: 'start_to_start', corto: 'CC', largo: 'Comienzo → Comienzo' },
  { value: 'finish_to_finish', corto: 'FF', largo: 'Fin → Fin' },
  { value: 'start_to_finish', corto: 'CF', largo: 'Comienzo → Fin' },
]

interface Dependencia {
  id: string
  tareaId: string
  nombre: string
  ruta?: string
  tipo: Tipo
  lagMinutos: number
  /** undefined = recién cambiada, se recalcula al recargar el árbol */
  horasIncumplidas?: number
  /** Horas que la tarea va DESPUÉS de lo que exige (holgura); undefined = recién cambiada */
  horasHolgura?: number
  /** Con 2+ predecesoras: es la más exigente, la que fija la fecha (como MS Project). */
  determina?: boolean
}

interface Props {
  proyectoId: string
  /** id del nodo ("tarea-<uuid>") */
  tareaNodeId: string
  nodes: Map<string, TreeNode>
  horasPorDia: number
  /** Se guardó algún cambio (el árbol debe recargarse al cerrar). */
  onCambio: () => void
  /** "Ajustar" movió esta tarea: el formulario muestra las nuevas fechas. */
  onFechasAjustadas: (inicio: string, fin: string) => void
}

const realId = (nodeId: string) => nodeId.replace(/^tarea-/, '')

interface Candidata {
  nodeId: string
  nombre: string
  ruta: string
  fase?: { id: string; nombre: string }
  edt?: { id: string; nombre: string }
  actividad: string
  /** Fecha de la tarea para ubicarla ("12 oct–14 oct"). */
  fechas: string
}

const fmtDia = (v?: string | Date) => {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

/** Fase, EDT y Actividad de una tarea, subiendo por parentId. */
function ubicacionDe(nodes: Map<string, TreeNode>, nodo: TreeNode): Omit<Candidata, 'nodeId' | 'nombre' | 'fechas'> {
  const r: Omit<Candidata, 'nodeId' | 'nombre' | 'fechas'> = { ruta: '', actividad: 'Sin actividad' }
  const partes: string[] = []
  let p = nodo.parentId ? nodes.get(nodo.parentId) : undefined
  while (p && p.type !== 'proyecto') {
    partes.unshift(p.nombre)
    if (p.type === 'fase') r.fase = { id: p.id, nombre: p.nombre }
    else if (p.type === 'edt') r.edt = { id: p.id, nombre: p.nombre }
    else if (p.type === 'actividad') r.actividad = p.nombre
    p = p.parentId ? nodes.get(p.parentId) : undefined
  }
  r.ruta = partes.join(' › ')
  return r
}

function formatearDesfase(min: number, hpd: number): string {
  if (!min) return ''
  const h = Math.abs(min) / 60
  const r2 = (n: number) => Math.round(n * 100) / 100
  return `${min > 0 ? '+' : '-'}${h >= hpd ? `${r2(h / hpd)}d` : `${r2(h)}h`}`
}

/** "+2d", "-4h", "3" (días) → minutos; null si no se entiende. */
function parsearDesfase(texto: string, hpd: number): number | null {
  const t = texto.trim().toLowerCase().replace(',', '.')
  if (!t) return 0
  const m = /^([+-]?)\s*(\d+(?:\.\d+)?)\s*(d|h)?$/.exec(t)
  if (!m) return null
  const n = Number(m[2]) * (m[1] === '-' ? -1 : 1)
  return Math.round((m[3] === 'h' ? n : n * hpd) * 60)
}

export function PredecesorasEditor({ proyectoId, tareaNodeId, nodes, horasPorDia, onCambio, onFechasAjustadas }: Props) {
  const nodo = nodes.get(tareaNodeId)
  const [lista, setLista] = useState<Dependencia[]>(() => (nodo?.data?.predecesoras ?? []) as Dependencia[])
  const sucesoras = (nodo?.data?.sucesoras ?? []) as Dependencia[]
  const [abierto, setAbierto] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState<Tipo>('finish_to_start')
  const [nuevoDesfase, setNuevoDesfase] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const base = `/api/proyectos/${proyectoId}/cronograma/dependencias`

  // Tareas candidatas, en el orden del cronograma: todas menos esta y las que ya son predecesoras.
  const candidatas = useMemo(() => {
    const ya = new Set(lista.map((d) => d.tareaId))
    const r: Candidata[] = []
    nodes.forEach((n) => {
      if (n.type !== 'tarea' || n.id === tareaNodeId || ya.has(realId(n.id)) || n.data?.esExtra) return
      const ini = n.data?.fechaInicio ?? n.data?.fechaInicioComercial
      const fin = n.data?.fechaFin ?? n.data?.fechaFinComercial
      const fechas = n.data?.esHito ? `◆ ${fmtDia(ini)}` : `${fmtDia(ini)}–${fmtDia(fin)}`
      r.push({ nodeId: n.id, nombre: n.nombre, fechas, ...ubicacionDe(nodes, n) })
    })
    return r
  }, [nodes, tareaNodeId, lista])

  // Filtro en cascada Fase → EDT; la lista se agrupa por Actividad.
  const [filtroFase, setFiltroFase] = useState('todas')
  const [filtroEdt, setFiltroEdt] = useState('todos')
  const fases = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of candidatas) if (c.fase) m.set(c.fase.id, c.fase.nombre)
    return [...m]
  }, [candidatas])
  const edts = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of candidatas) if (c.edt && (filtroFase === 'todas' || c.fase?.id === filtroFase)) m.set(c.edt.id, c.edt.nombre)
    return [...m]
  }, [candidatas, filtroFase])
  const grupos = useMemo(() => {
    const g = new Map<string, Candidata[]>()
    for (const c of candidatas) {
      if (filtroFase !== 'todas' && c.fase?.id !== filtroFase) continue
      if (filtroEdt !== 'todos' && c.edt?.id !== filtroEdt) continue
      // Encabezado: Actividad, con EDT (y Fase) cuando no están filtrados.
      const titulo = [filtroFase === 'todas' ? c.fase?.nombre : null, filtroEdt === 'todos' ? c.edt?.nombre : null, c.actividad]
        .filter(Boolean).join(' › ')
      const l = g.get(titulo) ?? []
      l.push(c)
      g.set(titulo, l)
    }
    return [...g]
  }, [candidatas, filtroFase, filtroEdt])

  const agregar = async (cand: Candidata) => {
    const lag = parsearDesfase(nuevoDesfase, horasPorDia)
    if (lag === null) { toast.error('Desfase no válido. Ejemplos: +2d, -4h, 1.5d'); return }
    setOcupado(true)
    try {
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tareaOrigenId: realId(cand.nodeId), tareaDependienteId: realId(tareaNodeId), tipo: nuevoTipo, lagMinutos: lag }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'No se pudo agregar')
      setLista((l) => [...l, { id: j.data.id, tareaId: realId(cand.nodeId), nombre: cand.nombre, ruta: cand.ruta, tipo: nuevoTipo, lagMinutos: lag }])
      // La lista queda abierta para agregar varias seguidas; la agregada sale de la lista.
      toast.success(`Predecesora agregada: ${cand.nombre}`)
      onCambio()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo agregar')
    } finally {
      setOcupado(false)
    }
  }

  const actualizar = async (dep: Dependencia, cambios: { tipo?: Tipo; lagMinutos?: number }) => {
    setOcupado(true)
    try {
      const r = await fetch(`${base}/${dep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo guardar')
      setLista((l) => l.map((d) => (d.id === dep.id ? { ...d, ...cambios, horasIncumplidas: undefined, horasHolgura: undefined } : d)))
      onCambio()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setOcupado(false)
    }
  }

  const quitar = async (dep: Dependencia) => {
    setOcupado(true)
    try {
      const r = await fetch(`${base}/${dep.id}`, { method: 'DELETE' })
      // 404: ya no existe (p. ej. se borró la otra tarea y la dependencia se fue con ella).
      if (!r.ok && r.status !== 404) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo quitar')
      setLista((l) => l.filter((d) => d.id !== dep.id))
      onCambio()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo quitar')
    } finally {
      setOcupado(false)
    }
  }

  // Ajusta la tarea a TODAS sus predecesoras: va donde la pone la más exigente.
  // (Antes había un "Ajustar" por dependencia: usar el de una con margen la
  // adelantaba y dejaba en rojo a la que de verdad mandaba.)
  const ajustar = async () => {
    setOcupado(true)
    try {
      const r = await fetch(`${base}/ajustar-tarea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tareaId: realId(tareaNodeId) }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'No se pudo ajustar')
      const aTexto = (v: string) => new Date(v).toISOString().slice(0, 16)
      onFechasAjustadas(aTexto(j.data.fechaInicio), aTexto(j.data.fechaFin))
      // Se cumplen todas; el margen exacto de las demás se ve al recargar.
      setLista((l) => l.map((d) => ({ ...d, horasIncumplidas: 0, horasHolgura: d.id === j.data.determinanteId ? 0 : undefined, determina: d.id === j.data.determinanteId })))
      onCambio()
      toast.success(lista.length > 1 ? `Tarea ajustada: la fecha la determina "${j.data.determinanteNombre}"` : 'Tarea ajustada a su predecesora')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo ajustar')
    } finally {
      setOcupado(false)
    }
  }

  const variasPredecesoras = lista.length > 1
  const algunaIncumple = lista.some((d) => (d.horasIncumplidas ?? 0) > 0)
  const algunaSinCalcular = lista.some((d) => d.horasIncumplidas === undefined)
  // Todas con margen: la tarea podría ir antes (modo manual, no se mueve sola).
  const todasConMargen = lista.length > 0 && lista.every((d) => (d.horasIncumplidas ?? 0) === 0 && (d.horasHolgura ?? 0) > 0)
  const margenMinimo = todasConMargen ? Math.min(...lista.map((d) => d.horasHolgura ?? 0)) : 0
  const enDias = (h: number) => (h >= horasPorDia ? `${Math.round((h / horasPorDia) * 10) / 10}d` : `${Math.round(h * 10) / 10}h`)

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" /> Predecesoras
        </Label>
        <span className="text-[11px] text-muted-foreground">No mueven fechas solas (modo manual, como MS Project)</span>
      </div>

      {lista.length === 0 && <p className="text-xs text-muted-foreground">Sin predecesoras.</p>}

      {lista.map((dep) => (
        <FilaDependencia
          key={dep.id}
          dep={dep}
          hpd={horasPorDia}
          ocupado={ocupado}
          variasPredecesoras={variasPredecesoras}
          onTipo={(tipo) => actualizar(dep, { tipo })}
          onDesfase={(lagMinutos) => actualizar(dep, { lagMinutos })}
          onQuitar={() => quitar(dep)}
        />
      ))}

      {/* Un solo ajuste para la tarea: cumple TODAS sus predecesoras (manda la más exigente). */}
      {(algunaIncumple || algunaSinCalcular || todasConMargen) && (
        <div className={`flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-[11px] ${algunaIncumple ? 'border-red-300 bg-red-50 text-red-700' : 'bg-muted/40 text-muted-foreground'}`}>
          <span>
            {algunaIncumple
              ? 'No cumple todas sus predecesoras.'
              : algunaSinCalcular
                ? 'La fecha no cambia sola al editar las predecesoras.'
                : `Podría empezar ${enDias(margenMinimo)} antes.`}
            {variasPredecesoras && ' Se ubica donde la pone la más exigente.'}
          </span>
          <Button type="button" variant="outline" size="sm" className="h-6 shrink-0 px-2 text-[11px]" onClick={ajustar} disabled={ocupado}>
            <Wand2 className="mr-1 h-3 w-3" /> {variasPredecesoras ? 'Ajustar a sus predecesoras' : 'Ajustar a su predecesora'}
          </Button>
        </div>
      )}

      {/* Agregar: tipo + desfase + buscador de tareas con su ubicación */}
      <div className="flex items-center gap-2 pt-1">
        <Select value={nuevoTipo} onValueChange={(v) => setNuevoTipo(v as Tipo)}>
          <SelectTrigger className="h-8 w-[5.5rem] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.corto} · {t.largo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          value={nuevoDesfase}
          onChange={(e) => setNuevoDesfase(e.target.value)}
          placeholder="+0d"
          title="Desfase: +2d (espera), -4h (adelanto). Sin unidad = días"
          className="h-8 w-[4.5rem] text-xs"
        />
        <Popover open={abierto} onOpenChange={setAbierto}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 flex-1 justify-start text-xs" disabled={ocupado}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Agregar predecesora…
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[34rem] p-0" align="end">
            {/* Filtro Fase → EDT (select nativo: uno de Radix cerraría el popover al abrirse) */}
            <div className="flex gap-2 border-b p-2">
              <select
                value={filtroFase}
                onChange={(e) => { setFiltroFase(e.target.value); setFiltroEdt('todos') }}
                className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
                aria-label="Fase"
              >
                <option value="todas">Todas las fases</option>
                {fases.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
              <select
                value={filtroEdt}
                onChange={(e) => setFiltroEdt(e.target.value)}
                className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
                aria-label="EDT"
              >
                <option value="todos">Todos los EDT</option>
                {edts.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
            </div>
            <Command filter={(valor, busqueda) => (valor.toLowerCase().includes(busqueda.toLowerCase()) ? 1 : 0)}>
              <CommandInput placeholder="Buscar tarea o actividad…" className="text-xs" />
              <CommandList className="max-h-80">
                <CommandEmpty>No hay tareas que coincidan.</CommandEmpty>
                {grupos.map(([titulo, tareas]) => (
                  <CommandGroup key={titulo} heading={titulo}>
                    {tareas.map((c) => (
                      <CommandItem key={c.nodeId} value={`${c.nombre} ${c.ruta} ${c.nodeId}`} onSelect={() => agregar(c)} className="flex items-center justify-between gap-2 pl-4">
                        <span className="min-w-0 truncate text-xs">{c.nombre}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{c.fechas}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
            <div className="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              <span>Puedes elegir varias seguidas ({lista.length} agregada{lista.length === 1 ? '' : 's'})</span>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setAbierto(false)}>
                Listo
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {sucesoras.length > 0 && (
        <div className="border-t pt-2">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Sucesoras (dependen de esta tarea)</p>
          {sucesoras.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="truncate">{s.nombre}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">({TIPOS.find((t) => t.value === s.tipo)?.corto ?? 'FC'}{formatearDesfase(s.lagMinutos, horasPorDia)})</span>
              {s.horasIncumplidas ? <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" aria-label="No se cumple" /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilaDependencia({ dep, hpd, ocupado, variasPredecesoras, onTipo, onDesfase, onQuitar }: {
  dep: Dependencia
  hpd: number
  ocupado: boolean
  variasPredecesoras: boolean
  onTipo: (t: Tipo) => void
  onDesfase: (min: number) => void
  onQuitar: () => void
}) {
  const [desfase, setDesfase] = useState(formatearDesfase(dep.lagMinutos, hpd))
  const guardarDesfase = () => {
    const min = parsearDesfase(desfase, hpd)
    if (min === null) { toast.error('Desfase no válido. Ejemplos: +2d, -4h, 1.5d'); return }
    if (min !== dep.lagMinutos) onDesfase(min)
    setDesfase(formatearDesfase(min, hpd))
  }
  const incumple = (dep.horasIncumplidas ?? 0) > 0
  const holgura = dep.horasHolgura ?? 0
  const enDias = (h: number) => (h >= hpd ? `${Math.round((h / hpd) * 10) / 10}d` : `${Math.round(h * 10) / 10}h`)
  return (
    <div className={`rounded border px-2 py-1.5 ${incumple ? 'border-red-300 bg-red-50' : dep.determina && variasPredecesoras ? 'border-blue-300 bg-blue-50/40' : 'bg-white'}`}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-xs font-medium" title={dep.nombre}>
            <span className="truncate">{dep.nombre}</span>
            {dep.determina && variasPredecesoras && (
              <span className="shrink-0 rounded bg-blue-100 px-1 text-[9px] font-semibold uppercase tracking-wide text-blue-700" title="Es la predecesora más exigente: fija la fecha de esta tarea">
                Determina la fecha
              </span>
            )}
          </p>
          {dep.ruta && <p className="truncate text-[10px] text-muted-foreground" title={dep.ruta}>{dep.ruta}</p>}
        </div>
        <Select value={dep.tipo} onValueChange={(v) => onTipo(v as Tipo)} disabled={ocupado}>
          <SelectTrigger className="h-7 w-[4.5rem] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.corto} · {t.largo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          value={desfase}
          onChange={(e) => setDesfase(e.target.value)}
          onBlur={guardarDesfase}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardarDesfase() } }}
          placeholder="+0d"
          className="h-7 w-[4.5rem] text-xs"
          disabled={ocupado}
        />
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={onQuitar} disabled={ocupado} title="Quitar">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {incumple && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-700">
          <AlertTriangle className="h-3 w-3" />
          No se cumple: esta tarea va {enDias(dep.horasIncumplidas!)} antes de lo que exige.
        </p>
      )}
      {/* Cumple con margen: solo informativo (el ajuste es uno solo, para todas). */}
      {!incumple && holgura > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {variasPredecesoras && !dep.determina
            ? `Margen de ${enDias(holgura)}: otra predecesora es más exigente.`
            : `Va ${enDias(holgura)} después de lo que exige la dependencia.`}
        </p>
      )}
    </div>
  )
}
