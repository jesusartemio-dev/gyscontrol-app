/**
 * ProyectoGanttView - Vista Gantt con grid temporal, línea hoy, y 5 niveles
 * Usa el endpoint /cronograma/tree para una sola llamada API
 *
 * - Clic en una fila o barra: la selecciona (compartida con la vista Jerarquía).
 * - Ctrl + rueda del mouse: zoom.
 * - Arrastrar la barra de un EDT, actividad o tarea (si `editable`): la mueve en
 *   bloque con lo que contiene. El servidor convierte el desplazamiento a días
 *   laborables del calendario del proyecto (igual que editar la fecha de inicio).
 * - Las fechas se toman por día UTC (como la vista Jerarquía) y la duración es la
 *   misma que calcula el servidor: días laborables, contando inicio y fin.
 * - La columna de nombres queda fija a la izquierda al desplazar la línea de tiempo.
 * - El rango (1 mes, 3 meses…) define cuánto se ve a la vez; la línea de tiempo
 *   siempre cubre todo el proyecto y el resto se recorre con el scroll.
 * - Nivel, rango, zoom y filas abiertas se recuerdan por proyecto en este navegador.
 */

'use client'

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Calendar,
  ZoomIn,
  ZoomOut,
  Download,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  RefreshCw,
  LocateFixed,
  ChevronsUpDown,
  ChevronsDownUp
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { toast as sonnerToast } from 'sonner'
import { differenceInDays, addDays, addMonths, startOfMonth, startOfWeek, format, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface GanttItem {
  id: string
  nombre: string
  tipo: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea'
  fechaInicio: Date
  fechaFin: Date
  porcentajeAvance: number
  estado: string
  nivel: number
  padreId?: string
  hijos?: GanttItem[]
  color: string
  expandable: boolean
  expanded?: boolean
  horasEstimadas?: number
  /** Inicio guardado del propio nodo (antes del rollup de hijos). Base para mover la barra. */
  fechaInicioNodo?: string
  /** Días laborables (calendario del proyecto), los mismos que la columna DUR de Jerarquía. */
  duracionLaborable?: number
}

interface ProyectoGanttViewProps {
  proyectoId: string
  cronogramaId?: string
  onItemClick?: (item: GanttItem) => void
  /** Fila seleccionada (id de nodo, p. ej. "actividad-<uuid>"), compartida con Jerarquía. */
  selectedId?: string
  onSelect?: (id: string) => void
  /** Permite arrastrar barras de EDTs, actividades y tareas (cronograma no comercial ni bloqueado). */
  editable?: boolean
  /** Al cambiar, el Gantt se recarga (botón "Actualizar" general del cronograma). */
  refreshKey?: number
}

// Preferencias del Gantt guardadas por proyecto en el navegador (no en la BD).
interface GanttPrefs {
  filtroNivel?: string
  timeRangeMonths?: number
  zoomLevel?: number
  expandidos?: string[]
}
const prefsKey = (proyectoId: string) => `gantt-prefs:${proyectoId}`
const leerPrefs = (proyectoId: string): GanttPrefs => {
  try {
    if (typeof window === 'undefined') return {}
    return JSON.parse(window.localStorage.getItem(prefsKey(proyectoId)) || '{}') || {}
  } catch {
    return {}
  }
}
const guardarPrefs = (proyectoId: string, prefs: GanttPrefs) => {
  try {
    window.localStorage.setItem(prefsKey(proyectoId), JSON.stringify(prefs))
  } catch {
    // Sin almacenamiento (modo privado, cuota): las preferencias simplemente no se recuerdan.
  }
}

const aplanar = (list: GanttItem[], acc: GanttItem[] = []) => {
  for (const item of list) {
    acc.push(item)
    if (item.hijos) aplanar(item.hijos, acc)
  }
  return acc
}

// Píxeles mínimos de arrastre para que cuente como mover y no como clic.
const UMBRAL_ARRASTRE_PX = 4

// Día UTC de una fecha + n días, como "YYYY-MM-DD" (las fechas del cronograma
// se manejan por día UTC, igual que en el árbol).
const diaUTCMas = (fecha: string | Date, n: number) => {
  const d = new Date(fecha)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n)).toISOString().slice(0, 10)
}

