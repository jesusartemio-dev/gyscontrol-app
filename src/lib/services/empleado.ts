'use client'

import type { Empleado } from '@/types'

const BASE_URL = '/api/empleado'

export interface EmpleadoPayload {
  userId: string
  cargoId?: string
  departamentoId?: string
  sueldoPlanilla?: number
  sueldoHonorarios?: number
  asignacionFamiliar?: number
  emo?: number
  fechaIngreso?: string
  fechaCese?: string
  activo?: boolean
  documentoIdentidad?: string
  telefono?: string
  direccion?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  observaciones?: string
}

export async function getEmpleados(): Promise<Empleado[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Error al listar empleados')
  return res.json()
}

export async function getEmpleado(id: string): Promise<Empleado> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) throw new Error('Error al obtener empleado')
  return res.json()
}

export async function getEmpleadoByUserId(userId: string): Promise<Empleado | null> {
  const res = await fetch(`${BASE_URL}?userId=${userId}`)
  if (!res.ok) throw new Error('Error al obtener empleado')
  const empleados = await res.json()
  return empleados.length > 0 ? empleados[0] : null
}

export async function createEmpleado(payload: EmpleadoPayload): Promise<Empleado> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear empleado')
  }
  return res.json()
}

export async function updateEmpleado(id: string, payload: Partial<EmpleadoPayload>): Promise<Empleado> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar empleado')
  }
  return res.json()
}

export async function deleteEmpleado(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Error al eliminar empleado')
}
