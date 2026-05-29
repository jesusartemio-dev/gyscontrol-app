'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Copy, GripVertical, SlidersHorizontal } from 'lucide-react'
import { cn, normalizeStr } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AsignacionCeldaModal from '@/components/planificacion/AsignacionCeldaModal'
import AsignacionMasivaModal from '@/components/planificacion/AsignacionMasivaModal'
import AusenciaDetailModal from '@/components/planificacion/AusenciaDetailModal'
import CopiarSemanaModal from '@/components/planificacion/CopiarSemanaModal'
import { abreviarCargo, abreviarNombre } from '@/lib/planificacion/format'
import { CeldaPlanificacionCompacta } from '@/components/planificacion/CeldaPlanificacionCompacta'
import {
  CeldaDetalleModal,
  type CeldaDetalleData,
} from '@/components/planificacion/CeldaDetalleModal'
import { computeSeleccionRectangulo, toggleCeldaEnSeleccion } from '@/lib/planificacion/seleccion'
import { COLORES_PROYECTO } from '@/lib/utils/planificacion'
import { EjecutadoView } from './EjecutadoView'

const DEPT_ORDER = ['INGENIERIA', 'CONSTRUCCION', 'GESTION', 'PROYECTOS']
const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']
const FILTROS_KEY = 'gyscontrol:planificacion:filtros'

function loadFiltros(): { rango?: Rango; departamentosSeleccionados?: string[]; proyectoFiltro?: string } {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(FILTROS_KEY) ?? '{}') } catch { return {} }
}

type Rango = '1' | '2' | '4' | 'mes'
type TextMode = 'full' | 'short' | 'mini' | 'none'

function rangoToSemanas(rango: Rango, mesBase: { anio: number; mes: number } | null): number {
  if (rango === 'mes' && mesBase) return weeksForMonth(mesBase.anio, mesBase.mes)
  return parseInt(rango) || 1
}

function firstMondayOnOrBefore(anio: number, mes: number): string {
  const firstDay = new Date(Date.UTC(anio, mes - 1, 1))
  const dow = firstDay.getUTCDay()
  const daysBack = dow === 0 ? 6 : dow === 1 ? 0 : dow - 1
  return new Date(firstDay.getTime() - daysBack * 86400000).toISOString().slice(0, 10)
}

function weeksForMonth(anio: number, mes: number): number {
  const inicio = new Date(firstMondayOnOrBefore(anio, mes) + 'T00:00:00.000Z')
  const lastDay = new Date(Date.UTC(anio, mes, 0))
  const dow = lastDay.getUTCDay()
  const daysForward = dow === 0 ? 0 : 7 - dow
  const lastSunday = new Date(lastDay.getTime() + daysForward * 86400000)
  return Math.round(((lastSunday.getTime() - inicio.getTime()) / 86400000 + 1) / 7)
}

function textModeForSemanas(n: number): TextMode {
  if (n <= 1) return 'full'
  if (n <= 2) return 'short'
  if (n <= 4) return 'mini'
  return 'none'
}

function colWidthForSemanas(n: number): string {
  if (n <= 1) return 'minmax(52px, 1fr)'
  if (n <= 2) return 'minmax(44px, 1fr)'
  if (n <= 4) return 'minmax(36px, 1fr)'
  return 'minmax(28px, 1fr)'
}

function gridTemplate(numDias: number, n: number): string {
  return `12px 260px repeat(${numDias}, ${colWidthForSemanas(n)}) 60px`
}

const DEPT_STYLES = [
  { stripe: '#3b82f6', rowEven: 'bg-blue-50/20', rowOdd: 'bg-blue-50/50' },
  { stripe: '#10b981', rowEven: 'bg-emerald-50/20', rowOdd: 'bg-emerald-50/50' },
  { stripe: '#f59e0b', rowEven: 'bg-amber-50/20', rowOdd: 'bg-amber-50/50' },
  { stripe: '#8b5cf6', rowEven: 'bg-violet-50/20', rowOdd: 'bg-violet-50/50' },
  { stripe: '#ef4444', rowEven: 'bg-rose-50/20', rowOdd: 'bg-rose-50/50' },
]

interface CeldaEntry {
  id: string
  turno: string
  tipo: 'proyecto' | 'ausencia'
  proyecto?: { id: string; codigo: string; nombre: string; color: string }
  ausencia?: { tipo: string | undefined; codigo: string | undefined; color: string | undefined }
  esExcepcional: boolean
  notas: string | null
}

interface PersonaEntry {
  userId: string
  nombre: string
  iniciales: string
  cargo: string | null
  departamentoId: string
  departamentoNombre: string
  utilizacion: string
  dias: Record<string, CeldaEntry[]>
}

interface SemanaResponse {
  semana: { inicio: string; fin: string; isoWeek: string; numSemanas: number }
  departamento: { id: string; nombre: string } | null
  personas: PersonaEntry[]
  proyectos: Array<{ id: string; codigo: string; nombre: string; color: string }>
}

interface Departamento {
  id: string
  nombre: string
}

type DiaHeader = { dateKey: string; d: Date; isHoy: boolean; isWeekend: boolean; isSaturday: boolean; isSunday: boolean }

// ── Drag-extend types ─────────────────────────────────────────────────────────
type TurnoDia = 'dia_completo'

// ── Multi-select types ────────────────────────────────────────────────────────
type SeleccionState =
  | { type: 'idle' }
  | {
      type: 'selecting'
      origenUserId: string
      origenFecha: string
      actualUserId: string
      actualFecha: string
    }
  | {
      type: 'selected'
      celdas: Set<string> // "userId|fecha"
      anchorUserId: string // for Shift+click extension
      anchorFecha: string
    }
type CeldaPreviewEstado =
  | 'libre'
  | 'ya_asignada_mismo'
  | 'ya_asignada_otro'
  | 'ausencia'
  | 'fin_semana_bloqueado'

type DragInfo =
  | { type: 'idle' }
  | {
      type: 'extending'
      userId: string
      turno: TurnoDia
      proyectoId: string
      color: string
      esExcepcional: boolean
      fechaOrigen: string
      fechaFin: string
    }

interface DragPreviewCell {
  fecha: string
  estado: CeldaPreviewEstado
  id?: string
}

interface DragStateExtending {
  type: 'extending'
  userId: string
  turno: TurnoDia
  proyectoId: string
  color: string
  esExcepcional: boolean
  fechaOrigen: string
  fechaFin: string
  direction: 'extend' | 'reduce'
  celdasPreview: DragPreviewCell[]
}

type DragState = { type: 'idle' } | DragStateExtending

