/**
 * 🚀 Lazy Loading Component - ProyectoAprovisionamientoTable
 * 
 * Implementa React.lazy para optimizar la carga del componente pesado ProyectoAprovisionamientoTable.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

// ✅ Lazy loading del componente pesado
const ProyectoAprovisionamientoTable = lazy(() => import('@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoTable'));

// 🔄 Skeleton loader personalizado para la tabla de aprovisionamiento
const AprovisionamientoTableSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      {/* Header del proyecto */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Métricas del proyecto */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
      
      {/* Filtros de aprovisionamiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Tabla de aprovisionamiento */}
      <div className="space-y-3">
        {/* Header de tabla */}
        <div className="grid grid-cols-7 gap-4 p-3 bg-muted/50 rounded">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        
        {/* Filas de equipos */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-4 p-3 border rounded hover:bg-muted/30">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer con totales */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  </Card>
);

// 📡 Props interface para el componente lazy
interface LazyProyectoAprovisionamientoTableProps {
  proyectos: any[]; // ProyectoAprovisionamiento[] - usando any para evitar importar tipos
  loading?: boolean;
  onProyectoClick?: (proyectoId: string) => void;
  onVerListas?: (proyectoId: string) => void;
  onVerPedidos?: (proyectoId: string) => void;
  onExportar?: (proyectoId: string) => void;
  className?: string;
}

/**
 * Componente wrapper que implementa lazy loading para ProyectoAprovisionamientoTable
 * 
 * @param props - Props del componente original
 * @returns JSX.Element con Suspense y fallback
 */
export const LazyProyectoAprovisionamientoTable: React.FC<LazyProyectoAprovisionamientoTableProps> = (props) => {
  return (
    <Suspense fallback={<AprovisionamientoTableSkeleton />}>
      <ProyectoAprovisionamientoTable {...props} />
    </Suspense>
  );
};

// 🔄 Export por defecto para compatibilidad
export default LazyProyectoAprovisionamientoTable;

// 📊 Métricas de performance (desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 LazyProyectoAprovisionamientoTable: Componente cargado de forma lazy');
}