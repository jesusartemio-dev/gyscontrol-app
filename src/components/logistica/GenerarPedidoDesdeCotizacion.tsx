// ===================================================
// 📁 Archivo: GenerarPedidoDesdeCotizacion.tsx
// 🖌️ Descripción: Genera un PedidoEquipo y sus ítems desde cotizaciones seleccionadas
// 🧰 Uso: En logística, una vez seleccionadas las mejores ofertas
// ✍️ Autor: IA GYS + Jesús Artemio
// 🗓️ Última actualización: 2025-05-23
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { CotizacionProveedorItem, PedidoEquipoItemPayload } from '@/types'
import { getCotizacionProveedorItems } from '@/lib/services/cotizacionProveedorItem'
import { createPedidoEquipoItem } from '@/lib/services/pedidoEquipoItem'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  pedidoId: string
  responsableId: string
}

export default function GenerarPedidoDesdeCotizacion({ pedidoId, responsableId }: Props) {
  const [itemsSeleccionados, setItemsSeleccionados] = useState<CotizacionProveedorItem[]>([])

  useEffect(() => {
    const cargarSeleccionados = async () => {
      const todos = await getCotizacionProveedorItems()
      const seleccionados = todos?.filter((i) => i.esSeleccionada) || []
      setItemsSeleccionados(seleccionados)
    }
    cargarSeleccionados()
  }, [])

  const handleGenerar = async () => {
    if (itemsSeleccionados.length === 0) {
      toast.warning('No hay cotizaciones seleccionadas')
      return
    }

    try {
      for (const item of itemsSeleccionados) {
        // ✅ Validar que el item tenga listaEquipoItemId
        if (!item.listaEquipoItemId) {
          console.warn(`Item ${item.codigo} no tiene listaEquipoItemId, se omite`)
          continue
        }

        const payload: PedidoEquipoItemPayload = {
          pedidoId,
          responsableId,
          listaEquipoItemId: item.listaEquipoItemId,
          cantidadPedida: item.cantidad || item.cantidadOriginal,
          precioUnitario: item.precioUnitario,
          costoTotal: item.costoTotal,
          estado: 'pendiente',
          // Required fields from the payload type
          codigo: item.codigo || 'N/A',
          descripcion: item.descripcion || 'Descripción no disponible',
          unidad: item.unidad || 'pza',
        }
        await createPedidoEquipoItem(payload)
      }
      toast.success('📦 Pedido generado exitosamente')
    } catch (error) {
      toast.error('Error al generar pedido')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Se generarán {itemsSeleccionados.length} ítems para el pedido.
      </p>
      <Button onClick={handleGenerar} className="bg-blue-700 text-white">
        📄 Generar Pedido desde Cotizaciones
      </Button>
    </div>
  )
}
