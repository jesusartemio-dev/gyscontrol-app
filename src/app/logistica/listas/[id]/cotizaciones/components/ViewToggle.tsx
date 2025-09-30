'use client'

import { Button } from '@/components/ui/button'
import { BarChart3, Edit, Target } from 'lucide-react'

interface ViewToggleProps {
  activeView: 'overview' | 'update' | 'select'
  onViewChange: (view: 'overview' | 'update' | 'select') => void
}

export default function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 mr-4">Modo:</span>

        <Button
          variant={activeView === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('overview')}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Vista General
        </Button>

        <Button
          variant={activeView === 'update' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('update')}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Actualizar Cotizaciones
        </Button>

        <Button
          variant={activeView === 'select' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('select')}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          Seleccionar Ganadores
        </Button>
      </div>
    </div>
  )
}