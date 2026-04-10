// src/lib/services/categoriaEquipo.ts

import { buildApiUrl } from '@/lib/utils'

export async function getCategoriasEquipo() {
  const res = await fetch(buildApiUrl('/api/categoria-equipo'))
  if (!res.ok) {
    throw new Error('Failed to fetch categorias equipo')
  }
  return res.json()
}

export async function createCategoriaEquipo(data: { nombre: string; descripcion?: string | null }) {
  console.log('🔹 Creating categoria equipo:', data)
  
  const res = await fetch(buildApiUrl('/api/categoria-equipo'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
    console.error('❌ Error creating categoria equipo:', res.status, errorData)
    throw new Error(`Failed to create categoria equipo: ${errorData.error || res.statusText}`)
  }
  
  const result = await res.json()
  console.log('✅ Categoria equipo created:', result)
  return result
}

export async function updateCategoriaEquipo(id: string, data: { nombre: string; descripcion?: string | null }) {
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

export async function deleteCategoriaEquipo(id: string): Promise<{ ok: true } | { error: string; equiposEnUso?: any[] }> {
  const res = await fetch(`/api/categoria-equipo/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('❌ Error al eliminar categoría de equipo:', body)
    return { error: body.error || 'Error al eliminar', equiposEnUso: body.equiposEnUso }
  }

  return { ok: true }
}
