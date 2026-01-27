/**
 * Página de Timeline de Aprovisionamiento - Vista minimalista
 */

import { Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

import { TimelineView } from '@/components/finanzas/aprovisionamiento/TimelineView'
import { getTimelineData } from '@/lib/services/aprovisionamiento'

export const metadata = {
  title: 'Timeline | Finanzas | GYS',
  description: 'Vista Gantt de aprovisionamiento'
}

interface PageProps {
  searchParams: Promise<{
    proyecto?: string
    fechaInicio?: string
    fechaFin?: string
    vista?: 'gantt' | 'lista' | 'calendario'
    agrupacion?: 'proyecto' | 'estado' | 'proveedor' | 'fecha'
    alertas?: string
  }>
}

export default async function TimelinePage({ searchParams: searchParamsPromise }: PageProps) {
  const searchParams = await searchParamsPromise

  // Fetch timeline data
  const timelineData = await getTimelineData({
    proyectoId: searchParams.proyecto,
    fechaInicio: searchParams.fechaInicio,
    fechaFin: searchParams.fechaFin,
    vista: searchParams.vista || 'gantt',
    agrupacion: searchParams.agrupacion || 'proyecto',
    soloAlertas: searchParams.alertas === 'true'
  })

  // Stats
  const stats = {
    totalItems: timelineData.items.length,
    itemsEnRiesgo: timelineData.items.filter(item =>
      item.estado === 'enviado' || item.estado === 'atendido' || item.estado === 'parcial'
    ).length,
    itemsRetrasados: timelineData.items.filter(item => item.diasRetraso && item.diasRetraso > 0).length,
    alertasActivas: timelineData.alertas?.length || 0
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-semibold">Timeline de Aprovisionamiento</h1>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Download className="h-3 w-3 mr-1" />
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Total Items</span>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold">{stats.totalItems}</p>
          <p className="text-[10px] text-muted-foreground">Listas y pedidos</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">En Riesgo</span>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-lg font-bold text-orange-600">{stats.itemsEnRiesgo}</p>
          <p className="text-[10px] text-muted-foreground">Requieren atención</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Retrasados</span>
            <Clock className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-600">{stats.itemsRetrasados}</p>
          <p className="text-[10px] text-muted-foreground">Fuera de cronograma</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Alertas</span>
            {stats.alertasActivas > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className={`text-lg font-bold ${stats.alertasActivas > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.alertasActivas}
          </p>
          <p className="text-[10px] text-muted-foreground">Alertas activas</p>
        </div>
      </div>

      {/* Timeline View */}
      <div className="border rounded-lg bg-white overflow-hidden min-h-[500px]">
        <Suspense fallback={
          <div className="h-[500px] flex items-center justify-center">
            <div className="text-center">
              <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">Cargando timeline...</p>
            </div>
          </div>
        }>
          <TimelineView
            proyectoId={searchParams.proyecto}
            allowEdit={false}
            showFilters={false}
            showCoherencePanel={false}
            className="h-[500px]"
            defaultFilters={{
              fechaInicio: searchParams.fechaInicio,
              fechaFin: searchParams.fechaFin,
              proyectoIds: searchParams.proyecto ? [searchParams.proyecto] : [],
              tipoVista: searchParams.vista || 'gantt',
              agrupacion: searchParams.agrupacion || 'proyecto',
              soloAlertas: searchParams.alertas === 'true'
            }}
          />
        </Suspense>
      </div>

      {/* Alertas */}
      {stats.alertasActivas > 0 && timelineData.alertas && (
        <div className="border border-orange-200 rounded-lg bg-orange-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-800">
              Alertas Activas ({stats.alertasActivas})
            </span>
          </div>
          <div className="space-y-2">
            {timelineData.alertas.slice(0, 3).map((alerta, index) => (
              <div key={index} className="flex items-start justify-between p-2 bg-white border border-orange-200 rounded">
                <div>
                  <p className="text-xs font-medium text-orange-900">{alerta.mensaje}</p>
                  <p className="text-[10px] text-orange-700">
                    {alerta.tipo === 'error' ? '🔴 Error' : alerta.tipo === 'warning' ? '🟡 Advertencia' : '🔵 Info'}
                  </p>
                </div>
                <Badge
                  variant={alerta.prioridad === 'alta' ? 'destructive' : 'secondary'}
                  className="text-[10px] h-5"
                >
                  {alerta.prioridad}
                </Badge>
              </div>
            ))}
            {timelineData.alertas.length > 3 && (
              <p className="text-[10px] text-orange-700 text-center">
                +{timelineData.alertas.length - 3} alertas más
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
