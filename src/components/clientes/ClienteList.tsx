'use client'

import { useState } from 'react'
import { deleteCliente } from '@/lib/services/cliente'
import type { Cliente } from '@/types'

interface Props {
  clientes: Cliente[]
  onDelete: (id: string) => void
  onEdit: (cliente: Cliente) => void
}

export default function ClienteList({ clientes, onDelete, onEdit }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setLoadingId(id)
    try {
      await deleteCliente(id)
      onDelete(id)
    } catch (err) {
      alert('Error al eliminar cliente')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border">Nombre</th>
          <th className="p-2 border">RUC</th>
          <th className="p-2 border">Correo</th>
          <th className="p-2 border">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="p-2 border">{c.nombre}</td>
            <td className="p-2 border">{c.ruc || '-'}</td>
            <td className="p-2 border">{c.correo || '-'}</td>
            <td className="p-2 border">
              <button onClick={() => onEdit(c)} className="text-blue-600 mr-2">
                Editar
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                disabled={loadingId === c.id}
                className="text-red-500"
              >
                {loadingId === c.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
