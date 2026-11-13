'use client'

// ===================================================
// 📁 PanelEstructuraIperc
// 📌 La lista de actividades y tareas antes de que la IA analice nada.
//
// Es la hoja que el SSOMA arma a mano en el Excel: dos columnas, actividad y
// tarea, donde saca lo que no va, une lo repetido y decide cuántos peligros
// tendrá cada tarea. Recién con eso cerrado empieza a analizar.
// ===================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  ListTree, Loader2, Merge, Pencil, RefreshCw, Trash2, ChevronDown, ChevronRight, Check, X,
  Lightbulb, Combine,
} from 'lucide-react'

export interface ItemEstructura {
  id: string
  orden: number
  proceso: string
  actividad: string
  tarea: string
  peligrosPrevistos: number
  origen: 'cronograma' | 'fija' | 'manual'
  totalTareasCronograma: number
  estado: string
  filasGeneradas: number
}

export interface SugerenciaFusion {
  clave: string
  proceso: string
  actividades: Array<{ actividad: string; itemIds: string[]; tareas: string[]; filas: number }>
  tareasResultantes: Array<{ nombre: string; peligrosPrevistos: number }>
  tituloSugerido: string
  filasActuales: number
  filasDespues: number
  ahorro: number
}

export interface SugerenciaTareas {
  clave: string
  proceso: string
  actividad: string
  tareas: Array<{ itemId: string; nombre: string; peligrosPrevistos: number }>
  nombreSugerido: string
  filasActuales: number
  filasDespues: number
  ahorro: number
}

interface Props {
  proyectoId: string
  /** Abre el modal de selección de EDTs para armar o rearmar la lista. */
  onArmar: () => void
  /** Cambia cuando algo externo (una generación) pudo mover la estructura. */
  refreshKey?: number
  /** Al editar la lista, el servidor rehace los bloques: hay que recargarlos. */
  onCambio?: () => void
  disabled?: boolean
}

