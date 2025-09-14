/**
 * 🚀 Lazy Loading Component - PedidoEquipoTable
 * 
 * Implementa React.lazy para optimizar la carga del componente pesado PedidoEquipoTable.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

// ✅ Lazy loading del componente pesado
const PedidoEquipoTable = lazy(() => import('@/components/finanzas/aprovisionamiento/PedidoEquipoTable'));

// 🔄 Skeleton loader personalizado para la tabla de pedidos
const PedidoTableSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Filtros y búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Tabla de pedidos */}
      <div className="space-y-3">
        {/* Header de tabla */}
        <div className="grid grid-cols-8 gap-4 p-3 bg-muted/50 rounded">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        
        {/* Filas de datos */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-4 p-3 border rounded">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Paginación */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  </Card>
);

// 📡 Props interface para el componente lazy
interface LazyPedidoEquipoTableProps {
  data: any[]; // PedidoEquipo[] - usando any para evitar importar tipos
  loading?: boolean;
  filtros?: any;
  allowEdit?: boolean;
  allowBulkActions?: boolean;
  showCoherenceIndicators?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  onEdit?: (pedido: any) => void;
  onDelete?: (pedido: any) => void;
  onUpdateStatus?: (pedido: any, newStatus: any) => void;
  onViewTracking?: (pedido: any) => void;
  onContactSupplier?: (pedido: any) => void;
  onPedidoClick?: (pedido: any) => void;
  onPedidoEdit?: (pedido: any) => void;
  onPedidoUpdate?: (id: string, updates: any) => Promise<void>;
  onBulkAction?: (action: string, pedidoIds: string[]) => Promise<void>;
  onExport?: (format: 'excel' | 'pdf') => void;
  className?: string;
}

/**
 * Componente wrapper que implementa lazy loading para PedidoEquipoTable
 * 
 * @param props - Props del componente original
 * @returns JSX.Element con Suspense y fallback
 */
export const LazyPedidoEquipoTable: React.FC<LazyPedidoEquipoTableProps> = (props) => {
  return (
    <Suspense fallback={<PedidoTableSkeleton />}>
      <PedidoEquipoTable {...props} />
    </Suspense>
  );
};

// 🔄 Export por defecto para compatibilidad
export default LazyPedidoEquipoTable;

// 📊 Métricas de performance (desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 LazyPedidoEquipoTable: Componente cargado de forma lazy');
}