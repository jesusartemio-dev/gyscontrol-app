import { buildApiUrl } from '@/lib/utils'
import type { CatalogoEquipo, CatalogoEquipoPayload } from '@/types'

export type Vista = 'admin' | 'comercial' | 'logistica' | 'proyectos'

export interface VistaConfig {
  columnas: string[]
  permisos: {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canImport: boolean
    canExport: boolean
  }
}

export async function getVistaConfig(vista: Vista): Promise<VistaConfig> {
  const res = await fetch(buildApiUrl('/api/configuracion/catalogo-columnas'))
  if (!res.ok) throw new Error('Error al obtener configuración de vista')
  const data = await res.json()
  return data[vista]
}

export async function getCatalogoEquiposVista(vista: Vista): Promise<Partial<CatalogoEquipo>[]> {
  const res = await fetch(buildApiUrl(`/api/catalogo-equipo?vista=${vista}`))
  if (!res.ok) throw new Error('Error al obtener equipos')
  return res.json()
}

export async function createEquipoVista(vista: Vista, data: CatalogoEquipoPayload): Promise<CatalogoEquipo> {
  const res = await fetch(buildApiUrl(`/api/catalogo-equipo?vista=${vista}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al crear equipo')
  }
  return res.json()
}

export async function updateEquipoVista(vista: Vista, id: string, data: Partial<CatalogoEquipoPayload>): Promise<CatalogoEquipo> {
  const res = await fetch(buildApiUrl(`/api/catalogo-equipo/${id}?vista=${vista}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al actualizar equipo')
  }
  return res.json()
}

export async function deleteEquipoVista(vista: Vista, id: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/catalogo-equipo/${id}?vista=${vista}`), {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al eliminar equipo')
  }
}
