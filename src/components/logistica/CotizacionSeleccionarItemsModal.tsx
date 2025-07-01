// ===================================================
// 📁 Archivo: CotizacionSeleccionarItemsModal.tsx
// 📌 Mejorado usando getLogisticaListas para logística
// 🧠 Ajuste para usar nueva API separada
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLogisticaListas } from '@/lib/services/logisticaLista'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import type { ListaEquipo, ListaEquipoItem, EstadoCotizacionProveedor } from '@/types'
import { toast } from 'sonner'

interface Props {
  cotizacionId: string
  onCreated?: () => void
}

export default function CotizacionSeleccionarItemsModal({ cotizacionId, onCreated }: Props) {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [selectedListaId, setSelectedListaId] = useState('')
  const [selectedItems, setSelectedItems] = useState<Record<string, { item: ListaEquipoItem; cantidad: number }>>({})

  useEffect(() => {
    const cargarListas = async () => {
      const data = await getLogisticaListas()
      if (data) setListas(data)
    }
    cargarListas()
  }, [])

  const cargarItems = async (listaId: string) => {
    const data = await getListaEquipoItemsByLista(listaId)
    if (data) setItems(data)
  }

  const handleCheck = (item: ListaEquipoItem, checked: boolean) => {
    setSelectedItems((prev) => {
      const updated = { ...prev }
      if (checked) {
        updated[item.id] = { item, cantidad: item.cantidad || 1 }
      } else {
        delete updated[item.id]
      }
      return updated
    })
  }

  const handleCantidadChange = (itemId: string, cantidad: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], cantidad },
    }))
  }

  const handleAgregarSeleccionados = async () => {
    const estado: EstadoCotizacionProveedor = 'cotizado'
    const promises = Object.values(selectedItems).map(async ({ item, cantidad }) => {
      const payload = {
        cotizacionId,
        listaEquipoItemId: item.id,
        precioUnitario: item.presupuesto || 0,
        cantidad,
        costoTotal: (item.presupuesto || 0) * cantidad,
        tiempoEntrega: '',
        estado,
        esSeleccionada: false,
      }
      return createCotizacionProveedorItem(payload)
    })

    await Promise.all(promises)
    toast.success('Ítems agregados correctamente')
    onCreated?.()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">📋 Seleccionar Ítems Técnicos</Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-[1200px] space-y-4 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-semibold">Seleccionar Ítems Técnicos</DialogTitle>

        <div>
          <Label>Selecciona una Lista Técnica</Label>
          <select
            className="border p-2 rounded w-full"
            value={selectedListaId}
            onChange={(e) => {
              setSelectedListaId(e.target.value)
              cargarItems(e.target.value)
            }}
          >
            <option value="">-- Selecciona una lista --</option>
            {listas.map((lista) => (
              <option key={lista.id} value={lista.id}>
                {lista.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-6 gap-2 text-sm font-semibold bg-gray-100 p-2 rounded">
          <div></div>
          <div>Descripción</div>
          <div>Código</div>
          <div>Unidad</div>
          <div>Cant. Original</div>
          <div>Cant. Cotizada</div>
        </div>

        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-6 gap-2 items-center border-b py-1">
            <input
              type="checkbox"
              checked={item.id in selectedItems}
              onChange={(e) => handleCheck(item, e.target.checked)}
            />
            <div>{item.descripcion}</div>
            <div>{item.codigo}</div>
            <div>{item.unidad}</div>
            <div>{item.cantidad}</div>
            <Input
              type="number"
              value={selectedItems[item.id]?.cantidad || ''}
              onChange={(e) => handleCantidadChange(item.id, parseFloat(e.target.value) || 1)}
              disabled={!(item.id in selectedItems)}
            />
          </div>
        ))}

        <hr className="my-2" />

        <h3 className="font-bold">Ítems Seleccionados</h3>
        {Object.values(selectedItems).length === 0 ? (
          <p className="text-gray-500">No hay ítems seleccionados.</p>
        ) : (
          <ul className="space-y-1">
            {Object.values(selectedItems).map(({ item, cantidad }) => (
              <li key={item.id} className="text-sm flex justify-between items-center">
                <span>{item.descripcion} ({item.codigo}) • {cantidad} unidades</span>
                <button
                  className="text-red-500 text-xs"
                  onClick={() => handleCheck(item, false)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogClose asChild>
          <Button onClick={handleAgregarSeleccionados} className="w-full bg-green-600 text-white">
            ➕ Agregar Ítems Seleccionados
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
