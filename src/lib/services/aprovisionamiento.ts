// ✅ Servicios para Aprovisionamiento Financiero
// 📡 Funciones para conectar con las APIs de aprovisionamiento

import type { 
  ProyectoAprovisionamiento, 
  FiltrosProyectoAprovisionamiento, 
  ItemGantt, 
  GanttItem,
  TimelineData,
  ConfiguracionGantt, 
  ResumenTimeline, 
  KPIAprovisionamiento, 
  AlertaTimeline,
  AlertaTimelineExtendida,
  ResponseListas,
  ResponsePedidos 
} from '@/types/aprovisionamiento'
import type { PedidoEquipoItem } from '@/types/modelos'
import { buildApiUrl } from '@/lib/utils'
import { AprovisionamientoCalculos, type CoherenciaResult } from './aprovisionamientoCalculos'
import { AprovisionamientoNotificaciones, crearCoherenciaExtendida, type CoherenciaResultExtended } from './aprovisionamientoNotificaciones'

// 🌐 Base URL para las APIs
const API_BASE = '/api/aprovisionamiento'

// 🔧 Función para obtener cookies de manera segura
async function getServerCookies(): Promise<string | null> {
  try {
    // Solo importar headers() cuando estamos en el servidor
    if (typeof window === 'undefined') {
      const { headers } = await import('next/headers')
      const headersList = await headers()
      return headersList.get('cookie')
    }
    return null
  } catch (error) {
    // Si falla la importación, estamos en el cliente
    return null
  }
}

// 🔧 Utilidad para manejar respuestas de API
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

// 🔧 Utilidad para construir query parameters
function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        searchParams.append(key, value.join(','))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  return searchParams.toString()
}

// 📊 Servicios para Proyectos de Aprovisionamiento
export const proyectosAprovisionamientoService = {
  /**
   * 🔍 Obtener proyectos con datos de aprovisionamiento
   */
  async obtenerProyectos(filtros: FiltrosProyectoAprovisionamiento = {}) {
    try {
      const queryParams = buildQueryParams(filtros)
      const url = buildApiUrl(`${API_BASE}/proyectos${queryParams ? `?${queryParams}` : ''}`)
      
      // 📡 Obtener cookies de la petición para Server Components
      const cookie = await getServerCookies()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })
      
      return await handleApiResponse<{
        success: boolean
        data: ProyectoAprovisionamiento[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
          hasNext: boolean
          hasPrev: boolean
        }
        timestamp: string
      }>(response)
    } catch (error) {
      console.error('Error al obtener proyectos de aprovisionamiento:', error)
      throw error
    }
  },

  /**
    * 🔍 Obtener proyectos para aprovisionamiento (función adicional)
    */
   async getProyectosAprovisionamiento(filtros: FiltrosProyectoAprovisionamiento = {}): Promise<ProyectoAprovisionamiento[]> {
     try {
       const response = await this.obtenerProyectos(filtros)
       return response.data
     } catch (error) {
       console.error('Error al obtener proyectos de aprovisionamiento:', error)
       throw error
     }
   },

   /**
    * 📊 Obtener KPIs generales de aprovisionamiento
    * Uses the consolidated GET endpoint which returns kpis in its response
    */
  async obtenerKPIs(): Promise<KPIAprovisionamiento> {
    try {
      const url = buildApiUrl('/api/finanzas/aprovisionamiento/proyectos?limit=1')
      const cookie = await getServerCookies()
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })

      const data = await handleApiResponse<{ kpis: KPIAprovisionamiento }>(response)
      return data.kpis
    } catch (error) {
      console.error('Error al obtener KPIs de aprovisionamiento:', error)
      throw error
    }
  },

  /**
   * 🔍 Obtener proyecto específico con detalles de aprovisionamiento
   */
  async obtenerProyectoPorId(proyectoId: string): Promise<ProyectoAprovisionamiento> {
    try {
      const url = buildApiUrl(`${API_BASE}/proyectos/${proyectoId}`)
      const cookie = await getServerCookies()
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })

      const data = await handleApiResponse<{ success: boolean; data: ProyectoAprovisionamiento }>(response)
      if (!data.data) {
        throw new Error('Proyecto no encontrado')
      }
      return data.data
    } catch (error) {
      console.error('Error al obtener proyecto por ID:', error)
      throw error
    }
  }
}

