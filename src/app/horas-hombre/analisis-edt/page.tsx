'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Building2,
  Filter,
  FileText,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSession } from 'next-auth/react'

interface AnalisisEdt {
  edt: {
    id: string
    nombre: string
    proyectoEdtId: string
  }
  horas: {
    cotizadas: number
    planificadas: number
    ejecutadas: number
  }
  desviaciones: {
    planVsCotizado: number
    ejecVsCotizado: number
    ejecVsPlan: number
  }
  porcentajes: {
    ejecVsCotizado: number
    ejecVsPlan: number
  }
  estado: 'en_presupuesto' | 'sobre_cotizado' | 'sub_cotizado' | 'sin_cotizacion'
}

interface AnalisisProyecto {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    cliente: string
    estado: string
    cotizacion: {
      codigo: string
      nombre: string
    } | null
  }
  edts: AnalisisEdt[]
  totales: {
    cotizadas: number
    planificadas: number
    ejecutadas: number
  }
}

interface ResumenGeneral {
  totalProyectos: number
  totalEdts: number
  horasTotales: {
    cotizadas: number
    planificadas: number
    ejecutadas: number
  }
  edtsPorEstado: {
    en_presupuesto: number
    sobre_cotizado: number
    sub_cotizado: number
    sin_cotizacion: number
  }
}

