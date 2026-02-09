'use client'

import { HardDrive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DriveBrowser } from '@/components/drive/DriveBrowser'

export default function DocumentosPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <HardDrive className="h-6 w-6 text-indigo-500" />
        <h1 className="text-xl font-bold">Documentos</h1>
        <Badge variant="secondary" className="text-xs">
          Google Drive
        </Badge>
      </div>

      <DriveBrowser />
    </div>
  )
}
