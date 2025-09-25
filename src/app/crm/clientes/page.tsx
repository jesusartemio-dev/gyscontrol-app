'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, Users, Search, Filter, Eye, BarChart3, Loader2, List, Grid3X3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getClientes } from '@/lib/services/cliente'
import type { Cliente } from '@/types'

// Extended Cliente type with CRM fields
interface ClienteCRM extends Cliente {
  sector?: string
  tamanoEmpresa?: string
  estadoRelacion?: string
  calificacion?: number
  ultimoProyecto?: string
  potencialAnual?: number
}

export default function CrmClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<ClienteCRM[]>([])
  const [filteredClientes, setFilteredClientes] = useState<ClienteCRM[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('todos')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  useEffect(() => {
    const loadClientes = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getClientes()
        setClientes(data as ClienteCRM[])
      } catch (err) {
        setError('Error al cargar los clientes')
        console.error('Error loading clients:', err)
      } finally {
        setLoading(false)
      }
    }

    loadClientes()
  }, [])

  // Filter and search functionality
  useEffect(() => {
    let filtered = [...clientes]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cliente =>
        cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.correo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sector filter
    if (sectorFilter && sectorFilter !== "todos") {
      filtered = filtered.filter(cliente => cliente.sector === sectorFilter)
    }

    // Estado filter
    if (estadoFilter && estadoFilter !== "todos") {
      filtered = filtered.filter(cliente => cliente.estadoRelacion === estadoFilter)
    }

    setFilteredClientes(filtered)
  }, [clientes, searchTerm, sectorFilter, estadoFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getEstadoBadgeVariant = (estado?: string) => {
    switch (estado) {
      case 'cliente_activo': return 'default'
      case 'prospecto': return 'secondary'
      case 'cliente_inactivo': return 'outline'
      default: return 'outline'
    }
  }

  const getEstadoLabel = (estado?: string) => {
    switch (estado) {
      case 'cliente_activo': return 'Cliente Activo'
      case 'prospecto': return 'Prospecto'
      case 'cliente_inactivo': return 'Inactivo'
      default: return 'Sin Estado'
    }
  }

  const getCalificacionStars = (calificacion?: number) => {
    if (!calificacion) return null
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-sm ${i < calificacion ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
    ))
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando clientes CRM...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-600 mb-2">Error al cargar clientes</h3>
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
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes CRM</h1>
            <p className="text-gray-600 mt-1">Administra la información CRM de tus clientes</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/comercial/clientes')}>
            <Users className="h-4 w-4 mr-2" />
            Vista Básica
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nombre, RUC o email..."
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

            {/* Sector Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sector</label>
              <Select value={sectorFilter || "todos"} onValueChange={(value) => setSectorFilter(value === "todos" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los sectores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los sectores</SelectItem>
                  <SelectItem value="Minería">Minería</SelectItem>
                  <SelectItem value="Manufactura">Manufactura</SelectItem>
                  <SelectItem value="Energía">Energía</SelectItem>
                  <SelectItem value="Construcción">Construcción</SelectItem>
                  <SelectItem value="Tecnología">Tecnología</SelectItem>
                  <SelectItem value="Salud">Salud</SelectItem>
                  <SelectItem value="Educación">Educación</SelectItem>
                  <SelectItem value="Comercio">Comercio</SelectItem>
                  <SelectItem value="Transporte">Transporte</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado Relación</label>
              <Select value={estadoFilter || "todos"} onValueChange={(value) => setEstadoFilter(value === "todos" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                  <SelectItem value="cliente_activo">Cliente Activo</SelectItem>
                  <SelectItem value="cliente_inactivo">Cliente Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {filteredClientes.length} de {clientes.length} clientes
              </span>
              {(searchTerm || (sectorFilter && sectorFilter !== "todos") || (estadoFilter && estadoFilter !== "todos")) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setSectorFilter('todos')
                    setEstadoFilter('todos')
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Display - Table or Card View */}
      {viewMode === 'table' ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calificación</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Potencial</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClientes.map((cliente, index) => (
                  <motion.tr
                    key={cliente.id}
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
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                              {cliente.nombre.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{cliente.ruc || 'Sin RUC'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.sector || 'Sin sector'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge variant={getEstadoBadgeVariant(cliente.estadoRelacion) as any} className="text-xs">
                        {getEstadoLabel(cliente.estadoRelacion)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {cliente.calificacion ? (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            {getCalificacionStars(cliente.calificacion)}
                          </div>
                          <span className="text-sm font-medium ml-1">{cliente.calificacion}/5</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Sin calificar</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cliente.potencialAnual ? formatCurrency(cliente.potencialAnual) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cliente.correo ? (
                          <div className="flex items-center gap-1">
                            <span>📧</span>
                            <span className="truncate max-w-32">{cliente.correo}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Sin email</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/comercial/clientes/${cliente.id}`)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/crm/clientes/${cliente.id}`)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClientes.map((cliente) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                    onClick={() => router.push(`/crm/clientes/${cliente.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                          {cliente.nombre.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {cliente.nombre}
                        </h3>
                        <p className="text-sm text-gray-500">{cliente.ruc || 'Sin RUC'}</p>
                      </div>
                    </div>
                    <Badge variant={getEstadoBadgeVariant(cliente.estadoRelacion) as any} className="text-xs">
                      {getEstadoLabel(cliente.estadoRelacion)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* CRM Information */}
                  <div className="space-y-2">
                    {cliente.sector && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">{cliente.sector}</span>
                      </div>
                    )}

                    {cliente.calificacion && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Calificación:</span>
                        <div className="flex items-center gap-1">
                          {getCalificacionStars(cliente.calificacion)}
                          <span className="text-sm font-medium ml-1">{cliente.calificacion}/5</span>
                        </div>
                      </div>
                    )}

                    {cliente.potencialAnual && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Potencial:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(cliente.potencialAnual)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {cliente.correo && (
                        <div className="flex items-center gap-1">
                          <span>📧</span>
                          <span className="truncate">{cliente.correo}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/comercial/clientes/${cliente.id}`)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Básico
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/crm/clientes/${cliente.id}`)
                      }}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      CRM
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredClientes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {clientes.length === 0 ? 'No hay clientes registrados' : 'No se encontraron clientes'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {clientes.length === 0
              ? 'Comienza registrando tus primeros clientes en el sistema.'
              : 'Intenta ajustar los filtros de búsqueda.'
            }
          </p>
          {clientes.length === 0 && (
            <Button onClick={() => router.push('/comercial/clientes')}>
              <Users className="h-4 w-4 mr-2" />
              Ir a Gestión Básica
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}