'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  Edit3,
  Trash2,
  Plus,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getClienteById } from '@/lib/services/cliente'
import type { Cliente } from '@/types'

interface ProyectoResumen {
  id: string
  nombre: string
  estado: string
  totalCliente: number | null
  createdAt: string
}

interface CotizacionResumen {
  id: string
  nombre: string
  estado: string
  totalCliente: number | null
  createdAt: string
}

// Extended Cliente type with CRM fields
interface ClienteCRM extends Cliente {
  sector?: string
  tamanoEmpresa?: string
  sitioWeb?: string
  linkedin?: string
  potencialAnual?: number
  frecuenciaCompra?: string
  ultimoProyecto?: string
  estadoRelacion?: string
  calificacion?: number
  proyecto?: ProyectoResumen[]
  cotizacion?: CotizacionResumen[]
}

export default function ClienteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [cliente, setCliente] = useState<ClienteCRM | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCliente = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getClienteById(clienteId)
        setCliente(data as ClienteCRM)
      } catch (err) {
        setError('Error al cargar el cliente')
        console.error('Error loading client:', err)
      } finally {
        setLoading(false)
      }
    }

    if (clienteId) {
      loadCliente()
    }
  }, [clienteId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  const getProyectoEstadoConfig = (estado: string) => {
    const config: Record<string, { label: string; className: string }> = {
      creado: { label: 'Creado', className: 'bg-blue-100 text-blue-800' },
      en_planificacion: { label: 'Planificación', className: 'bg-slate-100 text-slate-800' },
      listas_pendientes: { label: 'Listas Pend.', className: 'bg-yellow-100 text-yellow-800' },
      listas_aprobadas: { label: 'Listas Aprob.', className: 'bg-green-100 text-green-800' },
      pedidos_creados: { label: 'Pedidos', className: 'bg-purple-100 text-purple-800' },
      en_ejecucion: { label: 'Ejecución', className: 'bg-cyan-100 text-cyan-800' },
      en_cierre: { label: 'Cierre', className: 'bg-amber-100 text-amber-800' },
      cerrado: { label: 'Cerrado', className: 'bg-emerald-100 text-emerald-800' },
      pausado: { label: 'Pausado', className: 'bg-orange-100 text-orange-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    }
    return config[estado] || { label: estado, className: 'bg-gray-100 text-gray-800' }
  }

  const getCotizacionEstadoConfig = (estado: string) => {
    const config: Record<string, { label: string; className: string }> = {
      borrador: { label: 'Borrador', className: 'bg-gray-100 text-gray-800' },
      revisado: { label: 'Revisado', className: 'bg-blue-100 text-blue-800' },
      enviada: { label: 'Enviada', className: 'bg-yellow-100 text-yellow-800' },
      aprobada: { label: 'Aprobada', className: 'bg-green-100 text-green-800' },
      rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-800' },
    }
    return config[estado] || { label: estado, className: 'bg-gray-100 text-gray-800' }
  }

  const proyectos = cliente?.proyecto || []
  const cotizaciones = cliente?.cotizacion || []
  const totalValorProyectos = proyectos.reduce((sum, p) => sum + (p.totalCliente || 0), 0)
  const totalValorCotizaciones = cotizaciones.reduce((sum, c) => sum + (c.totalCliente || 0), 0)
  const ultimoProyectoDate = proyectos.length > 0 ? proyectos[0].createdAt : null

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Cargando cliente...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            {error || 'Cliente no encontrado'}
          </h3>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                  {cliente.nombre.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
                <p className="text-gray-600">Cliente #{cliente.codigo}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/comercial/clientes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Lista
            </Button>
            <Button variant="outline" onClick={() => router.push(`/crm/clientes/${cliente.id}`)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Vista CRM
            </Button>
            <Button variant="outline">
              <Edit3 className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={getEstadoBadgeVariant(cliente.estadoRelacion) as any}>
            {getEstadoLabel(cliente.estadoRelacion)}
          </Badge>
          {cliente.calificacion && (
            <Badge variant="outline">
              Calificación: {cliente.calificacion}/5 ⭐
            </Badge>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="informacion" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="informacion">Información General</TabsTrigger>
            <TabsTrigger value="contactos">Contactos</TabsTrigger>
            <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
            <TabsTrigger value="cotizaciones">Cotizaciones</TabsTrigger>
          </TabsList>

          {/* Información General */}
          <TabsContent value="informacion" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Información Básica */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nombre</label>
                      <p className="text-gray-900">{cliente.nombre}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Código</label>
                      <p className="text-gray-900">{cliente.codigo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">RUC</label>
                      <p className="text-gray-900">{cliente.ruc || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Teléfono</label>
                      <p className="text-gray-900">{cliente.telefono || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Correo</label>
                      <p className="text-gray-900">{cliente.correo || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Dirección</label>
                      <p className="text-gray-900">{cliente.direccion || 'No especificada'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información CRM */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Información CRM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sector</label>
                    <p className="text-gray-900">{cliente.sector || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tamaño Empresa</label>
                    <p className="text-gray-900">{cliente.tamanoEmpresa || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Potencial Anual</label>
                    <p className="text-gray-900 font-semibold text-green-600">
                      {cliente.potencialAnual ? formatCurrency(cliente.potencialAnual) : 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Frecuencia de Compra</label>
                    <p className="text-gray-900">{cliente.frecuenciaCompra || 'No especificada'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Proyectos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{proyectos.length}</div>
                  <p className="text-xs text-muted-foreground">Total de proyectos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cotizaciones</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cotizaciones.length}</div>
                  <p className="text-xs text-muted-foreground">Total de cotizaciones</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalValorProyectos + totalValorCotizaciones)}</div>
                  <p className="text-xs text-muted-foreground">Valor total de contratos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Último Proyecto</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ultimoProyectoDate ? formatDate(ultimoProyectoDate) : '-'}</div>
                  <p className="text-xs text-muted-foreground">Fecha del último proyecto</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contactos */}
          <TabsContent value="contactos" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Contactos del Cliente
                    </CardTitle>
                    <CardDescription>
                      Gestiona los contactos asociados a este cliente
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Contacto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay contactos registrados</h3>
                  <p className="text-muted-foreground mb-4">
                    Agrega contactos para gestionar mejor la relación con este cliente.
                  </p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primer Contacto
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Proyectos */}
          <TabsContent value="proyectos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Historial de Proyectos
                </CardTitle>
                <CardDescription>
                  {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''} asociado{proyectos.length !== 1 ? 's' : ''} a este cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {proyectos.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay proyectos registrados</h3>
                    <p className="text-muted-foreground">
                      Los proyectos asociados aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {proyectos.map((proyecto) => {
                      const estadoConfig = getProyectoEstadoConfig(proyecto.estado)
                      return (
                        <div
                          key={proyecto.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{proyecto.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(proyecto.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            {proyecto.totalCliente != null && (
                              <span className="text-sm font-medium text-green-600">
                                {formatCurrency(proyecto.totalCliente)}
                              </span>
                            )}
                            <Badge variant="outline" className={estadoConfig.className}>
                              {estadoConfig.label}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cotizaciones */}
          <TabsContent value="cotizaciones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cotizaciones
                </CardTitle>
                <CardDescription>
                  {cotizaciones.length} cotizaci{cotizaciones.length !== 1 ? 'ones' : 'ón'} asociada{cotizaciones.length !== 1 ? 's' : ''} a este cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cotizaciones.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay cotizaciones registradas</h3>
                    <p className="text-muted-foreground">
                      Las cotizaciones enviadas aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cotizaciones.map((cotizacion) => {
                      const estadoConfig = getCotizacionEstadoConfig(cotizacion.estado)
                      return (
                        <div
                          key={cotizacion.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/comercial/cotizaciones/${cotizacion.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{cotizacion.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(cotizacion.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            {cotizacion.totalCliente != null && (
                              <span className="text-sm font-medium text-green-600">
                                {formatCurrency(cotizacion.totalCliente)}
                              </span>
                            )}
                            <Badge variant="outline" className={estadoConfig.className}>
                              {estadoConfig.label}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  )
}