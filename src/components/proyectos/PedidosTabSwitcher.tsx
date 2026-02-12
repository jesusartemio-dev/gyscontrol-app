'use client'

import { useRouter } from 'next/navigation'
import { ShoppingCart, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  activeTab: string
}

export function PedidosTabSwitcher({ activeTab }: Props) {
  const router = useRouter()

  const setTab = (tab: string) => {
    const url = new URL(window.location.href)
    if (tab === 'items') {
      url.searchParams.set('tab', 'items')
    } else {
      url.searchParams.delete('tab')
    }
    router.push(url.pathname + url.search)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold">Pedidos</h1>
        <Badge variant="secondary" className="text-xs">
          Equipos
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setTab('pedidos')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            activeTab !== 'items'
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Pedidos
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
  )
}
