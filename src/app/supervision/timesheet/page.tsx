'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  User,
  Users,
  Calendar,
  Briefcase,
  Search,
  X,
  RefreshCw,
  MapPin,
  Monitor,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'

interface Registro {
  id: string
  fechaTrabajo: string
  horasTrabajadas: number
  descripcion: string | null
  nombreServicio: string
  origen: string
  proyecto: { id: string; codigo: string; nombre: string }
  proyectoEdt: { nombre: string } | null
  proyectoTarea: { nombre: string } | null
}

interface ProyectoResumen {
  codigo: string
  nombre: string
  horas: number
}

interface Aprobacion {
  id: string
  semana: string
  estado: string
  totalHoras: number
  fechaEnvio: string | null
  fechaResolucion: string | null
  motivoRechazo: string | null
  usuario: { id: string; name: string; email: string }
  aprobadoPor: string | null
  diasTrabajados: number
  proyectos: ProyectoResumen[]
  registros: Registro[]
}

function parseSemanaLabel(semana: string): string {
  const [year, weekStr] = semana.split('-W')
  return `Semana ${parseInt(weekStr)}, ${year}`
}

// Devuelve lunes y domingo de una semana ISO "YYYY-Www" como Dates locales
// (mediodía local) para que format() no las shift por timezone.
function getSemanaRange(semana: string): { start: Date; end: Date } | null {
  const m = semana.match(/^(\d{4})-W(\d{1,2})$/)
  if (!m) return null
  const year = parseInt(m[1])
  const week = parseInt(m[2])
  // 4 de enero siempre está en la semana ISO 1
  const jan4 = new Date(year, 0, 4, 12, 0, 0)
  const jan4Day = jan4.getDay() || 7 // lunes=1, domingo=7
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - jan4Day + 1)
  const start = new Date(week1Monday)
  start.setDate(week1Monday.getDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

// Calcula la semana ISO de una Date como "YYYY-Www"
function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getSemanaActual(): string {
  return getISOWeekString(new Date())
}

// Suma o resta semanas a una semana ISO
function shiftSemana(semana: string, delta: number): string {
  const r = getSemanaRange(semana)
  if (!r) return semana
  const newStart = new Date(r.start)
  newStart.setDate(newStart.getDate() + delta * 7)
  return getISOWeekString(newStart)
}

function formatSemanaRango(semana: string): string {
  const r = getSemanaRange(semana)
  if (!r) return ''
  const sameMonth = r.start.getMonth() === r.end.getMonth()
  const sameYear = r.start.getFullYear() === r.end.getFullYear()
  if (sameMonth) {
    return `${format(r.start, 'd', { locale: es })} – ${format(r.end, "d 'de' MMM yyyy", { locale: es })}`
  }
  if (sameYear) {
    return `${format(r.start, 'd MMM', { locale: es })} – ${format(r.end, "d 'de' MMM yyyy", { locale: es })}`
  }
  return `${format(r.start, 'd MMM yyyy', { locale: es })} – ${format(r.end, 'd MMM yyyy', { locale: es })}`
}

export default function SupervisionTimesheetPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('todos')
  const [aprobaciones, setAprobaciones] = useState<Aprobacion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Vista: lista (acordeón) o matriz (tabla días × personas)
  const [vista, setVista] = useState<'lista' | 'matriz'>('lista')
  const [semanaMatriz, setSemanaMatriz] = useState<string>(getSemanaActual())
  const [usuariosElegibles, setUsuariosElegibles] = useState<{ id: string; name: string | null; email: string }[]>([])

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [filtroUsuarioId, setFiltroUsuarioId] = useState('')
  const [filtroSemanaDesde, setFiltroSemanaDesde] = useState('')
  const [filtroSemanaHasta, setFiltroSemanaHasta] = useState('')

  // Users list for filter
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([])

  // Summary
  const [resumen, setResumen] = useState<any>(null)

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [processing, setProcessing] = useState(false)

  const cargarResumen = useCallback(async () => {
    try {
      const res = await fetch('/api/horas-hombre/timesheet-aprobacion/resumen')
      if (res.ok) {
        const data = await res.json()
        setResumen(data)
      }
    } catch { /* silent */ }
  }, [])

  const cargarUsuarios = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/usuarios')
      if (res.ok) {
        const data = await res.json()
        const lista = (data.data || data || [])
          .map((u: any) => ({ id: u.id, name: u.name || u.email }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
        setUsuarios(lista)
      }
    } catch { /* silent */ }
  }, [])

  const cargarUsuariosElegibles = useCallback(async () => {
    try {
      const res = await fetch('/api/horas-hombre/timesheet-aprobacion/usuarios-elegibles')
      if (res.ok) {
        const data = await res.json()
        setUsuariosElegibles(data.usuarios || [])
      }
    } catch { /* silent */ }
  }, [])

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (vista === 'matriz') {
        // En matriz fijamos: estado=todos y rango = solo la semana visible
        params.set('estado', 'todos')
        params.set('semanaDesde', semanaMatriz)
        params.set('semanaHasta', semanaMatriz)
        if (filtroUsuarioId) params.set('usuarioId', filtroUsuarioId)
      } else {
        params.set('estado', tab)
        if (filtroUsuarioId) params.set('usuarioId', filtroUsuarioId)
        if (filtroSemanaDesde) params.set('semanaDesde', filtroSemanaDesde)
        if (filtroSemanaHasta) params.set('semanaHasta', filtroSemanaHasta)
      }

      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/pendientes?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error cargando datos')
      }
      const data = await res.json()
      setAprobaciones(data.aprobaciones || [])
    } catch (error: any) {
      toast({ title: error.message || 'Error al cargar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [vista, semanaMatriz, tab, filtroUsuarioId, filtroSemanaDesde, filtroSemanaHasta, toast])

  useEffect(() => {
    cargarUsuarios()
    cargarResumen()
    cargarUsuariosElegibles()
  }, [cargarUsuarios, cargarResumen, cargarUsuariosElegibles])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Client-side text search
  const aprobacionesFiltradas = busqueda
    ? aprobaciones.filter(a => {
        const texto = busqueda.toLowerCase()
        return (
          a.usuario.name?.toLowerCase().includes(texto) ||
          a.usuario.email?.toLowerCase().includes(texto) ||
          a.semana.includes(texto) ||
          a.proyectos.some(p =>
            p.codigo.toLowerCase().includes(texto) ||
            p.nombre.toLowerCase().includes(texto)
          )
        )
      })
    : aprobaciones

  const tieneFiltros = busqueda || filtroUsuarioId || filtroSemanaDesde || filtroSemanaHasta

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroUsuarioId('')
    setFiltroSemanaDesde('')
    setFiltroSemanaHasta('')
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAprobar = async (id: string) => {
    try {
      setProcessing(true)
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.message || 'Semana aprobada' })
      cargarDatos()
      cargarResumen()
    } catch (error: any) {
      toast({ title: error.message || 'Error al aprobar', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleVolverBorrador = async (id: string) => {
    if (!confirm('¿Devolver esta semana a borrador? El colaborador podrá editarla nuevamente.')) return
    try {
      setProcessing(true)
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'borrador' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.message || 'Semana devuelta a borrador' })
      cargarDatos()
      cargarResumen()
    } catch (error: any) {
      toast({ title: error.message || 'Error al devolver a borrador', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleRechazar = async () => {
    if (!rejectId) return
    if (motivoRechazo.trim().length < 10) {
      toast({ title: 'El motivo debe tener al menos 10 caracteres', variant: 'destructive' })
      return
    }
    try {
      setProcessing(true)
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/${rejectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'rechazar', motivoRechazo: motivoRechazo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.message || 'Semana rechazada' })
      setRejectId(null)
      setMotivoRechazo('')
      cargarDatos()
      cargarResumen()
    } catch (error: any) {
      toast({ title: error.message || 'Error al rechazar', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'sin_enviar':
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">Sin enviar</Badge>
      case 'enviado':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>
      case 'aprobado':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprobado</Badge>
      case 'rechazado':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rechazado</Badge>
      default:
        return <Badge variant="outline">Borrador</Badge>
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            Timesheet - Aprobación de Horas
          </h1>
          <p className="text-sm text-gray-500">
            Vista general de horas registradas (oficina y campo) con aprobación semanal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-background p-0.5">
            <Button
              variant={vista === 'lista' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setVista('lista')}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={vista === 'matriz' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setVista('matriz')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Matriz
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>
      </div>

      {/* Resumen semana actual */}
      {resumen?.semanaActual && (
        <div className="space-y-3">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-lg font-bold">{resumen.semanaActual.totalUsuarios}</p>
                    <p className="text-xs text-muted-foreground">Con horas esta semana</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={resumen.semanaActual.sinEnviar.length > 0 ? 'border-amber-300' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-lg font-bold">{resumen.semanaActual.sinEnviar.length}</p>
                    <p className="text-xs text-muted-foreground">Sin enviar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={resumen.semanaActual.pendientes.length > 0 ? 'border-yellow-300' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-lg font-bold">{resumen.semanaActual.pendientes.length}</p>
                    <p className="text-xs text-muted-foreground">Por aprobar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-lg font-bold">{resumen.semanaActual.aprobados}</p>
                    <p className="text-xs text-muted-foreground">Aprobados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert: employees who haven't submitted */}
          {resumen.semanaActual.sinEnviar.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  {resumen.semanaActual.sinEnviar.length} empleado{resumen.semanaActual.sinEnviar.length !== 1 ? 's' : ''} no ha{resumen.semanaActual.sinEnviar.length !== 1 ? 'n' : ''} enviado la semana {resumen.semana}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {resumen.semanaActual.sinEnviar.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1.5 bg-white border border-amber-200 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => {
                      setFiltroUsuarioId(u.id)
                      setTab('sin_enviar')
                    }}
                  >
                    <User className="h-3 w-3 text-amber-600" />
                    <span className="text-amber-900">{u.nombre}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{u.horas}h</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert: pending approval */}
          {resumen.semanaActual.pendientes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-800">
                  {resumen.semanaActual.pendientes.length} timesheet{resumen.semanaActual.pendientes.length !== 1 ? 's' : ''} esperando tu aprobación esta semana
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {resumen.semanaActual.pendientes.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1.5 bg-white border border-yellow-200 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => {
                      setFiltroUsuarioId(u.id)
                      setTab('enviado')
                    }}
                  >
                    <User className="h-3 w-3 text-yellow-600" />
                    <span className="text-yellow-900">{u.nombre}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{u.horas}h</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado, proyecto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={filtroUsuarioId}
          onChange={e => setFiltroUsuarioId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los empleados</option>
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {vista === 'lista' && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Semana:</span>
            <Input
              type="week"
              value={filtroSemanaDesde}
              onChange={e => setFiltroSemanaDesde(e.target.value)}
              className="h-9 w-[155px] text-sm"
              title="Desde"
            />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              type="week"
              value={filtroSemanaHasta}
              onChange={e => setFiltroSemanaHasta(e.target.value)}
              className="h-9 w-[155px] text-sm"
              title="Hasta"
            />
          </div>
        )}
        {vista === 'matriz' && (
          <div className="flex items-center gap-1 border rounded-md bg-background h-9 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSemanaMatriz(s => shiftSemana(s, -1))}
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
              {parseSemanaLabel(semanaMatriz)} · {formatSemanaRango(semanaMatriz)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSemanaMatriz(s => shiftSemana(s, 1))}
              title="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {semanaMatriz !== getSemanaActual() && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSemanaMatriz(getSemanaActual())}
              >
                Hoy
              </Button>
            )}
          </div>
        )}
        {vista === 'lista' && tieneFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-9">
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabs (solo en modo lista) */}
      {vista === 'lista' && (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todos">
            Todos
          </TabsTrigger>
          <TabsTrigger value="sin_enviar" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Sin enviar
          </TabsTrigger>
          <TabsTrigger value="enviado" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Pendientes
          </TabsTrigger>
          <TabsTrigger value="aprobado" className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Aprobados
          </TabsTrigger>
          <TabsTrigger value="rechazado" className="flex items-center gap-1">
            <XCircle className="h-4 w-4" />
            Rechazados
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : aprobacionesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {tieneFiltros ? 'No se encontraron timesheets con los filtros aplicados' :
                 tab === 'sin_enviar' ? 'No hay horas sin enviar' :
                 tab === 'enviado' ? 'No hay timesheets pendientes de aprobación' :
                 tab === 'aprobado' ? 'No hay timesheets aprobados' :
                 tab === 'rechazado' ? 'No hay timesheets rechazados' :
                 'No hay timesheets registrados'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {aprobacionesFiltradas.length} timesheet{aprobacionesFiltradas.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {aprobacionesFiltradas.map(a => {
                  const expanded = expandedIds.has(a.id)
                  return (
                    <Card key={a.id} className="border">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(a.id)}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{a.usuario.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">
                              {parseSemanaLabel(a.semana)}
                              <span className="text-muted-foreground/70"> · {formatSemanaRango(a.semana)}</span>
                            </span>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {a.totalHoras}h
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>{a.proyectos.length} proyecto{a.proyectos.length !== 1 ? 's' : ''}</span>
                          </div>
                          {estadoBadge(a.estado)}
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {a.estado === 'enviado' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                onClick={(e) => { e.stopPropagation(); handleAprobar(a.id) }}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); setRejectId(a.id); setMotivoRechazo('') }}
                                disabled={processing}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rechazar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                onClick={(e) => { e.stopPropagation(); handleVolverBorrador(a.id) }}
                                disabled={processing}
                              >
                                Volver a Borrador
                              </Button>
                            </>
                          )}
                          {a.estado === 'aprobado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-gray-600 border-gray-300 hover:bg-gray-50"
                              onClick={(e) => { e.stopPropagation(); handleVolverBorrador(a.id) }}
                              disabled={processing}
                            >
                              Volver a Borrador
                            </Button>
                          )}
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>

                      {expanded && (
                        <div className="border-t px-4 pb-4">
                          {/* Project summary */}
                          <div className="flex flex-wrap gap-2 py-3">
                            {a.proyectos.map((p, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full text-sm">
                                <span className="font-medium">{p.codigo}</span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-muted-foreground truncate max-w-[150px]">{p.nombre}</span>
                                <Badge variant="secondary" className="text-xs ml-1">{p.horas}h</Badge>
                              </div>
                            ))}
                          </div>

                          {/* Info row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pb-3 flex-wrap">
                            <span>{a.diasTrabajados} días trabajados</span>
                            <span>{a.registros.length} registros</span>
                            {a.fechaEnvio && (
                              <span>Enviado: {format(new Date(a.fechaEnvio), 'dd/MM/yyyy HH:mm')}</span>
                            )}
                            {a.fechaResolucion && (
                              <span>Resuelto: {format(new Date(a.fechaResolucion), 'dd/MM/yyyy HH:mm')}</span>
                            )}
                            {a.aprobadoPor && (
                              <span>Por: {a.aprobadoPor}</span>
                            )}
                            {a.motivoRechazo && (
                              <span className="text-red-600">Motivo: {a.motivoRechazo}</span>
                            )}
                          </div>

                          {/* Detail table */}
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Origen</TableHead>
                                  <TableHead>Proyecto</TableHead>
                                  <TableHead>EDT</TableHead>
                                  <TableHead>Tarea</TableHead>
                                  <TableHead className="text-right">Horas</TableHead>
                                  <TableHead>Descripción</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {a.registros.map(r => (
                                  <TableRow key={r.id}>
                                    <TableCell className="text-sm whitespace-nowrap">
                                      {format(new Date(r.fechaTrabajo), 'dd MMM', { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                      {r.origen === 'campo' ? (
                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                          <MapPin className="h-3 w-3 mr-0.5" />
                                          Campo
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-300">
                                          <Monitor className="h-3 w-3 mr-0.5" />
                                          Oficina
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      <span className="font-medium">{r.proyecto.codigo}</span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {r.proyectoEdt?.nombre || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {r.proyectoTarea?.nombre || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm text-right font-medium">
                                      {r.horasTrabajadas}h
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                                      {r.descripcion || '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      )}

      {/* Vista Matriz */}
      {vista === 'matriz' && (
        <TimesheetMatriz
          aprobaciones={aprobacionesFiltradas}
          usuariosElegibles={usuariosElegibles}
          semana={semanaMatriz}
          loading={loading}
          processing={processing}
          filtroUsuarioId={filtroUsuarioId}
          onAprobar={handleAprobar}
          onRechazar={(id) => { setRejectId(id); setMotivoRechazo('') }}
          onVolverBorrador={handleVolverBorrador}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setMotivoRechazo('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Indica el motivo del rechazo para que el empleado pueda corregir y reenviar.
            </p>
            <Textarea
              placeholder="Motivo del rechazo (mínimo 10 caracteres)..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {motivoRechazo.trim().length}/10 caracteres mínimo
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejectId(null); setMotivoRechazo('') }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={processing || motivoRechazo.trim().length < 10}
            >
              {processing ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Componente: Vista matricial (días × personas)
// ─────────────────────────────────────────────────────────────────

interface TimesheetMatrizProps {
  aprobaciones: Aprobacion[]
  usuariosElegibles: { id: string; name: string | null; email: string }[]
  semana: string
  loading: boolean
  processing: boolean
  filtroUsuarioId: string
  onAprobar: (id: string) => void
  onRechazar: (id: string) => void
  onVolverBorrador: (id: string) => void
}

interface CeldaDia {
  totalHoras: number
  proyectos: { codigo: string; horas: number }[]
}

function TimesheetMatriz({
  aprobaciones,
  usuariosElegibles,
  semana,
  loading,
  processing,
  filtroUsuarioId,
  onAprobar,
  onRechazar,
  onVolverBorrador,
}: TimesheetMatrizProps) {
  const r = getSemanaRange(semana)
  if (!r) return null

  // Construir 7 días de la semana
  const dias: { fecha: Date; key: string; label: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(r.start)
    d.setDate(r.start.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    dias.push({ fecha: d, key, label: format(d, 'EEE d', { locale: es }) })
  }

  // Filas: usuarios elegibles (filtrados por filtroUsuarioId si aplica)
  const usuariosVisibles = filtroUsuarioId
    ? usuariosElegibles.filter(u => u.id === filtroUsuarioId)
    : usuariosElegibles

  // Mapear aprobaciones por usuarioId
  const porUsuario = new Map<string, Aprobacion>()
  for (const a of aprobaciones) {
    porUsuario.set(a.usuario.id, a)
  }

  // Para cada usuario, agrupar registros por día
  const matrizPorUsuario = new Map<string, Record<string, CeldaDia>>()
  for (const a of aprobaciones) {
    const celdas: Record<string, CeldaDia> = {}
    for (const reg of a.registros) {
      const d = new Date(reg.fechaTrabajo)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!celdas[key]) celdas[key] = { totalHoras: 0, proyectos: [] }
      celdas[key].totalHoras += reg.horasTrabajadas
      const idx = celdas[key].proyectos.findIndex(p => p.codigo === reg.proyecto.codigo)
      if (idx >= 0) {
        celdas[key].proyectos[idx].horas += reg.horasTrabajadas
      } else {
        celdas[key].proyectos.push({ codigo: reg.proyecto.codigo, horas: reg.horasTrabajadas })
      }
    }
    matrizPorUsuario.set(a.usuario.id, celdas)
  }

  const estadoBadgeMatriz = (estado: string | undefined) => {
    if (!estado) return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Sin registros</Badge>
    switch (estado) {
      case 'sin_enviar':
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">Sin enviar</Badge>
      case 'enviado':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>
      case 'aprobado':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprobado</Badge>
      case 'rechazado':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rechazado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const colorFila = (estado: string | undefined): string => {
    if (!estado) return ''
    switch (estado) {
      case 'sin_enviar': return 'bg-amber-50/40'
      case 'enviado': return 'bg-yellow-50/40'
      case 'aprobado': return 'bg-green-50/30'
      case 'rechazado': return 'bg-red-50/30'
      default: return ''
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>
  }

  if (usuariosVisibles.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No hay usuarios elegibles que mostrar.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-x-auto bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Empleado</TableHead>
            {dias.map(d => (
              <TableHead key={d.key} className="text-center min-w-[110px]">
                <span className="capitalize">{d.label}</span>
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[70px]">Total</TableHead>
            <TableHead className="min-w-[110px]">Estado</TableHead>
            <TableHead className="min-w-[200px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuariosVisibles.map(u => {
            const aprobacion = porUsuario.get(u.id)
            const celdas = matrizPorUsuario.get(u.id) || {}
            const estado = aprobacion?.estado
            const totalSemana = aprobacion?.totalHoras ?? 0
            return (
              <TableRow key={u.id} className={colorFila(estado)}>
                <TableCell className="sticky left-0 bg-inherit z-10 font-medium text-sm">
                  {u.name || u.email}
                </TableCell>
                {dias.map(d => {
                  const c = celdas[d.key]
                  if (!c) {
                    return (
                      <TableCell key={d.key} className="text-center text-muted-foreground/50 text-xs">
                        —
                      </TableCell>
                    )
                  }
                  const principal = c.proyectos[0]
                  const extras = c.proyectos.length - 1
                  const tooltip = c.proyectos.map(p => `${p.codigo}: ${p.horas}h`).join('\n')
                  return (
                    <TableCell key={d.key} className="text-center" title={tooltip}>
                      <div className="text-sm font-semibold">{c.totalHoras}h</div>
                      <div className="text-[10px] text-muted-foreground font-mono leading-tight">
                        {principal?.codigo}
                        {extras > 0 && <span className="text-muted-foreground/70"> +{extras}</span>}
                      </div>
                    </TableCell>
                  )
                })}
                <TableCell className="text-right font-semibold text-sm">
                  {totalSemana > 0 ? `${totalSemana}h` : '—'}
                </TableCell>
                <TableCell>{estadoBadgeMatriz(estado)}</TableCell>
                <TableCell>
                  {aprobacion?.estado === 'enviado' && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                        onClick={() => onAprobar(aprobacion.id)}
                        disabled={processing}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                        onClick={() => onRechazar(aprobacion.id)}
                        disabled={processing}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                  {aprobacion?.estado === 'aprobado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onVolverBorrador(aprobacion.id)}
                      disabled={processing}
                    >
                      Devolver a borrador
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
