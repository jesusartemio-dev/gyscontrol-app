'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  Share2,
  Download,
  Edit,
  Package,
  Wrench,
  DollarSign,
  Calendar,
  User,
  Building,
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  Settings,
  Home,
  CheckCircle,
  Calculator,
  Truck,
  AlertTriangle,
  Target
} from 'lucide-react'
import {
  getCotizacionById,
  updateCotizacion
} from '@/lib/services/cotizacion'
import {
  deleteCotizacionServicio,
  updateCotizacionServicio
} from '@/lib/services/cotizacionServicio'
import {
  deleteCotizacionEquipo,
  updateCotizacionEquipo
} from '@/lib/services/cotizacionEquipo'
import {
  deleteCotizacionGasto,
  updateCotizacionGasto
} from '@/lib/services/cotizacionGasto'
import {
  deleteCotizacionGastoItem,
  updateCotizacionGastoItem
} from '@/lib/services/cotizacionGastoItem'
import { deleteCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { updateCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'


import CotizacionServicioForm from '@/components/cotizaciones/CotizacionServicioForm'
import CotizacionGastoForm from '@/components/cotizaciones/CotizacionGastoForm'
import CotizacionEquipoAccordion from '@/components/cotizaciones/CotizacionEquipoAccordion'
import CotizacionServicioAccordion from '@/components/cotizaciones/CotizacionServicioAccordion'
import CotizacionGastoAccordion from '@/components/cotizaciones/CotizacionGastoAccordion'
import CotizacionEquipoModal from '@/components/cotizaciones/CotizacionEquipoModal'
import ImportarPlantillaModal from '@/components/cotizaciones/ImportarPlantillaModal'

import CrearProyectoDesdeCotizacionModal from '@/components/proyectos/CrearProyectoDesdeCotizacionModal'
import CrearOportunidadDesdeCotizacion from '@/components/crm/CrearOportunidadDesdeCotizacion'
import CrmIntegrationNotification from '@/components/crm/CrmIntegrationNotification'
import ResumenTotalesCotizacion from '@/components/cotizaciones/ResumenTotalesCotizacion'
import EstadoCotizacionToolbar from '@/components/cotizaciones/EstadoCotizacionToolbar'
import { DescargarPDFButton } from '@/components/pdf/CotizacionPDF'
import { Eye } from 'lucide-react'
import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'

// ✅ Nuevo componente para cronograma comercial
import { CronogramaComercialTab } from '@/components/comercial/cronograma/CronogramaComercialTab'

// ✅ Nuevos componentes para las pestañas adicionales
import { CabeceraTab } from '@/components/cotizaciones/tabs/CabeceraTab'
import { ExclusionesTab } from '@/components/cotizaciones/tabs/ExclusionesTab'
import { CondicionesTab } from '@/components/cotizaciones/tabs/CondicionesTab'

import type {
  Cotizacion,
  CotizacionEquipoItem,
  CotizacionServicioItem,
  CotizacionGastoItem,
  EstadoCotizacion,
  EstadoOportunidad
} from '@/types'

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getStatusVariant = (estado: string): "default" | "secondary" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'aprobada': return 'default'
    case 'enviada': return 'secondary'
    case 'borrador': return 'outline'
    case 'rechazada': return 'secondary'
    default: return 'outline'
  }
}

