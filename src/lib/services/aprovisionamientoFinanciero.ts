// ===================================================
// 📁 Archivo: aprovisionamientoFinanciero.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio para gestión de aprovisionamiento financiero
//
// 🧠 Funcionalidades:
// - Obtener proyectos consolidados con KPIs financieros
// - Filtrado y paginación de proyectos
// - Cálculo de métricas de aprovisionamiento
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { z } from 'zod'

// ✅ Tipos para el servicio
export interface ProyectoConsolidado {
  id: string
  nombre: string
  codigo: string
  estado: 'activo' | 'pausado' | 'completado'
  cliente: string
  responsable: string
  fechaInicio: string
  fechaFin: string
  presupuestoTotal: number
  presupuestoEjecutado: number
  presupuestoComercial: number
  presupuestoPedidos: number
  listas: {
    total: number
    aprobadas: number
    pendientes: number
    montoTotal: number
  }
  pedidos: {
    total: number
    enviados: number
    pendientes: number
    montoTotal: number
  }
  alertas: number
  progreso: number
  moneda: 'PEN' | 'USD'
}

export interface KPIsConsolidados {
  totalProyectos: number
  proyectosActivos: number
  proyectosPausados: number
  proyectosCompletados: number
  totalListas: number
  totalPedidos: number
  montoTotalListas: number
  montoTotalPedidos: number
  totalAlertas: number
  progresoPromedio: number
}

export interface FiltrosAprovisionamiento {
  page?: number
  limit?: number
  search?: string
  estado?: 'activo' | 'pausado' | 'completado'
  responsable?: string
  fechaInicio?: string
  fechaFin?: string
  alertas?: boolean
}

export interface RespuestaProyectosConsolidados {
  success: boolean
  data: ProyectoConsolidado[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  kpis: KPIsConsolidados
  timestamp: string
}

// ✅ Schema de validación para filtros
const FiltrosSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  estado: z.enum(['activo', 'pausado', 'completado']).optional(),
  responsable: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  alertas: z.boolean().optional()
})

// 🌐 Base URL para las APIs
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return '' // En el cliente, usar URL relativa
  }
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

/**
 * 📊 Obtener proyectos consolidados con filtros y paginación
 * @param filtros - Filtros de búsqueda y paginación
 * @returns Promise con los proyectos consolidados y KPIs
 */
