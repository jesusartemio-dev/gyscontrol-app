/**
 * 📊 Página Principal - Dashboard de Reportes de Pedidos
 * 
 * Server component optimizado que renderiza el dashboard ejecutivo
 * con métricas de trazabilidad, gráficos y timeline de entregas.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, BarChart3, TrendingUp, Package, Clock } from 'lucide-react';
import DashboardPedidos from '@/components/reportes/DashboardPedidos';
import logger from '@/lib/logger';

// ✅ Metadata dinámica generada por generateMetadata() al final del archivo

// 🔧 Configuración de la página
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 🔁 Componente de Loading Skeleton
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      
      {/* Filtros skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Métricas KPI skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Contenido principal skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// 🔁 Componente de Error Boundary
const ErrorFallback: React.FC<{ error?: string }> = ({ error }) => {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestion">Gestión</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestion/reportes">Reportes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard de Pedidos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Error Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Ha ocurrido un error al cargar el dashboard. Por favor, intenta nuevamente.'}
        </AlertDescription>
      </Alert>
      
      {/* Fallback content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Totales
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">Datos no disponibles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregas en Tiempo
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">Datos no disponibles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eficiencia
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">Datos no disponibles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">Datos no disponibles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// 🔁 Componente de Validación de Permisos
const ValidarPermisos: React.FC<{ session: any; children: React.ReactNode }> = ({ 
  session, 
  children 
}) => {
  // ✅ Validar roles permitidos
  const rolesPermitidos = ['admin', 'gerente', 'comercial', 'proyectos', 'logistica', 'gestor'];
  const tienePermiso = session?.user?.role && rolesPermitidos.includes(session.user.role);
  
  if (!tienePermiso) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/gestion">Gestión</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/gestion/reportes">Reportes</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard de Pedidos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos suficientes para acceder a este dashboard. 
            Contacta al administrador del sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return <>{children}</>;
};

// 📊 Componente principal de la página
export default async function DashboardPedidosPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session) {
      notFound();
    }
    
    // 🎯 Resolver searchParams (Next.js 15+)
    const resolvedSearchParams = await searchParams;
    
    // 📝 Log de acceso
    logger.info('Dashboard de pedidos accedido', {
      userId: session.user?.id,
      userRole: session.user?.role,
      searchParams: resolvedSearchParams,
      timestamp: new Date().toISOString()
    });
    
    // 🎯 Extraer parámetros de búsqueda
    const proyectoId = typeof resolvedSearchParams.proyecto === 'string' ? resolvedSearchParams.proyecto : undefined;
    
    return (
      <ValidarPermisos session={session}>
        <div className="container mx-auto py-6 space-y-6">
          {/* 🧭 Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/gestion">Gestión</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/gestion/reportes">Reportes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard de Pedidos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* 📊 Dashboard Principal */}
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardPedidos 
              proyectoId={proyectoId}
              className="min-h-screen"
            />
          </Suspense>
        </div>
      </ValidarPermisos>
    );
    
  } catch (error) {
    // 📝 Log del error
    logger.error('Error en página de dashboard de pedidos', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      searchParams: await searchParams,
      timestamp: new Date().toISOString()
    });
    
    // 🚨 Mostrar error fallback
    return (
      <div className="container mx-auto py-6">
        <ErrorFallback 
          error={error instanceof Error ? error.message : 'Error interno del servidor'} 
        />
      </div>
    );
  }
}

// 🔧 Función para generar metadata dinámica
export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const proyectoId = typeof resolvedSearchParams.proyecto === 'string' ? resolvedSearchParams.proyecto : undefined;
  
  const baseTitle = 'Dashboard de Pedidos | GYS';
  const title = proyectoId ? `${baseTitle} - Proyecto ${proyectoId}` : baseTitle;
  
  return {
    title,
    description: proyectoId 
      ? `Dashboard de métricas y trazabilidad para el proyecto ${proyectoId}`
      : 'Dashboard ejecutivo con métricas de trazabilidad y análisis de entregas',
    openGraph: {
      title,
      description: 'Visualización ejecutiva de métricas y trazabilidad de pedidos'
    }
  };
}
