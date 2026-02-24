'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  RefreshCw,
  Search,
  Download,
  Home,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Clock,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface UsuarioActividad {
  id: string
  name: string | null
  email: string
  role: string
  lastLoginAt: string | null
  lastActivityAt: string | null
  accionesUltimos30Dias: number
  estado: 'online_hoy' | 'activo_semana' | 'inactivo'
  secciones: Array<{ seccion: string; count: number }>
  desglose: Record<string, number>
  horaPico: number | null
  horasActividad: number[] | null
}

interface Resumen {
  totalUsuarios: number
  activosHoy: number
  activosSemana: number
  inactivos30Dias: number
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  gestor: 'Gestor',
  coordinador: 'Coordinador',
  proyectos: 'Proyectos',
  seguridad: 'Seguridad',
  comercial: 'Comercial',
  presupuestos: 'Presupuestos',
  logistico: 'Logistico',
  administracion: 'Administracion',
  colaborador: 'Colaborador',
}

const ROLES = Object.keys(ROL_LABELS)

const SECCION_LABELS: Record<string, string> = {
  LISTA_EQUIPO: 'Listas',
  PEDIDO_EQUIPO: 'Pedidos',
  PROYECTO: 'Proyectos',
  COTIZACION: 'Cotizaciones',
  OPORTUNIDAD: 'CRM',
  CATALOGO_EQUIPO: 'Catalogo',
  PERMISO_ACCESO: 'Permisos',
  LISTA_EQUIPO_ITEM: 'Items Lista',
}

const ACCION_LABELS: Record<string, string> = {
  CREAR: 'Creados',
  ACTUALIZAR: 'Editados',
  ELIMINAR: 'Eliminados',
  CAMBIAR_ESTADO: 'Cambios estado',
}

const ACCION_COLORS: Record<string, string> = {
  CREAR: 'text-green-600',
  ACTUALIZAR: 'text-blue-600',
  ELIMINAR: 'text-red-500',
  CAMBIAR_ESTADO: 'text-amber-600',
}

function formatHora(hora: number | null) {
  if (hora === null) return '-'
  const h = hora.toString().padStart(2, '0')
  const hEnd = ((hora + 1) % 24).toString().padStart(2, '0')
  return `${h}:00 - ${hEnd}:00`
}

function getEstadoBadge(estado: string) {
  switch (estado) {
    case 'online_hoy':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
          En linea hoy
        </Badge>
      )
    case 'activo_semana':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
          Activo esta semana
        </Badge>
      )
    case 'inactivo':
      return (
        <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100">
          Inactivo
        </Badge>
      )
    default:
      return <Badge variant="outline">{estado}</Badge>
  }
}

function formatFecha(fecha: string | null) {
  if (!fecha) return 'Nunca'
  try {
    const date = new Date(fecha)
    return formatDistanceToNow(date, { addSuffix: true, locale: es })
  } catch {
    return 'Desconocido'
  }
}

