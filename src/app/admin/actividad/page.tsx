// ===================================================
// 📊 PÁGINA DE ACTIVIDAD DEL SISTEMA
// ===================================================

import { Suspense } from 'react'
import ActivityDashboard from '@/components/dashboard/ActivityDashboard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// ===================================================
// 🎨 COMPONENTE DE CARGA
// ===================================================

function ActivityDashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 pb-2">
              <div className="w-20 h-3 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="w-10 h-6 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity list skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
                <div className="flex-1 space-y-1">
                  <div className="w-48 h-4 bg-muted rounded animate-pulse"></div>
                  <div className="w-24 h-3 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="w-16 h-3 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===================================================
// 📊 COMPONENTE PRINCIPAL
// ===================================================

export default function ActividadSistemaPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <Suspense fallback={<ActivityDashboardSkeleton />}>
        <ActivityDashboard
          limite={20}
          autoRefresh={true}
          intervaloRefresh={5}
          mostrarFiltros={true}
        />
      </Suspense>
    </div>
  )
}

// ===================================================
// 🔧 METADATA PARA SEO
// ===================================================

export const metadata = {
  title: 'Actividad del Sistema | GYS',
  description: 'Monitorea todas las acciones y cambios realizados en la plataforma GYS',
}
