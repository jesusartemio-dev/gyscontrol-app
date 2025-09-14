import { Cliente } from '@/types'
import { buildApiUrl } from '@/lib/utils'

export async function getClientes(): Promise<Cliente[]> {
  const res = await fetch(buildApiUrl('/api/clientes'), { cache: 'no-store' })
  if (!res.ok) throw new Error('Error al obtener clientes')
  return res.json()
}

export async function createCliente(data: Partial<Cliente>): Promise<Cliente> {
  const res = await fetch(buildApiUrl('/api/clientes'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear cliente')
  return res.json()
}

export async function updateCliente(data: Cliente): Promise<Cliente> {
  const res = await fetch(buildApiUrl('/api/clientes'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al actualizar cliente')
  return res.json()
}

export async function deleteCliente(id: string): Promise<{ success: boolean; error?: string; details?: string }> {
  try {
    const res = await fetch(buildApiUrl('/api/clientes'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
      
      // 🚫 Retornar error específico sin lanzar excepción
      if (res.status === 400 && errorData.error?.includes('proyectos asociados')) {
        return {
          success: false,
          error: errorData.error,
          details: errorData.details || 'Para eliminar este cliente, primero debe finalizar o reasignar sus proyectos.'
        }
      }
      
      if (res.status === 404) {
        return {
          success: false,
          error: 'Cliente no encontrado'
        }
      }
      
      return {
        success: false,
        error: errorData.error || 'Error al eliminar cliente'
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error en deleteCliente:', error)
    return {
      success: false,
      error: 'Error de conexión al eliminar cliente'
    }
  }
}
