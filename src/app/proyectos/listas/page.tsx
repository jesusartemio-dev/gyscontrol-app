import { Suspense } from 'react'
import { Metadata } from 'next'
import { ClipboardList, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListasEquipoView } from '@/components/proyectos/ListasEquipoView'

export const metadata: Metadata = {
  title: 'Listas de Equipos | GYS App',
  description: 'Gestión de listas de equipos por proyecto'
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

export default function ListasEquipoPage() {
  return (
    <div className="p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold">Listas</h1>
        <Badge variant="secondary" className="text-xs">
          Equipos
        </Badge>
      </div>

      {/* Main Content */}
      <Suspense fallback={<LoadingState />}>
        <ListasEquipoView />
      </Suspense>
    </div>
  )
}
