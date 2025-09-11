'use client'

// ✅ React & Next.js
import { useRouter } from 'next/navigation'

// ✅ Components
import { ListaEquipoTable } from '@/components/finanzas/aprovisionamiento/ListaEquipoTable'

// 🎯 Types
import type { ListaEquipoDetail } from '@/types/master-detail'

interface ListaEquipoTableClientProps {
  listas: ListaEquipoDetail[]
  loading?: boolean
  allowEdit?: boolean
  allowBulkActions?: boolean
  showCoherenceIndicators?: boolean
}

export default function ListaEquipoTableClient({
  listas,
  loading = false,
  allowEdit = true,
  allowBulkActions = true,
  showCoherenceIndicators = true
}: ListaEquipoTableClientProps) {
  const router = useRouter()
  
  return (
    <ListaEquipoTable 
      listas={listas}
      loading={loading}
      allowEdit={allowEdit}
      allowBulkActions={allowBulkActions}
      showCoherenceIndicators={showCoherenceIndicators}
      onListaClick={(lista) => {
        // Navigate to lista detail
        router.push(`/finanzas/aprovisionamiento/listas/${lista.id}`)
      }}
      onListaEdit={(lista) => {
        // Handle edit - redirect to edit page or open modal
        console.log('Edit lista:', lista.id)
      }}
      onListaUpdate={async (id, updates) => {
        // Handle inline updates
        console.log('Update lista:', id, updates)
        // TODO: Implement update API call
      }}
      onBulkAction={async (action, listaIds) => {
        // Handle bulk actions (approve, reject, etc.)
        console.log('Bulk action:', action, listaIds)
        // TODO: Implement bulk action API call
      }}
      onExport={(format) => {
        // Handle export
        console.log('Export format:', format)
        // TODO: Implement export functionality
      }}
    />
  )
}
