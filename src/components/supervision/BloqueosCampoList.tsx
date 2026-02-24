'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Download,
  Home,
  ChevronRight,
  ChevronDown,
  X,
  Filter,
  AlertTriangle,
  FolderOpen,
  BarChart3,
  List,
  LayoutGrid,
  Clock,
  User,
  MapPin,
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

interface Bloqueo {
  tipoBloqueoNombre: string
  descripcion: string
  impacto: string | null
  accion: string | null
  jornadaId: string
  fechaTrabajo: string
  estadoJornada: string
  proyectoId: string
  proyectoNombre: string
  supervisorId: string
  supervisorNombre: string
}

interface Resumen {
  totalBloqueos: number
  proyectosAfectados: number
  tipoMasFrecuente: { nombre: string; count: number } | null
  conImpacto: number
}

interface FiltrosDisponibles {
  tipos: string[]
  proyectos: Array<{ id: string; nombre: string }>
  supervisores: Array<{ id: string; nombre: string }>
}

const ESTADO_LABELS: Record<string, string> = {
  iniciado: 'Iniciado',
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

const ESTADO_COLORS: Record<string, string> = {
  iniciado: 'bg-gray-100 text-gray-600 border-gray-200',
  pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
  aprobado: 'bg-green-100 text-green-700 border-green-200',
  rechazado: 'bg-red-100 text-red-600 border-red-200',
}

function formatFecha(fecha: string) {
  try {
    return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es })
  } catch {
    return 'Desconocido'
  }
}

function formatFechaAbsoluta(fecha: string) {
  try {
    return format(new Date(fecha), 'dd/MM/yyyy', { locale: es })
  } catch {
    return 'Desconocido'
  }
}

