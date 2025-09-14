/**
 * 🚀 Lazy Loading Component - ListaEquipoTable
 * 
 * Implementa React.lazy para optimizar la carga del componente pesado ListaEquipoTable.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

// ✅ Lazy loading del componente pesado
const ListaEquipoTable = lazy(() => import('@/components/finanzas/aprovisionamiento/ListaEquipoTable'));

// 🔄 Skeleton loader personalizado para la tabla
const TableSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      
      {/* Table skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-32" />
          </div>
        ))}
      </div>
    </div>
  </Card>
);

// 📡 Props interface para el componente lazy
interface LazyListaEquipoTableProps {
  listas: any[]; // ListaEquipoDetail[] - usando any para evitar importar tipos
  loading?: boolean;
  filtros?: any;
  allowEdit?: boolean;
  allowBulkActions?: boolean;
  showCoherenceIndicators?: boolean;
  onListaClick?: (lista: any) => void;
  onListaEdit?: (lista: any) => void;
  onListaUpdate?: (id: string, updates: any) => Promise<void>;
  onBulkAction?: (action: string, listaIds: string[]) => Promise<void>;
  onExport?: (format: 'excel' | 'pdf') => void;
  className?: string;
}

/**
 * Componente wrapper que implementa lazy loading para ListaEquipoTable
 * 
 * @param props - Props del componente original
 * @returns JSX.Element con Suspense y fallback
 */
export const LazyListaEquipoTable: React.FC<LazyListaEquipoTableProps> = (props) => {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ListaEquipoTable {...props} />
    </Suspense>
  );
};

// 🔄 Export por defecto para compatibilidad
export default LazyListaEquipoTable;

// 📊 Métricas de performance (desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 LazyListaEquipoTable: Componente cargado de forma lazy');
}