'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Search,
  FileText,
  Briefcase,
  CalendarDays,
  Trash2,
  ArrowUpDown,
  X,
  List,
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getISOWeek, getISOWeekYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { TimesheetSemanal } from '@/components/horas-hombre/TimesheetSemanal'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'

// ── Types ──────────────────────────────────────────────────────────────

interface Registro {
  id: string
  fechaTrabajo: string
  horasTrabajadas: number
  descripcion: string | null
  categoria: string
  nombreServicio: string
  costoHora: number | null
  origen: string | null
  aprobado: boolean
  proyecto: { id: string; nombre: string; codigo: string } | null
  edt: { id: string; nombre: string } | null
  proyectoTarea: { id: string; nombre: string } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface Resumen {
  totalHoras: number
  totalRegistros: number
  promedioHoras: number
}

// ── Helpers ────────────────────────────────────────────────────────────

function getISOWeekString(date: Date): string {
  const week = getISOWeek(date)
  const year = getISOWeekYear(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function getWeekKey(fecha: string): string {
  const d = new Date(fecha)
  const week = getISOWeek(d)
  const year = getISOWeekYear(d)
  return `${year}-W${String(week).padStart(2, '0')}`
}

// ── Component ──────────────────────────────────────────────────────────

export default function TimesheetPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('semana')

  // Role check
  const esSupervisor = session?.user?.role && ['admin', 'gerente', 'gestor', 'coordinador'].includes(session.user.role)

  // ── Shared state ──
  const [showWizard, setShowWizard] = useState(false)
  const [aprobacionesMapa, setAprobacionesMapa] = useState<Record<string, string>>({})

  // ── Semana tab state ──
  const [semanaActual, setSemanaActual] = useState(new Date())
  const [resumenSemana, setResumenSemana] = useState<any>(null)
  const [proyectosTrabajados, setProyectosTrabajados] = useState<any[]>([])
  const [loadingSemana, setLoadingSemana] = useState(true)
  const [estadoAprobacion, setEstadoAprobacion] = useState<any>(null)
  const [enviando, setEnviando] = useState(false)

  // ── Historial tab state ──
  const [registros, setRegistros] = useState<Registro[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [resumenHistorial, setResumenHistorial] = useState<Resumen>({ totalHoras: 0, totalRegistros: 0, promedioHoras: 0 })
  const [proyectosDistintos, setProyectosDistintos] = useState(0)
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [proyectoFiltro, setProyectoFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string; codigo: string }[]>([])

  // ── Semana computed ──
  const inicioSemana = startOfWeek(semanaActual, { weekStartsOn: 1 })
  const finSemana = endOfWeek(semanaActual, { weekStartsOn: 1 })
  const semanaISO = format(semanaActual, 'yyyy-\'W\'ww')
  const semanaISOReal = getISOWeekString(semanaActual)

  const datosDefault = { totalHoras: 0, diasTrabajados: 0, promedioDiario: 0, vsSemanaAnterior: 0 }
  const semanaBloqueada = estadoAprobacion?.estado === 'enviado' || estadoAprobacion?.estado === 'aprobado'
  const totalHoras = (resumenSemana || datosDefault).totalHoras

  // ── Historial helpers ──
  const semanaLocked = (fecha: string, origen: string | null) => {
    if (origen !== 'oficina') return false
    const key = getWeekKey(fecha)
    const estado = aprobacionesMapa[key]
    return estado === 'enviado' || estado === 'aprobado'
  }

  const getEstadoBadge = (fecha: string, origen: string | null) => {
    if (origen !== 'oficina') return null
    const key = getWeekKey(fecha)
    const estado = aprobacionesMapa[key]
    if (!estado || estado === 'borrador') return null
    if (estado === 'enviado') return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>
    if (estado === 'aprobado') return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Aprobado</Badge>
    if (estado === 'rechazado') return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">Rechazado</Badge>
    return null
  }

  const registrosFiltrados = busqueda
    ? registros.filter(r => {
        const texto = busqueda.toLowerCase()
        return (
          r.proyecto?.nombre?.toLowerCase().includes(texto) ||
          r.proyecto?.codigo?.toLowerCase().includes(texto) ||
          r.edt?.nombre?.toLowerCase().includes(texto) ||
          r.proyectoTarea?.nombre?.toLowerCase().includes(texto) ||
          r.descripcion?.toLowerCase().includes(texto) ||
          r.categoria?.toLowerCase().includes(texto)
        )
      })
    : registros

  const tieneFiltros = busqueda || proyectoFiltro || fechaDesde || fechaHasta

  // ── Data fetching ──

  const cargarAprobaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/horas-hombre/timesheet-aprobacion/estado?todas=true')
      if (res.ok) {
        const data = await res.json()
        setAprobacionesMapa(data.aprobaciones || {})
      }
    } catch { /* silent */ }
  }, [])

