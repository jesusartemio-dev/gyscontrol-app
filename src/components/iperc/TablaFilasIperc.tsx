'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Pencil, Trash2, ChevronRight,
  AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  itemsDeControl, cumpleRegla, calcularResidual, tieneControl,
} from '@/lib/iperc/riesgoResidual'
import { itemsConOrigen, leerOrigenControles, type CampoControl, type OrigenControl } from '@/lib/iperc/origenControles'
import { evaluarRiesgo } from '@/lib/iperc/catalogos/matrizRiesgo'
import type { IpercFila } from '@/types/iperc'

// ─── Column definitions ──────────────────────────────────────────────────────

const COLS = [
  { key: 'num',       label: '#',         w: 48  },
  { key: 'proceso',   label: 'Proceso',   w: 130 },
  { key: 'actividad', label: 'Actividad', w: 145 },
  { key: 'tarea',     label: 'Tarea',     w: 240 },
  { key: 'puesto',    label: 'Puesto',    w: 125 },
  { key: 'factor',    label: 'Factor',    w: 120 },
  { key: 'condicion', label: 'Condición', w: 100 },
  { key: 'peligro',   label: 'Peligro',   w: 160 },
  { key: 'riesgo',    label: 'Riesgo',    w: 155 },
  { key: 'sev',       label: 'Sev',       w: 48  },
  { key: 'prob',      label: 'Prob',      w: 48  },
  { key: 'nivel',     label: 'Nivel',     w: 100 },
  { key: 'controles', label: 'Controles', w: 110 },
  { key: 'sevR',      label: 'SevR',      w: 48  },
  { key: 'probR',     label: 'ProbR',     w: 48  },
  { key: 'nivelR',    label: 'Nivel R',   w: 100 },
]

const ACTIONS_W = 68
const totalW = COLS.reduce((s, c) => s + c.w, 0) + ACTIONS_W

// ─── Sub-components ──────────────────────────────────────────────────────────

function CeldaConTooltip({ text, className }: { text: string; className?: string }) {
  if (!text) return <span className="text-muted-foreground">—</span>
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <span className={cn('truncate block cursor-default', className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export function FactorBadge({ factor }: { factor: string }) {
  // Un solo tono. Antes cada uno de los 9 factores tenia su color y, sumado a
  // severidad y probabilidad tambien coloreadas, la tabla quedaba arcoiris y
  // el color dejaba de significar algo. En el IPERC el color es del NIVEL DE
  // RIESGO: rojo / amarillo / verde. Lo demas se lee, no se colorea.
  return (
    <span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
      {factor}
    </span>
  )
}

export function SeveridadBadge({ valor }: { valor: number }) {
  // Valor plano: la severidad por si sola no es "buena" ni "mala", lo que
  // importa es el nivel que sale de cruzarla con la probabilidad.
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white font-mono text-xs font-semibold text-slate-700">
      {valor}
    </span>
  )
}

export function ProbabilidadBadge({ valor }: { valor: string }) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white font-mono text-xs font-semibold text-slate-700">
      {valor}
    </span>
  )
}

/**
 * Avisa cuando el residual de una fila no sigue la regla del SSOMA.
 *
 * La app recalcula el residual cada vez que se guarda, así que una fila solo
 * puede quedar fuera de la regla si entró por otro camino: una versión
 * revisada subida desde Excel, o una fila generada antes de que la regla
 * existiera. Son justo los casos en los que nadie se iba a dar cuenta.
 */
export function AvisoRegla({ fila }: { fila: FilaConResidual }) {
  if (cumpleRegla(fila)) return null

  const esperado = calcularResidual(
    fila.severidad, fila.probabilidad, fila.controlIngenieria, fila.controlAdministrativo,
  )
  const tieneIng = tieneControl(fila.controlIngenieria)
  const tieneAdm = tieneControl(fila.controlAdministrativo)

  const porque = [
    tieneIng ? 'tiene control de ingeniería, así que la severidad residual sube 1' : null,
    tieneAdm ? 'tiene control administrativo, así que la probabilidad residual sube 1' : null,
    !tieneIng && !tieneAdm ? 'no tiene controles de ingeniería ni administrativos, así que el residual es igual al inicial' : null,
  ].filter(Boolean).join('; ')

  return (
    <span
      className="ml-0.5 inline-flex cursor-help items-center text-amber-600"
      title={
        `Fuera de la regla del SSOMA. Dice S${fila.severidadResidual}${fila.probabilidadResidual} ` +
        `y debería decir S${esperado.severidadResidual}${esperado.probabilidadResidual}: ${porque}.`
      }
    >
      <AlertTriangle className="h-3.5 w-3.5" />
    </span>
  )
}

