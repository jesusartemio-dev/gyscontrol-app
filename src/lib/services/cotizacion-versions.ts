// ===================================================
// 📁 Archivo: cotizacion-versions.ts
// 📌 Ubicación: src/lib/services/cotizacion-versions.ts
// 🔧 Descripción: Servicios para gestión de versiones de cotizaciones
// ✅ Funciones para crear, leer y comparar versiones
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { buildApiUrl } from '@/lib/utils'

// Tipos para versiones de cotización
export interface CotizacionVersion {
  id: string
  cotizacionId: string
  version: number
  nombre: string
  descripcion?: string
  estado: string
  snapshot: string // JSON string
  cambios?: string
  motivoCambio?: string
  usuarioId: string
  createdAt: string
  updatedAt: string

  // Relaciones (Prisma returns 'user' from include)
  user: {
    id: string
    name: string
    email: string
  }
}

export interface CreateVersionData {
  cotizacionId: string
  nombre: string
  descripcion?: string
  cambios?: string
  motivoCambio?: string
  snapshot: string
}

export interface VersionComparison {
  version1: CotizacionVersion
  version2: CotizacionVersion
  diferencias: {
    campo: string
    valorAnterior: any
    valorNuevo: any
    tipoCambio: 'agregado' | 'modificado' | 'eliminado'
  }[]
}

// ✅ Crear nueva versión de cotización
export async function createCotizacionVersion(data: CreateVersionData): Promise<CotizacionVersion> {
  try {
    const response = await fetch(buildApiUrl('/api/cotizaciones/versions'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Error al crear versión: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en createCotizacionVersion:', error)
    throw error
  }
}

// ✅ Obtener versiones de una cotización
export async function getCotizacionVersions(cotizacionId: string): Promise<CotizacionVersion[]> {
  try {
    const response = await fetch(buildApiUrl(`/api/cotizaciones/${cotizacionId}/versions`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener versiones: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getCotizacionVersions:', error)
    throw error
  }
}

// ✅ Obtener versión específica
export async function getCotizacionVersion(versionId: string): Promise<CotizacionVersion> {
  try {
    const response = await fetch(buildApiUrl(`/api/cotizaciones/versions/${versionId}`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener versión: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getCotizacionVersion:', error)
    throw error
  }
}

// ✅ Comparar dos versiones
export function compareCotizacionVersions(version1: CotizacionVersion, version2: CotizacionVersion): VersionComparison {
  try {
    const snapshot1 = JSON.parse(version1.snapshot)
    const snapshot2 = JSON.parse(version2.snapshot)

    const diferencias: VersionComparison['diferencias'] = []

    // Función recursiva para comparar objetos
    function compareObjects(obj1: any, obj2: any, path: string = ''): void {
      const keys1 = Object.keys(obj1 || {})
      const keys2 = Object.keys(obj2 || {})

      // Campos en obj1 pero no en obj2 (eliminados)
      for (const key of keys1) {
        if (!(key in obj2)) {
          diferencias.push({
            campo: path ? `${path}.${key}` : key,
            valorAnterior: obj1[key],
            valorNuevo: undefined,
            tipoCambio: 'eliminado'
          })
        }
      }

      // Campos en obj2 pero no en obj1 (agregados)
      for (const key of keys2) {
        if (!(key in obj1)) {
          diferencias.push({
            campo: path ? `${path}.${key}` : key,
            valorAnterior: undefined,
            valorNuevo: obj2[key],
            tipoCambio: 'agregado'
          })
        }
      }

      // Campos en ambos (posiblemente modificados)
      for (const key of keys1) {
        if (key in obj2) {
          const val1 = obj1[key]
          const val2 = obj2[key]

          if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
            // Comparar objetos anidados
            compareObjects(val1, val2, path ? `${path}.${key}` : key)
          } else if (val1 !== val2) {
            // Valores diferentes
            diferencias.push({
              campo: path ? `${path}.${key}` : key,
              valorAnterior: val1,
              valorNuevo: val2,
              tipoCambio: 'modificado'
            })
          }
        }
      }
    }

    compareObjects(snapshot1, snapshot2)

    return {
      version1,
      version2,
      diferencias
    }
  } catch (error) {
    console.error('❌ Error comparando versiones:', error)
    throw new Error('Error al comparar versiones')
  }
}

// ✅ Crear snapshot de cotización actual
export async function createCotizacionSnapshot(cotizacionId: string): Promise<string> {
  try {
    // Obtener datos completos de la cotización
    const response = await fetch(buildApiUrl(`/api/cotizacion/${cotizacionId}`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener cotización: ${response.statusText}`)
    }

    const cotizacion = await response.json()

    // Crear snapshot excluyendo campos internos
    const snapshot = {
      ...cotizacion,
      // Excluir campos que no queremos versionar
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      versiones: undefined
    }

    return JSON.stringify(snapshot)
  } catch (error) {
    console.error('❌ Error creando snapshot:', error)
    throw error
  }
}

// ✅ Actualizar estado de versión
export async function updateVersionEstado(versionId: string, estado: string): Promise<CotizacionVersion> {
  try {
    const response = await fetch(buildApiUrl(`/api/cotizaciones/versions/${versionId}`), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ estado })
    })

    if (!response.ok) {
      throw new Error(`Error al actualizar versión: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en updateVersionEstado:', error)
    throw error
  }
}
