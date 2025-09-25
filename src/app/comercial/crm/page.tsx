'use client'

import { useSession } from 'next-auth/react'
import CrmDashboard from '@/components/crm/dashboard/CrmDashboard'

export default function CrmPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-muted-foreground">Debes iniciar sesión para acceder al sistema CRM.</p>
        </div>
      </div>
    )
  }

  // Determinar el rol del usuario
  const userRole = session?.user?.role || 'comercial'
  const userId = session?.user?.id

  return (
    <CrmDashboard
      userId={userId}
      userRole={userRole}
    />
  )
}