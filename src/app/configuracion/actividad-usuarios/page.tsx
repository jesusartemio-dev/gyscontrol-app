import { Suspense } from 'react'
import UserActivityDashboard from '@/components/configuracion/UserActivityDashboard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function UserActivitySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 pb-2">
              <div className="w-20 h-3 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="w-10 h-6 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="w-48 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-16 h-3 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ActividadUsuariosPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <Suspense fallback={<UserActivitySkeleton />}>
        <UserActivityDashboard />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: 'Actividad de Usuarios | GYS',
}