interface FilaConResidual {
  severidad: number
  probabilidad: string
  severidadResidual: number
  probabilidadResidual: string
  controlIngenieria?: string | null
  controlAdministrativo?: string | null
}

export function NivelBadge({ severidad, probabilidad }: { severidad: number; probabilidad: string }) {
  const ev = evaluarRiesgo(severidad, probabilidad)
  if (!ev) return <span className="text-muted-foreground text-xs">—</span>

  // Los tres colores de siempre del IPERC. Es el unico lugar de la fila que
  // lleva color, para que signifique algo de un vistazo.
  const config: Record<string, string> = {
    ALTO:  'bg-red-600 text-white',
    MEDIO: 'bg-amber-300 text-amber-950',
    BAJO:  'bg-emerald-600 text-white',
  }
  const c = config[ev.nivel]
  if (!c) return <span className="text-muted-foreground text-xs">{ev.nivel}</span>

  return (
    <span className={cn(
      'inline-flex min-w-[68px] items-center justify-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold',
      c,
    )}>
      {ev.nivel}
      <span className="font-mono font-normal opacity-80">{ev.valor}</span>
    </span>
  )
}

/**
 * Punto de color que dice de dónde salió el control. Sin marca cuando la fila
 * es anterior a que esto existiera: no se inventa una procedencia que no se sabe.
 */
export function MarcaOrigen({ origen }: { origen: OrigenControl | null }) {
  if (!origen) return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" title="Sin procedencia registrada" />
  const cfg: Record<OrigenControl, { color: string; title: string }> = {
    catalogo: { color: 'bg-emerald-500', title: 'Del catálogo de la empresa' },
    ia:       { color: 'bg-indigo-400',  title: 'Propuesto por la IA' },
    manual:   { color: 'bg-amber-500',   title: 'Escrito a mano en la app' },
  }
  const c = cfg[origen]
  return <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', c.color)} title={c.title} />
}

