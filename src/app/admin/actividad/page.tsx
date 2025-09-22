// ===================================================
// 📊 PÁGINA DE ACTIVIDAD DEL SISTEMA
// ===================================================
// Página de administración que muestra la actividad reciente
// de todo el sistema GYS
// ===================================================

import { Suspense } from 'react'
import ActivityDashboard from '@/components/dashboard/ActivityDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Users, FileText, Building2, TrendingUp } from 'lucide-react'

// ===================================================
// 🎨 COMPONENTE DE CARGA
// ===================================================

function ActivityDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center space-x-4">
        <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
        <div className="space-y-2">
          <div className="w-48 h-6 bg-muted rounded animate-pulse"></div>
          <div className="w-64 h-4 bg-muted rounded animate-pulse"></div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="w-24 h-4 bg-muted rounded animate-pulse"></div>
              <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="w-12 h-8 bg-muted rounded animate-pulse mb-2"></div>
              <div className="w-20 h-3 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity list skeleton */}
      <Card>
        <CardHeader>
          <div className="w-32 h-6 bg-muted rounded animate-pulse"></div>
          <div className="w-48 h-4 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-5 bg-muted rounded animate-pulse"></div>
                      <div className="w-32 h-4 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="w-20 h-3 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
                    <div className="w-24 h-3 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
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
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Actividad del Sistema</h1>
            <p className="text-muted-foreground">
              Monitorea todas las acciones realizadas en la plataforma GYS
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Users className="w-3 h-3 mr-1" />
            Panel Administrativo
          </Badge>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Entidades Rastreadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Proyectos</span>
                <Badge variant="outline">Activo</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Listas de Equipo</span>
                <Badge variant="outline">Activo</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pedidos</span>
                <Badge variant="outline">Activo</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Cotizaciones</span>
                <Badge variant="outline">Activo</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Oportunidades CRM</span>
                <Badge variant="outline">Activo</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Tipos de Acción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Crear</span>
                <Badge className="bg-green-100 text-green-800">✓</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Actualizar</span>
                <Badge className="bg-blue-100 text-blue-800">✓</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Eliminar</span>
                <Badge className="bg-red-100 text-red-800">✓</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Cambiar Estado</span>
                <Badge className="bg-purple-100 text-purple-800">✓</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Características
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Auditoría Completa</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Filtros Avanzados</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Auto-refresh</span>
                <Badge variant="default">✓</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Exportable</span>
                <Badge variant="secondary">Próximamente</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard de actividad */}
      <Suspense fallback={<ActivityDashboardSkeleton />}>
        <ActivityDashboard
          limite={100}
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
  title: 'Actividad del Sistema | Panel Administrativo GYS',
  description: 'Monitorea todas las acciones y cambios realizados en la plataforma GYS',
}