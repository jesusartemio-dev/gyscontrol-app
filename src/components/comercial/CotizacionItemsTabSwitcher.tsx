'use client'

import { Search, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CotizacionItemsTab = 'buscar' | 'consolidado'

interface Props {
  activeTab: CotizacionItemsTab
  onTabChange: (tab: CotizacionItemsTab) => void
}

export function CotizacionItemsTabSwitcher({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
      <button
        onClick={() => onTabChange('buscar')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
          activeTab === 'buscar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <Search className="h-3.5 w-3.5" />
        Buscar
      </button>
      <button
        onClick={() => onTabChange('consolidado')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
          activeTab === 'consolidado' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        Consolidado
      </button>
    </div>
  )
}
