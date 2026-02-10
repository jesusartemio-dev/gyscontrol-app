// ===================================================
// 📁 Archivo: contactos.ts
// 📌 Ubicación: src/lib/services/crm/contactos.ts
// 🔧 Descripción: Servicios para gestión de contactos de clientes CRM
// ✅ Funciones CRUD para contactos de clientes
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { CrmResponse } from './index'

// Tipos para contactos
export interface CrmContactoCliente {
  id: string
  clienteId: string
  nombre: string
  cargo?: string
  email?: string
  telefono?: string
  celular?: string
  esDecisionMaker: boolean
  areasInfluencia?: string
  relacionComercial?: string
  fechaUltimoContacto?: string
  notas?: string
  createdAt: string
  updatedAt: string
}

export interface CreateContactoData {
  nombre: string
  cargo?: string
  email?: string
  telefono?: string
  celular?: string
  esDecisionMaker?: boolean
  areasInfluencia?: string
  relacionComercial?: string
  notas?: string
}

export interface UpdateContactoData extends Partial<CreateContactoData> {}

// ✅ Obtener contactos de un cliente
export async function getContactosByCliente(clienteId: string): Promise<CrmContactoCliente[]> {
  try {
    const response = await fetch(`/api/crm/clientes/${clienteId}/contactos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error al obtener contactos: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('❌ Error en getContactosByCliente:', error)
    throw error
  }
}

// ✅ Crear nuevo contacto para un cliente
export async function createContacto(clienteId: string, data: CreateContactoData): Promise<CrmContactoCliente> {
  try {
    const response = await fetch(`/api/crm/clientes/${clienteId}/contactos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Error al crear contacto: ${response.statusText}`)
    }

    const contacto = await response.json()
    return contacto
  } catch (error) {
    console.error('❌ Error en createContacto:', error)
    throw error
  }
}

// ✅ Actualizar contacto
export async function updateContacto(clienteId: string, contactoId: string, data: UpdateContactoData): Promise<CrmContactoCliente> {
  try {
    const response = await fetch(`/api/crm/clientes/${clienteId}/contactos/${contactoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Error al actualizar contacto: ${response.statusText}`)
    }

    const contacto = await response.json()
    return contacto
  } catch (error) {
    console.error('❌ Error en updateContacto:', error)
    throw error
  }
}

// ✅ Eliminar contacto
export async function deleteContacto(clienteId: string, contactoId: string): Promise<void> {
  try {
    const response = await fetch(`/api/crm/clientes/${clienteId}/contactos/${contactoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error al eliminar contacto: ${response.statusText}`)
    }
  } catch (error) {
    console.error('❌ Error en deleteContacto:', error)
    throw error
  }
}
