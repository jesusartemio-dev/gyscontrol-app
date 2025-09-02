// ===================================================
// 📁 Archivo: proyectoEquipo.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para ProyectoEquipo (grupos técnicos) e ítems
// ===================================================

import type { ProyectoEquipo, ProyectoEquipoItem } from '@/types'

const BASE_URL = '/api/proyecto-equipo'
const ITEM_URL = '/api/proyecto-equipo-item'

// ✅ Obtener grupos de equipos por proyecto (secciones técnicas)
export async function getProyectoEquipos(proyectoId: string): Promise<ProyectoEquipo[]> {
  try {
    // ✅ Use absolute URL for server-side requests
    const baseUrl = typeof window === 'undefined' 
      ? process.env.NEXTAUTH_URL || 'http://localhost:3000'
      : ''
    const url = `${baseUrl}${BASE_URL}/from-proyecto/${proyectoId}`
    console.log('🚀 Llamando a URL:', url) // 👈 NUEVO LOG
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener grupos de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipos:', error)
    return []
  }
}


// ✅ Obtener todos los ítems de equipos del proyecto
export async function getProyectoEquipoItems(proyectoId: string): Promise<ProyectoEquipoItem[]> {
  try {
    const res = await fetch(`${ITEM_URL}?proyectoId=${proyectoId}`)
    if (!res.ok) throw new Error('Error al obtener ítems de equipos del proyecto')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipoItems:', error)
    return []
  }
}
