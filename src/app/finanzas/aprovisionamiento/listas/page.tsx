/**
 * 📄 Página de Listas de Equipo - Sistema GYS
 * 
 * Funcionalidades:
 * - ✅ Listado paginado de listas de equipo
 * - ✅ Filtros avanzados (proyecto, estado, fechas, montos)
 * - ✅ Búsqueda por texto
 * - ✅ Ordenamiento por columnas
 * - ✅ Estadísticas en tiempo real
 * - ✅ Exportación a PDF/Excel
 * - ✅ Navegación breadcrumb
 * - ✅ Estados de carga y error
 * - ✅ Responsive design
 */

import { Suspense } from 'react'
import ListasEquipoPageContent from './ListasEquipoPageContent'

// 📝 Types
import type { EstadoListaEquipo } from '@/types/modelos'

export default function ListasEquipoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ListasEquipoPageContent />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
        
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        
        {/* Filters skeleton */}
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        
        {/* Table skeleton */}
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
