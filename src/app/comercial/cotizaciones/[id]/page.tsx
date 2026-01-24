'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package,
  DollarSign,
  Calendar,
  User,
  Building,
  FileText,
  AlertCircle,
  Settings,
  CheckCircle,
  Truck,
  AlertTriangle,
  Target,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
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
import { updateCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'

// UI Components
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'


import CotizacionGastoForm from '@/components/cotizaciones/CotizacionGastoForm'
import CotizacionEquipoAccordion from '@/components/cotizaciones/CotizacionEquipoAccordion'
import CotizacionServicioAccordion from '@/components/cotizaciones/CotizacionServicioAccordion'
import CotizacionGastoAccordion from '@/components/cotizaciones/CotizacionGastoAccordion'
import CotizacionEquipoModal from '@/components/cotizaciones/CotizacionEquipoModal'
import CotizacionServicioCreateModal from '@/components/cotizaciones/CotizacionServicioCreateModal'
import ImportarPlantillaModal from '@/components/cotizaciones/ImportarPlantillaModal'

import CrearProyectoDesdeCotizacionModal from '@/components/proyectos/CrearProyectoDesdeCotizacionModal'
import CrearOportunidadDesdeCotizacion from '@/components/crm/CrearOportunidadDesdeCotizacion'
import CrmIntegrationNotification from '@/components/crm/CrmIntegrationNotification'
import ResumenTotalesCotizacion from '@/components/cotizaciones/ResumenTotalesCotizacion'
import EstadoCotizacionToolbar from '@/components/cotizaciones/EstadoCotizacionToolbar'
import { DescargarPDFButton } from '@/components/pdf/CotizacionPDF'
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
  EstadoCotizacion
} from '@/types'

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
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
  const [showServicioModal, setShowServicioModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState<{ tipo: 'equipos' | 'servicios' | 'gastos' | null }>({ tipo: null })
  const [showCrearOportunidad, setShowCrearOportunidad] = useState(false)
  const [showCrmNotification, setShowCrmNotification] = useState(false)

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
    try {
      setRenderPDF(false)
      await deleteCotizacionEquipo(id)
      const equipos = cotizacion.equipos.filter(e => e.id !== id)
      const nuevosTotales = actualizarTotalesParciales(equipos, cotizacion.servicios, cotizacion.gastos)
      handleDataUpdate({ ...cotizacion, equipos, ...nuevosTotales })
      await updateCotizacion(cotizacion.id, nuevosTotales)
      toast.success('Sección de equipos eliminada')
    } catch (error) {
      console.error('Error al eliminar grupo de equipos:', error)
      toast.error('Error al eliminar la sección')
    } finally {
      setTimeout(() => setRenderPDF(true), 100)
    }
  }

  const handleEliminarGrupoServicio = async (id: string) => {
    if (!cotizacion) return
    try {
      setRenderPDF(false)
      await deleteCotizacionServicio(id)
      const servicios = cotizacion.servicios.filter(s => s.id !== id)
      const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, servicios, cotizacion.gastos)
      handleDataUpdate({ ...cotizacion, servicios, ...nuevosTotales })
      await updateCotizacion(cotizacion.id, nuevosTotales)
      toast.success('Sección de servicios eliminada')
    } catch (error) {
      console.error('Error al eliminar grupo de servicios:', error)
      toast.error('Error al eliminar la sección')
    } finally {
      setTimeout(() => setRenderPDF(true), 100)
    }
  }

  const handleEliminarGrupoGasto = async (id: string) => {
    if (!cotizacion) return
    try {
      setRenderPDF(false)
      await deleteCotizacionGasto(id)
      const gastos = cotizacion.gastos.filter(g => g.id !== id)
      const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, cotizacion.servicios, gastos)
      handleDataUpdate({ ...cotizacion, gastos, ...nuevosTotales })
      await updateCotizacion(cotizacion.id, nuevosTotales)
      toast.success('Sección de gastos eliminada')
    } catch (error) {
      console.error('Error al eliminar grupo de gastos:', error)
      toast.error('Error al eliminar la sección')
    } finally {
      setTimeout(() => setRenderPDF(true), 100)
    }
  }

  const handleActualizarNombreEquipo = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    try {
      await updateCotizacionEquipo(id, { nombre: nuevo })
      handleDataUpdate({
        ...cotizacion,
        equipos: cotizacion.equipos.map(e => e.id === id ? { ...e, nombre: nuevo } : e)
      })
    } catch (error) {
      console.error('Error al actualizar nombre de equipo:', error)
      toast.error('Error al actualizar el nombre')
    }
  }

  const handleActualizarNombreServicio = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    try {
      await updateCotizacionServicio(id, { nombre: nuevo })
      handleDataUpdate({
        ...cotizacion,
        servicios: cotizacion.servicios.map(s => s.id === id ? { ...s, nombre: nuevo } : s)
      })
    } catch (error) {
      console.error('Error al actualizar nombre de servicio:', error)
      toast.error('Error al actualizar el nombre')
    }
  }

  const handleActualizarNombreGasto = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    try {
      await updateCotizacionGasto(id, { nombre: nuevo })
      handleDataUpdate({
        ...cotizacion,
        gastos: cotizacion.gastos.map(g => g.id === id ? { ...g, nombre: nuevo } : g)
      })
    } catch (error) {
      console.error('Error al actualizar nombre de gasto:', error)
      toast.error('Error al actualizar el nombre')
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] as const }}
      className="container mx-auto p-4 sm:p-6"
    >
      {/* Header Compacto */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        {/* Breadcrumb + Info Principal */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/comercial/cotizaciones')}
              className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
            >
              ← Cotizaciones
            </Button>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded border">
                {cotizacion.codigo || 'Sin código'}
              </span>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate max-w-[300px]">
                {cotizacion.nombre}
              </h1>
            </div>
          </div>

          {/* Acciones Principales */}
          <div className="flex items-center gap-2 flex-wrap">
            {renderPDF && puedeRenderizarPDF && !updatingData && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/comercial/cotizaciones/${id}/preview`)}
                  className="h-8"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Vista Previa</span>
                </Button>
                <DescargarPDFButton cotizacion={cotizacion} />
              </>
            )}
            {cotizacion.oportunidadCrm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/crm/${cotizacion.oportunidadCrm?.id}`)}
                className="h-8 text-green-700 border-green-300 hover:bg-green-50"
              >
                <Target className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Oportunidad</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCrearOportunidad(true)}
                className="h-8 text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Target className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">+ CRM</span>
              </Button>
            )}
            {cotizacion.estado === 'aprobada' && (!cotizacion.oportunidadCrm || cotizacion.oportunidadCrm.estado === 'cerrada_ganada') && (
              <CrearProyectoDesdeCotizacionModal
                cotizacion={cotizacion}
                buttonVariant="outline"
                buttonSize="sm"
                buttonClassName="h-8 text-purple-700 border-purple-300 hover:bg-purple-50"
              />
            )}
          </div>
        </div>

        {/* Metadata compacta */}
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <Badge variant={getStatusVariant(cotizacion.estado)} className="font-medium">
            {cotizacion.estado}
          </Badge>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Building className="h-3.5 w-3.5" />
            {cotizacion.cliente?.nombre || 'Sin cliente'}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {cotizacion.comercial?.nombre || 'Sin comercial'}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(cotizacion.grandTotal || 0)}
          </span>
          {cotizacion.oportunidadCrm && (
            <>
              <span className="text-muted-foreground">•</span>
              <Badge
                variant="outline"
                className="text-xs bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100"
                onClick={() => router.push(`/crm/${cotizacion.oportunidadCrm?.id}`)}
              >
                <Target className="h-3 w-3 mr-1" />
                {cotizacion.oportunidadCrm.nombre}
              </Badge>
            </>
          )}
        </div>
      </motion.div>

      {/* Layout de 2 Columnas: Contenido Principal + Sidebar */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Columna Principal */}
        <div className="flex-1 min-w-0">
          {/* Navegación por Tabs - Sticky */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-4 border-b"
          >
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
          </motion.div>

          {/* Secciones de Contenido */}
      <div className="space-y-8">
        {/* Equipos */}
        {activeSection === 'equipos' && (
          <motion.section
            key={`equipos-${refreshKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Header inline compacto */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowEquipoModal(true)}
                size="sm"
                variant="outline"
                className="h-8"
              >
                <Package className="h-4 w-4 mr-1" />
                Agregar Equipo
              </Button>
              <Button
                onClick={() => setShowImportModal({ tipo: 'equipos' })}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-8"
              >
                Importar Plantilla
              </Button>
            </div>

            {/* Contenido */}
            {cotizacion.equipos.length === 0 ? (
              <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                <div className="text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay equipos. Usa "Agregar Equipo" o "Importar Plantilla".</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cotizacion.equipos.map((e) => (
                  <CotizacionEquipoAccordion
                    key={`${e.id}-${e.items?.length || 0}`}
                    equipo={e}
                    onCreated={i => actualizarEquipo(e.id, items => [...items, i])}
                    onMultipleCreated={newItems => actualizarEquipo(e.id, items => [...items, ...newItems])}
                    onUpdated={async (item) => {
                      try {
                        await updateCotizacionEquipoItem(item.id, {
                          cantidad: item.cantidad,
                          costoInterno: item.costoInterno,
                          costoCliente: item.costoCliente
                        })
                        actualizarEquipo(e.id, items => items.map(i => i.id === item.id ? item : i))
                      } catch (error) {
                        console.error('Error al actualizar item de equipo:', error)
                        toast.error('Error al actualizar el item')
                      }
                    }}
                    onDeleted={id => actualizarEquipo(e.id, items => items.filter(i => i.id !== id))}
                    onDeletedGrupo={() => handleEliminarGrupoEquipo(e.id)}
                    onUpdatedNombre={nuevo => handleActualizarNombreEquipo(e.id, nuevo)}
                  />
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Servicios */}
        {activeSection === 'servicios' && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Header inline compacto */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowServicioModal(true)}
                size="sm"
                variant="outline"
                className="h-8"
              >
                <Settings className="h-4 w-4 mr-1" />
                Agregar Servicio
              </Button>
              <Button
                onClick={() => setShowImportModal({ tipo: 'servicios' })}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-8"
              >
                Importar Plantilla
              </Button>
            </div>

            {/* Contenido */}
            {cotizacion.servicios.length === 0 ? (
              <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                <div className="text-center">
                  <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay servicios. Usa "Agregar Servicio" o "Importar Plantilla".</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cotizacion.servicios.map((s) => (
                  <CotizacionServicioAccordion
                    key={s.id}
                    servicio={s}
                    onCreated={i => actualizarServicio(s.id, items => [...items, i])}
                    onMultipleCreated={newItems => actualizarServicio(s.id, items => [...items, ...newItems])}
                    onUpdated={item => actualizarServicio(s.id, items => items.map(i => i.id === item.id ? item : i))}
                    onDeleted={id => actualizarServicio(s.id, items => items.filter(i => i.id !== id))}
                    onDeletedGrupo={() => handleEliminarGrupoServicio(s.id)}
                    onUpdatedNombre={nuevo => handleActualizarNombreServicio(s.id, nuevo)}
                  />
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Gastos */}
        {activeSection === 'gastos' && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Header inline compacto */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowForm(prev => ({ ...prev, gasto: !prev.gasto }))}
                size="sm"
                variant={showForm.gasto ? "default" : "outline"}
                className="h-8"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                {showForm.gasto ? 'Cancelar' : 'Agregar Gasto'}
              </Button>
              <Button
                onClick={() => setShowImportModal({ tipo: 'gastos' })}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-8"
              >
                Importar Plantilla
              </Button>
            </div>

            {/* Formulario inline cuando está activo */}
            {showForm.gasto && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <CotizacionGastoForm
                  cotizacionId={cotizacion.id}
                  onCreated={(nuevo) => {
                    handleDataUpdate(cotizacion ? { ...cotizacion, gastos: [...cotizacion.gastos, { ...nuevo, items: [] }] } : cotizacion)
                    setShowForm(prev => ({ ...prev, gasto: false }))
                  }}
                />
              </div>
            )}

            {/* Contenido */}
            {cotizacion.gastos.length === 0 && !showForm.gasto ? (
              <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay gastos. Usa "Agregar Gasto" para crear uno nuevo.</p>
                </div>
              </div>
            ) : cotizacion.gastos.length > 0 && (
              <div className="space-y-3">
                {cotizacion.gastos.map((g) => (
                  <CotizacionGastoAccordion
                    key={g.id}
                    gasto={g}
                    onCreated={i => actualizarGasto(g.id, items => [...items, i])}
                    onUpdated={item => actualizarGasto(g.id, items => items.map(i => i.id === item.id ? item : i))}
                    onDeleted={id => actualizarGasto(g.id, items => items.filter(i => i.id !== id))}
                    onDeletedGrupo={() => handleEliminarGrupoGasto(g.id)}
                    onUpdatedNombre={nuevo => handleActualizarNombreGasto(g.id, nuevo)}
                  />
                ))}
              </div>
            )}
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
        </div>
        {/* Fin Columna Principal */}

        {/* Sidebar - Resumen Financiero y Estado (Sticky en desktop) */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="xl:w-80 xl:flex-shrink-0"
        >
          <div className="xl:sticky xl:top-4 space-y-4">
            {/* Resumen Financiero */}
            <ResumenTotalesCotizacion cotizacion={cotizacion} />

            {/* Estado y Gestión */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Estado</span>
                  <Badge variant={getStatusVariant(cotizacion.estado)} className="text-sm">
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

          </div>
        </motion.aside>
      </div>
      {/* Fin Layout 2 Columnas */}

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

      {/* Modal para crear nueva sección de servicio */}
      <CotizacionServicioCreateModal
        cotizacionId={cotizacion.id}
        isOpen={showServicioModal}
        onClose={() => setShowServicioModal(false)}
        onCreated={(servicio) => {
          handleDataUpdate(cotizacion ? {
            ...cotizacion,
            servicios: [...cotizacion.servicios, { ...servicio, items: [] }]
          } : cotizacion)
          setShowServicioModal(false)
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