function computeDragPreview(
  fechaOrigen: string,
  fechaFin: string,
  proyectoId: string,
  personaDias: Record<string, CeldaEntry[]>,
): { direction: 'extend' | 'reduce'; celdasPreview: DragPreviewCell[] } {
  const origenMs = new Date(fechaOrigen + 'T00:00:00.000Z').getTime()
  const finMs = new Date(fechaFin + 'T00:00:00.000Z').getTime()
  const direction: 'extend' | 'reduce' = finMs >= origenMs ? 'extend' : 'reduce'

  // extend: cells from origen+1 to fin
  // reduce: cells from fin+1 to origen (the ones to delete)
  const [startMs, endMs] =
    direction === 'extend'
      ? [origenMs + 86400000, finMs]
      : [finMs + 86400000, origenMs]

  const celdasPreview: DragPreviewCell[] = []
  let ms = startMs
  while (ms <= endMs) {
    const fecha = new Date(ms).toISOString().slice(0, 10)
    const dow = new Date(ms).getUTCDay()
    const celdasDia = personaDias[fecha] ?? []

    let estado: CeldaPreviewEstado
    if (dow === 0 || dow === 6) {
      estado = 'fin_semana_bloqueado'
    } else if (celdasDia.some((c) => c.tipo === 'ausencia')) {
      estado = 'ausencia'
    } else if (celdasDia.some((c) => c.proyecto?.id === proyectoId)) {
      estado = 'ya_asignada_mismo'
    } else if (celdasDia.length > 0) {
      estado = 'ya_asignada_otro'
    } else {
      estado = 'libre'
    }

    const cell = celdasDia.find((c) => c.proyecto?.id === proyectoId)
    celdasPreview.push({ fecha, estado, id: cell?.id })
    ms += 86400000
  }

  return { direction, celdasPreview }
}

function currentMondayUTC(): string {
  const now = new Date()
  const day = now.getUTCDay() || 7
  const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (day - 1) * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

function todayUTC(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  return new Date(d.getTime() + n * 7 * 86400000).toISOString().slice(0, 10)
}

function formatDateRange(inicio: string): string {
  const d1 = new Date(inicio + 'T00:00:00.000Z')
  const d2 = new Date(d1.getTime() + 6 * 86400000)
  return `${format(d1, 'd MMM', { locale: es })} – ${format(d2, 'd MMM yyyy', { locale: es })}`
}

function celdaLabel(codigo: string | undefined, textMode: TextMode): string | null {
  if (!codigo) return null
  if (textMode === 'full' || textMode === 'short') return codigo
  if (textMode === 'mini') {
    // first char + last 2 chars, e.g. "CJM46" → "C46"
    return codigo.length <= 3 ? codigo : codigo[0] + codigo.slice(-2)
  }
  return null
}

function CeldaDia({
  celda,
  dimmed,
  isWeekend,
  isSaturday,
  isSunday,
  textMode,
  dragHandleEnabled,
  isSelected,
  isInSelectionRect,
  onClickEmpty,
  onClickProyecto,
  onClickAusencia,
  onDragHandleMouseDown,
  onMouseDownEmpty,
}: {
  celda: CeldaEntry[]
  dimmed: boolean
  isWeekend: boolean
  isSaturday: boolean
  isSunday: boolean
  textMode: TextMode
  dragHandleEnabled: boolean
  isSelected?: boolean
  isInSelectionRect?: boolean
  onClickEmpty: () => void
  onClickProyecto: () => void
  onClickAusencia: () => void
  onDragHandleMouseDown?: (e: React.MouseEvent) => void
  onMouseDownEmpty?: (e: React.MouseEvent) => void
}) {
  const weekendBg = isSaturday ? 'bg-orange-100/40' : isSunday ? 'bg-red-100/40' : ''

  if (!celda || celda.length === 0) {
    return (
      <div
        className={cn(
          'group relative flex items-center justify-center h-full border border-dashed cursor-pointer rounded transition-colors',
          weekendBg,
          isSelected
            ? 'border-blue-500 border-solid bg-blue-100/50 dark:bg-blue-900/30'
            : isInSelectionRect
              ? 'border-blue-300 border-solid bg-blue-50/60 dark:bg-blue-950/20'
              : 'border-transparent hover:border-border',
        )}
        onClick={onClickEmpty}
        onMouseDown={onMouseDownEmpty}
      >
        {textMode !== 'none' && !isSelected && !isInSelectionRect && (
          <span className="text-muted-foreground/30 group-hover:text-muted-foreground text-lg font-light">+</span>
        )}
        {isSelected && (
          <span className="text-blue-500 text-sm font-semibold">✓</span>
        )}
      </div>
    )
  }

  const c = celda[0]

  if (c.tipo === 'ausencia') {
    const label = textMode === 'none' ? null : (c.ausencia?.codigo ?? 'AUS')
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative flex items-center justify-center h-full rounded cursor-pointer text-xs font-medium',
              dimmed && 'opacity-30',
            )}
            style={{ background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)' }}
            onClick={onClickAusencia}
          >
            {label && <span className="bg-white/80 rounded px-1">{label}</span>}
            {c.esExcepcional && (
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 border border-white" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium text-xs">
            {c.ausencia?.tipo ?? 'Ausencia'}
            {c.ausencia?.codigo ? ` (${c.ausencia.codigo})` : ''}
          </p>
          {c.notas && <p className="text-xs text-muted-foreground mt-0.5">{c.notas}</p>}
        </TooltipContent>
      </Tooltip>
    )
  }

  const color = c.proyecto?.color ?? '#6b7280'
  const label = celdaLabel(c.proyecto?.codigo, textMode)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'group relative flex items-center justify-center h-full rounded cursor-pointer text-[10px] font-bold px-0.5 shadow-sm',
            dimmed && 'opacity-40',
          )}
          style={{ backgroundColor: color, color: 'white' }}
          onClick={onClickProyecto}
        >
          {label && <span className="truncate drop-shadow-sm">{label}</span>}
          {c.esExcepcional && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-300 border border-white/60" />
          )}
          {dragHandleEnabled && onDragHandleMouseDown && (
            <div
              className="absolute right-0 top-[15%] bottom-[15%] w-1.5 rounded-r opacity-0 group-hover:opacity-40 cursor-col-resize transition-opacity"
              style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onDragHandleMouseDown(e)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="font-medium text-xs">
          [{c.proyecto?.codigo}] {c.proyecto?.nombre}
        </p>
        {c.notas && <p className="text-xs text-muted-foreground mt-0.5">{c.notas}</p>}
      </TooltipContent>
    </Tooltip>
  )
}

function UtilBadge({
  util,
  semanaInicio,
  hoyKey,
}: {
  util: string
  semanaInicio: string
  hoyKey: string
}) {
  const [asignados, total] = util.split('/').map(Number)

  const lunesMs = new Date(semanaInicio + 'T00:00:00.000Z').getTime()
  const hoyMs = new Date(hoyKey + 'T00:00:00.000Z').getTime()
  let diasTranscurridos = 0
  let d = lunesMs
  while (d <= hoyMs && diasTranscurridos < 5) {
    if (new Date(d).getUTCDay() !== 0 && new Date(d).getUTCDay() !== 6) diasTranscurridos++
    d += 86400000
  }

  if (asignados === 0 && diasTranscurridos === 0) {
    return <span className="text-xs font-medium text-muted-foreground">—</span>
  }
  if (asignados > total) {
    return <span className="text-xs font-medium text-amber-600">{util}</span>
  }
  if (asignados === total) {
    return <span className="text-xs font-medium text-green-600">{util}</span>
  }
  if (asignados < diasTranscurridos) {
    return <span className="text-xs font-medium text-red-500">{util}</span>
  }
  return <span className="text-xs font-medium text-muted-foreground">{util}</span>
}