// 📅 Servicios para Timeline Gantt
export const timelineGanttService = {
  /**
   * 🔍 Obtener datos del timeline Gantt
   */
  async obtenerTimeline(filtros: {
    proyectoId?: string
    tipo?: 'lista' | 'pedido' | 'ambos'
    estado?: string[]
    fechaInicio?: string
    fechaFin?: string
    responsableId?: string
    montoMinimo?: number
    montoMaximo?: number
    soloConAlertas?: boolean
    zoom?: 'dia' | 'semana' | 'mes'
  } = {}) {
    try {
      const queryParams = buildQueryParams(filtros)
      const url = buildApiUrl(`${API_BASE}/timeline${queryParams ? `?${queryParams}` : ''}`)
      
      // 📡 Obtener cookies de la petición para Server Components
      const cookie = await getServerCookies()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })
      
      return await handleApiResponse<{
        items: ItemGantt[]
        resumen: ResumenTimeline
        configuracion: {
          zoom: 'dia' | 'semana' | 'mes'
          fechaInicio: Date
          fechaFin: Date
        }
      }>(response)
    } catch (error) {
      console.error('Error al obtener timeline Gantt:', error)
      throw error
    }
  },

  /**
   * 🔄 Recalcular fechas automáticamente
   */
  async recalcularFechas(itemId: string, nuevoTiempoEntrega: number) {
    try {
      const response = await fetch(`${API_BASE}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          accion: 'recalcular-fechas',
          configuracion: {
            itemId,
            nuevoTiempoEntrega
          }
        })
      })
      
      return await handleApiResponse<{
        mensaje: string
        itemsActualizados: string[]
      }>(response)
    } catch (error) {
      console.error('Error al recalcular fechas:', error)
      throw error
    }
  },

  /**
   * 📄 Exportar timeline a PDF/Excel
   */
  async exportarTimeline(formato: 'pdf' | 'excel', filtros: any = {}) {
    try {
      const response = await fetch(`${API_BASE}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          accion: 'exportar-timeline',
          configuracion: {
            formato,
            filtros
          }
        })
      })
      
      return await handleApiResponse<{
        mensaje: string
        url: string
      }>(response)
    } catch (error) {
      console.error('Error al exportar timeline:', error)
      throw error
    }
  }
}

/**
 * 🔍 Obtener datos del timeline para la página
 * Función wrapper que adapta la respuesta del servicio timeline
 * ✅ Usa fetch HTTP con cookies para mantener el contexto de autenticación
 */
