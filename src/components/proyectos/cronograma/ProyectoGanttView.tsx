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
  ChevronsDownUp,
  Link2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { toast as sonnerToast } from 'sonner'
import { differenceInDays, differenceInCalendarDays, addDays, addMonths, startOfMonth, startOfWeek, format, isSameMonth } from 'date-fns'
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
  /** Duración por horas laborables como la columna DUR ("4h", "1.5d"). */
  duracionTexto?: string
  /** Hito ◆ (Milestone de MS Project): se dibuja como rombo en su fecha. */
  esHito?: boolean
  /** Fecha comprometida del hito (Deadline); se marca en su fila. */
  fechaLimite?: Date
  /** Días laborables que el hito pasa su fecha límite (0 = a tiempo). */
  diasPasadoLimite?: number
  /** Predecesoras guardadas (solo tareas); horasIncumplidas > 0 = no se cumple. */
  predecesoras?: { tareaId: string; nombre: string; tipo: string; tipoTexto?: string; horasIncumplidas?: number }[]
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
  anchoNombres?: number
  densidad?: Densidad
  mostrarDependencias?: boolean
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

// Igual, pero conservando la hora de obra (las fechas guardan la hora tal cual
// en obra en los campos UTC). Se usa para ubicar las barras por hora.
const horaLocalDesdeUTC = (v: string | Date) => {
  const d = new Date(v)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes())
}

const aMinutos = (hhmm: string | undefined, porDefecto: number) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : porDefecto
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

// Densidad de filas: "normal" o "compacta" (más filas en pantalla). En ambas
// el nombre cabe en 2 líneas; en compacta con letra y barra más bajas.
type Densidad = 'normal' | 'compacta'
const DENSIDADES: Record<Densidad, { fila: number; margenBarra: number; texto: string }> = {
  normal: { fila: 32, margenBarra: 6, texto: 'text-[11px] leading-[13px]' },
  compacta: { fila: 22, margenBarra: 4, texto: 'text-[10px] leading-[10px]' },
}

// Fondo alternado por fila (opaco: la columna de nombres tapa las barras al pasar debajo).
const fondoFila = (idx: number) => (idx % 2 === 1 ? 'bg-gray-50' : 'bg-white')
// Ancho de la columna de nombres: ajustable arrastrando su borde derecho y
// recordado por proyecto. Límites para que no tape la línea de tiempo.
const ANCHO_NOMBRES_DEFECTO = 340
const ANCHO_NOMBRES_MIN = 220
const ANCHO_NOMBRES_MAX = 640

