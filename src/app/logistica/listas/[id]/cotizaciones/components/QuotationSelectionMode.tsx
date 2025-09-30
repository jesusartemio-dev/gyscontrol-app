'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Award, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import QuotationComparisonTable from './QuotationComparisonTable'
import WinnerSelectionModal from './WinnerSelectionModal'
import SelectionSummary from './SelectionSummary'

interface SelectionStats {
  totalItems: number
  selectedItems: number
  pendingItems: number
  completionPercentage: number
  totalSavings: number
  averageDeliveryTime: number
  bestPriceItems: number
  fastestDeliveryItems: number
}

export default function QuotationSelectionMode({ listaId }: { listaId: string }) {
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [stats, setStats] = useState<SelectionStats>({
    totalItems: 0,
    selectedItems: 0,
    pendingItems: 0,
    completionPercentage: 0,
    totalSavings: 0,
    averageDeliveryTime: 0,
    bestPriceItems: 0,
    fastestDeliveryItems: 0
  })

  useEffect(() => {
    loadSelectionStats()
  }, [listaId, selections])

  const loadSelectionStats = async () => {
    try {
      const response = await fetch(`/api/logistica/listas/${listaId}/cotizaciones/selection-stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading selection stats:', error)
    }
  }

  const handleWinnerSelected = (itemId: string, winnerId: string) => {
    setSelections(prev => ({
      ...prev,
      [itemId]: winnerId
    }))
  }

  const handleConfirmSelections = async () => {
    try {
      const response = await fetch(`/api/logistica/listas/${listaId}/cotizaciones/select-winners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections })
      })

      if (response.ok) {
        toast.success('Ganadores seleccionados exitosamente')
        setSelections({})
        loadSelectionStats()
      } else {
        throw new Error('Error al seleccionar ganadores')
      }
    } catch (error) {
      console.error('Error confirming selections:', error)
      toast.error('Error al confirmar selecciones')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Selección de Ganadores</h2>
          <p className="text-sm text-gray-600">
            Compara cotizaciones y selecciona los mejores proveedores para cada ítem
          </p>
        </div>

        <Button
          onClick={() => setShowConfirmModal(true)}
          disabled={stats.selectedItems === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirmar Selecciones ({stats.selectedItems})
        </Button>
      </div>

      {/* Selection Summary */}
      <SelectionSummary stats={stats} selections={selections} />

      {/* Comparison Table */}
      <QuotationComparisonTable
        listaId={listaId}
        onWinnerSelected={handleWinnerSelected}
      />

      {/* Confirmation Modal */}
      <WinnerSelectionModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        selections={selections}
        onConfirm={handleConfirmSelections}
        summary={{
          totalItems: stats.totalItems,
          selectedWinners: stats.selectedItems,
          totalSavings: stats.totalSavings,
          averageDeliveryTime: stats.averageDeliveryTime
        }}
      />
    </div>
  )
}