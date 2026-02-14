'use client'

/**
 * ListaJornadas - Tabla/Lista de jornadas del supervisor
 *
 * Muestra las jornadas con sus estados y estadísticas
 * Permite filtrar por estado y fecha
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building,
  Calendar,
  Clock,
  Users,
  ListTodo,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  LayoutList,
  LayoutGrid,
  Filter,
  Shield,
  UserCircle,
  HardHat,
  MoreVertical,
  Loader2,
  X,
  RefreshCcw,
  Trash2
} from 'lucide-react'

type EstadoJornada = 'iniciado' | 'pendiente' | 'aprobado' | 'rechazado'
type ViewMode = 'table' | 'cards'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface Edt {
  id: string
  nombre: string
  edt?: {
    id: string
    nombre: string
  }
}

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
}

interface TareaJornadaResumen {
  id: string
  proyectoTarea?: {
    id: string
    nombre: string
    porcentajeCompletado?: number | null
  } | null
  nombreTareaExtra?: string | null
  porcentajeInicial?: number | null
  porcentajeFinal?: number | null
}

interface JornadaResumen {
  id: string
  proyecto: Proyecto
  proyectoEdt?: Edt | null
  supervisor?: { id: string; name: string | null; email: string } | null
  aprobadoPor?: { id: string; name: string | null; email: string } | null
  personalPlanificado?: PersonalPlanificado[] | null
  fechaTrabajo: string
  estado: EstadoJornada
  objetivosDia?: string | null
  avanceDia?: string | null
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
  motivoRechazo?: string | null
  createdAt: string
  tareas?: TareaJornadaResumen[]
}

interface ListaJornadasProps {
  jornadas: JornadaResumen[]
  onVerDetalle: (jornadaId: string) => void
  onAprobar?: (jornadaId: string) => void
  onRechazar?: (jornadaId: string) => void
  onReabrir?: (jornadaId: string) => void
  onEliminar?: (jornadaId: string) => void
  aprobando?: string | null
  reabriendo?: string | null
  eliminando?: string | null
  loading?: boolean
  showSupervisor?: boolean
  title?: string
}

export function ListaJornadas({
  jornadas,
  onVerDetalle,
  onAprobar,
  onRechazar,
  onReabrir,
  onEliminar,
  aprobando = null,
  reabriendo = null,
  eliminando = null,
  loading = false,
  showSupervisor = false,
  title
}: ListaJornadasProps) {
  // Default to cards on mobile
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')
  const [proyectoFilter, setProyectoFilter] = useState<string>('todos')
  const [supervisorFilter, setSupervisorFilter] = useState<string>('todos')
  const [supAsignadoFilter, setSupAsignadoFilter] = useState<string>('todos')
  const [miembroFilter, setMiembroFilter] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [personCols, setPersonCols] = useState<Set<string>>(() => new Set(showSupervisor ? ['creador'] : []))
  const togglePersonCol = (col: string) => {
    setPersonCols(prev => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  // Extraer proyectos unicos para el filtro
  const proyectosUnicos = Array.from(
    new Map(jornadas.map(j => [j.proyecto.id, j.proyecto])).values()
  ).sort((a, b) => a.codigo.localeCompare(b.codigo))

  // Extraer supervisores (creadores) únicos
  const supervisoresUnicos = showSupervisor ? Array.from(
    new Map(
      jornadas
        .filter(j => j.supervisor)
        .map(j => [j.supervisor!.id, { id: j.supervisor!.id, nombre: j.supervisor!.name || j.supervisor!.email }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre)) : []

  // Extraer supervisores asignados únicos (rol supervisor en personalPlanificado)
  const supAsignadosUnicos = showSupervisor ? Array.from(
    new Map(
      jornadas
        .flatMap(j => (j.personalPlanificado || [])
          .filter(p => p.rolJornada === 'supervisor')
          .map(p => [p.userId, { id: p.userId, nombre: p.nombre }] as [string, { id: string; nombre: string }])
        )
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre)) : []

  // Extraer miembros de equipo únicos (de personalPlanificado)
  const miembrosUnicos = showSupervisor ? Array.from(
    new Map(
      jornadas
        .flatMap(j => (j.personalPlanificado || []).map(p => [p.userId, { id: p.userId, nombre: p.nombre }] as [string, { id: string; nombre: string }]))
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre)) : []

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getSupervisorAsignado = (personal?: PersonalPlanificado[] | null) => {
    return personal?.find(p => p.rolJornada === 'supervisor')
  }

  const getSeguridadAsignado = (personal?: PersonalPlanificado[] | null) => {
    return personal?.find(p => p.rolJornada === 'seguridad')
  }

  const getEquipo = (personal?: PersonalPlanificado[] | null) => {
    return personal?.filter(p => p.rolJornada === 'trabajador' || !p.rolJornada) || []
  }

  const getFirstName = (nombre: string) => {
    return nombre.split(' ')[0]
  }

  const getShortName = (nombre: string) => {
    const parts = nombre.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
    return parts[0]
  }

  const getInitials = (nombre: string) => {
    const parts = nombre.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return nombre.substring(0, 2).toUpperCase()
  }

  const avatarColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
    'bg-indigo-500', 'bg-orange-500'
  ]

  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length]

  const getProgresoColor = (pct: number) => {
    if (pct >= 100) return 'bg-green-100 text-green-700 border-green-200'
    if (pct >= 50) return 'bg-blue-100 text-blue-700 border-blue-200'
    if (pct > 0) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-gray-100 text-gray-500 border-gray-200'
  }

  const getNombreTareaCorto = (tarea: TareaJornadaResumen): string => {
    const nombre = tarea.proyectoTarea?.nombre || tarea.nombreTareaExtra || 'Tarea'
    return nombre.length > 20 ? nombre.substring(0, 18) + '…' : nombre
  }

  const getEstadoBadge = (estado: EstadoJornada) => {
    switch (estado) {
      case 'iniciado':
        return <Badge className="bg-green-100 text-green-800 border-green-200 whitespace-nowrap py-0.5"><Clock className="h-3 w-3 mr-1" />En curso</Badge>
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap py-0.5"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>
      case 'aprobado':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 whitespace-nowrap py-0.5"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-100 text-red-800 border-red-200 whitespace-nowrap py-0.5"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  // Filtrar jornadas
  const jornadasFiltradas = jornadas.filter(j => {
    // Filtro por estado
    if (estadoFilter !== 'todos' && j.estado !== estadoFilter) {
      return false
    }

    // Filtro por proyecto
    if (proyectoFilter !== 'todos' && j.proyecto.id !== proyectoFilter) {
      return false
    }

    // Filtro por creador (creado por)
    if (supervisorFilter !== 'todos' && j.supervisor?.id !== supervisorFilter) {
      return false
    }

    // Filtro por supervisor asignado (personalPlanificado)
    if (supAsignadoFilter !== 'todos') {
      const tieneSup = j.personalPlanificado?.some(p => p.rolJornada === 'supervisor' && p.userId === supAsignadoFilter)
      if (!tieneSup) return false
    }

    // Filtro por miembro del equipo
    if (miembroFilter !== 'todos') {
      const tieneMiembro = j.personalPlanificado?.some(p => p.userId === miembroFilter)
      if (!tieneMiembro) return false
    }

    // Filtro por búsqueda
    if (busqueda) {
      const term = busqueda.toLowerCase()
      return (
        j.proyecto.codigo.toLowerCase().includes(term) ||
        j.proyecto.nombre.toLowerCase().includes(term) ||
        j.objetivosDia?.toLowerCase().includes(term) ||
        false
      )
    }

    return true
  })

  // Ordenar: En curso → Pendiente → Rechazado → Aprobado, luego por fecha desc
  const estadoPrioridad: Record<string, number> = { iniciado: 0, pendiente: 1, rechazado: 2, aprobado: 3 }
  jornadasFiltradas.sort((a, b) => {
    const pa = estadoPrioridad[a.estado] ?? 9
    const pb = estadoPrioridad[b.estado] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(b.fechaTrabajo).getTime() - new Date(a.fechaTrabajo).getTime()
  })

  // Separar jornadas iniciadas del resto
  const jornadasIniciadas = jornadasFiltradas.filter(j => j.estado === 'iniciado')
  const otrasJornadas = jornadasFiltradas.filter(j => j.estado !== 'iniciado')

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Cargando jornadas...
        </CardContent>
      </Card>
    )
  }

  if (jornadas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          {showSupervisor ? 'No hay jornadas registradas' : 'No tienes jornadas registradas aún'}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="space-y-3">
          {/* Title + View Toggle (desktop) */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">{title || 'Mis Jornadas'}</CardTitle>

            {/* Toggle de vista - solo desktop */}
            <div className="hidden sm:flex border rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filtros - Mobile optimized */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {/* Filtro por proyecto */}
            <Select value={proyectoFilter} onValueChange={setProyectoFilter}>
              <SelectTrigger className="h-10 sm:h-9 sm:w-44">
                <Building className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los proyectos</SelectItem>
                {proyectosUnicos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de estado */}
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="h-10 sm:h-9 sm:w-40">
                <Filter className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="iniciado">En curso</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por supervisor - solo supervisión */}
            {showSupervisor && supervisoresUnicos.length > 0 && (
              <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
                <SelectTrigger className="h-10 sm:h-9 sm:w-44">
                  <UserCircle className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                  <SelectValue placeholder="Creado por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los creadores</SelectItem>
                  {supervisoresUnicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Filtro por supervisor asignado - solo supervisión */}
            {showSupervisor && supAsignadosUnicos.length > 0 && (
              <Select value={supAsignadoFilter} onValueChange={setSupAsignadoFilter}>
                <SelectTrigger className="h-10 sm:h-9 sm:w-44">
                  <Shield className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                  <SelectValue placeholder="Supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los supervisores</SelectItem>
                  {supAsignadosUnicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Filtro por miembro del equipo - solo supervisión */}
            {showSupervisor && miembrosUnicos.length > 0 && (
              <Select value={miembroFilter} onValueChange={setMiembroFilter}>
                <SelectTrigger className="h-10 sm:h-9 sm:w-44">
                  <HardHat className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                  <SelectValue placeholder="Miembro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los miembros</SelectItem>
                  {miembrosUnicos.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Búsqueda */}
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="h-10 sm:h-9 sm:w-36"
            />

            {/* Limpiar filtros */}
            {(proyectoFilter !== 'todos' || estadoFilter !== 'todos' || supervisorFilter !== 'todos' || supAsignadoFilter !== 'todos' || miembroFilter !== 'todos' || busqueda) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 sm:h-9 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setProyectoFilter('todos')
                  setEstadoFilter('todos')
                  setSupervisorFilter('todos')
                  setSupAsignadoFilter('todos')
                  setMiembroFilter('todos')
                  setBusqueda('')
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Column visibility toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400">Columnas:</span>
            {([
              ...(showSupervisor ? [
                { key: 'creador', label: 'Creador', Icon: UserCircle },
                { key: 'aprobador', label: 'Aprobador', Icon: CheckCircle },
              ] : []),
              { key: 'supervisor', label: 'Supervisor', Icon: Shield },
              { key: 'seguridad', label: 'Seguridad', Icon: HardHat },
            ] as { key: string; label: string; Icon: React.ComponentType<{ className?: string }> }[]).map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                  personCols.has(key)
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                    : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300'
                }`}
                onClick={() => togglePersonCol(key)}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {jornadasFiltradas.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No se encontraron jornadas con los filtros seleccionados
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Fecha</TableHead>
                  <TableHead>Proyecto / Objetivo</TableHead>
                  {showSupervisor && personCols.has('creador') && <TableHead>Creado por</TableHead>}
                  {showSupervisor && personCols.has('aprobador') && <TableHead>Aprobado por</TableHead>}
                  {personCols.has('supervisor') && <TableHead>Supervisor</TableHead>}
                  {personCols.has('seguridad') && <TableHead>Seguridad</TableHead>}
                  <TableHead>Equipo</TableHead>
                  <TableHead>Estado / Avance</TableHead>
                  <TableHead>Tareas / Avance</TableHead>
                  <TableHead className="text-center w-20">Horas</TableHead>
                  <TableHead className="text-right w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jornadasFiltradas.map(jornada => (
                  <TableRow key={jornada.id}>
                    <TableCell className="font-medium">
                      {formatFecha(jornada.fechaTrabajo)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{jornada.proyecto.codigo}</div>
                      {jornada.objetivosDia && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-[11px] text-gray-500 line-clamp-2 max-w-[200px] cursor-default">{jornada.objetivosDia}</div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[300px]">
                            <p className="text-[11px] font-medium mb-0.5">Objetivo</p>
                            <p className="text-[11px]">{jornada.objetivosDia}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    {/* Creado por (toggleable) */}
                    {showSupervisor && personCols.has('creador') && (
                      <TableCell>
                        {jornada.supervisor ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-gray-600 truncate max-w-[100px] block cursor-default">{getShortName(jornada.supervisor.name || jornada.supervisor.email)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-[11px]">{jornada.supervisor.name || jornada.supervisor.email}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : <span className="text-gray-400">-</span>}
                      </TableCell>
                    )}
                    {/* Aprobado por (toggleable) */}
                    {showSupervisor && personCols.has('aprobador') && (
                      <TableCell>
                        {jornada.aprobadoPor ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-gray-600 truncate max-w-[100px] block cursor-default">{getShortName(jornada.aprobadoPor.name || jornada.aprobadoPor.email)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-[11px]">{jornada.aprobadoPor.name || jornada.aprobadoPor.email}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : <span className="text-gray-400">-</span>}
                      </TableCell>
                    )}
                    {/* Supervisor (toggleable) */}
                    {personCols.has('supervisor') && (
                      <TableCell>
                        {(() => {
                          const sup = getSupervisorAsignado(jornada.personalPlanificado)
                          return sup ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-gray-600 truncate max-w-[100px] block cursor-default">{getShortName(sup.nombre)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-[11px]">{sup.nombre}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : <span className="text-gray-400">-</span>
                        })()}
                      </TableCell>
                    )}
                    {/* Seguridad (toggleable) */}
                    {personCols.has('seguridad') && (
                      <TableCell>
                        {(() => {
                          const seg = getSeguridadAsignado(jornada.personalPlanificado)
                          return seg ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-gray-600 truncate max-w-[100px] block cursor-default">{getShortName(seg.nombre)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-[11px]">{seg.nombre}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : <span className="text-gray-400">-</span>
                        })()}
                      </TableCell>
                    )}
                    <TableCell>
                      {(() => {
                        const personal = jornada.personalPlanificado || []
                        if (personal.length === 0) return <span className="text-gray-400">-</span>
                        const sup = getSupervisorAsignado(personal)
                        const seg = getSeguridadAsignado(personal)
                        const equipo = getEquipo(personal)
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-default">
                                <Users className="h-3.5 w-3.5 text-orange-500" />
                                <span className="text-sm font-medium">{personal.length}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              <div className="space-y-0.5">
                                {sup && <p className="text-[11px]"><span className="opacity-60">Sup:</span> {sup.nombre}</p>}
                                {seg && <p className="text-[11px]"><span className="opacity-60">Seg:</span> {seg.nombre}</p>}
                                {equipo.length > 0 && (
                                  <>
                                    <p className="font-medium text-[11px] opacity-70 mt-1">Equipo ({equipo.length})</p>
                                    {equipo.map((p, i) => (
                                      <p key={i} className="text-[11px]">{p.nombre}</p>
                                    ))}
                                  </>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <div>
                        {getEstadoBadge(jornada.estado)}
                        {jornada.avanceDia && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-[11px] text-gray-400 line-clamp-2 max-w-[180px] mt-1 cursor-default">{jornada.avanceDia}</div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[300px]">
                              <p className="text-[11px] font-medium mb-0.5">Avance del día</p>
                              <p className="text-[11px]">{jornada.avanceDia}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {jornada.tareas && jornada.tareas.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {jornada.tareas.slice(0, 3).map(tarea => {
                            const pctFinal = tarea.porcentajeFinal ?? tarea.proyectoTarea?.porcentajeCompletado
                            const pctInicial = tarea.porcentajeInicial
                            const hasRange = pctInicial !== null && pctInicial !== undefined && pctFinal !== null && pctFinal !== undefined
                            const hasPct = pctFinal !== null && pctFinal !== undefined
                            const colorPct = hasPct ? pctFinal! : 0
                            const nombreCompleto = tarea.proyectoTarea?.nombre || tarea.nombreTareaExtra || 'Tarea'
                            return (
                              <Tooltip key={tarea.id}>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 font-normal w-fit cursor-default ${hasPct ? getProgresoColor(colorPct) : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                                  >
                                    <span className="truncate max-w-[140px]">{getNombreTareaCorto(tarea)}</span>
                                    {hasRange ? (
                                      <span className="ml-1 font-semibold">{pctInicial}%→{pctFinal}%</span>
                                    ) : hasPct ? (
                                      <span className="ml-1 font-semibold">{pctFinal}%</span>
                                    ) : null}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  <p className="font-medium">{nombreCompleto}</p>
                                  {hasRange ? (
                                    <p className="text-[11px] opacity-80">Progreso: {pctInicial}% → {pctFinal}%</p>
                                  ) : hasPct ? (
                                    <p className="text-[11px] opacity-80">Progreso: {pctFinal}%</p>
                                  ) : null}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                          {jornada.tareas.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400 w-fit cursor-default">
                                  +{jornada.tareas.length - 3} más
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px]">
                                <div className="space-y-0.5">
                                  {jornada.tareas.slice(3).map(t => {
                                    const nombre = t.proyectoTarea?.nombre || t.nombreTareaExtra || 'Tarea'
                                    const pF = t.porcentajeFinal ?? t.proyectoTarea?.porcentajeCompletado
                                    const pI = t.porcentajeInicial
                                    const hasR = pI !== null && pI !== undefined && pF !== null && pF !== undefined
                                    return (
                                      <p key={t.id} className="text-[11px]">
                                        {nombre}{hasR ? ` · ${pI}%→${pF}%` : pF !== null && pF !== undefined ? ` · ${pF}%` : ''}
                                      </p>
                                    )
                                  })}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">{jornada.cantidadTareas}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium">{jornada.totalHoras}h</div>
                      {jornada.cantidadMiembros > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          ~{(jornada.totalHoras / jornada.cantidadMiembros).toFixed(1)}h/pers
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {aprobando === jornada.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto" />
                      ) : (jornada.estado === 'pendiente' || jornada.estado === 'aprobado') && onAprobar ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onVerDetalle(jornada.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            {jornada.estado === 'pendiente' && (
                              <DropdownMenuItem
                                onClick={() => onAprobar(jornada.id)}
                                className="text-green-600 focus:text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setTimeout(() => onRechazar?.(jornada.id), 0)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rechazar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : jornada.estado === 'rechazado' && (onReabrir || onEliminar) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onVerDetalle(jornada.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            {onReabrir && (
                              <DropdownMenuItem
                                onClick={() => setTimeout(() => onReabrir(jornada.id), 0)}
                                className="text-blue-600 focus:text-blue-600"
                                disabled={reabriendo === jornada.id}
                              >
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Reabrir
                              </DropdownMenuItem>
                            )}
                            {onEliminar && (
                              <DropdownMenuItem
                                onClick={() => setTimeout(() => onEliminar(jornada.id), 0)}
                                className="text-red-600 focus:text-red-600"
                                disabled={eliminando === jornada.id}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onVerDetalle(jornada.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {jornadasFiltradas.map(jornada => (
              <div
                key={jornada.id}
                className={`cursor-pointer transition-all active:scale-[0.98] rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3 ${
                  jornada.estado === 'rechazado' ? 'border-red-200 bg-red-50/30' :
                  jornada.estado === 'aprobado' ? 'border-blue-200 bg-blue-50/30' :
                  jornada.estado === 'pendiente' ? 'border-amber-200 bg-amber-50/30' :
                  jornada.estado === 'iniciado' ? 'border-green-200 bg-green-50/30' :
                  'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onVerDetalle(jornada.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base truncate">{jornada.proyecto.codigo}</div>
                    <div className="text-xs text-gray-500">
                      {formatFecha(jornada.fechaTrabajo)}
                    </div>
                  </div>
                  {getEstadoBadge(jornada.estado)}
                </div>

                {/* Creado por (solo supervisión) */}
                {showSupervisor && jornada.supervisor && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Creado por: {jornada.supervisor.name || jornada.supervisor.email}
                  </div>
                )}

                {/* Responsables y equipo */}
                {jornada.personalPlanificado && jornada.personalPlanificado.length > 0 && (() => {
                  const sup = getSupervisorAsignado(jornada.personalPlanificado)
                  const seg = getSeguridadAsignado(jornada.personalPlanificado)
                  const equipo = getEquipo(jornada.personalPlanificado)
                  return (
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {sup && (
                          <span className="flex items-center gap-1">
                            <UserCircle className="h-3 w-3 text-blue-500" />
                            <span className="text-gray-500">Sup:</span> {getFirstName(sup.nombre)}
                          </span>
                        )}
                        {seg && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-amber-500" />
                            <span className="text-gray-500">Seg:</span> {getFirstName(seg.nombre)}
                          </span>
                        )}
                      </div>
                      {equipo.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-default">
                              <HardHat className="h-3 w-3 text-orange-500" />
                              <span className="text-xs font-medium">{equipo.length} personas</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <div className="space-y-0.5">
                              <p className="font-medium text-[11px] opacity-70 mb-1">Equipo ({equipo.length})</p>
                              {equipo.map((p, i) => (
                                <p key={i} className="text-[11px]">{p.nombre}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )
                })()}

                {/* Objetivos - truncated */}
                {jornada.objetivosDia && (
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {jornada.objetivosDia}
                  </p>
                )}

                {/* Tareas con progreso */}
                {jornada.tareas && jornada.tareas.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <ListTodo className="h-3.5 w-3.5 text-blue-500" />
                      <span>{jornada.tareas.length} {jornada.tareas.length === 1 ? 'tarea' : 'tareas'}</span>
                      <span className="text-gray-300">·</span>
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                      <span className="font-medium">{jornada.totalHoras}h</span>
                      {jornada.cantidadMiembros > 0 && (
                        <span className="text-[10px] text-muted-foreground">(~{(jornada.totalHoras / jornada.cantidadMiembros).toFixed(1)}h/pers)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {jornada.tareas.slice(0, 3).map(tarea => {
                        const pctFinal = tarea.porcentajeFinal ?? tarea.proyectoTarea?.porcentajeCompletado
                        const pctInicial = tarea.porcentajeInicial
                        const hasRange = pctInicial !== null && pctInicial !== undefined && pctFinal !== null && pctFinal !== undefined
                        const hasPct = pctFinal !== null && pctFinal !== undefined
                        const colorPct = hasPct ? pctFinal! : 0
                        const nombreCompleto = tarea.proyectoTarea?.nombre || tarea.nombreTareaExtra || 'Tarea'
                        return (
                          <Tooltip key={tarea.id}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 font-normal cursor-default ${hasPct ? getProgresoColor(colorPct) : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                              >
                                <span className="truncate max-w-[100px]">{getNombreTareaCorto(tarea)}</span>
                                {hasRange ? (
                                  <span className="ml-1 font-semibold">{pctInicial}%→{pctFinal}%</span>
                                ) : hasPct ? (
                                  <span className="ml-1 font-semibold">{pctFinal}%</span>
                                ) : null}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              <p className="font-medium">{nombreCompleto}</p>
                              {hasRange ? (
                                <p className="text-[11px] opacity-80">Progreso: {pctInicial}% → {pctFinal}%</p>
                              ) : hasPct ? (
                                <p className="text-[11px] opacity-80">Progreso: {pctFinal}%</p>
                              ) : null}
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                      {jornada.tareas.length > 3 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400 cursor-default">
                              +{jornada.tareas.length - 3}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px]">
                            <div className="space-y-0.5">
                              {jornada.tareas.slice(3).map(t => {
                                const nombre = t.proyectoTarea?.nombre || t.nombreTareaExtra || 'Tarea'
                                const pF = t.porcentajeFinal ?? t.proyectoTarea?.porcentajeCompletado
                                const pI = t.porcentajeInicial
                                const hasR = pI !== null && pI !== undefined && pF !== null && pF !== undefined
                                return (
                                  <p key={t.id} className="text-[11px]">
                                    {nombre}{hasR ? ` · ${pI}%→${pF}%` : pF !== null && pF !== undefined ? ` · ${pF}%` : ''}
                                  </p>
                                )
                              })}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-xs sm:text-sm">
                    <span className="flex items-center gap-1">
                      <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                      {jornada.cantidadTareas}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                      {jornada.totalHoras}h
                      {jornada.cantidadMiembros > 0 && (
                        <span className="text-[10px] text-muted-foreground font-normal">(~{(jornada.totalHoras / jornada.cantidadMiembros).toFixed(1)}h/pers)</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Motivo rechazo */}
                {jornada.motivoRechazo && (
                  <div className="text-xs text-red-600 bg-red-50 rounded p-2">
                    <strong>Rechazo:</strong> {jornada.motivoRechazo}
                  </div>
                )}

                {/* Acciones de aprobación (cards) */}
                {(jornada.estado === 'pendiente' || jornada.estado === 'aprobado') && onAprobar && (
                  <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                    {aprobando === jornada.id ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </div>
                    ) : (
                      <>
                        {jornada.estado === 'pendiente' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                            onClick={() => onAprobar(jornada.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Aprobar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                          onClick={() => onRechazar?.(jornada.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Acciones para rechazadas (cards) */}
                {jornada.estado === 'rechazado' && (onReabrir || onEliminar) && (
                  <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                    {(reabriendo === jornada.id || eliminando === jornada.id) ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </div>
                    ) : (
                      <>
                        {onReabrir && (
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                            onClick={() => onReabrir(jornada.id)}
                          >
                            <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                            Reabrir
                          </Button>
                        )}
                        {onEliminar && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                            onClick={() => onEliminar(jornada.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Eliminar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
