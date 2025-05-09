// ===================================================
// 📁 Archivo: ClienteSelector.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Selector de cliente reutilizable con soporte para callback
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getClientes } from '@/lib/services/cliente'
import type { Cliente } from '@/types'

interface ClienteSelectorProps {
  selectedId?: string
  onChange: (clienteId: string) => void
}

export default function ClienteSelector({ selectedId, onChange }: ClienteSelectorProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClientes()
      .then(data => setClientes(data))
      .catch(err => console.error('❌ Error al cargar clientes:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Cargando clientes...</p>

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">Seleccionar Cliente</label>
      <select
        className="w-full border px-3 py-2 rounded"
        value={selectedId || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- Selecciona un cliente --</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
    </div>
  )
}
