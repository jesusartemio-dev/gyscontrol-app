// ===================================================
// 🎯 DASHBOARD DE ACTIVIDAD DEL SISTEMA
// ===================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  Activity,
  Users,
  Building2,
  TrendingUp,
  Clock,
  RefreshCw,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  ChevronDown,
  FileText,
  Package
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
// 🎨 HELPERS
// ===================================================

const getEntityIcon = (entidadTipo: string) => {
  const icons: Record<string, React.ReactElement> = {
    'LISTA_EQUIPO': <Package className="w-3.5 h-3.5 text-blue-500" />,
    'PEDIDO_EQUIPO': <FileText className="w-3.5 h-3.5 text-green-500" />,
    'PROYECTO': <Building2 className="w-3.5 h-3.5 text-purple-500" />,
    'COTIZACION': <FileText className="w-3.5 h-3.5 text-orange-500" />,
    'OPORTUNIDAD': <TrendingUp className="w-3.5 h-3.5 text-red-500" />
  }
  return icons[entidadTipo] || <Activity className="w-3.5 h-3.5 text-gray-500" />
}

const getEntityColor = (entidadTipo: string) => {
  const colors: Record<string, string> = {
    'LISTA_EQUIPO': 'bg-blue-50 text-blue-700 border-blue-200',
    'PEDIDO_EQUIPO': 'bg-green-50 text-green-700 border-green-200',
    'PROYECTO': 'bg-purple-50 text-purple-700 border-purple-200',
    'COTIZACION': 'bg-orange-50 text-orange-700 border-orange-200',
    'OPORTUNIDAD': 'bg-red-50 text-red-700 border-red-200'
  }
  return colors[entidadTipo] || 'bg-gray-50 text-gray-700 border-gray-200'
}

const getEntityLabel = (entidadTipo: string) => {
  const labels: Record<string, string> = {
    'LISTA_EQUIPO': 'Lista',
    'PEDIDO_EQUIPO': 'Pedido',
    'PROYECTO': 'Proyecto',
    'COTIZACION': 'Cotización',
    'OPORTUNIDAD': 'Oportunidad',
    'LISTA_EQUIPO_ITEM': 'Ítem'
  }
  return labels[entidadTipo] || entidadTipo.replace(/_/g, ' ')
}

const getEntityLink = (entidadTipo: string, entidadId: string): string | null => {
  const links: Record<string, string> = {
    'PROYECTO': `/proyectos/${entidadId}`,
    'COTIZACION': `/comercial/cotizaciones/${entidadId}`,
    'OPORTUNIDAD': `/crm/oportunidades/${entidadId}`,
    'LISTA_EQUIPO': `/proyectos/listas/${entidadId}`,
    'PEDIDO_EQUIPO': `/proyectos/pedidos/${entidadId}`
  }
  return links[entidadTipo] || null
}

const getActionColor = (accion: string) => {
  const colors: Record<string, string> = {
    'CREAR': 'bg-green-500',
    'ACTUALIZAR': 'bg-blue-500',
    'ELIMINAR': 'bg-red-500',
    'CAMBIAR_ESTADO': 'bg-purple-500'
  }
  return colors[accion] || 'bg-gray-500'
}

const getActionLabel = (accion: string) => {
  const labels: Record<string, string> = {
    'CREAR': 'Crear',
    'ACTUALIZAR': 'Actualizar',
    'ELIMINAR': 'Eliminar',
    'CAMBIAR_ESTADO': 'Cambio Estado'
  }
  return labels[accion] || accion
}