export async function getTimelineData(filtros: {
  proyectoId?: string
  fechaInicio?: string
  fechaFin?: string
  vista?: 'gantt' | 'lista' | 'calendario'
  agrupacion?: 'proyecto' | 'estado' | 'responsable' | 'proveedor' | 'fecha'
  soloCoherencia?: boolean
  soloAlertas?: boolean
} = {}): Promise<TimelineData> {
  try {
    // 📋 Construir URL con parámetros
    const queryParams = buildQueryParams({
      proyectoId: filtros.proyectoId,
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      soloConAlertas: filtros.soloAlertas,
      tipo: 'ambos'
    })
    
    const url = buildApiUrl(`${API_BASE}/timeline${queryParams ? `?${queryParams}` : ''}`)
    
    // 📡 Obtener cookies de la petición para Server Components
    const cookie = await getServerCookies()
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { 'Cookie': cookie })
      },
      credentials: 'include',
      cache: 'no-store'
    })
    
    const timelineResponse = await response.json()
    
    // ✅ Verificar si la respuesta es exitosa
    if (!response.ok) {
      throw new Error(timelineResponse.error || 'Error al obtener datos del timeline')
    }
    
    // ✅ La API devuelve directamente los datos, no en estructura {success, data}
    const apiData = timelineResponse
    
    // 🔁 Convertir ItemGantt[] a GanttItem[]
    const ganttItems: GanttItem[] = (apiData.items || []).map((item: ItemGantt) => ({
      id: item.id,
      label: item.nombre,
      titulo: item.nombre,
      descripcion: `${item.codigo} - ${item.proyecto.nombre}`,
      codigo: item.codigo, // ✅ Mapear código para mostrar en formato "codigo - titulo"
      tipo: item.tipo,
      start: item.fechaInicio,
      end: item.fechaFin,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      amount: item.monto,
      estado: item.estado,
      color: item.color,
      progress: item.progreso,
      progreso: item.progreso,
      coherencia: 85, // 📊 Valor por defecto
      dependencies: item.dependencias,
      alertas: item.alertas,
      diasRetraso: item.diasRetraso // ✅ Mapear días de retraso
    }))
    
    // 🔁 Adaptar la respuesta para la página
    return {
      items: ganttItems,
      resumen: apiData.resumen || {
        totalItems: 0,
        montoTotal: 0,
        itemsVencidos: 0,
        itemsEnRiesgo: 0,
        itemsConAlertas: 0, // ✅ Propiedad requerida por ResumenTimeline
        porcentajeCompletado: 0,
        coherenciaPromedio: 0, // ✅ Propiedad requerida por ResumenTimeline
        distribucionPorTipo: { listas: 0, pedidos: 0 },
        alertasPorPrioridad: { alta: 0, media: 0, baja: 0 }
      },
      alertas: apiData.items?.flatMap((item: ItemGantt) => item.alertas || []) || [],
      configuracion: {
        mostrarMontos: true,
        mostrarEstados: true,
        mostrarDependencias: false,
        zoom: 'semana' as const,
        colorPorEstado: {
          'pendiente': '#f59e0b',
          'en_proceso': '#3b82f6',
          'completado': '#10b981',
          'cancelado': '#ef4444'
        }
      }
    }
  } catch (error) {
    console.error('Error al obtener datos del timeline:', error)
    // 🔁 Retornar estructura vacía en caso de error
    return {
      items: [],
      resumen: {
        totalItems: 0,
        montoTotal: 0,
        itemsVencidos: 0,
        itemsEnRiesgo: 0,
        itemsConAlertas: 0, // ✅ Propiedad requerida por ResumenTimeline
        porcentajeCompletado: 0,
        coherenciaPromedio: 0, // ✅ Propiedad requerida por ResumenTimeline
        distribucionPorTipo: { listas: 0, pedidos: 0 },
        alertasPorPrioridad: { alta: 0, media: 0, baja: 0 }
      },
      alertas: [],
      configuracion: {
        mostrarMontos: true, // ✅ Propiedad requerida por ConfiguracionGantt
        mostrarEstados: true, // ✅ Propiedad requerida por ConfiguracionGantt
        mostrarDependencias: false, // ✅ Propiedad requerida por ConfiguracionGantt
        zoom: 'semana' as const,
        colorPorEstado: { // ✅ Propiedad requerida por ConfiguracionGantt
          'pendiente': '#f59e0b',
          'en_proceso': '#3b82f6',
          'completado': '#10b981',
          'cancelado': '#ef4444'
        }
      }
    }
  }
}

// 📋 Servicios para Listas de Equipo
export const listasEquipoService = {
  /**
   * 🔍 Obtener listas de equipo con filtros
   */
  async obtenerListas(filtros: {
    proyectoId?: string
    estado?: string[]
    responsableId?: string
    fechaDesde?: string
    fechaHasta?: string
    montoMinimo?: number
    montoMaximo?: number
    page?: number
    limit?: number
  } = {}): Promise<ResponseListas> {
    try {
      const queryParams = buildQueryParams(filtros)
      const url = buildApiUrl(`${API_BASE}/listas${queryParams ? `?${queryParams}` : ''}`)
      
      // 📡 Obtener cookies de la petición para Server Components
      const cookie = await getServerCookies()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })
      
      return await handleApiResponse<ResponseListas>(response)
    } catch (error) {
      console.error('Error al obtener listas de equipo:', error)
      throw error
    }
  },

  /**
   * 📊 Obtener resumen de listas por proyecto
   */
  async obtenerResumenPorProyecto(proyectoId: string) {
    try {
      const data = await this.obtenerListas({ proyectoId })
      
      // 🧮 Calcular resumen
      const listas: any[] = data.data?.listas || []
      const resumen = {
        total: listas.length,
        porEstado: listas.reduce((acc: any, lista: any) => {
          acc[lista.estado] = (acc[lista.estado] || 0) + 1
          return acc
        }, {}),
        montoTotal: listas.reduce((sum: number, lista: any) => sum + (lista.monto || 0), 0),
        proximaFechaNecesaria: listas
          .filter((lista: any) => lista.fechaNecesaria && new Date(lista.fechaNecesaria) > new Date())
          .sort((a: any, b: any) => new Date(a.fechaNecesaria).getTime() - new Date(b.fechaNecesaria).getTime())[0]?.fechaNecesaria
      }
      
      return resumen
    } catch (error) {
      console.error('Error al obtener resumen de listas por proyecto:', error)
      throw error
    }
  }
}

