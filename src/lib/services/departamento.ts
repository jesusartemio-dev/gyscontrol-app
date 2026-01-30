'use client'

export interface Departamento {
  id: string
  nombre: string
  descripcion?: string
  responsableId?: string
  activo: boolean
  createdAt: string
  updatedAt: string
  responsable?: {
    id: string
    name: string | null
    email: string
  }
  _count?: {
    cargos: number
  }
}

export interface DepartamentoPayload {
  nombre: string
  descripcion?: string
  responsableId?: string
  activo?: boolean
}

const BASE_URL = '/api/departamento'

export async function getDepartamentos(): Promise<Departamento[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Error al listar departamentos')
  return res.json()
}

export async function getDepartamento(id: string): Promise<Departamento> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) throw new Error('Error al obtener departamento')
  return res.json()
}

export async function createDepartamento(payload: DepartamentoPayload): Promise<Departamento> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear departamento')
  }
  return res.json()
}

export async function updateDepartamento(id: string, payload: Partial<DepartamentoPayload>): Promise<Departamento> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar departamento')
  }
  return res.json()
}

export async function deleteDepartamento(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al eliminar departamento')
  }
}
