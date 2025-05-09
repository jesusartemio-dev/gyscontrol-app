import { Cliente } from '@/types'

export async function getClientes(): Promise<Cliente[]> {
  const res = await fetch('/api/clientes', { cache: 'no-store' })
  if (!res.ok) throw new Error('Error al obtener clientes')
  return res.json()
}

export async function createCliente(data: Partial<Cliente>): Promise<Cliente> {
  const res = await fetch('/api/clientes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear cliente')
  return res.json()
}

export async function updateCliente(data: Cliente): Promise<Cliente> {
  const res = await fetch('/api/clientes', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al actualizar cliente')
  return res.json()
}

export async function deleteCliente(id: string): Promise<void> {
  const res = await fetch('/api/clientes', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error('Error al eliminar cliente')
}
