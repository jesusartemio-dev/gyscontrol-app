// ===================================================
// 📁 Archivo: CotizacionGastoItemList.tsx
// 📌 Ubicación: src/components/cotizaciones/CotizacionGastoItemList.tsx
// 🔧 Descripción: Lista editable de ítems de gasto dentro de una cotización
//
// 🧠 Uso: Renderiza y permite editar/eliminar ítems de gasto por sección
// ✍️ Autor: Adaptado por GYS AI Assistant
// 📅 Última actualización: 2025-05-06
// ===================================================

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

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const enEdicion = modoEdicion[item.id] || false

        return (
          <div key={item.id} className="border p-2 rounded-md flex justify-between items-center shadow-sm bg-white">
            <div className="w-full grid grid-cols-6 gap-2 text-sm">
              {enEdicion ? (
                <>
                  <input
                    type="text"
                    defaultValue={item.nombre}
                    onChange={(e) => actualizarCampo(item.id, 'nombre', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    defaultValue={item.descripcion || ''}
                    onChange={(e) => actualizarCampo(item.id, 'descripcion', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    defaultValue={item.cantidad}
                    onChange={(e) => actualizarCampo(item.id, 'cantidad', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    defaultValue={item.precioUnitario}
                    onChange={(e) => actualizarCampo(item.id, 'precioUnitario', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    defaultValue={item.factorSeguridad}
                    onChange={(e) => actualizarCampo(item.id, 'factorSeguridad', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    defaultValue={item.margen}
                    onChange={(e) => actualizarCampo(item.id, 'margen', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                </>
              ) : (
                <>
                  <div className="truncate">{item.nombre}</div>
                  <div className="truncate">{item.descripcion}</div>
                  <div>{item.cantidad}</div>
                  <div>S/. {item.precioUnitario.toFixed(2)}</div>
                  <div>x{item.factorSeguridad}</div>
                  <div>+{item.margen}</div>
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
    </div>
  )
}
