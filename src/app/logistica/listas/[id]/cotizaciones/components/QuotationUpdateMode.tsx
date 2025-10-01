'use client'

import { useState } from 'react'
import QuotationList from './QuotationList'
import QuotationUpdateForm from './QuotationUpdateForm'
import BulkUpdateActions from './BulkUpdateActions'

export default function QuotationUpdateMode({ listaId }: { listaId: string }) {
  const [selectedQuotation, setSelectedQuotation] = useState<string | null>(null)
  const [selectedQuotations, setSelectedQuotations] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="update-mode-container grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Panel Izquierdo: Lista de Cotizaciones */}
      <div className="quotations-panel space-y-4">
        <BulkUpdateActions
          listaId={listaId}
          selectedQuotations={selectedQuotations}
          onUpdate={handleUpdate}
        />

        <QuotationList
          listaId={listaId}
          selectedIds={selectedQuotations.map(q => q.id)}
          onSelectionChange={(ids) => {
            // This would need to be updated to get full quotation objects
            // For now, just update the IDs
            setSelectedQuotations(ids.map(id => ({ id })))
          }}
          onSelectQuotation={setSelectedQuotation}
          loading={false}
          refreshKey={refreshKey}
        />
      </div>

      {/* Panel Derecho: Formulario de Edición */}
      <div className="update-panel">
        <QuotationUpdateForm
          quotationId={selectedQuotation}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  )
}