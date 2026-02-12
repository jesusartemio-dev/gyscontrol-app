'use client'

import { useRouter } from 'next/navigation'
import { Package, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  activeTab: string
  totalItems: number
}

export function EquiposTabSwitcher({ activeTab, totalItems }: Props) {
  const router = useRouter()

  const setTab = (tab: string) => {
    const url = new URL(window.location.href)
    if (tab === 'agrupado') {
      url.searchParams.set('tab', 'agrupado')
    } else {
      url.searchParams.delete('tab')
    }
    router.push(url.pathname + url.search)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold">Equipos</h1>
        <Badge variant="secondary" className="text-xs">
          {totalItems}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setTab('items')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            activeTab !== 'agrupado'
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          Items
        </button>
        <button
          onClick={() => setTab('agrupado')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            activeTab === 'agrupado'
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Agrupado
        </button>
      </div>
    </div>
  )
}