// 🛒 Servicios para Pedidos de Equipo
export const pedidosEquipoService = {
  /**
   * 🔍 Obtener pedidos de equipo con filtros
   */
  async obtenerPedidos(filtros: {
    proyectoId?: string
    listaEquipoId?: string
    estado?: string[]
    proveedorId?: string
    fechaDesde?: string
    fechaHasta?: string
    montoMinimo?: number
    montoMaximo?: number
    busqueda?: string
    page?: number
    limit?: number
  } = {}): Promise<ResponsePedidos> {
    try {
      const queryParams = buildQueryParams(filtros)
      const url = buildApiUrl(`${API_BASE}/pedidos${queryParams ? `?${queryParams}` : ''}`)
      
      // 📡 Obtener cookies de la petición para Server Components
      const cookie = await getServerCookies()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })
      
      return await handleApiResponse<ResponsePedidos>(response)
    } catch (error) {
      console.error('Error al obtener pedidos de equipo:', error)
      throw error
    }
  },

  /**
   * 📊 Obtener resumen de pedidos por proyecto
   */
  async obtenerResumenPorProyecto(proyectoId: string) {
    try {
      const response = await this.obtenerPedidos({ proyectoId })
      
      // 🧮 Calcular resumen
      const pedidos = response.data.pedidos || []
      const resumen = {
        total: pedidos.length,
        porEstado: pedidos.reduce((acc: any, pedido: any) => {
          acc[pedido.estado] = (acc[pedido.estado] || 0) + 1
          return acc
        }, {}),
        montoTotal: pedidos.reduce((sum: number, pedido: any) => sum + (pedido.monto || 0), 0),
        proximaFechaEntrega: pedidos
          .filter((pedido: any) => pedido.fechaEntregaEstimada && new Date(pedido.fechaEntregaEstimada) > new Date())
          .sort((a: any, b: any) => new Date(a.fechaEntregaEstimada).getTime() - new Date(b.fechaEntregaEstimada).getTime())[0]?.fechaEntregaEstimada
      }
      
      return resumen
    } catch (error) {
      console.error('Error al obtener resumen de pedidos por proyecto:', error)
      throw error
    }
  },

  /**
   * 🔗 Obtener pedidos relacionados a una lista
   */
  async obtenerPedidosPorLista(listaEquipoId: string) {
    try {
      return await this.obtenerPedidos({ listaEquipoId })
    } catch (error) {
      console.error('Error al obtener pedidos por lista:', error)
      throw error
    }
  }
}

// 🚨 Servicios para Alertas y Notificaciones
export const alertasService = {
  /**
   * 🔍 Obtener alertas activas de aprovisionamiento
   */
  async obtenerAlertas(filtros: {
    tipo?: 'lista' | 'pedido' | 'proyecto'
    prioridad?: 'alta' | 'media' | 'baja'
    proyectoId?: string
    soloActivas?: boolean
  } = {}) {
    try {
      // 🔁 TODO: Implementar API específica para alertas
      // Por ahora, obtenemos alertas del timeline
      const timelineData = await timelineGanttService.obtenerTimeline({
        soloConAlertas: true,
        proyectoId: filtros.proyectoId
      })
      
      const alertas: AlertaTimelineExtendida[] = []
      
      timelineData.items.forEach(item => {
        item.alertas.forEach(alerta => {
          if (!filtros.prioridad || alerta.prioridad === filtros.prioridad) {
            if (!filtros.tipo || item.tipo === filtros.tipo) {
              alertas.push({
                ...alerta,
                itemId: item.id,
                itemCodigo: item.codigo,
                proyectoNombre: item.proyecto.nombre
              })
            }
          }
        })
      })
      
      return {
        alertas,
        resumen: {
          total: alertas.length,
          porPrioridad: {
            alta: alertas.filter(a => a.prioridad === 'alta').length,
            media: alertas.filter(a => a.prioridad === 'media').length,
            baja: alertas.filter(a => a.prioridad === 'baja').length
          }
        }
      }
    } catch (error) {
      console.error('Error al obtener alertas:', error)
      throw error
    }
  },

  /**
   * ✅ Marcar alerta como leída
   */
  async marcarComoLeida(alertaId: string) {
    try {
      // 🔁 TODO: Implementar API para marcar alertas como leídas
      console.log('Marcando alerta como leída:', alertaId)
      return { success: true }
    } catch (error) {
      console.error('Error al marcar alerta como leída:', error)
      throw error
    }
  }
}

