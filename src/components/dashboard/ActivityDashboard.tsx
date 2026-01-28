// ===================================================
// 🎯 DASHBOARD DE ACTIVIDAD DEL SISTEMA
// ===================================================
// Componente que muestra la actividad reciente con filtros,
// paginación, búsqueda y exportación
// ===================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  Activity,
  Users,
  FileText,
  Package,
  Building2,
  TrendingUp,
  Clock,
  Calendar,
  RefreshCw,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { AuditLog } from '@/types/modelos'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ActivityDashboardProps {
  limite?: number
  autoRefresh?: boolean
  intervaloRefresh?: number
  mostrarFiltros?: boolean
}

interface FiltrosDisponibles {
  usuarios: Array<{ id: string; name: string | null }>
  entidades: string[]
  acciones: string[]
}

interface MetaPaginacion {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

// ===================================================
// 🎨 ICONOS Y ESTILOS POR TIPO DE ENTIDAD
// ===================================================

const getEntityIcon = (entidadTipo: string) => {
  switch (entidadTipo) {
    case 'LISTA_EQUIPO':
      return <Package className="w-4 h-4 text-blue-500" />
    case 'PEDIDO_EQUIPO':
      return <FileText className="w-4 h-4 text-green-500" />
    case 'PROYECTO':
      return <Building2 className="w-4 h-4 text-purple-500" />
    case 'COTIZACION':
      return <FileText className="w-4 h-4 text-orange-500" />
    case 'OPORTUNIDAD':
      return <TrendingUp className="w-4 h-4 text-red-500" />
    default:
      return <Activity className="w-4 h-4 text-gray-500" />
  }
}

const getEntityColor = (entidadTipo: string) => {
  switch (entidadTipo) {
    case 'LISTA_EQUIPO':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    case 'PEDIDO_EQUIPO':
      return 'bg-green-50 border-green-200 text-green-800'
    case 'PROYECTO':
      return 'bg-purple-50 border-purple-200 text-purple-800'
    case 'COTIZACION':
      return 'bg-orange-50 border-orange-200 text-orange-800'
    case 'OPORTUNIDAD':
      return 'bg-red-50 border-red-200 text-red-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

const getEntityLabel = (entidadTipo: string) => {
  const labels: Record<string, string> = {
    'LISTA_EQUIPO': 'Lista de Equipo',
    'PEDIDO_EQUIPO': 'Pedido de Equipo',
    'PROYECTO': 'Proyecto',
    'COTIZACION': 'Cotización',
    'OPORTUNIDAD': 'Oportunidad',
    'LISTA_EQUIPO_ITEM': 'Ítem de Lista'
  }
  return labels[entidadTipo] || entidadTipo.replace(/_/g, ' ')
}

const getEntityLink = (entidadTipo: string, entidadId: string): string | null => {
  switch (entidadTipo) {
    case 'PROYECTO':
      return `/proyectos/${entidadId}`
    case 'COTIZACION':
      return `/comercial/cotizaciones/${entidadId}`
    case 'OPORTUNIDAD':
      return `/crm/oportunidades/${entidadId}`
    case 'LISTA_EQUIPO':
      return `/proyectos/listas/${entidadId}`
    case 'PEDIDO_EQUIPO':
      return `/proyectos/pedidos/${entidadId}`
    default:
      return null
  }
}

const getActionIcon = (accion: string) => {
  const colors: Record<string, string> = {
    'CREAR': 'bg-green-500',
    'ACTUALIZAR': 'bg-blue-500',
    'ELIMINAR': 'bg-red-500',
    'CAMBIAR_ESTADO': 'bg-purple-500'
  }
  return <div className={`w-2 h-2 ${colors[accion] || 'bg-gray-500'} rounded-full`}></div>
}

const getActionLabel = (accion: string) => {
  const labels: Record<string, string> = {
    'CREAR': 'Crear',
    'ACTUALIZAR': 'Actualizar',
    'ELIMINAR': 'Eliminar',
    'CAMBIAR_ESTADO': 'Cambio de Estado'
  }
  return labels[accion] || accion
}

// ===================================================
// 📅 FORMATEADORES DE FECHA
// ===================================================

const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return format(date, 'dd/MM/yyyy HH:mm', { locale: es })
}

const formatRelativeTime = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return formatDistanceToNow(date, { addSuffix: true, locale: es })
}

// ===================================================
// 🔍 COMPONENTE PRINCIPAL
// ===================================================

export default function ActivityDashboard({
  limite = 20,
  autoRefresh = false,
  intervaloRefresh = 5,
  mostrarFiltros = true
}: ActivityDashboardProps) {
  // Estado principal
  const [actividad, setActividad] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Estado de filtros
  const [filtroUsuario, setFiltroUsuario] = useState<string>('all')
  const [filtroEntidad, setFiltroEntidad] = useState<string>('all')
  const [filtroAccion, setFiltroAccion] = useState<string>('all')
  const [busqueda, setBusqueda] = useState<string>('')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')

  // Estado de paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [meta, setMeta] = useState<MetaPaginacion>({
    pagina: 1,
    limite: limite,
    total: 0,
    totalPaginas: 0
  })

  // Filtros disponibles desde la API
  const [filtrosDisponibles, setFiltrosDisponibles] = useState<FiltrosDisponibles>({
    usuarios: [],
    entidades: [],
    acciones: []
  })

  // Estado de configuración
  const [intervaloActual, setIntervaloActual] = useState(intervaloRefresh)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh)

  // ===================================================
  // 📡 CARGA DE DATOS
  // ===================================================

  const cargarActividad = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)
      setError(null)

      const params = new URLSearchParams({
        limite: limite.toString(),
        pagina: paginaActual.toString()
      })

      if (filtroUsuario && filtroUsuario !== 'all') params.set('usuarioId', filtroUsuario)
      if (filtroEntidad && filtroEntidad !== 'all') params.set('entidadTipo', filtroEntidad)
      if (filtroAccion && filtroAccion !== 'all') params.set('accion', filtroAccion)
      if (busqueda) params.set('busqueda', busqueda)
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)

      const response = await fetch(`/api/audit/actividad-reciente?${params}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Error al cargar actividad: ${response.statusText}`)
      }

      const result = await response.json()
      setActividad(result.data || [])
      setMeta(result.meta || { pagina: 1, limite, total: 0, totalPaginas: 0 })
      setFiltrosDisponibles(result.filtros || { usuarios: [], entidades: [], acciones: [] })
    } catch (err) {
      console.error('Error al cargar actividad:', err)
      setError('Error al cargar la actividad del sistema')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [limite, paginaActual, filtroUsuario, filtroEntidad, filtroAccion, busqueda, fechaDesde, fechaHasta])

  // Cargar datos inicial y cuando cambian los filtros
  useEffect(() => {
    cargarActividad()
  }, [cargarActividad])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      cargarActividad(false)
    }, intervaloActual * 60 * 1000)

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, intervaloActual, cargarActividad])

  // ===================================================
  // 🎮 HANDLERS
  // ===================================================

  const handleRefresh = () => cargarActividad(false)

  const handleLimpiarFiltros = () => {
    setFiltroUsuario('all')
    setFiltroEntidad('all')
    setFiltroAccion('all')
    setBusqueda('')
    setFechaDesde('')
    setFechaHasta('')
    setPaginaActual(1)
  }

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    setPaginaActual(1)
    cargarActividad()
  }

  const handleExportar = () => {
    const data = actividad.map(evento => ({
      'Fecha': formatDate(evento.createdAt),
      'Usuario': evento.usuario?.name || 'Desconocido',
      'Acción': getActionLabel(evento.accion),
      'Entidad': getEntityLabel(evento.entidadTipo),
      'ID Entidad': evento.entidadId,
      'Descripción': evento.descripcion
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Actividad')
    XLSX.writeFile(workbook, `actividad_sistema_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  // ===================================================
  // 📊 ESTADÍSTICAS
  // ===================================================

  const estadisticas = actividad.reduce((acc, item) => {
    acc.entidades[item.entidadTipo] = (acc.entidades[item.entidadTipo] || 0) + 1
    acc.acciones[item.accion] = (acc.acciones[item.accion] || 0) + 1
    if (item.usuario?.name) {
      acc.usuarios[item.usuario.name] = (acc.usuarios[item.usuario.name] || 0) + 1
    }
    return acc
  }, {
    entidades: {} as Record<string, number>,
    acciones: {} as Record<string, number>,
    usuarios: {} as Record<string, number>
  })

  const hayFiltrosActivos = filtroUsuario !== 'all' || filtroEntidad !== 'all' ||
    filtroAccion !== 'all' || busqueda || fechaDesde || fechaHasta

  // ===================================================
  // 🎨 RENDERIZADO
  // ===================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Cargando actividad del sistema...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <Activity className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Actividad del Sistema</h2>
            <p className="text-muted-foreground text-sm">
              {meta.total} eventos registrados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-refresh toggle */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Clock className="w-4 h-4 mr-2" />
                {autoRefreshEnabled ? `Auto (${intervaloActual}m)` : 'Manual'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Auto-refresh</Label>
                  <Button
                    variant={autoRefreshEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  >
                    {autoRefreshEnabled ? 'Activado' : 'Desactivado'}
                  </Button>
                </div>
                {autoRefreshEnabled && (
                  <div className="space-y-2">
                    <Label>Intervalo (minutos)</Label>
                    <Select
                      value={intervaloActual.toString()}
                      onValueChange={(v) => setIntervaloActual(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minuto</SelectItem>
                        <SelectItem value="2">2 minutos</SelectItem>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleExportar}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.total}</div>
            <p className="text-xs text-muted-foreground">
              Página {meta.pagina} de {meta.totalPaginas}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(estadisticas.entidades).length}</div>
            <p className="text-xs text-muted-foreground">Tipos diferentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(estadisticas.usuarios).length}</div>
            <p className="text-xs text-muted-foreground">Han realizado acciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(estadisticas.acciones).length}</div>
            <p className="text-xs text-muted-foreground">Tipos de operaciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
              {hayFiltrosActivos && (
                <Button variant="ghost" size="sm" onClick={handleLimpiarFiltros}>
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBuscar} className="space-y-4">
              {/* Búsqueda */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit">Buscar</Button>
              </div>

              {/* Selectores de filtro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <Select value={filtroUsuario} onValueChange={(v) => { setFiltroUsuario(v); setPaginaActual(1) }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los usuarios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      {filtrosDisponibles.usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || 'Sin nombre'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Entidad</Label>
                  <Select value={filtroEntidad} onValueChange={(v) => { setFiltroEntidad(v); setPaginaActual(1) }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las entidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las entidades</SelectItem>
                      {filtrosDisponibles.entidades.map((e) => (
                        <SelectItem key={e} value={e}>
                          {getEntityLabel(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Acción</Label>
                  <Select value={filtroAccion} onValueChange={(v) => { setFiltroAccion(v); setPaginaActual(1) }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las acciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las acciones</SelectItem>
                      {filtrosDisponibles.acciones.map((a) => (
                        <SelectItem key={a} value={a}>
                          {getActionLabel(a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rango de fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Desde
                  </Label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => { setFechaDesde(e.target.value); setPaginaActual(1) }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Hasta
                  </Label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => { setFechaHasta(e.target.value); setPaginaActual(1) }}
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de actividad */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Mostrando {actividad.length} de {meta.total} eventos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actividad.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay actividad registrada</p>
                {hayFiltrosActivos && (
                  <Button variant="link" onClick={handleLimpiarFiltros} className="mt-2">
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {actividad.map((evento, index) => {
                  const entityLink = getEntityLink(evento.entidadTipo, evento.entidadId)

                  return (
                    <motion.div
                      key={evento.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* Indicador de acción */}
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(evento.accion)}
                      </div>

                      {/* Icono de entidad */}
                      <div className="flex-shrink-0">
                        {getEntityIcon(evento.entidadTipo)}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getEntityColor(evento.entidadTipo)}`}
                            >
                              {getEntityLabel(evento.entidadTipo)}
                            </Badge>
                            <span className="text-sm font-medium">{evento.descripcion}</span>

                            {/* Link a la entidad */}
                            {entityLink && (
                              <Link href={entityLink} className="text-primary hover:underline">
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span title={formatDate(evento.createdAt)}>
                              {formatRelativeTime(evento.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Usuario */}
                        <div className="flex items-center space-x-2 mt-2">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-xs">
                              {evento.usuario?.name?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {evento.usuario?.name || 'Usuario desconocido'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Paginación */}
          {meta.totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Página {meta.pagina} de {meta.totalPaginas}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>

                {/* Números de página */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, meta.totalPaginas) }, (_, i) => {
                    let pageNum: number
                    if (meta.totalPaginas <= 5) {
                      pageNum = i + 1
                    } else if (paginaActual <= 3) {
                      pageNum = i + 1
                    } else if (paginaActual >= meta.totalPaginas - 2) {
                      pageNum = meta.totalPaginas - 4 + i
                    } else {
                      pageNum = paginaActual - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === paginaActual ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPaginaActual(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.min(meta.totalPaginas, p + 1))}
                  disabled={paginaActual >= meta.totalPaginas}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