export function PanelEstructuraIperc({ proyectoId, onArmar, refreshKey, onCambio, disabled }: Props) {
  const [items, setItems] = useState<ItemEstructura[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [abierto, setAbierto] = useState(true)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [editando, setEditando] = useState<ItemEstructura | null>(null)
  const [borrador, setBorrador] = useState('')
  const [unirAbierto, setUnirAbierto] = useState(false)
  const [nombreUnido, setNombreUnido] = useState('')
  const [sugerencias, setSugerencias] = useState<SugerenciaFusion[]>([])
  const [sugTareas, setSugTareas] = useState<SugerenciaTareas[]>([])
  const [fusionando, setFusionando] = useState<SugerenciaFusion | null>(null)
  const [tituloFusion, setTituloFusion] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/iperc/estructura`)
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo cargar la estructura'); return }
      setItems(d.items ?? [])
      setTotal(d.totalFilasPrevistas ?? 0)
      setSugerencias(d.sugerencias ?? [])
      setSugTareas(d.sugerenciasTareas ?? [])
      setSeleccion(new Set())
    } finally {
      setCargando(false)
    }
  }, [proyectoId])

  useEffect(() => { cargar() }, [cargar, refreshKey])

  const llamar = async (init: RequestInit & { url?: string }) => {
    setOcupado(true)
    try {
      const r = await fetch(init.url ?? `/api/proyectos/${proyectoId}/iperc/estructura`, init)
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo guardar'); return false }
      setItems(d.items ?? [])
      setTotal(d.totalFilasPrevistas ?? 0)
      setSugerencias(d.sugerencias ?? [])
      setSugTareas(d.sugerenciasTareas ?? [])
      setSeleccion(new Set())
      onCambio?.()
      return true
    } finally {
      setOcupado(false)
    }
  }

  const patch = (body: Record<string, unknown>) =>
    llamar({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  const quitar = async (item: ItemEstructura) => {
    if (!confirm(`Quitar "${item.tarea}" del IPERC?`)) return
    await llamar({ url: `/api/proyectos/${proyectoId}/iperc/estructura?itemId=${item.id}`, method: 'DELETE' })
  }

  const unir = async () => {
    const ok = await llamar({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'unir', itemIds: [...seleccion], nombre: nombreUnido }),
    })
    if (ok) {
      toast.success('Tareas unidas')
      setUnirAbierto(false)
      setNombreUnido('')
    }
  }

  // Agrupado como se lee: proceso → actividad → tareas.
  const grupos = useMemo(() => {
    const porProceso = new Map<string, Map<string, ItemEstructura[]>>()
    for (const i of items) {
      if (!porProceso.has(i.proceso)) porProceso.set(i.proceso, new Map())
      const acts = porProceso.get(i.proceso)!
      if (!acts.has(i.actividad)) acts.set(i.actividad, [])
      acts.get(i.actividad)!.push(i)
    }
    return porProceso
  }, [items])

  const seleccionados = items.filter(i => seleccion.has(i.id))
  const actividadesDeSeleccion = new Set(seleccionados.map(i => i.actividad))
  const puedeUnir = seleccionados.length >= 2 && actividadesDeSeleccion.size === 1
  const generadas = items.filter(i => i.estado === 'generada').length

  if (cargando) {
    return (
      <div className="flex items-center gap-2 rounded border p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando estructura…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded border border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <ListTree className="h-4 w-4" /> Estructura del IPERC
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Primero se arma la lista de actividades y tareas —se saca lo que no va y se une lo
              repetido— y se decide cuántos peligros tendrá cada una. Recién con eso cerrado
              analiza la IA.
            </p>
          </div>
          <Button size="sm" onClick={onArmar} disabled={disabled}>
            <ListTree className="mr-1 h-4 w-4" /> Armar estructura
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 p-2">
        <button
          className="flex items-center gap-2 text-sm font-medium"
          onClick={() => setAbierto(v => !v)}
        >
          {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <ListTree className="h-4 w-4" />
          Estructura del IPERC
          <span className="font-normal text-muted-foreground">
            {items.length} tareas · {total} filas previstas
            {generadas > 0 && ` · ${generadas} ya generadas`}
          </span>
        </button>

        <div className="flex items-center gap-1">
          {puedeUnir && (
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { setNombreUnido(seleccionados[0].tarea); setUnirAbierto(true) }}
              disabled={ocupado || disabled}
            >
              <Merge className="mr-1 h-3.5 w-3.5" /> Unir {seleccionados.length}
            </Button>
          )}
          {seleccion.size > 0 && !puedeUnir && (
            <span className="text-[11px] text-amber-700">
              {seleccionados.length === 1
                ? 'Elige otra tarea de la misma actividad'
                : 'Solo se unen tareas de la misma actividad'}
            </span>
          )}
          <Button
            size="sm" variant="ghost" className="h-7 text-xs"
            onClick={onArmar} disabled={ocupado || disabled}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Rearmar
          </Button>
        </div>
      </div>

      {(sugerencias.length > 0 || sugTareas.length > 0) && (
        <div className="border-b bg-amber-50/60 p-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-900">
            <Lightbulb className="h-3.5 w-3.5" />
            {sugerencias.length + sugTareas.length === 1
              ? 'Hay trabajo repetido'
              : `Hay ${sugerencias.length + sugTareas.length} trabajos repetidos`}
            {' · '}
            se pueden ahorrar{' '}
            {sugerencias.reduce((n, s) => n + s.ahorro, 0) + sugTareas.reduce((n, s) => n + s.ahorro, 0)}
            {' '}filas de {total}
          </p>
          {sugerencias.map(s => (
            <div
              key={s.clave}
              className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-white p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">
                  {s.actividades.map(a => a.actividad).join('  ·  ')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {s.actividades.length} actividades con las mismas {s.tareasResultantes.length} tareas
                  {' · '}
                  <span className="font-medium text-amber-800">{s.filasActuales} → {s.filasDespues} filas</span>
                </p>
              </div>
              <Button
                size="sm" variant="outline" className="h-7 shrink-0 text-xs"
                onClick={() => { setFusionando(s); setTituloFusion(s.tituloSugerido) }}
                disabled={ocupado || disabled}
              >
                <Combine className="mr-1 h-3.5 w-3.5" /> Fusionar
              </Button>
            </div>
          ))}

          {sugTareas.map(s => (
            <div
              key={s.clave}
              className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-white p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs" title={s.tareas.map(t => t.nombre).join('  ·  ')}>
                  {s.tareas.map(t => t.nombre).join('  ·  ')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {s.tareas.length} tareas iguales dentro de &ldquo;{s.actividad}&rdquo;
                  {' · '}
                  <span className="font-medium text-amber-800">{s.filasActuales} → {s.filasDespues} filas</span>
                </p>
              </div>
              <Button
                size="sm" variant="outline" className="h-7 shrink-0 text-xs"
                onClick={() => {
                  setSeleccion(new Set(s.tareas.map(t => t.itemId)))
                  setNombreUnido(s.nombreSugerido)
                  setUnirAbierto(true)
                }}
                disabled={ocupado || disabled}
              >
                <Merge className="mr-1 h-3.5 w-3.5" /> Unir
              </Button>
            </div>
          ))}
        </div>
      )}

      {abierto && (
        <div className="max-h-[28rem] overflow-y-auto p-1">
          {[...grupos.entries()].map(([proceso, acts]) => (
            <div key={proceso} className="mb-2">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {proceso}
              </p>
              {[...acts.entries()].map(([actividad, tareas]) => (
                <div key={actividad} className="mb-1">
                  <p className="px-4 text-xs font-medium">{actividad}</p>
                  {tareas.map(item => (
                    <Fila
                      key={item.id}
                      item={item}
                      marcado={seleccion.has(item.id)}
                      ocupado={ocupado || !!disabled}
                      onMarcar={() => setSeleccion(s => {
                        const n = new Set(s)
                        if (n.has(item.id)) n.delete(item.id); else n.add(item.id)
                        return n
                      })}
                      onPeligros={n => patch({ id: item.id, peligrosPrevistos: n })}
                      onEditar={() => { setEditando(item); setBorrador(item.tarea) }}
                      onQuitar={() => quitar(item)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={v => { if (!v) setEditando(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Renombrar tarea</DialogTitle>
            <DialogDescription className="text-xs">
              Es el nombre que va en la columna TAREA del IPERC. No toca el cronograma.
            </DialogDescription>
          </DialogHeader>
          <Input
            className="text-sm"
            value={borrador}
            onChange={e => setBorrador(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditando(null)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button
              disabled={ocupado || !borrador.trim()}
              onClick={async () => {
                if (editando && await patch({ id: editando.id, tarea: borrador })) setEditando(null)
              }}
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fusionando} onOpenChange={v => { if (!v) setFusionando(null) }}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">
              Fusionar {fusionando?.actividades.length} actividades en una
            </DialogTitle>
            <DialogDescription className="text-xs">
              Para el cronograma son trabajos distintos, porque se ejecutan y se avanzan por
              separado. Para el IPERC son el mismo análisis: los peligros de armar un andamio no
              cambian por el tramo. Fusionarlas no toca el cronograma.
            </DialogDescription>
          </DialogHeader>

          {fusionando && (
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Título de la actividad fusionada
                  </label>
                  <Input
                    className="text-sm"
                    value={tituloFusion}
                    onChange={e => setTituloFusion(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Propuesto a partir de los nombres originales. Edítalo como deba quedar en el
                    IPERC.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded border p-2">
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      Antes · {fusionando.filasActuales} filas
                    </p>
                    {fusionando.actividades.map(a => (
                      <div key={a.actividad} className="mb-1.5">
                        <p className="text-[11px] font-medium">{a.actividad}</p>
                        {a.tareas.map((t, i) => (
                          <p key={i} className="truncate pl-2 text-[11px] text-muted-foreground" title={t}>
                            · {t}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="rounded border border-emerald-300 bg-emerald-50/50 p-2">
                    <p className="mb-1 text-[11px] font-medium text-emerald-800">
                      Después · {fusionando.filasDespues} filas
                    </p>
                    <p className="text-[11px] font-medium">{tituloFusion || fusionando.tituloSugerido}</p>
                    {fusionando.tareasResultantes.map((t, i) => (
                      <p key={i} className="truncate pl-2 text-[11px] text-muted-foreground" title={t.nombre}>
                        · {t.nombre} <span className="font-mono">({t.peligrosPrevistos})</span>
                      </p>
                    ))}
                  </div>
                </div>

                <p className="rounded bg-muted/50 p-2 text-[11px] text-muted-foreground">
                  Los peligros no se suman: fusionar es decir que estas tareas comparten los mismos
                  peligros, así que de cada una queda el mayor de los previstos. El IPERC pasa de{' '}
                  {total} a {total - fusionando.ahorro} filas.
                </p>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setFusionando(null)} disabled={ocupado}>
                  Cancelar
                </Button>
                <Button
                  disabled={ocupado || !tituloFusion.trim()}
                  onClick={async () => {
                    const ok = await llamar({
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        accion: 'fusionar-actividades',
                        itemIds: fusionando.actividades.flatMap(a => a.itemIds),
                        titulo: tituloFusion,
                      }),
                    })
                    if (ok) {
                      toast.success(`Fusionadas · ${fusionando.ahorro} filas menos`)
                      setFusionando(null)
                    }
                  }}
                >
                  {ocupado && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  Fusionar y ahorrar {fusionando.ahorro} filas
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={unirAbierto} onOpenChange={setUnirAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Unir {seleccionados.length} tareas en una</DialogTitle>
            <DialogDescription className="text-xs">
              Quedan como una sola línea del IPERC. Se evalúan juntas porque comparten los mismos
              peligros, así que los previstos no se suman: queda el mayor
              ({Math.max(0, ...seleccionados.map(s => s.peligrosPrevistos))}), y se puede ajustar
              después.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded border bg-muted/30 p-2">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">Se unen:</p>
            {seleccionados.map(s => (
              <p key={s.id} className="text-xs">· {s.tarea} <span className="text-muted-foreground">({s.peligrosPrevistos})</span></p>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Nombre de la tarea unida</label>
            <Input className="text-sm" value={nombreUnido} onChange={e => setNombreUnido(e.target.value)} />
          </div>

          <p className="text-[11px] text-muted-foreground">
            El IPERC pasa de {items.length} a {items.length - seleccionados.length + 1} tareas.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUnirAbierto(false)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button onClick={unir} disabled={ocupado || !nombreUnido.trim()}>
              {ocupado && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Unir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Fila({
  item, marcado, ocupado, onMarcar, onPeligros, onEditar, onQuitar,
}: {
  item: ItemEstructura
  marcado: boolean
  ocupado: boolean
  onMarcar: () => void
  onPeligros: (n: number) => void
  onEditar: () => void
  onQuitar: () => void
}) {
  const [editandoN, setEditandoN] = useState(false)
  const [n, setN] = useState(String(item.peligrosPrevistos))
  const esFija = item.origen === 'fija'

  return (
    <div className={`group flex items-center gap-2 px-2 py-0.5 pl-6 hover:bg-muted/40 ${marcado ? 'bg-blue-50' : ''}`}>
      <input
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0"
        checked={marcado}
        onChange={onMarcar}
        disabled={ocupado || esFija}
        title={esFija ? 'Las actividades fijas no se unen' : 'Marcar para unir'}
      />

      {editandoN ? (
        <span className="flex items-center gap-0.5">
          <Input
            className="h-6 w-12 px-1 text-center text-xs"
            value={n}
            autoFocus
            onChange={e => setN(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onPeligros(Number(n)); setEditandoN(false) }
              if (e.key === 'Escape') { setN(String(item.peligrosPrevistos)); setEditandoN(false) }
            }}
          />
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
            onClick={() => { onPeligros(Number(n)); setEditandoN(false) }}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
            onClick={() => { setN(String(item.peligrosPrevistos)); setEditandoN(false) }}>
            <X className="h-3 w-3" />
          </Button>
        </span>
      ) : (
        <button
          className="w-7 shrink-0 rounded border bg-background px-1 font-mono text-[11px] hover:border-primary"
          onClick={() => !ocupado && setEditandoN(true)}
          title="Cuántos peligros tendrá esta tarea"
        >
          {item.peligrosPrevistos}
        </button>
      )}

      <span className="min-w-0 flex-1 truncate text-xs" title={item.tarea}>
        {item.tarea}
      </span>

      {esFija && <Badge variant="outline" className="h-4 shrink-0 text-[9px]">catálogo</Badge>}
      {item.totalTareasCronograma > 1 && (
        <Badge variant="outline" className="h-4 shrink-0 text-[9px]">
          {item.totalTareasCronograma} unidas
        </Badge>
      )}
      {item.estado === 'generada' && (
        <Badge className="h-4 shrink-0 bg-emerald-600 text-[9px]">{item.filasGeneradas}</Badge>
      )}

      <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onEditar} disabled={ocupado} title="Renombrar">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={onQuitar} disabled={ocupado} title="Quitar del IPERC">
          <Trash2 className="h-3 w-3" />
        </Button>
      </span>
    </div>
  )
}
