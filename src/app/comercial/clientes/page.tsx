'use client'

import { useEffect, useState } from 'react'
import { getClientes } from '@/lib/services/cliente'
import ClienteForm from '@/components/clientes/ClienteForm'
import ClienteList from '@/components/clientes/ClienteList'
import type { Cliente } from '@/types'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [editando, setEditando] = useState<Cliente | null>(null)

  useEffect(() => {
    getClientes().then(setClientes).catch(() => alert('Error al cargar clientes'))
  }, [])

  const handleSaved = (cliente: Cliente) => {
    if (editando) {
      setClientes(clientes.map(c => c.id === cliente.id ? cliente : c))
    } else {
      setClientes([...clientes, cliente])
    }
    setEditando(null)
  }

  const handleDelete = (id: string) => {
    setClientes(clientes.filter(c => c.id !== id))
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">👥 Gestión de Clientes</h1>

      <ClienteForm onSaved={handleSaved} initial={editando} />

      <ClienteList clientes={clientes} onDelete={handleDelete} onEdit={setEditando} />
    </div>
  )
}