const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return format(date, 'dd/MM/yy HH:mm', { locale: es })
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
  const [actividad, setActividad] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState<string>('all')
  const [filtroEntidad, setFiltroEntidad] = useState<string>('all')
  const [filtroAccion, setFiltroAccion] = useState<string>('all')
  const [busqueda, setBusqueda] = useState<string>('')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [meta, setMeta] = useState<MetaPaginacion>({ pagina: 1, limite, total: 0, totalPaginas: 0 })
  const [filtrosDisponibles, setFiltrosDisponibles] = useState<FiltrosDisponibles>({ usuarios: [], entidades: [], acciones: [] })

  // Config
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

      const params = new URLSearchParams({ limite: limite.toString(), pagina: paginaActual.toString() })
      if (filtroUsuario !== 'all') params.set('usuarioId', filtroUsuario)
      if (filtroEntidad !== 'all') params.set('entidadTipo', filtroEntidad)
      if (filtroAccion !== 'all') params.set('accion', filtroAccion)
      if (busqueda) params.set('busqueda', busqueda)
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)

      const response = await fetch(`/api/audit/actividad-reciente?${params}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Error al cargar actividad')

      const result = await response.json()
      setActividad(result.data || [])
      setMeta(result.meta || { pagina: 1, limite, total: 0, totalPaginas: 0 })
      setFiltrosDisponibles(result.filtros || { usuarios: [], entidades: [], acciones: [] })
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar la actividad')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [limite, paginaActual, filtroUsuario, filtroEntidad, filtroAccion, busqueda, fechaDesde, fechaHasta])

  useEffect(() => { cargarActividad() }, [cargarActividad])

  useEffect(() => {
    if (!autoRefreshEnabled) return
    const interval = setInterval(() => cargarActividad(false), intervaloActual * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefreshEnabled, intervaloActual, cargarActividad])

  // ===================================================
  // 🎮 HANDLERS
  // ===================================================

  const handleLimpiarFiltros = () => {
    setFiltroUsuario('all')
    setFiltroEntidad('all')
    setFiltroAccion('all')
    setBusqueda('')
    setFechaDesde('')
    setFechaHasta('')
    setPaginaActual(1)
  }

  const handleExportar = () => {
    const data = actividad.map(e => ({
      'Fecha': formatDate(e.createdAt),
      'Usuario': e.usuario?.name || 'Desconocido',
      'Acción': getActionLabel(e.accion),
      'Entidad': getEntityLabel(e.entidadTipo),
      'Descripción': e.descripcion
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Actividad')
    XLSX.writeFile(wb, `actividad_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  const hayFiltrosActivos = filtroUsuario !== 'all' || filtroEntidad !== 'all' ||
    filtroAccion !== 'all' || busqueda || fechaDesde || fechaHasta

  const contadorFiltros = [filtroUsuario !== 'all', filtroEntidad !== 'all', filtroAccion !== 'all', busqueda, fechaDesde, fechaHasta].filter(Boolean).length

  // ===================================================
  // 🎨 RENDERIZADO
  // ===================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <Activity className="w-4 h-4 mr-2" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Actividad del Sistema</h2>
          <Badge variant="secondary" className="text-xs">{meta.total}</Badge>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Auto-refresh */}
          <Select
            value={autoRefreshEnabled ? intervaloActual.toString() : 'off'}
            onValueChange={(v) => {
              if (v === 'off') {
                setAutoRefreshEnabled(false)
              } else {
                setAutoRefreshEnabled(true)
                setIntervaloActual(parseInt(v))
              }
            }}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Manual</SelectItem>
              <SelectItem value="1">1 min</SelectItem>
              <SelectItem value="2">2 min</SelectItem>
              <SelectItem value="5">5 min</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportar}>
            <Download className="w-3 h-3 mr-1" />
            Excel
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => cargarActividad(false)} disabled={refreshing}>
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats compactos */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Eventos', value: meta.total, icon: Activity },
          { label: 'Entidades', value: filtrosDisponibles.entidades.length, icon: Building2 },
          { label: 'Usuarios', value: filtrosDisponibles.usuarios.length, icon: Users },
          { label: 'Acciones', value: filtrosDisponibles.acciones.length, icon: TrendingUp }
        ].map((stat, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      {/* Filtros colapsables */}
      {mostrarFiltros && (
        <Collapsible open={filtrosAbiertos} onOpenChange={setFiltrosAbiertos}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`} />
                Filtros
                {contadorFiltros > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{contadorFiltros}</Badge>
                )}
              </Button>
            </CollapsibleTrigger>

            {/* Búsqueda rápida siempre visible */}
            <div className="flex-1 max-w-xs relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1) }}
                className="h-8 text-xs pl-7"
              />
            </div>

            {hayFiltrosActivos && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleLimpiarFiltros}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <CollapsibleContent>
            <Card className="mt-2 p-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Select value={filtroUsuario} onValueChange={(v) => { setFiltroUsuario(v); setPaginaActual(1) }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filtrosDisponibles.usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name || 'Sin nombre'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroEntidad} onValueChange={(v) => { setFiltroEntidad(v); setPaginaActual(1) }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Entidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filtrosDisponibles.entidades.map((e) => (
                      <SelectItem key={e} value={e}>{getEntityLabel(e)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroAccion} onValueChange={(v) => { setFiltroAccion(v); setPaginaActual(1) }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Acción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filtrosDisponibles.acciones.map((a) => (
                      <SelectItem key={a} value={a}>{getActionLabel(a)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => { setFechaDesde(e.target.value); setPaginaActual(1) }}
                  className="h-8 text-xs"
                  placeholder="Desde"
                />

                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => { setFechaHasta(e.target.value); setPaginaActual(1) }}
                  className="h-8 text-xs"
                  placeholder="Hasta"
                />
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Lista de actividad */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Actividad Reciente</CardTitle>
          <CardDescription className="text-xs">
            {actividad.length} de {meta.total} • Pág. {meta.pagina}/{meta.totalPaginas || 1}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {actividad.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Sin actividad</p>
              {hayFiltrosActivos && (
                <Button variant="link" size="sm" onClick={handleLimpiarFiltros} className="text-xs mt-1">
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {actividad.map((evento, idx) => {
                  const link = getEntityLink(evento.entidadTipo, evento.entidadId)
                  return (
                    <motion.div
                      key={evento.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      {/* Indicador de acción */}
                      <div className={`w-1.5 h-1.5 rounded-full ${getActionColor(evento.accion)}`} />

                      {/* Icono entidad */}
                      {getEntityIcon(evento.entidadTipo)}

                      {/* Contenido principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${getEntityColor(evento.entidadTipo)}`}>
                            {getEntityLabel(evento.entidadTipo)}
                          </Badge>
                          <span className="text-xs truncate">{evento.descripcion}</span>
                          {link && (
                            <Link href={link} className="text-primary hover:underline flex-shrink-0">
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-[8px]">
                              {evento.usuario?.name?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-muted-foreground">{evento.usuario?.name || 'Desconocido'}</span>
                        </div>
                      </div>

                      {/* Tiempo */}
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap" title={formatDate(evento.createdAt)}>
                        {formatRelativeTime(evento.createdAt)}
                      </span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Paginación */}
          {meta.totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
              <span className="text-[10px] text-muted-foreground">
                Pág. {meta.pagina} de {meta.totalPaginas}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual <= 1}
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>

                {Array.from({ length: Math.min(5, meta.totalPaginas) }, (_, i) => {
                  let num: number
                  if (meta.totalPaginas <= 5) num = i + 1
                  else if (paginaActual <= 3) num = i + 1
                  else if (paginaActual >= meta.totalPaginas - 2) num = meta.totalPaginas - 4 + i
                  else num = paginaActual - 2 + i

                  return (
                    <Button
                      key={num}
                      variant={num === paginaActual ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 w-6 p-0 text-[10px]"
                      onClick={() => setPaginaActual(num)}
                    >
                      {num}
                    </Button>
                  )
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setPaginaActual(p => Math.min(meta.totalPaginas, p + 1))}
                  disabled={paginaActual >= meta.totalPaginas}
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