export function ControlesCell({
  fila,
  onEditarControles,
}: {
  fila: IpercFila
  /** Abre el modal para agregar o quitar controles de esta fila. */
  onEditarControles?: (fila: IpercFila) => void
}) {
  const origenes = leerOrigenControles((fila as { origenControles?: unknown }).origenControles)
  const controles = ([
    { tipo: 'ELI', label: 'Eliminación',    campo: 'eliminar',              texto: fila.eliminar,              color: 'gray'   },
    { tipo: 'SUS', label: 'Sustitución',    campo: 'sustituir',             texto: fila.sustituir,             color: 'gray'   },
    { tipo: 'ING', label: 'Ingeniería',     campo: 'controlIngenieria',     texto: fila.controlIngenieria,     color: 'blue'   },
    { tipo: 'ADM', label: 'Administrativo', campo: 'controlAdministrativo', texto: fila.controlAdministrativo, color: 'orange' },
    { tipo: 'EPP', label: 'EPP (Receptor)', campo: 'controlReceptor',       texto: fila.controlReceptor,       color: 'green'  },
  ] as Array<{ tipo: string; label: string; campo: CampoControl; texto: string; color: string }>)
    .map(c => ({ ...c, items: itemsConOrigen(c.texto, origenes, c.campo) }))

  // ING y ADM siempre se muestran, aunque esten vacios: sin ingenieria la
  // severidad residual no baja y sin administrativo tampoco la probabilidad.
  // Que falten es justamente lo que hay que ver.
  const visibles = controles.filter(c => c.items.length > 0 || c.tipo === 'ING' || c.tipo === 'ADM')

  const badgeColor: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    green:  'bg-green-100 text-green-700',
    gray:   'bg-muted text-muted-foreground',
  }
  const labelColor: Record<string, string> = {
    blue:   'text-blue-700',
    orange: 'text-orange-700',
    green:  'text-green-700',
    gray:   'text-muted-foreground',
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex flex-wrap items-center gap-1 transition-opacity hover:opacity-80"
          onClick={e => e.stopPropagation()}
          title="Ver y editar los controles"
        >
          {visibles.map(c => (
            <span
              key={c.tipo}
              className={cn(
                'rounded px-1 py-0.5 text-[10px] font-semibold',
                c.items.length > 0
                  ? badgeColor[c.color]
                  : 'border border-dashed border-red-300 text-red-500',
              )}
            >
              {c.tipo}
              {c.items.length > 0 && <span className="ml-0.5 font-mono opacity-70">{c.items.length}</span>}
            </span>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        className="max-h-96 w-96 overflow-y-auto p-4"
        // El contenido va en un portal del DOM, pero los eventos suben por el
        // árbol de React igual: sin esto, cualquier clic acá adentro llegaba
        // también al onClick de la fila y abría el editor completo encima.
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <p className="text-sm font-semibold">Jerarquía de controles</p>
          {onEditarControles && (
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={e => { e.stopPropagation(); onEditarControles(fila) }}
            >
              <Pencil className="mr-1 h-3 w-3" /> Editar
            </Button>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {visibles.map(c => (
            <div key={c.tipo}>
              <p className={cn('mb-0.5 text-xs font-bold', labelColor[c.color])}>{c.label}</p>
              {c.items.length === 0 ? (
                <p className="text-xs italic text-red-500">
                  Sin control — {c.tipo === 'ING' ? 'la severidad residual no baja' : 'la probabilidad residual no baja'}
                </p>
              ) : (
                <ul className="space-y-0.5 leading-relaxed">
                  {c.items.map((x, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <MarcaOrigen origen={x.origen} />
                      <span className="flex-1">{x.texto}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t pt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><MarcaOrigen origen="catalogo" /> del catálogo</span>
          <span className="flex items-center gap-1"><MarcaOrigen origen="ia" /> propuesto por IA</span>
          <span className="flex items-center gap-1"><MarcaOrigen origen="manual" /> escrito a mano</span>
        </p>
        {fila.accionesMejora && fila.accionesMejora !== 'NA' && (
          <div className="mt-3 border-t pt-3">
            <p className="mb-0.5 text-xs font-bold text-muted-foreground">Plan de mejora</p>
            <p className="text-sm leading-relaxed">{fila.accionesMejora}</p>
          </div>
        )}
        {fila.responsables && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Responsable: </span>{fila.responsables}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  filas: IpercFila[]
  onEdit: (fila: IpercFila) => void
  onDelete: (filaId: string) => void
  onGenerar?: () => void
  onAgregar?: () => void
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TablaFilasIperc({ filas, onEdit, onDelete, onGenerar, onAgregar }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: filas.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 10,
  })

  // ─── Empty state ───────────────────────────────────────────────────────────
  if (filas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-md bg-muted/10">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-base font-semibold mb-1">Sin filas todavía</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          Generá automáticamente con IA o agregá filas manualmente.
        </p>
        <div className="flex gap-2">
          {onGenerar && <Button size="sm" onClick={onGenerar}>Generar con IA</Button>}
          {onAgregar && <Button size="sm" variant="outline" onClick={onAgregar}>Agregar manualmente</Button>}
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden shadow-sm">
      {/* Único contenedor scroll: header sticky + body virtualized */}
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ height: Math.min(filas.length * 52 + 40, 620) }}
      >
        {/* Header */}
        <div
          className="flex sticky top-0 z-10 bg-background border-b-2 border-border"
          style={{ minWidth: totalW }}
        >
          {COLS.map(col => (
            <div
              key={col.key}
              className="px-2.5 py-2.5 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              style={{ width: col.w, minWidth: col.w }}
            >
              {col.label}
            </div>
          ))}
          <div
            className="px-2.5 py-2.5 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
            style={{ width: ACTIONS_W }}
          >
            Editar
          </div>
        </div>

        {/* Virtual body */}
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', minWidth: totalW }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const fila = filas[virtualRow.index]
            const isEven = virtualRow.index % 2 === 0
            return (
              <div
                key={fila.id}
                className={cn(
                  'absolute top-0 left-0 w-full flex items-center border-b group',
                  'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer',
                  isEven ? 'bg-background' : 'bg-muted/25'
                )}
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onEdit(fila)}
              >
                {/* # */}
                <div
                  className="px-2.5 shrink-0 flex items-center justify-center"
                  style={{ width: COLS[0].w, minWidth: COLS[0].w }}
                >
                  <span className="text-xs font-mono text-muted-foreground/70">
                    {String(fila.numero).padStart(3, '0')}
                  </span>
                </div>

                {/* Proceso */}
                <div className="px-2.5 shrink-0 overflow-hidden" style={{ width: COLS[1].w, minWidth: COLS[1].w }}>
                  <span className="truncate block text-xs font-medium">{fila.proceso}</span>
                </div>

                {/* Actividad */}
                <div className="px-2.5 shrink-0 overflow-hidden" style={{ width: COLS[2].w, minWidth: COLS[2].w }}>
                  <CeldaConTooltip text={fila.actividad} className="text-xs" />
                </div>

                {/* Tarea */}
                <div className="px-2.5 shrink-0 overflow-hidden" style={{ width: COLS[3].w, minWidth: COLS[3].w }}>
                  <Tooltip delayDuration={400}>
                    <TooltipTrigger asChild>
                      <span className="text-xs font-medium leading-snug line-clamp-2 cursor-default block">
                        {fila.tarea}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
                      {fila.tarea}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Puesto */}
                <div className="px-2.5 shrink-0 overflow-hidden" style={{ width: COLS[4].w, minWidth: COLS[4].w }}>
                  <CeldaConTooltip text={fila.puestoTrabajo} className="text-xs" />
                </div>

                {/* Factor */}
                <div className="px-2 shrink-0 flex items-center" style={{ width: COLS[5].w, minWidth: COLS[5].w }}>
                  <FactorBadge factor={fila.factorRiesgo} />
                </div>

                {/* Condición */}
                <div className="px-2.5 shrink-0 overflow-hidden" style={{ width: COLS[6].w, minWidth: COLS[6].w }}>
                  <span className="truncate block text-xs text-muted-foreground">{fila.condicionActividad}</span>
                </div>

                {/* Peligro */}
                <div className="px-2.5 shrink-0 overflow-hidden" style={{ width: COLS[7].w, minWidth: COLS[7].w }}>
                  <CeldaConTooltip text={fila.peligro} className="text-xs" />
                </div>

                {/* Riesgo */}
                <div className="px-2.5 shrink-0 overflow-hidden" style={{ width: COLS[8].w, minWidth: COLS[8].w }}>
                  <CeldaConTooltip text={fila.riesgo} className="text-xs" />
                </div>

                {/* Severidad */}
                <div className="px-1.5 shrink-0 flex items-center justify-center" style={{ width: COLS[9].w, minWidth: COLS[9].w }}>
                  <SeveridadBadge valor={fila.severidad} />
                </div>

                {/* Probabilidad */}
                <div className="px-1.5 shrink-0 flex items-center justify-center" style={{ width: COLS[10].w, minWidth: COLS[10].w }}>
                  <ProbabilidadBadge valor={fila.probabilidad} />
                </div>

                {/* Nivel inicial */}
                <div className="px-2 shrink-0 flex items-center" style={{ width: COLS[11].w, minWidth: COLS[11].w }}>
                  <NivelBadge severidad={fila.severidad} probabilidad={fila.probabilidad} />
                </div>

                {/* Controles */}
                <div className="px-2 shrink-0 flex items-center" style={{ width: COLS[12].w, minWidth: COLS[12].w }}>
                  <ControlesCell fila={fila} />
                </div>

                {/* Sev residual */}
                <div className="px-1.5 shrink-0 flex items-center justify-center" style={{ width: COLS[13].w, minWidth: COLS[13].w }}>
                  <SeveridadBadge valor={fila.severidadResidual} />
                </div>

                {/* Prob residual */}
                <div className="px-1.5 shrink-0 flex items-center justify-center" style={{ width: COLS[14].w, minWidth: COLS[14].w }}>
                  <ProbabilidadBadge valor={fila.probabilidadResidual} />
                </div>

                {/* Nivel residual */}
                <div className="px-2 shrink-0 flex items-center" style={{ width: COLS[15].w, minWidth: COLS[15].w }}>
                  <NivelBadge severidad={fila.severidadResidual} probabilidad={fila.probabilidadResidual} />
                  <AvisoRegla fila={fila} />
                </div>

                {/* Actions */}
                <div
                  className="shrink-0 flex items-center gap-0.5 px-1.5"
                  style={{ width: ACTIONS_W }}
                  onClick={e => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onEdit(fila)}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(fila.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
