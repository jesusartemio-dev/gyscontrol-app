/**
 * 📋 Lista de Equipos Detail Page
 * 
 * Página de detalle para gestión específica de una lista de equipos.
 * Incluye vista completa de items, edición, historial y configuraciones.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import ListaEquipoDetailView from '@/components/proyectos/ListaEquipoDetailView';
import DetailErrorBoundary from '@/components/common/DetailErrorBoundary';
import { getListaEquipoById } from '@/lib/services/listaEquipo';
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem';
import { getProyectoById } from '@/lib/services/proyecto';
import { validateRouteParams, RouteValidationError } from '@/lib/validators/routeParams';

interface ListaEquipoDetailPageProps {
  params: Promise<{
    id: string; // proyectoId
    listaId: string;
  }>;
}

// ✅ Loading component for the detail view
const DetailViewSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const ListaEquipoDetailPage: React.FC<ListaEquipoDetailPageProps> = async ({ params }) => {
  const resolvedParams = await params;
  
  try {
    // 🔍 Validate route parameters
    const validatedParams = validateRouteParams.listaEquipoDetail(resolvedParams);
    const { id: proyectoId, listaId } = validatedParams;
    
    // 📡 Fetch initial data server-side for better performance
    const [lista, items, proyecto] = await Promise.all([
      getListaEquipoById(listaId).catch((error) => {
        console.error('Error fetching lista:', error);
        return null;
      }),
      getListaEquipoItemsByLista(listaId).catch((error) => {
        console.error('Error fetching items:', error);
        return [];
      }),
      getProyectoById(proyectoId).catch((error) => {
        console.error('Error fetching proyecto:', error);
        return null;
      })
    ]);
    
    // ✅ Handle not found cases
    if (!lista || !proyecto) {
      notFound();
    }
    
    return (
      <DetailErrorBoundary>
        <div className="container mx-auto py-6">
          <Suspense fallback={<DetailViewSkeleton />}>
            <ListaEquipoDetailView
              proyectoId={proyectoId}
              listaId={listaId}
              initialLista={lista}
              initialItems={items}
              initialProyecto={proyecto}
            />
          </Suspense>
        </div>
      </DetailErrorBoundary>
    );
  } catch (error) {
    console.error('Error loading detail page:', error);
    
    // Handle validation errors specifically
    if (error instanceof RouteValidationError) {
      notFound();
    }
    
    // Re-throw other errors to be caught by error boundary
    throw error;
  }
};

export default ListaEquipoDetailPage;