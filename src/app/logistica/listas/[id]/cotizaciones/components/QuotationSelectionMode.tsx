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
  const [selections, setSelections] = useState<Record<string, string | null>>({})
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

  const handleWinnerSelected = async (itemId: string, winnerId: string | null) => {
    // Update local state immediately for UI feedback
    setSelections(prev => ({
      ...prev,
      [itemId]: winnerId
    }))

    // Save selection immediately to database using the same API as the main list page
    try {
      const response = await fetch(`/api/lista-equipo-item/${itemId}/seleccionar-cotizacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotizacionProveedorItemId: winnerId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar selección')
      }

      const result = await response.json()

      // Show detailed feedback about what was updated
      const { estadisticas, pedidosActualizados } = result

      if (estadisticas.pedidosAfectados > 0) {
        toast.success(
          `Ganador seleccionado. Se actualizaron ${estadisticas.pedidosAfectados} pedidos con ${estadisticas.itemsActualizados} ítems.`,
          {
            description: winnerId
              ? `Precio actualizado en pedidos existentes`
              : `Precios removidos de pedidos existentes`,
            duration: 5000
          }
        )
      } else {
        toast.success('Ganador seleccionado exitosamente')
      }

      // Refresh stats after successful save
      loadSelectionStats()
    } catch (error) {
      console.error('Error saving winner selection:', error)
      toast.error('Error al guardar la selección del ganador')

      // Revert local state on error
      setSelections(prev => {
        const newSelections = { ...prev }
        delete newSelections[itemId]
        return newSelections
      })
    }
  }

  const handleConfirmSelections = () => {
    // Since selections are saved immediately, this just shows the summary
    // The modal will display current selections from the database
    setShowConfirmModal(true)
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