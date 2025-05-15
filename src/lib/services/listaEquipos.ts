// ===================================================
// 📁 Archivo: listaEquipos.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para la entidad ListaEquipos
// ===================================================

import { ListaEquipos, ListaEquiposPayload } from '@/types'

const BASE_URL = '/api/lista-equipos'

export async function getListaEquipos(proyectoId: string): Promise<ListaEquipos[]> {
  try {
    const res = await fetch(`${BASE_URL}?proyectoId=${proyectoId}`)
    if (!res.ok) throw new Error('Error al obtener listas técnicas')
    return await res.json()
  } catch (error) {
    console.error('getListaEquipos:', error)
    return []
  }
}


export async function getListaEquiposById(id: string): Promise<ListaEquipos | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener lista de equipos')
    return res.json()
  } catch (error) {
    console.error('getListaEquiposById:', error)
    return null
  }
}

export async function createListaEquipos(payload: ListaEquiposPayload): Promise<ListaEquipos | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear lista de equipos')
    return res.json()
  } catch (error) {
    console.error('createListaEquipos:', error)
    return null
  }
}

export async function updateListaEquipos(id: string, payload: Partial<ListaEquiposPayload>): Promise<ListaEquipos | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar lista de equipos')
    return res.json()
  } catch (error) {
    console.error('updateListaEquipos:', error)
    return null
  }
}

export async function deleteListaEquipos(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('deleteListaEquipos:', error)
    return false
  }
}

export async function syncDatosRealesDesdeListas(proyectoId: string): Promise<void> {
  const res = await fetch(`/api/lista-equipos/sync-reales/${proyectoId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Error al sincronizar datos reales desde listas')
}

// ✅ Crear lista a partir de equipos técnicos cotizados
export async function createListaDesdeEquiposCotizados(proyectoId: string): Promise<ListaEquipos | null> {
  try {
    const res = await fetch(`/api/lista-equipos/from-proyecto/${proyectoId}`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Error al crear lista desde equipos técnicos')
    return await res.json()
  } catch (error) {
    console.error('createListaDesdeEquiposCotizados:', error)
    return null
  }
}
