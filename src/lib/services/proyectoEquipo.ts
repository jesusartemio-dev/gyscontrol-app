// ===================================================
// 📁 Archivo: proyectoEquipo.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para ProyectoEquipo (grupos técnicos) e ítems
// ===================================================

import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@/types'
import { buildApiUrl } from '@/lib/utils'

const BASE_URL = '/api/proyecto-equipo'
const ITEM_URL = '/api/proyecto-equipo-item'

// ✅ Obtener grupos de equipos por proyecto (secciones técnicas)
export async function getProyectoEquipos(proyectoId: string): Promise<ProyectoEquipoCotizado[]> {
  try {
    const url = buildApiUrl(`${BASE_URL}/from-proyecto/${proyectoId}`)
    console.log('🚀 Llamando a URL:', url) // 👈 NUEVO LOG
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener grupos de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipos:', error)
    return []
  }
}


// ✅ Obtener un grupo de equipo por ID
export async function getProyectoEquipoById(equipoId: string): Promise<ProyectoEquipoCotizado | null> {
  try {
    const url = buildApiUrl(`${BASE_URL}/${equipoId}`)
    console.log('🚀 Llamando a URL:', url) // 👈 NUEVO LOG
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener grupo de equipo')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipoById:', error)
    return null
  }
}

// ✅ Obtener todos los ítems de equipos del proyecto
export async function getProyectoEquipoItems(proyectoId: string): Promise<ProyectoEquipoCotizadoItem[]> {
  try {
    const res = await fetch(`${ITEM_URL}?proyectoId=${proyectoId}`)
    if (!res.ok) throw new Error('Error al obtener ítems de equipos del proyecto')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipoItems:', error)
    return []
  }
}