function DragPreviewOverlay({
  estado,
  direction,
  color,
}: {
  estado: CeldaPreviewEstado
  direction: 'extend' | 'reduce'
  color: string
}) {
  if (estado === 'ya_asignada_mismo') {
    // reduce direction: mark for deletion
    if (direction === 'reduce') {
      return (
        <div className="absolute inset-0 rounded border-2 border-red-500 bg-red-400/25 pointer-events-none" />
      )
    }
    return null // extend: already assigned, no overlay
  }
  if (estado === 'libre') {
    return (
      <div
        className="absolute inset-0.5 rounded animate-pulse pointer-events-none"
        style={{ backgroundColor: color + '55', border: `1px solid ${color}88` }}
      />
    )
  }
  if (estado === 'ausencia') {
    return (
      <div className="absolute inset-0 rounded border-2 border-red-400 bg-red-100/40 pointer-events-none" />
    )
  }
  if (estado === 'ya_asignada_otro') {
    return (
      <div className="absolute inset-0 rounded border-2 border-amber-400 bg-amber-100/40 pointer-events-none" />
    )
  }
  // fin_semana_bloqueado
  return (
    <div className="absolute inset-0 rounded bg-gray-300/50 flex items-center justify-center text-[9px] pointer-events-none">
      🔒
    </div>
  )
}

function SortablePersonaRow({
  persona,
  diasHeader,
  proyectoFiltro,
  semanaInicio,
  hoyKey,
  textMode,
  gridCols,
  dragState,
  dragHandleEnabled,
  seleccionKeys,
  seleccionRectKeys,
  seleccionEnabled,
  colorOverrides,
  onClickEmpty,
  onClickProyecto,
  onClickAusencia,
  onDragStart,
  onCeldaMouseDown,
  deptStripeColor,
  rowBgClass,
}: {
  persona: PersonaEntry
  diasHeader: DiaHeader[]
  proyectoFiltro: string
  semanaInicio: string
  hoyKey: string
  textMode: TextMode
  gridCols: string
  dragState: DragState
  dragHandleEnabled: boolean
  seleccionKeys: Set<string>
  seleccionRectKeys: Set<string>
  seleccionEnabled: boolean
  colorOverrides: Record<string, string>
  onClickEmpty: (fecha: string) => void
  onClickProyecto: (fecha: string, celda: CeldaEntry) => void
  onClickAusencia: (fecha: string, celda: CeldaEntry) => void
  onDragStart: (info: Omit<DragStateExtending, 'type' | 'direction' | 'celdasPreview' | 'fechaFin'>) => void
  onCeldaMouseDown: (userId: string, fecha: string, e: React.MouseEvent) => void
  deptStripeColor: string
  rowBgClass: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: persona.userId,
  })

  const style = {
    display: 'grid',
    gridTemplateColumns: gridCols,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("h-6 border-b items-center hover:brightness-95", rowBgClass)}
    >
      {/* Dept stripe — 12px first column, overlaid by parent absolute label */}
      <div className="self-stretch" style={{ backgroundColor: deptStripeColor, opacity: 0.15 }} />
      <div className="flex items-center gap-1 px-2 overflow-hidden">
        <button
          {...attributes}
          {...listeners}
          tabIndex={-1}
          className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <div className="shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary">
          {persona.iniciales}
        </div>
        <div className="min-w-0 ml-1">
          {persona.cargo ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs font-medium truncate leading-none cursor-default">{abreviarNombre(persona.nombre)}</p>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {abreviarCargo(persona.cargo)}
              </TooltipContent>
            </Tooltip>
          ) : (
            <p className="text-xs font-medium truncate leading-none">{abreviarNombre(persona.nombre)}</p>
          )}
        </div>
      </div>

      {diasHeader.map(({ dateKey, d, isHoy, isWeekend, isSaturday, isSunday }) => {
        const celdasDia = (persona.dias[dateKey] ?? []).map((c) =>
          c.tipo === 'proyecto' && c.proyecto && colorOverrides[c.proyecto.id]
            ? { ...c, proyecto: { ...c.proyecto, color: colorOverrides[c.proyecto.id] } }
            : c,
        )
        const dimmed =
          proyectoFiltro !== '__all__' &&
          celdasDia.length > 0 &&
          !celdasDia.some((c) => c.proyecto?.id === proyectoFiltro)

        const isDragActive = dragState.type === 'extending'
        const isThisUserDragging = isDragActive && dragState.userId === persona.userId
        const previewCell = isThisUserDragging
          ? dragState.celdasPreview.find((p) => p.fecha === dateKey)
          : undefined

        const c0 = celdasDia[0]
        const handleDragMouseDown =
          dragHandleEnabled && c0?.tipo === 'proyecto'
            ? (e: React.MouseEvent) => {
                onDragStart({
                  userId: persona.userId,
                  turno: c0.turno as TurnoDia,
                  proyectoId: c0.proyecto?.id ?? '',
                  color: c0.proyecto?.color ?? '#6b7280',
                  esExcepcional: c0.esExcepcional,
                  fechaOrigen: dateKey,
                })
              }
            : undefined

        const cellKey = `${persona.userId}|${dateKey}`
        const isSelected = seleccionKeys.has(cellKey)
        const isInSelectionRect = seleccionRectKeys.has(cellKey)
        const handleMouseDownEmpty =
          seleccionEnabled && celdasDia.length === 0
            ? (e: React.MouseEvent) => onCeldaMouseDown(persona.userId, dateKey, e)
            : undefined

        return (
          <div
            key={dateKey}
            data-celda-userid={persona.userId}
            data-celda-fecha={dateKey}
            className={cn(
              'relative h-full px-0.5 py-0.5',
              isSaturday && 'bg-orange-100/30',
              isSunday && 'bg-red-100/30',
              isHoy && 'border-l-2 border-blue-500',
            )}
          >
            <CeldaDia
              celda={celdasDia}
              dimmed={dimmed}
              isWeekend={isWeekend}
              isSaturday={isSaturday}
              isSunday={isSunday}
              textMode={textMode}
              dragHandleEnabled={dragHandleEnabled}
              isSelected={isSelected}
              isInSelectionRect={isInSelectionRect}
              onClickEmpty={isDragActive ? () => {} : () => onClickEmpty(dateKey)}
              onClickProyecto={isDragActive ? () => {} : () => onClickProyecto(dateKey, celdasDia[0])}
              onClickAusencia={isDragActive ? () => {} : () => onClickAusencia(dateKey, celdasDia[0])}
              onDragHandleMouseDown={handleDragMouseDown}
              onMouseDownEmpty={handleMouseDownEmpty}
            />
            {previewCell && dragState.type === 'extending' && (
              <DragPreviewOverlay
                estado={previewCell.estado}
                direction={dragState.direction}
                color={dragState.color}
              />
            )}
          </div>
        )
      })}

      <div className="flex items-center justify-center">
        <UtilBadge util={persona.utilizacion} semanaInicio={semanaInicio} hoyKey={hoyKey} />
      </div>
    </div>
  )
}

