/**
 * Página de Timeline de Aprovisionamiento
 * 
 * Vista Gantt interactiva que muestra la línea temporal completa del aprovisionamiento:
 * - Gantt de listas y pedidos
 * - Filtros temporales avanzados
 * - Alertas de coherencia y retrasos
 * - Exportación de reportes
 * 
 * @author GYS Team
 * @version 2.0.0
 */

import React, { Suspense } from 'react'
import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { 
  Calendar, 
  ArrowLeft, 
  Download, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Home
} from 'lucide-react'
import Link from 'next/link'

// ✅ Components
import { TimelineView } from '@/components/finanzas/aprovisionamiento/TimelineView'
import { TimelineFiltersWrapper } from '@/components/finanzas/aprovisionamiento/TimelineFiltersWrapper'

// 📡 Services
import { getTimelineData } from '@/lib/services/aprovisionamiento'

export const metadata: Metadata = {
  title: 'Timeline de Aprovisionamiento | GYS',
  description: 'Vista Gantt interactiva del aprovisionamiento financiero de equipos'
}

interface PageProps {
  searchParams: {
    proyecto?: string
    fechaInicio?: string
    fechaFin?: string
    vista?: 'gantt' | 'lista' | 'calendario'
    agrupacion?: 'proyecto' | 'estado' | 'proveedor' | 'fecha'
    coherencia?: string
    alertas?: string
  }
}

export default async function TimelinePage({ searchParams: searchParamsPromise }: { searchParams: Promise<PageProps['searchParams']> }) {
  const searchParams = await searchParamsPromise
  // 📡 Fetch timeline data
  const timelineData = await getTimelineData({
    proyectoId: searchParams.proyecto,
    fechaInicio: searchParams.fechaInicio,
    fechaFin: searchParams.fechaFin,
    vista: searchParams.vista || 'gantt',
    agrupacion: searchParams.agrupacion || 'proyecto',
    soloCoherencia: searchParams.coherencia === 'true',
    soloAlertas: searchParams.alertas === 'true'
  })

  // 🔁 Calculate timeline stats
  const stats = {
    totalItems: timelineData.items.length,
    itemsEnRiesgo: timelineData.items.filter(item => 
      item.estado === 'enviado' || item.estado === 'atendido' || item.estado === 'parcial'
    ).length,
    itemsRetrasados: timelineData.items.filter(item => item.diasRetraso && item.diasRetraso > 0).length,
    alertasActivas: timelineData.alertas?.length || 0
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas">Finanzas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas/aprovisionamiento">Aprovisionamiento</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Timeline</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 🎨 Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/finanzas/aprovisionamiento">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Timeline de Aprovisionamiento</h1>
              <p className="text-muted-foreground mt-2">
                Vista Gantt interactiva con seguimiento temporal completo
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configurar Vista
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* 📊 Timeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Listas y pedidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Riesgo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.itemsEnRiesgo}</div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retrasados</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.itemsRetrasados}</div>
              <p className="text-xs text-muted-foreground">
                Fuera de cronograma
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas</CardTitle>
              {stats.alertasActivas > 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.alertasActivas > 0 ? (
                  <Badge variant="destructive">{stats.alertasActivas}</Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600">0</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Alertas activas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* 📅 Main Timeline View - Prioritized Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* 🎯 Compact Filters Sidebar */}
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded" />}>
                <TimelineFiltersWrapper 
                  filtros={{
                    fechaInicio: searchParams.fechaInicio ? new Date(searchParams.fechaInicio).toISOString() : undefined,
                    fechaFin: searchParams.fechaFin ? new Date(searchParams.fechaFin).toISOString() : undefined,
                    proyectoIds: searchParams.proyecto ? [searchParams.proyecto] : [],
                    tipoVista: (searchParams.vista as 'gantt' | 'lista' | 'calendario') || 'gantt',
                    agrupacion: (searchParams.agrupacion as 'proyecto' | 'estado' | 'proveedor' | 'fecha') || 'proyecto',
                    validarCoherencia: searchParams.coherencia === 'true',
                    soloAlertas: searchParams.alertas === 'true',
                    incluirSugerencias: false,
                    margenDias: 7,
                    alertaAnticipacion: 15
                  }}
                  loading={false}
                  compact={true}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* 📊 Timeline Chart - Main Content */}
        <div className="xl:col-span-4">
          <Card className="min-h-[700px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Timeline Gantt</CardTitle>
                  <CardDescription className="text-sm">
                    Cronograma interactivo de aprovisionamiento
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {searchParams.vista || 'Gantt'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {searchParams.agrupacion || 'Proyecto'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Suspense fallback={
                <div className="h-[600px] bg-muted animate-pulse rounded-b-lg flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Cargando timeline...</p>
                  </div>
                </div>
              }>
                <TimelineView 
                  proyectoId={searchParams.proyecto}
                  allowEdit={false}
                  showFilters={false}
                  showCoherencePanel={false}
                  className="h-[600px]"
                  defaultFilters={{
                    fechaInicio: searchParams.fechaInicio ? new Date(searchParams.fechaInicio).toISOString() : undefined,
                    fechaFin: searchParams.fechaFin ? new Date(searchParams.fechaFin).toISOString() : undefined,
                    proyectoIds: searchParams.proyecto ? [searchParams.proyecto] : [],
                    tipoVista: (searchParams.vista as 'gantt' | 'lista' | 'calendario') || 'gantt', // ✅ Use URL parameter
                    agrupacion: (searchParams.agrupacion as 'proyecto' | 'estado' | 'proveedor' | 'fecha') || 'proyecto',
                    soloAlertas: searchParams.alertas === 'true'
                  }}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 🚨 Alertas Section (if any) */}
      {stats.alertasActivas > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Alertas Activas ({stats.alertasActivas})
            </CardTitle>
            <CardDescription className="text-orange-700">
              Situaciones que requieren atención inmediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timelineData.alertas?.slice(0, 3).map((alerta, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-white border border-orange-200 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-orange-900">{alerta.mensaje}</p>
                    <p className="text-xs text-orange-700">
                      {alerta.tipo === 'error' ? '🔴 Error' : alerta.tipo === 'warning' ? '🟡 Advertencia' : '🔵 Información'}
                    </p>
                  </div>
                  <Badge variant={alerta.prioridad === 'alta' ? 'destructive' : 'secondary'}>
                    {alerta.prioridad}
                  </Badge>
                </div>
              ))}
              {timelineData.alertas && timelineData.alertas.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    Ver todas las alertas ({timelineData.alertas.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 🔄 Loading Component
function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
        <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
      
      <div className="h-32 bg-muted animate-pulse rounded" />
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  )
}

// ❌ Error Component
function Error({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }
  reset: () => void 
}) {
  return (
    <div className="container mx-auto p-6">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Error en Timeline
          </CardTitle>
          <CardDescription>
            Ha ocurrido un error al cargar el timeline de aprovisionamiento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || 'Error desconocido al cargar los datos del timeline'}
          </p>
          <div className="flex space-x-2">
            <Button onClick={reset}>
              Reintentar
            </Button>
            <Button variant="outline" asChild>
              <Link href="/finanzas/aprovisionamiento">
                Volver a Aprovisionamiento
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