// Fecha guardada → medianoche local del mismo día UTC. Así date-fns (que
// trabaja en hora local) ubica y muestra el mismo día que la vista Jerarquía;
// sin esto, una fecha a las 00:00 UTC aparecía el día anterior en Perú.
const diaLocalDesdeUTC = (v: string | Date) => {
  const d = new Date(v)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const TIPOS_ARRASTRABLES = ['edt', 'actividad', 'tarea']

const expandidosDe = (list: GanttItem[], acc = new Set<string>()) => {
  for (const item of list) {
    if (item.expanded) acc.add(item.id)
    if (item.hijos) expandidosDe(item.hijos, acc)
  }
  return acc
}

const TIPO_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  proyecto: { bar: '#2563eb', text: 'text-blue-600', bg: 'bg-blue-50' },
  fase: { bar: '#16a34a', text: 'text-green-600', bg: 'bg-green-50' },
  edt: { bar: '#d97706', text: 'text-amber-600', bg: 'bg-amber-50' },
  actividad: { bar: '#dc2626', text: 'text-red-600', bg: 'bg-red-50' },
  tarea: { bar: '#6b7280', text: 'text-gray-500', bg: 'bg-gray-50' },
}

const ROW_HEIGHT = 32
const NAME_COL_WIDTH = 280

