'use client'

import { Truck, Package, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LogisticaPedidosTab = 'pedidos' | 'items' | 'consolidado'

interface Props {
  activeTab: LogisticaPedidosTab
  onTabChange: (tab: LogisticaPedidosTab) => void
}

export function LogisticaPedidosTabSwitcher({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
      <button
        onClick={() => onTabChange('pedidos')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          activeTab === 'pedidos'
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <Truck className="h-3.5 w-3.5" />
        Pedidos
      </button>
      <button
        onClick={() => onTabChange('items')}
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
      <button
        onClick={() => onTabChange('consolidado')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          activeTab === 'consolidado'
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        Consolidado
      </button>
    </div>
  )
}