// ── Viewport detection ────────────────────────────────────────────────────────
function useViewport(): 'mobile' | 'tablet' | 'desktop' {
  const [vp, setVp] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  useEffect(() => {
    function check() {
      const w = window.innerWidth
      setVp(w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return vp
}

// ── Mobile card view ─────────────────────────────────────────────────────────
function PersonaMobileCard({
  persona,
  diasHeader,
  hoyKey,
  onTapCelda,
}: {
  persona: PersonaEntry
  diasHeader: DiaHeader[]
  hoyKey: string
  onTapCelda: (fecha: string) => void
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b bg-muted/20">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
          {persona.iniciales}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{persona.nombre}</p>
          {persona.cargo && (
            <p className="text-xs text-muted-foreground truncate">{abreviarCargo(persona.cargo)}</p>
          )}
        </div>
        <UtilBadge util={persona.utilizacion} semanaInicio={diasHeader[0]?.dateKey ?? ''} hoyKey={hoyKey} />
      </div>

      {/* Day rows */}
      <div>
        {diasHeader.map(({ dateKey, d, isHoy, isWeekend }) => {
          const celdasDia = persona.dias[dateKey] ?? []
          const dow = d.toLocaleDateString('es', { weekday: 'short', timeZone: 'UTC' })
          const num = d.getUTCDate()
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onTapCelda(dateKey)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 border-b last:border-b-0 text-left',
                isHoy && 'bg-blue-50 dark:bg-blue-950/20',
                isWeekend && !isHoy && 'bg-muted/20',
                'hover:bg-muted/30 transition-colors',
              )}
            >
              <div className="w-14 flex-shrink-0">
                <span
                  className={cn(
                    'text-xs capitalize',
                    isHoy ? 'font-semibold text-blue-600' : 'text-muted-foreground',
                    isWeekend && !isHoy && 'text-muted-foreground/60',
                  )}
                >
                  {dow} {num}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {celdasDia.length === 0 ? (
                  <span className="text-xs text-muted-foreground/50">—</span>
                ) : (
                  <CeldaPlanificacionCompacta celda={celdasDia[0]} />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function PlanificacionPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  const [semanaInicio, setSemanaInicio] = useState<string>(currentMondayUTC)
  const [rango, setRango] = useState<Rango>(() => loadFiltros().rango ?? '1')
  const [mesBase, setMesBase] = useState<{ anio: number; mes: number } | null>(null)
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState<string[]>(() => loadFiltros().departamentosSeleccionados ?? [])
  const [proyectoFiltro, setProyectoFiltro] = useState<string>(() => loadFiltros().proyectoFiltro ?? '__all__')
  const [busqueda, setBusqueda] = useState('')
  const [data, setData] = useState<SemanaResponse | null>(null)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [personOrder, setPersonOrder] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [vistaTab, setVistaTab] = useState<'planificado' | 'ejecutado'>('planificado')

  const [modalCelda, setModalCelda] = useState<{
    userId: string
    nombre: string
    fecha: string
    celda?: CeldaEntry
  } | null>(null)
  const [modalAusencia, setModalAusencia] = useState<CeldaEntry | null>(null)
  const [showCopiarModal, setShowCopiarModal] = useState(false)

  const [dragInfo, setDragInfo] = useState<DragInfo>({ type: 'idle' })
  const [modalDetalle, setModalDetalle] = useState<CeldaDetalleData | null>(null)
  const [seleccionState, setSeleccionState] = useState<SeleccionState>({ type: 'idle' })
  const [modalMasivo, setModalMasivo] = useState(false)
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({})
  const viewport = useViewport()
  const isDesktop = viewport === 'desktop'
  const isReadOnly = !isDesktop

  const hoy = useMemo(() => currentMondayUTC(), [])
  const hoyKey = useMemo(() => todayUTC(), [])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetch('/api/planificacion/departamentos')
      .then((r) => r.json())
      .then(setDepartamentos)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (departamentos.length === 0 || departamentosSeleccionados.length > 0) return
    const defaults = departamentos
      .filter((d) => DEPT_ORDER.some((n) => d.nombre.toUpperCase().includes(n)))
      .map((d) => d.id)
    setDepartamentosSeleccionados(
      defaults.length > 0 ? defaults : departamentos.slice(0, 4).map((d) => d.id),
    )
  }, [departamentos])

  useEffect(() => {
    try { localStorage.setItem(FILTROS_KEY, JSON.stringify({ rango, departamentosSeleccionados, proyectoFiltro })) } catch {}
  }, [rango, departamentosSeleccionados, proyectoFiltro])

  const numSemanas = useMemo(() => rangoToSemanas(rango, mesBase), [rango, mesBase])
  const textMode = useMemo(() => textModeForSemanas(numSemanas), [numSemanas])
  const gridCols = useMemo(() => gridTemplate(numSemanas * 7, numSemanas), [numSemanas])

  // Drag-extend: desktop only, and only in 1- or 2-week views
  const dragHandleEnabled = numSemanas <= 2 && isDesktop

  const dragState = useMemo((): DragState => {
    if (dragInfo.type !== 'extending') return { type: 'idle' }
    const persona = data?.personas.find((p) => p.userId === dragInfo.userId)
    if (!persona) return { type: 'idle' }
    const { direction, celdasPreview } = computeDragPreview(
      dragInfo.fechaOrigen,
      dragInfo.fechaFin,
      dragInfo.proyectoId,
      persona.dias,
    )
    return { ...dragInfo, direction, celdasPreview }
  }, [dragInfo, data])

  const dragStateRef = useRef<DragState>(dragState)
  dragStateRef.current = dragState

  // Selection: only active on desktop 1–2 week views
  const seleccionEnabled = numSemanas <= 2 && isDesktop

  // Refs to avoid stale closures in selection mouseup/keyboard handlers
  const seleccionRef = useRef<SeleccionState>({ type: 'idle' })
  seleccionRef.current = seleccionState
  const orderedUserIdsRef = useRef<string[]>([])
  const fechasOrdenadasRef = useRef<string[]>([])
  // Suppresses the onClick that fires after a Ctrl/Cmd+mousedown on an empty cell
  const ctrlClickSuppressRef = useRef(false)

  useEffect(() => {
    if (!semanaInicio) return
    setLoading(true)
    const params = new URLSearchParams({ inicio: semanaInicio, semanas: String(numSemanas) })
    if (departamentosSeleccionados.length > 0) {
      params.set('departamentos', departamentosSeleccionados.join(','))
    }
    fetch(`/api/planificacion/semana?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Error al cargar planificación'))
      .finally(() => setLoading(false))
  }, [semanaInicio, departamentosSeleccionados, numSemanas])

  useEffect(() => {
    if (!data?.personas) return
    setPersonOrder((prev) => {
      const deptMap = new Map<string, string[]>()
      for (const p of data.personas) {
        if (!deptMap.has(p.departamentoId)) deptMap.set(p.departamentoId, [])
        deptMap.get(p.departamentoId)!.push(p.userId)
      }
      const next: Record<string, string[]> = {}
      for (const [deptId, userIds] of deptMap.entries()) {
        const existing = prev[deptId]
        if (existing) {
          const filtered = existing.filter((id) => userIds.includes(id))
          const newOnes = userIds.filter((id) => !existing.includes(id))
          next[deptId] = [...filtered, ...newOnes]
        } else {
          next[deptId] = userIds
        }
      }
      return next
    })
  }, [data])

  const personasFiltradas = useMemo(() => {
    if (!data?.personas) return []
    return data.personas.filter(
      (p) => !busqueda || normalizeStr(p.nombre).includes(normalizeStr(busqueda)),
    )
  }, [data?.personas, busqueda])

  const gruposPorDepartamento = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; personas: PersonaEntry[] }>()
    for (const p of personasFiltradas) {
      if (!map.has(p.departamentoId)) {
        map.set(p.departamentoId, { id: p.departamentoId, nombre: p.departamentoNombre, personas: [] })
      }
      map.get(p.departamentoId)!.personas.push(p)
    }
    return Array.from(map.values())
      .map((grupo) => {
        const order = personOrder[grupo.id] ?? []
        const ordered = order
          .map((uid) => grupo.personas.find((p) => p.userId === uid))
          .filter((p): p is PersonaEntry => !!p)
        const unordered = grupo.personas.filter((p) => !order.includes(p.userId))
        return { ...grupo, personas: [...ordered, ...unordered] }
      })
      .sort((a, b) => {
        const ai = DEPT_ORDER.findIndex((n) => a.nombre.toUpperCase().includes(n))
        const bi = DEPT_ORDER.findIndex((n) => b.nombre.toUpperCase().includes(n))
        if (ai === -1 && bi === -1) return a.nombre.localeCompare(b.nombre)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
  }, [personasFiltradas, personOrder])

  const diasHeader = useMemo((): DiaHeader[] => {
    return Array.from({ length: numSemanas * 7 }, (_, i) => {
      const d = new Date(semanaInicio + 'T00:00:00.000Z')
      d.setUTCDate(d.getUTCDate() + i)
      const dateKey = d.toISOString().slice(0, 10)
      const utcDay = d.getUTCDay()
      return {
        dateKey,
        d,
        isHoy: dateKey === hoyKey,
        isWeekend: utcDay === 0 || utcDay === 6,
        isSaturday: utcDay === 6,
        isSunday: utcDay === 0,
      }
    })
  }, [semanaInicio, hoyKey, numSemanas])

  // Flat ordered user list matching visual row order — for rectangle computation
  const orderedUserIds = useMemo(
    () => gruposPorDepartamento.flatMap((g) => g.personas.map((p) => p.userId)),
    [gruposPorDepartamento],
  )
  const fechasOrdenadas = useMemo(() => diasHeader.map((d) => d.dateKey), [diasHeader])

  const resumenPorDia = useMemo(() => {
    return diasHeader.map(({ dateKey, isWeekend, isSaturday, isSunday }) => {
      const conteoProyecto: Record<string, { count: number; color: string }> = {}
      let total = 0
      for (const p of personasFiltradas) {
        const celdas = (p.dias[dateKey] ?? []).filter((c) => c.tipo === 'proyecto' && c.proyecto)
        const match =
          proyectoFiltro === '__all__'
            ? celdas
            : celdas.filter((c) => c.proyecto?.id === proyectoFiltro)
        if (match.length === 0) continue
        total++
        for (const c of match) {
          if (!c.proyecto) continue
          const codigo = c.proyecto.codigo
          const color = colorOverrides[c.proyecto.id] ?? c.proyecto.color
          if (!conteoProyecto[codigo]) conteoProyecto[codigo] = { count: 0, color }
          conteoProyecto[codigo].count++
        }
      }
      return { dateKey, isWeekend, isSaturday, isSunday, total, conteoProyecto }
    })
  }, [diasHeader, personasFiltradas, proyectoFiltro, colorOverrides])

  // Keep refs current every render (avoids stale closures in mouseup/keyboard effects)
  orderedUserIdsRef.current = orderedUserIds
  fechasOrdenadasRef.current = fechasOrdenadas

  // Preview rectangle during drag-select (computed from live data, no API call)
  const seleccionRectKeys = useMemo((): Set<string> => {
    if (seleccionState.type !== 'selecting') return new Set()
    return computeSeleccionRectangulo(
      seleccionState.origenUserId,
      seleccionState.origenFecha,
      seleccionState.actualUserId,
      seleccionState.actualFecha,
      orderedUserIds,
      fechasOrdenadas,
      (userId, fecha) => data?.personas.find((p) => p.userId === userId)?.dias[fecha] ?? [],
    )
  }, [seleccionState, orderedUserIds, fechasOrdenadas, data])

  // Final confirmed selection keys
  const seleccionKeys = useMemo(
    (): Set<string> => (seleccionState.type === 'selected' ? seleccionState.celdas : new Set()),
    [seleccionState],
  )

  const handleDragEnd = useCallback((deptId: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPersonOrder((prev) => {
      const current = prev[deptId] ?? []
      const oldIndex = current.indexOf(active.id as string)
      const newIndex = current.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return prev
      return { ...prev, [deptId]: arrayMove(current, oldIndex, newIndex) }
    })
  }, [])

  const reload = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ inicio: semanaInicio, semanas: String(numSemanas) })
    if (departamentosSeleccionados.length > 0) {
      params.set('departamentos', departamentosSeleccionados.join(','))
    }
    fetch(`/api/planificacion/semana?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Error al cargar planificación'))
      .finally(() => setLoading(false))
  }, [semanaInicio, departamentosSeleccionados, numSemanas])

  const reloadRef = useRef(reload)
  reloadRef.current = reload

  const dataRef = useRef<SemanaResponse | null>(null)
  dataRef.current = data

  const handleDragStart = useCallback(
    (info: Omit<DragStateExtending, 'type' | 'direction' | 'celdasPreview' | 'fechaFin'>) => {
      setDragInfo({ type: 'extending', ...info, fechaFin: info.fechaOrigen })
    },
    [],
  )

  const handleColorChange = useCallback(async (proyectoId: string, color: string | null) => {
    setColorOverrides((prev) =>
      color === null
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== proyectoId))
        : { ...prev, [proyectoId]: color },
    )
    try {
      await fetch(`/api/planificacion/proyectos/${proyectoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorPlanificacion: color }),
      })
      reloadRef.current()
    } catch {
      toast.error('Error al guardar el color')
      setColorOverrides((prev) => {
        const next = { ...prev }
        delete next[proyectoId]
        return next
      })
    }
  }, [])

  // ── Selection handlers ───────────────────────────────────────────────────────
  const handleCeldaMouseDown = useCallback(
    (userId: string, fecha: string, e: React.MouseEvent) => {
      if (!seleccionEnabled) return
      if (dragInfo.type === 'extending') return
      e.preventDefault()

      // Ctrl/Cmd+click: toggle individual cell
      if (e.ctrlKey || e.metaKey) {
        ctrlClickSuppressRef.current = true
        setSeleccionState((prev) => toggleCeldaEnSeleccion(prev, userId, fecha) as SeleccionState)
        return
      }

      // Shift+click: extend from anchor to this cell
      if (e.shiftKey && seleccionState.type === 'selected') {
        const extendedKeys = computeSeleccionRectangulo(
          seleccionState.anchorUserId,
          seleccionState.anchorFecha,
          userId,
          fecha,
          orderedUserIdsRef.current,
          fechasOrdenadasRef.current,
          (uid, f) => data?.personas.find((p) => p.userId === uid)?.dias[f] ?? [],
        )
        if (extendedKeys.size > 0) {
          setSeleccionState((prev) =>
            prev.type === 'selected'
              ? { ...prev, celdas: extendedKeys }
              : { type: 'selected', celdas: extendedKeys, anchorUserId: userId, anchorFecha: fecha },
          )
        }
        return
      }

      // Plain mousedown: start rectangular drag-select
      setSeleccionState({
        type: 'selecting',
        origenUserId: userId,
        origenFecha: fecha,
        actualUserId: userId,
        actualFecha: fecha,
      })
    },
    [seleccionEnabled, dragInfo.type, seleccionState, data],
  )

  useEffect(() => {
    if (dragInfo.type !== 'extending') return
    // Safety guard: do not attach drag listeners on touch/tablet devices
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      setDragInfo({ type: 'idle' })
      return
    }

    let rafId: number | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const cellEl = el?.closest('[data-celda-fecha]') as HTMLElement | null
        const fecha = cellEl?.dataset.celdaFecha
        const userId = cellEl?.dataset.celdaUserid
        if (fecha && userId === dragInfo.userId) {
          setDragInfo((prev) =>
            prev.type === 'extending' && prev.fechaFin !== fecha
              ? { ...prev, fechaFin: fecha }
              : prev,
          )
        }
      })
    }

    const handleMouseUp = async () => {
      const state = dragStateRef.current
      setDragInfo({ type: 'idle' })

      if (state.type !== 'extending' || state.celdasPreview.length === 0) return

      if (state.direction === 'extend') {
        const libres = state.celdasPreview.filter((c) => c.estado === 'libre')
        if (libres.length === 0) return

        try {
          const res = await fetch('/api/planificacion/dia/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              asignaciones: libres.map((c) => ({
                userId: state.userId,
                fecha: c.fecha,
                turno: state.turno,
                proyectoId: state.proyectoId,
                esExcepcional: state.esExcepcional,
                notas: null,
              })),
            }),
          })
          const result = await res.json()
          if (!res.ok && res.status !== 207) {
            toast.error('Error al asignar celdas')
            return
          }
          const msgs: string[] = []
          if (result.creadas > 0)
            msgs.push(`✓ ${result.creadas} celda${result.creadas > 1 ? 's' : ''} asignada${result.creadas > 1 ? 's' : ''}`)
          const aus = result.omitidas?.filter((o: { razon: string }) => o.razon === 'conflicto_ausencia').length ?? 0
          const fin = result.omitidas?.filter((o: { razon: string }) => o.razon === 'fin_de_semana_no_excepcional').length ?? 0
          const otro = (result.omitidas?.length ?? 0) - aus - fin
          if (aus) msgs.push(`⚠ ${aus} omitida${aus > 1 ? 's' : ''} (ausencia)`)
          if (fin) msgs.push(`⚠ ${fin} omitida${fin > 1 ? 's' : ''} (fin de semana)`)
          if (otro) msgs.push(`⚠ ${otro} omitida${otro > 1 ? 's' : ''} (otro)`)
          toast.success(msgs.join(' · ') || 'Sin cambios')
          reloadRef.current()
        } catch {
          toast.error('Error al asignar celdas')
        }
      } else {
        // Reduce: delete existing cells in preview range
        const toDelete = state.celdasPreview.filter(
          (c) => c.estado === 'ya_asignada_mismo' && c.id,
        )
        if (toDelete.length === 0) return
        try {
          await Promise.all(
            toDelete.map((c) =>
              fetch(`/api/planificacion/dia/${c.id}`, { method: 'DELETE' }),
            ),
          )
          toast.success(
            `✓ ${toDelete.length} celda${toDelete.length > 1 ? 's' : ''} eliminada${toDelete.length > 1 ? 's' : ''}`,
          )
          reloadRef.current()
        } catch {
          toast.error('Error al eliminar celdas')
        }
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDragInfo({ type: 'idle' })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
    // Only re-attach when drag starts/stops, not on every fechaFin change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragInfo.type])

  // ── Selection drag effect ────────────────────────────────────────────────────
  useEffect(() => {
    if (seleccionState.type !== 'selecting') return

    let rafId: number | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const cellEl = el?.closest('[data-celda-userid]') as HTMLElement | null
        const fecha = cellEl?.dataset.celdaFecha
        const userId = cellEl?.dataset.celdaUserid
        if (fecha && userId) {
          setSeleccionState((prev) =>
            prev.type === 'selecting' &&
            (prev.actualUserId !== userId || prev.actualFecha !== fecha)
              ? { ...prev, actualUserId: userId, actualFecha: fecha }
              : prev,
          )
        }
      })
    }

    const handleMouseUp = () => {
      const state = seleccionRef.current
      if (state.type !== 'selecting') return

      const finalKeys = computeSeleccionRectangulo(
        state.origenUserId,
        state.origenFecha,
        state.actualUserId,
        state.actualFecha,
        orderedUserIdsRef.current,
        fechasOrdenadasRef.current,
        (uid, f) => dataRef.current?.personas.find((p) => p.userId === uid)?.dias[f] ?? [],
      )

      if (finalKeys.size === 0) {
        setSeleccionState({ type: 'idle' })
      } else {
        setSeleccionState({
          type: 'selected',
          celdas: finalKeys,
          anchorUserId: state.origenUserId,
          anchorFecha: state.origenFecha,
        })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionState.type])

  // ── Selection keyboard effect ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = seleccionRef.current

      if (e.key === 'Escape' && state.type !== 'idle') {
        e.preventDefault()
        setSeleccionState({ type: 'idle' })
        return
      }

      if (e.key === 'Enter' && state.type === 'selected' && state.celdas.size > 0) {
        e.preventDefault()
        setModalMasivo(true)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        // Only activate Ctrl+A if no input/textarea is focused
        const tag = (document.activeElement as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        if (!seleccionEnabled) return

        const allEmpty = new Set<string>()
        for (const p of dataRef.current?.personas ?? []) {
          for (const f of fechasOrdenadasRef.current) {
            if ((p.dias[f] ?? []).length === 0) allEmpty.add(`${p.userId}|${f}`)
          }
        }
        if (allEmpty.size === 0) return

        if (allEmpty.size > 30) {
          if (!window.confirm(`Seleccionar ${allEmpty.size} celdas vacías?`)) return
        }
        setSeleccionState({
          type: 'selected',
          celdas: allEmpty,
          anchorUserId: orderedUserIdsRef.current[0] ?? '',
          anchorFecha: fechasOrdenadasRef.current[0] ?? '',
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionEnabled])

  if (role && !ROLES_PERMITIDOS.includes(role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tienes acceso a esta sección.</p>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className={cn(
        'container mx-auto p-4 sm:p-6',
        dragState.type === 'extending' && 'cursor-col-resize select-none',
        seleccionState.type === 'selecting' && 'cursor-crosshair select-none',
      )}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Planificación de personal</h1>
            <p className="text-sm text-muted-foreground">
              {rango === '1'
                ? `Semana ${data?.semana.isoWeek ?? '…'} · ${formatDateRange(semanaInicio)}`
                : rango === 'mes' && mesBase
                  ? `${new Date(Date.UTC(mesBase.anio, mesBase.mes - 1, 1)).toLocaleDateString('es', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`
                  : `${numSemanas} semanas · ${formatDateRange(semanaInicio)}`}
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowCopiarModal(true)} className="hidden lg:flex">
            <Copy className="mr-2 h-4 w-4" /> Copiar semana
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (rango === 'mes' && mesBase) {
                  const prev = mesBase.mes === 1 ? { anio: mesBase.anio - 1, mes: 12 } : { anio: mesBase.anio, mes: mesBase.mes - 1 }
                  setMesBase(prev)
                  setSemanaInicio(firstMondayOnOrBefore(prev.anio, prev.mes))
                } else {
                  setSemanaInicio(addWeeks(semanaInicio, -numSemanas))
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const todayMonday = hoy
                setSemanaInicio(todayMonday)
                if (rango === 'mes') {
                  const now = new Date()
                  setMesBase({ anio: now.getUTCFullYear(), mes: now.getUTCMonth() + 1 })
                  setSemanaInicio(firstMondayOnOrBefore(now.getUTCFullYear(), now.getUTCMonth() + 1))
                }
              }}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (rango === 'mes' && mesBase) {
                  const next = mesBase.mes === 12 ? { anio: mesBase.anio + 1, mes: 1 } : { anio: mesBase.anio, mes: mesBase.mes + 1 }
                  setMesBase(next)
                  setSemanaInicio(firstMondayOnOrBefore(next.anio, next.mes))
                } else {
                  setSemanaInicio(addWeeks(semanaInicio, numSemanas))
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select
            value={rango}
            onValueChange={(v) => {
              const r = v as Rango
              setRango(r)
              if (r === 'mes') {
                const d = new Date(semanaInicio + 'T00:00:00.000Z')
                const mb = { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 }
                setMesBase(mb)
                setSemanaInicio(firstMondayOnOrBefore(mb.anio, mb.mes))
              }
            }}
            // Only show range selector on desktop/tablet (on mobile we always use 1 week)
          >
            <SelectTrigger className="hidden md:flex w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 semana</SelectItem>
              <SelectItem value="2">2 semanas</SelectItem>
              <SelectItem value="4">4 semanas</SelectItem>
              <SelectItem value="mes">Mes calendario</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar persona..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-40 h-9"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Áreas
                {departamentosSeleccionados.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs leading-4">
                    {departamentosSeleccionados.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Filtrar por área</p>
              {departamentos.map((dept) => {
                const checked = departamentosSeleccionados.includes(dept.id)
                return (
                  <label
                    key={dept.id}
                    className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setDepartamentosSeleccionados((prev) =>
                          v ? [...prev, dept.id] : prev.filter((id) => id !== dept.id),
                        )
                      }
                    />
                    {dept.nombre}
                  </label>
                )
              })}
            </PopoverContent>
          </Popover>

          <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
            <SelectTrigger className="w-52 h-9">
              <SelectValue placeholder="Filtrar proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los proyectos</SelectItem>
              {data?.proyectos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  [{p.codigo}] {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Tab toggle Planificado / Ejecutado ─────────────────────────────── */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border text-sm">
            <button
              onClick={() => setVistaTab('planificado')}
              className={`px-3 py-1.5 transition-colors ${vistaTab === 'planificado' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              Planificado
            </button>
            <button
              onClick={() => setVistaTab('ejecutado')}
              className={`px-3 py-1.5 transition-colors ${vistaTab === 'ejecutado' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              Ejecutado
            </button>
          </div>
          {vistaTab === 'ejecutado' && (
            <span className="text-xs text-muted-foreground">
              Horas de campo registradas en el período · cruzadas con asistencia
            </span>
          )}
        </div>

        {vistaTab === 'ejecutado' && (
          <EjecutadoView
            semanaInicio={semanaInicio}
            numSemanas={numSemanas}
            departamentosSeleccionados={departamentosSeleccionados}
            busqueda={busqueda}
          />
        )}

        {vistaTab === 'planificado' && (<>
        {/* ── Mobile card view (<768px) ──────────────────────────────────────── */}
        <div className="md:hidden">
          {viewport === 'mobile' && rango !== '1' && (
            <p className="text-xs text-muted-foreground text-center mb-2 bg-muted/30 rounded px-3 py-1.5">
              Vista semanal en móvil. Para ver más, abre desde PC.
            </p>
          )}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-lg border bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {gruposPorDepartamento.map((grupo) => (
                <div key={grupo.id}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    {grupo.nombre} ({grupo.personas.length})
                  </p>
                  <div className="space-y-3">
                    {grupo.personas.map((persona) => (
                      <PersonaMobileCard
                        key={persona.userId}
                        persona={persona}
                        diasHeader={diasHeader.slice(0, 7)}
                        hoyKey={hoyKey}
                        onTapCelda={(fecha) => {
                          const celdas = persona.dias[fecha] ?? []
                          const celda = celdas[0] ?? null
                          setModalDetalle({ nombrePersona: persona.nombre, fecha, celda })
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {personasFiltradas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay personal en esta semana
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop/Tablet matrix (≥768px) ─────────────────────────────────── */}
        {loading ? (
          <div className="hidden md:flex items-center justify-center h-48 text-muted-foreground text-sm">
            Cargando planificación...
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <div style={{ minWidth: `${260 + numSemanas * 7 * 36 + 60}px` }}>
              {/* Week group sub-headers for multi-week view */}
              {numSemanas > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: gridCols }} className="text-[10px] font-semibold text-muted-foreground border-b bg-muted/20">
                  <div />{/* dept stripe col */}
                  <div />
                  {Array.from({ length: numSemanas }, (_, wi) => {
                    const monday = new Date(semanaInicio + 'T00:00:00.000Z')
                    monday.setUTCDate(monday.getUTCDate() + wi * 7)
                    const sunday = new Date(monday.getTime() + 6 * 86400000)
                    const label = `${monday.getUTCDate()} – ${sunday.getUTCDate()} ${sunday.toLocaleDateString('es', { month: 'short', timeZone: 'UTC' })}`
                    return (
                      <div key={wi} className="col-span-7 text-center py-0.5 border-r last:border-r-0 leading-tight">
                        {label}
                      </div>
                    )
                  })}
                  <div />
                </div>
              )}

              {/* Header de días */}
              <div style={{ display: 'grid', gridTemplateColumns: gridCols }} className="text-xs font-medium text-muted-foreground border-b mb-0.5 pb-1">
                <div />{/* dept stripe col */}
                <div className="px-3">Persona</div>
                {diasHeader.map(({ dateKey, d, isHoy, isSaturday, isSunday }) => {
                  const dayName = (textMode === 'full' || textMode === 'short')
                    ? d.toLocaleDateString('es', { weekday: 'short', timeZone: 'UTC' })
                    : d.toLocaleDateString('es', { weekday: 'narrow', timeZone: 'UTC' })
                  const dayNum = d.getUTCDate()
                  const showDayName = textMode === 'full' || textMode === 'short'
                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        'text-center px-0.5 rounded truncate font-semibold',
                        isSaturday && 'text-orange-500 bg-orange-50/60',
                        isSunday && 'text-red-500 bg-red-50/60',
                        isHoy && 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500',
                      )}
                    >
                      {showDayName ? `${dayName} ${dayNum}` : dayNum}
                      {isHoy && textMode === 'full' && (
                        <span className="ml-1 text-[9px] bg-blue-500 text-white rounded px-1 py-px leading-none">
                          Hoy
                        </span>
                      )}
                    </div>
                  )
                })}
                <div className="text-center">Util.</div>
              </div>

              {personasFiltradas.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  No hay personal en esta semana
                </div>
              )}

              {gruposPorDepartamento.map((grupo, grupoIdx) => {
                const deptStyle = DEPT_STYLES[grupoIdx % DEPT_STYLES.length]
                return (
                <div key={grupo.id} className="relative">
                  {/* Vertical dept label spanning the full group height */}
                  <div
                    className="absolute left-0 top-0 bottom-0 flex items-center justify-center overflow-hidden pointer-events-none"
                    style={{ width: 12, backgroundColor: deptStyle.stripe, writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                  >
                    <span className="text-[7px] font-bold uppercase tracking-widest text-white select-none whitespace-nowrap px-0.5">
                      {grupo.nombre}
                    </span>
                  </div>

                  <DndContext
                    sensors={sensors}
                    onDragEnd={(event) => handleDragEnd(grupo.id, event)}
                  >
                    <SortableContext
                      items={grupo.personas.map((p) => p.userId)}
                      strategy={verticalListSortingStrategy}
                    >
                      {grupo.personas.map((persona, personaIdx) => (
                        <SortablePersonaRow
                          key={persona.userId}
                          persona={persona}
                          deptStripeColor={deptStyle.stripe}
                          rowBgClass={personaIdx % 2 === 0 ? deptStyle.rowEven : deptStyle.rowOdd}
                          diasHeader={diasHeader}
                          proyectoFiltro={proyectoFiltro}
                          semanaInicio={semanaInicio}
                          hoyKey={hoyKey}
                          textMode={textMode}
                          gridCols={gridCols}
                          dragState={dragState}
                          dragHandleEnabled={dragHandleEnabled}
                          seleccionKeys={seleccionKeys}
                          seleccionRectKeys={seleccionRectKeys}
                          seleccionEnabled={seleccionEnabled}
                          colorOverrides={colorOverrides}
                          onCeldaMouseDown={handleCeldaMouseDown}
                          onClickEmpty={(fecha) => {
                            if (ctrlClickSuppressRef.current) {
                              ctrlClickSuppressRef.current = false
                              return
                            }
                            if (isReadOnly) return
                            if (seleccionState.type !== 'idle') {
                              setSeleccionState({ type: 'idle' })
                              return
                            }
                            setModalCelda({ userId: persona.userId, nombre: persona.nombre, fecha })
                          }}
                          onClickProyecto={(fecha, celda) => {
                            setSeleccionState({ type: 'idle' })
                            if (isReadOnly) {
                              setModalDetalle({ nombrePersona: persona.nombre, fecha, celda })
                            } else {
                              setModalCelda({ userId: persona.userId, nombre: persona.nombre, fecha, celda })
                            }
                          }}
                          onClickAusencia={(fecha, celda) => {
                            setSeleccionState({ type: 'idle' })
                            if (isReadOnly) {
                              setModalDetalle({ nombrePersona: persona.nombre, fecha, celda })
                            } else {
                              setModalAusencia(celda)
                            }
                          }}
                          onDragStart={handleDragStart}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                )
              })}

              {/* Fila resumen: total de personas asignadas por día */}
              {personasFiltradas.length > 0 && (
                <div
                  style={{ display: 'grid', gridTemplateColumns: gridCols }}
                  className="mt-1 border-t border-dashed pt-1.5 text-xs"
                >
                  <div />{/* dept stripe */}
                  <div className="px-3 py-1 font-semibold text-muted-foreground flex items-center gap-1">
                    <span>Total</span>
                  </div>
                  {resumenPorDia.map(({ dateKey, isSaturday, isSunday, total, conteoProyecto }) => (
                    <div
                      key={dateKey}
                      className={cn(
                        'text-center px-0.5 py-1 flex flex-col items-center gap-0.5',
                        isSaturday && 'bg-orange-50/60',
                        isSunday && 'bg-red-50/60',
                      )}
                    >
                      {total > 0 ? (
                        <>
                          <span className="font-bold text-foreground leading-none">{total}</span>
                          {Object.entries(conteoProyecto).map(([codigo, { count, color }]) => (
                            <span
                              key={codigo}
                              className="text-[9px] text-white rounded px-1 leading-tight whitespace-nowrap"
                              style={{ backgroundColor: color }}
                            >
                              {codigo}:{count}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  ))}
                  <div />{/* Util. col */}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 hidden md:flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded shadow-sm" style={{ backgroundColor: '#3B82F6' }} /> Proyecto
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{
                background:
                  'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 3px, #e5e7eb 3px, #e5e7eb 6px)',
              }}
            />{' '}
            Ausencia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 border border-white ring-1 ring-amber-300" />
            Excepcional
          </span>
          {data?.proyectos.map((p) => {
            const displayColor = colorOverrides[p.id] ?? p.color
            return (
              <Popover key={p.id}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                  >
                    <span
                      className="inline-block w-3.5 h-3.5 rounded shadow-sm ring-offset-background hover:ring-2 hover:ring-ring hover:ring-offset-1 transition-all"
                      style={{ backgroundColor: displayColor }}
                    />
                    [{p.codigo}] {p.nombre}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Color del proyecto</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {COLORES_PROYECTO.map((c) => (
                      <button
                        key={c}
                        title={c}
                        className={cn(
                          'w-6 h-6 rounded-md cursor-pointer transition-transform hover:scale-110 shadow-sm',
                          displayColor === c && 'ring-2 ring-offset-1 ring-foreground scale-110',
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => handleColorChange(p.id, c)}
                      />
                    ))}
                  </div>
                  {colorOverrides[p.id] && (
                    <button
                      className="mt-2 text-[10px] text-muted-foreground hover:text-foreground w-full text-center underline underline-offset-2"
                      onClick={() => handleColorChange(p.id, null)}
                    >
                      Restaurar automático
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
        </>)}

        {modalCelda && (
          <AsignacionCeldaModal
            open={true}
            onClose={() => setModalCelda(null)}
            onSaved={() => {
              setModalCelda(null)
              reload()
            }}
            userId={modalCelda.userId}
            userName={modalCelda.nombre}
            fecha={modalCelda.fecha}
            celdaExistente={modalCelda.celda}
          />
        )}

        <AusenciaDetailModal
          open={!!modalAusencia}
          onClose={() => setModalAusencia(null)}
          celda={modalAusencia}
        />

        <CeldaDetalleModal
          open={!!modalDetalle}
          onClose={() => setModalDetalle(null)}
          data={modalDetalle}
        />

        <CopiarSemanaModal
          open={showCopiarModal}
          onClose={() => {
            setShowCopiarModal(false)
            reload()
          }}
          semanaActual={semanaInicio}
          departamentoId={departamentosSeleccionados[0]}
        />

        <AsignacionMasivaModal
          open={modalMasivo}
          onClose={() => setModalMasivo(false)}
          onDone={() => {
            setSeleccionState({ type: 'idle' })
            reload()
          }}
          celdas={
            seleccionState.type === 'selected'
              ? Array.from(seleccionState.celdas).slice(0, 50).map((key) => {
                  const [userId, fecha] = key.split('|')
                  return { userId, fecha }
                })
              : []
          }
        />
      </div>

      {/* ── Floating selection action bar ──────────────────────────────────────── */}
      {seleccionState.type === 'selected' && seleccionState.celdas.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border shadow-lg rounded-full px-5 py-2.5 select-none">
          <span className="text-sm font-medium text-foreground">
            {Math.min(seleccionState.celdas.size, 50)} celda{seleccionState.celdas.size !== 1 ? 's' : ''} seleccionada{seleccionState.celdas.size !== 1 ? 's' : ''}
            {seleccionState.celdas.size > 50 && (
              <span className="ml-1.5 text-xs text-amber-600 font-normal">(máximo 50)</span>
            )}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={() => setModalMasivo(true)}
                disabled={seleccionState.celdas.size > 50}
              >
                Asignar a proyecto...
              </Button>
            </TooltipTrigger>
            {seleccionState.celdas.size > 50 && (
              <TooltipContent>Máximo 50 celdas por asignación</TooltipContent>
            )}
          </Tooltip>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSeleccionState({ type: 'idle' })}
          >
            Limpiar
          </Button>
        </div>
      )}
    </TooltipProvider>
  )
}
