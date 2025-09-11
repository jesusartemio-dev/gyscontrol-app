// ===================================================
// 📁 Archivo: plantillaGastoItem.ts
// 📌 Ubicación: src/lib/services/plantillaGastoItem.ts
// 🔧 Descripción: Funciones para manejar ítems de gasto desde el cliente
//
// 🧠 Uso: Usado en páginas y componentes que gestionan ítems dentro de PlantillaGasto
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-05
// ===================================================

import type {
    PlantillaGastoItem,
    PlantillaGastoItemPayload,
    PlantillaGastoItemUpdatePayload
  } from '@/types'
  
  const BASE_URL = '/api/plantilla-gasto-item'
  
  // ✅ Obtener todos los ítems de gasto
  export async function getPlantillaGastoItems(): Promise<PlantillaGastoItem[]> {
    try {
      const res = await fetch(BASE_URL)
      if (!res.ok) throw new Error('Error al obtener ítems de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return []
    }
  }
  
  // ✅ Obtener ítem por ID
  export async function getPlantillaGastoItemById(id: string): Promise<PlantillaGastoItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`)
      if (!res.ok) throw new Error('Error al obtener ítem de gasto por ID')
      return await res.json()
    } catch (error) {
      console.error(error)
      return null
    }
  }
  
  // ✅ Crear ítem
  export async function createPlantillaGastoItem(payload: PlantillaGastoItemPayload): Promise<PlantillaGastoItem | null> {
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Error al crear ítem de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return null
    }
  }
  
  // ✅ Actualizar ítem
  export async function updatePlantillaGastoItem(id: string, payload: PlantillaGastoItemUpdatePayload): Promise<PlantillaGastoItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Error al actualizar ítem de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return null
    }
  }
  
  // ✅ Eliminar ítem
  export async function deletePlantillaGastoItem(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar ítem de gasto')
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }
  
