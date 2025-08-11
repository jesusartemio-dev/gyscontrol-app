// ===================================================
// 📁 Archivo: listaEquipoItem.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para los ítems de la ListaEquipo
// 🧠 Uso: Consumido por formularios, listas y vistas de detalle
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-06-09
// ===================================================

import {
  ListaEquipoItem,
  ListaEquipoItemPayload,
  ListaEquipoItemUpdatePayload,
} from '@/types'

const BASE_URL = '/api/lista-equipo-item'

// ✅ Obtener todos los ítems (opcionalmente por proyectoId)
export async function getListaEquipoItems(params?: { proyectoId?: string }): Promise<ListaEquipoItem[]> {
  try {
    let url = BASE_URL
    if (params?.proyectoId) url += `?proyectoId=${params.proyectoId}`

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener ítems de lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ getListaEquipoItems:', error)
    return []
  }
}

// ✅ Obtener ítem por ID
export async function getListaEquipoItemById(id: string): Promise<ListaEquipoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener ítem de lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ getListaEquipoItemById:', error)
    return null
  }
}

// ✅ Crear ítem manual
export async function createListaEquipoItem(payload: ListaEquipoItemPayload): Promise<ListaEquipoItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem')
    return await res.json()
  } catch (error) {
    console.error('❌ createListaEquipoItem:', error)
    return null
  }
}

// ✅ Actualizar ítem
export async function updateListaEquipoItem(
  id: string,
  payload: ListaEquipoItemUpdatePayload
): Promise<ListaEquipoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem')
    return await res.json()
  } catch (error) {
    console.error('❌ updateListaEquipoItem:', error)
    return null
  }
}

// ✅ Eliminar ítem
export async function deleteListaEquipoItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('❌ deleteListaEquipoItem:', error)
    return false
  }
}

// 🔁 Crear ítem desde ProyectoEquipoItem
export async function createListaEquipoItemFromProyecto(listaId: string, proyectoEquipoItemId: string): Promise<void> {
  try {
    const res = await fetch(`/api/lista-equipo/item-from-proyecto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listaId, proyectoEquipoItemId }),
    })
    if (!res.ok) throw new Error('Error al crear ítem desde ProyectoEquipoItem')
  } catch (error) {
    console.error('❌ createListaEquipoItemFromProyecto:', error)
    throw error
  }
}

// ❌ Eliminar ítem por proyectoEquipoItemId
export async function deleteListaEquipoItemByProyectoItemId(proyectoEquipoItemId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/by-proyecto/${proyectoEquipoItemId}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('❌ deleteListaEquipoItemByProyectoItemId:', error)
    return false
  }
}

// ✅ Obtener ítems de un proyecto específicos aún disponibles
export async function getListaEquipoItemsByProyecto(proyectoId: string): Promise<ListaEquipoItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/disponibles/${proyectoId}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener ítems del proyecto')
    return await res.json()
  } catch (error) {
    console.error('❌ getListaEquipoItemsByProyecto:', error)
    return []
  }
}

// ✅ Obtener ítems por lista específica
export async function getListaEquipoItemsByLista(listaId: string): Promise<ListaEquipoItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/by-lista/${listaId}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener ítems de la lista')
    return await res.json()
  } catch (error) {
    console.error('❌ getListaEquipoItemsByLista:', error)
    return []
  }
}

// ✅ Seleccionar cotización ganadora (vía cotizaciónProveedorItemId)
export async function seleccionarCotizacionGanadora(itemId: string, cotizacionProveedorItemId: string) {
  try {
    const res = await fetch(`${BASE_URL}/${itemId}/seleccionar-cotizacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacionProveedorItemId }),
    })
    if (!res.ok) throw new Error('Error al seleccionar cotización ganadora')
    return await res.json()
  } catch (error) {
    console.error('❌ seleccionarCotizacionGanadora:', error)
    throw error
  }
}

// 🧪 Versión legacy (mantener por compatibilidad)
export async function seleccionarCotizacion(listaEquipoItemId: string, cotizacionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/lista-equipo-item/seleccionar-cotizacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listaEquipoItemId, cotizacionId }),
    })
    return res.ok
  } catch (error) {
    console.error('❌ seleccionarCotizacion:', error)
    return false
  }
}

export async function reemplazarItemLista(id: string, data: Partial<ListaEquipoItem>) {
  const res = await fetch(`/api/lista-equipo-item/${id}/reemplazar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    throw new Error('Error al reemplazar ítem de lista')
  }

  return res.json()
}
