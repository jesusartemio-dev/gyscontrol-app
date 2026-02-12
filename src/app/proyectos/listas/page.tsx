import { Suspense } from 'react'
import { Metadata } from 'next'
import { Loader2 } from 'lucide-react'
import { ListasPageContent } from '@/components/proyectos/ListasPageContent'

export const metadata: Metadata = {
  title: 'Listas de Equipos | GYS App',
  description: 'Gestión de listas de equipos por proyecto'
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

export default async function ListasEquipoPage({ searchParams }: PageProps) {
  const params = await searchParams
  const activeTab = params.tab || 'listas'

  return (
    <div className="p-4 space-y-3">
      <Suspense fallback={<LoadingState />}>
        <ListasPageContent activeTab={activeTab} />
      </Suspense>
    </div>
  )
}
