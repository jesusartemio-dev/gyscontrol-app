// ===================================================
// 📁 Archivo: cliente.ts
// 📌 Ubicación: src/lib/services/cliente.ts
// 🔧 Descripción: Servicios para gestión de clientes
// ✅ Funciones para obtener clientes
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { buildApiUrl } from '@/lib/utils'

// Tipos para clientes
export interface Cliente {
  id: string
  nombre: string
  ruc?: string
  sector?: string
  correo?: string
  telefono?: string
  direccion?: string
}

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
