import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ProyectoFasesView } from '@/components/proyectos/fases/ProyectoFasesView';
import { getProyectoById } from '@/lib/services/proyecto';
import { Calendar, Clock, BarChart3 } from 'lucide-react';
import type { Proyecto } from '@/types/modelos';

// ✅ Props de la página
interface CronogramaPageProps {
  params: Promise<{
    id: string;
  }>;
}

// ✅ Generar metadata dinámico
export async function generateMetadata({ params }: CronogramaPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const proyecto = await getProyectoById(id);
    
    if (!proyecto) {
      return {
        title: 'Proyecto no encontrado - GYS App',
        description: 'El proyecto solicitado no existe o no tienes permisos para verlo.'
      };
    }

    return {
      title: `Cronograma - ${proyecto.nombre} | GYS App`,
      description: `Gestión del cronograma y EDT del proyecto ${proyecto.nombre}. Visualiza el progreso, métricas y planificación de tareas.`,
      keywords: ['cronograma', 'EDT', 'proyecto', 'planificación', 'gestión', proyecto.nombre]
    };
  } catch (error) {
    return {
      title: 'Error - GYS App',
      description: 'Error al cargar la información del proyecto.'
    };
  }
}

// ✅ Componente de loading para el cronograma
function CronogramaSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPIs skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex space-x-1 border-b">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ✅ Componente principal de la página
export default async function CronogramaPage({ params }: CronogramaPageProps) {
  const { id } = await params;
  // ✅ Validar que el ID sea válido
  if (!id || typeof id !== 'string') {
    notFound();
  }

  // ✅ Obtener información básica del proyecto para el breadcrumb
  let proyecto: Proyecto | null = null;
  try {
    proyecto = await getProyectoById(id);
    if (!proyecto) {
      // Redirect to 404 page instead of using notFound()
      return (
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Proyecto no encontrado</h1>
            <p className="text-gray-600 mb-6">El proyecto solicitado no existe o no tienes permisos para verlo.</p>
            <a href="/proyectos" className="text-blue-600 hover:text-blue-800 underline">
              Volver a la lista de proyectos
            </a>
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error('Error al cargar proyecto:', error);
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error al cargar el proyecto</h1>
          <p className="text-gray-600 mb-6">Ha ocurrido un error al cargar la información del proyecto.</p>
          <a href="/proyectos" className="text-blue-600 hover:text-blue-800 underline">
            Volver a la lista de proyectos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* ✅ Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/proyectos">Proyectos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/proyectos/${id}`}>
              {proyecto.nombre}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Cronograma</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ✅ Header de la página */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Cronograma - {proyecto.nombre}
            </h1>
            <p className="text-gray-600 mt-1">
              Gestión de EDT, planificación y seguimiento del progreso del proyecto
            </p>
          </div>
        </div>

        {/* ✅ Información rápida del proyecto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Estado:</span>
            <span className="font-medium capitalize">{proyecto.estado}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Progreso:</span>
            <span className="font-medium">{Math.round((proyecto.totalReal / proyecto.totalInterno) * 100) || 0}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Fecha límite:</span>
            <span className="font-medium">
              {proyecto.fechaFin ?
                new Date(proyecto.fechaFin).toLocaleDateString('es-ES') :
                'No definida'
              }
            </span>
          </div>
        </div>
      </div>

      {/* ✅ Contenedor principal del cronograma */}
      <Suspense fallback={<CronogramaSkeleton />}>
        <ProyectoFasesView proyectoId={id} proyecto={proyecto} />
      </Suspense>
    </div>
  );
}

// ✅ Configuración de la página
export const dynamic = 'force-dynamic';
export const revalidate = 0;