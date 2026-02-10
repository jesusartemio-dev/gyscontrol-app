'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Building,
  Calendar,
  AlertCircle,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  ExternalLink,
  Megaphone
} from 'lucide-react'
import { toast } from 'sonner'
import { getProyectoById } from '@/lib/services/proyecto'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import EstadoProyectoStepper from '@/components/proyectos/EstadoProyectoStepper'
import ResumenTotalesProyecto from '@/components/proyectos/ResumenTotalesProyecto'

import type { Proyecto, ProyectoCronograma } from '@/types'
import { ProyectoContext, CronogramaStats } from './ProyectoContext'

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
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

interface ProyectoLayoutProps {
  children: React.ReactNode
}

export default function ProyectoLayout({ children }: ProyectoLayoutProps) {
  const { id } = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cronogramaStats, setCronogramaStats] = useState<CronogramaStats>({
    cronogramas: 0,
    fases: 0,
    fasesEnProgreso: 0,
    edts: 0,
    tareas: 0,
    tareasCompletadas: 0,
    tareasEnProgreso: 0,
    horasPlan: 0,
    horasReales: 0,
    activeCronograma: null
  })

  const [oportunidadId, setOportunidadId] = useState<string | null>(null)

  // Determinar si estamos en el hub o en una sub-página
  const isHubPage = pathname === `/proyectos/${id}`

  // Páginas que necesitan ancho completo (sin sidebar)
  // Includes specific page names AND path patterns for detail views
  const fullWidthPages = ['cronograma']
  const fullWidthPatterns = [
    '/equipos/listas/', // Lista detail view (e.g., /equipos/listas/[listaId])
    '/equipos/pedidos/', // Pedido detail view
    '/equipos/detalle/' // Equipo detail view
  ]
  const currentPageSegment = pathname.split('/').pop() || ''
  const isDetailView = fullWidthPatterns.some(pattern => pathname.includes(pattern))
  const needsFullWidth = fullWidthPages.includes(currentPageSegment) || isDetailView

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
      'cronograma': 'Cronograma',
      'listas': 'Listas',
      'pedidos': 'Pedidos'
    }
    return subPageNames[lastSegment] || lastSegment
  }
  const currentSubPage = getSubPageName()

  const refreshProyecto = async () => {
    if (typeof id === 'string') {
      try {
        const data = await getProyectoById(id)
        if (data) {
          setProyecto(data)
          await fetchCronogramaStats(id)
        }
      } catch {
        toast.error('Error al actualizar proyecto')
      }
    }
  }

  const fetchCronogramaStats = async (projectId: string) => {
    try {
      const cronogramaResponse = await fetch(`/api/proyectos/${projectId}/cronograma`)
      let cronogramasList: ProyectoCronograma[] = []

      if (cronogramaResponse.ok) {
        const cronogramaData = await cronogramaResponse.json()
        if (cronogramaData.success) {
          cronogramasList = cronogramaData.data
        }
      }

      const [fasesResponse, edtsResponse, tareasResponse] = await Promise.all([
        fetch(`/api/proyectos/${projectId}/cronograma/fases`),
        fetch(`/api/proyectos/${projectId}/cronograma/edts`),
        fetch(`/api/proyectos/${projectId}/cronograma/tareas`)
      ])

      let fasesCount = 0
      let fasesEnProgreso = 0
      let edtsCount = 0
      let tareasCount = 0
      let tareasCompletadas = 0
      let tareasEnProgreso = 0
      let horasPlan = 0
      let horasReales = 0

      if (fasesResponse.ok) {
        const fasesData = await fasesResponse.json()
        if (fasesData.success) {
          const fasesList = fasesData.data as Array<{ estado: string }>
          fasesCount = fasesList.length
          fasesEnProgreso = fasesList.filter(f => f.estado === 'en_progreso').length
        }
      }

      if (edtsResponse.ok) {
        const edtsData = await edtsResponse.json()
        if (edtsData.success) {
          const edtsList = edtsData.data as Array<{ horasPlan?: number; horasReales?: number }>
          edtsCount = edtsList.length
          horasPlan = edtsList.reduce((sum, e) => sum + (Number(e.horasPlan) || 0), 0)
          horasReales = edtsList.reduce((sum, e) => sum + (Number(e.horasReales) || 0), 0)
        }
      }

      if (tareasResponse.ok) {
        const tareasData = await tareasResponse.json()
        if (tareasData.success) {
          const tareasList = tareasData.data as Array<{ estado: string }>
          tareasCount = tareasList.length
          tareasCompletadas = tareasList.filter(t => t.estado === 'completada').length
          tareasEnProgreso = tareasList.filter(t => t.estado === 'en_progreso').length
        }
      }

      if (cronogramasList.length === 0) {
        try {
          const createResponse = await fetch(`/api/proyectos/${projectId}/cronograma/generar-desde-cotizacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: 'comercial',
              nombre: 'Cronograma Comercial',
              esBaseline: false
            })
          })

          if (createResponse.ok) {
            const updatedCronogramaResponse = await fetch(`/api/proyectos/${projectId}/cronograma`)
            if (updatedCronogramaResponse.ok) {
              const updatedData = await updatedCronogramaResponse.json()
              if (updatedData.success) {
                cronogramasList = updatedData.data
              }
            }
          }
        } catch (createError) {
          console.warn('Error creando cronograma:', createError)
        }
      }

      const activeCronograma = cronogramasList.find(c => c.esBaseline) || cronogramasList[0] || null

      setCronogramaStats({
        cronogramas: cronogramasList.length,
        fases: fasesCount,
        fasesEnProgreso,
        edts: edtsCount,
        tareas: tareasCount,
        tareasCompletadas,
        tareasEnProgreso,
        horasPlan,
        horasReales,
        activeCronograma
      })
    } catch (error) {
      console.warn('Error fetching cronograma stats:', error)
    }
  }

  // Lookup CrmOportunidad linked to this proyecto
  useEffect(() => {
    if (typeof id === 'string') {
      fetch(`/api/crm/oportunidades?proyectoId=${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && Array.isArray(data) && data.length > 0) {
            setOportunidadId(data[0].id)
          }
        })
        .catch(() => {})
    }
  }, [id])

  useEffect(() => {
    if (typeof id === 'string') {
      setLoading(true)
      getProyectoById(id)
        .then(async (data) => {
          if (data) {
            setProyecto(data)
            await fetchCronogramaStats(id)
          } else {
            setError('Proyecto no encontrado')
          }
        })
        .catch(() => setError('Error al cargar proyecto.'))
        .finally(() => setLoading(false))
    }
  }, [id])

  const handleDataUpdate = (updatedProyecto: Proyecto) => {
    setProyecto(updatedProyecto)
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
            <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar proyecto</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/proyectos')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!proyecto) return null

  return (
    <ProyectoContext.Provider value={{ proyecto, setProyecto: handleDataUpdate, refreshProyecto, loading, cronogramaStats }}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto p-4 sm:p-6">
          {/* Header - Hidden on detail views for maximum content space */}
          {!isDetailView && (
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
                    onClick={() => router.push('/proyectos')}
                    className="p-0 h-auto text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Proyectos
                  </Button>
                  <span className="text-muted-foreground">/</span>
                  {currentSubPage ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/proyectos/${id}`)}
                        className="p-0 h-auto text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <span className="font-mono">{proyecto.codigo}</span>
                        <span className="mx-1">:</span>
                        <span className="truncate max-w-[300px]" title={proyecto.nombre}>{proyecto.nombre}</span>
                      </Button>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-medium text-foreground">{currentSubPage}</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded border">
                        {proyecto.codigo}
                      </span>
                      <h1 className="text-lg sm:text-xl font-semibold text-gray-900" title={proyecto.nombre}>
                        {proyecto.nombre}
                      </h1>
                    </div>
                  )}
                </div>

                {/* Acciones Principales */}
                <div className="flex items-center gap-2 flex-wrap">
                  {oportunidadId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/crm/oportunidades/${oportunidadId}`)}
                      className="h-8 text-orange-700 border-orange-300 hover:bg-orange-50"
                    >
                      <Megaphone className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Oportunidad</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                  {proyecto.cotizacionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/comercial/cotizaciones/${proyecto.cotizacionId}`)}
                      className="h-8 text-blue-700 border-blue-300 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Cotización</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Flow + Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <EstadoProyectoStepper
                  proyecto={proyecto}
                  onUpdated={(nuevoEstado) =>
                    handleDataUpdate({ ...proyecto, estado: nuevoEstado })
                  }
                />

                <span className="hidden sm:block text-muted-foreground">|</span>

                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Building className="h-3.5 w-3.5" />
                    {proyecto.cliente?.nombre || 'Sin cliente'}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(proyecto.fechaInicio)}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(proyecto.grandTotal || 0)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Layout de 2 Columnas */}
          <div className="flex flex-col xl:flex-row gap-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              {children}
            </motion.div>

            {showSidebar && (
              <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="xl:w-80 xl:flex-shrink-0"
              >
                <div className="xl:sticky xl:top-4 space-y-4">
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

                  <ResumenTotalesProyecto proyecto={proyecto} />

                  {!isHubPage && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/proyectos/${id}`)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver al Resumen
                    </Button>
                  )}
                </div>
              </motion.aside>
            )}

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
        </div>
      </div>
    </ProyectoContext.Provider>
  )
}