// 📊 Servicios para Reportes y Exportaciones
export const reportesService = {
  /**
   * 📄 Generar reporte de aprovisionamiento por proyecto
   */
  async generarReporteProyecto(proyectoId: string, formato: 'pdf' | 'excel' = 'pdf') {
    try {
      // 🔁 TODO: Implementar API específica para reportes
      const response = await fetch('/api/reportes/aprovisionamiento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo: 'proyecto',
          proyectoId,
          formato
        })
      })
      
      return await handleApiResponse<{
        url: string
        mensaje: string
      }>(response)
    } catch (error) {
      console.error('Error al generar reporte de proyecto:', error)
      throw error
    }
  },

  /**
   * 📊 Generar reporte consolidado de aprovisionamiento
   */
  async generarReporteConsolidado(filtros: any = {}, formato: 'pdf' | 'excel' = 'pdf') {
    try {
      const response = await fetch('/api/reportes/aprovisionamiento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo: 'consolidado',
          filtros,
          formato
        })
      })
      
      return await handleApiResponse<{
        url: string
        mensaje: string
      }>(response)
    } catch (error) {
      console.error('Error al generar reporte consolidado:', error)
      throw error
    }
  }
}

// 🔧 Servicios de Utilidad
export const utilidadesService = {
  /**
   * 🧮 Calcular fechas automáticamente según documentación
   * Para Listas: fechaInicio = fechaNecesaria - MAX(ListaEquipoItem.tiempoEntregaDias)
   * Para Pedidos: fechaInicio = fechaNecesaria - MAX(PedidoEquipoItem.tiempoEntregaDias)
   */
  calcularFechas(fechaNecesaria: Date, tiempoEntregaDias: number) {
    const fechaFin = new Date(fechaNecesaria)
    const fechaInicio = new Date(fechaFin)
    fechaInicio.setDate(fechaFin.getDate() - tiempoEntregaDias)
    
    return { fechaInicio, fechaFin }
  },

  /**
   * 🧮 Calcular fechas Gantt para Lista según documentación
   */
  calcularFechasGanttLista(fechaNecesaria: Date, items: Array<{ tiempoEntregaDias: number }>) {
    const maxTiempoEntrega = Math.max(...items.map(item => item.tiempoEntregaDias || 30))
    return this.calcularFechas(fechaNecesaria, maxTiempoEntrega)
  },

  /**
   * 🧮 Calcular fechas Gantt para Pedido según documentación
   */
  calcularFechasGanttPedido(fechaNecesaria: Date, items: Array<{ tiempoEntregaDias: number }>) {
    const maxTiempoEntrega = Math.max(...items.map(item => item.tiempoEntregaDias || 30))
    return this.calcularFechas(fechaNecesaria, maxTiempoEntrega)
  },

  /**
   * 💰 Formatear montos
   */
  formatearMonto(monto: number, moneda: 'PEN' | 'USD' = 'USD') {
    const simbolo = moneda === 'USD' ? '$' : 'S/'
    return `${simbolo} ${monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  },

  /**
   * 📅 Formatear fechas
   */
  formatearFecha(fecha: Date | string, formato: 'corto' | 'largo' = 'corto') {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha
    
    if (formato === 'largo') {
      return fechaObj.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    return fechaObj.toLocaleDateString('es-PE')
  },

  /**
   * 🎨 Obtener color por estado
   */
  obtenerColorPorEstado(estado: string, tipo: 'lista' | 'pedido') {
    if (tipo === 'lista') {
      // Estados válidos: borrador, por_revisar, por_cotizar, por_validar, por_aprobar, aprobado, rechazado
      switch (estado) {
        case 'borrador': return '#6b7280'
        case 'por_revisar': return '#f59e0b'
        case 'por_cotizar': return '#f97316'
        case 'por_validar': return '#eab308'
        case 'por_aprobar': return '#3b82f6'
        case 'aprobado': return '#10b981'
        case 'rechazado': return '#ef4444'
        default: return '#6b7280'
      }
    } else {
      // Estados válidos: borrador, enviado, atendido, parcial, entregado, cancelado
      switch (estado) {
        case 'borrador': return '#6b7280'
        case 'enviado': return '#f59e0b'
        case 'atendido': return '#3b82f6'
        case 'parcial': return '#8b5cf6'
        case 'entregado': return '#059669'
        case 'cancelado': return '#ef4444'
        default: return '#6b7280'
      }
    }
  }
}

// 🔍 Servicios de Validación de Coherencia
export const validacionCoherenciaService = {
  /**
   * ✅ Validar coherencia entre lista y pedidos
   * Regla: ∑(PedidoEquipoItem.cantidadPedida * precioUnitario) === ∑(ListaEquipoItem.cantidad * precioElegido)
   */
  async validarCoherenciaListaPedidos(listaEquipoId: string) {
    try {
      const url = buildApiUrl(`${API_BASE}/listas/${listaEquipoId}`)
      const cookie = await getServerCookies()
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })

      const data = await handleApiResponse<any>(response)
      const lista = data.data

      if (!lista) {
        throw new Error('Lista no encontrada')
      }

      // 🧮 Calcular monto total de la lista
      const montoLista = lista.listaEquipoItem?.reduce((sum: number, item: any) =>
        sum + ((item.cantidad || 0) * (item.precioElegido || 0)), 0) || 0

      // 🧮 Calcular monto total de pedidos asociados
      const montoPedidos = lista.pedidoEquipo?.reduce((sum: number, pedido: any) =>
        sum + (pedido.pedidoEquipoItem?.reduce((itemSum: number, item: any) =>
          itemSum + ((item.cantidadPedida || 0) * (item.precioUnitario || 0)), 0) || 0), 0) || 0
      
      const diferencia = Math.abs(montoLista - montoPedidos)
      const porcentajeDesviacion = montoLista > 0 ? (diferencia / montoLista) * 100 : 0
      
      return {
        esCoherente: diferencia < 0.01, // Tolerancia de 1 centavo
        montoLista,
        montoPedidos,
        diferencia,
        porcentajeDesviacion,
        alertas: porcentajeDesviacion > 10 ? ['Desviación mayor al 10%'] : []
      }
    } catch (error) {
      console.error('Error al validar coherencia lista-pedidos:', error)
      throw error
    }
  },

  /**
   * 🚨 Generar alertas de coherencia con datos extendidos
   * @param proyectoId - ID del proyecto a analizar
   * @returns Notificaciones generadas con información completa
   * 
   * @example
   * const alertas = await validacionCoherenciaService.generarAlertasCoherencia('proyecto-123');
   * console.log(`Se generaron ${alertas.length} alertas de coherencia`);
   */
  async generarAlertasCoherencia(proyectoId: string) {
    try {
      // 📡 Obtener datos del proyecto
      const proyecto = await proyectosAprovisionamientoService.obtenerProyectoPorId(proyectoId);
      const listas = await listasEquipoService.obtenerListas({ proyectoId });
      const pedidos = await pedidosEquipoService.obtenerPedidos({ proyectoId });
      
      // 🔍 Procesar coherencia por cada lista
      const coherenciaExtendida: CoherenciaResultExtended[] = [];
      
      const listasArray: any[] = (listas as any).data?.listas || []
      const pedidosArray: any[] = (pedidos as any).data?.pedidos || []

      for (const lista of listasArray) {
        // 📊 Obtener pedidos asociados a esta lista
        const pedidosLista = pedidosArray.filter((p: any) => p.listaId === lista.id);

        // 💰 Calcular montos
        const montoLista = lista.listaEquipoItem?.reduce(
          (sum: number, item: any) => sum + ((item.cantidad || 0) * (item.precioElegido || 0)), 0
        ) || 0;

        const montoPedidos = pedidosLista.reduce((sum: number, pedido: any) => {
          return sum + (pedido.pedidoEquipoItem?.reduce(
            (subSum: number, item: any) => subSum + ((item.cantidadPedida || 0) * (item.precioUnitario || 0)), 0
          ) || 0);
        }, 0);

        // 🔍 Validar coherencia usando el servicio de cálculos
        const coherenciaBase = AprovisionamientoCalculos.validarCoherenciaListaPedidos(
          {
            id: lista.id,
            codigo: lista.codigo,
            fechaNecesaria: lista.fechaNecesaria ? new Date(lista.fechaNecesaria) : new Date(),
            items: (lista.listaEquipoItem || []).map((item: any) => ({
              tiempoEntregaDias: item.tiempoEntregaDias || 30,
              cantidad: item.cantidad || 0,
              precioElegido: item.precioElegido || 0
            })),
            estado: lista.estado
          },
          pedidosLista.map((p: any) => ({
            id: p.id,
            codigo: p.codigo,
            fechaNecesaria: p.fechaNecesaria ? new Date(p.fechaNecesaria) : new Date(),
            listaEquipoId: p.listaId!,
            items: (p.pedidoEquipoItem || []).map((item: any) => ({
               tiempoEntregaDias: item.tiempoEntregaDias || 30,
               cantidadPedida: item.cantidadPedida || 0,
               precioUnitario: item.precioUnitario || 0
             })),
            estado: p.estado
          }))
        );

        // ✅ Crear coherencia extendida con información adicional
        const coherenciaConDatos = crearCoherenciaExtendida(
          coherenciaBase,
          lista.id,
          montoLista,
          montoPedidos,
          pedidosLista.map((p: any) => ({
            codigo: p.codigo,
            monto: p.pedidoEquipoItem?.reduce(
              (sum: number, item: any) => sum + ((item.cantidadPedida || 0) * (item.precioUnitario || 0)), 0
            ) || 0
          }))
        );
        
        coherenciaExtendida.push(coherenciaConDatos);
      }
      
      // 🚨 Generar alertas usando el servicio de notificaciones
      const alertas = await AprovisionamientoNotificaciones.generarAlertasAutomaticas(
        [proyecto],
        [], // ganttListas - se puede agregar si es necesario
        [], // ganttPedidos - se puede agregar si es necesario
        coherenciaExtendida
      );
      
      return {
        success: true,
        data: {
          alertas,
          coherencia: coherenciaExtendida,
          resumen: {
            totalListas: coherenciaExtendida.length,
            listasCoherentes: coherenciaExtendida.filter(c => c.esCoherente).length,
            alertasCriticas: alertas.filter(a => a.tipo === 'error').length,
            alertasAdvertencia: alertas.filter(a => a.tipo === 'warning').length
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error generando alertas de coherencia:', error);
      throw new Error(`Error al generar alertas de coherencia: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  },

  /**
   * ✅ Validar cantidades por item
   * Regla: ∑(cantidadPedida_del_item) <= cantidad_en_lista
   */
  async validarCantidadesPorItem(listaEquipoId: string) {
    try {
      const url = buildApiUrl(`${API_BASE}/listas/${listaEquipoId}`)
      const cookie = await getServerCookies()
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie && { 'Cookie': cookie })
        },
        credentials: 'include'
      })

      const data = await handleApiResponse<any>(response)
      const lista = data.data

      if (!lista) {
        throw new Error('Lista no encontrada')
      }

      const validaciones = lista.listaEquipoItem?.map((item: any) => {
        const cantidadPedida = lista.pedidoEquipo?.reduce((sum: number, pedido: any) => {
          const itemPedido = pedido.pedidoEquipoItem?.find((pi: any) => pi.listaEquipoItemId === item.id)
          return sum + (itemPedido?.cantidadPedida || 0)
        }, 0) || 0
        
        return {
          itemId: item.id,
          codigo: item.codigo,
          cantidadLista: item.cantidad,
          cantidadPedida,
          excedeCantidad: cantidadPedida > item.cantidad,
          porcentajeEjecutado: item.cantidad > 0 ? (cantidadPedida / item.cantidad) * 100 : 0
        }
      }) || []
      
      return {
        validaciones,
        itemsExcedidos: validaciones.filter((v: any) => v.excedeCantidad),
        resumen: {
          totalItems: validaciones.length,
          itemsExcedidos: validaciones.filter((v: any) => v.excedeCantidad).length,
          porcentajeEjecutadoPromedio: validaciones.length > 0 
            ? validaciones.reduce((sum: number, v: any) => sum + v.porcentajeEjecutado, 0) / validaciones.length 
            : 0
        }
      }
    } catch (error) {
      console.error('Error al validar cantidades por item:', error)
      throw error
    }
  }
}

