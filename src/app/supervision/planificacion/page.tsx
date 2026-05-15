'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Copy, GripVertical, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import AusenciaDetailModal from '@/components/planificacion/AusenciaDetailModal'
import CopiarSemanaModal from '@/components/planificacion/CopiarSemanaModal'
import { abreviarCargo, abreviarNombre } from '@/lib/planificacion/format'

const DEPT_ORDER = ['INGENIERIA', 'CONSTRUCCION', 'GESTION', 'PROYECTOS']
const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']
const GRID_COLS = 'grid-cols-[260px_repeat(7,1fr)_70px]'

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
  semana: { inicio: string; fin: string; isoWeek: string }
  departamento: { id: string; nombre: string } | null
  personas: PersonaEntry[]
  proyectos: Array<{ id: string; codigo: string; nombre: string; color: string }>
}

interface Departamento {
  id: string
  nombre: string
}

type DiaHeader = { dateKey: string; d: Date; isHoy: boolean; isWeekend: boolean }

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

function CeldaDia({
  celda,
  dimmed,
  isWeekend,
  onClickEmpty,
  onClickProyecto,
  onClickAusencia,
}: {
  celda: CeldaEntry[]
  dimmed: boolean
  isWeekend: boolean
  onClickEmpty: () => void
  onClickProyecto: () => void
  onClickAusencia: () => void
}) {
  if (!celda || celda.length === 0) {
    return (
      <div
        className="group relative flex items-center justify-center h-full border border-dashed border-transparent hover:border-border cursor-pointer rounded"
        onClick={onClickEmpty}
      >
        <span className="text-muted-foreground/30 group-hover:text-muted-foreground text-lg font-light">+</span>
      </div>
    )
  }

  const c = celda[0]

  if (c.tipo === 'ausencia') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative flex items-center justify-center h-full rounded cursor-pointer text-xs font-medium',
              dimmed && 'opacity-30',
              isWeekend && c.esExcepcional && 'border border-dashed border-gray-400',
            )}
            style={{ background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)' }}
            onClick={onClickAusencia}
          >
            <span className="bg-white/80 rounded px-1">{c.ausencia?.codigo ?? 'AUS'}</span>
            {c.esExcepcional && (
              <span className="absolute top-0.5 right-0.5 text-[9px]">⏰</span>
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'relative flex items-center justify-center h-full rounded cursor-pointer text-xs font-semibold px-1',
            dimmed && 'opacity-30',
            isWeekend && c.esExcepcional && 'border-dashed',
          )}
          style={{
            backgroundColor: color + '33',
            border: isWeekend && c.esExcepcional
              ? `1px dashed ${color}88`
              : `1px solid ${color}66`,
            color,
          }}
          onClick={onClickProyecto}
        >
          <span className="truncate">{c.proyecto?.codigo}</span>
          {c.esExcepcional && <span className="absolute top-0.5 right-0.5 text-[9px]">⏰</span>}
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

function SortablePersonaRow({
  persona,
  diasHeader,
  proyectoFiltro,
  semanaInicio,
  hoyKey,
  onClickEmpty,
  onClickProyecto,
  onClickAusencia,
}: {
  persona: PersonaEntry
  diasHeader: DiaHeader[]
  proyectoFiltro: string
  semanaInicio: string
  hoyKey: string
  onClickEmpty: (fecha: string) => void
  onClickProyecto: (fecha: string, celda: CeldaEntry) => void
  onClickAusencia: (celda: CeldaEntry) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: persona.userId,
  })

  const style = {
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
      className={cn('grid h-10 border-b hover:bg-muted/20 items-center', GRID_COLS)}
    >
      <div className="flex items-center gap-1 px-2 overflow-hidden">
        <button
          {...attributes}
          {...listeners}
          tabIndex={-1}
          className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
          {persona.iniciales}
        </div>
        <div className="min-w-0 ml-1">
          <p className="text-sm font-medium truncate leading-none">{abreviarNombre(persona.nombre)}</p>
          {persona.cargo && (
            <p className="text-xs text-muted-foreground truncate">{abreviarCargo(persona.cargo)}</p>
          )}
        </div>
      </div>

      {diasHeader.map(({ dateKey, d, isHoy, isWeekend }) => {
        const celdasDia = persona.dias[dateKey] ?? []
        const dimmed =
          proyectoFiltro !== '__all__' &&
          celdasDia.length > 0 &&
          !celdasDia.some((c) => c.proyecto?.id === proyectoFiltro)
        return (
          <div
            key={dateKey}
            className={cn(
              'h-full px-0.5 py-1',
              isWeekend && 'bg-muted/40',
              isHoy && 'border-l-2 border-blue-500',
            )}
          >
            <CeldaDia
              celda={celdasDia}
              dimmed={dimmed}
              isWeekend={isWeekend}
              onClickEmpty={() => onClickEmpty(dateKey)}
              onClickProyecto={() => onClickProyecto(dateKey, celdasDia[0])}
              onClickAusencia={() => onClickAusencia(celdasDia[0])}
            />
          </div>
        )
      })}

      <div className="flex items-center justify-center">
        <UtilBadge util={persona.utilizacion} semanaInicio={semanaInicio} hoyKey={hoyKey} />
      </div>
    </div>
  )
}

