// ===================================================
// 📁 Archivo: listaEquipo.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para la entidad ListaEquipo
// 🧠 Uso: Consumido por formularios, páginas y componentes (proyecto y logística)
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

import { ListaEquipo, ListaEquipoPayload, ListaEquipoUpdatePayload } from '@/types'

const BASE_URL = '/api/lista-equipo'

// ✅ Obtener todas las listas técnicas (modo logística, trae todo)
export async function getTodasLasListas(): Promise<ListaEquipo[]> {
  try {
    const res = await fetch(`${BASE_URL}/all`)
    if (!res.ok) throw new Error('Error al obtener todas las listas técnicas')
    return await res.json()
  } catch (error) {
    console.error('getTodasLasListas:', error)
    return []
  }
}

// ✅ Obtener listas técnicas filtradas por proyecto
export async function getListaEquiposPorProyecto(proyectoId: string): Promise<ListaEquipo[]> {
  try {
    const res = await fetch(`${BASE_URL}?proyectoId=${proyectoId}`)
    if (!res.ok) throw new Error('Error al obtener listas por proyecto')
    return await res.json()
  } catch (error) {
    console.error('getListaEquiposPorProyecto:', error)
    return []
  }
}

// ✅ Obtener una lista técnica por ID específico
export async function getListaEquipoById(id: string): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('getListaEquipoById:', error)
    return null
  }
}

// ✅ Crear una nueva lista técnica
export async function createListaEquipo(payload: ListaEquipoPayload): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('createListaEquipo:', error)
    return null
  }
}

// ✅ Actualizar lista técnica (PUT por id)
export async function updateListaEquipo(id: string, payload: ListaEquipoUpdatePayload): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('updateListaEquipo:', error)
    return null
  }
}

// ✅ Eliminar lista técnica
export async function deleteListaEquipo(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('deleteListaEquipo:', error)
    return false
  }
}

// ✅ Crear lista automáticamente desde equipos cotizados (solo para logística)
export async function createListaDesdeEquiposCotizados(proyectoId: string): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/from-proyecto/${proyectoId}`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Error al crear lista desde equipos cotizados')
    return await res.json()
  } catch (error) {
    console.error('createListaDesdeEquiposCotizados:', error)
    return null
  }
}

// ✅ Enviar lista a revisión técnica
export async function enviarListaARevision(listaId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/enviar/${listaId}`, {
      method: 'POST',
    })
    return res.ok
  } catch (error) {
    console.error('enviarListaARevision:', error)
    return false
  }
}

// ✅ Cambiar estado de la lista técnica (solo estado, no todo el objeto)
export async function updateListaEstado(id: string, nuevoEstado: string): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (!res.ok) throw new Error('Error al cambiar estado de la lista')
    return await res.json()
  } catch (error) {
    console.error('updateListaEstado:', error)
    return null
  }
}