export default function AnalisisEdtPage() {
  const [proyectos, setProyectos] = useState<AnalisisProyecto[]>([])
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneral | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroProyecto, setFiltroProyecto] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('')
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // Verificar permisos al cargar
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      toast({
        title: 'Error de autenticación',
        description: 'Debe iniciar sesión para acceder a esta funcionalidad',
        variant: 'destructive'
      })
      return
    }

    const userRole = session.user.role
    if (['admin', 'coordinador', 'gestor'].includes(userRole)) {
      cargarAnalisisEdt()
    } else {
      toast({
        title: 'Acceso denegado',
        description: 'Esta funcionalidad es solo para administradores, coordinadores y gestores',
        variant: 'destructive'
      })
    }
  }, [status, session])

  const cargarAnalisisEdt = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (filtroProyecto) {
        params.append('proyectoId', filtroProyecto)
      }
      if (filtroEstado) {
        params.append('estado', filtroEstado)
      }

      const response = await fetch(`/api/horas-hombre/analisis-edt-detallado?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar análisis EDT')
      }

      const data = await response.json()

      if (data.success) {
        setResumenGeneral(data.data.resumenGeneral)
        setProyectos(data.data.proyectos)
        
        console.log('✅ Frontend: Datos cargados exitosamente')
        console.log('🔍 Frontend: Proyectos encontrados:', data.data.proyectos.length)
        data.data.proyectos.forEach((proyecto: AnalisisProyecto, index: number) => {
          console.log(`   Proyecto ${index + 1}: ${proyecto.proyecto.codigo} - ${proyecto.proyecto.nombre}`)
          console.log(`   EDTs en proyecto: ${proyecto.edts.length}`)
          proyecto.edts.forEach((edt: AnalisisEdt, edtIndex: number) => {
            console.log(`     EDT ${edtIndex + 1}: ${edt.edt.nombre}`)
          })
        })
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando análisis EDT:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el análisis EDT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos cuando cambien los filtros
  useEffect(() => {
    if (session?.user?.role && ['admin', 'coordinador', 'gestor'].includes(session.user.role)) {
      cargarAnalisisEdt()
    }
  }, [filtroProyecto, filtroEstado])

  const getColorPorEstado = (estado: 'en_presupuesto' | 'sobre_cotizado' | 'sub_cotizado' | 'sin_cotizacion') => {
    switch (estado) {
      case 'en_presupuesto':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'sobre_cotizado':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'sub_cotizado':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'sin_cotizacion':
        return 'bg-gray-50 border-gray-200 text-gray-600'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600'
    }
  }

  const getIconoPorEstado = (estado: 'en_presupuesto' | 'sobre_cotizado' | 'sub_cotizado' | 'sin_cotizacion') => {
    switch (estado) {
      case 'en_presupuesto':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'sobre_cotizado':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'sub_cotizado':
        return <TrendingDown className="h-4 w-4 text-yellow-600" />
      case 'sin_cotizacion':
        return <Target className="h-4 w-4 text-gray-500" />
      default:
        return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  const getIconoDesviacion = (valor: number) => {
    if (valor > 0) return <ArrowUp className="h-3 w-3 text-red-500" />
    if (valor < 0) return <ArrowDown className="h-3 w-3 text-green-500" />
    return <Minus className="h-3 w-3 text-gray-500" />
  }

  const getColorDesviacion = (valor: number) => {
    if (valor > 0) return 'text-red-600'
    if (valor < 0) return 'text-green-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando análisis EDT...</p>
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
            Análisis EDT Detallado
          </h1>
          <p className="text-gray-600 mt-2">
            Comparación EDT por EDT: Cotizado vs Planificado vs Ejecutado
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
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Proyecto:</label>
              <select
                value={filtroProyecto}
                onChange={(e) => setFiltroProyecto(e.target.value)}
                className="p-2 border rounded-md text-sm"
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map((proyecto) => (
                  <option key={proyecto.proyecto.id} value={proyecto.proyecto.id}>
                    {proyecto.proyecto.codigo} - {proyecto.proyecto.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Estado del proyecto:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="p-2 border rounded-md text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="creado">Creado</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="completado">Completado</option>
                <option value="pausado">Pausado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={cargarAnalisisEdt}
            >
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Generales */}
      {resumenGeneral && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{resumenGeneral.totalProyectos}</p>
                  <p className="text-sm text-gray-600">Proyectos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{resumenGeneral.totalEdts}</p>
                  <p className="text-sm text-gray-600">EDTs Analizados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{resumenGeneral.horasTotales.cotizadas}h</p>
                  <p className="text-sm text-gray-600">Horas Cotizadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{resumenGeneral.horasTotales.ejecutadas}h</p>
                  <p className="text-sm text-gray-600">Horas Ejecutadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado de EDTs */}
      {resumenGeneral && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">En Presupuesto:</span>
                <span className="text-green-700 font-bold">{resumenGeneral.edtsPorEstado.en_presupuesto}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium">Sobre Cotizado:</span>
                <span className="text-red-700 font-bold">{resumenGeneral.edtsPorEstado.sobre_cotizado}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Sub Cotizado:</span>
                <span className="text-yellow-700 font-bold">{resumenGeneral.edtsPorEstado.sub_cotizado}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Sin Cotización:</span>
                <span className="text-gray-700 font-bold">{resumenGeneral.edtsPorEstado.sin_cotizacion}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Análisis por Proyecto */}
      {proyectos.map((analisisProyecto) => (
        <Card key={analisisProyecto.proyecto.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {analisisProyecto.proyecto.codigo} - {analisisProyecto.proyecto.nombre}
              <Badge variant="secondary" className="ml-2">
                {analisisProyecto.proyecto.cliente}
              </Badge>
            </CardTitle>
            {analisisProyecto.proyecto.cotizacion && (
              <p className="text-sm text-gray-600">
                Cotización: {analisisProyecto.proyecto.cotizacion.codigo} - {analisisProyecto.proyecto.cotizacion.nombre}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {/* Totales del Proyecto */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{analisisProyecto.totales.cotizadas}h</p>
                <p className="text-sm text-gray-600">Cotizadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{analisisProyecto.totales.planificadas}h</p>
                <p className="text-sm text-gray-600">Planificadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{analisisProyecto.totales.ejecutadas}h</p>
                <p className="text-sm text-gray-600">Ejecutadas</p>
              </div>
            </div>

            {/* Tabla de EDTs */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg mb-4">📊 EDTs del Proyecto ({analisisProyecto.edts.length})</h4>
              {analisisProyecto.edts.map((edt, index) => (
                <div
                  key={`${edt.edt.id}-${index}`}
                  className={`p-4 border rounded-lg ${getColorPorEstado(edt.estado)}`}
                >
                  {/* Header del EDT */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getIconoPorEstado(edt.estado)}
                      <div>
                        <h4 className="font-semibold">
                          {edt.edt.nombre}
                        </h4>
                        <p className="text-sm">
                          Estado: {edt.estado.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {edt.porcentajes.ejecVsCotizado}%
                      </div>
                      <p className="text-xs">vs Cotizado</p>
                    </div>
                  </div>

                  {/* Horas Comparativas */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-sm text-gray-600">Cotizado</p>
                      <p className="text-lg font-bold text-green-600">{edt.horas.cotizadas}h</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-sm text-gray-600">Planificado</p>
                      <p className="text-lg font-bold text-blue-600">{edt.horas.planificadas}h</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <p className="text-sm text-gray-600">Ejecutado</p>
                      <p className="text-lg font-bold text-orange-600">{edt.horas.ejecutadas}h</p>
                    </div>
                  </div>

                  {/* Desviaciones */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      {getIconoDesviacion(edt.desviaciones.ejecVsCotizado)}
                      <span>vs Cotizado:</span>
                      <span className={`font-semibold ${getColorDesviacion(edt.desviaciones.ejecVsCotizado)}`}>
                        {edt.desviaciones.ejecVsCotizado > 0 ? '+' : ''}{edt.desviaciones.ejecVsCotizado}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getIconoDesviacion(edt.desviaciones.ejecVsPlan)}
                      <span>vs Plan:</span>
                      <span className={`font-semibold ${getColorDesviacion(edt.desviaciones.ejecVsPlan)}`}>
                        {edt.desviaciones.ejecVsPlan > 0 ? '+' : ''}{edt.desviaciones.ejecVsPlan}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getIconoDesviacion(edt.desviaciones.planVsCotizado)}
                      <span>Plan vs Cotiz:</span>
                      <span className={`font-semibold ${getColorDesviacion(edt.desviaciones.planVsCotizado)}`}>
                        {edt.desviaciones.planVsCotizado > 0 ? '+' : ''}{edt.desviaciones.planVsCotizado}h
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {proyectos.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin Datos
              </h3>
              <p className="text-gray-600">
                No se encontraron EDTs con los filtros seleccionados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}