// ===================================================
// 🎯 DASHBOARD DE ACTIVIDAD DEL SISTEMA
// ===================================================
// Componente que muestra la actividad reciente de todo el sistema
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Users,
  FileText,
  Package,
  Building2,
  TrendingUp,
  Clock,
  User,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { AuditLog } from '@/types/modelos'
import { formatDistanceToNow, format } from 'date-fns'

interface ActivityDashboardProps {
  limite?: number
  autoRefresh?: boolean
  intervaloRefresh?: number // en minutos
  mostrarFiltros?: boolean
}

// ===================================================
// 🎨 ICONOS POR TIPO DE ENTIDAD
// ===================================================

const getEntityIcon = (entidadTipo: string) => {
  switch (entidadTipo) {
    case 'LISTA_EQUIPO':
      return <Package className="w-4 h-4 text-blue-500" />
    case 'PEDIDO_EQUIPO':
      return <FileText className="w-4 h-4 text-green-500" />
    case 'PROYECTO':
      return <Building2 className="w-4 h-4 text-purple-500" />
    case 'COTIZACION':
      return <FileText className="w-4 h-4 text-orange-500" />
    case 'OPORTUNIDAD':
      return <TrendingUp className="w-4 h-4 text-red-500" />
    default:
      return <Activity className="w-4 h-4 text-gray-500" />
  }
}

const getEntityColor = (entidadTipo: string) => {
  switch (entidadTipo) {
    case 'LISTA_EQUIPO':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    case 'PEDIDO_EQUIPO':
      return 'bg-green-50 border-green-200 text-green-800'
    case 'PROYECTO':
      return 'bg-purple-50 border-purple-200 text-purple-800'
    case 'COTIZACION':
      return 'bg-orange-50 border-orange-200 text-orange-800'
    case 'OPORTUNIDAD':
      return 'bg-red-50 border-red-200 text-red-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

const getEntityLabel = (entidadTipo: string) => {
  switch (entidadTipo) {
    case 'LISTA_EQUIPO':
      return 'Lista de Equipo'
    case 'PEDIDO_EQUIPO':
      return 'Pedido de Equipo'
    case 'PROYECTO':
      return 'Proyecto'
    case 'COTIZACION':
      return 'Cotización'
    case 'OPORTUNIDAD':
      return 'Oportunidad'
    case 'LISTA_EQUIPO_ITEM':
      return 'Ítem de Lista'
    default:
      return entidadTipo.replace('_', ' ')
  }
}

// ===================================================
// 🎨 ICONOS POR TIPO DE ACCIÓN
// ===================================================

const getActionIcon = (accion: string) => {
  switch (accion) {
    case 'CREAR':
      return <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    case 'ACTUALIZAR':
      return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
    case 'ELIMINAR':
      return <div className="w-2 h-2 bg-red-500 rounded-full"></div>
    case 'CAMBIAR_ESTADO':
      return <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
    default:
      return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
  }
}

// ===================================================
// 📅 FORMATEADORES DE FECHA
// ===================================================

const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return format(date, 'dd/MM/yyyy HH:mm')
}

const formatRelativeTime = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return formatDistanceToNow(date, {
    addSuffix: true
  })
}

// ===================================================
// 🔍 COMPONENTE PRINCIPAL
// ===================================================

export default function ActivityDashboard({
  limite = 50,
  autoRefresh = false,
  intervaloRefresh = 5,
  mostrarFiltros = true
}: ActivityDashboardProps) {
  const [actividad, setActividad] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroUsuario, setFiltroUsuario] = useState<string>('')
  const [filtroEntidad, setFiltroEntidad] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  // ===================================================
  // 📡 CARGA DE DATOS
  // ===================================================

  const cargarActividad = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)
      setError(null)

      // Llamar a la API en lugar del servicio directo
      const params = new URLSearchParams({
        limite: limite.toString(),
        ...(filtroUsuario && { usuarioId: filtroUsuario })
      })

      const response = await fetch(`/api/audit/actividad-reciente?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error al cargar actividad: ${response.statusText}`)
      }

      const result = await response.json()
      setActividad(result.data || [])
    } catch (err) {
      console.error('Error al cargar actividad:', err)
      setError('Error al cargar la actividad del sistema')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    cargarActividad()
  }, [limite])

  // Recargar cuando cambie el filtro de usuario
  useEffect(() => {
    cargarActividad(false)
  }, [filtroUsuario])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      cargarActividad(false)
    }, intervaloRefresh * 60 * 1000) // Convertir minutos a milisegundos

    return () => clearInterval(interval)
  }, [autoRefresh, intervaloRefresh])

  // ===================================================
  // 🎮 HANDLERS
  // ===================================================

  const handleRefresh = () => {
    cargarActividad(false)
  }

  const handleFiltroChange = (tipo: 'usuario' | 'entidad', valor: string) => {
    if (tipo === 'usuario') {
      setFiltroUsuario(valor)
    } else {
      setFiltroEntidad(valor)
    }
  }

  // ===================================================
  // 📊 ESTADÍSTICAS
  // ===================================================

  const estadisticas = actividad.reduce((acc, item) => {
    // Por entidad
    acc.entidades[item.entidadTipo] = (acc.entidades[item.entidadTipo] || 0) + 1

    // Por acción
    acc.acciones[item.accion] = (acc.acciones[item.accion] || 0) + 1

    // Por usuario
    if (item.usuario?.name) {
      acc.usuarios[item.usuario.name] = (acc.usuarios[item.usuario.name] || 0) + 1
    }

    return acc
  }, {
    entidades: {} as Record<string, number>,
    acciones: {} as Record<string, number>,
    usuarios: {} as Record<string, number>
  })

  // ===================================================
  // 🎨 RENDERIZADO
  // ===================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Cargando actividad del sistema...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <Activity className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filtrar actividad por entidad si hay filtro
  const actividadFiltrada = filtroEntidad
    ? actividad.filter(item => item.entidadTipo === filtroEntidad)
    : actividad

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Actividad del Sistema</h2>
            <p className="text-muted-foreground">
              Historial reciente de acciones en la plataforma
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actividadFiltrada.length}</div>
            <p className="text-xs text-muted-foreground">
              En las últimas horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entidades Activas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(estadisticas.entidades).length}</div>
            <p className="text-xs text-muted-foreground">
              Tipos diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(estadisticas.usuarios).length}</div>
            <p className="text-xs text-muted-foreground">
              Han realizado acciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(estadisticas.acciones).length}</div>
            <p className="text-xs text-muted-foreground">
              Tipos de operaciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros - Temporalmente deshabilitados para evitar errores de SelectItem */}
      {mostrarFiltros && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Los filtros avanzados estarán disponibles próximamente.
              Por ahora se muestra toda la actividad del sistema.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de actividad */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            {actividadFiltrada.length} eventos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actividadFiltrada.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay actividad registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actividadFiltrada.map((evento, index) => (
                  <motion.div
                    key={evento.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Indicador de acción */}
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(evento.accion)}
                    </div>

                    {/* Icono de entidad */}
                    <div className="flex-shrink-0">
                      {getEntityIcon(evento.entidadTipo)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getEntityColor(evento.entidadTipo)}`}
                          >
                            {getEntityLabel(evento.entidadTipo)}
                          </Badge>
                          <span className="text-sm font-medium">{evento.descripcion}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span title={formatDate(evento.createdAt)}>
                            {formatRelativeTime(evento.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Usuario */}
                      <div className="flex items-center space-x-2 mt-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-xs">
                            {evento.usuario?.name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {evento.usuario?.name || 'Usuario desconocido'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}