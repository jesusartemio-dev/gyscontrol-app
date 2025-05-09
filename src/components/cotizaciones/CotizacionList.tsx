'use client'

import Link from 'next/link'
import { useState } from 'react'
import { deleteCotizacion, updateCotizacion } from '@/lib/services/cotizacion'
import type { Cotizacion } from '@/types'

interface Props {
  cotizaciones: Cotizacion[]
  onDelete: (id: string) => void
  onUpdated: (actualizado: Cotizacion) => void
}

export default function CotizacionList({ cotizaciones, onDelete, onUpdated }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleEdit = async (id: string, field: string, value: string) => {
    if (!value.trim()) return
    setError(null)
    setLoadingId(id)
    try {
      const actualizado = await updateCotizacion(id, { [field]: value })
      onUpdated(actualizado)
    } catch (err) {
      console.error(err)
      setError('Error al actualizar la cotización.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    setLoadingId(id)
    try {
      await deleteCotizacion(id)
      onDelete(id)
    } catch {
      setError('Error al eliminar la cotización.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <table className="w-full border mt-4 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2 text-left">Nombre</th>
            <th className="border px-4 py-2 text-left">Cliente</th>
            <th className="border px-4 py-2 text-right">Total Cliente</th>
            <th className="border px-4 py-2 text-right">Total Interno</th>
            <th className="border px-4 py-2 text-center">Estado</th>
            <th className="border px-4 py-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cotizaciones.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td
                className="border px-4 py-2"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent?.trim() || ''
                  if (value && value !== c.nombre) {
                    handleEdit(c.id, 'nombre', value)
                  }
                }}
              >
                {loadingId === c.id ? 'Guardando...' : c.nombre}
              </td>
              <td className="border px-4 py-2">{c.cliente?.nombre ?? '-'}</td>
              <td className="border px-4 py-2 text-right">S/ {c.totalCliente.toFixed(2)}</td>
              <td className="border px-4 py-2 text-right">S/ {c.totalInterno.toFixed(2)}</td>
              <td className="border px-4 py-2 text-center">
                <span className="inline-block rounded bg-gray-200 px-2 py-1 text-xs">
                  {c.estado ?? 'borrador'}
                </span>
              </td>
              <td className="border px-4 py-2 text-center space-x-2">
                <Link
                  href={`/comercial/cotizaciones/${c.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver
                </Link>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={loadingId === c.id}
                  className="text-red-600 hover:underline"
                >
                  {loadingId === c.id ? 'Eliminando...' : '❌'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
