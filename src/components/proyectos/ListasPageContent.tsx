'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ClipboardList, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ListasEquipoView } from './ListasEquipoView'
import { ListaItemsView } from './ListaItemsView'

interface Props {
  activeTab: string
}

export function ListasPageContent({ activeTab }: Props) {
  const router = useRouter()

  const setTab = (tab: string) => {
    const params = new URLSearchParams()
    if (tab !== 'listas') params.set('tab', tab)
    router.push(`/proyectos/listas${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <div className="space-y-3">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Listas</h1>
          <Badge variant="secondary" className="text-xs">
            Equipos
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setTab('listas')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeTab === 'listas'
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Listas
          </button>
          <button
            onClick={() => setTab('items')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeTab === 'items'
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Package className="h-3.5 w-3.5" />
            Items
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'items' ? <ListaItemsView /> : <ListasEquipoView />}
    </div>
  )
}
