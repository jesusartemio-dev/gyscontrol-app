'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, Search, Filter, Calendar, User, Building2, TrendingUp, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getAllActividades, CrmActividad, TIPOS_ACTIVIDAD, RESULTADOS_ACTIVIDAD } from '@/lib/services/crm/actividades'

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
  }, [tipoFilter, resultadoFilter, fechaDesde, fechaHasta])

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
            <User className="h-4 w-4 text-blue-600" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Actividad</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Resultado</label>
              <Select value={resultadoFilter} onValueChange={setResultadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los resultados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los resultados</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.POSITIVO}>Positivo</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.NEGATIVO}>Negativo</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.NEUTRO}>Neutro</SelectItem>
                  <SelectItem value={RESULTADOS_ACTIVIDAD.PENDIENTE}>Pendiente</SelectItem>
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

      {/* Activities List */}
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
    </motion.div>
  )
}