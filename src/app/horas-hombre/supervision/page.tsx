'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  Search,
  Calendar,
  Download,
  AlertCircle,
  Building2,
  TrendingUp,
  User
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSession } from 'next-auth/react'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  cliente: string
  estado: string
}

interface RegistroHoras {
  id: string
  horas: number
  descripcion: string
  textoJerarquico: string
  usuario: {
    id: string
    nombre: string
    email: string
  }
  recursoNombre: string
  aprobado: boolean
  fecha: Date
}

interface ResumenDia {
  fecha: Date
  fechaString: string
  diaNombre: string
  totalHoras: number
  registros: RegistroHoras[]
}

interface ResumenUsuario {
  usuarioId: string
  nombre: string
  email: string
  horas: number
  registros: number
  diasActivos: number
}

interface ResumenProyecto {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    cliente: string
    estado: string
  }
  periodo: {
    inicio: string
    fin: string
    semana: string
  }
  metricas: {
    totalHoras: number
    usuariosActivos: number
    promedioDiario: number
    promedioPorUsuario: number
    totalRegistros: number
  }
}

export default function SupervisionHorasPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('')
  const [fechaSemana, setFechaSemana] = useState(new Date())
  const [loadingProyectos, setLoadingProyectos] = useState(true)
  const [permiso, setPermiso] = useState(false)
  const [resumenProyecto, setResumenProyecto] = useState<ResumenProyecto | null>(null)
  const [diasSemana, setDiasSemana] = useState<ResumenDia[]>([])
  const [resumenUsuarios, setResumenUsuarios] = useState<ResumenUsuario[]>([])
  const [loadingSupervision, setLoadingSupervision] = useState(false)
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
      setPermiso(true)
      cargarProyectos()
    } else {
      setPermiso(false)
      toast({
        title: 'Acceso denegado',
        description: 'Esta funcionalidad es solo para administradores, coordinadores y gestores',
        variant: 'destructive'
      })
    }
  }, [status, session])

  const cargarProyectos = async () => {
    try {
      setLoadingProyectos(true)
      const response = await fetch('/api/proyectos')
      
      if (!response.ok) {
        throw new Error('Error al cargar proyectos')
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        const proyectosFormateados = data.data.map((proyecto: any) => ({
          id: proyecto.id,
          codigo: proyecto.codigo,
          nombre: proyecto.nombre,
          cliente: proyecto.cliente?.nombre || 'Sin cliente',
          estado: proyecto.estado
        }))
        setProyectos(proyectosFormateados)
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los proyectos',
        variant: 'destructive'
      })
    } finally {
      setLoadingProyectos(false)
    }
  }

  const loadSupervisionHoras = async () => {
    if (!proyectoSeleccionado) return
    
    try {
      setLoadingSupervision(true)

      const params = new URLSearchParams({
        proyectoId: proyectoSeleccionado === 'todos' ? '' : proyectoSeleccionado,
        semana: semanaISO
      })

      const response = await fetch(`/api/horas-hombre/supervision-proyecto?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar datos de supervisión')
      }

      const data = await response.json()

      if (data.success) {
        setResumenProyecto(data.data.resumenProyecto)
        setDiasSemana(data.data.diasSemana || [])
        setResumenUsuarios(data.data.resumenUsuarios || [])
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando supervisión de horas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de supervisión',
        variant: 'destructive'
      })
    } finally {
      setLoadingSupervision(false)
    }
  }

  const navegarSemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaSemana = direccion === 'anterior'
      ? subWeeks(fechaSemana, 1)
      : addWeeks(fechaSemana, 1)
    setFechaSemana(nuevaSemana)
  }

  const semanaISO = format(fechaSemana, 'yyyy-\'W\'ww')
  const semanaInicio = format(startOfWeek(fechaSemana, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const semanaFin = format(endOfWeek(fechaSemana, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const getColorPorHoras = (horas: number) => {
    if (horas === 0) return 'bg-gray-100'
    if (horas < 20) return 'bg-red-100'
    if (horas < 40) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  // Cargar datos cuando cambie la selección de proyecto
  useEffect(() => {
    if (proyectoSeleccionado && permiso) {
      loadSupervisionHoras()
    }
  }, [proyectoSeleccionado, semanaISO, permiso])

  // Si no hay permisos, mostrar mensaje de acceso denegado
  if (!permiso) {
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
                Esta funcionalidad está restringida para administradores, coordinadores y gestores.
              </p>
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
            <Users className="h-8 w-8 text-blue-600" />
            Supervisión de Horas - Proyecto
          </h1>
          <p className="text-gray-600 mt-2">
            Vista completa de todas las horas registradas por el equipo en un proyecto
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Rol: {session?.user?.role || 'Sin rol'}
        </Badge>
      </div>

      {/* Controles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Selección de Proyecto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProyectos ? (
              <div className="text-sm text-gray-500">Cargando proyectos...</div>
            ) : (
              <select
                value={proyectoSeleccionado}
                onChange={(e) => setProyectoSeleccionado(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Seleccionar proyecto</option>
                <option value="todos" className="text-blue-600 font-medium">
                  👥 Ver Todos los Proyectos
                </option>
                <option value="" disabled>──────────</option>
                {proyectos.map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.codigo} - {proyecto.nombre} ({proyecto.cliente})
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>

        {/* Navegación de Semana */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navegarSemana('anterior')}
              >
                ←
              </Button>
              <div className="flex-1 text-center">
                <div className="text-sm font-medium">
                  Semana {format(fechaSemana, 'w', { locale: es })}
                </div>
                <div className="text-xs text-gray-500">
                  {format(fechaSemana, 'yyyy', { locale: es })}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navegarSemana('siguiente')}
              >
                →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Acciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setFechaSemana(new Date())}
              >
                Esta semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  // TODO: Implementar exportación
                  toast({
                    title: 'Función en desarrollo',
                    description: 'La exportación estará disponible próximamente'
                  })
                }}
              >
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información del período */}
      {(proyectoSeleccionado || true) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Período:</span>
                <span>{semanaInicio} al {semanaFin}</span>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Proyecto:</span>
                <span>
                  {proyectos.find(p => p.id === proyectoSeleccionado)
                    ? `${proyectos.find(p => p.id === proyectoSeleccionado)?.codigo} - ${proyectos.find(p => p.id === proyectoSeleccionado)?.nombre}`
                    : 'Seleccione un proyecto'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Componente de supervisión integrado */}
      {proyectoSeleccionado ? (
        loadingSupervision ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando datos de supervisión...</p>
              </div>
            </CardContent>
          </Card>
        ) : !resumenProyecto ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sin Datos
                </h3>
                <p className="text-gray-600">
                  No se encontraron horas registradas para el proyecto seleccionado en el período.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Métricas del Proyecto */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{resumenProyecto.metricas.totalHoras}h</p>
                      <p className="text-sm text-gray-600">Total Horas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{resumenProyecto.metricas.usuariosActivos}</p>
                      <p className="text-sm text-gray-600">Usuarios Activos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{resumenProyecto.metricas.promedioDiario}h</p>
                      <p className="text-sm text-gray-600">Promedio/Día</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{resumenProyecto.metricas.totalRegistros}</p>
                      <p className="text-sm text-gray-600">Registros</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Información del Proyecto */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Proyecto:</span>
                    <p className="text-gray-900">{resumenProyecto.proyecto.codigo} - {resumenProyecto.proyecto.nombre}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Cliente:</span>
                    <p className="text-gray-900">{resumenProyecto.proyecto.cliente}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Período:</span>
                    <p className="text-gray-900">{resumenProyecto.periodo.inicio} al {resumenProyecto.periodo.fin}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vista Semanal del Proyecto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Vista Semanal por Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4">
                  {diasSemana.map((dia, index) => (
                    <div key={index} className="text-center">
                      <div className="font-medium text-gray-900 mb-2">
                        {dia.diaNombre}
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {format(new Date(dia.fecha), 'd MMM', { locale: es })}
                      </div>
                      
                      <div className={`min-h-[200px] border rounded-lg p-3 ${getColorPorHoras(dia.totalHoras)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold">{dia.totalHoras}h</span>
                          <Badge variant="secondary" className="text-xs">
                            {dia.registros.length}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          {dia.registros.slice(0, 4).map((registro) => (
                            <div
                              key={registro.id}
                              className="text-xs bg-white/80 rounded px-2 py-1 truncate"
                              title={`${registro.textoJerarquico} - ${registro.descripcion}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span className="truncate flex-1" title={registro.usuario.nombre}>
                                    {registro.usuario.nombre.split(' ')[0]}
                                  </span>
                                </div>
                                <span className="font-medium">{registro.horas}h</span>
                              </div>
                            </div>
                          ))}

                          {dia.registros.length > 4 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dia.registros.length - 4} más...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resumen por Usuario */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Resumen por Usuario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resumenUsuarios.map((usuario) => (
                    <div key={usuario.usuarioId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-500 text-white flex items-center justify-center text-sm font-medium rounded-full">
                          {usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{usuario.nombre}</p>
                          <p className="text-sm text-gray-600">{usuario.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-lg">{usuario.horas}h</p>
                          <p className="text-gray-600">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{usuario.registros}</p>
                          <p className="text-gray-600">Registros</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{usuario.diasActivos}</p>
                          <p className="text-gray-600">Días</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecciona un Proyecto
              </h3>
              <p className="text-gray-600">
                Elige un proyecto de la lista o "Ver Todos los Proyectos" para ver las horas registradas por el equipo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}