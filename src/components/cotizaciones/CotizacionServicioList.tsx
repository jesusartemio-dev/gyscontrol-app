// ===================================================
// 📁 Archivo: CotizacionServicioList.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Muestra lista de secciones de servicios en cotización
//
// 🧠 Uso: Se muestra debajo del formulario de creación de servicios
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

'use client'

import { useState } from 'react'
import {
  deleteCotizacionServicio,
  updateCotizacionServicio
} from '@/lib/services/cotizacionServicio'
import type { CotizacionServicio } from '@/types'

interface Props {
  servicios: CotizacionServicio[]
  cotizacionId: string
  onDeleted: (id: string) => void
  onUpdated: (actualizado: CotizacionServicio) => void
}

export default function CotizacionServicioList({
  servicios,
  cotizacionId,
  onDeleted,
  onUpdated
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const handleEdit = async (id: string, value: string) => {
    if (!value.trim()) {
      setError('El nombre no puede estar vacío.')
      return
    }

    try {
      setError(null)
      setLoading(id)
      const actualizado = await updateCotizacionServicio(id, { categoria: value })
      onUpdated(actualizado)
    } catch {
      setError('Error al actualizar la sección.')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      setLoading(id)
      await deleteCotizacionServicio(id)
      onDeleted(id)
    } catch {
      setError('Error al eliminar la sección.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {error && <p className="text-red-500">{error}</p>}

      <table className="w-full border mt-4 text-sm">
        <thead>
          <tr>
            <th className="border px-4 py-2">Categoría</th>
            <th className="border px-4 py-2">Subtotal Cliente</th>
            <th className="border px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((s) => (
            <tr key={s.id}>
              <td
                className="border px-4 py-2"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent?.trim() || ''
                  if (value !== s.categoria) {
                    handleEdit(s.id, value)
                  }
                }}
              >
                {loading === s.id ? 'Actualizando...' : s.categoria}
              </td>
              <td className="border px-4 py-2">S/ {s.subtotalCliente.toFixed(2)}</td>
              <td className="border px-4 py-2 space-x-2">
                <a
                  href={`/comercial/cotizaciones/${cotizacionId}/servicio/${s.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver Ítems
                </a>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-red-600"
                  disabled={loading === s.id}
                >
                  {loading === s.id ? 'Eliminando...' : '❌'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
