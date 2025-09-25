'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  History,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Filter,
  Building,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/plantilla-utils'

interface RegistroHistorial {
  id: string
  tipo: 'proyecto' | 'cotizacion' | 'historial'
  titulo: string
  codigo: string | null
  estado: string
  fechaInicio: string | null
  fechaFin: string | null
  valor: number | null
  responsable: string | null
  createdAt: string
  // Campos adicionales para historial
  sector?: string
  complejidad?: string
  duracionDias?: number
  calificacionCliente?: number
  exitos?: string
  problemas?: string
}

interface Estadisticas {
  totalProyectos: number
  totalCotizaciones: number
  totalRegistrosHistorial: number
  valorTotalProyectos: number
  valorTotalCotizaciones: number
  proyectosActivos: number
  cotizacionesPendientes: number
}

interface HistorialProyectoListProps {
  registros: RegistroHistorial[]
  estadisticas: Estadisticas
  clienteNombre: string
  loading?: boolean
}

export default function HistorialProyectoList({
  registros,
  estadisticas,
  clienteNombre,
  loading = false
}: HistorialProyectoListProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'proyecto':
        return Building
      case 'cotizacion':
        return TrendingUp
      case 'historial':
        return History
      default:
        return History
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'proyecto':
        return 'text-blue-600 bg-blue-100'
      case 'cotizacion':
        return 'text-green-600 bg-green-100'
      case 'historial':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'completado':
      case 'entregado':
        return CheckCircle
      case 'en_ejecucion':
      case 'enviada':
        return Clock
      case 'cancelado':
      case 'rechazada':
        return XCircle
      default:
        return AlertCircle
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'completado':
      case 'entregado':
        return 'text-green-600 bg-green-100'
      case 'en_ejecucion':
      case 'enviada':
        return 'text-blue-600 bg-blue-100'
      case 'cancelado':
      case 'rechazada':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const registrosFiltrados = filtroTipo === 'todos'
    ? registros
    : registros.filter(r => r.tipo === filtroTipo)

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Proyectos</span>
            </div>
            <div className="text-2xl font-bold">{estadisticas.totalProyectos}</div>
            <div className="text-xs text-muted-foreground">
              {estadisticas.proyectosActivos} activos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Cotizaciones</span>
            </div>
            <div className="text-2xl font-bold">{estadisticas.totalCotizaciones}</div>
            <div className="text-xs text-muted-foreground">
              {estadisticas.cotizacionesPendientes} pendientes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Valor Proyectos</span>
            </div>
            <div className="text-lg font-bold">{formatCurrency(estadisticas.valorTotalProyectos)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Historial</span>
            </div>
            <div className="text-2xl font-bold">{estadisticas.totalRegistrosHistorial}</div>
            <div className="text-xs text-muted-foreground">
              registros históricos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrar por:</span>
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los registros</SelectItem>
            <SelectItem value="proyecto">Solo Proyectos</SelectItem>
            <SelectItem value="cotizacion">Solo Cotizaciones</SelectItem>
            <SelectItem value="historial">Solo Historial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de registros */}
      {registrosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {filtroTipo === 'todos' ? 'No hay registros históricos' : `No hay registros de ${filtroTipo}`}
            </h3>
            <p className="text-muted-foreground">
              {clienteNombre} no tiene registros de este tipo aún.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {registrosFiltrados.map((registro, index) => {
            const TipoIcon = getTipoIcon(registro.tipo)
            const EstadoIcon = getEstadoIcon(registro.estado)

            return (
              <motion.div
                key={registro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Icono del tipo */}
                        <div className={`p-2 rounded-lg ${getTipoColor(registro.tipo)}`}>
                          <TipoIcon className="h-5 w-5" />
                        </div>

                        {/* Información principal */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-lg">{registro.titulo}</h4>
                            <Badge variant="outline" className="capitalize">
                              {registro.tipo}
                            </Badge>
                            {registro.codigo && (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {registro.codigo}
                              </Badge>
                            )}
                          </div>

                          {/* Estado y responsable */}
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getEstadoColor(registro.estado)}`}>
                              <EstadoIcon className="h-3 w-3" />
                              <span className="capitalize">{registro.estado.replace('_', ' ')}</span>
                            </div>

                            {registro.responsable && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                {registro.responsable}
                              </div>
                            )}

                            {registro.valor && (
                              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(registro.valor)}
                              </div>
                            )}
                          </div>

                          {/* Fechas */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {registro.fechaInicio && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Inicio: {new Date(registro.fechaInicio).toLocaleDateString('es-ES')}
                              </div>
                            )}
                            {registro.fechaFin && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Fin: {new Date(registro.fechaFin).toLocaleDateString('es-ES')}
                              </div>
                            )}
                            {!registro.fechaInicio && !registro.fechaFin && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Creado: {new Date(registro.createdAt).toLocaleDateString('es-ES')}
                              </div>
                            )}
                          </div>

                          {/* Información adicional para registros históricos */}
                          {registro.tipo === 'historial' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
                              {registro.sector && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Sector:</span>
                                  <p className="text-sm">{registro.sector}</p>
                                </div>
                              )}
                              {registro.complejidad && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Complejidad:</span>
                                  <p className="text-sm">{registro.complejidad}</p>
                                </div>
                              )}
                              {registro.calificacionCliente && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Calificación:</span>
                                  <p className="text-sm">{registro.calificacionCliente}/5 ⭐</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Éxitos y problemas para historial detallado */}
                          {registro.tipo === 'historial' && (registro.exitos || registro.problemas) && (
                            <div className="space-y-2">
                              {registro.exitos && (
                                <div className="p-2 bg-green-50 border border-green-200 rounded">
                                  <p className="text-xs font-medium text-green-800 mb-1">Éxitos:</p>
                                  <p className="text-sm text-green-700">{registro.exitos}</p>
                                </div>
                              )}
                              {registro.problemas && (
                                <div className="p-2 bg-red-50 border border-red-200 rounded">
                                  <p className="text-xs font-medium text-red-800 mb-1">Problemas:</p>
                                  <p className="text-sm text-red-700">{registro.problemas}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}