export default function PlanificacionPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  const [semanaInicio, setSemanaInicio] = useState<string>(currentMondayUTC)
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState<string[]>([])
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('__all__')
  const [busqueda, setBusqueda] = useState('')
  const [data, setData] = useState<SemanaResponse | null>(null)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [personOrder, setPersonOrder] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  const [modalCelda, setModalCelda] = useState<{
    userId: string
    nombre: string
    fecha: string
    celda?: CeldaEntry
  } | null>(null)
  const [modalAusencia, setModalAusencia] = useState<CeldaEntry | null>(null)
  const [showCopiarModal, setShowCopiarModal] = useState(false)

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
    if (!semanaInicio) return
    setLoading(true)
    const params = new URLSearchParams({ inicio: semanaInicio })
    if (departamentosSeleccionados.length > 0) {
      params.set('departamentos', departamentosSeleccionados.join(','))
    }
    fetch(`/api/planificacion/semana?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Error al cargar planificación'))
      .finally(() => setLoading(false))
  }, [semanaInicio, departamentosSeleccionados])

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
      (p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
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
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semanaInicio + 'T00:00:00.000Z')
      d.setUTCDate(d.getUTCDate() + i)
      const dateKey = d.toISOString().slice(0, 10)
      const utcDay = d.getUTCDay()
      return {
        dateKey,
        d,
        isHoy: dateKey === hoyKey,
        isWeekend: utcDay === 0 || utcDay === 6,
      }
    })
  }, [semanaInicio, hoyKey])

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
    const params = new URLSearchParams({ inicio: semanaInicio })
    if (departamentosSeleccionados.length > 0) {
      params.set('departamentos', departamentosSeleccionados.join(','))
    }
    fetch(`/api/planificacion/semana?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Error al cargar planificación'))
      .finally(() => setLoading(false))
  }, [semanaInicio, departamentosSeleccionados])

  if (role && !ROLES_PERMITIDOS.includes(role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tienes acceso a esta sección.</p>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Planificación de personal</h1>
            <p className="text-sm text-muted-foreground">
              Semana {data?.semana.isoWeek ?? '…'} · {formatDateRange(semanaInicio)}
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowCopiarModal(true)}>
            <Copy className="mr-2 h-4 w-4" /> Copiar semana
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setSemanaInicio(addWeeks(semanaInicio, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSemanaInicio(hoy)}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSemanaInicio(addWeeks(semanaInicio, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Input
            placeholder="Buscar persona..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-48 h-9"
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

        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Cargando planificación...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              {/* Header de días */}
              <div className={cn('grid text-xs font-medium text-muted-foreground border-b mb-0.5 pb-1', GRID_COLS)}>
                <div className="px-3">Persona</div>
                {diasHeader.map(({ dateKey, d, isHoy, isWeekend }) => {
                  const dayName = d.toLocaleDateString('es', { weekday: 'short', timeZone: 'UTC' })
                  const dayNum = d.getUTCDate()
                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        'text-center px-0.5 rounded',
                        isWeekend && 'text-muted-foreground',
                        isHoy && 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500',
                      )}
                    >
                      {dayName} {dayNum}
                      {isHoy && (
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

              {gruposPorDepartamento.map((grupo) => (
                <div key={grupo.id}>
                  <div className={cn('grid h-7 bg-muted/50 border-b border-t items-center', GRID_COLS)}>
                    <div className="px-3 col-span-9 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      {grupo.nombre}
                    </div>
                  </div>

                  <DndContext
                    sensors={sensors}
                    onDragEnd={(event) => handleDragEnd(grupo.id, event)}
                  >
                    <SortableContext
                      items={grupo.personas.map((p) => p.userId)}
                      strategy={verticalListSortingStrategy}
                    >
                      {grupo.personas.map((persona) => (
                        <SortablePersonaRow
                          key={persona.userId}
                          persona={persona}
                          diasHeader={diasHeader}
                          proyectoFiltro={proyectoFiltro}
                          semanaInicio={semanaInicio}
                          hoyKey={hoyKey}
                          onClickEmpty={(fecha) =>
                            setModalCelda({ userId: persona.userId, nombre: persona.nombre, fecha })
                          }
                          onClickProyecto={(fecha, celda) =>
                            setModalCelda({ userId: persona.userId, nombre: persona.nombre, fecha, celda })
                          }
                          onClickAusencia={(celda) => setModalAusencia(celda)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#3B82F666' }} /> Proyecto
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
          <span className="flex items-center gap-1">⏰ Excepcional</span>
          {data?.proyectos.map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: p.color + '88' }} />
              [{p.codigo}] {p.nombre}
            </span>
          ))}
        </div>

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

        <CopiarSemanaModal
          open={showCopiarModal}
          onClose={() => {
            setShowCopiarModal(false)
            reload()
          }}
          semanaActual={semanaInicio}
          departamentoId={departamentosSeleccionados[0]}
        />
      </div>
    </TooltipProvider>
  )
}
