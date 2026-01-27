'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Target,
  Building2,
  Filter,
  Download
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'

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
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroProyecto, setFiltroProyecto] = useState<string>('')
  const [mostrarTodosEdts, setMostrarTodosEdts] = useState<boolean>(true)
  const [permiso, setPermiso] = useState(false)
  const { data: session, status } = useSession()
  const { toast } = useToast()

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
      if (filtroEstado) {
        params.append('estado', filtroEstado)
      }
      if (filtroProyecto) {
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Resumen de Proyectos
          </h1>
          <p className="text-gray-600 mt-2">
            Vista consolidada de horas ejecutadas vs planificadas en todos los proyectos
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Rol: {session?.user?.role || 'Sin rol'}
        </Badge>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros y Opciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Proyecto:</label>
                <select
                  value={filtroProyecto}
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                  className="p-2 border rounded-md text-sm min-w-[200px]"
                >
                  <option value="">Todos los proyectos</option>
                  {listaProyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.codigo} - {proyecto.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Estado:</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="p-2 border rounded-md text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="creado">Creado</option>
                  <option value="en_planificacion">Planificación</option>
                  <option value="listas_pendientes">Listas Pend.</option>
                  <option value="listas_aprobadas">Listas Aprob.</option>
                  <option value="pedidos_creados">Pedidos</option>
                  <option value="en_ejecucion">Ejecución</option>
                  <option value="en_cierre">Cierre</option>
                  <option value="cerrado">Cerrado</option>
                  <option value="pausado">Pausado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={cargarResumenProyectos}
              >
                Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportarCSV}
                disabled={proyectos.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Mostrar:</label>
                <select
                  value={mostrarTodosEdts ? 'todos' : 'top3'}
                  onChange={(e) => setMostrarTodosEdts(e.target.value === 'todos')}
                  className="p-2 border rounded-md text-sm"
                >
                  <option value="todos">Todos los Servicios</option>
                  <option value="top3">Solo TOP 3 por horas</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metricas Generales */}
      {resumenGeneral && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{resumenGeneral.totalProyectos}</p>
                  <p className="text-sm text-gray-600">Total Proyectos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{resumenGeneral.totalHorasPlanificadas}h</p>
                  <p className="text-sm text-gray-600">Horas Planificadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{resumenGeneral.totalHorasEjecutadas}h</p>
                  <p className="text-sm text-gray-600">Horas Ejecutadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-orange-500" />
                <div>
                  <p className={`text-2xl font-bold ${getColorAvance(resumenGeneral.porcentajeGeneral)}`}>
                    {resumenGeneral.porcentajeGeneral}%
                  </p>
                  <p className="text-sm text-gray-600">Avance General</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado de Proyectos */}
      {resumenGeneral && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">En Plazo:</span>
                <span className="text-green-700 font-bold">{resumenGeneral.proyectosEnPlazo}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium">Con Exceso:</span>
                <span className="text-red-700 font-bold">{resumenGeneral.proyectosConExceso}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Sin Planificacion:</span>
                <span className="text-gray-700 font-bold">{resumenGeneral.proyectosSinPlanificacion}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Proyectos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumen por Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {proyectos.map((proyecto) => (
              <div
                key={proyecto.proyecto.id}
                className={`p-4 border rounded-lg ${getColorPorEstado(proyecto.metricas.estadoHoras)}`}
              >
                {/* Header del Proyecto */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getIconoPorEstado(proyecto.metricas.estadoHoras)}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {proyecto.proyecto.codigo} - {proyecto.proyecto.nombre}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Cliente: {proyecto.proyecto.cliente} |
                        Estado: {proyecto.proyecto.estado} |
                        Progreso: {proyecto.proyecto.progresoGeneral}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getColorAvance(proyecto.metricas.porcentajeAvance)}`}>
                      {proyecto.metricas.porcentajeAvance}%
                    </div>
                    <p className="text-xs text-gray-600">Avance</p>
                  </div>
                </div>

                {/* Metricas del Proyecto */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Planificadas</p>
                    <p className="font-semibold">{proyecto.metricas.horasPlanificadas}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Ejecutadas</p>
                    <p className="font-semibold">{proyecto.metricas.horasEjecutadas}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Diferencia</p>
                    <p className={`font-semibold ${proyecto.metricas.diferenciaHoras > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {proyecto.metricas.diferenciaHoras > 0 ? '+' : ''}{proyecto.metricas.diferenciaHoras}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Registros</p>
                    <p className="font-semibold">{proyecto.metricas.totalRegistros}</p>
                  </div>
                </div>

                {/* Servicios Principales */}
                {proyecto.servicios && proyecto.servicios.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-600">
                        {mostrarTodosEdts ? 'Todos los Servicios:' : 'Servicios Principales (TOP 3 por horas):'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(mostrarTodosEdts
                        ? proyecto.servicios
                        : [...proyecto.servicios].sort((a, b) => b.horasEstimadas - a.horasEstimadas).slice(0, 3)
                      ).map((servicio: any, index: number) => (
                        <div
                          key={index}
                          className="rounded p-2 text-xs border bg-gray-50 border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium">#{servicio.orden}: {servicio.nombre}</div>
                          </div>

                          <div className="text-gray-600 text-xs">
                            EDT: {servicio.edt}
                          </div>

                          <div className="text-gray-600 text-xs">
                            Estimadas: {servicio.horasEstimadas}h | Real: {servicio.subtotalReal}h
                          </div>

                          <div className="text-gray-400 text-xs mt-1">
                            Items: {servicio.itemsCount}
                          </div>
                        </div>
                      ))}
                    </div>
                    {proyecto.servicios.length > 6 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Mostrando {mostrarTodosEdts ? 'todos' : 'TOP 3'} de {proyecto.servicios.length} Servicios
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {proyectos.length === 0 && !loading && (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin Datos
              </h3>
              <p className="text-gray-600">
                No se encontraron proyectos con los filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
