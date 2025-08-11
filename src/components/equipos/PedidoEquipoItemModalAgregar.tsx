'use client'

import { useState } from 'react'
import { PedidoEquipoItemPayload, ListaEquipoItem } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

interface Props {
  open: boolean
  onClose: () => void
  pedidoId: string
  items: ListaEquipoItem[]
  onCreateItem: (payload: PedidoEquipoItemPayload) => Promise<void>
}

export default function PedidoEquipoItemModalAgregar({
  open,
  onClose,
  pedidoId,
  items,
  onCreateItem,
}: Props) {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const updated = { ...prev }
      if (updated[itemId]) {
        delete updated[itemId]
      } else {
        updated[itemId] = 1
      }
      return updated
    })
  }

  const handleCantidadChange = (itemId: string, value: number) => {
    if (selectedItems[itemId] !== undefined) {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: value,
      }))
    }
  }

  const handleAgregar = async () => {
    const itemsSeleccionados = items.filter(item => selectedItems[item.id] > 0)

    for (const item of itemsSeleccionados) {
      const cantidadPedida = selectedItems[item.id]
      const restante = item.cantidad - (item.cantidadPedida || 0)

      if (cantidadPedida <= 0 || cantidadPedida > restante) continue

      const costoTotal = cantidadPedida * (item.precioElegido || 0)
      const fechaOrdenCompraRecomendada = new Date()
      fechaOrdenCompraRecomendada.setDate(
        fechaOrdenCompraRecomendada.getDate() +
          Number(item.tiempoEntregaDias ?? item.tiempoEntrega ?? 0)
      )

      const payload: PedidoEquipoItemPayload = {
        pedidoId,
        listaEquipoItemId: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        precioUnitario: item.precioElegido,
        cantidadPedida,
        costoTotal,
        fechaOrdenCompraRecomendada: fechaOrdenCompraRecomendada.toISOString(),
        cantidadAtendida: 0,
        comentarioLogistica: '',
      }

      await onCreateItem(payload) // ✅ Ya maneja sumar cantidadPedida internamente
    }

    setSelectedItems({})
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Agregar ítems al pedido</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase">
              <tr>
                <th className="p-2 text-center">✓</th>
                <th className="p-2 text-left">Código</th>
                <th className="p-2 text-left">Descripción</th>
                <th className="p-2 text-left">Unidad</th>
                <th className="p-2 text-right">Precio Unit.</th>
                <th className="p-2 text-right">Disponible</th>
                <th className="p-2 text-right">Cantidad Pedida</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const restante = item.cantidad - (item.cantidadPedida || 0)
                const selected = selectedItems[item.id] !== undefined
                return (
                  <tr key={item.id} className={selected ? 'bg-blue-50' : ''}>
                    <td className="p-2 text-center">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        disabled={restante <= 0}
                      />
                    </td>
                    <td className="p-2">{item.codigo}</td>
                    <td className="p-2">{item.descripcion}</td>
                    <td className="p-2">{item.unidad}</td>
                    <td className="p-2 text-right">
                      {item.precioElegido?.toFixed(2) ?? '-'}
                    </td>
                    <td className="p-2 text-right">{restante}</td>
                    <td className="p-2 text-right">
                      {selected ? (
                        <Input
                          type="number"
                          min={1}
                          max={restante}
                          value={selectedItems[item.id]}
                          onChange={e =>
                            handleCantidadChange(item.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-20"
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cancelar
          </Button>
          <Button onClick={handleAgregar} disabled={Object.keys(selectedItems).length === 0}>
            Agregar ítems seleccionados
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
