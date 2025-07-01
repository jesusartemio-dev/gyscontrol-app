// ===================================================
// 📁 Archivo: src/app/logistica/listas/[id]/page.tsx
// 📌 Descripción: Página detalle de lista logística usando tabla de ítems con comparativo
// ✍️ Autor: Jesús Artemio
// 📅 Actualizado: 2025-06-09 (usa tabla en vez de tarjetas por ítem)
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { getLogisticaListaById } from '@/lib/services/logisticaLista'
import LogisticaListaDetalleHeader from '@/components/logistica/LogisticaListaDetalleHeader'
import LogisticaListaDetalleItemTable from '@/components/logistica/LogisticaListaDetalleItemTable'
import type { ListaEquipo } from '@/types'

export default function LogisticaListaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [lista, setLista] = useState<ListaEquipo | null>(null)

  const handleRefetch = async () => {
    try {
      const data = await getLogisticaListaById(id)
      if (data) setLista(data)
      else toast.error('No se encontró la lista')
    } catch {
      toast.error('Error al refrescar lista')
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [id])

  if (!lista) return <p className="p-4">Cargando...</p>

  return (
    <div className="p-4 space-y-4">
      <LogisticaListaDetalleHeader lista={lista} onEstadoCambiado={handleRefetch} />

      {lista.items.length > 0 ? (
        <LogisticaListaDetalleItemTable items={lista.items} onUpdated={handleRefetch} />
      ) : (
        <p className="text-gray-500">No hay ítems en esta lista.</p>
      )}
    </div>
  )
}