export default function CotizacionDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [renderPDF, setRenderPDF] = useState(true)
  const [updatingData, setUpdatingData] = useState(false)
  const [showForm, setShowForm] = useState({ servicio: false, gasto: false })
  const [showEquipoModal, setShowEquipoModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState<{ tipo: 'equipos' | 'servicios' | 'gastos' | null }>({ tipo: null })
  const [showCrearOportunidad, setShowCrearOportunidad] = useState(false)
  const [showCrmNotification, setShowCrmNotification] = useState(false)

  const [selectedEquipoId, setSelectedEquipoId] = useState<string | null>(null)
  const [creandoProyecto, setCreandoProyecto] = useState(false)

  // ✅ Estado para controlar la vista activa (Equipos, Servicios, Gastos, Cronograma, Cabecera, Exclusiones, Condiciones)
  const [activeSection, setActiveSection] = useState<'equipos' | 'servicios' | 'gastos' | 'cronograma' | 'cabecera' | 'exclusiones' | 'condiciones'>('equipos')

  // ✅ Estado para forzar re-render después de importar plantillas
  const [refreshKey, setRefreshKey] = useState(0)

  // Function to handle data updates with PDF protection
  const handleDataUpdate = (updatedCotizacion: Cotizacion) => {
    setUpdatingData(true)
    setCotizacion(updatedCotizacion)
    // Re-enable PDF rendering after a short delay
    setTimeout(() => setUpdatingData(false), 500)
  }

  useEffect(() => {
    if (typeof id === 'string') {
      setLoading(true)
      getCotizacionById(id)
        .then(setCotizacion)
        .catch(() => setError('Error al cargar cotización.'))
        .finally(() => setLoading(false))
    }
  }, [id])

  // Mostrar notificación CRM cuando la cotización está aprobada y no tiene oportunidad
  useEffect(() => {
    if (cotizacion && cotizacion.estado === 'aprobada' && !cotizacion.oportunidadCrm) {
      // Pequeño delay para que aparezca después de cargar la página
      const timer = setTimeout(() => setShowCrmNotification(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [cotizacion])

  const actualizarTotalesParciales = (equipos: any[], servicios: any[], gastos: any[]) => {
    const subtotalesEquipos = calcularTotal({ equipos, servicios: [], gastos: [] })
    const subtotalesServicios = calcularTotal({ equipos: [], servicios, gastos: [] })
    const subtotalesGastos = calcularTotal({ equipos: [], servicios: [], gastos })

    const totalInterno = subtotalesEquipos.totalInterno + subtotalesServicios.totalInterno + subtotalesGastos.totalInterno
    const totalCliente = subtotalesEquipos.totalCliente + subtotalesServicios.totalCliente + subtotalesGastos.totalCliente

    return {
      totalEquiposInterno: subtotalesEquipos.totalInterno,
      totalEquiposCliente: subtotalesEquipos.totalCliente,
      totalServiciosInterno: subtotalesServicios.totalInterno,
      totalServiciosCliente: subtotalesServicios.totalCliente,
      totalGastosInterno: subtotalesGastos.totalInterno,
      totalGastosCliente: subtotalesGastos.totalCliente,
      totalInterno,
      totalCliente,
      descuento: cotizacion?.descuento ?? 0,
      grandTotal: totalCliente - (cotizacion?.descuento ?? 0)
    }
  }

  const actualizarEquipo = (equipoId: string, callback: (items: CotizacionEquipoItem[]) => CotizacionEquipoItem[]) => {
    if (!cotizacion) return
    setRenderPDF(false)
    const equipos = cotizacion.equipos.map(e =>
      e.id === equipoId ? { ...e, items: callback(e.items), ...calcularSubtotal(callback(e.items)) } : e
    )
    const nuevosTotales = actualizarTotalesParciales(equipos, cotizacion.servicios, cotizacion.gastos)
    handleDataUpdate({ ...cotizacion, equipos, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const actualizarServicio = (servicioId: string, callback: (items: CotizacionServicioItem[]) => CotizacionServicioItem[]) => {
    if (!cotizacion) return
    setRenderPDF(false)
    const servicios = cotizacion.servicios.map(s =>
      s.id === servicioId ? { ...s, items: callback(s.items), ...calcularSubtotal(callback(s.items)) } : s
    )
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, servicios, cotizacion.gastos)
    handleDataUpdate({ ...cotizacion, servicios, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const actualizarGasto = (gastoId: string, callback: (items: CotizacionGastoItem[]) => CotizacionGastoItem[]) => {
    if (!cotizacion) return
    setRenderPDF(false)
    const gastos = cotizacion.gastos.map(g =>
      g.id === gastoId ? { ...g, items: callback(g.items), ...calcularSubtotal(callback(g.items)) } : g
    )
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, cotizacion.servicios, gastos)
    handleDataUpdate({ ...cotizacion, gastos, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleEliminarGrupoEquipo = async (id: string) => {
    if (!cotizacion) return
    setRenderPDF(false)
    await deleteCotizacionEquipo(id)
    const equipos = cotizacion.equipos.filter(e => e.id !== id)
    const nuevosTotales = actualizarTotalesParciales(equipos, cotizacion.servicios, cotizacion.gastos)
    handleDataUpdate({ ...cotizacion, equipos, ...nuevosTotales })
    await updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleEliminarGrupoServicio = async (id: string) => {
    if (!cotizacion) return
    setRenderPDF(false)
    await deleteCotizacionServicio(id)
    const servicios = cotizacion.servicios.filter(s => s.id !== id)
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, servicios, cotizacion.gastos)
    handleDataUpdate({ ...cotizacion, servicios, ...nuevosTotales })
    await updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleEliminarGrupoGasto = async (id: string) => {
    if (!cotizacion) return
    setRenderPDF(false)
    await deleteCotizacionGasto(id)
    const gastos = cotizacion.gastos.filter(g => g.id !== id)
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, cotizacion.servicios, gastos)
    handleDataUpdate({ ...cotizacion, gastos, ...nuevosTotales })
    await updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleActualizarNombreEquipo = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    await updateCotizacionEquipo(id, { nombre: nuevo })
    handleDataUpdate({
      ...cotizacion,
      equipos: cotizacion.equipos.map(e => e.id === id ? { ...e, nombre: nuevo } : e)
    })
  }

  const handleActualizarNombreServicio = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    await updateCotizacionServicio(id, { categoria: nuevo })
    handleDataUpdate({
      ...cotizacion,
      servicios: cotizacion.servicios.map(s => s.id === id ? { ...s, categoria: nuevo } : s)
    })
  }

  const handleActualizarNombreGasto = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    await updateCotizacionGasto(id, { nombre: nuevo })
    handleDataUpdate({
      ...cotizacion,
      gastos: cotizacion.gastos.map(g => g.id === id ? { ...g, nombre: nuevo } : g)
    })
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8"
      >
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center space-x-2 mb-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Header Skeleton */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-gray-50 to-gray-100">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-80" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estado y Gestión Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        {/* Estadísticas y Resumen Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-28" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="text-center space-y-2">
                    <Skeleton className="h-6 w-6 mx-auto" />
                    <Skeleton className="h-8 w-12 mx-auto" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-36" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Secciones de Contenido Skeleton */}
        {[1, 2, 3].map((section) => (
          <Card key={section}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-8" />
                </div>
                <Skeleton className="h-9 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </motion.div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar cotización</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Intentar nuevamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!cotizacion) return null

  const puedeRenderizarPDF =
    cotizacion &&
    cotizacion.cliente &&
    Array.isArray(cotizacion.equipos) &&
    cotizacion.equipos.every(e => Array.isArray(e.items)) &&
    Array.isArray(cotizacion.servicios) &&
    cotizacion.servicios.every(s => Array.isArray(s.items)) &&
    Array.isArray(cotizacion.gastos) &&
    cotizacion.gastos.every(g => Array.isArray(g.items))

  // Calculate statistics
  const totalEquipos = cotizacion.equipos?.length || 0
  const totalServicios = cotizacion.servicios?.length || 0
  const totalGastos = cotizacion.gastos?.length || 0
  const totalItems = 
    (cotizacion.equipos?.reduce((acc, e) => acc + (e.items?.length || 0), 0) || 0) +
    (cotizacion.servicios?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0) +
    (cotizacion.gastos?.reduce((acc, g) => acc + (g.items?.length || 0), 0) || 0)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] as const }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* Breadcrumb Navigation */}
      <motion.nav 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0, 0, 0.2, 1] as const }}
        className="flex items-center space-x-2 text-sm text-muted-foreground mb-6"
      >
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/comercial/cotizaciones')}
          className="p-0 h-auto font-normal"
        >
          Cotizaciones
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{cotizacion.nombre}</span>
      </motion.nav>

      {/* Header Section with Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-8"
      >
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 leading-tight">{cotizacion.nombre}</h1>
                  
                  {/* 🏷️ Quote Code */}
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm bg-muted px-3 py-1 rounded-md border">
                      {cotizacion.codigo || 'Sin código'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Badge variant={getStatusVariant(cotizacion.estado)} className="text-sm font-medium w-fit">
                      {cotizacion.estado}
                    </Badge>
                    <span className="text-sm text-muted-foreground hidden sm:inline">•</span>
                    <span className="text-sm text-muted-foreground">{formatDate(cotizacion.createdAt)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{cotizacion.cliente?.nombre || 'Cliente no especificado'}</p>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{cotizacion.comercial?.nombre || 'Comercial no asignado'}</p>
                      <p className="text-xs text-muted-foreground">Comercial</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
                    <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(cotizacion.grandTotal || 0)}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Compartir</span>
                  <span className="sm:hidden">Share</span>
                </Button>
                {renderPDF && puedeRenderizarPDF && !updatingData && (
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/comercial/cotizaciones/${id}/preview`)}
                      className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Vista Previa</span>
                      <span className="sm:hidden">Vista</span>
                    </Button>
                    <DescargarPDFButton cotizacion={cotizacion} />
                  </div>
                )}
                {/* Botón para crear oportunidad CRM */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCrearOportunidad(true)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 flex-shrink-0 h-8 min-w-[120px] justify-center"
                >
                  <Target className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Crear Oportunidad</span>
                  <span className="sm:hidden">CRM</span>
                </Button>

                {cotizacion.estado === 'aprobada' && (!cotizacion.oportunidadCrm || cotizacion.oportunidadCrm.estado === 'cerrada_ganada') && (
                  <div className="flex-shrink-0">
                    <CrearProyectoDesdeCotizacionModal
                      cotizacion={cotizacion}
                      buttonVariant="outline"
                      buttonSize="sm"
                      buttonClassName="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 h-8 min-w-[120px] justify-center"
                    />
                  </div>
                )}
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 h-8 min-w-[120px] justify-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Estado y Gestión - Sección Superior */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mb-8"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Estado y Gestión
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">Estado Actual</span>
                <Badge variant={getStatusVariant(cotizacion.estado)} className="text-sm w-fit">
                  {cotizacion.estado}
                </Badge>
              </div>
              <EstadoCotizacionToolbar
                cotizacion={cotizacion}
                onUpdated={(nuevoEstado) =>
                  handleDataUpdate(cotizacion ? { ...cotizacion, estado: nuevoEstado as EstadoCotizacion } : cotizacion)
                }
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Estadísticas y Resumen Financiero - Mismo Nivel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
      >
        {/* Estadísticas Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Estadísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalItems}</p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{totalEquipos + totalServicios + totalGastos}</p>
                  <p className="text-xs text-muted-foreground">Secciones</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resumen Financiero */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="h-full">
            <ResumenTotalesCotizacion cotizacion={cotizacion} />
          </div>
        </motion.div>
      </motion.div>

      {/* Navegación por Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mb-8"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeSection === 'equipos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('equipos')}
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Equipos ({totalEquipos})
              </Button>
              <Button
                variant={activeSection === 'servicios' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('servicios')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Servicios ({totalServicios})
              </Button>
              <Button
                variant={activeSection === 'gastos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('gastos')}
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Gastos ({totalGastos})
              </Button>
              <Button
                variant={activeSection === 'cronograma' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('cronograma')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Cronograma
              </Button>
              <Button
                variant={activeSection === 'cabecera' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('cabecera')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Cabecera
              </Button>
              <Button
                variant={activeSection === 'exclusiones' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('exclusiones')}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Exclusiones ({cotizacion.exclusiones?.length || 0})
              </Button>
              <Button
                variant={activeSection === 'condiciones' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('condiciones')}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Condiciones ({cotizacion.condiciones?.length || 0})
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secciones de Contenido */}
      <div className="space-y-8">
        {/* Equipos */}
        {activeSection === 'equipos' && (
          <motion.section
            key={`equipos-${refreshKey}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                Secciones de Equipos
                <Badge variant="secondary">{totalEquipos}</Badge>
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowEquipoModal(true)}
                  size="sm"
                  className="flex items-center gap-2 justify-start sm:justify-center bg-blue-600 hover:bg-blue-700"
                >
                  <Package className="h-4 w-4" />
                  Nuevo Equipo
                </Button>
                <Button
                  onClick={() => setShowImportModal({ tipo: 'equipos' })}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 justify-start sm:justify-center"
                >
                  <Wrench className="h-4 w-4" />
                  Importar Plantilla
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">

            
            {cotizacion.equipos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-blue-400" />
                    </div>
                  </div>
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute top-0 right-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Plus className="h-3 w-3 text-blue-600" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Comienza con tu primer equipo!</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Los equipos son el corazón de tu cotización. Agrega especificaciones técnicas, 
                  cantidades y precios para crear una propuesta profesional.
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 Tip: Usa el botón "Nuevo Equipo" arriba para agregar tu primera sección de equipos
                </p>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                {cotizacion.equipos.map((e, index) => (
                  <motion.div
                    key={e.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <CotizacionEquipoAccordion
                      key={`${e.id}-${e.items?.length || 0}`}
                      equipo={e}
                      onCreated={i => actualizarEquipo(e.id, items => [...items, i])}
                      onMultipleCreated={newItems => actualizarEquipo(e.id, items => [...items, ...newItems])}
                      onUpdated={async (item) => {
                        // Update the item in the database
                        await updateCotizacionEquipoItem(item.id, {
                          cantidad: item.cantidad,
                          costoInterno: item.costoInterno,
                          costoCliente: item.costoCliente
                        })
                        // Update local state
                        actualizarEquipo(e.id, items => items.map(i => i.id === item.id ? item : i))
                      }}
                      onDeleted={id => actualizarEquipo(e.id, items => items.filter(i => i.id !== id))}
                      onDeletedGrupo={() => handleEliminarGrupoEquipo(e.id)}
                      onUpdatedNombre={nuevo => handleActualizarNombreEquipo(e.id, nuevo)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.section>
        )}

        {/* Servicios */}
        {activeSection === 'servicios' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Secciones de Servicios
                <Badge variant="secondary">{totalServicios}</Badge>
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowForm(prev => ({ ...prev, servicio: !prev.servicio }))}
                  size="sm"
                  className="flex items-center gap-2 justify-start sm:justify-center"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Servicio
                </Button>
                <Button
                  onClick={() => setShowImportModal({ tipo: 'servicios' })}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 justify-start sm:justify-center"
                >
                  <Truck className="h-4 w-4" />
                  Importar Plantilla
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {showForm.servicio && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CotizacionServicioForm
                  cotizacionId={cotizacion.id}
                  onCreated={(nuevo) =>
                    handleDataUpdate(cotizacion ? { ...cotizacion, servicios: [...cotizacion.servicios, { ...nuevo, items: [] }] } : cotizacion)
                  }
                />
                <Separator className="my-4" />
              </motion.div>
            )}
            
            {cotizacion.servicios.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center">
                      <Wrench className="h-12 w-12 text-indigo-400" />
                    </div>
                  </div>
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute top-0 right-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Plus className="h-3 w-3 text-indigo-600" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Potencia tu cotización con servicios</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Los servicios profesionales añaden valor a tu propuesta. Incluye instalación, 
                  mantenimiento, consultoría y más para una oferta completa.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowForm(prev => ({ ...prev, servicio: true }))}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar primer servicio
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    🔧 Tip: Los servicios suelen tener mejores márgenes de rentabilidad
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                {cotizacion.servicios.map((s, index) => (
                  <motion.div
                    key={s.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <CotizacionServicioAccordion
                      servicio={s}
                      onCreated={i => actualizarServicio(s.id, items => [...items, i])}
                      onUpdated={item => actualizarServicio(s.id, items => items.map(i => i.id === item.id ? item : i))}
                      onDeleted={id => actualizarServicio(s.id, items => items.filter(i => i.id !== id))}
                      onDeletedGrupo={() => handleEliminarGrupoServicio(s.id)}
                      onUpdatedNombre={nuevo => handleActualizarNombreServicio(s.id, nuevo)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.section>
        )}

        {/* Gastos */}
        {activeSection === 'gastos' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-primary" />
                Secciones de Gastos
                <Badge variant="secondary">{totalGastos}</Badge>
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowForm(prev => ({ ...prev, gasto: !prev.gasto }))}
                  size="sm"
                  className="flex items-center gap-2 justify-start sm:justify-center"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Gasto
                </Button>
                <Button
                  onClick={() => setShowImportModal({ tipo: 'gastos' })}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 justify-start sm:justify-center"
                >
                  <DollarSign className="h-4 w-4" />
                  Importar Plantilla
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {showForm.gasto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CotizacionGastoForm
                  cotizacionId={cotizacion.id}
                  onCreated={(nuevo) =>
                    handleDataUpdate(cotizacion ? { ...cotizacion, gastos: [...cotizacion.gastos, { ...nuevo, items: [] }] } : cotizacion)
                  }
                />
                <Separator className="my-4" />
              </motion.div>
            )}
            
            {cotizacion.gastos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center">
                      <Truck className="h-12 w-12 text-orange-400" />
                    </div>
                  </div>
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute top-0 right-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                      <Plus className="h-3 w-3 text-orange-600" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Completa con gastos adicionales</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  No olvides incluir gastos como transporte, logística, materiales auxiliares 
                  y otros costos que aseguren la transparencia de tu propuesta.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowForm(prev => ({ ...prev, gasto: true }))}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar primer gasto
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    📦 Tip: Los gastos transparentes generan mayor confianza con el cliente
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                {cotizacion.gastos.map((g, index) => (
                  <motion.div
                    key={g.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <CotizacionGastoAccordion
                      gasto={g}
                      onCreated={i => actualizarGasto(g.id, items => [...items, i])}
                      onUpdated={item => actualizarGasto(g.id, items => items.map(i => i.id === item.id ? item : i))}
                      onDeleted={id => actualizarGasto(g.id, items => items.filter(i => i.id !== id))}
                      onDeletedGrupo={() => handleEliminarGrupoGasto(g.id)}
                      onUpdatedNombre={nuevo => handleActualizarNombreGasto(g.id, nuevo)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
        </motion.section>
        )}

        {/* Cronograma Comercial */}
        {activeSection === 'cronograma' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <CronogramaComercialTab
              cotizacionId={cotizacion.id}
              cotizacionCodigo={cotizacion.codigo || 'Sin código'}
            />
          </motion.section>
        )}

        {/* Cabecera */}
        {activeSection === 'cabecera' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <CabeceraTab
              cotizacion={cotizacion}
              onUpdated={handleDataUpdate}
            />
          </motion.section>
        )}

        {/* Exclusiones */}
        {activeSection === 'exclusiones' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <ExclusionesTab
              cotizacion={cotizacion}
              onUpdated={handleDataUpdate}
            />
          </motion.section>
        )}

        {/* Condiciones */}
        {activeSection === 'condiciones' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <CondicionesTab
              cotizacion={cotizacion}
              onUpdated={handleDataUpdate}
            />
          </motion.section>
        )}
      </div>



      {/* Modal para crear nueva sección de equipo */}
      <CotizacionEquipoModal
        open={showEquipoModal}
        onOpenChange={setShowEquipoModal}
        cotizacionId={cotizacion.id}
        onCreated={(nuevoEquipo) => {
          handleDataUpdate(cotizacion ? {
            ...cotizacion,
            equipos: [...cotizacion.equipos, { ...nuevoEquipo, items: [] }]
          } : cotizacion)
          setShowEquipoModal(false)
        }}
      />

      {/* Modal para importar plantillas */}
      {showImportModal.tipo && (
        <ImportarPlantillaModal
          open={!!showImportModal.tipo}
          onOpenChange={(open) => {
            if (!open) setShowImportModal({ tipo: null })
          }}
          cotizacionId={cotizacion.id}
          tipo={showImportModal.tipo}
          onSuccess={async () => {
            // Recargar la cotización completa para reflejar los cambios
            if (typeof id === 'string') {
              try {
                const updatedCotizacion = await getCotizacionById(id)
                setCotizacion(updatedCotizacion)
                // Forzar re-render de la sección completa
                setRefreshKey(prev => prev + 1)
              } catch (error) {
                setError('Error al recargar cotización.')
              }
            }
            setShowImportModal({ tipo: null })
          }}
        />
      )}

      {/* Modal para crear oportunidad desde cotización */}
      <CrearOportunidadDesdeCotizacion
        cotizacionId={cotizacion.id}
        cotizacionNombre={cotizacion.nombre}
        cotizacionCodigo={cotizacion.codigo || 'Sin código'}
        clienteNombre={cotizacion.cliente?.nombre || 'Cliente no especificado'}
        valorCotizacion={cotizacion.grandTotal || 0}
        isOpen={showCrearOportunidad}
        onClose={() => setShowCrearOportunidad(false)}
        onSuccess={(oportunidad) => {
          console.log('Oportunidad creada:', oportunidad)
          // Redirigir a la página de la nueva oportunidad
          router.push(`/crm/${oportunidad.id}`)
        }}
      />

      {/* Notificación de integración CRM */}
      {showCrmNotification && cotizacion && (
        <CrmIntegrationNotification
          entityType="cotizacion"
          entityId={cotizacion.id}
          entityNombre={cotizacion.nombre}
          clienteNombre={cotizacion.cliente?.nombre || 'Cliente no especificado'}
          valor={cotizacion.grandTotal || 0}
          onCreateOportunidad={() => {
            setShowCrmNotification(false)
            // Recargar la cotización para reflejar la nueva oportunidad
            if (typeof id === 'string') {
              getCotizacionById(id).then(setCotizacion)
            }
          }}
          onDismiss={() => setShowCrmNotification(false)}
        />
      )}

      </motion.div>
    )
  }
