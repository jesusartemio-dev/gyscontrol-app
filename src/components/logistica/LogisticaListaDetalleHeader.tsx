// ===================================================
// 📁 Archivo: LogisticaListaDetalleHeader.tsx
// 📌 Descripción: Encabezado resumen con costo total de la lista logística
// ===================================================

'use client'

import { useState } from 'react'
import { ListaEquipo } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateListaEstado } from '@/lib/services/listaEquipo'

interface Props {
  lista: ListaEquipo
  onEstadoCambiado?: (nuevoEstado: string) => void
}

export default function LogisticaListaDetalleHeader({ lista, onEstadoCambiado }: Props) {
  const [loading, setLoading] = useState(false)

  const handleAvanzarEstado = async () => {
    try {
      setLoading(true)
      const nuevoEstado = 'por_validar'
      const updated = await updateListaEstado(lista.id, nuevoEstado)
      if (updated) {
        toast.success(`Estado actualizado a ${nuevoEstado}`)
        onEstadoCambiado?.(nuevoEstado)
      } else {
        toast.error('Error al actualizar el estado')
      }
    } catch (error) {
      toast.error('Error al avanzar estado')
    } finally {
      setLoading(false)
    }
  }

  const puedeAvanzar = lista.estado === 'por_cotizar'

  // 🔢 Cálculo del costo total sumando los ítems con cotización elegida
  const costoTotal = lista.items?.reduce((total, item) => {
    return total + (item.costoElegido ?? 0)
  }, 0) ?? 0

  return (
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
        S/. {costoTotal.toFixed(2)}
      </p>

      {puedeAvanzar && (
        <div className="pt-2">
          <Button
            onClick={handleAvanzarEstado}
            disabled={loading}
            className="bg-green-600 text-white"
          >
            {loading ? 'Actualizando...' : 'Avanzar a Por Validar'}
          </Button>
        </div>
      )}
    </div>
  )
}
