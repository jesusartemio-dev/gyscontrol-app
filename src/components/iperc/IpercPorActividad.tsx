'use client'

// Filas del IPERC agrupadas por Proceso › Actividad.
//  - PC: una tabla por actividad (Tarea fija a la izquierda al desplazar).
//  - Celular: tarjetas (tarea, peligro, riesgo, nivel inicial → residual y
//    controles plegados) — la tabla de 20 columnas no se podía leer.
// Cada actividad tiene "Texto / IA" para copiarla, mejorarla en una IA y
// pegarla de vuelta (ver EditarIpercTextoDialog). También por fila y todo.

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Sparkles, Trash2, ChevronsUpDown, ChevronsDownUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMobile } from '@/lib/responsive/breakpoints'
import { evaluarRiesgo } from '@/lib/iperc/catalogos/matrizRiesgo'
import { cn } from '@/lib/utils'
import type { IpercFila } from '@/types/iperc'
import { ControlesCell, FactorBadge, NivelBadge, ProbabilidadBadge, SeveridadBadge } from './TablaFilasIperc'
import { EditarIpercTextoDialog } from './EditarIpercTextoDialog'

interface Props {
  proyectoId: string
  filas: IpercFila[]
  onEdit: (fila: IpercFila) => void
  onDelete: (filaId: string) => void
  /** Tras guardar desde texto: todas las filas actualizadas. */
  onAplicado: (filas: IpercFila[]) => void
}

interface Grupo {
  clave: string
  proceso: string
  actividad: string
  filas: IpercFila[]
}

const claveDe = (f: IpercFila) => `${f.proceso}␟${f.actividad}`

function contarNiveles(filas: IpercFila[], residual: boolean) {
  const c = { ALTO: 0, MEDIO: 0, BAJO: 0 }
  for (const f of filas) {
    const ev = residual ? evaluarRiesgo(f.severidadResidual, f.probabilidadResidual) : evaluarRiesgo(f.severidad, f.probabilidad)
    if (ev) c[ev.nivel]++
  }
  return c
}

function ResumenNiveles({ filas }: { filas: IpercFila[] }) {
  const r = contarNiveles(filas, true)
  const item = (n: number, cls: string, t: string) =>
    n > 0 && <span className={cn('inline-flex items-center gap-0.5', cls)} title={`${n} con riesgo residual ${t}`}><span className="h-2 w-2 rounded-full bg-current" />{n}</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium">
      <span className="text-muted-foreground">Residual</span>
      {item(r.ALTO, 'text-red-600', 'ALTO')}
      {item(r.MEDIO, 'text-amber-600', 'MEDIO')}
      {item(r.BAJO, 'text-emerald-600', 'BAJO')}
    </span>
  )
}

