// ===================================================
// 📁 Archivo: cliente.ts
// 📌 Ubicación: src/lib/services/cliente.ts
// 🔧 Descripción: Servicios para gestión de clientes
// ✅ Funciones para obtener clientes
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { buildApiUrl } from '@/lib/utils'
import type { Cliente } from '@/types/modelos'

// Re-export Cliente type from modelos for consistency
export type { Cliente }

// ✅ Obtener todos los clientes
export async function getClientes(): Promise<Cliente[]> {
  try {
    const response = await fetch(buildApiUrl('/api/clientes'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener clientes: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getClientes:', error)
    throw error
  }
}

// ✅ Obtener cliente por ID
export async function getClienteById(id: string): Promise<Cliente> {
  try {
    // Usar la ruta correcta que ya existe
    const response = await fetch(buildApiUrl(`/api/clientes/${id}`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Cliente no encontrado')
      }
      throw new Error(`Error al obtener cliente: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getClienteById:', error)
    throw error
  }
}

// ✅ Crear nuevo cliente
export async function createCliente(data: Omit<Cliente, 'id'>): Promise<Cliente> {
  try {
    const response = await fetch(buildApiUrl('/api/clientes'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Error al crear cliente: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en createCliente:', error)
    throw error
  }
}

// ✅ Actualizar cliente
export async function updateCliente(id: string, data: Partial<Omit<Cliente, 'id'>>): Promise<Cliente> {
  try {
    const response = await fetch(buildApiUrl(`/api/clientes/${id}`), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Error al actualizar cliente: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en updateCliente:', error)
    throw error
  }
}

// ✅ Eliminar cliente
export async function deleteCliente(id: string): Promise<{ success: boolean; error?: string; details?: string }> {
  try {
    const response = await fetch(buildApiUrl(`/api/clientes/${id}`), {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 400) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.error || 'No se puede eliminar el cliente',
          details: errorData.details
        }
      }
      throw new Error(`Error al eliminar cliente: ${response.statusText}`)
    }

    return { success: true }
  } catch (error) {
    console.error('❌ Error en deleteCliente:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al eliminar cliente'
    }
  }
}
