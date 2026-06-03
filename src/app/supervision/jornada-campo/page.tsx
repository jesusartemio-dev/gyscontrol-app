'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sun,
  Loader2,
  Calendar,
  Clock,
  Users,
  ListTodo,
  Target,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCircle,
  Building2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { ListaJornadas } from '@/components/horas-hombre/jornada'

type EstadoJornada = 'iniciado' | 'pendiente' | 'aprobado' | 'rechazado'
type DatePreset = 'todo' | 'hoy' | 'semana' | 'mes' | 'mesAnterior'

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mesAnterior', label: 'Mes pasado' },
]

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  cliente?: { id: string; nombre: string } | null
}

interface Edt {
  id: string
  nombre: string
}

interface Usuario {
  id: string
  name: string | null
  email: string
}

interface MiembroTarea {
  id: string
  usuario: Usuario
  horas: number
  observaciones?: string | null
}

interface TareaJornada {
  id: string
  proyectoTarea?: {
    id: string
    nombre: string
    porcentajeCompletado?: number
    proyectoActividad?: { nombre: string } | null
  } | null
  nombreTareaExtra?: string | null
  descripcion?: string | null
  miembros: MiembroTarea[]
}

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
}

interface Bloqueo {
  tipoBloqueoId?: string
  tipoBloqueoNombre?: string
  descripcion: string
  impacto?: string
  accion?: string
}

interface JornadaCompleta {
  id: string
  proyecto: Proyecto
  proyectoEdt?: Edt | null
  supervisor?: Usuario | null
  aprobadoPor?: Usuario | null
  fechaTrabajo: string
  estado: EstadoJornada
  objetivosDia?: string | null
  avanceDia?: string | null
  bloqueos?: Bloqueo[] | null
  planSiguiente?: string | null
  ubicacion?: string | null
  personalPlanificado?: PersonalPlanificado[] | null
  motivoRechazo?: string | null
  fechaCierre?: string | null
  createdAt: string
  tareas: TareaJornada[]
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
}

export default function JornadaCampoSupervisionPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [jornadas, setJornadas] = useState<JornadaCompleta[]>([])
  const [fechaPreset, setFechaPreset] = useState<DatePreset>('todo')
  const [clienteFilter, setClienteFilter] = useState<string>('todos')
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [jornadaDetalle, setJornadaDetalle] = useState<JornadaCompleta | null>(null)
  const [aprobando, setAprobando] = useState<string | null>(null)
  const [rechazarModalOpen, setRechazarModalOpen] = useState(false)
  const [jornadaRechazar, setJornadaRechazar] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesandoRechazo, setProcesandoRechazo] = useState(false)

  const { data: session } = useSession()
  const puedeReasignar = ['admin', 'gestor', 'coordinador'].includes(
    (session?.user as { role?: string } | undefined)?.role || '',
  )
  const [usuariosAsignables, setUsuariosAsignables] = useState<Usuario[]>([])
  const [reasignarSel, setReasignarSel] = useState('')
  const [reasignando, setReasignando] = useState(false)

  const clientesUnicos = useMemo(() =>
    Array.from(
      new Map(
        jornadas
          .filter(j => j.proyecto.cliente)
          .map(j => [j.proyecto.cliente!.id, j.proyecto.cliente!])
      ).values()
    ).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  [jornadas])

  const getDateRange = useCallback((preset: DatePreset) => {
    const hoy = new Date()
    const ini = (y: number, m: number, d: number) => new Date(y, m, d, 0, 0, 0)
    const fin = (y: number, m: number, d: number) => new Date(y, m, d, 23, 59, 59)
    switch (preset) {
      case 'hoy':
        return { desde: ini(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), hasta: fin(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) }
      case 'semana': {
        const dow = hoy.getDay()
        const lunes = new Date(hoy)
        lunes.setDate(hoy.getDate() - (dow === 0 ? 6 : dow - 1))
        lunes.setHours(0, 0, 0, 0)
        const domingo = new Date(lunes)
        domingo.setDate(lunes.getDate() + 6)
        domingo.setHours(23, 59, 59)
        return { desde: lunes, hasta: domingo }
      }
      case 'mes':
        return { desde: ini(hoy.getFullYear(), hoy.getMonth(), 1), hasta: fin(hoy.getFullYear(), hoy.getMonth() + 1, 0) }
      case 'mesAnterior':
        return { desde: ini(hoy.getFullYear(), hoy.getMonth() - 1, 1), hasta: fin(hoy.getFullYear(), hoy.getMonth(), 0) }
      default:
        return { desde: null, hasta: null }
    }
  }, [])

  const jornadasFiltradas = useMemo(() => {
    let result = jornadas
    if (fechaPreset !== 'todo') {
      const { desde, hasta } = getDateRange(fechaPreset)
      if (desde && hasta) {
        result = result.filter(j => {
          const f = new Date(j.fechaTrabajo)
          return f >= desde && f <= hasta
        })
      }
    }
    if (clienteFilter !== 'todos') {
      result = result.filter(j => j.proyecto.cliente?.id === clienteFilter)
    }
    return result
  }, [jornadas, fechaPreset, clienteFilter, getDateRange])

  const cargarJornadas = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await fetch('/api/horas-hombre/jornada/todas')

      if (!response.ok) {
        throw new Error('Error cargando jornadas')
      }

      const data = await response.json()
      setJornadas(data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarJornadas()
  }, [])

  // Cargar usuarios para el selector de responsable al abrir el detalle.
  useEffect(() => {
    if (!detalleModalOpen) {
      setReasignarSel('')
      return
    }
    if (puedeReasignar && usuariosAsignables.length === 0) {
      fetch('/api/horas-hombre/jornada/usuarios-asignables')
        .then((r) => (r.ok ? r.json() : []))
        .then(setUsuariosAsignables)
        .catch(() => {})
    }
  }, [detalleModalOpen, puedeReasignar, usuariosAsignables.length])

  const reasignarJornada = async () => {
    if (!jornadaDetalle || !reasignarSel) return
    setReasignando(true)
    try {
      const res = await fetch(`/api/horas-hombre/jornada/${jornadaDetalle.id}/reasignar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisorId: reasignarSel }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: data.error ?? 'No se pudo reasignar' })
        return
      }
      toast({
        title: 'Jornada reasignada',
        description: `Nuevo responsable: ${data.responsable?.name || data.responsable?.email}`,
      })
      setDetalleModalOpen(false)
      setReasignarSel('')
      cargarJornadas(true)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reasignar la jornada' })
    } finally {
      setReasignando(false)
    }
  }

  const handleAprobar = async (jornadaId: string) => {
    try {
      setAprobando(jornadaId)
      const response = await fetch(`/api/horas-hombre/campo/${jornadaId}/aprobar`, {
        method: 'PUT'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al aprobar')
      }
      toast({
        title: 'Jornada aprobada',
        description: 'La jornada fue aprobada exitosamente'
      })
      cargarJornadas(true)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo aprobar la jornada'
      })
    } finally {
      setAprobando(null)
    }
  }

  const handleRechazar = (jornadaId: string) => {
    setJornadaRechazar(jornadaId)
    setMotivoRechazo('')
    setRechazarModalOpen(true)
  }

  const confirmarRechazo = async () => {
    if (!jornadaRechazar || motivoRechazo.length < 10) return
    try {
      setProcesandoRechazo(true)
      const response = await fetch(`/api/horas-hombre/campo/${jornadaRechazar}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRechazo })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al rechazar')
      }
      toast({
        title: 'Jornada rechazada',
        description: 'La jornada fue rechazada'
      })
      setRechazarModalOpen(false)
      cargarJornadas(true)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo rechazar la jornada'
      })
    } finally {
      setProcesandoRechazo(false)
    }
  }

  const handleVerDetalle = async (jornadaId: string) => {
    try {
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}`)
      if (!response.ok) throw new Error('Error cargando detalle')
      const data = await response.json()
      setJornadaDetalle(data.data)
      setDetalleModalOpen(true)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el detalle de la jornada'
      })
    }
  }

  // fechaTrabajo es un día calendario; se formatea en UTC para evitar el desfase
  // de un día en zonas con offset negativo (Lima, UTC-5).
  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const getEstadoBadge = (estado: EstadoJornada) => {
    switch (estado) {
      case 'iniciado':
        return <Badge className="bg-green-100 text-green-800"><Clock className="h-3 w-3 mr-1" />En curso</Badge>
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>
      case 'aprobado':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
          <span className="truncate">Jornadas de Campo</span>
        </h1>
        <p className="text-gray-600 text-sm">
          Vista general de todas las jornadas registradas
        </p>
      </div>

      {/* Filtros de fecha y cliente */}
      {!loading && (
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <div className="flex items-center gap-1 flex-wrap">
              {DATE_PRESETS.map(p => (
                <Button
                  key={p.value}
                  variant={fechaPreset === p.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setFechaPreset(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {clientesUnicos.length > 0 && (
              <>
                <div className="h-5 w-px bg-gray-200 mx-1" />
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="h-7 w-[180px] text-xs">
                    <Building2 className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">Todos los clientes</SelectItem>
                    {clientesUnicos.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {jornadasFiltradas.length} de {jornadas.length}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Cargando jornadas...</span>
          </CardContent>
        </Card>
      ) : (
        <ListaJornadas
          jornadas={jornadasFiltradas}
          onVerDetalle={handleVerDetalle}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
          aprobando={aprobando}
          loading={loading}
          showSupervisor={true}
          title={`Todas las Jornadas${fechaPreset !== 'todo' || clienteFilter !== 'todos' ? ` (${jornadasFiltradas.length})` : ''}`}
        />
      )}

      {/* Modal Rechazar Jornada */}
      <Dialog open={rechazarModalOpen} onOpenChange={setRechazarModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base text-red-700">
              <XCircle className="h-5 w-5" />
              Rechazar Jornada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Indica el motivo del rechazo para que el supervisor pueda corregir la jornada.
            </p>
            <Textarea
              placeholder="Escribe el motivo del rechazo (min. 10 caracteres)..."
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${motivoRechazo.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                {motivoRechazo.length}/10 caracteres min.
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRechazarModalOpen(false)}
                  disabled={procesandoRechazo}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={confirmarRechazo}
                  disabled={motivoRechazo.length < 10 || procesandoRechazo}
                >
                  {procesandoRechazo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle Jornada */}
      <Dialog open={detalleModalOpen} onOpenChange={setDetalleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Detalle de Jornada
            </DialogTitle>
          </DialogHeader>

          {jornadaDetalle && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-base sm:text-lg truncate">{jornadaDetalle.proyecto.codigo}</div>
                  <div className="text-xs sm:text-sm text-gray-500 truncate">{jornadaDetalle.proyecto.nombre}</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                    {formatFecha(jornadaDetalle.fechaTrabajo)}
                  </div>
                </div>
                {getEstadoBadge(jornadaDetalle.estado)}
              </div>

              {/* Responsable actual */}
              {jornadaDetalle.supervisor && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <UserCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>Responsable: <span className="font-medium">{jornadaDetalle.supervisor.name || jornadaDetalle.supervisor.email}</span></span>
                </div>
              )}

              {/* Reasignar responsable (admin / gestor / coordinador) */}
              {puedeReasignar && jornadaDetalle.estado !== 'aprobado' && (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/40 px-3 py-2.5 sm:flex-row sm:items-center">
                  <span className="whitespace-nowrap text-xs font-medium text-blue-800 sm:text-sm">
                    Reasignar a:
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <Select value={reasignarSel} onValueChange={setReasignarSel}>
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder="Elegir responsable..." />
                      </SelectTrigger>
                      <SelectContent>
                        {usuariosAsignables
                          .filter((u) => u.id !== jornadaDetalle.supervisor?.id)
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name || u.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={reasignarJornada} disabled={!reasignarSel || reasignando}>
                      {reasignando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reasignar'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1 justify-center sm:justify-start bg-blue-50 sm:bg-transparent rounded-lg py-2 sm:py-0">
                  <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  <span className="font-medium">{jornadaDetalle.cantidadTareas}</span>
                  <span className="hidden sm:inline">tareas</span>
                </div>
                <div className="flex items-center gap-1 justify-center sm:justify-start bg-green-50 sm:bg-transparent rounded-lg py-2 sm:py-0">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                  <span className="font-medium">{jornadaDetalle.cantidadMiembros}</span>
                  <span className="hidden sm:inline">personas</span>
                </div>
                <div className="flex items-center gap-1 justify-center sm:justify-start bg-orange-50 sm:bg-transparent rounded-lg py-2 sm:py-0">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                  <span className="font-medium">{jornadaDetalle.totalHoras}h</span>
                </div>
              </div>

              {jornadaDetalle.objetivosDia && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Objetivos
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.objetivosDia}</div>
                </div>
              )}

              {jornadaDetalle.ubicacion && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  {jornadaDetalle.ubicacion}
                </div>
              )}

              {jornadaDetalle.avanceDia && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Avance del dia
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.avanceDia}</div>
                </div>
              )}

              {jornadaDetalle.bloqueos && (jornadaDetalle.bloqueos as Bloqueo[]).length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Bloqueos
                  </div>
                  <div className="space-y-2">
                    {(jornadaDetalle.bloqueos as Bloqueo[]).map((bloqueo, index) => (
                      <div key={index} className="text-xs sm:text-sm">
                        {bloqueo.tipoBloqueoNombre && (
                          <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-200 rounded px-1.5 py-0.5 mr-1.5 mb-0.5">
                            {bloqueo.tipoBloqueoNombre}
                          </span>
                        )}
                        <div className="font-medium">{bloqueo.descripcion}</div>
                        {bloqueo.impacto && <div className="text-amber-600">Impacto: {bloqueo.impacto}</div>}
                        {bloqueo.accion && <div className="text-amber-600">Accion: {bloqueo.accion}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jornadaDetalle.planSiguiente && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Plan siguiente
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.planSiguiente}</div>
                </div>
              )}

              {jornadaDetalle.motivoRechazo && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Motivo de rechazo
                  </div>
                  <div className="text-xs sm:text-sm text-red-800">{jornadaDetalle.motivoRechazo}</div>
                </div>
              )}

              {jornadaDetalle.tareas.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Tareas registradas</div>
                  <div className="space-y-2">
                    {jornadaDetalle.tareas.map(tarea => {
                      const nombreTarea = tarea.proyectoTarea?.nombre || tarea.nombreTareaExtra || 'Sin nombre'
                      const horasTarea = tarea.miembros.reduce((s, m) => s + m.horas, 0)
                      return (
                        <div key={tarea.id} className="border rounded-lg p-2.5 sm:p-3">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="font-medium text-xs sm:text-sm leading-tight">{nombreTarea}</div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">{horasTarea}h</Badge>
                          </div>
                          {tarea.proyectoTarea?.proyectoActividad && (
                            <div className="text-xs text-gray-500 mb-2">
                              {tarea.proyectoTarea.proyectoActividad.nombre}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {tarea.miembros.map(m => (
                              <Badge key={m.id} variant="secondary" className="text-xs">
                                {m.usuario.name?.split(' ')[0] || m.usuario.email.split('@')[0]} · {m.horas}h
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
