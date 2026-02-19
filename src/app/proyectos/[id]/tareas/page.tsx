'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CheckSquare,
  Search,
  Filter,
  Clock,
  User,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  GitBranch,
  Loader2
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { useProyectoContext } from '../ProyectoContext'

interface TareaData {
  id: string
  nombre: string
  descripcion: string | null
  estado: string
  prioridad: string
  porcentajeCompletado: number
  fechaInicio: string
  fechaFin: string
  fechaInicioReal: string | null
  fechaFinReal: string | null
  horasEstimadas: number | null
  horasReales: number
  responsableId: string | null
  proyectoActividadId: string | null
  proyectoEdtId: string
  proyectoCronogramaId: string
  user: { id: string; name: string; email: string } | null
  proyectoEdt: {
    id: string
    nombre: string
    edt: { id: string; nombre: string; descripcion: string | null } | null
  }
  proyectoSubtarea: Array<{
    id: string
    nombre: string
    estado: string
    porcentajeCompletado: number
  }>
  _count?: {
    proyectoSubtarea: number
    registroHoras: number
  }
}

type FiltroEstado = 'todos' | 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
type FiltroPrioridad = 'todos' | 'baja' | 'media' | 'alta' | 'critica'
type FiltroTipo = 'todos' | 'cronograma' | 'extra'

const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-gray-700', bg: 'bg-gray-100' },
  en_progreso: { label: 'En Progreso', color: 'text-blue-700', bg: 'bg-blue-100' },
  completada: { label: 'Completada', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelada: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-100' },
  pausada: { label: 'Pausada', color: 'text-amber-700', bg: 'bg-amber-100' }
}

const prioridadConfig: Record<string, { label: string; color: string }> = {
  baja: { label: 'Baja', color: 'text-gray-500' },
  media: { label: 'Media', color: 'text-blue-500' },
  alta: { label: 'Alta', color: 'text-orange-500' },
  critica: { label: 'Critica', color: 'text-red-600' }
}

function TareasSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border-b">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export default function ProyectoTareasPage() {
  const { proyecto, cronogramaStats } = useProyectoContext()
  const [tareas, setTareas] = useState<TareaData[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<FiltroPrioridad>('todos')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [filtroEdt, setFiltroEdt] = useState<string>('todos')
  const [expandedEdts, setExpandedEdts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!proyecto?.id) return
    fetchTareas()
  }, [proyecto?.id])

  const fetchTareas = async () => {
    if (!proyecto?.id) return
    try {
      setLoading(true)
      const response = await fetch(`/api/proyectos/${proyecto.id}/cronograma/tareas?tipo=ejecucion`)
      if (!response.ok) throw new Error('Error al cargar tareas')
      const data = await response.json()
      setTareas(data.success ? data.data : [])
      // Expand all EDTs by default
      const edtIds = new Set<string>()
      for (const t of (data.success ? data.data : [])) {
        edtIds.add(t.proyectoEdtId)
      }
      setExpandedEdts(edtIds)
    } catch (error) {
      console.error('Error fetching tareas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique EDTs for filter dropdown
  const edtsUnicos = useMemo(() => {
    const map = new Map<string, { nombre: string; descripcion: string }>()
    for (const t of tareas) {
      if (!map.has(t.proyectoEdtId)) {
        const nombre = t.proyectoEdt?.edt?.nombre || t.proyectoEdt?.nombre || 'Sin EDT'
        const descripcion = t.proyectoEdt?.edt?.descripcion || ''
        map.set(t.proyectoEdtId, { nombre, descripcion })
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].nombre.localeCompare(b[1].nombre))
  }, [tareas])

  // Classify: cronograma (has actividadId) vs extra (no actividadId)
  const tareasFiltradas = useMemo(() => {
    return tareas.filter(t => {
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!t.nombre.toLowerCase().includes(q) &&
            !t.proyectoEdt?.edt?.nombre?.toLowerCase().includes(q) &&
            !t.user?.name?.toLowerCase().includes(q)) {
          return false
        }
      }
      if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
      if (filtroPrioridad !== 'todos' && t.prioridad !== filtroPrioridad) return false
      if (filtroTipo === 'cronograma' && !t.proyectoActividadId) return false
      if (filtroTipo === 'extra' && t.proyectoActividadId) return false
      if (filtroEdt !== 'todos' && t.proyectoEdtId !== filtroEdt) return false
      return true
    })
  }, [tareas, busqueda, filtroEstado, filtroPrioridad, filtroTipo, filtroEdt])

  // Group by EDT
  const tareasAgrupadas = useMemo(() => {
    const groups = new Map<string, { edt: TareaData['proyectoEdt']; tareas: TareaData[] }>()
    for (const t of tareasFiltradas) {
      const edtId = t.proyectoEdtId
      if (!groups.has(edtId)) {
        groups.set(edtId, { edt: t.proyectoEdt, tareas: [] })
      }
      groups.get(edtId)!.tareas.push(t)
    }
    return Array.from(groups.entries())
  }, [tareasFiltradas])

  // Stats
  const stats = useMemo(() => {
    const total = tareas.length
    const cronograma = tareas.filter(t => t.proyectoActividadId).length
    const extras = tareas.filter(t => !t.proyectoActividadId).length
    const completadas = tareas.filter(t => t.estado === 'completada').length
    const enProgreso = tareas.filter(t => t.estado === 'en_progreso').length
    const pendientes = tareas.filter(t => t.estado === 'pendiente').length
    const horasPlan = tareas.reduce((s, t) => s + (Number(t.horasEstimadas) || 0), 0)
    const horasReales = tareas.reduce((s, t) => s + (Number(t.horasReales) || 0), 0)
    return { total, cronograma, extras, completadas, enProgreso, pendientes, horasPlan, horasReales }
  }, [tareas])

  const toggleEdt = (edtId: string) => {
    setExpandedEdts(prev => {
      const next = new Set(prev)
      if (next.has(edtId)) next.delete(edtId)
      else next.add(edtId)
      return next
    })
  }

  if (!proyecto) return null

  const esCronograma = (t: TareaData) => !!t.proyectoActividadId

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <CheckSquare className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Tareas del Proyecto</h2>
        <span className="text-sm text-muted-foreground">
          ({stats.total} tareas · {stats.completadas} completadas · {stats.enProgreso} en progreso)
        </span>
      </div>

      {/* KPIs inline */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-purple-500" />
          <span className="font-semibold">{stats.cronograma}</span>
          <span className="text-muted-foreground">cronograma</span>
        </div>
        <div className="h-3.5 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-semibold">{stats.extras}</span>
          <span className="text-muted-foreground">extras</span>
        </div>
        <div className="h-3.5 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-semibold">{stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0}%</span>
          <span className="text-muted-foreground">avance</span>
          <Progress value={stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0} className="h-1.5 w-16" />
        </div>
        <div className="h-3.5 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-semibold">{Math.round(stats.horasReales)}h</span>
          <span className="text-muted-foreground">/ {Math.round(stats.horasPlan)}h plan</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar tarea..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>

        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}>
          <SelectTrigger className="h-8 w-[155px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Tipo: Todas</SelectItem>
            <SelectItem value="cronograma">Tipo: Cronograma</SelectItem>
            <SelectItem value="extra">Tipo: Extras</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEdt} onValueChange={setFiltroEdt}>
          <SelectTrigger className="h-8 w-auto max-w-[320px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">EDT: Todos</SelectItem>
            {edtsUnicos.map(([edtId, { nombre, descripcion }]) => (
              <SelectItem key={edtId} value={edtId}>
                {nombre}{descripcion ? ` - ${descripcion}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as FiltroEstado)}>
          <SelectTrigger className="h-8 w-[165px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Estado: Todos</SelectItem>
            <SelectItem value="pendiente">Estado: Pendiente</SelectItem>
            <SelectItem value="en_progreso">Estado: En Progreso</SelectItem>
            <SelectItem value="completada">Estado: Completada</SelectItem>
            <SelectItem value="cancelada">Estado: Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroPrioridad} onValueChange={(v) => setFiltroPrioridad(v as FiltroPrioridad)}>
          <SelectTrigger className="h-8 w-[155px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Prioridad: Todas</SelectItem>
            <SelectItem value="baja">Prioridad: Baja</SelectItem>
            <SelectItem value="media">Prioridad: Media</SelectItem>
            <SelectItem value="alta">Prioridad: Alta</SelectItem>
            <SelectItem value="critica">Prioridad: Critica</SelectItem>
          </SelectContent>
        </Select>

        {(filtroEstado !== 'todos' || filtroPrioridad !== 'todos' || filtroTipo !== 'todos' || filtroEdt !== 'todos' || busqueda) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setBusqueda('')
              setFiltroEstado('todos')
              setFiltroPrioridad('todos')
              setFiltroTipo('todos')
              setFiltroEdt('todos')
            }}
          >
            Limpiar filtros
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {tareasFiltradas.length} de {tareas.length} tareas
        </span>
      </div>

      {/* Lista de tareas agrupada por EDT */}
      {loading ? (
        <TareasSkeleton />
      ) : tareasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-1">
              {tareas.length === 0 ? 'No hay tareas en este proyecto' : 'No se encontraron tareas con los filtros aplicados'}
            </p>
            <p className="text-xs text-muted-foreground">
              {tareas.length === 0
                ? 'Las tareas se crean desde el cronograma o como tareas extras en Timesheet.'
                : 'Ajusta los filtros de busqueda.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="bg-muted/50 border-b">
            <div className="grid grid-cols-[1fr_80px_100px_100px_80px_100px_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
              <div>Tarea</div>
              <div>Tipo</div>
              <div>Responsable</div>
              <div>Fechas</div>
              <div>Progreso</div>
              <div>Horas</div>
              <div>Estado</div>
            </div>
          </div>

          {/* Grouped by EDT */}
          {tareasAgrupadas.map(([edtId, group]) => {
            const isExpanded = expandedEdts.has(edtId)
            const edtNombre = group.edt?.edt?.nombre || group.edt?.nombre || 'Sin EDT'
            const tareasEdt = group.tareas
            const completadasEdt = tareasEdt.filter(t => t.estado === 'completada').length
            const progresoEdt = tareasEdt.length > 0 ? Math.round((completadasEdt / tareasEdt.length) * 100) : 0

            return (
              <div key={edtId}>
                {/* EDT Header */}
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 border-b hover:bg-muted/50 transition-colors"
                  onClick={() => toggleEdt(edtId)}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                  <span className="text-xs font-semibold text-gray-700">{edtNombre}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {tareasEdt.length}
                  </Badge>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <Progress value={progresoEdt} className="h-1 w-16" />
                    <span className="text-[10px] text-muted-foreground w-7">{progresoEdt}%</span>
                  </div>
                </button>

                {/* Tasks */}
                {isExpanded && tareasEdt.map(tarea => {
                  const est = estadoConfig[tarea.estado] || estadoConfig.pendiente
                  const prio = prioridadConfig[tarea.prioridad] || prioridadConfig.media
                  const isCrono = esCronograma(tarea)

                  return (
                    <div
                      key={tarea.id}
                      className="grid grid-cols-[1fr_80px_100px_100px_80px_100px_80px] gap-2 px-3 py-2 border-b last:border-0 hover:bg-muted/20 text-xs items-center"
                    >
                      {/* Nombre + prioridad */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          tarea.prioridad === 'critica' ? 'bg-red-500' :
                          tarea.prioridad === 'alta' ? 'bg-orange-500' :
                          tarea.prioridad === 'media' ? 'bg-blue-400' : 'bg-gray-300'
                        }`} />
                        <span className="truncate font-medium" title={tarea.nombre}>
                          {tarea.nombre}
                        </span>
                        {(tarea._count?.proyectoSubtarea || 0) > 0 && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            {tarea._count!.proyectoSubtarea} sub
                          </Badge>
                        )}
                      </div>

                      {/* Tipo */}
                      <div>
                        {isCrono ? (
                          <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-purple-300 text-purple-700 bg-purple-50">
                            <GitBranch className="h-2.5 w-2.5 mr-0.5" />
                            Crono
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-amber-300 text-amber-700 bg-amber-50">
                            <Zap className="h-2.5 w-2.5 mr-0.5" />
                            Extra
                          </Badge>
                        )}
                      </div>

                      {/* Responsable */}
                      <div className="flex items-center gap-1 min-w-0">
                        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-muted-foreground">
                          {tarea.user?.name?.split(' ')[0] || '—'}
                        </span>
                      </div>

                      {/* Fechas */}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {format(new Date(tarea.fechaInicio), 'dd/MM', { locale: es })} - {format(new Date(tarea.fechaFin), 'dd/MM', { locale: es })}
                        </span>
                      </div>

                      {/* Progreso */}
                      <div className="flex items-center gap-1.5">
                        <Progress value={tarea.porcentajeCompletado} className="h-1.5 flex-1" />
                        <span className="text-muted-foreground w-7 text-right">{tarea.porcentajeCompletado}%</span>
                      </div>

                      {/* Horas */}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {Number(tarea.horasReales || 0).toFixed(0)}h
                          <span className="text-muted-foreground/60">
                            /{Number(tarea.horasEstimadas || 0).toFixed(0)}h
                          </span>
                        </span>
                      </div>

                      {/* Estado */}
                      <Badge className={`text-[9px] h-5 justify-center ${est.bg} ${est.color} border-0`}>
                        {est.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
