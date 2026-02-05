'use client'

/**
 * Página de Registro de Horas en Campo
 * Permite a supervisores/coordinadores registrar horas de cuadrilla
 * Con vista de tabla (default) y cards, filtros y mejor UX
 */

import React, { useState, useEffect, useMemo } from 'react'
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
  MapPin,
  Plus,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  Loader2,
  RefreshCw,
  LayoutGrid,
  List,
  Search,
  Filter,
  X,
  ChevronDown,
  FolderOpen
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RegistroCampoWizard } from '@/components/horas-hombre/RegistroCampoWizard'

interface MiRegistro {
  id: string
  fechaTrabajo: string
  descripcion: string | null
  ubicacion: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  motivoRechazo: string | null
  createdAt: string
  proyecto: { id: string; codigo: string; nombre: string }
  proyectoEdt: { id: string; nombre: string } | null
  aprobadoPor: { id: string; name: string | null } | null
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
}

type ViewMode = 'table' | 'cards'
type EstadoFilter = 'todos' | 'pendiente' | 'aprobado' | 'rechazado'

export default function RegistroCampoPage() {
  const { toast } = useToast()
  const [registros, setRegistros] = useState<MiRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [stats, setStats] = useState({
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    total: 0
  })

  // View and filters
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [proyectoFilter, setProyectoFilter] = useState<string>('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    cargarMisRegistros()
  }, [])

  const cargarMisRegistros = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/horas-hombre/campo/mis-registros')

      if (!response.ok) throw new Error('Error cargando registros')

      const data = await response.json()
      setRegistros(Array.isArray(data.data) ? data.data : [])
      setStats(data.stats || { pendientes: 0, aprobados: 0, rechazados: 0, total: 0 })

    } catch (error) {
      console.error('Error:', error)
      setRegistros([])
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Get unique projects for filter
  const proyectosUnicos = useMemo(() => {
    const proyectos = new Map<string, { id: string; codigo: string }>()
    registros.forEach(r => {
      if (!proyectos.has(r.proyecto.id)) {
        proyectos.set(r.proyecto.id, { id: r.proyecto.id, codigo: r.proyecto.codigo })
      }
    })
    return Array.from(proyectos.values())
  }, [registros])

  // Filtered registros
  const registrosFiltrados = useMemo(() => {
    let filtered = [...registros]

    // Estado filter
    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(r => r.estado === estadoFilter)
    }

    // Proyecto filter
    if (proyectoFilter !== 'todos') {
      filtered = filtered.filter(r => r.proyecto.id === proyectoFilter)
    }

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(r =>
        r.proyecto.codigo.toLowerCase().includes(term) ||
        r.proyecto.nombre.toLowerCase().includes(term) ||
        r.proyectoEdt?.nombre.toLowerCase().includes(term) ||
        r.ubicacion?.toLowerCase().includes(term)
      )
    }

    // Date range
    if (fechaDesde) {
      filtered = filtered.filter(r => r.fechaTrabajo >= fechaDesde)
    }
    if (fechaHasta) {
      filtered = filtered.filter(r => r.fechaTrabajo <= fechaHasta)
    }

    return filtered
  }, [registros, estadoFilter, proyectoFilter, searchTerm, fechaDesde, fechaHasta])

  const handleWizardSuccess = () => {
    cargarMisRegistros()
  }

  const clearFilters = () => {
    setEstadoFilter('todos')
    setProyectoFilter('todos')
    setSearchTerm('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const hasActiveFilters = estadoFilter !== 'todos' || proyectoFilter !== 'todos' || searchTerm || fechaDesde || fechaHasta

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pendiente</Badge>
      case 'aprobado':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rechazado</Badge>
      default:
        return <Badge>{estado}</Badge>
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'aprobado':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rechazado':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            Registro de Horas en Campo
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Registra las horas de trabajo de tu cuadrilla
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargarMisRegistros} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowWizard(true)} size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nuevo Registro</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <button
          onClick={() => setEstadoFilter('todos')}
          className={`p-3 rounded-lg border transition-all ${estadoFilter === 'todos' ? 'ring-2 ring-gray-400 bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
        >
          <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
          <p className="text-[10px] md:text-xs text-gray-500">Total</p>
        </button>
        <button
          onClick={() => setEstadoFilter('pendiente')}
          className={`p-3 rounded-lg border transition-all ${estadoFilter === 'pendiente' ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-white hover:bg-amber-50'}`}
        >
          <p className="text-lg md:text-2xl font-bold text-amber-600">{stats.pendientes}</p>
          <p className="text-[10px] md:text-xs text-amber-600">Pendientes</p>
        </button>
        <button
          onClick={() => setEstadoFilter('aprobado')}
          className={`p-3 rounded-lg border transition-all ${estadoFilter === 'aprobado' ? 'ring-2 ring-green-400 bg-green-50' : 'bg-white hover:bg-green-50'}`}
        >
          <p className="text-lg md:text-2xl font-bold text-green-600">{stats.aprobados}</p>
          <p className="text-[10px] md:text-xs text-green-600">Aprobados</p>
        </button>
        <button
          onClick={() => setEstadoFilter('rechazado')}
          className={`p-3 rounded-lg border transition-all ${estadoFilter === 'rechazado' ? 'ring-2 ring-red-400 bg-red-50' : 'bg-white hover:bg-red-50'}`}
        >
          <p className="text-lg md:text-2xl font-bold text-red-600">{stats.rechazados}</p>
          <p className="text-[10px] md:text-xs text-red-600">Rechazados</p>
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* More filters toggle */}
          <Button
            variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
            {hasActiveFilters && <Badge className="ml-1 h-5 px-1.5 bg-white text-gray-900">!</Badge>}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-gray-500">
              Limpiar
            </Button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 border rounded-lg p-0.5 bg-gray-100">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <Card className="p-3 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proyecto</label>
              <Select value={proyectoFilter} onValueChange={setProyectoFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los proyectos</SelectItem>
                  {proyectosUnicos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estado</label>
              <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as EstadoFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {registrosFiltrados.length} de {registros.length} registros
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Cargando...</span>
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="font-medium">No hay registros</p>
          <p className="text-sm mb-4">{hasActiveFilters ? 'Intenta ajustar los filtros' : 'Crea tu primer registro de campo'}</p>
          {!hasActiveFilters && (
            <Button variant="outline" onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear registro
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[100px]">Fecha</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead className="hidden md:table-cell">EDT</TableHead>
                <TableHead className="text-center">Tareas</TableHead>
                <TableHead className="text-center">Personas</TableHead>
                <TableHead className="text-center">Horas</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrosFiltrados.map(registro => (
                <TableRow key={registro.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-sm">
                    {format(new Date(registro.fechaTrabajo), 'dd/MM/yy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-mono font-semibold text-sm">{registro.proyecto.codigo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-600">
                    {registro.proyectoEdt?.nombre || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-purple-600 font-medium">{registro.cantidadTareas}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-blue-600 font-medium">{registro.cantidadMiembros}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-green-600 font-semibold">{registro.totalHoras}h</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {getEstadoBadge(registro.estado)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {registrosFiltrados.map(registro => (
            <Card key={registro.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono">
                      {registro.proyecto.codigo}
                    </Badge>
                    {getEstadoBadge(registro.estado)}
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(registro.fechaTrabajo), 'dd MMM', { locale: es })}
                  </span>
                </div>

                {/* EDT */}
                {registro.proyectoEdt && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="truncate">{registro.proyectoEdt.nombre}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-purple-600">{registro.cantidadTareas} tareas</span>
                    <span className="text-blue-600">{registro.cantidadMiembros} pers.</span>
                  </div>
                  <span className="text-green-600 font-bold">{registro.totalHoras}h</span>
                </div>

                {/* Rejection reason */}
                {registro.estado === 'rechazado' && registro.motivoRechazo && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                    <strong>Motivo:</strong> {registro.motivoRechazo}
                  </div>
                )}

                {/* Approval info */}
                {registro.estado === 'aprobado' && registro.aprobadoPor && (
                  <div className="mt-2 text-xs text-gray-500">
                    Aprobado por: {registro.aprobadoPor.name}
                  </div>
                )}

                {/* Location */}
                {registro.ubicacion && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {registro.ubicacion}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Wizard */}
      <RegistroCampoWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={handleWizardSuccess}
      />
    </div>
  )
}