export async function obtenerProyectosConsolidados(
  filtros: FiltrosAprovisionamiento = {}
): Promise<RespuestaProyectosConsolidados> {
  try {
    console.log('🔍 Obteniendo proyectos consolidados:', filtros)
    
    // ✅ Validar filtros
    const filtrosValidados = FiltrosSchema.parse(filtros)
    
    // 🔗 Construir URL con parámetros de búsqueda y paginación
    const baseUrl = getBaseUrl()
    const searchParams = new URLSearchParams()
    
    Object.entries(filtrosValidados).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    
    const url = `${baseUrl}/api/finanzas/aprovisionamiento/proyectos?${searchParams.toString()}`
    console.log('📡 Llamando a:', url)
    
    // 🍪 Obtener cookies para autenticación en server-side
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Si estamos en el servidor, incluir cookies
    if (typeof window === 'undefined') {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get('next-auth.session-token') || cookieStore.get('__Secure-next-auth.session-token')
      
      if (sessionToken) {
        headers['Cookie'] = `${sessionToken.name}=${sessionToken.value}`
      }
    }
    
    // 📡 Realizar petición con filtros aplicados
    const response = await fetch(url, {
      method: 'GET',
      headers,
      // 🔄 Configuración de cache
      next: {
        revalidate: 60 // Revalidar cada 60 segundos
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Error ${response.status}: ${errorData.error || 'Error desconocido'}`
      )
    }
    
    const data: RespuestaProyectosConsolidados = await response.json()
    
    console.log('✅ Proyectos consolidados obtenidos:', {
      total: data.data.length,
      pagination: data.pagination,
      kpis: data.kpis
    })
    
    return data
    
  } catch (error) {
    console.error('❌ Error al obtener proyectos consolidados:', error)
    
    // 🔄 Retornar estructura vacía en caso de error
    return {
      success: false,
      data: [],
      pagination: {
        page: filtros.page || 1,
        limit: filtros.limit || 10,
        total: 0,
        pages: 0
      },
      kpis: {
        totalProyectos: 0,
        proyectosActivos: 0,
        proyectosPausados: 0,
        proyectosCompletados: 0,
        totalListas: 0,
        totalPedidos: 0,
        montoTotalListas: 0,
        montoTotalPedidos: 0,
        totalAlertas: 0,
        progresoPromedio: 0
      },
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 📊 Obtener KPIs consolidados únicamente
 * @param filtros - Filtros para el cálculo de KPIs
 * @returns Promise con los KPIs consolidados
 */
export async function obtenerKPIsConsolidados(
  filtros: FiltrosAprovisionamiento = {}
): Promise<KPIsConsolidados> {
  try {
    const respuesta = await obtenerProyectosConsolidados({
      ...filtros,
      limit: 1 // Solo necesitamos los KPIs, no los datos
    })
    
    return respuesta.kpis
    
  } catch (error) {
    console.error('❌ Error al obtener KPIs consolidados:', error)
    
    return {
      totalProyectos: 0,
      proyectosActivos: 0,
      proyectosPausados: 0,
      proyectosCompletados: 0,
      totalListas: 0,
      totalPedidos: 0,
      montoTotalListas: 0,
      montoTotalPedidos: 0,
      totalAlertas: 0,
      progresoPromedio: 0
    }
  }
}

/**
 * 🔍 Buscar proyectos por término de búsqueda
 * @param termino - Término de búsqueda
 * @param limite - Límite de resultados (default: 10)
 * @returns Promise con los proyectos encontrados
 */
export async function buscarProyectos(
  termino: string,
  limite: number = 10
): Promise<ProyectoConsolidado[]> {
  try {
    const respuesta = await obtenerProyectosConsolidados({
      search: termino,
      limit: limite,
      page: 1
    })
    
    return respuesta.data
    
  } catch (error) {
    console.error('❌ Error al buscar proyectos:', error)
    return []
  }
}

/**
 * ⚠️ Obtener proyectos con alertas
 * @param limite - Límite de resultados (default: 20)
 * @returns Promise con los proyectos que tienen alertas
 */
export async function obtenerProyectosConAlertas(
  limite: number = 20
): Promise<ProyectoConsolidado[]> {
  try {
    const respuesta = await obtenerProyectosConsolidados({
      alertas: true,
      limit: limite,
      page: 1
    })
    
    return respuesta.data
    
  } catch (error) {
    console.error('❌ Error al obtener proyectos con alertas:', error)
    return []
  }
}

/**
 * 📈 Obtener estadísticas de progreso por estado
 * @returns Promise con estadísticas de progreso
 */
export async function obtenerEstadisticasProgreso(): Promise<{
  activos: { promedio: number; total: number }
  pausados: { promedio: number; total: number }
  completados: { promedio: number; total: number }
}> {
  try {
    const respuesta = await obtenerProyectosConsolidados({
      limit: 100 // Obtener más proyectos para estadísticas
    })
    
    const proyectos = respuesta.data
    
    const activos = proyectos.filter(p => p.estado === 'activo')
    const pausados = proyectos.filter(p => p.estado === 'pausado')
    const completados = proyectos.filter(p => p.estado === 'completado')
    
    return {
      activos: {
        promedio: activos.length > 0 
          ? Math.round(activos.reduce((sum, p) => sum + p.progreso, 0) / activos.length)
          : 0,
        total: activos.length
      },
      pausados: {
        promedio: pausados.length > 0 
          ? Math.round(pausados.reduce((sum, p) => sum + p.progreso, 0) / pausados.length)
          : 0,
        total: pausados.length
      },
      completados: {
        promedio: completados.length > 0 
          ? Math.round(completados.reduce((sum, p) => sum + p.progreso, 0) / completados.length)
          : 0,
        total: completados.length
      }
    }
    
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de progreso:', error)
    
    return {
      activos: { promedio: 0, total: 0 },
      pausados: { promedio: 0, total: 0 },
      completados: { promedio: 0, total: 0 }
    }
  }
}

/**
 * 💰 Formatear montos en formato de moneda
 * @param monto - Monto a formatear
 * @param moneda - Código de moneda (default: 'PEN')
 * @returns String con el monto formateado
 */
export function formatearMonto(monto: number, moneda: string = 'USD'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2
  }).format(monto)
}

/**
 * 📅 Formatear fechas en formato local
 * @param fecha - Fecha a formatear (string ISO)
 * @returns String con la fecha formateada
 */
export function formatearFecha(fecha: string): string {
  if (!fecha) return 'Sin fecha'
  
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(fecha))
}

/**
 * 🎯 Calcular color del badge según el progreso
 * @param progreso - Porcentaje de progreso (0-100)
 * @returns Variant del badge
 */
export function obtenerVariantProgreso(progreso: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (progreso >= 80) return 'default' // Verde
  if (progreso >= 50) return 'secondary' // Amarillo
  if (progreso >= 20) return 'outline' // Gris
  return 'destructive' // Rojo
}

/**
 * ⚠️ Obtener color del badge según el número de alertas
 * @param alertas - Número de alertas
 * @returns Variant del badge
 */
export function obtenerVariantAlertas(alertas: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (alertas === 0) return 'outline' // Sin alertas
  if (alertas <= 2) return 'secondary' // Pocas alertas
  return 'destructive' // Muchas alertas
}