// src/lib/services/categoriaEquipo.ts

import { buildApiUrl } from '@/lib/utils'

export async function getCategoriasEquipo() {
  const res = await fetch(buildApiUrl('/api/categoria-equipo'))
  if (!res.ok) {
    throw new Error('Failed to fetch categorias equipo')
  }
  return res.json()
}

export async function createCategoriaEquipo(data: any) {
  const res = await fetch(buildApiUrl('/api/categoria-equipo'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!res.ok) {
    throw new Error('Failed to create categoria equipo')
  }
  
  return res.json()
}

export async function updateCategoriaEquipo(id: string, data: { nombre: string }) {
  const res = await fetch(`/api/categoria-equipo/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ Error al actualizar categoría de equipo:', errorText)
    throw new Error('Error al actualizar categoría de equipo: ' + errorText)
  }

  return res.json()
}

export async function deleteCategoriaEquipo(id: string) {
  const res = await fetch(`/api/categoria-equipo/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ Error al eliminar categoría de equipo:', errorText)
    throw new Error('Error al eliminar categoría de equipo: ' + errorText)
  }

  return res.json()
}