export function ProyectoGanttView({ proyectoId, cronogramaId, onItemClick, selectedId, onSelect, editable = false, refreshKey }: ProyectoGanttViewProps) {
  const [prefsIniciales] = useState(() => leerPrefs(proyectoId))
  const [items, setItems] = useState<GanttItem[]>([])
  const itemsRef = useRef<GanttItem[]>([])
  itemsRef.current = items
  const [seleccionId, setSeleccionId] = useState<string | undefined>(selectedId)
  useEffect(() => { setSeleccionId(selectedId) }, [selectedId])
  const [arrastre, setArrastre] = useState<{ id: string; startX: number; dx: number } | null>(null)
  const [moviendoId, setMoviendoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(prefsIniciales.zoomLevel ?? 1)
  const [filtroNivel, setFiltroNivel] = useState<string>(prefsIniciales.filtroNivel ?? 'todos')
  const [timeRangeMonths, setTimeRangeMonths] = useState(prefsIniciales.timeRangeMonths ?? 3)
  const [containerWidth, setContainerWidth] = useState(0)
  const { toast } = useToast()
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollInicialHecho = useRef(false)

  // Measure available timeline width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width - NAME_COL_WIDTH)
    })
    ro.observe(el)
    return () => ro.disconnect()
    // La tarjeta con ref recién existe cuando termina de cargar; antes el ancho
    // nunca se medía y quedaba fijo en 8 px por día.
  }, [loading])

  // Load data from tree API (single call)
  // `silencioso`: recarga tras mover una barra, sin spinner y conservando lo expandido.
  const loadGanttData = useCallback(async (silencioso = false): Promise<GanttItem[] | undefined> => {
    // Recarga silenciosa: conserva lo abierto ahora. Carga normal: lo que quedó
    // guardado la última vez en este navegador (si hay).
    const guardados = leerPrefs(proyectoId).expandidos
    const expandidosPrevios = silencioso
      ? expandidosDe(itemsRef.current)
      : guardados ? new Set(guardados) : null
    try {
      if (!silencioso) setLoading(true)

      // Load project info
      const [proyectoRes, treeRes] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}`),
        fetch(`/api/proyectos/${proyectoId}/cronograma/tree${cronogramaId ? `?cronogramaId=${cronogramaId}` : ''}`)
      ])

      if (!proyectoRes.ok || !treeRes.ok) throw new Error('Error cargando datos')

      const proyectoData = (await proyectoRes.json()).data
      const treeData = await treeRes.json()
      const treeArray = treeData?.data?.tree || []

      // Convert tree nodes to GanttItems
      const processNode = (node: any, nivel: number, parentId?: string): GanttItem => {
        const data = node.data || {}
        const fechaInicio = data.fechaInicioPlan || data.fechaInicioComercial || data.fechaInicio
        const fechaFin = data.fechaFinPlan || data.fechaFinComercial || data.fechaFin

        const item: GanttItem = {
          id: node.id,
          nombre: node.nombre || 'Sin nombre',
          tipo: node.type || 'tarea',
          fechaInicio: diaLocalDesdeUTC(fechaInicio || new Date()),
          fechaFin: diaLocalDesdeUTC(fechaFin || new Date()),
          porcentajeAvance: node.metadata?.progressPercentage || 0,
          estado: node.metadata?.status || data.estado || 'pendiente',
          nivel,
          padreId: parentId,
          color: TIPO_COLORS[node.type]?.bar || '#6b7280',
          expandable: (node.children?.length || 0) > 0,
          expanded: expandidosPrevios ? expandidosPrevios.has(node.id) : nivel <= 1,
          horasEstimadas: data.horasEstimadas ? Number(data.horasEstimadas) : undefined,
          fechaInicioNodo: fechaInicio || undefined,
          duracionLaborable: typeof data.duracionDiasReal === 'number' ? data.duracionDiasReal : undefined,
          hijos: node.children?.map((child: any) => processNode(child, nivel + 1, node.id)) || []
        }

        // Calculate dates from children if the item has no dates
        if (item.hijos && item.hijos.length > 0) {
          const childStarts = item.hijos.map(c => c.fechaInicio.getTime()).filter(t => !isNaN(t))
          const childEnds = item.hijos.map(c => c.fechaFin.getTime()).filter(t => !isNaN(t))
          if (childStarts.length > 0) item.fechaInicio = new Date(Math.min(...childStarts))
          if (childEnds.length > 0) item.fechaFin = new Date(Math.max(...childEnds))
        }

        // Calculate hours from children
        if (!item.horasEstimadas && item.hijos && item.hijos.length > 0) {
          const sum = item.hijos.reduce((acc, c) => acc + (c.horasEstimadas || 0), 0)
          if (sum > 0) item.horasEstimadas = sum
        }

        return item
      }

      // Tree API returns [projectNode] with children (fases)
      // Process the project node directly at level 0
      const projectNode = treeArray[0]
      if (projectNode) {
        const proyectoItem = processNode(projectNode, 0)
        proyectoItem.expanded = true
        setItems([proyectoItem])
        return [proyectoItem]
      } else {
        setItems([])
      }
    } catch (error) {
      toast({ title: 'Error cargando Gantt', description: String(error), variant: 'destructive' })
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [proyectoId, cronogramaId])

  useEffect(() => { loadGanttData() }, [loadGanttData])

  // Recarga solo el Gantt, sin spinner y conservando filas abiertas, zoom y scroll.
  const recargar = useCallback(async () => {
    setRecargando(true)
    try {
      await loadGanttData(true)
    } finally {
      setRecargando(false)
    }
  }, [loadGanttData])

  // El "Actualizar" general del cronograma también refresca el Gantt.
  const primerRefreshKey = useRef(true)
  useEffect(() => {
    if (primerRefreshKey.current) { primerRefreshKey.current = false; return }
    recargar()
  }, [refreshKey])

  // Recordar nivel, rango, zoom y filas abiertas para este proyecto.
  useEffect(() => {
    if (loading || items.length === 0) return
    guardarPrefs(proyectoId, { filtroNivel, timeRangeMonths, zoomLevel, expandidos: [...expandidosDe(items)] })
  }, [proyectoId, filtroNivel, timeRangeMonths, zoomLevel, items, loading])

  // Abrir o cerrar todos los niveles (cerrar deja visible solo el proyecto y sus fases).
  const expandirTodo = (abrir: boolean) => {
    const update = (list: GanttItem[]): GanttItem[] =>
      list.map(item => ({
        ...item,
        expanded: abrir ? item.expandable : item.nivel === 0,
        hijos: item.hijos ? update(item.hijos) : item.hijos,
      }))
    setItems(update)
  }

  const seleccionar = (item: GanttItem) => {
    setSeleccionId(item.id)
    onSelect?.(item.id)
    onItemClick?.(item)
  }

  // Ctrl + rueda = zoom. Listener nativo no pasivo: con el de React no se puede
  // evitar el zoom del navegador. Se engancha cuando ya existe la tarjeta.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoomLevel(prev => e.deltaY < 0 ? Math.min(4, prev * 1.15) : Math.max(0.3, prev / 1.15))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [loading])

  // Mueve un EDT/actividad/tarea `dias` días (calendario) según donde se soltó
  // la barra. El servidor lo convierte a días laborables y corre lo de adentro.
  const moverNodo = async (item: GanttItem, dias: number) => {
    const base = item.fechaInicioNodo || item.fechaInicio.toISOString()
    const nuevoInicio = diaUTCMas(base, dias)
    const inicioAnterior = diaUTCMas(base, 0)
    const guardar = (fecha: string) =>
      fetch(`/api/proyectos/${proyectoId}/cronograma/tree/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaInicioComercial: fecha }),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo mover')
      })

    const buscar = (list: GanttItem[] | undefined): GanttItem | undefined => {
      for (const i of list || []) {
        if (i.id === item.id) return i
        const enHijos = buscar(i.hijos)
        if (enHijos) return enHijos
      }
    }

    setMoviendoId(item.id)
    try {
      await guardar(nuevoInicio)
      const recargados = await loadGanttData(true)
      // La fecha real puede diferir de donde se soltó (fines de semana, feriados).
      const inicioReal = buscar(recargados)?.fechaInicioNodo ?? `${nuevoInicio}T00:00:00Z`
      const fechaTexto = new Date(inicioReal).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
      sonnerToast.success(`"${item.nombre}" ahora empieza el ${fechaTexto}`, {
        description: item.tipo === 'tarea'
          ? 'Conserva su duración en días laborables.'
          : 'Lo que contiene se movió en bloque según el calendario laboral.',
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              await guardar(inicioAnterior)
              await loadGanttData(true)
              sonnerToast.success('Movimiento deshecho')
            } catch (e) {
              sonnerToast.error(e instanceof Error ? e.message : 'No se pudo deshacer')
            }
          },
        },
      })
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'No se pudo mover')
    } finally {
      setMoviendoId(null)
    }
  }

  const puedeArrastrar = (item: GanttItem) => editable && TIPOS_ARRASTRABLES.includes(item.tipo) && !moviendoId

  // Toggle expanded state
  const toggleExpanded = (itemId: string) => {
    const update = (list: GanttItem[]): GanttItem[] =>
      list.map(item => {
        if (item.id === itemId) return { ...item, expanded: !item.expanded }
        if (item.hijos) return { ...item, hijos: update(item.hijos) }
        return item
      })
    setItems(update)
  }

  // Flatten visible items
  const visibleItems = useMemo(() => {
    const result: GanttItem[] = []
    const walk = (list: GanttItem[]) => {
      for (const item of list) {
        if (filtroNivel !== 'todos' && item.tipo !== filtroNivel && item.tipo !== 'proyecto') continue
        result.push(item)
        if (item.expanded && item.hijos) walk(item.hijos)
      }
    }
    walk(items)
    return result
  }, [items, filtroNivel])

  // Timeline configuration
  const timeline = useMemo(() => {
    if (visibleItems.length === 0) return null

    // La línea de tiempo cubre siempre todo el proyecto (no solo lo visible ni
    // solo el rango elegido), alineada a meses completos.
    const allDates = aplanar(items).flatMap(i => [i.fechaInicio, i.fechaFin]).filter(d => !isNaN(d.getTime()))
    if (allDates.length === 0) return null

    const projectMinDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const projectMaxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    const minDate = startOfMonth(projectMinDate)
    const maxDate = startOfMonth(addMonths(projectMaxDate, 1))

    // El rango define cuántos días entran en el ancho visible; "Completo" = todo el proyecto.
    const totalDays = differenceInDays(maxDate, minDate) || 1
    const diasEnPantalla = timeRangeMonths === 0 ? totalDays : timeRangeMonths * 30.44
    const baseDayWidth = containerWidth > 0 ? containerWidth / diasEnPantalla : 8
    const dayWidth = Math.max(2, baseDayWidth * zoomLevel)
    const totalWidth = totalDays * dayWidth

    // Generate month columns
    const months: { date: Date; label: string; x: number; width: number }[] = []
    let d = new Date(minDate)
    while (d < maxDate) {
      const nextMonth = startOfMonth(addMonths(d, 1))
      const endOfRange = nextMonth > maxDate ? maxDate : nextMonth
      const startDay = differenceInDays(d, minDate)
      const daysInRange = differenceInDays(endOfRange, d)
      months.push({
        date: new Date(d),
        label: format(d, 'MMM yyyy', { locale: es }),
        x: startDay * dayWidth,
        width: daysInRange * dayWidth,
      })
      d = nextMonth
    }

    // Generate week lines
    const weekLines: number[] = []
    let weekStart = startOfWeek(minDate, { weekStartsOn: 1 })
    while (weekStart < maxDate) {
      const day = differenceInDays(weekStart, minDate)
      if (day > 0) weekLines.push(day * dayWidth)
      weekStart = addDays(weekStart, 7)
    }

    // Today line
    const today = new Date()
    const todayX = differenceInDays(today, minDate) * dayWidth
    const showToday = today >= minDate && today <= maxDate

    return { minDate, maxDate, totalDays, dayWidth, totalWidth, months, weekLines, todayX, showToday }
  }, [items, visibleItems, zoomLevel, timeRangeMonths, containerWidth])

  // Desplaza la línea de tiempo para que `x` quede cerca del inicio del área visible.
  const irAX = useCallback((x: number, suave = true) => {
    const el = bodyScrollRef.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, x - containerWidth / 4), behavior: suave ? 'smooth' : 'auto' })
  }, [containerWidth])

  const irAHoy = () => {
    if (timeline?.showToday) irAX(timeline.todayX)
    else sonnerToast.info('Hoy está fuera del rango del cronograma')
  }

  // Al abrir: ir a la fila seleccionada (si hay) o a hoy.
  useEffect(() => {
    if (scrollInicialHecho.current || !timeline || containerWidth <= 0) return
    scrollInicialHecho.current = true
    const sel = visibleItems.find(i => i.id === seleccionId)
    if (sel) irAX(differenceInDays(sel.fechaInicio, timeline.minDate) * timeline.dayWidth, false)
    else if (timeline.showToday) irAX(timeline.todayX, false)
  }, [timeline, containerWidth])

  // Al cambiar zoom o rango, mantener centrado el mismo día en pantalla.
  const anchoDiaPrevio = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = bodyScrollRef.current
    const nuevo = timeline?.dayWidth
    if (el && nuevo && anchoDiaPrevio.current && anchoDiaPrevio.current !== nuevo) {
      const centroDia = (el.scrollLeft + containerWidth / 2) / anchoDiaPrevio.current
      el.scrollLeft = Math.max(0, centroDia * nuevo - containerWidth / 2)
    }
    anchoDiaPrevio.current = nuevo ?? null
  }, [timeline?.dayWidth])

  // Export CSV
  const exportToCSV = () => {
    if (!visibleItems.length) return
    const csvData: string[][] = [['Nivel', 'Tipo', 'Nombre', 'Inicio', 'Fin', 'Horas', 'Progreso %', 'Estado']]
    const walk = (list: GanttItem[]) => {
      for (const item of list) {
        csvData.push([
          String(item.nivel),
          item.tipo,
          item.nombre,
          format(item.fechaInicio, 'dd/MM/yyyy'),
          format(item.fechaFin, 'dd/MM/yyyy'),
          String(item.horasEstimadas || ''),
          String(item.porcentajeAvance),
          item.estado,
        ])
        if (item.expanded && item.hijos) walk(item.hijos)
      }
    }
    walk(items)
    const content = csvData.map(row => row.map(v => v.includes(',') ? `"${v}"` : v).join(',')).join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `gantt-${proyectoId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: 'CSV exportado', description: `${csvData.length - 1} filas` })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Cargando Gantt...</span>
        </CardContent>
      </Card>
    )
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay datos para mostrar en el diagrama de Gantt</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold">Diagrama de Gantt</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {visibleItems.length} items
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Select value={filtroNivel} onValueChange={setFiltroNivel}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los niveles</SelectItem>
              <SelectItem value="fase">Solo fases</SelectItem>
              <SelectItem value="edt">Solo EDTs</SelectItem>
              <SelectItem value="actividad">Solo actividades</SelectItem>
              <SelectItem value="tarea">Solo tareas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRangeMonths.toString()} onValueChange={(v) => setTimeRangeMonths(parseInt(v))}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Completo</SelectItem>
              <SelectItem value="1">1 mes</SelectItem>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">1 año</SelectItem>
              <SelectItem value="24">2 años</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-4 bg-gray-200" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(prev => Math.max(0.3, prev / 1.4))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(prev => Math.min(4, prev * 1.4))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(1)} title="Zoom al 100%">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-gray-200" />

          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={irAHoy} title="Ir a hoy">
            <LocateFixed className="h-3.5 w-3.5 mr-1" />
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => expandirTodo(true)} title="Abrir todo">
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => expandirTodo(false)} title="Cerrar todo">
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={recargar} disabled={recargando} title="Recargar solo el Gantt">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${recargando ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <div className="w-px h-4 bg-gray-200" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportToCSV} title="Exportar CSV">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Encabezado y filas comparten un solo scroll horizontal; la columna de
            nombres es sticky, así queda visible al recorrer la línea de tiempo. */}
        <div className="overflow-x-auto" ref={bodyScrollRef}>
          <div style={{ width: NAME_COL_WIDTH + timeline.totalWidth, minWidth: '100%' }}>
          {/* Header row: name col + timeline months */}
          <div className="flex border-b bg-white">
            <div
              className="sticky left-0 z-40 flex-shrink-0 border-r border-gray-200 bg-gray-50 px-2 py-1.5"
              style={{ width: NAME_COL_WIDTH }}
            >
              <span className="text-xs font-medium text-gray-600">Elemento</span>
            </div>
            <div className="flex flex-shrink-0" style={{ width: timeline.totalWidth }}>
              {timeline.months.map((m, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 border-r border-gray-200 px-1.5 py-1.5 text-center ${isSameMonth(m.date, new Date()) ? 'bg-blue-50' : 'bg-gray-50'}`}
                  style={{ width: m.width }}
                >
                  <span className="text-[10px] font-medium text-gray-600 uppercase">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex">
            {/* Name column (fija a la izquierda; fondos opacos para tapar las barras al pasar debajo) */}
            <div
              className="sticky left-0 z-40 flex-shrink-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]"
              style={{ width: NAME_COL_WIDTH }}
            >
              {visibleItems.map((item) => {
                const colors = TIPO_COLORS[item.tipo] || TIPO_COLORS.tarea
                return (
                  <div
                    key={item.id}
                    className={`flex items-center border-b border-gray-100 cursor-pointer ${
                      item.id === seleccionId
                        ? 'bg-blue-100 shadow-[inset_4px_0_0_0_#2563eb]'
                        : `hover:bg-blue-50 ${item.nivel === 0 ? 'bg-slate-50' : 'bg-white'}`
                    }`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => seleccionar(item)}
                  >
                    <div
                      className="flex items-center gap-1 px-2 w-full min-w-0"
                      style={{ paddingLeft: item.nivel * 16 + 8 }}
                    >
                      {/* Expand toggle */}
                      <div className="w-4 flex-shrink-0">
                        {item.expandable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id) }}
                          >
                            {item.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                      {/* Color dot + name */}
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className={`text-xs truncate ${item.nivel === 0 ? 'font-semibold' : item.nivel === 1 ? 'font-medium' : ''}`}>
                        {item.nombre}
                      </span>
                      <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-3.5 flex-shrink-0 ${colors.text} border-current/30`}>
                        {item.tipo}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Timeline bars */}
            <div className="relative flex-shrink-0" style={{ width: timeline.totalWidth, height: visibleItems.length * ROW_HEIGHT }}>
              {/* Franja de la fila seleccionada, a lo ancho de la línea de tiempo */}
              {(() => {
                const idx = visibleItems.findIndex(i => i.id === seleccionId)
                return idx >= 0 ? (
                  <div
                    className="absolute left-0 right-0 bg-blue-200/50 pointer-events-none"
                    style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
                  />
                ) : null
              })()}

              {/* Week grid lines */}
              {timeline.weekLines.map((x, i) => (
                <div
                  key={`wk-${i}`}
                  className="absolute top-0 bottom-0 border-l border-gray-100"
                  style={{ left: x }}
                />
              ))}

              {/* Month grid lines */}
              {timeline.months.map((m, i) => (
                <div
                  key={`mo-${i}`}
                  className="absolute top-0 bottom-0 border-l border-gray-300"
                  style={{ left: m.x }}
                />
              ))}

              {/* Today line */}
              {timeline.showToday && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: timeline.todayX }}
                  title={`Hoy: ${format(new Date(), 'dd MMM yyyy', { locale: es })}`}
                >
                  <div className="absolute -top-0 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[7px] text-white font-bold">H</span>
                  </div>
                </div>
              )}

              {/* Bars */}
              {visibleItems.map((item, rowIdx) => {
                const startDay = differenceInDays(item.fechaInicio, timeline.minDate)
                // Días de calendario que ocupa la barra, contando inicio y fin (02→03 = 2 días).
                const diasCalendario = Math.max(1, differenceInDays(item.fechaFin, item.fechaInicio) + 1)
                // Duración mostrada: días laborables, igual que la columna DUR de Jerarquía.
                const durationDays = item.duracionLaborable ?? diasCalendario
                const barLeft = startDay * timeline.dayWidth
                const barWidth = Math.max(diasCalendario * timeline.dayWidth, 20)
                const colors = TIPO_COLORS[item.tipo] || TIPO_COLORS.tarea
                const labelText = `${durationDays}d${item.horasEstimadas ? ` · ${item.horasEstimadas}h` : ''}`
                const labelFitsInside = barWidth > 60
                const arrastrable = puedeArrastrar(item)
                const enArrastre = arrastre?.id === item.id
                const diasArrastre = enArrastre ? Math.round(arrastre.dx / timeline.dayWidth) : 0

                return (
                  <TooltipProvider key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`absolute group select-none touch-none ${
                            arrastrable ? (enArrastre ? 'cursor-grabbing z-30' : 'cursor-grab') : 'cursor-pointer'
                          } ${enArrastre ? 'opacity-90' : 'hover:opacity-80 transition-opacity'} ${
                            moviendoId === item.id ? 'animate-pulse' : ''
                          }`}
                          style={{
                            top: rowIdx * ROW_HEIGHT + 6,
                            left: barLeft,
                            height: ROW_HEIGHT - 12,
                            transform: enArrastre ? `translateX(${arrastre.dx}px)` : undefined,
                          }}
                          onClick={() => seleccionar(item)}
                          onPointerDown={(e) => {
                            if (!arrastrable || e.button !== 0) return
                            e.currentTarget.setPointerCapture(e.pointerId)
                            setArrastre({ id: item.id, startX: e.clientX, dx: 0 })
                          }}
                          onPointerMove={(e) => {
                            if (!enArrastre) return
                            setArrastre({ ...arrastre, dx: e.clientX - arrastre.startX })
                          }}
                          onPointerUp={() => {
                            if (!enArrastre) return
                            const { dx } = arrastre
                            setArrastre(null)
                            if (Math.abs(dx) < UMBRAL_ARRASTRE_PX) return // fue un clic
                            const dias = Math.round(dx / timeline.dayWidth)
                            if (dias !== 0) moverNodo(item, dias)
                          }}
                          onPointerCancel={() => setArrastre(null)}
                        >
                          {/* Fecha destino mientras se arrastra */}
                          {enArrastre && Math.abs(arrastre.dx) >= UMBRAL_ARRASTRE_PX && (
                            <div className="absolute -top-5 left-0 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                              {diasArrastre === 0
                                ? 'Sin cambio'
                                : `Inicio: ${new Date(`${diaUTCMas(item.fechaInicioNodo || item.fechaInicio, diasArrastre)}T12:00:00Z`)
                                    .toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })}`}
                            </div>
                          )}
                          {/* Bar background */}
                          <div
                            className="absolute top-0 left-0 h-full rounded shadow-sm"
                            style={{ width: barWidth, backgroundColor: item.color + '40', border: `1px solid ${item.color}80` }}
                          />
                          {/* Progress fill */}
                          <div
                            className="absolute left-0 top-0 h-full rounded-l"
                            style={{ width: `${(item.porcentajeAvance / 100) * barWidth}px`, backgroundColor: item.color + 'A0' }}
                          />
                          {/* Label - inside bar if fits, outside to the right if not */}
                          <div
                            className="absolute top-0 h-full flex items-center whitespace-nowrap"
                            style={{ left: labelFitsInside ? 0 : barWidth + 4, paddingLeft: labelFitsInside ? 6 : 0 }}
                          >
                            <span className="text-[10px] font-medium" style={{ color: item.color }}>
                              {labelText}
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      {/* Durante el arrastre se oculta el tooltip para que no tape el destino */}
                      {!enArrastre && moviendoId !== item.id && (
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">{item.nombre}</div>
                            <div>{format(item.fechaInicio, 'dd MMM yyyy', { locale: es })} → {format(item.fechaFin, 'dd MMM yyyy', { locale: es })}</div>
                            <div>{durationDays} días laborables{item.horasEstimadas ? ` · ${item.horasEstimadas}h` : ''} · {item.porcentajeAvance}%</div>
                            {arrastrable && <div className="text-muted-foreground">Arrastra la barra para moverla{item.tipo === 'tarea' ? '' : ' con lo que contiene'}</div>}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </div>
          </div>
        </div>

        {/* Footer legend */}
        <div className="border-t px-3 py-1.5 bg-gray-50/50">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            {Object.entries(TIPO_COLORS).map(([tipo, c]) => (
              <div key={tipo} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c.bar }} />
                <span className="capitalize">{tipo}</span>
              </div>
            ))}
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-red-500" />
              <span>Hoy</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
