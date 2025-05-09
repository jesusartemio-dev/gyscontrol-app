'use client'

import { useState } from 'react'
import { createCliente, updateCliente } from '@/lib/services/cliente'
import type { Cliente } from '@/types'

interface Props {
  onSaved: (cliente: Cliente) => void
  initial?: Cliente | null
}

export default function ClienteForm({ onSaved, initial }: Props) {
  const [form, setForm] = useState<Partial<Cliente>>(initial || {})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const cliente = form.id
        ? await updateCliente(form as Cliente)
        : await createCliente(form)
      onSaved(cliente)
      setForm({})
    } catch (err) {
      setError('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-w-lg">
      {error && <p className="text-red-500">{error}</p>}

      <input
        name="nombre"
        placeholder="Nombre"
        className="border px-3 py-2 rounded w-full"
        value={form.nombre || ''}
        onChange={handleChange}
      />
      <input
        name="ruc"
        placeholder="RUC"
        className="border px-3 py-2 rounded w-full"
        value={form.ruc || ''}
        onChange={handleChange}
      />
      <input
        name="direccion"
        placeholder="Dirección"
        className="border px-3 py-2 rounded w-full"
        value={form.direccion || ''}
        onChange={handleChange}
      />
      <input
        name="telefono"
        placeholder="Teléfono"
        className="border px-3 py-2 rounded w-full"
        value={form.telefono || ''}
        onChange={handleChange}
      />
      <input
        name="correo"
        placeholder="Correo"
        className="border px-3 py-2 rounded w-full"
        value={form.correo || ''}
        onChange={handleChange}
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Guardando...' : form.id ? 'Actualizar' : 'Crear'}
      </button>
    </form>
  )
}
