'use client'

export interface Cargo {
  id: string
  nombre: string
  descripcion?: string
  sueldoBase?: number
  activo: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    empleados: number
  }
}

export interface CargoPayload {
  nombre: string
  descripcion?: string
  sueldoBase?: number
  activo?: boolean
}

const BASE_URL = '/api/cargo'

export async function getCargos(): Promise<Cargo[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Error al listar cargos')
  return res.json()
}

export async function getCargo(id: string): Promise<Cargo> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) throw new Error('Error al obtener cargo')
  return res.json()
}

export async function createCargo(payload: CargoPayload): Promise<Cargo> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear cargo')
  }
  return res.json()
}

export async function updateCargo(id: string, payload: Partial<CargoPayload>): Promise<Cargo> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar cargo')
  }
  return res.json()
}

export async function deleteCargo(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al eliminar cargo')
  }
}