export default function BloqueosCampoList() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [resumen, setResumen] = useState<Resumen>({
    totalBloqueos: 0,
    proyectosAfectados: 0,
    tipoMasFrecuente: null,
    conImpacto: 0,
  })
  const [filtrosDisponibles, setFiltrosDisponibles] = useState<FiltrosDisponibles>({
    tipos: [],
    proyectos: [],
    supervisores: [],
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [vista, setVista] = useState<'tabla' | 'cards'>('tabla')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Filtros
  const [filtroProyecto, setFiltroProyecto] = useState('all')
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroSupervisor, setFiltroSupervisor] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [conImpacto, setConImpacto] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  const cargarDatos = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true)
        else setRefreshing(true)

        const params = new URLSearchParams()
        if (filtroProyecto !== 'all') params.set('proyectoId', filtroProyecto)
        if (filtroTipo !== 'all') params.set('tipoBloqueo', filtroTipo)
        if (filtroSupervisor !== 'all') params.set('supervisorId', filtroSupervisor)
        if (filtroEstado !== 'all') params.set('estado', filtroEstado)
        if (fechaDesde) params.set('fechaDesde', fechaDesde)
        if (fechaHasta) params.set('fechaHasta', fechaHasta)
        if (busqueda) params.set('busqueda', busqueda)
        if (conImpacto) params.set('conImpacto', 'true')

        const res = await fetch(`/api/supervision/bloqueos-campo?${params}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Error al cargar datos')

        const result = await res.json()
        setBloqueos(result.data || [])
        setResumen(result.resumen || { totalBloqueos: 0, proyectosAfectados: 0, tipoMasFrecuente: null, conImpacto: 0 })
        setFiltrosDisponibles(result.filtros || { tipos: [], proyectos: [], supervisores: [] })
      } catch (err) {
        console.error('Error:', err)
        toast.error('Error al cargar bloqueos')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [filtroProyecto, filtroTipo, filtroSupervisor, filtroEstado, fechaDesde, fechaHasta, busqueda, conImpacto]
  )

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const hayFiltrosActivos =
    filtroProyecto !== 'all' || filtroTipo !== 'all' || filtroSupervisor !== 'all' ||
    filtroEstado !== 'all' || fechaDesde !== '' || fechaHasta !== '' || conImpacto

  const limpiarFiltros = () => {
    setFiltroProyecto('all')
    setFiltroTipo('all')
    setFiltroSupervisor('all')
    setFiltroEstado('all')
    setFechaDesde('')
    setFechaHasta('')
    setBusqueda('')
    setConImpacto(false)
  }

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const exportarExcel = () => {
    const data = bloqueos.map(b => ({
      Fecha: formatFechaAbsoluta(b.fechaTrabajo),
      Proyecto: b.proyectoNombre,
      'Tipo Bloqueo': b.tipoBloqueoNombre,
      Descripcion: b.descripcion,
      Impacto: b.impacto || '-',
      Accion: b.accion || '-',
      Supervisor: b.supervisorNombre,
      'Estado Jornada': ESTADO_LABELS[b.estadoJornada] || b.estadoJornada,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 50 },
      { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Bloqueos Campo')
    XLSX.writeFile(wb, `bloqueos-campo-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    toast.success('Archivo exportado correctamente')
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
          Inicio
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Supervision</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Bloqueos Campo</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bloqueos de Campo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Listado consolidado de bloqueos reportados en jornadas de campo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={vista === 'tabla' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none h-8 px-2"
              onClick={() => setVista('tabla')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={vista === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none h-8 px-2"
              onClick={() => setVista('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => cargarDatos(false)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportarExcel} disabled={bloqueos.length === 0}>
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
              <ShieldAlert className="h-3.5 w-3.5" />
              Total Bloqueos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{resumen.totalBloqueos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-amber-600 flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              Proyectos Afectados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">{resumen.proyectosAfectados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Tipo Mas Frecuente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {resumen.tipoMasFrecuente ? (
              <div>
                <div className="text-sm font-bold text-blue-600">{resumen.tipoMasFrecuente.nombre}</div>
                <div className="text-xs text-muted-foreground">{resumen.tipoMasFrecuente.count} veces</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-red-500 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Con Impacto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-red-500">{resumen.conImpacto}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en descripcion, impacto, accion, proyecto..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Collapsible open={filtrosAbiertos} onOpenChange={setFiltrosAbiertos}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hayFiltrosActivos && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">Activos</Badge>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
                    <Select value={filtroProyecto} onValueChange={setFiltroProyecto}>
                      <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los proyectos</SelectItem>
                        {filtrosDisponibles.proyectos.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Tipo Bloqueo</label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        {filtrosDisponibles.tipos.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Supervisor</label>
                    <Select value={filtroSupervisor} onValueChange={setFiltroSupervisor}>
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {filtrosDisponibles.supervisores.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Estado Jornada</label>
                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger className="w-[150px] h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Desde</label>
                    <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-[150px] h-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                    <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-[150px] h-9" />
                  </div>
                  <Button
                    variant={conImpacto ? 'default' : 'outline'}
                    size="sm"
                    className="h-9"
                    onClick={() => setConImpacto(!conImpacto)}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    Solo con impacto
                  </Button>
                  {hayFiltrosActivos && (
                    <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground">
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

      {/* Contenido */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando...</span>
          </CardContent>
        </Card>
      ) : bloqueos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShieldAlert className="h-10 w-10 mb-2" />
            <p className="font-medium">No se encontraron bloqueos</p>
            <p className="text-sm">Intenta ajustar los filtros de busqueda</p>
          </CardContent>
        </Card>
      ) : vista === 'tabla' ? (
        /* Vista Tabla */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Tipo Bloqueo</TableHead>
                    <TableHead className="min-w-[250px]">Descripcion</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bloqueos.map((b, idx) => {
                    const isExpanded = expandedRows.has(idx)
                    const isLong = b.descripcion.length > 100
                    return (
                      <TableRow key={idx}>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm" title={formatFechaAbsoluta(b.fechaTrabajo)}>
                            {formatFechaAbsoluta(b.fechaTrabajo)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatFecha(b.fechaTrabajo)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium max-w-[180px] truncate" title={b.proyectoNombre}>
                            {b.proyectoNombre}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs whitespace-nowrap">
                            {b.tipoBloqueoNombre}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {isLong && !isExpanded
                              ? b.descripcion.slice(0, 100) + '...'
                              : b.descripcion}
                            {isLong && (
                              <button
                                onClick={() => toggleRow(idx)}
                                className="text-primary text-xs ml-1 hover:underline"
                              >
                                {isExpanded ? 'ver menos' : 'ver mas'}
                              </button>
                            )}
                          </div>
                          {b.accion && (
                            <div className="text-xs text-blue-600 mt-1">
                              Accion: {b.accion}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {b.impacto ? (
                            <span className="text-sm text-red-600">{b.impacto}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-nowrap">{b.supervisorNombre}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${ESTADO_COLORS[b.estadoJornada] || ''} hover:${ESTADO_COLORS[b.estadoJornada] || ''}`}>
                            {ESTADO_LABELS[b.estadoJornada] || b.estadoJornada}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Vista Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {bloqueos.map((b, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div className="bg-amber-50 px-4 py-2 flex items-center justify-between border-b border-amber-100">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">
                  {b.tipoBloqueoNombre}
                </Badge>
                <Badge className={`text-[10px] ${ESTADO_COLORS[b.estadoJornada] || ''}`}>
                  {ESTADO_LABELS[b.estadoJornada] || b.estadoJornada}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm leading-relaxed">{b.descripcion}</p>
                {b.impacto && (
                  <div className="flex items-start gap-2 text-sm bg-red-50 p-2 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-red-700">{b.impacto}</span>
                  </div>
                )}
                {b.accion && (
                  <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded-md">
                    <span className="font-medium">Accion:</span> {b.accion}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {b.proyectoNombre}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatFechaAbsoluta(b.fechaTrabajo)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {b.supervisorNombre}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && bloqueos.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          Mostrando {bloqueos.length} bloqueo{bloqueos.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
