// ✅ Página de configuración de notificaciones
// 🎯 Permite a los usuarios personalizar sus preferencias de notificaciones
// 🔐 Acceso restringido a usuarios autenticados

import { Metadata } from 'next'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import NotificationSettings from '@/components/NotificationSettings'

// 📄 Metadata para SEO
export const metadata: Metadata = {
  title: 'Configuración de Notificaciones | GYS App',
  description: 'Personaliza tus preferencias de notificaciones del sistema GYS',
  keywords: ['notificaciones', 'configuración', 'preferencias', 'alertas', 'GYS'],
}

// 🎨 Componente de loading para Suspense
function NotificationSettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}

export default async function NotificacionesPage() {
  // 🔐 Verificar autenticación
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/configuracion">
              Configuración
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Notificaciones</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📱 Header de la página */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Configuración de Notificaciones
        </h1>
        <p className="text-muted-foreground">
          Personaliza cómo y cuándo recibir alertas del sistema GYS
        </p>
      </div>

      {/* ⚙️ Componente de configuración */}
      <div className="max-w-2xl">
        <Suspense fallback={<NotificationSettingsLoading />}>
          <NotificationSettings />
        </Suspense>
      </div>

      {/* ℹ️ Información adicional */}
      <div className="max-w-2xl space-y-4 pt-6 border-t">
        <h2 className="text-lg font-semibold">Información sobre las notificaciones</h2>
        
        <div className="grid gap-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">¿Cómo funcionan las notificaciones?</h3>
            <p>
              El sistema verifica automáticamente el estado de cotizaciones, proyectos y pedidos 
              según el intervalo configurado. Las notificaciones se muestran como badges 
              numerados en el menú lateral.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Tipos de alertas disponibles</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Cotizaciones pendientes:</strong> Cotizaciones que requieren seguimiento</li>
              <li><strong>Proyectos en progreso:</strong> Proyectos que necesitan atención</li>
              <li><strong>Pedidos de equipos:</strong> Pedidos pendientes de gestión</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Privacidad y datos</h3>
            <p>
              Tus preferencias se almacenan localmente en tu navegador. 
              No se comparten con otros usuarios ni se envían a servidores externos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}