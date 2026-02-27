'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Building,
  User,
  Target,
  FileText,
  AlertCircle,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  FolderOpen,
  MessageSquare,
  BarChart3,
  FileSpreadsheet,
  Loader2,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { getCotizacionById } from '@/lib/services/cotizacion'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import CrearProyectoDesdeCotizacionModal from '@/components/proyectos/CrearProyectoDesdeCotizacionModal'
import CrearOportunidadDesdeCotizacion from '@/components/crm/CrearOportunidadDesdeCotizacion'
import CrmIntegrationNotification from '@/components/crm/CrmIntegrationNotification'
import ResumenTotalesCotizacion from '@/components/cotizaciones/ResumenTotalesCotizacion'
import EstadoCotizacionStepper from '@/components/cotizaciones/EstadoCotizacionStepper'


import { ChatPanelContent } from '@/components/agente/ChatPanelContent'
import { ChatPanel } from '@/components/agente/ChatPanel'

import type { Cotizacion, EstadoCotizacion } from '@/types'
import { CotizacionContext } from './cotizacion-context'
import { formatDisplayCurrency } from '@/lib/utils/currency'
import { exportarCotizacionAExcel } from '@/lib/utils/cotizacionExportExcel'
import { exportarCotizacionAExcelEditable } from '@/lib/utils/cotizacionExportExcelEditable'
import { cn } from '@/lib/utils'

interface CotizacionLayoutProps {
  children: React.ReactNode
}

