// ===================================================
// 📁 Archivo: CotizacionGastoList.tsx
// 📌 Ubicación: src/components/cotizaciones/CotizacionGastoList.tsx
// 🔧 Descripción: Lista de grupos de gasto de cotización con edición inline
//
// 🧠 Uso: Se usa dentro de una página de cotización para mostrar secciones de gasto
// ✍️ Autor: Adaptado por GYS AI Assistant
// 📅 Última actualización: 2025-05-06
// ===================================================

'use client'

import type { CotizacionGasto } from '@/types'
import { useState } from 'react'
import { Pencil, Trash, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data: CotizacionGasto[]
  onDelete: (id: string) => void
  onUpdate: (id: string, payload: Partial<CotizacionGasto>) => void
}

export default function CotizacionGastoList({ data, onDelete, onUpdate }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState<string>('')

  const comenzarEdicion = (id: string, nombre: string) => {
    setEditandoId(id)
    setNuevoNombre(nombre)
  }

  const cancelar = () => {
    setEditandoId(null)
    setNuevoNombre('')
  }

  const guardar = (id: string) => {
    if (!nuevoNombre.trim()) {
      toast.error('El nombre no puede estar vacío')
      return
    }
    onUpdate(id, { nombre: nuevoNombre.trim() })
    cancelar()
  }

  return (
    <ul className="space-y-2">
      {data.map(gasto => (
        <li
          key={gasto.id}
          className="flex items-center justify-between px-4 py-2 bg-gray-50 border rounded"
        >
          {editandoId === gasto.id ? (
            <input
              className="flex-1 border p-1 rounded mr-2"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              autoFocus
            />
          ) : (
            <span className="flex-1 font-medium">{gasto.nombre}</span>
          )}

          <div className="flex gap-2 items-center">
            {editandoId === gasto.id ? (
              <>
                <button onClick={() => guardar(gasto.id)} className="text-blue-600" title="Guardar">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={cancelar} className="text-gray-600" title="Cancelar">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => comenzarEdicion(gasto.id, gasto.nombre)}
                  className="text-yellow-600"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(gasto.id)}
                  className="text-red-600"
                  title="Eliminar"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
