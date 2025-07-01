'use client'

import { useState } from 'react'
import type { CotizacionGastoItem, CotizacionGastoItemPayload } from '@/types'
import { Pencil, Trash2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  items: CotizacionGastoItem[]
  onUpdate?: (id: string, changes: Partial<CotizacionGastoItemPayload>) => void
  onDelete?: (id: string) => void
}

export default function CotizacionGastoItemList({ items, onUpdate, onDelete }: Props) {
  const [modoEdicion, setModoEdicion] = useState<Record<string, boolean>>({})
  const [valoresEditados, setValoresEditados] = useState<Record<string, Partial<CotizacionGastoItemPayload>>>({})

  const activarEdicion = (id: string) => {
    setModoEdicion(prev => ({ ...prev, [id]: true }))
    setValoresEditados(prev => ({ ...prev, [id]: {} }))
  }

  const cancelarEdicion = (id: string) => {
    setModoEdicion(prev => ({ ...prev, [id]: false }))
    setValoresEditados(prev => {
      const copia = { ...prev }
      delete copia[id]
      return copia
    })
  }

  const guardarCambios = (id: string) => {
    const cambios = valoresEditados[id]
    if (!cambios || Object.keys(cambios).length === 0) {
      toast.warning('No se han hecho cambios.')
      return
    }
    onUpdate?.(id, cambios)
    cancelarEdicion(id)
  }

  const actualizarCampo = (id: string, campo: keyof CotizacionGastoItemPayload, valor: any) => {
    setValoresEditados(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: campo === 'cantidad' || campo === 'precioUnitario' || campo === 'factorSeguridad' || campo === 'margen'
          ? parseFloat(valor)
          : valor,
      },
    }))
  }

  const totalCostoInterno = items.reduce((sum, item) => sum + item.costoInterno, 0)
  const totalCostoCliente = items.reduce((sum, item) => sum + item.costoCliente, 0)

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const enEdicion = modoEdicion[item.id] || false

        return (
          <div key={item.id} className="border p-2 rounded-md flex justify-between items-start shadow-sm bg-white">
            <div className="w-full grid grid-cols-8 gap-2 text-sm">
              {enEdicion ? (
                <>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-600">Nombre</label>
                    <input
                      type="text"
                      defaultValue={item.nombre}
                      onChange={(e) => actualizarCampo(item.id, 'nombre', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-600">Descripción</label>
                    <input
                      type="text"
                      defaultValue={item.descripcion || ''}
                      onChange={(e) => actualizarCampo(item.id, 'descripcion', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-600">Cantidad</label>
                    <input
                      type="number"
                      defaultValue={item.cantidad}
                      onChange={(e) => actualizarCampo(item.id, 'cantidad', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-600">Precio Unitario (USD)</label>
                    <input
                      type="number"
                      defaultValue={item.precioUnitario}
                      onChange={(e) => actualizarCampo(item.id, 'precioUnitario', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-600">Factor Seguridad</label>
                    <input
                      type="number"
                      defaultValue={item.factorSeguridad}
                      onChange={(e) => actualizarCampo(item.id, 'factorSeguridad', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-600">Margen</label>
                    <input
                      type="number"
                      defaultValue={item.margen}
                      onChange={(e) => actualizarCampo(item.id, 'margen', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <div className="text-xs font-medium text-gray-600 flex items-center justify-center">
                    USD {item.costoInterno.toFixed(2)}
                  </div>
                  <div className="text-xs font-medium text-gray-600 flex items-center justify-center">
                    USD {item.costoCliente.toFixed(2)}
                  </div>
                </>
              ) : (
                <>
                  <div className="truncate">
                    <span className="text-xs font-medium text-gray-600">Nombre: </span>{item.nombre}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-medium text-gray-600">Descripción: </span>{item.descripcion}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Cantidad: </span>{item.cantidad}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">USD: </span>{item.precioUnitario.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">x </span>{item.factorSeguridad}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">+ </span>{item.margen}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Interno: </span>USD {item.costoInterno.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Cliente: </span>USD {item.costoCliente.toFixed(2)}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 ml-4">
              {enEdicion ? (
                <>
                  <button onClick={() => guardarCambios(item.id)}>
                    <Save className="w-5 h-5 text-blue-600" />
                  </button>
                  <button onClick={() => cancelarEdicion(item.id)}>
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => activarEdicion(item.id)}>
                    <Pencil className="w-5 h-5 text-yellow-600" />
                  </button>
                  <button onClick={() => onDelete?.(item.id)}>
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}

      {/* ✅ Resumen total al final */}
      <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm flex justify-between">
        <div className="font-medium">TOTAL Costo Interno:</div>
        <div className="text-blue-600 font-semibold">USD {totalCostoInterno.toFixed(2)}</div>
        <div className="font-medium">TOTAL Costo Cliente:</div>
        <div className="text-green-600 font-semibold">USD {totalCostoCliente.toFixed(2)}</div>
      </div>
    </div>
  )
}
