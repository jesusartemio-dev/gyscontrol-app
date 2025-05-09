// ===================================================
// 📁 Archivo: CotizacionServicioForm.tsx
// 📌 Ubicación: src/components/cotizaciones/CotizacionServicioForm.tsx
// 🔧 Descripción: Formulario para crear nuevas secciones de servicios en una cotización
// 🧠 Uso: Se usa dentro del detalle de cotización para añadir grupos de servicios
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

'use client'

import { useState } from 'react'
import { createCotizacionServicio } from '@/lib/services/cotizacionServicio'
import type { CotizacionServicio } from '@/types'

interface Props {
  cotizacionId: string
  onCreated: (nuevo: CotizacionServicio) => void
}

export default function CotizacionServicioForm({ cotizacionId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    setLoading(true)
    try {
      const nuevo = await createCotizacionServicio({
        cotizacionId,
        categoria: nombre.trim(),
        subtotalInterno: 0,
        subtotalCliente: 0
      })
      onCreated(nuevo)
      setNombre('')
      setError(null)
    } catch (err) {
      setError('Error al crear grupo de servicios.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del grupo de servicios"
        className="flex-1 border px-3 py-2 rounded text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creando...' : '➕ Añadir'}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </form>
  )
}
