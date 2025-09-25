'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, Search, Filter, Calendar, User as UserIcon, Building2, TrendingUp, Clock, Loader2, List, Grid3X3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getAllActividades, CrmActividad, TIPOS_ACTIVIDAD, RESULTADOS_ACTIVIDAD } from '@/lib/services/crm/actividades'
import { getOportunidades, CrmOportunidad } from '@/lib/services/crm/oportunidades'
import { getUsuarios, Usuario } from '@/lib/services/usuario'

interface ActividadExtendida extends CrmActividad {
  oportunidad?: {
    id: string
    nombre: string
    cliente?: {
      id: string
      nombre: string
      codigo: string
    }
  }
}

export default function CrmActividadesPage() {
  const router = useRouter()
  const [actividades, setActividades] = useState<ActividadExtendida[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estadisticas, setEstadisticas] = useState<Record<string, number>>({})

  // Filter states
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [resultadoFilter, setResultadoFilter] = useState('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [oportunidadFilter, setOportunidadFilter] = useState('todos')
  const [usuarioFilter, setUsuarioFilter] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  // Data for filters
  const [oportunidades, setOportunidades] = useState<CrmOportunidad[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  // Load filter data (opportunities and users)
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [oportunidadesData, usuariosData] = await Promise.all([
          getOportunidades({}, { limit: 100 }),
          getUsuarios()
        ])
        setOportunidades(oportunidadesData.data)
        setUsuarios(usuariosData)
      } catch (err) {
        console.error('Error loading filter data:', err)
      }
    }

    loadFilterData()
  }, [])

  useEffect(() => {
    const loadActividades = async () => {
      try {
        setLoading(true)
        setError(null)

        const filters: any = {}
        if (tipoFilter !== 'todos') filters.tipo = tipoFilter
        if (resultadoFilter !== 'todos') filters.resultado = resultadoFilter
        if (fechaDesde) filters.fechaDesde = fechaDesde
        if (fechaHasta) filters.fechaHasta = fechaHasta
        if (oportunidadFilter !== 'todos') filters.oportunidadId = oportunidadFilter
        if (usuarioFilter !== 'todos') filters.usuarioId = usuarioFilter
        if (searchTerm) filters.search = searchTerm

        const response = await getAllActividades(filters, { limit: 50 })
        setActividades(response.data as ActividadExtendida[])
        setEstadisticas(response.estadisticas)
      } catch (err) {
        setError('Error al cargar actividades')
        console.error('Error loading actividades:', err)
      } finally {
        setLoading(false)
      }
    }

    loadActividades()
  }, [tipoFilter, resultadoFilter, fechaDesde, fechaHasta, oportunidadFilter, usuarioFilter, searchTerm])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case TIPOS_ACTIVIDAD.LLAMADA: return 'default'
      case TIPOS_ACTIVIDAD.EMAIL: return 'secondary'
      case TIPOS_ACTIVIDAD.REUNION: return 'outline'
      case TIPOS_ACTIVIDAD.PROPUESTA: return 'destructive'
      default: return 'outline'
    }
  }

  const getResultadoBadgeVariant = (resultado?: string) => {
    switch (resultado) {
      case RESULTADOS_ACTIVIDAD.POSITIVO: return 'default'
      case RESULTADOS_ACTIVIDAD.NEGATIVO: return 'destructive'
      case RESULTADOS_ACTIVIDAD.NEUTRO: return 'secondary'
      case RESULTADOS_ACTIVIDAD.PENDIENTE: return 'outline'
      default: return 'outline'
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case TIPOS_ACTIVIDAD.LLAMADA: return 'Llamada'
      case TIPOS_ACTIVIDAD.EMAIL: return 'Email'
      case TIPOS_ACTIVIDAD.REUNION: return 'Reunión'
      case TIPOS_ACTIVIDAD.PROPUESTA: return 'Propuesta'
      case TIPOS_ACTIVIDAD.SEGUIMIENTO: return 'Seguimiento'
      case TIPOS_ACTIVIDAD.VISITA: return 'Visita'
      case TIPOS_ACTIVIDAD.DEMOSTRACION: return 'Demostración'
      default: return tipo
    }
  }

  const getResultadoLabel = (resultado?: string) => {
    switch (resultado) {
      case RESULTADOS_ACTIVIDAD.POSITIVO: return 'Positivo'
      case RESULTADOS_ACTIVIDAD.NEGATIVO: return 'Negativo'
      case RESULTADOS_ACTIVIDAD.NEUTRO: return 'Neutro'
      case RESULTADOS_ACTIVIDAD.PENDIENTE: return 'Pendiente'
      default: return 'Sin resultado'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando actividades...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-600 mb-2">Error al cargar actividades</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Actividades CRM</h1>
            <p className="text-gray-600 mt-1">Historial completo de todas las actividades comerciales</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total || 0}</div>
            <p className="text-xs text-muted-foreground">Registradas en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Llamadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estadisticas.tipo_llamada || 0}</div>
            <p className="text-xs text-muted-foreground">Realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reuniones</CardTitle>
            <UserIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{estadisticas.tipo_reunión || 0}</div>
            <p className="text-xs text-muted-foreground">Agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propuestas</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{estadisticas.tipo_propuesta || 0}</div>
            <p className="text-xs text-muted-foreground">Enviadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Descripción, notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* View Toggle Buttons - Hidden on mobile */}
            <div className="hidden md:flex items-end">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4 mr-1" />
                  Tabla
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('card')}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Cards
                </Button>
              </div>
            </div>

            {/* Tipo Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value={TIPOS_ACTIVIDAD.LLAMADA}>Llamadas</SelectItem>
                  <SelectItem value={TIPOS_ACTIVIDAD.EMAIL}>Emails</SelectItem>
                  <SelectItem value={TIPOS_ACTIVIDAD.REUNION}>Reuniones</SelectItem>
                  <SelectItem value={TIPOS_ACTIVIDAD.PROPUESTA}>Propuestas</SelectItem>
                  <SelectItem value={TIPOS_ACTIVIDAD.SEGUIMIENTO}>Seguimiento</SelectItem>
                  <SelectItem value={TIPOS_ACTIVIDAD.VISITA}>Visitas</SelectItem>
                  <SelectItem value={TIPOS_ACTIVIDAD.DEMOSTRACION}>Demostraciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resultado Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Resultado</label>
              <Select value={resultadoFilter} onValueChange={setResultadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.POSITIVO}>Positivo</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.NEGATIVO}>Negativo</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.NEUTRO}>Neutro</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.PENDIENTE}>Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Oportunidad Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Oportunidad</label>
              <Select value={oportunidadFilter} onValueChange={setOportunidadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las oportunidades</SelectItem>
                  {oportunidades.map((oportunidad) => (
                    <SelectItem key={oportunidad.id} value={oportunidad.id}>
                      {oportunidad.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second row for additional filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Usuario Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuario</label>
              <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los usuarios</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Display - Table or Card View */}
      {viewMode === 'table' ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oportunidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actividades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay actividades registradas</h3>
                      <p className="text-muted-foreground">
                        Las actividades aparecerán aquí cuando se registren en las oportunidades.
                      </p>
                    </td>
                  </tr>
                ) : (
                  actividades.map((actividad, index) => (
                    <motion.tr
                      key={actividad.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.05,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant={getTipoBadgeVariant(actividad.tipo)}>
                          {getTipoLabel(actividad.tipo)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{actividad.descripcion}</div>
                          {actividad.notas && (
                            <div className="text-sm text-gray-500 mt-1">{actividad.notas}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {actividad.resultado ? (
                          <Badge variant={getResultadoBadgeVariant(actividad.resultado)}>
                            {getResultadoLabel(actividad.resultado)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Sin resultado</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(actividad.fecha)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {actividad.usuario && (
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback className="text-xs">
                                {actividad.usuario.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-900">{actividad.usuario.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {actividad.oportunidad && (
                          <div className="text-sm">
                            <div
                              className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                              onClick={() => router.push(`/crm/${actividad.oportunidadId}`)}
                            >
                              {actividad.oportunidad.nombre}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {actividad.oportunidad?.cliente && (
                          <div className="text-sm text-gray-900">
                            {actividad.oportunidad.cliente.nombre}
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {actividades.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay actividades registradas</h3>
              <p className="text-muted-foreground">
                Las actividades aparecerán aquí cuando se registren en las oportunidades.
              </p>
            </div>
          ) : (
            actividades.map((actividad) => (
              <motion.div
                key={actividad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant={getTipoBadgeVariant(actividad.tipo)}>
                            {getTipoLabel(actividad.tipo)}
                          </Badge>
                          {actividad.resultado && (
                            <Badge variant={getResultadoBadgeVariant(actividad.resultado)}>
                              {getResultadoLabel(actividad.resultado)}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(actividad.fecha)}
                          </div>
                        </div>

                        <h3 className="font-medium text-gray-900 mb-2">{actividad.descripcion}</h3>

                        {actividad.notas && (
                          <p className="text-sm text-gray-600 mb-3">{actividad.notas}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {actividad.usuario && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {actividad.usuario.name?.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{actividad.usuario.name}</span>
                              </div>
                            )}

                            {actividad.oportunidad && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                <span
                                  className="hover:text-blue-600 cursor-pointer"
                                  onClick={() => router.push(`/crm/${actividad.oportunidadId}`)}
                                >
                                  {actividad.oportunidad.nombre}
                                </span>
                                {actividad.oportunidad.cliente && (
                                  <span className="text-muted-foreground">
                                    ({actividad.oportunidad.cliente.nombre})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  )
}