  const cargarEstadoAprobacion = useCallback(async () => {
    try {
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/estado?semana=${semanaISOReal}`)
      if (res.ok) {
        const data = await res.json()
        setEstadoAprobacion(data)
      }
    } catch {
      console.error('Error cargando estado de aprobación')
    }
  }, [semanaISOReal])

  const cargarDatosSemana = useCallback(async () => {
    try {
      setLoadingSemana(true)
      const response = await fetch(`/api/horas-hombre/timesheet-semanal?semana=${semanaISO}`)
      if (response.ok) {
        const data = await response.json()
        setResumenSemana(data.data.resumenSemana)
        setProyectosTrabajados(data.data.proyectosTrabajados)
      }
    } catch {
      console.error('Error cargando datos de la semana')
    } finally {
      setLoadingSemana(false)
    }
  }, [semanaISO])

  const cargarProyectos = useCallback(async () => {
    try {
      const res = await fetch('/api/proyectos')
      if (res.ok) {
        const data = await res.json()
        const lista = (data.data || data || []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
        }))
        setProyectos(lista)
      }
    } catch { /* silent */ }
  }, [])

  const cargarRegistros = useCallback(async () => {
    try {
      setLoadingHistorial(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      params.set('soloMio', 'true')
      if (proyectoFiltro) params.set('proyectoId', proyectoFiltro)
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)

      const res = await fetch(`/api/registro-horas?${params}`)
      if (!res.ok) throw new Error('Error cargando registros')
      const data = await res.json()

      if (data.success) {
        let regs = data.data || []
        regs.sort((a: Registro, b: Registro) => {
          const da = new Date(a.fechaTrabajo).getTime()
          const db = new Date(b.fechaTrabajo).getTime()
          return sortOrder === 'desc' ? db - da : da - db
        })
        setRegistros(regs)
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 })
        setResumenHistorial(data.resumen || { totalHoras: 0, totalRegistros: 0, promedioHoras: 0 })
        const proyIds = new Set(regs.map((r: Registro) => r.proyecto?.id).filter(Boolean))
        setProyectosDistintos(proyIds.size)
      }
    } catch {
      toast({ title: 'Error al cargar registros', variant: 'destructive' })
    } finally {
      setLoadingHistorial(false)
    }
  }, [page, proyectoFiltro, fechaDesde, fechaHasta, sortOrder, toast])

  // ── Effects ──

  useEffect(() => {
    cargarDatosSemana()
    cargarEstadoAprobacion()
  }, [cargarDatosSemana, cargarEstadoAprobacion])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) return
    cargarAprobaciones()
    cargarProyectos()
  }, [status, session, cargarAprobaciones, cargarProyectos])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) return
    cargarRegistros()
  }, [status, session, cargarRegistros])

  // ── Actions ──

  const navegarSemana = (direccion: 'anterior' | 'siguiente') => {
    if (direccion === 'anterior') setSemanaActual(subWeeks(semanaActual, 1))
    else setSemanaActual(addWeeks(semanaActual, 1))
  }

  const handleRegistroExitoso = () => {
    setShowWizard(false)
    cargarDatosSemana()
    cargarEstadoAprobacion()
    cargarRegistros()
    cargarAprobaciones()
  }

  const enviarParaAprobacion = async () => {
    try {
      setEnviando(true)
      const res = await fetch('/api/horas-hombre/timesheet-aprobacion/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana: semanaISOReal }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || 'Error al enviar', variant: 'destructive' })
        return
      }
      toast({ title: 'Semana enviada para aprobación' })
      await cargarEstadoAprobacion()
      await cargarAprobaciones()
    } catch {
      toast({ title: 'Error al enviar la semana para aprobación', variant: 'destructive' })
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminar = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/registro-horas?id=${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error eliminando')
      }
      toast({ title: 'Registro eliminado' })
      cargarRegistros()
      cargarDatosSemana()
      cargarEstadoAprobacion()
    } catch (e: any) {
      toast({ title: e.message || 'Error al eliminar', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const limpiarFiltros = () => {
    setBusqueda('')
    setProyectoFiltro('')
    setFechaDesde('')
    setFechaHasta('')
    setPage(1)
  }

  const exportarCSV = () => {
    if (registrosFiltrados.length === 0) {
      toast({ title: 'No hay datos para exportar', variant: 'destructive' })
      return
    }

    const headers = esSupervisor
      ? 'Fecha,Proyecto,EDT,Tarea,Horas,Descripción,Costo Hora (PEN),Origen'
      : 'Fecha,Proyecto,EDT,Tarea,Horas,Descripción,Origen'
    const rows = registrosFiltrados.map(r => {
      const fecha = format(new Date(r.fechaTrabajo), 'dd/MM/yyyy')
      const proyecto = r.proyecto ? `${r.proyecto.codigo} - ${r.proyecto.nombre}` : ''
      const edt = r.edt?.nombre || ''
      const tarea = r.proyectoTarea?.nombre || ''
      const horas = r.horasTrabajadas
      const desc = (r.descripcion || '').replace(/"/g, '""')
      const origen = r.origen || ''
      if (esSupervisor) {
        const costo = r.costoHora ? r.costoHora.toFixed(2) : ''
        return `"${fecha}","${proyecto}","${edt}","${tarea}",${horas},"${desc}",${costo},"${origen}"`
      }
      return `"${fecha}","${proyecto}","${edt}","${tarea}",${horas},"${desc}","${origen}"`
    })

    const BOM = '\uFEFF'
    const csv = BOM + [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mi-timesheet-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    toast({ title: 'CSV exportado' })
  }

  const formatFecha = (fecha: string) => {
    try { return format(new Date(fecha), 'dd MMM yyyy', { locale: es }) }
    catch { return fecha }
  }

  // ── Render ──

  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mi Timesheet</h1>
            <p className="text-xs text-gray-500">Registro y seguimiento de horas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'historial' && (
            <Button variant="outline" size="sm" onClick={exportarCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          )}
          {!(activeTab === 'semana' && semanaBloqueada) && (
            <Button onClick={() => setShowWizard(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Registrar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="semana" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Semana
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-1.5">
            <List className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* ══════════ TAB: SEMANA ══════════ */}
        <TabsContent value="semana" className="space-y-4 mt-4">
          {/* Banner de estado de aprobación */}
          {estadoAprobacion && (
            <>
              {estadoAprobacion.estado === 'borrador' && totalHoras > 0 && (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Semana con <strong>{totalHoras}h</strong> registradas. Envía para aprobación cuando estés listo.
                    </span>
                  </div>
                  <Button size="sm" onClick={enviarParaAprobacion} disabled={enviando}>
                    <Send className="h-4 w-4 mr-1" />
                    {enviando ? 'Enviando...' : 'Enviar para aprobación'}
                  </Button>
                </div>
              )}

              {estadoAprobacion.estado === 'enviado' && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    <strong>Semana enviada</strong> — Pendiente de aprobación.
                    {estadoAprobacion.fechaEnvio && (
                      <span className="text-yellow-600 ml-1">
                        Enviado el {format(new Date(estadoAprobacion.fechaEnvio), 'dd/MM/yyyy HH:mm')}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {estadoAprobacion.estado === 'aprobado' && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    <strong>Semana aprobada</strong>
                    {estadoAprobacion.aprobadoPor && (
                      <span className="text-green-600 ml-1">
                        por {estadoAprobacion.aprobadoPor}
                        {estadoAprobacion.fechaResolucion && ` el ${format(new Date(estadoAprobacion.fechaResolucion), 'dd/MM/yyyy')}`}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {estadoAprobacion.estado === 'rechazado' && (
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <div className="text-sm text-red-800">
                      <strong>Semana rechazada</strong>
                      {estadoAprobacion.motivoRechazo && (
                        <span className="text-red-600 ml-1">— {estadoAprobacion.motivoRechazo}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                    onClick={enviarParaAprobacion}
                    disabled={enviando}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {enviando ? 'Reenviando...' : 'Reenviar'}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Navegación de semanas + Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navegarSemana('anterior')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[180px]">
                <span className="font-semibold text-sm">
                  {format(inicioSemana, 'dd')} - {format(finSemana, 'dd MMM', { locale: es })}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navegarSemana('siguiente')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600" onClick={() => setSemanaActual(new Date())}>
                Hoy
              </Button>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-blue-700">{(resumenSemana || datosDefault).totalHoras}h</span>
                <span className="text-xs text-blue-600">Total</span>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="font-bold text-green-700">{(resumenSemana || datosDefault).diasTrabajados}</span>
                <span className="text-xs text-green-600">Días</span>
              </div>
              <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="font-bold text-purple-700">{(resumenSemana || datosDefault).promedioDiario}h</span>
                <span className="text-xs text-purple-600">Diario</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <TrendingUp className={`h-4 w-4 ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                <span className={`font-bold ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? '+' : ''}{((resumenSemana || datosDefault).vsSemanaAnterior)}%
                </span>
                <span className={`text-xs ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Vs Anterior</span>
              </div>
            </div>
          </div>

          {/* Calendario semanal */}
          <Card className="overflow-hidden">
            <CardContent className="p-0 sm:p-4">
              <TimesheetSemanal
                semana={inicioSemana}
                onHorasRegistradas={handleRegistroExitoso}
              />
            </CardContent>
          </Card>

          {/* Proyectos esta semana */}
          {proyectosTrabajados.length > 0 && (
            <div className="bg-white border rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Proyectos esta semana</h3>
              <div className="flex flex-wrap gap-2">
                {proyectosTrabajados.map((proyecto, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                    <span className="text-sm font-medium text-gray-700">{proyecto.codigo || proyecto.nombre}</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {proyecto.horas}h
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════ TAB: HISTORIAL ══════════ */}
        <TabsContent value="historial" className="space-y-4 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-lg font-bold">{resumenHistorial.totalHoras.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Total Horas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-lg font-bold">{resumenHistorial.totalRegistros}</p>
                    <p className="text-xs text-muted-foreground">Registros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-lg font-bold">{proyectosDistintos}</p>
                    <p className="text-xs text-muted-foreground">Proyectos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-lg font-bold">{resumenHistorial.promedioHoras.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Promedio/Registro</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proyecto, EDT, tarea, descripción..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <select
              value={proyectoFiltro}
              onChange={e => { setProyectoFiltro(e.target.value); setPage(1) }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos los proyectos</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
              ))}
            </select>
            <Input
              type="date"
              value={fechaDesde}
              onChange={e => { setFechaDesde(e.target.value); setPage(1) }}
              className="h-9 w-[140px] text-sm"
              placeholder="Desde"
            />
            <Input
              type="date"
              value={fechaHasta}
              onChange={e => { setFechaHasta(e.target.value); setPage(1) }}
              className="h-9 w-[140px] text-sm"
              placeholder="Hasta"
            />
            {tieneFiltros && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-9">
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                    >
                      <div className="flex items-center gap-1">
                        Fecha
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>EDT</TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="hidden md:table-cell">Descripción</TableHead>
                    {esSupervisor && <TableHead className="text-right hidden lg:table-cell">Costo/h</TableHead>}
                    <TableHead className="hidden sm:table-cell">Estado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistorial ? (
                    <TableRow>
                      <TableCell colSpan={esSupervisor ? 9 : 8} className="text-center py-8 text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : registrosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={esSupervisor ? 9 : 8} className="text-center py-8">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {tieneFiltros ? 'No se encontraron registros con los filtros aplicados' : 'No hay registros de horas'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrosFiltrados.map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/50">
                        <TableCell className="py-2 whitespace-nowrap text-sm">
                          {formatFecha(r.fechaTrabajo)}
                        </TableCell>
                        <TableCell className="py-2 text-sm">
                          <span className="font-medium">{r.proyecto?.codigo}</span>
                          <span className="text-muted-foreground hidden sm:inline"> - {r.proyecto?.nombre}</span>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground">
                          {r.edt?.nombre || '-'}
                        </TableCell>
                        <TableCell className="py-2 text-sm">
                          {r.proyectoTarea?.nombre || '-'}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-right font-medium">
                          {r.horasTrabajadas}h
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                          {r.descripcion || '-'}
                        </TableCell>
                        {esSupervisor && (
                          <TableCell className="py-2 text-sm text-right text-muted-foreground hidden lg:table-cell">
                            {r.costoHora ? `S/${r.costoHora.toFixed(2)}` : '-'}
                          </TableCell>
                        )}
                        <TableCell className="py-2 hidden sm:table-cell">
                          {getEstadoBadge(r.fechaTrabajo, r.origen)}
                        </TableCell>
                        <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                          {!semanaLocked(r.fechaTrabajo, r.origen) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setDeleteId(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Página {pagination.page} de {pagination.pages} ({pagination.total} registros)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-7"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="h-7"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shared: Delete Dialog */}
      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="¿Eliminar registro de horas?"
        description="Se eliminará el registro y se recalcularán las horas del EDT asociado. Esta acción no se puede deshacer."
        onConfirm={handleEliminar}
      />

      {/* Shared: Wizard */}
      <RegistroHorasWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={handleRegistroExitoso}
      />
    </div>
  )
}
