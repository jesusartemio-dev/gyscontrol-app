'use client'

/**
 * AnalisisTransversalEdt - Dashboard de análisis transversal por EDT
 *
 * Resuelve el problema del usuario: ver horas y costos por EDT (PLC, HMI, ING)
 * a través de múltiples proyectos con filtros por fecha
 *
 * REDISEÑO: Versión minimalista con tabla/cards y métricas compactas
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  TableIcon,
  Layers
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface AnalisisEdt {
  categoria: string
  categoriaId: string
  totalHorasPlanificadas: number
  totalHorasReales: number
  totalProyectos: number
  porcentajeAvance: number
  proyectos: Array<{
    codigo: string
    nombre: string
    horasPlanificadas: number
    horasReales: number
  }>
  costoTotalCalculado: number
  variacionHoras: number
  variacionPorcentual: number
}

interface EstadisticasGlobales {
  totalEdts: number
  totalProyectos: number
  totalHorasReales: number
  totalHorasPlanificadas: number
  costoTotal: number
}

interface AnalisisTransversalData {
  resumenTransversal: AnalisisEdt[]
  estadisticas: EstadisticasGlobales
}

// Tipos de períodos rápidos
type PeriodoRapido = '1M' | '3M' | '6M' | '12M' | 'TODO' | 'CUSTOM'

// Función para calcular fechas según período
const calcularFechasPeriodo = (periodo: PeriodoRapido): { inicio: string; fin: string } | null => {
  const hoy = new Date()
  const fin = format(hoy, 'yyyy-MM-dd')

  switch (periodo) {
    case '1M': {
      const inicio = new Date(hoy)
      inicio.setMonth(inicio.getMonth() - 1)
      return { inicio: format(inicio, 'yyyy-MM-dd'), fin }
    }
    case '3M': {
      const inicio = new Date(hoy)
      inicio.setMonth(inicio.getMonth() - 3)
      return { inicio: format(inicio, 'yyyy-MM-dd'), fin }
    }
    case '6M': {
      const inicio = new Date(hoy)
      inicio.setMonth(inicio.getMonth() - 6)
      return { inicio: format(inicio, 'yyyy-MM-dd'), fin }
    }
    case '12M': {
      const inicio = new Date(hoy)
      inicio.setFullYear(inicio.getFullYear() - 1)
      return { inicio: format(inicio, 'yyyy-MM-dd'), fin }
    }
    case 'TODO':
      return null // Sin filtro de fecha
    default:
      return null
  }
}

export function AnalisisTransversalEdt() {
  const [data, setData] = useState<AnalisisTransversalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [vistaActual, setVistaActual] = useState<'tabla' | 'card'>('tabla')
  const [expandedEdts, setExpandedEdts] = useState<Set<string>>(new Set())
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoRapido>('TODO')
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    soloActivos: true
  })

  const { toast } = useToast()

  // Cambiar período rápido y cargar automáticamente
  const cambiarPeriodo = async (periodo: PeriodoRapido) => {
    setPeriodoActivo(periodo)
    if (periodo !== 'CUSTOM') {
      const fechas = calcularFechasPeriodo(periodo)

      // Actualizar filtros
      const nuevosFiltros = {
        ...filtros,
        fechaInicio: fechas?.inicio || '',
        fechaFin: fechas?.fin || ''
      }
      setFiltros(nuevosFiltros)

      // Cargar datos automáticamente con los nuevos filtros
      try {
        setLoading(true)
        const params = new URLSearchParams({
          incluirHoras: 'true',
          soloActivos: nuevosFiltros.soloActivos.toString()
        })

        if (nuevosFiltros.fechaInicio && nuevosFiltros.fechaFin) {
          params.append('fechaInicio', nuevosFiltros.fechaInicio)
          params.append('fechaFin', nuevosFiltros.fechaFin)
        }

        const response = await fetch(`/api/horas-hombre/edts-unificados?${params}`)
        if (!response.ok) throw new Error('Error cargando análisis')

        const result = await response.json()
        if (result.success && result.data) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: 'Error',
          description: 'No se pudo cargar el análisis',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const cargarAnalisis = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        incluirHoras: 'true',
        soloActivos: filtros.soloActivos.toString()
      })

      // Solo agregar fechas si no es "TODO"
      if (filtros.fechaInicio && filtros.fechaFin) {
        params.append('fechaInicio', filtros.fechaInicio)
        params.append('fechaFin', filtros.fechaFin)
      }

      const response = await fetch(`/api/horas-hombre/edts-unificados?${params}`)

      if (!response.ok) {
        throw new Error('Error cargando análisis')
      }

      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Error en respuesta')
      }
    } catch (error) {
      console.error('Error cargando análisis transversal:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el análisis transversal',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarAnalisis()
  }, [])

  const toggleEdtExpand = (categoria: string) => {
    setExpandedEdts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoria)) {
        newSet.delete(categoria)
      } else {
        newSet.add(categoria)
      }
      return newSet
    })
  }

  const exportarAnalisis = async () => {
    if (!data) return

    try {
      const csvContent = [
        'EDT,Horas Plan,Horas Real,Variacion,Variacion %,Proyectos',
        ...data.resumenTransversal.map(edt =>
          `"${edt.categoria}",${edt.totalHorasPlanificadas.toFixed(1)},${edt.totalHorasReales.toFixed(1)},${edt.variacionHoras.toFixed(1)},${edt.variacionPorcentual.toFixed(1)}%,${edt.totalProyectos}`
        )
      ].join('\n')

      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analisis-edt-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Éxito',
        description: 'Análisis exportado correctamente'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar el análisis',
        variant: 'destructive'
      })
    }
  }

  const getVariacionColor = (variacion: number) => {
    if (variacion > 0) return 'text-red-600'
    if (variacion < 0) return 'text-green-600'
    return 'text-gray-500'
  }

  const getVariacionBg = (variacion: number) => {
    if (variacion > 10) return 'bg-red-50/50'
    if (variacion < -10) return 'bg-green-50/30'
    return ''
  }

  const getAvanceColor = (planificadas: number, reales: number) => {
    if (planificadas === 0) return 'text-gray-500'
    const porcentaje = (reales / planificadas) * 100
    if (porcentaje > 100) return 'text-red-500'
    if (porcentaje >= 80) return 'text-green-500'
    if (porcentaje >= 50) return 'text-yellow-500'
    return 'text-gray-500'
  }

  // Top 3 EDTs por horas
  const topEdtsPorHoras = data?.resumenTransversal
    .slice()
    .sort((a, b) => b.totalHorasReales - a.totalHorasReales)
    .slice(0, 3) || []

  // EDTs con exceso de horas
  const edtsConExceso = data?.resumenTransversal.filter(e => e.variacionHoras > 0).length || 0
  const edtsEnPlazo = data?.resumenTransversal.filter(e => e.variacionHoras <= 0).length || 0

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando análisis transversal...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Botones de período rápido
  const periodosRapidos: { valor: PeriodoRapido; label: string }[] = [
    { valor: 'TODO', label: 'Todo' },
    { valor: '1M', label: '1M' },
    { valor: '3M', label: '3M' },
    { valor: '6M', label: '6M' },
    { valor: '12M', label: '12M' },
  ]

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header con filtros inline */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Botones de período rápido */}
          <div className="flex items-center gap-1 border rounded-md p-1 bg-slate-50">
            {periodosRapidos.map(({ valor, label }) => (
              <Button
                key={valor}
                variant={periodoActivo === valor ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  cambiarPeriodo(valor)
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Separador */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Rango personalizado */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => {
                setPeriodoActivo('CUSTOM')
                setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))
              }}
              className="h-9 w-[140px]"
            />
            <span className="text-gray-400">→</span>
            <Input
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => {
                setPeriodoActivo('CUSTOM')
                setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))
              }}
              className="h-9 w-[140px]"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={cargarAnalisis}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Filtrar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportarAnalisis}
            disabled={!data}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>

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

        {data && (
          <>
            {/* Métricas compactas en badges */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{data.estadisticas.totalEdts}</span>
                <span className="text-xs text-gray-500">EDTs</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">{data.estadisticas.totalProyectos}</span>
                <span className="text-xs text-gray-500">proyectos</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">{data.estadisticas.totalHorasPlanificadas.toFixed(0)}h</span>
                <span className="text-xs text-gray-500">plan</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{data.estadisticas.totalHorasReales.toFixed(0)}h</span>
                <span className="text-xs text-gray-500">real</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 cursor-help">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {edtsEnPlazo}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>EDTs en plazo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 cursor-help">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {edtsConExceso}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>EDTs con exceso</TooltipContent>
              </Tooltip>
            </div>

            {/* Resumen ejecutivo compacto */}
            {topEdtsPorHoras.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 self-center">Top horas:</span>
                {topEdtsPorHoras.map((edt, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs"
                  >
                    {edt.categoria}: {edt.totalHorasReales.toFixed(0)}h
                  </Badge>
                ))}
              </div>
            )}

            {/* Vista de Tabla */}
            {vistaActual === 'tabla' && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>EDT</TableHead>
                        <TableHead className="text-center">Plan</TableHead>
                        <TableHead className="text-center">Real</TableHead>
                        <TableHead className="text-center">Variación</TableHead>
                        <TableHead className="text-center w-[140px]">Avance</TableHead>
                        <TableHead className="text-center">Proyectos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.resumenTransversal.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No hay datos para los filtros seleccionados</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.resumenTransversal
                          .sort((a, b) => b.totalHorasReales - a.totalHorasReales)
                          .map((edt) => (
                          <React.Fragment key={edt.categoria}>
                            <TableRow
                              className={`cursor-pointer hover:bg-slate-50 ${getVariacionBg(edt.variacionPorcentual)}`}
                              onClick={() => toggleEdtExpand(edt.categoria)}
                            >
                              <TableCell className="py-2">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  {expandedEdts.has(edt.categoria)
                                    ? <ChevronUp className="h-4 w-4" />
                                    : <ChevronDown className="h-4 w-4" />
                                  }
                                </Button>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-semibold">
                                    {edt.categoria}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-center">
                                <span className="text-sm text-purple-600 font-medium">
                                  {edt.totalHorasPlanificadas.toFixed(1)}h
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-center">
                                <span className="text-sm text-green-600 font-medium">
                                  {edt.totalHorasReales.toFixed(1)}h
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-center">
                                <span className={`text-sm font-medium ${getVariacionColor(edt.variacionHoras)}`}>
                                  {edt.variacionHoras > 0 ? '+' : ''}{edt.variacionHoras.toFixed(1)}h
                                  <span className="text-xs ml-1 opacity-70">
                                    ({edt.variacionPorcentual > 0 ? '+' : ''}{edt.variacionPorcentual.toFixed(0)}%)
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={edt.totalHorasPlanificadas > 0
                                      ? Math.min((edt.totalHorasReales / edt.totalHorasPlanificadas) * 100, 100)
                                      : 0}
                                    className="h-2 flex-1"
                                  />
                                  <span className={`text-xs font-medium w-10 text-right ${getAvanceColor(edt.totalHorasPlanificadas, edt.totalHorasReales)}`}>
                                    {edt.totalHorasPlanificadas > 0
                                      ? ((edt.totalHorasReales / edt.totalHorasPlanificadas) * 100).toFixed(0)
                                      : 0}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-center">
                                <span className="text-sm text-gray-600">{edt.totalProyectos}</span>
                              </TableCell>
                            </TableRow>
                            {/* Fila expandida con proyectos */}
                            {expandedEdts.has(edt.categoria) && edt.proyectos.length > 0 && (
                              <TableRow className="border-0">
                                <TableCell colSpan={7} className="p-0">
                                  <div className={`ml-10 mr-4 mb-3 rounded-lg border-l-4 ${
                                    edt.variacionHoras > 0
                                      ? 'border-l-red-400 bg-red-50/30'
                                      : 'border-l-green-400 bg-green-50/30'
                                  }`}>
                                    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
                                      <div className={`w-2 h-2 rounded-full ${
                                        edt.variacionHoras > 0 ? 'bg-red-400' : 'bg-green-400'
                                      }`} />
                                      <span className="text-xs font-medium text-gray-600">
                                        Proyectos con {edt.categoria}
                                      </span>
                                    </div>
                                    <div className="p-3 flex flex-wrap gap-2">
                                      {edt.proyectos
                                        .sort((a, b) => b.horasReales - a.horasReales)
                                        .map((proyecto, index) => {
                                          const avanceProyecto = proyecto.horasPlanificadas > 0
                                            ? (proyecto.horasReales / proyecto.horasPlanificadas) * 100
                                            : 0
                                          return (
                                            <Tooltip key={index}>
                                              <TooltipTrigger asChild>
                                                <Badge
                                                  variant="secondary"
                                                  className={`text-xs cursor-help ${
                                                    avanceProyecto > 100
                                                      ? 'bg-red-100 text-red-700'
                                                      : proyecto.horasReales > 0
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                  }`}
                                                >
                                                  {proyecto.codigo}: {proyecto.horasReales.toFixed(1)}h / {proyecto.horasPlanificadas.toFixed(1)}h
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="font-medium">{proyecto.nombre}</p>
                                                <p className="text-xs">Avance: {avanceProyecto.toFixed(0)}%</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )
                                        })}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.resumenTransversal.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay datos para los filtros seleccionados</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  data.resumenTransversal
                    .sort((a, b) => b.totalHorasReales - a.totalHorasReales)
                    .map((edt) => (
                    <Card
                      key={edt.categoria}
                      className={`overflow-hidden ${
                        edt.variacionHoras > 0
                          ? 'border-l-4 border-l-red-400'
                          : 'border-l-4 border-l-green-400'
                      }`}
                    >
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="text-base font-bold px-3 py-1">
                            {edt.categoria}
                          </Badge>
                          <span className={`text-lg font-bold ${getVariacionColor(edt.variacionHoras)}`}>
                            {edt.variacionHoras > 0 ? '+' : ''}{edt.variacionHoras.toFixed(0)}h
                          </span>
                        </div>

                        {/* Métricas */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <p className="text-lg font-bold text-purple-700">{edt.totalHorasPlanificadas.toFixed(0)}h</p>
                            <p className="text-xs text-purple-600">Plan</p>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <p className="text-lg font-bold text-green-700">{edt.totalHorasReales.toFixed(0)}h</p>
                            <p className="text-xs text-green-600">Real</p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Avance</span>
                            <span className={`font-medium ${getAvanceColor(edt.totalHorasPlanificadas, edt.totalHorasReales)}`}>
                              {edt.totalHorasPlanificadas > 0
                                ? ((edt.totalHorasReales / edt.totalHorasPlanificadas) * 100).toFixed(0)
                                : 0}%
                            </span>
                          </div>
                          <Progress
                            value={edt.totalHorasPlanificadas > 0
                              ? Math.min((edt.totalHorasReales / edt.totalHorasPlanificadas) * 100, 100)
                              : 0}
                            className="h-2"
                          />
                        </div>

                        {/* Proyectos */}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between h-7 text-xs"
                            onClick={() => toggleEdtExpand(edt.categoria)}
                          >
                            <span>{edt.totalProyectos} proyectos</span>
                            {expandedEdts.has(edt.categoria)
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />
                            }
                          </Button>
                          {expandedEdts.has(edt.categoria) && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {edt.proyectos
                                .sort((a, b) => b.horasReales - a.horasReales)
                                .map((proyecto, index) => {
                                  const avanceProyecto = proyecto.horasPlanificadas > 0
                                    ? (proyecto.horasReales / proyecto.horasPlanificadas) * 100
                                    : 0
                                  return (
                                    <Tooltip key={index}>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="secondary"
                                          className={`text-[10px] cursor-help ${
                                            avanceProyecto > 100
                                              ? 'bg-red-100 text-red-700'
                                              : proyecto.horasReales > 0
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                          }`}
                                        >
                                          {proyecto.codigo}: {proyecto.horasReales.toFixed(0)}h / {proyecto.horasPlanificadas.toFixed(0)}h
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs font-medium">{proyecto.nombre}</p>
                                        <p className="text-[10px]">Avance: {avanceProyecto.toFixed(0)}%</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Indicador de cantidad */}
            <div className="text-sm text-gray-500 text-center">
              Mostrando {data.resumenTransversal.length} EDTs
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
