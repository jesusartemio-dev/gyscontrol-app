/**
 * Página de Timeline de Aprovisionamiento
 * Vista Gantt minimalista - la UI principal está en TimelineView
 */

import { Suspense } from 'react'
import {
  Calendar,
  ChevronRight,
  Home,
  Loader2
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
    <div className="p-4 space-y-3">
      {/* Breadcrumbs - compact */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/finanzas" className="hover:text-foreground transition-colors">
          Finanzas
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/finanzas/aprovisionamiento" className="hover:text-foreground transition-colors">
          Aprovisionamiento
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Timeline</span>
      </nav>

      {/* Timeline Content */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-[calc(100vh-150px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
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

export const dynamic = 'force-dynamic'