export default function CotizacionLayout({ children }: CotizacionLayoutProps) {
  const { id } = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCrearOportunidad, setShowCrearOportunidad] = useState(false)
  const [showCrmNotification, setShowCrmNotification] = useState(false)

  // Chat integration state
  const { data: session } = useSession()
  const [sidebarTab, setSidebarTab] = useState<'resumen' | 'chat'>('resumen')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelExporting, setExcelExporting] = useState<'simple' | 'editable' | null>(null)
  const [chatHasActivity, setChatHasActivity] = useState(false)

  // Determinar si estamos en el hub o en una sub-página
  const isHubPage = pathname === `/comercial/cotizaciones/${id}`

  // Páginas que necesitan ancho completo (sin sidebar)
  const fullWidthPages = ['cronograma', 'preview']
  const currentPageSegment = pathname.split('/').pop() || ''
  const needsFullWidth = fullWidthPages.includes(currentPageSegment)

  // Estado para mostrar/ocultar sidebar en páginas full-width
  const [showSidebar, setShowSidebar] = useState(!needsFullWidth)

  // Actualizar visibilidad del sidebar cuando cambia la página
  useEffect(() => {
    setShowSidebar(!needsFullWidth)
  }, [needsFullWidth])

  // Obtener nombre de la sub-página actual
  const getSubPageName = () => {
    if (isHubPage) return null
    const segments = pathname.split('/')
    const lastSegment = segments[segments.length - 1]
    const subPageNames: Record<string, string> = {
      'equipos': 'Equipos',
      'servicios': 'Servicios',
      'gastos': 'Gastos',
      'tdr': 'Análisis TDR',
      'cronograma': 'Cronograma',
      'configuracion': 'Configuración',
      'preview': 'Vista Previa',
      'vista': 'Vista'
    }
    return subPageNames[lastSegment] || lastSegment
  }
  const currentSubPage = getSubPageName()

  const refreshCotizacion = async () => {
    if (typeof id === 'string') {
      try {
        const data = await getCotizacionById(id)
        setCotizacion(data)
      } catch {
        toast.error('Error al actualizar cotización')
      }
    }
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
      const timer = setTimeout(() => setShowCrmNotification(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [cotizacion])

  const handleDataUpdate = (updatedCotizacion: Cotizacion) => {
    setCotizacion(updatedCotizacion)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="flex flex-col xl:flex-row gap-4">
              <div className="flex-1">
                <Skeleton className="h-[600px] w-full rounded-lg" />
              </div>
              <div className="xl:w-80">
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="border-destructive max-w-md">
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
    cotizacion.cliente &&
    Array.isArray(cotizacion.equipos) &&
    cotizacion.equipos.every(e => Array.isArray(e.items)) &&
    Array.isArray(cotizacion.servicios) &&
    cotizacion.servicios.every(s => Array.isArray(s.items)) &&
    Array.isArray(cotizacion.gastos) &&
    cotizacion.gastos.every(g => Array.isArray(g.items))

  return (
    <CotizacionContext.Provider value={{ cotizacion, setCotizacion: handleDataUpdate, refreshCotizacion, loading, isLocked: cotizacion.estado === 'aprobada' }}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto p-4 sm:p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            {/* Breadcrumb + Info Principal */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/comercial/cotizaciones')}
                  className="p-0 h-auto text-muted-foreground hover:text-foreground hover:underline"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Cotizaciones
                </Button>
                <span className="text-muted-foreground">/</span>
                {currentSubPage ? (
                  // En sub-página: mostrar jerarquía completa clickeable
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/comercial/cotizaciones/${id}`)}
                      className="p-0 h-auto text-muted-foreground hover:text-foreground hover:underline max-w-[400px]"
                    >
                      <span className="font-mono">{cotizacion.codigo || 'Sin código'}</span>
                      {cotizacion.revision && (
                        <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 font-mono">{cotizacion.revision}</Badge>
                      )}
                      <span className="mx-1">:</span>
                      <span className="line-clamp-1">{cotizacion.nombre}</span>
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-medium text-foreground">{currentSubPage}</span>
                  </>
                ) : (
                  // En hub: mostrar código + nombre de cotización (no clickeable, es la página actual)
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono bg-muted px-2 py-0.5 rounded border text-sm flex-shrink-0">
                      {cotizacion.codigo || 'Sin código'}
                      {cotizacion.revision && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 font-mono">{cotizacion.revision}</Badge>
                      )}
                    </span>
                    <h1 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
                      {cotizacion.nombre}
                    </h1>
                  </div>
                )}
              </div>

              {/* Acciones Principales */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Desktop: toggle sidebar to chat tab */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSidebarTab('chat'); setShowSidebar(true); setChatHasActivity(false) }}
                  className="hidden xl:flex h-8 text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Asistente
                  {chatHasActivity && (
                    <span className="ml-1.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </Button>
                {/* Mobile: open Sheet overlay */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileChatOpen(true)}
                  className="xl:hidden h-8 text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Asistente</span>
                </Button>
                {puedeRenderizarPDF && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/comercial/cotizaciones/${id}/preview`)}
                    className="h-8 bg-green-600 text-white hover:bg-green-700 border-green-600"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                )}
                {cotizacion && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setShowExcelModal(true)}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Excel</span>
                  </Button>
                )}
                {cotizacion.oportunidadCrm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/crm/oportunidades/${cotizacion.oportunidadCrm?.id}`)}
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
                {(cotizacion as any).proyectoVinculado ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/proyectos/${(cotizacion as any).proyectoVinculado.id}`)}
                    className="h-8 text-purple-700 border-purple-300 hover:bg-purple-50"
                  >
                    <FolderOpen className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{(cotizacion as any).proyectoVinculado.codigo}</span>
                    <span className="sm:hidden">Proyecto</span>
                  </Button>
                ) : (
                  cotizacion.estado === 'aprobada' && (!cotizacion.oportunidadCrm || cotizacion.oportunidadCrm.estado === 'cerrada_ganada' || cotizacion.oportunidadCrm.estado === 'seguimiento_proyecto') && (
                    <CrearProyectoDesdeCotizacionModal
                      cotizacion={cotizacion}
                      buttonVariant="outline"
                      buttonSize="sm"
                      buttonClassName="h-8 text-purple-700 border-purple-300 hover:bg-purple-50"
                    />
                  )
                )}
              </div>
            </div>

            {/* Status Flow + Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {/* Estado Stepper - Visual Flow */}
              <EstadoCotizacionStepper
                cotizacion={cotizacion}
                onUpdated={(nuevoEstado) =>
                  handleDataUpdate({ ...cotizacion, estado: nuevoEstado as EstadoCotizacion })
                }
              />

              <span className="hidden sm:block text-muted-foreground">|</span>

              {/* Metadata compacta */}
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  {cotizacion.cliente?.nombre || 'Sin cliente'}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {cotizacion.comercial?.nombre || 'Sin comercial'}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="font-semibold text-gray-900">
                  {formatDisplayCurrency(cotizacion.grandTotal || 0, cotizacion.moneda, cotizacion.tipoCambio)}
                </span>
                {cotizacion.oportunidadCrm && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100"
                      onClick={() => router.push(`/crm/oportunidades/${cotizacion.oportunidadCrm?.id}`)}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      {cotizacion.oportunidadCrm.nombre}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Layout de 2 Columnas (o 1 columna en páginas full-width) */}
          <div className="flex flex-col xl:flex-row gap-4">
            {/* Columna Principal - Children */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              {children}
            </motion.div>

            {/* Sidebar - Tabbed: Resumen / Chat (desktop) */}
            {showSidebar && (
              <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className={cn(
                  'xl:flex-shrink-0 transition-[width] duration-300',
                  sidebarTab === 'chat' ? 'xl:w-96' : 'xl:w-80'
                )}
              >
                <div className="xl:sticky xl:top-4 space-y-3">
                  {/* Botón para ocultar sidebar en páginas full-width */}
                  {needsFullWidth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSidebar(false)}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      <PanelRightClose className="h-4 w-4 mr-2" />
                      Ocultar panel
                    </Button>
                  )}

                  {/* Tab toggle (desktop only) */}
                  <div className="hidden xl:flex bg-muted rounded-lg p-1 gap-1">
                    <button
                      onClick={() => setSidebarTab('resumen')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                        sidebarTab === 'resumen'
                          ? 'bg-white text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Resumen
                    </button>
                    <button
                      onClick={() => { setSidebarTab('chat'); setChatHasActivity(false) }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all relative',
                        sidebarTab === 'chat'
                          ? 'bg-white text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Asistente
                      {chatHasActivity && sidebarTab !== 'chat' && (
                        <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </button>
                  </div>

                  {/* Resumen: mobile=always visible, desktop=only when resumen tab */}
                  <div className={cn(sidebarTab !== 'resumen' && 'xl:hidden')}>
                    <ResumenTotalesCotizacion cotizacion={cotizacion} />
                  </div>

                  {/* Chat: mobile=hidden (uses Sheet), desktop=only when chat tab */}
                  <div className={cn('hidden', sidebarTab === 'chat' && 'xl:block')}>
                    <div className="h-[calc(100vh-180px)]">
                      <ChatPanelContent
                        cotizacionId={cotizacion.id}
                        mode="sidebar"
                        currentUserId={session?.user?.id}
                        onNewActivity={() => { if (sidebarTab !== 'chat') setChatHasActivity(true) }}
                      />
                    </div>
                  </div>

                  {/* Botón volver al hub si estamos en sub-página */}
                  {!isHubPage && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/comercial/cotizaciones/${id}`)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver al Resumen
                    </Button>
                  )}
                </div>
              </motion.aside>
            )}

            {/* Botón flotante para mostrar sidebar cuando está oculto */}
            {!showSidebar && needsFullWidth && (
              <div className="fixed bottom-4 right-4 z-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSidebar(true)}
                  className="shadow-lg bg-white hover:bg-gray-50"
                >
                  <PanelRightOpen className="h-4 w-4 mr-2" />
                  Resumen
                </Button>
              </div>
            )}
          </div>

          {/* Modal de exportación Excel */}
          <Dialog open={showExcelModal} onOpenChange={setShowExcelModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  Exportar a Excel
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <button
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                  disabled={excelExporting !== null}
                  onClick={async () => {
                    try {
                      setExcelExporting('simple')
                      await exportarCotizacionAExcel(cotizacion)
                      toast.success('Excel exportado')
                      setShowExcelModal(false)
                    } catch {
                      toast.error('Error al exportar Excel')
                    } finally {
                      setExcelExporting(null)
                    }
                  }}
                >
                  <div className="shrink-0 mt-0.5 h-9 w-9 rounded-md bg-green-100 flex items-center justify-center">
                    {excelExporting === 'simple' ? (
                      <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Excel Estándar</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Formato de solo lectura con todos los datos de la cotización. Ideal para compartir con el cliente.
                    </p>
                  </div>
                </button>
                <button
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                  disabled={excelExporting !== null}
                  onClick={async () => {
                    try {
                      setExcelExporting('editable')
                      await exportarCotizacionAExcelEditable(cotizacion)
                      toast.success('Excel editable exportado')
                      setShowExcelModal(false)
                    } catch {
                      toast.error('Error al exportar Excel editable')
                    } finally {
                      setExcelExporting(null)
                    }
                  }}
                >
                  <div className="shrink-0 mt-0.5 h-9 w-9 rounded-md bg-amber-100 flex items-center justify-center">
                    {excelExporting === 'editable' ? (
                      <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Excel Editable</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Incluye fórmulas y celdas editables para modificar cantidades, precios y márgenes internamente.
                    </p>
                  </div>
                </button>
              </div>
            </DialogContent>
          </Dialog>

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
              router.push(`/crm/oportunidades/${oportunidad.id}`)
            }}
          />

          {/* Notificación de integración CRM */}
          {showCrmNotification && (
            <CrmIntegrationNotification
              entityType="cotizacion"
              entityId={cotizacion.id}
              entityNombre={cotizacion.nombre}
              clienteNombre={cotizacion.cliente?.nombre || 'Cliente no especificado'}
              valor={cotizacion.grandTotal || 0}
              onCreateOportunidad={() => {
                setShowCrmNotification(false)
                refreshCotizacion()
              }}
              onDismiss={() => setShowCrmNotification(false)}
            />
          )}

          {/* Mobile Chat Sheet */}
          <ChatPanel
            open={mobileChatOpen}
            onOpenChange={setMobileChatOpen}
            cotizacionId={cotizacion.id}
            currentUserId={session?.user?.id}
          />
        </div>
      </div>
    </CotizacionContext.Provider>
  )
}
