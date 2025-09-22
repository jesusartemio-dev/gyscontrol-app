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
  BarChart3,
  Target,
  Activity,
  Star,
  MessageSquare,
  Briefcase
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { getClienteById } from '@/lib/services/cliente'
import { getContactosByCliente, createContacto, type CrmContactoCliente, type CreateContactoData } from '@/lib/services/crm'
import { ContactoForm, ContactoCard } from '@/components/crm'
import type { Cliente } from '@/types'

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
}

interface Contacto {
  id: string
  nombre: string
  cargo?: string
  email?: string
  telefono?: string
  celular?: string
  esDecisionMaker: boolean
  areasInfluencia?: string
  relacionComercial?: string
  fechaUltimoContacto?: string
}

interface ProyectoHistorial {
  id: string
  nombreProyecto: string
  tipoProyecto: string
  sector?: string
  complejidad?: string
  valorContrato?: number
  margenObtenido?: number
  duracionDias?: number
  fechaInicio?: string
  fechaFin?: string
  fechaAdjudicacion?: string
  calificacionCliente?: number
  retroalimentacion?: string
}

export default function CrmClienteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [cliente, setCliente] = useState<ClienteCRM | null>(null)
  const [contactos, setContactos] = useState<CrmContactoCliente[]>([])
  const [historialProyectos, setHistorialProyectos] = useState<ProyectoHistorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showContactoForm, setShowContactoForm] = useState(false)
  const [savingContacto, setSavingContacto] = useState(false)

  useEffect(() => {
    const loadClienteData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load cliente data
        const clienteData = await getClienteById(clienteId)
        setCliente(clienteData as ClienteCRM)

        // Load contactos from API
        try {
          const contactosData = await getContactosByCliente(clienteId)
          setContactos(contactosData)
        } catch (contactosError) {
          console.error('Error loading contactos:', contactosError)
          setContactos([])
        }

        // Load historial de proyectos (simulated for now)
        setHistorialProyectos([])

      } catch (err) {
        setError('Error al cargar los datos del cliente')
        console.error('Error loading client data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (clienteId) {
      loadClienteData()
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

  const getCalificacionStars = (calificacion?: number) => {
    if (!calificacion) return null
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < calificacion ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  const handleCreateContacto = async (data: CreateContactoData) => {
    try {
      setSavingContacto(true)
      const nuevoContacto = await createContacto(clienteId, data)
      setContactos(prev => [nuevoContacto, ...prev])
      setShowContactoForm(false)
    } catch (error) {
      console.error('Error creating contacto:', error)
      throw error
    } finally {
      setSavingContacto(false)
    }
  }

  const handleEditContacto = (contacto: CrmContactoCliente) => {
    // TODO: Implement edit functionality
    console.log('Edit contacto:', contacto)
  }

  const handleDeleteContacto = (id: string) => {
    // TODO: Implement delete functionality
    console.log('Delete contacto:', id)
  }

  const handleMessageContacto = (contacto: CrmContactoCliente) => {
    // TODO: Implement messaging functionality
    console.log('Message contacto:', contacto)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Cargando datos CRM del cliente...</p>
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
            <Button variant="outline" onClick={() => router.push(`/comercial/clientes/${cliente.id}`)}>
              <Building2 className="h-4 w-4 mr-2" />
              Vista Básica
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

        {/* Status and Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={getEstadoBadgeVariant(cliente.estadoRelacion) as any} className="text-sm px-3 py-1">
              {getEstadoLabel(cliente.estadoRelacion)}
            </Badge>
            {cliente.calificacion && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Calificación:</span>
                <div className="flex items-center gap-1">
                  {getCalificacionStars(cliente.calificacion)}
                  <span className="text-sm font-medium ml-1">{cliente.calificacion}/5</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Agregar Nota
            </Button>
            <Button size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Nueva Actividad
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="perfil">Perfil CRM</TabsTrigger>
            <TabsTrigger value="contactos">Contactos</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
            <TabsTrigger value="analisis">Análisis</TabsTrigger>
          </TabsList>

          {/* Perfil CRM */}
          <TabsContent value="perfil" className="space-y-6">
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
                      <label className="text-sm font-medium text-gray-700">Sector</label>
                      <p className="text-gray-900">{cliente.sector || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tamaño Empresa</label>
                      <p className="text-gray-900">{cliente.tamanoEmpresa || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Frecuencia de Compra</label>
                      <p className="text-gray-900">{cliente.frecuenciaCompra || 'No especificada'}</p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                      <label className="text-sm font-medium text-gray-700">Sitio Web</label>
                      <p className="text-gray-900">{cliente.sitioWeb || 'No especificado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información Financiera */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Información Financiera
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Potencial Anual</label>
                    <p className="text-2xl font-bold text-green-600">
                      {cliente.potencialAnual ? formatCurrency(cliente.potencialAnual) : 'No especificado'}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Valor Total Proyectos</span>
                      <span className="font-medium">$0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Margen Total Obtenido</span>
                      <span className="font-medium">$0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Último Proyecto</span>
                      <span className="font-medium">-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPIs del Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Proyectos Totales</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Proyectos completados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0</div>
                  <p className="text-xs text-muted-foreground">Valor total de contratos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Satisfacción</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0/5</div>
                  <p className="text-xs text-muted-foreground">Calificación promedio</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Última Actividad</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Fecha de última actividad</p>
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
                  <Button onClick={() => setShowContactoForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Contacto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contactos.length === 0 ? (
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
                ) : (
                  <div className="space-y-4">
                    {contactos.map((contacto) => (
                      <ContactoCard
                        key={contacto.id}
                        contacto={contacto}
                        onEdit={handleEditContacto}
                        onDelete={handleDeleteContacto}
                        onMessage={handleMessageContacto}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historial de Proyectos */}
          <TabsContent value="historial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Historial de Proyectos
                </CardTitle>
                <CardDescription>
                  Historial completo de proyectos realizados con este cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historialProyectos.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay proyectos registrados</h3>
                    <p className="text-muted-foreground">
                      Los proyectos asociados aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historialProyectos.map((proyecto) => (
                      <Card key={proyecto.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{proyecto.nombreProyecto}</h4>
                              <Badge variant="outline">{proyecto.tipoProyecto}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Valor:</span>
                                <span className="font-medium ml-1">
                                  {proyecto.valorContrato ? formatCurrency(proyecto.valorContrato) : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duración:</span>
                                <span className="font-medium ml-1">
                                  {proyecto.duracionDias ? `${proyecto.duracionDias} días` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fecha Inicio:</span>
                                <span className="font-medium ml-1">
                                  {proyecto.fechaInicio ? formatDate(proyecto.fechaInicio) : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Calificación:</span>
                                <div className="flex items-center ml-1">
                                  {getCalificacionStars(proyecto.calificacionCliente)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Oportunidades */}
          <TabsContent value="oportunidades" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Oportunidades
                </CardTitle>
                <CardDescription>
                  Oportunidades comerciales activas con este cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay oportunidades activas</h3>
                  <p className="text-muted-foreground mb-4">
                    Crea oportunidades para gestionar el pipeline comercial.
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Oportunidad
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Análisis */}
          <TabsContent value="analisis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendencias de Compra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay suficientes datos para mostrar tendencias</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Análisis de Rentabilidad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay suficientes datos para análisis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Contacto Form Modal */}
      {showContactoForm && (
        <ContactoForm
          clienteId={clienteId}
          onSave={handleCreateContacto}
          onCancel={() => setShowContactoForm(false)}
          loading={savingContacto}
        />
      )}
    </motion.div>
  )
}