export function IpercPorActividad({ proyectoId, filas, onEdit, onDelete, onAplicado }: Props) {
  const esCelular = useIsMobile()
  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>()
    for (const f of filas) {
      const k = claveDe(f)
      if (!mapa.has(k)) mapa.set(k, { clave: k, proceso: f.proceso, actividad: f.actividad, filas: [] })
      mapa.get(k)!.filas.push(f)
    }
    return [...mapa.values()]
  }, [filas])

  // Abiertos: en PC todos; en celular ninguno (se elige la actividad).
  const [abiertos, setAbiertos] = useState<Set<string> | null>(null)
  const estaAbierto = (k: string) => (abiertos ? abiertos.has(k) : !esCelular)
  const toggle = (k: string) => setAbiertos((prev) => {
    const base = prev ?? new Set(esCelular ? [] : grupos.map((g) => g.clave))
    const n = new Set(base)
    if (n.has(k)) n.delete(k); else n.add(k)
    return n
  })
  const irA = (k: string) => {
    setAbiertos((prev) => new Set([...(prev ?? (esCelular ? [] : grupos.map((g) => g.clave))), k]))
    setTimeout(() => document.getElementById(`iperc-grupo-${grupos.findIndex((g) => g.clave === k)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const [texto, setTexto] = useState<{ titulo: string; filas: IpercFila[] } | null>(null)

  return (
    <div className="space-y-2">
      {/* Barra: ir a una actividad, abrir/cerrar, todo el IPERC como texto */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value="" onValueChange={irA}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-72">
            <SelectValue placeholder={`Ir a una actividad (${grupos.length})…`} />
          </SelectTrigger>
          <SelectContent>
            {grupos.map((g) => (
              <SelectItem key={g.clave} value={g.clave} className="text-xs">
                {g.actividad} <span className="text-muted-foreground">· {g.filas.length}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setAbiertos(new Set(grupos.map((g) => g.clave)))}>
          <ChevronsUpDown className="mr-1 h-3.5 w-3.5" /> Abrir todas
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setAbiertos(new Set())}>
          <ChevronsDownUp className="mr-1 h-3.5 w-3.5" /> Cerrar todas
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs sm:ml-auto"
          onClick={() => setTexto({ titulo: 'IPERC completo', filas })}
          title="Todo el IPERC como texto para trabajarlo con una IA"
        >
          <Sparkles className="mr-1 h-3.5 w-3.5 text-indigo-500" /> Texto / IA: todo
        </Button>
      </div>

      {grupos.map((g, gi) => {
        const abierto = estaAbierto(g.clave)
        return (
          <section key={g.clave} id={`iperc-grupo-${gi}`} className="scroll-mt-16 overflow-clip rounded-md border bg-white">
            <div className={cn('flex items-center gap-2 px-2 py-2 sm:px-3', abierto && 'border-b bg-slate-50')}>
              <button type="button" onClick={() => toggle(g.clave)} className="flex min-w-0 flex-1 items-start gap-1.5 text-left">
                {abierto
                  ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="min-w-0">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{g.proceso}</span>
                  <span className="block text-sm font-semibold leading-snug text-gray-900">{g.actividad}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    {g.filas.length} fila{g.filas.length === 1 ? '' : 's'}
                    <ResumenNiveles filas={g.filas} />
                  </span>
                </span>
              </button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-2 text-xs"
                onClick={() => setTexto({ titulo: `${g.proceso} › ${g.actividad}`, filas: g.filas })}
                title="Esta actividad como texto para trabajarla con una IA"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500 sm:mr-1" />
                <span className="hidden sm:inline">Texto / IA</span>
              </Button>
            </div>

            {abierto && (esCelular
              ? <TarjetasFilas filas={g.filas} onEdit={onEdit} onDelete={onDelete} onTexto={(f) => setTexto({ titulo: `Fila ${f.numero}`, filas: [f] })} />
              : <TablaGrupo filas={g.filas} onEdit={onEdit} onDelete={onDelete} onTexto={(f) => setTexto({ titulo: `Fila ${f.numero}`, filas: [f] })} />)}
          </section>
        )
      })}

      {texto && (
        <EditarIpercTextoDialog
          open
          onOpenChange={(o) => { if (!o) setTexto(null) }}
          proyectoId={proyectoId}
          titulo={texto.titulo}
          filasParte={texto.filas}
          todasLasFilas={filas}
          onAplicado={onAplicado}
        />
      )}
    </div>
  )
}

interface AccionesFila {
  onEdit: (fila: IpercFila) => void
  onDelete: (filaId: string) => void
  onTexto: (fila: IpercFila) => void
}

/** Celular: una tarjeta por fila. */
function TarjetasFilas({ filas, onEdit, onDelete, onTexto }: { filas: IpercFila[] } & AccionesFila) {
  return (
    <div className="divide-y">
      {filas.map((f) => {
        const controles = [
          ['Eliminar', f.eliminar], ['Sustituir', f.sustituir], ['Ingeniería', f.controlIngenieria],
          ['Administrativo', f.controlAdministrativo], ['EPP', f.controlReceptor],
        ].filter(([, t]) => t && t.trim() && t !== 'NA')
        return (
          <div key={f.id} className="space-y-1.5 px-2 py-2.5">
            <div className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">#{f.numero}</span>
              <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-gray-900">{f.tarea}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{f.puestoTrabajo}</span>
              <FactorBadge factor={f.factorRiesgo} />
              <span>{f.condicionActividad}</span>
            </div>
            <p className="text-xs leading-snug"><span className="font-semibold text-gray-600">Peligro: </span>{f.peligro}</p>
            <p className="text-xs leading-snug">
              <span className="font-semibold text-gray-600">Riesgo: </span>{f.riesgo}
              <span className="text-muted-foreground"> → {f.consecuencia}</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <NivelBadge severidad={f.severidad} probabilidad={f.probabilidad} />
              <span className="text-muted-foreground">→</span>
              <NivelBadge severidad={f.severidadResidual} probabilidad={f.probabilidadResidual} />
              <span className="text-[10px] text-muted-foreground">
                {f.severidad}{f.probabilidad} → {f.severidadResidual}{f.probabilidadResidual}
              </span>
            </div>
            {controles.length > 0 && (
              <details className="rounded border bg-slate-50 px-2 py-1 text-[11px]">
                <summary className="cursor-pointer font-medium text-gray-600">Controles ({controles.length})</summary>
                <div className="mt-1 space-y-1">
                  {controles.map(([et, t]) => (
                    <p key={et} className="leading-snug"><span className="font-semibold text-gray-600">{et}: </span>{t}</p>
                  ))}
                  {f.accionesMejora && f.accionesMejora !== 'NA' && (
                    <p className="leading-snug"><span className="font-semibold text-gray-600">Mejora: </span>{f.accionesMejora}</p>
                  )}
                  {f.responsables && <p className="text-muted-foreground">Responsable: {f.responsables}</p>}
                </div>
              </details>
            )}
            <div className="flex items-center justify-end gap-1.5">
              <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onTexto(f)}>
                <Sparkles className="mr-1 h-3 w-3 text-indigo-500" /> Texto / IA
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onEdit(f)}>
                <Pencil className="mr-1 h-3 w-3" /> Editar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(f.id)} title="Eliminar fila">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** PC: tabla de la actividad; Tarea fija a la izquierda al desplazar. */
function TablaGrupo({ filas, onEdit, onDelete, onTexto }: { filas: IpercFila[] } & AccionesFila) {
  const th = 'px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'
  const td = 'px-1.5 py-1 align-top'
  // Dos lineas, no tres: con tres, una fila ocupaba casi 100 px de alto y en
  // pantalla entraban seis. El texto completo sigue en el title y en el editor.
  const celda = (t: string) => <span className="line-clamp-2 leading-tight" title={t}>{t || '—'}</span>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1150px] border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="bg-white">
            <th className={cn(th, 'w-10')}>#</th>
            <th className={cn(th, 'sticky left-0 z-[1] w-64 bg-white shadow-[inset_-1px_0_0_#e5e7eb]')}>Tarea</th>
            <th className={cn(th, 'w-32')}>Puesto</th>
            <th className={cn(th, 'w-24')}>Factor</th>
            <th className={cn(th, 'w-48')}>Peligro</th>
            <th className={cn(th, 'w-48')}>Riesgo / consecuencia</th>
            <th className={cn(th, 'w-10 text-center')}>S</th>
            <th className={cn(th, 'w-10 text-center')}>P</th>
            <th className={cn(th, 'w-24')}>Nivel</th>
            <th className={cn(th, 'w-28')}>Controles</th>
            <th className={cn(th, 'w-10 text-center')}>SR</th>
            <th className={cn(th, 'w-10 text-center')}>PR</th>
            <th className={cn(th, 'w-24')}>Nivel R</th>
            <th className={cn(th, 'w-24')} />
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            // Una tarea casi siempre tiene varios peligros — 49 de 68 tareas
            // del IPERC de CJM52 tienen 3 filas. La cebra por fila hacia que
            // esas filas se vieran como tareas distintas: ahora el color
            // alterna por TAREA y el nombre se escribe solo en la primera.
            const esPrimera = i === 0 || filas[i - 1].tarea !== f.tarea
            const esUltima = i === filas.length - 1 || filas[i + 1].tarea !== f.tarea
            const peligrosDeLaTarea = filas.filter(x => x.tarea === f.tarea).length
            const grupo = filas.slice(0, i + 1).reduce(
              (n, x, j, arr) => (j > 0 && arr[j - 1].tarea !== x.tarea ? n + 1 : n), 0,
            )
            const fondo = grupo % 2 ? 'bg-slate-50' : 'bg-white'
            return (
              <tr
                key={f.id}
                className={cn(
                  'group cursor-pointer hover:[&>td]:bg-indigo-50/70',
                  fondo,
                  esPrimera && i > 0 && '[&>td]:border-t-2 [&>td]:border-t-slate-300',
                )}
                onClick={() => onEdit(f)}
              >
                <td className={cn(td, fondo, 'font-mono text-[10px] text-muted-foreground')}>{String(f.numero).padStart(3, '0')}</td>
                <td className={cn(td, fondo, 'sticky left-0 z-[1] font-medium shadow-[inset_-1px_0_0_#e5e7eb]')}>
                  {esPrimera ? (
                    <>
                      {celda(f.tarea)}
                      {peligrosDeLaTarea > 1 && (
                        <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                          {peligrosDeLaTarea} peligros
                        </span>
                      )}
                    </>
                  ) : (
                    <span
                      className="block border-l-2 border-slate-300 pl-2 text-[10px] text-muted-foreground"
                      title={f.tarea}
                    >
                      {esUltima ? '└' : '├'} misma tarea
                    </span>
                  )}
                </td>
                <td className={cn(td, fondo)}>{celda(f.puestoTrabajo)}<span className="block text-[10px] leading-tight text-muted-foreground">{f.condicionActividad}</span></td>
                <td className={cn(td, fondo)}><FactorBadge factor={f.factorRiesgo} /></td>
                <td className={cn(td, fondo)}>{celda(f.peligro)}</td>
                <td className={cn(td, fondo)}>{celda(f.riesgo)}<span className="line-clamp-1 text-[10px] leading-tight text-muted-foreground" title={f.consecuencia}>{f.consecuencia}</span></td>
                <td className={cn(td, fondo, 'text-center')}><SeveridadBadge valor={f.severidad} /></td>
                <td className={cn(td, fondo, 'text-center')}><ProbabilidadBadge valor={f.probabilidad} /></td>
                <td className={cn(td, fondo)}><NivelBadge severidad={f.severidad} probabilidad={f.probabilidad} /></td>
                <td className={cn(td, fondo)}><ControlesCell fila={f} /></td>
                <td className={cn(td, fondo, 'text-center')}><SeveridadBadge valor={f.severidadResidual} /></td>
                <td className={cn(td, fondo, 'text-center')}><ProbabilidadBadge valor={f.probabilidadResidual} /></td>
                <td className={cn(td, fondo)}><NivelBadge severidad={f.severidadResidual} probabilidad={f.probabilidadResidual} /></td>
                <td className={cn(td, fondo)} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Texto / IA de esta fila" onClick={() => onTexto(f)}>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Editar" onClick={() => onEdit(f)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" title="Eliminar" onClick={() => onDelete(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
