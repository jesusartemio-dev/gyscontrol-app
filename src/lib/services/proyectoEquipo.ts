// ===================================================
// 📁 Archivo: proyectoEquipo.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para ProyectoEquipo (grupos técnicos) e ítems
// ===================================================

import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@/types'
import { buildApiUrl } from '@/lib/utils'

const BASE_URL = '/api/proyecto-equipo'
const ITEM_URL = '/api/proyecto-equipo-item'

async function getServerCookies(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      const { headers } = await import('next/headers')
      const headersList = await headers()
      return headersList.get('cookie')
    }
    return null
  } catch {
    return null
  }
}

// ✅ Obtener grupos de equipos por proyecto (secciones técnicas)
export async function getProyectoEquipos(proyectoId: string): Promise<ProyectoEquipoCotizado[]> {
  try {
    const url = buildApiUrl(`${BASE_URL}/from-proyecto/${proyectoId}`)
    const cookie = await getServerCookies()
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: cookie }),
      },
      cache: 'no-store',
    })
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
    const cookie = await getServerCookies()
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: cookie }),
      },
      cache: 'no-store',
    })
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
    const url = buildApiUrl(`${ITEM_URL}?proyectoId=${proyectoId}`)
    const cookie = await getServerCookies()
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: cookie }),
      },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Error al obtener ítems de equipos del proyecto')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipoItems:', error)
    return []
  }
}
