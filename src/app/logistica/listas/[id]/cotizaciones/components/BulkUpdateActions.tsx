'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Mail, CheckCircle, X, Loader2 } from 'lucide-react'

interface BulkUpdateActionsProps {
  listaId: string
  selectedQuotations: any[]
  onUpdate: () => void
}

export default function BulkUpdateActions({
  listaId,
  selectedQuotations,
  onUpdate
}: BulkUpdateActionsProps) {
  const [updating, setUpdating] = useState(false)

  const handleBulkUpdate = async (action: 'received' | 'quoted' | 'clear') => {
    if (selectedQuotations.length === 0) {
      toast.error('Selecciona al menos una cotización')
      return
    }

    setUpdating(true)
    try {
      const quotationIds = selectedQuotations.map(q => q.id)

      const response = await fetch(`/api/logistica/cotizaciones/bulk-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listaId,
          quotationIds,
          action
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`${result.updated} cotizaciones actualizadas`)
        onUpdate()
      } else {
        throw new Error('Error en actualización masiva')
      }
    } catch (error) {
      console.error('Error in bulk update:', error)
      toast.error('Error al actualizar cotizaciones')
    } finally {
      setUpdating(false)
    }
  }

  if (selectedQuotations.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm font-medium text-blue-900">
        {selectedQuotations.length} seleccionadas:
      </span>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkUpdate('received')}
        disabled={updating}
        className="flex items-center gap-2"
      >
        {updating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Mail className="h-3 w-3" />
        )}
        Marcar como Recibidas
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkUpdate('quoted')}
        disabled={updating}
        className="flex items-center gap-2"
      >
        {updating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle className="h-3 w-3" />
        )}
        Marcar como Cotizadas
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleBulkUpdate('clear')}
        disabled={updating}
        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <X className="h-3 w-3" />
        Limpiar Selección
      </Button>
    </div>
  )
}