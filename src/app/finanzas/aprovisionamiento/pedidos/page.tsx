/**
 * 📄 Página de Pedidos de Equipos - Sistema GYS
 * 
 * Funcionalidades:
 * - ✅ Listado paginado de pedidos de equipos
 * - ✅ Filtros avanzados (proyecto, proveedor, estado, fechas, montos)
 * - ✅ Búsqueda por texto y coherencia
 * - ✅ Ordenamiento por columnas
 * - ✅ Estadísticas en tiempo real
 * - ✅ Vista Gantt para timeline de ejecución
 * - ✅ Validaciones de coherencia lista vs pedidos
 * - ✅ Exportación a PDF/Excel
 * - ✅ Navegación breadcrumb
 * - ✅ Estados de carga y error
 * - ✅ Responsive design
 */

import { Suspense } from 'react'
import PedidosEquipoPageContent from './PedidosEquipoPageContent'

// 📝 Types
import type { EstadoPedido } from '@/types/modelos'

export const metadata = {
  title: 'Pedidos de Equipos | Aprovisionamiento | GYS',
  description: 'Gestión de pedidos de equipos para aprovisionamiento financiero con vista Gantt y validaciones de coherencia'
}

export default function PedidosEquipoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PedidosEquipoPageContent />
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
        
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
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