export function ProyectoGanttView({ proyectoId, cronogramaId, onItemClick, selectedId, onSelect, editable = false, refreshKey }: ProyectoGanttViewProps) {
  const [prefsIniciales] = useState(() => leerPrefs(proyectoId))
  const [items, setItems] = useState<GanttItem[]>([])
  const itemsRef = useRef<GanttItem[]>([])
  itemsRef.current = items
  const [seleccionId, setSeleccionId] = useState<string | undefined>(selectedId)
  useEffect(() => { setSeleccionId(selectedId) }, [selectedId])
  const [arrastre, setArrastre] = useState<{ id: string; startX: number; dx: number } | null>(null)
  const [moviendoId, setMoviendoId] = useState<string | null>(null)
  // Jornada del calendario (minutos desde 00:00): las horas de cada día se
  // reparten en el ancho de su celda — un día completo la llena, 4 h algo menos de la mitad.
  const [jornada, setJornada] = useState({ ini: 8 * 60, fin: 18 * 60 + 30 })
  const [loading, setLoading] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(prefsIniciales.zoomLevel ?? 1)
  const [filtroNivel, setFiltroNivel] = useState<string>(prefsIniciales.filtroNivel ?? 'todos')
  const [timeRangeMonths, setTimeRangeMonths] = useState(prefsIniciales.timeRangeMonths ?? 3)
  const [anchoCard, setAnchoCard] = useState(0)
  const [anchoNombres, setAnchoNombres] = useState(prefsIniciales.anchoNombres ?? ANCHO_NOMBRES_DEFECTO)
  const [densidad, setDensidad] = useState<Densidad>(prefsIniciales.densidad ?? 'normal')
  const [mostrarDependencias, setMostrarDependencias] = useState(prefsIniciales.mostrarDependencias ?? true)
  // Fila bajo el mouse (índice en visibleItems), compartida entre nombres y barras.
  const [filaHover, setFilaHover] = useState<number | null>(null)
  const { fila: ROW_HEIGHT, margenBarra: MARGEN_BARRA, texto: claseTextoNombre } = DENSIDADES[densidad]
  // Ancho visible para la línea de tiempo (tarjeta menos la columna de nombres).
  const containerWidth = anchoCard > 0 ? Math.max(0, anchoCard - anchoNombres) : 0
  const { toast } = useToast()
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollInicialHecho = useRef(false)

  // Measure available timeline width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setAnchoCard(entry.contentRect.width)
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
          fechaInicio: horaLocalDesdeUTC(fechaInicio || new Date()),
          fechaFin: horaLocalDesdeUTC(fechaFin || new Date()),
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
          duracionTexto: typeof data.duracionTexto === 'string' ? data.duracionTexto : undefined,
          esHito: data.esHito === true,
          fechaLimite: data.esHito && data.fechaLimite ? diaLocalDesdeUTC(data.fechaLimite) : undefined,
          diasPasadoLimite: Number(data.diasPasadoLimite) || 0,
          predecesoras: Array.isArray(data.predecesoras) ? data.predecesoras : undefined,
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
      const j = projectNode?.data?.jornada
      if (j) setJornada({ ini: aMinutos(j.inicio, 8 * 60), fin: aMinutos(j.fin, 18 * 60 + 30) })
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
    guardarPrefs(proyectoId, { filtroNivel, timeRangeMonths, zoomLevel, anchoNombres, densidad, mostrarDependencias, expandidos: [...expandidosDe(items)] })
  }, [proyectoId, filtroNivel, timeRangeMonths, zoomLevel, anchoNombres, densidad, mostrarDependencias, items, loading])

  // Arrastrar el borde derecho de la columna de nombres para cambiar su ancho.
  const iniciarRedimension = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const inicioX = e.clientX
    const anchoInicial = anchoNombres
    const mover = (ev: PointerEvent) => {
      const nuevo = anchoInicial + (ev.clientX - inicioX)
      setAnchoNombres(Math.min(ANCHO_NOMBRES_MAX, Math.max(ANCHO_NOMBRES_MIN, nuevo)))
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const asaRedimension = (
    <div
      className="absolute right-0 top-0 bottom-0 z-50 w-1.5 -mr-[3px] cursor-col-resize hover:bg-blue-400/60 active:bg-blue-500/70"
      onPointerDown={iniciarRedimension}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={() => setAnchoNombres(ANCHO_NOMBRES_DEFECTO)}
      title="Arrastra para cambiar el ancho (doble clic: ancho por defecto)"
    />
  )

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
    // Se conserva la hora de inicio: el servidor solo la corre si cae fuera de jornada.
    const base = new Date(item.fechaInicioNodo || item.fechaInicio.toISOString())
    const nuevoInicio = new Date(base.getTime() + dias * 86400000).toISOString()
    const inicioAnterior = base.toISOString()
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
      const inicioReal = buscar(recargados)?.fechaInicioNodo ?? nuevoInicio
      const fechaTexto = new Date(inicioReal).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
      sonnerToast.success(`"${item.nombre}" ahora empieza el ${fechaTexto}`, {
        description: item.tipo === 'tarea'
          ? 'Conserva su duración en horas laborables.'
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

    // Segundo nivel de la escala (como MS Project): días si hay espacio, si no
    // semanas, y si tampoco, solo meses. Más fines de semana sombreados.
    const escala: 'dias' | 'semanas' | 'meses' = dayWidth >= 18 ? 'dias' : dayWidth >= 3.5 ? 'semanas' : 'meses'
    const LETRA_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
    const celdas: { x: number; width: number; label: string; actual: boolean; finDeSemana: boolean }[] = []
    if (escala === 'dias') {
      for (let i = 0; i < totalDays; i++) {
        const dia = addDays(minDate, i)
        const dow = dia.getDay()
        celdas.push({
          x: i * dayWidth,
          width: dayWidth,
          label: dayWidth >= 28 ? `${LETRA_DIA[dow]} ${format(dia, 'd')}` : format(dia, 'd'),
          actual: differenceInCalendarDays(dia, today) === 0,
          finDeSemana: dow === 0 || dow === 6,
        })
      }
    } else if (escala === 'semanas') {
      for (let ini = startOfWeek(minDate, { weekStartsOn: 1 }); ini < maxDate; ini = addDays(ini, 7)) {
        const desde = Math.max(0, differenceInDays(ini, minDate))
        const hasta = Math.min(totalDays, differenceInDays(addDays(ini, 7), minDate))
        const width = (hasta - desde) * dayWidth
        if (width <= 0) continue
        celdas.push({
          x: desde * dayWidth,
          width,
          // Fecha del lunes de la semana, como MS Project; solo el número si no cabe.
          label: width >= 44 ? format(ini, 'dd MMM', { locale: es }) : width >= 16 ? format(ini, 'dd') : '',
          actual: today >= ini && today < addDays(ini, 7),
          finDeSemana: false,
        })
      }
    }
    // Columnas de sábado y domingo (fondo gris en el área de barras), si se distinguen.
    const finesDeSemana: { x: number; width: number }[] = []
    if (dayWidth >= 3.5) {
      for (let i = 0; i < totalDays; i++) {
        const dow = addDays(minDate, i).getDay()
        if (dow === 6) finesDeSemana.push({ x: i * dayWidth, width: Math.min(2, totalDays - i) * dayWidth })
        else if (dow === 0 && i === 0) finesDeSemana.push({ x: 0, width: dayWidth })
      }
    }

    return { minDate, maxDate, totalDays, dayWidth, totalWidth, months, weekLines, todayX, showToday, escala, celdas, finesDeSemana }
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

          <Select value={densidad} onValueChange={(v) => setDensidad(v as Densidad)}>
            <SelectTrigger className="h-7 w-28 text-xs" title="Altura de las filas">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Filas normales</SelectItem>
              <SelectItem value="compacta">Filas compactas</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={mostrarDependencias ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMostrarDependencias(v => !v)}
            title="Mostrar u ocultar las flechas de dependencias (en rojo las que no se cumplen)"
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Dependencias
          </Button>

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
          <div style={{ width: anchoNombres + timeline.totalWidth, minWidth: '100%' }}>
          {/* Header row: name col + timeline months */}
          <div className="flex border-b bg-white">
            <div
              className="sticky left-0 z-40 flex-shrink-0 border-r border-gray-200 bg-gray-50 px-2 py-1.5"
              style={{ width: anchoNombres }}
            >
              <span className="text-xs font-medium text-gray-600">Elemento</span>
              {asaRedimension}
            </div>
            <div className="flex-shrink-0" style={{ width: timeline.totalWidth }}>
              {/* Nivel superior: meses */}
              <div className="flex">
                {timeline.months.map((m, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 border-r border-gray-200 px-1.5 py-1 text-center ${isSameMonth(m.date, new Date()) ? 'bg-blue-50' : 'bg-gray-50'}`}
                    style={{ width: m.width }}
                  >
                    <span className="text-[10px] font-medium text-gray-600 uppercase">{m.label}</span>
                  </div>
                ))}
              </div>
              {/* Nivel inferior: días o semanas según el espacio (como MS Project) */}
              {timeline.escala !== 'meses' && (
                <div className="relative h-5 border-t border-gray-200 bg-white">
                  {timeline.celdas.map((c, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 h-full overflow-hidden border-r border-gray-200 text-center leading-5 ${
                        c.actual ? 'bg-blue-100 font-semibold text-blue-700' : c.finDeSemana ? 'bg-gray-100 text-gray-400' : 'text-gray-500'
                      }`}
                      style={{ left: c.x, width: c.width }}
                      title={timeline.escala === 'semanas' ? `Semana del ${c.label}` : undefined}
                    >
                      <span className="whitespace-nowrap text-[9px]">{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex">
            {/* Name column (fija a la izquierda; fondos opacos para tapar las barras al pasar debajo) */}
            <div
              className="sticky left-0 z-40 flex-shrink-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]"
              style={{ width: anchoNombres }}
            >
              {asaRedimension}
              {visibleItems.map((item, rowIdx) => {
                const colors = TIPO_COLORS[item.tipo] || TIPO_COLORS.tarea
                return (
                  <div
                    key={item.id}
                    className={`flex items-center border-b border-gray-200/70 cursor-pointer ${
                      item.id === seleccionId
                        ? 'bg-blue-100 shadow-[inset_4px_0_0_0_#2563eb]'
                        : rowIdx === filaHover ? 'bg-blue-50' : fondoFila(rowIdx)
                    }`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => seleccionar(item)}
                    onMouseEnter={() => setFilaHover(rowIdx)}
                    onMouseLeave={() => setFilaHover(null)}
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
                      {/* Hasta 2 líneas; el nombre completo aparece al pasar el mouse */}
                      <span
                        className={`min-w-0 flex-1 ${claseTextoNombre} line-clamp-2 break-words ${item.nivel === 0 ? 'font-semibold' : item.nivel === 1 ? 'font-medium' : ''}`}
                        title={item.nombre}
                      >
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
            <div
              className="relative flex-shrink-0"
              style={{ width: timeline.totalWidth, height: visibleItems.length * ROW_HEIGHT }}
              // La fila bajo el mouse se resalta también en la columna de nombres.
              onMouseMove={(e) => {
                const idx = Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / ROW_HEIGHT)
                setFilaHover(idx >= 0 && idx < visibleItems.length ? idx : null)
              }}
              onMouseLeave={() => setFilaHover(null)}
            >
              {/* Franjas de fila a lo ancho de la línea de tiempo: alternadas como en la
                  columna de nombres, con línea divisoria, y resaltadas al seleccionar o
                  pasar el mouse — para seguir con la vista de qué nombre es cada barra. */}
              {visibleItems.map((item, idx) => (
                <div
                  key={`fila-${item.id}`}
                  className={`absolute left-0 right-0 border-b border-gray-200/70 pointer-events-none ${
                    item.id === seleccionId ? 'bg-blue-200/50' : idx === filaHover ? 'bg-blue-50' : fondoFila(idx)
                  }`}
                  style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Sábados y domingos sombreados (días no laborables), como MS Project */}
              {timeline.finesDeSemana.map((w, i) => (
                <div
                  key={`fds-${i}`}
                  className="absolute top-0 bottom-0 bg-gray-100/60 pointer-events-none"
                  style={{ left: w.x, width: w.width }}
                />
              ))}

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

              {/* Fecha límite de los hitos (Deadline de MS Project): ▼ en su día, rojo si el hito la pasa */}
              {visibleItems.map((item, idx) => {
                if (!item.esHito || !item.fechaLimite) return null
                const x = (differenceInCalendarDays(item.fechaLimite, timeline.minDate) + 1) * timeline.dayWidth
                const tarde = (item.diasPasadoLimite ?? 0) > 0
                return (
                  <div
                    key={`limite-${item.id}`}
                    className="absolute pointer-events-none z-10"
                    style={{ left: x - 5, top: idx * ROW_HEIGHT, height: ROW_HEIGHT, width: 10 }}
                  >
                    <div className={`mx-auto h-full w-px ${tarde ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className={`absolute left-0 top-0 text-[9px] leading-none ${tarde ? 'text-red-600' : 'text-amber-600'}`}>▼</div>
                  </div>
                )
              })}

              {/* Flechas de dependencias (como MS Project): de la predecesora a la
                  sucesora según el tipo. Rojas si no se cumplen. Solo entre filas visibles. */}
              {mostrarDependencias && (() => {
                const filaDe = new Map(visibleItems.map((it, i) => [it.id, i]))
                const x = (d: Date) => {
                  const dia = differenceInCalendarDays(d, timeline.minDate)
                  const min = d.getHours() * 60 + d.getMinutes()
                  const frac = Math.min(1, Math.max(0, (min - jornada.ini) / Math.max(1, jornada.fin - jornada.ini)))
                  return (dia + frac) * timeline.dayWidth
                }
                const yMedio = (fila: number) => fila * ROW_HEIGHT + ROW_HEIGHT / 2
                const flechas: { key: string; d: string; roja: boolean; titulo: string }[] = []
                visibleItems.forEach((suc, filaSuc) => {
                  for (const dep of suc.predecesoras ?? []) {
                    const filaPred = filaDe.get(`tarea-${dep.tareaId}`)
                    if (filaPred === undefined) continue
                    const pred = visibleItems[filaPred]
                    const desdeFin = dep.tipo === 'finish_to_start' || dep.tipo === 'finish_to_finish'
                    const haciaFin = dep.tipo === 'finish_to_finish' || dep.tipo === 'start_to_finish'
                    const x1 = x(desdeFin ? pred.fechaFin : pred.fechaInicio)
                    const x2 = x(haciaFin ? suc.fechaFin : suc.fechaInicio)
                    const y1 = yMedio(filaPred)
                    const y2 = yMedio(filaSuc)
                    const salida = desdeFin ? x1 + 6 : x1 - 6
                    // Llega por la izquierda al inicio y por la derecha al fin de la sucesora.
                    const llegada = haciaFin ? x2 + 6 : x2 - 6
                    const yCruce = filaSuc > filaPred ? filaSuc * ROW_HEIGHT : (filaSuc + 1) * ROW_HEIGHT
                    const directo = haciaFin ? salida >= llegada - 0.5 : salida <= llegada + 0.5
                    const d = directo
                      ? `M ${x1} ${y1} H ${salida} V ${y2} H ${x2}`
                      : `M ${x1} ${y1} H ${salida} V ${yCruce} H ${llegada} V ${y2} H ${x2}`
                    const roja = (dep.horasIncumplidas ?? 0) > 0
                    flechas.push({ key: `${dep.tareaId}-${suc.id}`, d, roja, titulo: `${pred.nombre} → ${suc.nombre} (${dep.tipoTexto ?? 'FC'})${roja ? ' · no se cumple' : ''}` })
                  }
                })
                if (flechas.length === 0) return null
                return (
                  <svg
                    className="absolute left-0 top-0 pointer-events-none"
                    width={timeline.totalWidth}
                    height={visibleItems.length * ROW_HEIGHT}
                  >
                    <defs>
                      <marker id="gantt-flecha" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M0,0 L6,3 L0,6 z" fill="#6b7280" />
                      </marker>
                      <marker id="gantt-flecha-roja" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M0,0 L6,3 L0,6 z" fill="#dc2626" />
                      </marker>
                    </defs>
                    {flechas.map(f => (
                      <path
                        key={f.key}
                        d={f.d}
                        fill="none"
                        stroke={f.roja ? '#dc2626' : '#6b7280'}
                        strokeWidth={f.roja ? 1.5 : 1}
                        markerEnd={`url(#${f.roja ? 'gantt-flecha-roja' : 'gantt-flecha'})`}
                      >
                        <title>{f.titulo}</title>
                      </path>
                    ))}
                  </svg>
                )
              })()}

              {/* Bars */}
              {visibleItems.map((item, rowIdx) => {
                // Posición por hora: el día ocupa su celda y dentro de ella la jornada
                // (08:00 → borde izquierdo, 18:30 → borde derecho).
                const posX = (d: Date) => {
                  const dia = differenceInCalendarDays(d, timeline.minDate)
                  const min = d.getHours() * 60 + d.getMinutes()
                  const frac = Math.min(1, Math.max(0, (min - jornada.ini) / Math.max(1, jornada.fin - jornada.ini)))
                  return (dia + frac) * timeline.dayWidth
                }
                const diasCalendario = Math.max(1, differenceInCalendarDays(item.fechaFin, item.fechaInicio) + 1)
                // Duración mostrada: la misma de la columna DUR de Jerarquía (por horas).
                const durationDays = item.duracionLaborable ?? diasCalendario
                const ladoRombo = ROW_HEIGHT - MARGEN_BARRA * 2
                const barLeft = item.esHito ? posX(item.fechaInicio) - ladoRombo / 2 : posX(item.fechaInicio)
                const barWidth = item.esHito ? ladoRombo : Math.max(posX(item.fechaFin) - posX(item.fechaInicio), 6)
                const colorHito = item.diasPasadoLimite ? '#dc2626' : item.fechaLimite ? '#d97706' : '#4b5563'
                const colors = TIPO_COLORS[item.tipo] || TIPO_COLORS.tarea
                const labelText = item.esHito
                  ? format(item.fechaInicio, 'dd MMM', { locale: es })
                  : `${item.duracionTexto ?? `${durationDays}d`}${item.horasEstimadas ? ` · ${item.horasEstimadas}h` : ''}`
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
                            top: rowIdx * ROW_HEIGHT + MARGEN_BARRA,
                            left: barLeft,
                            height: ROW_HEIGHT - MARGEN_BARRA * 2,
                            // El hito necesita su caja cuadrada: sin ancho el rombo girado se ve como "/".
                            width: item.esHito ? barWidth : undefined,
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
                          {item.esHito ? (
                            <>
                              {/* Hito ◆: rombo en su fecha (relleno si está completado) */}
                              <div
                                className="absolute left-0 top-0 h-full w-full rotate-45 scale-[0.72] rounded-[2px] shadow-sm"
                                style={{
                                  backgroundColor: item.porcentajeAvance >= 100 ? colorHito : colorHito + '33',
                                  border: `2px solid ${colorHito}`,
                                }}
                              />
                              <div className="absolute top-0 h-full flex items-center whitespace-nowrap" style={{ left: barWidth + 4 }}>
                                <span className="text-[10px] font-semibold" style={{ color: colorHito }}>
                                  {labelText}
                                  {item.diasPasadoLimite ? ` · +${item.diasPasadoLimite}d sobre el límite` : ''}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </TooltipTrigger>
                      {/* Durante el arrastre se oculta el tooltip para que no tape el destino */}
                      {!enArrastre && moviendoId !== item.id && (
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">{item.nombre}</div>
                            {item.esHito ? (
                              <>
                                <div>◆ Hito · {format(item.fechaInicio, 'dd MMM yyyy HH:mm', { locale: es })}</div>
                                {item.fechaLimite && (
                                  <div className={item.diasPasadoLimite ? 'text-red-300 font-medium' : ''}>
                                    Fecha límite: {format(item.fechaLimite, 'dd MMM yyyy', { locale: es })}
                                    {item.diasPasadoLimite ? ` · la pasa por ${item.diasPasadoLimite} día(s) laborable(s)` : ' · a tiempo'}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div>{format(item.fechaInicio, 'dd MMM yyyy HH:mm', { locale: es })} → {format(item.fechaFin, 'dd MMM yyyy HH:mm', { locale: es })}</div>
                                <div>Duración {item.duracionTexto ?? `${durationDays}d`}{item.horasEstimadas ? ` · ${item.horasEstimadas}h` : ''} · {item.porcentajeAvance}%</div>
                              </>
                            )}
                            {item.predecesoras?.map(dep => (
                              <div key={dep.tareaId} className={dep.horasIncumplidas ? 'text-red-300 font-medium' : 'text-muted-foreground'}>
                                ← {dep.nombre} ({dep.tipoTexto ?? 'FC'}){dep.horasIncumplidas ? ' · no se cumple' : ''}
                              </div>
                            ))}
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
              <span className="text-gray-600">◆</span>
              <span>Hito</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-amber-600">▼</span>
              <span>Fecha límite</span>
            </div>
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
