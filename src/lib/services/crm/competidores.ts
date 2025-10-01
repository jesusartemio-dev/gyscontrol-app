// ===================================================
// 📁 Archivo: competidores.ts
// 📌 Ubicación: src/lib/services/crm/competidores.ts
// 🔧 Descripción: Servicios para gestión de competidores CRM
// ✅ Funciones para crear, leer competidores de oportunidades
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { buildApiUrl } from '@/lib/utils'

// Tipos para competidores
export interface CrmCompetidor {
  id: string
  cotizacionId: string
  nombreEmpresa: string
  contacto?: string
  telefono?: string
  email?: string
  propuestaEconomica?: number
  propuestaTecnica?: string
  fortalezas?: string
  debilidades?: string
  precioVsNuestro?: string
  resultado?: string
  razonPerdida?: string
  createdAt: string
  updatedAt: string
}

export interface CrmCompetidorCreate {
  nombreEmpresa: string
  contacto?: string
  telefono?: string
  email?: string
  propuestaEconomica?: number
  propuestaTecnica?: string
  fortalezas?: string
  debilidades?: string
  precioVsNuestro?: string
  resultado?: string
  razonPerdida?: string
}

export interface CrmCompetidorResponse {
  data: CrmCompetidor[]
  estadisticas: {
    total: number
    conPropuesta: number
    ganamos: number
    perdimos: number
    pendiente: number
  }
}

// ✅ Obtener competidores de una oportunidad
export async function getCompetidoresOportunidad(
  oportunidadId: string
): Promise<CrmCompetidorResponse> {
  try {
    const response = await fetch(buildApiUrl(`/api/crm/oportunidades/${oportunidadId}/competidores`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener competidores: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getCompetidoresOportunidad:', error)
    throw error
  }
}

// ✅ Agregar competidor a una oportunidad
export async function createCompetidorOportunidad(
  oportunidadId: string,
  data: CrmCompetidorCreate
): Promise<CrmCompetidor> {
  try {
    const response = await fetch(buildApiUrl(`/api/crm/oportunidades/${oportunidadId}/competidores`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Error al crear competidor: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en createCompetidorOportunidad:', error)
    throw error
  }
}

// ✅ Resultados de competidores comunes
export const RESULTADOS_COMPETIDOR = {
  GANAMOS: 'ganamos',
  PERDIMOS: 'perdimos',
  PENDIENTE: 'pendiente'
} as const

export type ResultadoCompetidor = typeof RESULTADOS_COMPETIDOR[keyof typeof RESULTADOS_COMPETIDOR]

// ✅ Comparación de precios
export const COMPARACION_PRECIOS = {
  MAS_CARO: 'mas_caro',
  IGUAL: 'igual',
  MAS_BARATO: 'mas_barato'
} as const

export type ComparacionPrecio = typeof COMPARACION_PRECIOS[keyof typeof COMPARACION_PRECIOS]

// ✅ Funciones helper para crear competidores comunes
export async function registrarCompetidorGanador(
  oportunidadId: string,
  data: Omit<CrmCompetidorCreate, 'resultado'>
): Promise<CrmCompetidor> {
  return createCompetidorOportunidad(oportunidadId, {
    ...data,
    resultado: RESULTADOS_COMPETIDOR.GANAMOS
  })
}

export async function registrarCompetidorPerdedor(
  oportunidadId: string,
  data: Omit<CrmCompetidorCreate, 'resultado'> & { razonPerdida: string }
): Promise<CrmCompetidor> {
  return createCompetidorOportunidad(oportunidadId, {
    ...data,
    resultado: RESULTADOS_COMPETIDOR.PERDIMOS
  })
}

export async function registrarCompetidorPendiente(
  oportunidadId: string,
  data: Omit<CrmCompetidorCreate, 'resultado'>
): Promise<CrmCompetidor> {
  return createCompetidorOportunidad(oportunidadId, {
    ...data,
    resultado: RESULTADOS_COMPETIDOR.PENDIENTE
  })
}

// ✅ Funciones de análisis de competidores
export function analizarCompetidores(competidores: CrmCompetidor[]) {
  const total = competidores.length
  const conPropuesta = competidores.filter(c => c.propuestaEconomica).length
  const ganamos = competidores.filter(c => c.resultado === RESULTADOS_COMPETIDOR.GANAMOS).length
  const perdimos = competidores.filter(c => c.resultado === RESULTADOS_COMPETIDOR.PERDIMOS).length
  const pendiente = competidores.filter(c => c.resultado === RESULTADOS_COMPETIDOR.PENDIENTE).length

  const precioPromedio = competidores
    .filter(c => c.propuestaEconomica)
    .reduce((sum, c) => sum + (c.propuestaEconomica || 0), 0) / conPropuesta || 0

  const fortalezasComunes = competidores
    .filter(c => c.fortalezas)
    .map(c => c.fortalezas!)
    .join('; ')
    .split(';')
    .map(f => f.trim())
    .filter(f => f.length > 0)

  const debilidadesComunes = competidores
    .filter(c => c.debilidades)
    .map(c => c.debilidades!)
    .join('; ')
    .split(';')
    .map(d => d.trim())
    .filter(d => d.length > 0)

  return {
    resumen: {
      total,
      conPropuesta,
      ganamos,
      perdimos,
      pendiente,
      precioPromedio: Math.round(precioPromedio * 100) / 100
    },
    analisis: {
      fortalezasComunes: [...new Set(fortalezasComunes)],
      debilidadesComunes: [...new Set(debilidadesComunes)],
      posicionamientoPrecio: competidores
        .filter(c => c.precioVsNuestro)
        .reduce((acc, c) => {
          acc[c.precioVsNuestro!] = (acc[c.precioVsNuestro!] || 0) + 1
          return acc
        }, {} as Record<string, number>)
    }
  }
}
