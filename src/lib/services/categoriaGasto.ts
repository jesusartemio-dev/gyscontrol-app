// src/lib/services/categoriaGasto.ts

import { buildApiUrl } from '@/lib/utils'
import type { CategoriaGasto, CategoriaGastoPayload } from '@/types'

export async function getCategoriasGasto(): Promise<CategoriaGasto[]> {
  const res = await fetch(buildApiUrl('/api/categoria-gasto'))
  if (!res.ok) {
    throw new Error('Failed to fetch categorias gasto')
  }
  return res.json()
}

export async function getCategoriaGastoById(id: string): Promise<CategoriaGasto> {
  const res = await fetch(buildApiUrl(`/api/categoria-gasto/${id}`))
  if (!res.ok) {
    throw new Error('Failed to fetch categoria gasto')
  }
  return res.json()
}

export async function createCategoriaGasto(data: CategoriaGastoPayload): Promise<CategoriaGasto> {
  const res = await fetch(buildApiUrl('/api/categoria-gasto'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Failed to create categoria gasto: ${errorData.error || res.statusText}`)
  }

  return res.json()
}

export async function updateCategoriaGasto(id: string, data: CategoriaGastoPayload): Promise<CategoriaGasto> {
  const res = await fetch(buildApiUrl(`/api/categoria-gasto/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error('Error al actualizar categoría de gasto: ' + errorText)
  }

  return res.json()
}

export async function deleteCategoriaGasto(id: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/categoria-gasto/${id}`), {
    method: 'DELETE',
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error('Error al eliminar categoría de gasto: ' + errorText)
  }
}
