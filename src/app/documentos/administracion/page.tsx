'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { HardDrive, AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DriveBrowser } from '@/components/drive/DriveBrowser'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export default function DocumentosAdministracionPage() {
  const { data: session, status } = useSession()
  const [adminDriveId, setAdminDriveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/drive/config')
        if (res.ok) {
          const data = await res.json()
          setAdminDriveId(data.adminDriveId)
        }
      } catch (error) {
        console.error('Error fetching drive config:', error)
      } finally {
        setLoading(false)
      }
    }
    if (status === 'authenticated') {
      fetchConfig()
    }
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user || !ROLES_ALLOWED.includes(session.user.role)) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">No tienes permisos para acceder a esta sección.</span>
        </div>
      </div>
    )
  }

  if (!adminDriveId) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <HardDrive className="h-6 w-6 text-rose-500" />
          <h1 className="text-xl font-bold">Documentos - Administracion</h1>
          <Badge variant="secondary" className="text-xs">Google Drive</Badge>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              El Drive de Administracion (GYS.ADMINISTRACION) no esta configurado.
              Configura la variable <code className="bg-amber-100 px-1 rounded text-xs font-mono">GOOGLE_ADMIN_DRIVE_ID</code> en el servidor.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <HardDrive className="h-6 w-6 text-rose-500" />
        <h1 className="text-xl font-bold">Documentos - Administracion</h1>
        <Badge variant="secondary" className="text-xs">Google Drive</Badge>
      </div>

      <DriveBrowser sharedDriveId={adminDriveId} driveName="GYS.ADMINISTRACION" />
    </div>
  )
}
