'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Target,
  Building2,
  Download,
  RefreshCw,
  LayoutGrid,
  TableIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ResumenProyecto {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    cliente: string
    estado: string
    progresoGeneral: number
    fechaInicio: Date | null
    fechaFin: Date | null
  }
  metricas: {
    horasPlanificadas: number
    horasEjecutadas: number
    diferenciaHoras: number
    porcentajeAvance: number
    totalRegistros: number
    estadoHoras: 'en_plazo' | 'exceso' | 'sin_planificacion'
  }
  servicios: Array<{
    id: string
    orden: number
    nombre: string
    edt: string
    horasEstimadas: number
    subtotalInterno: number
    subtotalReal: number
    itemsCount: number
  }>
}

interface ResumenGeneral {
  totalProyectos: number
  totalHorasPlanificadas: number
  totalHorasEjecutadas: number
  porcentajeGeneral: number
  proyectosEnPlazo: number
  proyectosConExceso: number
  proyectosSinPlanificacion: number
}

export default function ResumenProyectosPage() {
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneral | null>(null)
  const [proyectos, setProyectos] = useState<ResumenProyecto[]>([])
  const [listaProyectos, setListaProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProyectos, setLoadingProyectos] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroProyecto, setFiltroProyecto] = useState<string>('todos')
  const [filtroEstadoHoras, setFiltroEstadoHoras] = useState<string>('todos')
  const [mostrarTodosEdts, setMostrarTodosEdts] = useState<boolean>(true)
  const [permiso, setPermiso] = useState(false)
  const [vistaActual, setVistaActual] = useState<'tabla' | 'card'>('tabla')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const router = useRouter()

  // Verificar permisos al cargar
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      toast({
        title: 'Error de autenticacion',
        description: 'Debe iniciar sesion para acceder a esta funcionalidad',
        variant: 'destructive'
      })
      return
    }

    const userRole = session.user.role
    if (['admin', 'coordinador', 'gestor'].includes(userRole)) {
      setPermiso(true)
      cargarResumenProyectos()
    } else {
      setPermiso(false)
      toast({
        title: 'Acceso denegado',
        description: 'Esta funcionalidad es solo para administradores, coordinadores y gestores',
        variant: 'destructive'
      })
    }
  }, [status, session])

  const cargarResumenProyectos = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (filtroEstado && filtroEstado !== 'todos') {
        params.append('estado', filtroEstado)
      }
      if (filtroProyecto && filtroProyecto !== 'todos') {
        params.append('proyectoId', filtroProyecto)
      }

      const response = await fetch(`/api/horas-hombre/resumen-proyectos?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar resumen de proyectos')
      }

      const data = await response.json()

      if (data.success) {
        setResumenGeneral(data.data.resumenGeneral)
        setProyectos(data.data.proyectos)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando resumen de proyectos:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el resumen de proyectos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarListaProyectos = async () => {
    try {
      setLoadingProyectos(true)
      const response = await fetch('/api/horas-hombre/proyectos')

      if (!response.ok) {
        throw new Error('Error al cargar lista de proyectos')
      }

      const data = await response.json()
      if (data.success) {
        setListaProyectos(data.data.proyectos)
      }
    } catch (error) {
      console.error('Error cargando lista de proyectos:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar la lista de proyectos',
        variant: 'destructive'
      })
    } finally {
      setLoadingProyectos(false)
    }
  }

  // Cargar datos cuando cambie el filtro
  useEffect(() => {
    if (session?.user?.role && ['admin', 'coordinador', 'gestor'].includes(session.user.role)) {
      cargarResumenProyectos()
    }
  }, [filtroEstado, filtroProyecto])

  // Cargar lista de proyectos al inicio
  useEffect(() => {
    if (session?.user?.role && ['admin', 'coordinador', 'gestor'].includes(session.user.role)) {
      cargarListaProyectos()
    }
  }, [session])

  const getColorPorEstado = (estado: 'en_plazo' | 'exceso' | 'sin_planificacion') => {
    switch (estado) {
      case 'en_plazo':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'exceso':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'sin_planificacion':
        return 'bg-gray-50 border-gray-200 text-gray-600'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600'
    }
  }

  const getIconoPorEstado = (estado: 'en_plazo' | 'exceso' | 'sin_planificacion') => {
    switch (estado) {
      case 'en_plazo':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'exceso':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'sin_planificacion':
        return <Target className="h-4 w-4 text-gray-500" />
      default:
        return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  const getColorAvance = (porcentaje: number) => {
    if (porcentaje === 0) return 'text-gray-500'
    if (porcentaje <= 50) return 'text-red-500'
    if (porcentaje <= 80) return 'text-yellow-500'
    if (porcentaje <= 100) return 'text-green-500'
    return 'text-blue-500'
  }

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje === 0) return 'bg-gray-300'
    if (porcentaje <= 50) return 'bg-red-500'
    if (porcentaje <= 80) return 'bg-yellow-500'
    if (porcentaje <= 100) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getBadgeVariantEstado = (estado: string) => {
    switch (estado) {
      case 'creado': return 'secondary'
      case 'en_planificacion': return 'outline'
      case 'en_ejecucion': return 'default'
      case 'cerrado': return 'secondary'
      case 'pausado': return 'outline'
      case 'cancelado': return 'destructive'
      default: return 'outline'
    }
  }

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  // Filtrar proyectos por estado de horas
  const proyectosFiltrados = proyectos.filter(p => {
    if (filtroEstadoHoras === 'todos') return true
    return p.metricas.estadoHoras === filtroEstadoHoras
  })

  const formatEstado = (estado: string) => {
    const estados: Record<string, string> = {
      'creado': 'Creado',
      'en_planificacion': 'Planificación',
      'listas_pendientes': 'Listas Pend.',
      'listas_aprobadas': 'Listas Aprob.',
      'pedidos_creados': 'Pedidos',
      'en_ejecucion': 'Ejecución',
      'en_cierre': 'Cierre',
      'cerrado': 'Cerrado',
      'pausado': 'Pausado',
      'cancelado': 'Cancelado'
    }
    return estados[estado] || estado
  }

  const exportarCSV = () => {
    if (!resumenGeneral || proyectos.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay datos para exportar',
        variant: 'destructive'
      })
      return
    }

    const csvContent = [
      // Header
      'Codigo,Proyecto,Cliente,Estado,Horas Planificadas,Horas Ejecutadas,Diferencia,Porcentaje Avance,Estado Horas,Total Registros',
      // Datos de proyectos
      ...proyectos.map(p =>
        `"${p.proyecto.codigo}","${p.proyecto.nombre}","${p.proyecto.cliente}","${p.proyecto.estado}",${p.metricas.horasPlanificadas},${p.metricas.horasEjecutadas},${p.metricas.diferenciaHoras},${p.metricas.porcentajeAvance}%,"${p.metricas.estadoHoras}",${p.metricas.totalRegistros}`
      ),
      '', // Linea vacia
      'Resumen General',
      `Total Proyectos,${resumenGeneral.totalProyectos}`,
      `Total Horas Planificadas,${resumenGeneral.totalHorasPlanificadas}`,
      `Total Horas Ejecutadas,${resumenGeneral.totalHorasEjecutadas}`,
      `Porcentaje General,${resumenGeneral.porcentajeGeneral}%`,
      `Proyectos En Plazo,${resumenGeneral.proyectosEnPlazo}`,
      `Proyectos Con Exceso,${resumenGeneral.proyectosConExceso}`,
      `Proyectos Sin Planificacion,${resumenGeneral.proyectosSinPlanificacion}`
    ].join('\n')

    // Agregar BOM UTF-8 para que Excel reconozca correctamente los caracteres
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resumen-proyectos-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Exportado',
      description: 'Archivo CSV descargado correctamente'
    })
  }

  // Si no hay permisos, mostrar mensaje de acceso denegado
  if (!permiso && status !== 'loading') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Acceso Denegado
              </h2>
              <p className="text-gray-600">
                Esta funcionalidad esta restringida para administradores, coordinadores y gestores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando resumen de proyectos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-4">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Resumen de Proyectos
            </h1>
            <p className="text-sm text-gray-500">
              Horas ejecutadas vs planificadas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cargarResumenProyectos}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarCSV}
              disabled={proyectos.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        {/* Métricas compactas en badges */}
        {resumenGeneral && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{resumenGeneral.totalProyectos}</span>
              <span className="text-xs text-gray-500">proyectos</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">{resumenGeneral.totalHorasPlanificadas}h</span>
              <span className="text-xs text-gray-500">plan</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{resumenGeneral.totalHorasEjecutadas}h</span>
              <span className="text-xs text-gray-500">ejecutadas</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-600" />
              <span className={`text-sm font-bold ${getColorAvance(resumenGeneral.porcentajeGeneral)}`}>
                {resumenGeneral.porcentajeGeneral}%
              </span>
              <span className="text-xs text-gray-500">avance</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 cursor-help">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {resumenGeneral.proyectosEnPlazo}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Proyectos en plazo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 cursor-help">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {resumenGeneral.proyectosConExceso}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Proyectos con exceso de horas</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 cursor-help">
                  <Target className="h-3 w-3 mr-1" />
                  {resumenGeneral.proyectosSinPlanificacion}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Proyectos sin planificación</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Filtros y controles */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filtroProyecto} onValueChange={setFiltroProyecto}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="Filtrar por proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proyectos</SelectItem>
              {listaProyectos.map((proyecto) => (
                <SelectItem key={proyecto.id} value={proyecto.id}>
                  {proyecto.codigo} - {proyecto.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="creado">Creado</SelectItem>
              <SelectItem value="en_planificacion">Planificación</SelectItem>
              <SelectItem value="listas_pendientes">Listas Pend.</SelectItem>
              <SelectItem value="listas_aprobadas">Listas Aprob.</SelectItem>
              <SelectItem value="pedidos_creados">Pedidos</SelectItem>
              <SelectItem value="en_ejecucion">Ejecución</SelectItem>
              <SelectItem value="en_cierre">Cierre</SelectItem>
              <SelectItem value="cerrado">Cerrado</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroEstadoHoras} onValueChange={setFiltroEstadoHoras}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Estado horas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las horas</SelectItem>
              <SelectItem value="en_plazo">En plazo</SelectItem>
              <SelectItem value="exceso">Con exceso</SelectItem>
              <SelectItem value="sin_planificacion">Sin planif.</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={mostrarTodosEdts ? 'todos' : 'top3'}
            onValueChange={(v) => setMostrarTodosEdts(v === 'todos')}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Servicios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los servicios</SelectItem>
              <SelectItem value="top3">Solo TOP 3</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={vistaActual === 'tabla' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setVistaActual('tabla')}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={vistaActual === 'card' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setVistaActual('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Vista de Tabla */}
        {vistaActual === 'tabla' && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Horas</TableHead>
                    <TableHead className="text-center w-[120px]">Progreso</TableHead>
                    <TableHead className="text-center">Avance</TableHead>
                    <TableHead className="text-center">Diferencia</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proyectosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay proyectos con los filtros aplicados</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    proyectosFiltrados.map((proyecto) => (
                      <React.Fragment key={proyecto.proyecto.id}>
                        <TableRow
                          className={`cursor-pointer hover:bg-slate-50 ${
                            proyecto.metricas.estadoHoras === 'exceso' ? 'bg-red-50/50' :
                            proyecto.metricas.estadoHoras === 'en_plazo' ? 'bg-green-50/30' :
                            ''
                          }`}
                          onClick={() => toggleProjectExpand(proyecto.proyecto.id)}
                        >
                          <TableCell className="py-2">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {expandedProjects.has(proyecto.proyecto.id)
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />
                              }
                            </Button>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              {getIconoPorEstado(proyecto.metricas.estadoHoras)}
                              <div>
                                <p className="font-medium text-sm">{proyecto.proyecto.codigo}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                  {proyecto.proyecto.nombre}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-sm text-gray-600 truncate max-w-[120px] block">
                              {proyecto.proyecto.cliente}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <Badge variant={getBadgeVariantEstado(proyecto.proyecto.estado)} className="text-xs">
                              {formatEstado(proyecto.proyecto.estado)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            {proyecto.metricas.estadoHoras === 'sin_planificacion' ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center gap-1 text-xs text-amber-600">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Sin cronograma</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Falta generar el cronograma de ejecución</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="text-xs">
                                <span className="text-purple-600 font-medium">{proyecto.metricas.horasPlanificadas}h</span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-green-600 font-medium">{proyecto.metricas.horasEjecutadas}h</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(proyecto.proyecto.progresoGeneral, 100)}
                                className="h-2 flex-1"
                              />
                              <span className="text-xs font-medium w-8 text-right">
                                {proyecto.proyecto.progresoGeneral}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <span className={`text-sm font-bold ${getColorAvance(proyecto.metricas.porcentajeAvance)}`}>
                              {proyecto.metricas.porcentajeAvance}%
                            </span>
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <span className={`text-sm font-medium ${
                              proyecto.metricas.diferenciaHoras > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {proyecto.metricas.diferenciaHoras > 0 ? '+' : ''}{proyecto.metricas.diferenciaHoras}h
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/proyectos/${proyecto.proyecto.id}`)
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver proyecto</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                        {/* Fila expandida con servicios */}
                        {expandedProjects.has(proyecto.proyecto.id) && proyecto.servicios.length > 0 && (
                          <TableRow className="border-0">
                            <TableCell colSpan={9} className="p-0">
                              <div className={`ml-12 mr-4 mb-3 rounded-lg border-l-4 ${
                                proyecto.metricas.estadoHoras === 'exceso'
                                  ? 'border-l-red-400 bg-red-50/30'
                                  : proyecto.metricas.estadoHoras === 'en_plazo'
                                    ? 'border-l-green-400 bg-green-50/30'
                                    : 'border-l-gray-300 bg-gray-50/50'
                              }`}>
                                {/* Header del acordeón */}
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
                                  <div className={`w-2 h-2 rounded-full ${
                                    proyecto.metricas.estadoHoras === 'exceso'
                                      ? 'bg-red-400'
                                      : proyecto.metricas.estadoHoras === 'en_plazo'
                                        ? 'bg-green-400'
                                        : 'bg-gray-400'
                                  }`} />
                                  <span className="text-xs font-medium text-gray-600">
                                    EDTs de {proyecto.proyecto.codigo}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({proyecto.servicios.length} servicios)
                                  </span>
                                </div>
                                {/* Contenido */}
                                <div className="p-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {(mostrarTodosEdts
                                      ? proyecto.servicios
                                      : [...proyecto.servicios].sort((a, b) => b.horasEstimadas - a.horasEstimadas).slice(0, 3)
                                    ).map((servicio, index) => (
                                      <div
                                        key={index}
                                        className="rounded-md p-2.5 text-xs border bg-white shadow-sm hover:shadow-md transition-shadow"
                                      >
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                            servicio.subtotalReal > 0
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-gray-100 text-gray-500'
                                          }`}>
                                            {servicio.orden}
                                          </span>
                                          <span className="font-medium text-gray-800 truncate">{servicio.nombre}</span>
                                        </div>
                                        <div className="text-gray-400 text-[10px] mb-1.5">EDT: {servicio.edt}</div>
                                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                          <div className="flex items-center gap-1">
                                            <span className="text-purple-600">Plan:</span>
                                            <strong className="text-purple-700">{servicio.horasEstimadas}h</strong>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-green-600">Real:</span>
                                            <strong className="text-green-700">{servicio.subtotalReal}h</strong>
                                          </div>
                                          <span className="text-gray-400">{servicio.itemsCount} tareas</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {proyecto.servicios.length > 3 && !mostrarTodosEdts && (
                                    <p className="text-xs text-gray-400 mt-2 text-center">
                                      +{proyecto.servicios.length - 3} servicios más
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Vista de Cards */}
        {vistaActual === 'card' && (
          <div className="space-y-3">
            {proyectosFiltrados.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay proyectos con los filtros aplicados</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              proyectosFiltrados.map((proyecto) => (
                <Card
                  key={proyecto.proyecto.id}
                  className={`overflow-hidden ${
                    proyecto.metricas.estadoHoras === 'exceso' ? 'border-l-4 border-l-red-500' :
                    proyecto.metricas.estadoHoras === 'en_plazo' ? 'border-l-4 border-l-green-500' :
                    'border-l-4 border-l-gray-300'
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getIconoPorEstado(proyecto.metricas.estadoHoras)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{proyecto.proyecto.codigo}</h3>
                            <Badge variant={getBadgeVariantEstado(proyecto.proyecto.estado)} className="text-xs">
                              {formatEstado(proyecto.proyecto.estado)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{proyecto.proyecto.nombre}</p>
                          <p className="text-xs text-gray-400">Cliente: {proyecto.proyecto.cliente}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getColorAvance(proyecto.metricas.porcentajeAvance)}`}>
                          {proyecto.metricas.porcentajeAvance}%
                        </div>
                        <p className="text-xs text-gray-500">Avance</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progreso general</span>
                        <span className="font-medium">{proyecto.proyecto.progresoGeneral}%</span>
                      </div>
                      <Progress value={Math.min(proyecto.proyecto.progresoGeneral, 100)} className="h-2" />
                    </div>

                    {/* Métricas */}
                    {proyecto.metricas.estadoHoras === 'sin_planificacion' ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium text-sm">Sin cronograma de ejecución</span>
                        </div>
                        <p className="text-xs text-amber-600 mt-1 ml-6">
                          Este proyecto no tiene cronograma de ejecución. Genera uno desde el módulo de planificación para ver las métricas de horas.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 mb-3 text-center">
                        <div className="bg-purple-50 rounded p-2">
                          <p className="text-lg font-bold text-purple-700">{proyecto.metricas.horasPlanificadas}h</p>
                          <p className="text-xs text-purple-600">Planificadas</p>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-lg font-bold text-green-700">{proyecto.metricas.horasEjecutadas}h</p>
                          <p className="text-xs text-green-600">Ejecutadas</p>
                        </div>
                        <div className={`rounded p-2 ${proyecto.metricas.diferenciaHoras > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                          <p className={`text-lg font-bold ${proyecto.metricas.diferenciaHoras > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {proyecto.metricas.diferenciaHoras > 0 ? '+' : ''}{proyecto.metricas.diferenciaHoras}h
                          </p>
                          <p className={`text-xs ${proyecto.metricas.diferenciaHoras > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Diferencia
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-lg font-bold text-gray-700">{proyecto.metricas.totalRegistros}</p>
                          <p className="text-xs text-gray-600">Registros</p>
                        </div>
                      </div>
                    )}

                    {/* Servicios */}
                    {proyecto.servicios.length > 0 && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between h-8 text-xs"
                          onClick={() => toggleProjectExpand(proyecto.proyecto.id)}
                        >
                          <span>{proyecto.servicios.length} servicios</span>
                          {expandedProjects.has(proyecto.proyecto.id)
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                        {expandedProjects.has(proyecto.proyecto.id) && (
                          <div className={`mt-3 rounded-lg border-l-4 ${
                            proyecto.metricas.estadoHoras === 'exceso'
                              ? 'border-l-red-400 bg-red-50/50'
                              : proyecto.metricas.estadoHoras === 'en_plazo'
                                ? 'border-l-green-400 bg-green-50/50'
                                : 'border-l-gray-300 bg-gray-50/50'
                          }`}>
                            {/* Header */}
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100/50">
                              <div className={`w-2 h-2 rounded-full ${
                                proyecto.metricas.estadoHoras === 'exceso'
                                  ? 'bg-red-400'
                                  : proyecto.metricas.estadoHoras === 'en_plazo'
                                    ? 'bg-green-400'
                                    : 'bg-gray-400'
                              }`} />
                              <span className="text-xs font-medium text-gray-600">
                                EDTs de {proyecto.proyecto.codigo}
                              </span>
                            </div>
                            {/* Contenido */}
                            <div className="p-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(mostrarTodosEdts
                                  ? proyecto.servicios
                                  : [...proyecto.servicios].sort((a, b) => b.horasEstimadas - a.horasEstimadas).slice(0, 3)
                                ).map((servicio, index) => (
                                  <div
                                    key={index}
                                    className="rounded-md p-2.5 text-xs border bg-white shadow-sm"
                                  >
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                        servicio.subtotalReal > 0
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {servicio.orden}
                                      </span>
                                      <span className="font-medium text-gray-800 truncate">{servicio.nombre}</span>
                                    </div>
                                    <div className="text-gray-400 text-[10px] mb-1.5">EDT: {servicio.edt}</div>
                                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                      <div className="flex items-center gap-1">
                                        <span className="text-purple-600">Plan:</span>
                                        <strong className="text-purple-700">{servicio.horasEstimadas}h</strong>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-green-600">Real:</span>
                                        <strong className="text-green-700">{servicio.subtotalReal}h</strong>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {proyecto.servicios.length > 3 && !mostrarTodosEdts && (
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                  +{proyecto.servicios.length - 3} servicios más
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer con enlace */}
                    <div className="flex justify-end mt-3 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => router.push(`/proyectos/${proyecto.proyecto.id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver proyecto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Indicador de cantidad */}
        <div className="text-sm text-gray-500 text-center">
          Mostrando {proyectosFiltrados.length} de {proyectos.length} proyectos
        </div>
      </div>
    </TooltipProvider>
  )
}