// 📤 Exportar todos los servicios
// 🔧 Funciones de conveniencia para compatibilidad con páginas existentes

/**
 * 🔍 Obtener proyecto específico de aprovisionamiento por ID
 */
export async function getProyectoAprovisionamiento(proyectoId: string): Promise<ProyectoAprovisionamiento | null> {
  try {
    return await proyectosAprovisionamientoService.obtenerProyectoPorId(proyectoId)
  } catch (error) {
    console.error('Error al obtener proyecto de aprovisionamiento:', error)
    return null
  }
}

/**
 * 📋 Obtener listas de equipo por proyecto
 */
export async function getListasEquipoByProyecto(proyectoId: string): Promise<ResponseListas> {
  try {
    return await listasEquipoService.obtenerListas({ proyectoId })
  } catch (error) {
    console.error('Error al obtener listas por proyecto:', error)
    return {
      success: false,
      data: {
        listas: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 🛒 Obtener pedidos de equipo por proyecto
 */
export async function getPedidosEquipoByProyecto(proyectoId: string): Promise<ResponsePedidos> {
  try {
    return await pedidosEquipoService.obtenerPedidos({ proyectoId })
  } catch (error) {
    console.error('Error al obtener pedidos por proyecto:', error)
    return {
      success: false,
      data: {
        pedidos: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 📋 Obtener listas de equipo con filtros (función de compatibilidad)
 */
export async function getListasEquipo(filtros: {
  proyectoId?: string
  estado?: string
  fechaInicio?: string
  fechaFin?: string
  montoMin?: number
  montoMax?: number
  soloCoherencia?: boolean
  busqueda?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}): Promise<ResponseListas> {
  try {
    // 🔄 Mapear parámetros para compatibilidad con listasEquipoService
    const filtrosMapeados = {
      proyectoId: filtros.proyectoId,
      estado: filtros.estado ? [filtros.estado] : undefined, // ✅ Convertir string a array
      responsableId: undefined, // ✅ No disponible en filtros de entrada
      fechaDesde: filtros.fechaInicio, // ✅ Mapear 'fechaInicio' a 'fechaDesde'
      fechaHasta: filtros.fechaFin, // ✅ Mapear 'fechaFin' a 'fechaHasta'
      montoMinimo: filtros.montoMin, // ✅ Mapear 'montoMin' a 'montoMinimo'
      montoMaximo: filtros.montoMax, // ✅ Mapear 'montoMax' a 'montoMaximo'
      page: filtros.page,
      limit: filtros.limit
    }
    return await listasEquipoService.obtenerListas(filtrosMapeados)
  } catch (error) {
    console.error('Error al obtener listas de equipo:', error)
    return {
      success: false,
      data: {
        listas: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 🛒 Obtener pedidos de equipo con filtros (función de compatibilidad)
 */
export async function getPedidosEquipo(filtros: {
  proyectoId?: string
  proveedorId?: string
  estado?: string
  fechaInicio?: string
  fechaFin?: string
  montoMin?: number
  montoMax?: number
  coherencia?: string
  lista?: string
  busqueda?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}): Promise<ResponsePedidos> {
  try {
    // 🔄 Mapear parámetros para compatibilidad con pedidosEquipoService
    const filtrosMapeados = {
      proyectoId: filtros.proyectoId,
      listaEquipoId: filtros.lista, // ✅ Mapear 'lista' a 'listaEquipoId'
      estado: filtros.estado ? [filtros.estado] : undefined, // ✅ Convertir string a array
      proveedorId: filtros.proveedorId,
      fechaDesde: filtros.fechaInicio, // ✅ Mapear 'fechaInicio' a 'fechaDesde'
      fechaHasta: filtros.fechaFin, // ✅ Mapear 'fechaFin' a 'fechaHasta'
      montoMinimo: filtros.montoMin, // ✅ Mapear 'montoMin' a 'montoMinimo'
      montoMaximo: filtros.montoMax, // ✅ Mapear 'montoMax' a 'montoMaximo'
      busqueda: filtros.busqueda,
      page: filtros.page,
      limit: filtros.limit
    }
    return await pedidosEquipoService.obtenerPedidos(filtrosMapeados)
  } catch (error) {
    console.error('Error al obtener pedidos de equipo:', error)
    return {
      success: false,
      data: {
        pedidos: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: new Date().toISOString()
    }
  }
}

// 📡 Función para obtener un pedido específico
export async function getPedidoEquipo(pedidoId: string) {
  try {
    const cookies = await getServerCookies()
    const response = await fetch(buildApiUrl(`${API_BASE}/pedidos/${pedidoId}`), {
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { Cookie: cookies })
      },
      cache: 'no-store'
    })
    
    return await handleApiResponse(response)
  } catch (error) {
    console.error('❌ Error al obtener pedido:', error)
    throw error
  }
}

// 📡 Función para obtener items de un pedido (extraídos del detalle del pedido)
export async function getItemsPedido(pedidoId: string) {
  try {
    const pedido = await getPedidoEquipo(pedidoId)
    const data = (pedido as any)?.data || pedido
    return { success: true, data: data?.pedidoEquipoItem || [] }
  } catch (error) {
    console.error('❌ Error al obtener items del pedido:', error)
    return { success: false, data: [] }
  }
}

// 📡 Función para obtener documentos de un pedido (pendiente de implementación)
export async function getDocumentosPedido(_pedidoId: string) {
  return { success: true, data: [] }
}

export default {
  proyectos: proyectosAprovisionamientoService,
  timeline: timelineGanttService,
  listas: listasEquipoService,
  pedidos: pedidosEquipoService,
  alertas: alertasService,
  reportes: reportesService,
  utilidades: utilidadesService,
  validacion: validacionCoherenciaService
}
