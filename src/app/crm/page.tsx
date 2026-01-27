'use client'

import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import CrmDashboard from '@/components/crm/dashboard/CrmDashboard'

export default function CrmPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-sm text-muted-foreground">Debes iniciar sesión para acceder al CRM.</p>
        </div>
      </div>
    )
  }

  const userRole = session?.user?.role || 'comercial'
  const userId = session?.user?.id

  return (
    <CrmDashboard
      userId={userId}
      userRole={userRole}
    />
  )
}
