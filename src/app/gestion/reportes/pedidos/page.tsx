/**
 * 📊 Dashboard de Pedidos - Reportes
 * Diseño minimalista y compacto
 * @author GYS Team
 */

import React, { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import DashboardPedidos from '@/components/reportes/DashboardPedidos'
import logger from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Loading skeleton compacto
const DashboardSkeleton = () => (
  <div className="p-4 space-y-4">
    <Skeleton className="h-10 w-48" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
)

// Validación de permisos
const ValidarPermisos = ({ session, children }: { session: any; children: React.ReactNode }) => {
  const rolesPermitidos = ['admin', 'gerente', 'comercial', 'proyectos', 'logistica', 'logistico', 'gestor']
  const tienePermiso = session?.user?.role && rolesPermitidos.includes(session.user.role)

  if (!tienePermiso) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            No tienes permisos para acceder a este dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}

export default async function DashboardPedidosPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      notFound()
    }

    const resolvedSearchParams = await searchParams

    logger.info('Dashboard de pedidos accedido', {
      userId: session.user?.id,
      userRole: session.user?.role,
      timestamp: new Date().toISOString()
    })

    const proyectoId = typeof resolvedSearchParams.proyecto === 'string' ? resolvedSearchParams.proyecto : undefined

    return (
      <ValidarPermisos session={session}>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardPedidos proyectoId={proyectoId} />
        </Suspense>
      </ValidarPermisos>
    )
  } catch (error) {
    logger.error('Error en dashboard de pedidos', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    })

    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {error instanceof Error ? error.message : 'Error al cargar el dashboard'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams
  const proyectoId = typeof resolvedSearchParams.proyecto === 'string' ? resolvedSearchParams.proyecto : undefined

  return {
    title: proyectoId ? `Dashboard Pedidos - ${proyectoId}` : 'Dashboard de Pedidos | GYS',
    description: 'Dashboard ejecutivo de métricas y trazabilidad de pedidos'
  }
}