function formatFechaAbsoluta(fecha: string | null) {
  if (!fecha) return 'Sin registro'
  try {
    return format(new Date(fecha), "dd/MM/yyyy HH:mm", { locale: es })
  } catch {
    return 'Desconocido'
  }
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export default function UserActivityDashboard() {
  const [usuarios, setUsuarios] = useState<UsuarioActividad[]>([])
  const [resumen, setResumen] = useState<Resumen>({
    totalUsuarios: 0,
    activosHoy: 0,
    activosSemana: 0,
    inactivos30Dias: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [filtroRol, setFiltroRol] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const cargarDatos = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true)
        else setRefreshing(true)

        const params = new URLSearchParams()
        if (filtroRol !== 'all') params.set('rol', filtroRol)
        if (filtroEstado !== 'all') params.set('estado', filtroEstado)
        if (fechaDesde) params.set('fechaDesde', fechaDesde)
        if (fechaHasta) params.set('fechaHasta', fechaHasta)

        const res = await fetch(
          `/api/configuracion/actividad-usuarios?${params}`,
          { credentials: 'include' }
        )
        if (!res.ok) throw new Error('Error al cargar datos')

        const result = await res.json()
        setUsuarios(result.data || [])
        setResumen(
          result.resumen || {
            totalUsuarios: 0,
            activosHoy: 0,
            activosSemana: 0,
            inactivos30Dias: 0,
          }
        )
      } catch (err) {
        console.error('Error:', err)
        toast.error('Error al cargar actividad de usuarios')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [filtroRol, filtroEstado, fechaDesde, fechaHasta]
  )

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Filtro de búsqueda client-side
  const usuariosFiltrados = busqueda
    ? usuarios.filter(
        u =>
          (u.name || '').toLowerCase().includes(busqueda.toLowerCase()) ||
          u.email.toLowerCase().includes(busqueda.toLowerCase())
      )
    : usuarios

  const hayFiltrosActivos =
    filtroRol !== 'all' ||
    filtroEstado !== 'all' ||
    fechaDesde !== '' ||
    fechaHasta !== ''

  const limpiarFiltros = () => {
    setFiltroRol('all')
    setFiltroEstado('all')
    setBusqueda('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const exportarExcel = () => {
    const data = usuariosFiltrados.map(u => ({
      Nombre: u.name || 'Sin nombre',
      Email: u.email,
      Rol: ROL_LABELS[u.role] || u.role,
      'Ultimo Login': formatFechaAbsoluta(u.lastLoginAt),
      'Ultima Actividad': formatFechaAbsoluta(u.lastActivityAt),
      'Acciones (30 dias)': u.accionesUltimos30Dias,
      'Creados': u.desglose?.CREAR || 0,
      'Editados': u.desglose?.ACTUALIZAR || 0,
      'Eliminados': u.desglose?.ELIMINAR || 0,
      'Secciones Top': u.secciones?.map(s => SECCION_LABELS[s.seccion] || s.seccion).join(', ') || '-',
      'Hora Pico': formatHora(u.horaPico),
      Estado:
        u.estado === 'online_hoy'
          ? 'En linea hoy'
          : u.estado === 'activo_semana'
            ? 'Activo esta semana'
            : 'Inactivo',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    ws['!cols'] = [
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 25 },
      { wch: 15 }, { wch: 20 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Actividad Usuarios')
    XLSX.writeFile(
      wb,
      `actividad-usuarios-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    )
    toast.success('Archivo exportado correctamente')
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          Inicio
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Configuracion</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          Actividad Usuarios
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Actividad de Usuarios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoreo de conexiones y actividad de usuarios en la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarDatos(false)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarExcel}
            disabled={usuariosFiltrados.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Total Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{resumen.totalUsuarios}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-green-600 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              Activos Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-green-600">
              {resumen.activosHoy}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Activos Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {resumen.activosSemana}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-red-500 flex items-center gap-1.5">
              <UserX className="h-3.5 w-3.5" />
              Inactivos 30+ dias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-red-500">
              {resumen.inactivos30Dias}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Collapsible
              open={filtrosAbiertos}
              onOpenChange={setFiltrosAbiertos}
            >
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hayFiltrosActivos && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      Activos
                    </Badge>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Rol
                    </label>
                    <Select value={filtroRol} onValueChange={setFiltroRol}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Todos los roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los roles</SelectItem>
                        {ROLES.map(r => (
                          <SelectItem key={r} value={r}>
                            {ROL_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Estado
                    </label>
                    <Select
                      value={filtroEstado}
                      onValueChange={setFiltroEstado}
                    >
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="online_hoy">
                          En linea hoy
                        </SelectItem>
                        <SelectItem value="activo_semana">
                          Activo esta semana
                        </SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Desde
                    </label>
                    <Input
                      type="date"
                      value={fechaDesde}
                      onChange={e => setFechaDesde(e.target.value)}
                      className="w-[150px] h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Hasta
                    </label>
                    <Input
                      type="date"
                      value={fechaHasta}
                      onChange={e => setFechaHasta(e.target.value)}
                      className="w-[150px] h-9"
                    />
                  </div>
                  {hayFiltrosActivos && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={limpiarFiltros}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mb-2" />
              <p className="font-medium">No se encontraron usuarios</p>
              <p className="text-sm">
                Intenta ajustar los filtros de busqueda
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="min-w-[200px]">Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Ultimo Login</TableHead>
                    <TableHead>Ultima Actividad</TableHead>
                    <TableHead className="text-center">
                      Acciones (30d)
                    </TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map(usuario => {
                    const isExpanded = expandedUser === usuario.id
                    const hasDetail = usuario.accionesUltimos30Dias > 0
                    return (
                      <React.Fragment key={usuario.id}>
                        <TableRow
                          className={hasDetail ? 'cursor-pointer hover:bg-muted/50' : ''}
                          onClick={() => hasDetail && setExpandedUser(isExpanded ? null : usuario.id)}
                        >
                          <TableCell className="w-8 px-2">
                            {hasDetail && (
                              isExpanded
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(usuario.name, usuario.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {usuario.name || 'Sin nombre'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {usuario.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ROL_LABELS[usuario.role] || usuario.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div
                              className="text-sm flex items-center gap-1.5"
                              title={formatFechaAbsoluta(usuario.lastLoginAt)}
                            >
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatFecha(usuario.lastLoginAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="text-sm flex items-center gap-1.5"
                              title={formatFechaAbsoluta(usuario.lastActivityAt)}
                            >
                              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatFecha(usuario.lastActivityAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-sm">
                              {usuario.accionesUltimos30Dias}
                            </span>
                          </TableCell>
                          <TableCell>{getEstadoBadge(usuario.estado)}</TableCell>
                        </TableRow>
                        {/* Fila expandible con detalle */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={7} className="p-0">
                              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Secciones más usadas */}
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Secciones mas usadas
                                  </h4>
                                  {usuario.secciones && usuario.secciones.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {usuario.secciones.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                          <span className="text-sm">
                                            {SECCION_LABELS[s.seccion] || s.seccion}
                                          </span>
                                          <Badge variant="secondary" className="text-[10px] h-5">
                                            {s.count}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin datos</p>
                                  )}
                                </div>
                                {/* Tipo de acciones */}
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <Activity className="h-3.5 w-3.5" />
                                    Tipo de acciones
                                  </h4>
                                  {usuario.desglose && Object.keys(usuario.desglose).length > 0 ? (
                                    <div className="space-y-1.5">
                                      {Object.entries(usuario.desglose).map(([accion, count]) => (
                                        <div key={accion} className="flex items-center justify-between">
                                          <span className={`text-sm ${ACCION_COLORS[accion] || ''}`}>
                                            {ACCION_LABELS[accion] || accion}
                                          </span>
                                          <span className="font-mono text-sm">{count}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin datos</p>
                                  )}
                                </div>
                                {/* Horario de uso */}
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Horario de uso
                                  </h4>
                                  {usuario.horaPico !== null ? (
                                    <div>
                                      <div className="text-sm mb-2">
                                        Hora pico: <span className="font-semibold">{formatHora(usuario.horaPico)}</span>
                                      </div>
                                      {usuario.horasActividad && (
                                        <div className="flex items-end gap-px h-10">
                                          {usuario.horasActividad.slice(6, 22).map((count, i) => {
                                            const hora = i + 6
                                            const max = Math.max(...usuario.horasActividad!.slice(6, 22))
                                            const height = max > 0 ? (count / max) * 100 : 0
                                            return (
                                              <div
                                                key={hora}
                                                className="flex-1 group relative"
                                                title={`${hora}:00 - ${count} acciones`}
                                              >
                                                <div
                                                  className={`w-full rounded-t-sm ${
                                                    hora === usuario.horaPico
                                                      ? 'bg-primary'
                                                      : 'bg-primary/30'
                                                  }`}
                                                  style={{ height: `${Math.max(height, 2)}%` }}
                                                />
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                      {usuario.horasActividad && (
                                        <div className="flex justify-between mt-0.5">
                                          <span className="text-[9px] text-muted-foreground">6am</span>
                                          <span className="text-[9px] text-muted-foreground">2pm</span>
                                          <span className="text-[9px] text-muted-foreground">10pm</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin datos</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer con conteo */}
      {!loading && usuariosFiltrados.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          Mostrando {usuariosFiltrados.length} de {resumen.totalUsuarios}{' '}
          usuarios
        </div>
      )}
    </div>
  )
}
