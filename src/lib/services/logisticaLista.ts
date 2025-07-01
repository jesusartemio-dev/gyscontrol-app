// ===================================================
// 📁 Archivo: logisticaLista.ts
// 📌 Descripción: Servicios específicos para logística (listas técnicas)
// 🧠 Uso: Consumido por frontend de logística
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

import { ListaEquipo } from '@/types'

const BASE_URL = '/api/logistica/listas'

// ✅ Obtener todas las listas técnicas relevantes para logística
export async function getLogisticaListas(): Promise<ListaEquipo[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener listas logísticas')
    return await res.json()
  } catch (error) {
    console.error('getLogisticaListas:', error)
    return []
  }
}

// ✅ Obtener una lista técnica logística por ID
export async function getLogisticaListaById(id: string): Promise<ListaEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener detalle de lista logística')
    return await res.json()
  } catch (error) {
    console.error('getLogisticaListaById:', error)
    return null
  }
}
