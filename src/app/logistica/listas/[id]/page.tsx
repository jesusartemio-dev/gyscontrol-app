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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import LogisticaListaDetalleItemTableProfessional from '@/components/logistica/LogisticaListaDetalleItemTableProfessional'
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
      {/* Header con información de la lista */}
        <div className="p-4 border rounded-xl bg-white space-y-2">
          <h1 className="text-2xl font-bold flex justify-between items-center">
            {lista.codigo}
            <Badge variant="outline">{lista.estado}</Badge>
          </h1>
          <p className="text-sm text-gray-700">
            <strong>Proyecto:</strong> {lista.proyecto?.nombre || 'Sin proyecto'}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Fecha creación:</strong>{' '}
            {new Date(lista.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Costo Total Elegido:</strong>{' '}
            $ {(lista.items?.reduce((total, item) => total + (item.costoElegido ?? 0), 0) ?? 0).toFixed(2)}
          </p>
          {lista.estado === 'por_cotizar' && (
            <div className="pt-2">
              <Button
                onClick={async () => {
                  try {
                    const updated = await updateListaEstado(lista.id, 'por_validar')
                    if (updated) {
                      toast.success('Estado actualizado a por_validar')
                      handleRefetch()
                    } else {
                      toast.error('Error al actualizar el estado')
                    }
                  } catch (error) {
                    toast.error('Error al avanzar estado')
                  }
                }}
                className="bg-green-600 text-white"
              >
                Avanzar a Por Validar
              </Button>
            </div>
          )}
        </div>

      {lista.items.length > 0 ? (
        <LogisticaListaDetalleItemTableProfessional items={lista.items} onUpdated={handleRefetch} />
      ) : (
        <p className="text-gray-500">No hay ítems en esta lista.</p>
      )}
    </div>
  )
}
