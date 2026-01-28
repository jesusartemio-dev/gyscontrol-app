/**
 * Página de Timeline de Aprovisionamiento
 * Vista Gantt con filtros, coherencia y exportación
 */

import { Suspense } from 'react'
import {
  Calendar,
  ChevronRight,
  Home,
  Package,
  LayoutList
} from 'lucide-react'
import Link from 'next/link'

import { TimelinePageContent } from './TimelinePageContent'

export const metadata = {
  title: 'Timeline | Aprovisionamiento | GYS',
  description: 'Vista Gantt de aprovisionamiento financiero'
}

interface PageProps {
  searchParams: Promise<{
    proyecto?: string
    fechaInicio?: string
    fechaFin?: string
    vista?: 'gantt' | 'lista' | 'calendario'
    agrupacion?: 'proyecto' | 'estado' | 'proveedor' | 'fecha'
    alertas?: string
    tipo?: 'lista' | 'pedido' | 'ambos'
  }>
}

export default async function TimelinePage({ searchParams: searchParamsPromise }: PageProps) {
  const searchParams = await searchParamsPromise

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/finanzas" className="hover:text-foreground transition-colors">
          Finanzas
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/finanzas/aprovisionamiento" className="hover:text-foreground transition-colors">
          Aprovisionamiento
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Timeline</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Timeline de Aprovisionamiento</h1>
            <p className="text-sm text-muted-foreground">
              Visualiza listas y pedidos en el tiempo
            </p>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="flex items-center gap-2">
          <Link
            href="/finanzas/aprovisionamiento/listas"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-muted transition-colors"
          >
            <LayoutList className="h-3.5 w-3.5" />
            Listas
          </Link>
          <Link
            href="/finanzas/aprovisionamiento/pedidos"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-muted transition-colors"
          >
            <Package className="h-3.5 w-3.5" />
            Pedidos
          </Link>
        </div>
      </div>

      {/* Timeline Content - Client Component */}
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelinePageContent
          initialFilters={{
            proyectoId: searchParams.proyecto,
            fechaInicio: searchParams.fechaInicio,
            fechaFin: searchParams.fechaFin,
            vista: searchParams.vista || 'gantt',
            agrupacion: searchParams.agrupacion || 'proyecto',
            soloAlertas: searchParams.alertas === 'true',
            tipo: searchParams.tipo || 'ambos'
          }}
        />
      </Suspense>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border rounded-lg p-3 animate-pulse">
            <div className="h-3 w-16 bg-muted rounded mb-2" />
            <div className="h-6 w-10 bg-muted rounded mb-1" />
            <div className="h-2 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="border rounded-lg bg-white h-[600px] flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Cargando timeline...</p>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
