'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import QuotationWorkspaceHeader from './components/QuotationWorkspaceHeader'
import ViewToggle from './components/ViewToggle'
import QuotationOverview from './components/QuotationOverview'
import QuotationUpdateMode from './components/QuotationUpdateMode'
import QuotationSelectionMode from './components/QuotationSelectionMode'

export default function QuotationManagementHub() {
  const { id } = useParams()
  const [activeView, setActiveView] = useState<'overview' | 'update' | 'select'>('overview')

  return (
    <div className="quotation-workspace">
      <QuotationWorkspaceHeader listaId={id as string} />

      <ViewToggle
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div className="workspace-content p-6">
        {activeView === 'overview' && <QuotationOverview listaId={id as string} />}
        {activeView === 'update' && <QuotationUpdateMode listaId={id as string} />}
        {activeView === 'select' && <QuotationSelectionMode listaId={id as string} />}
      </div>
    </div>
  )
}