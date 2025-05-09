'use client'

import { useState, useEffect } from 'react'
import { createCotizacion } from '@/lib/services/cotizacion'
import { useSession } from 'next-auth/react'
import type { Cotizacion } from '@/types'

interface Cliente {
  id: string
  nombre: string
}

interface Props {
  onCreated: (nueva: Cotizacion) => void
}

export default function CotizacionForm({ onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: session } = useSession()
  const comercialId = session?.user?.id ?? ''

  // ✅ Cargar clientes desde la API real
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch('/api/clientes')
        if (!res.ok) throw new Error('Error al obtener clientes')
        const data = await res.json()
        setClientes(data)
      } catch (err) {
        console.error('❌ Error al cargar clientes:', err)
        setError('No se pudieron cargar los clientes.')
      }
    }

    fetchClientes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    if (!clienteId) {
      setError('Debes seleccionar un cliente.')
      return
    }

    if (!comercialId) {
      setError('Usuario no autenticado.')
      return
    }

    setLoading(true)
    try {
      const nueva = await createCotizacion({ clienteId, comercialId, nombre })
      onCreated(nueva)
      setNombre('')
      setClienteId('')
    } catch (err) {
      console.error('Error al crear cotización:', err)
      setError('Ocurrió un error al crear la cotización.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-w-md">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la cotización"
        className="border px-3 py-2 rounded w-full"
        disabled={loading}
      />

      <select
        value={clienteId}
        onChange={(e) => setClienteId(e.target.value)}
        className="border px-3 py-2 rounded w-full"
        disabled={loading}
      >
        <option value="">Seleccionar cliente</option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.nombre}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Creando...' : '➕ Crear Cotización'}
      </button>
    </form>
  )
}
