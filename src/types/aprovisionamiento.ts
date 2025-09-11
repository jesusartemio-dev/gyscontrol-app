// ✅ Types y interfaces para el sistema de Aprovisionamiento Financiero
// 📋 Basado en PROCEDIMIENTO_APROVISIONAMIENTO_FINANCIERO_V2.md

import type { EstadoListaEquipo, EstadoPedido, EstadoPedidoItem } from './modelos'

// 📊 Interfaces para Timeline y Gantt
export interface ItemGantt {
  id: string
  tipo: 'lista' | 'pedido'
  codigo: string
  nombre: string
  proyecto: {
    id: string
    nombre: string
    codigo?: string
  }
  fechaInicio: Date
  fechaFin: Date
  fechaNecesaria: Date
  monto: number
  estado: EstadoListaEquipo | EstadoPedido
  progreso: number
  alertas: AlertaTimeline[]
  color: string
  responsable?: string
  dependencias: string[]
  diasRetraso?: number // ✅ Días de retraso calculados vs fecha necesaria
  metadatos?: {
    tiempoEntregaDias?: number
    totalItems?: number
    [key: string]: any
  }
}

export interface ResumenTimeline {
  totalItems: number
  montoTotal: number
  itemsVencidos: number
  itemsEnRiesgo: number
  itemsConAlertas: number // ✅ Agregado para GanttChart
  porcentajeCompletado: number
  coherenciaPromedio: number // ✅ Agregado para GanttChart
  distribucionPorTipo: {
    listas: number
    pedidos: number
  }
  alertasPorPrioridad: {
    alta: number
    media: number
    baja: number
  }
}

export interface AlertaTimeline {
  tipo: 'error' | 'warning' | 'info'
  titulo: string
  mensaje: string
  prioridad: 'alta' | 'media' | 'baja'
}

export interface AlertaTimelineExtendida extends AlertaTimeline {
  itemId: string
  itemCodigo: string
  proyectoNombre: string
}

// 🔧 Interface para sugerencias de optimización
export interface SugerenciaOptimizacion {
  titulo: string
  descripcion: string
  impacto?: string
  acciones?: string[]
  prioridad: 'alta' | 'media' | 'baja'
  tipo: 'costo' | 'tiempo' | 'calidad' | 'riesgo'
}

// 📊 Interface para filtros de timeline
export interface FiltrosTimeline {
  proyectoIds?: string[]
  fechaInicio?: string // ISO string para compatibilidad con APIs
  fechaFin?: string // ISO string para compatibilidad con APIs
  tipoVista: 'gantt' | 'lista' | 'calendario'
  agrupacion: 'proyecto' | 'estado' | 'responsable' | 'proveedor' | 'fecha'
  validarCoherencia?: boolean
  incluirSugerencias?: boolean
  margenDias?: number
  alertaAnticipacion?: number
  soloAlertas?: boolean
}

// 📈 Interface para datos de timeline
export interface TimelineData {
  items: GanttItem[]
  resumen: ResumenTimeline
  validaciones?: ValidacionCoherencia[]
  alertas?: AlertaTimeline[]
  sugerencias?: SugerenciaOptimizacion[]
  configuracion?: ConfiguracionGantt
}

// 📊 Interfaces para datos de Gantt (legacy)
export interface GanttItem {
  id: string
  label: string
  titulo: string
  descripcion?: string
  tipo: 'lista' | 'pedido'
  start: Date
  end: Date
  fechaInicio: Date
  fechaFin: Date
  amount: number
  estado: EstadoListaEquipo | EstadoPedido
  color?: string
  progress?: number
  progreso?: number
  coherencia?: number
  dependencies?: string[]
  alertas?: AlertaTimeline[]
  diasRetraso?: number // ✅ Días de retraso calculados vs fecha necesaria
}

export interface GanttListaItem extends GanttItem {
  codigo: string
  fechaNecesaria: Date
  montoProyectado: number
  estado: EstadoListaEquipo
  proyectoId: string
  pedidosAsociados?: GanttPedidoItem[]
}

export interface GanttPedidoItem extends GanttItem {
  codigo: string
  fechaNecesaria: Date
  montoEjecutado: number
  estado: EstadoPedido
  listaEquipoId: string
  listaOrigenCodigo?: string
}

// 🔍 Interfaces para filtros
export interface FiltrosAprovisionamiento {
  proyectoId?: string
  estado?: EstadoListaEquipo | EstadoPedido
  fechaInicio?: Date
  fechaFin?: Date
  responsableId?: string
  montoMin?: number
  montoMax?: number
  busqueda?: string
}

// 📋 Filtros específicos para ListaEquipo
export interface FiltrosListaEquipo {
  busqueda?: string
  proyectoId?: string
  estado?: EstadoListaEquipo
  categoria?: string
  fechaCreacion?: {
    from?: Date
    to?: Date
  }
  fechaEntrega?: {
    from?: Date
    to?: Date
  }
  montoMinimo?: number
  montoMaximo?: number
  tieneObservaciones?: boolean
  soloVencidas?: boolean
  soloSinPedidos?: boolean
  coherenciaMinima?: number
}

// 🛒 Filtros específicos para PedidoEquipo
export interface FiltrosPedidoEquipo {
  busqueda?: string
  proyectoId?: string
  proveedorId?: string
  estado?: EstadoPedido
  fechaCreacion?: {
    from?: Date
    to?: Date
  }
  fechaEntrega?: {
    from?: Date
    to?: Date
  }
  montoMinimo?: number
  montoMaximo?: number
  tieneObservaciones?: boolean
  soloVencidos?: boolean
  soloSinRecibir?: boolean
  soloUrgentes?: boolean
  coherenciaMinima?: number
}

export interface FiltrosProyectos {
  comercialId?: string
  gestorId?: string
  estado?: 'activo' | 'inactivo'
  fechaInicioDesde?: Date
  fechaInicioHasta?: Date
  fechaFinDesde?: Date
  fechaFinHasta?: Date
  montoInternoMin?: number
  montoInternoMax?: number
  montoRealMin?: number
  montoRealMax?: number
}

export interface FiltrosProyectoAprovisionamiento {
  proyectoId?: string
  busqueda?: string
  estado?: string
  estadoAprovisionamiento?: string
  comercialId?: string
  clienteId?: string
  fechaInicio?: {
    desde: string
    hasta: string
  }
  fechaFin?: {
    desde: string
    hasta: string
  }
  montoMinimo?: number
  montoMaximo?: number
  desviacionMinima?: number
  desviacionMaxima?: number
  coherenciaMinima?: number
  soloConAlertas?: boolean
  incluirCompletados?: boolean
  page?: number
  limit?: number
}

// 📈 Interfaces para KPIs y métricas
export interface KPIAprovisionamiento {
  totalListas: number
  totalPedidos: number
  montoProyectado: number
  montoEjecutado: number
  porcentajeEjecucion: number
  desviacion: number
  alertasCriticas: number
  alertasAdvertencia: number
}

// 📊 Estadísticas consolidadas para componente Stats
export interface EstadisticasProyectoAprovisionamiento {
  // 📈 KPIs principales
  totalProyectos: number
  proyectosActivos: number
  proyectosCompletados: number
  proyectosConAlertas: number
  
  // 💰 Montos consolidados
  montoTotalInterno: number
  montoTotalCliente: number
  montoTotalReal: number
  montoTotalPendiente: number
  montoTotalListas: number
  montoTotalPedidos: number
  
  // 📊 Porcentajes y métricas
  porcentajeEjecucionPromedio: number
  desviacionPromedio: number
  eficienciaPresupuestaria: number
  
  // 🚨 Alertas y coherencia
  alertasCriticas: number
  alertasAdvertencia: number
  alertasInformativas: number
  coherenciaPromedio: number
  promedioCoherencia: number // ✅ Alias para compatibilidad
  
  // 📅 Distribución temporal
  proyectosPorEstado: {
    estado: string
    cantidad: number
    porcentaje: number
    color: string
  }[]
  
  // 📊 Distribuciones adicionales
  distribucionEstados?: {
    estado: string
    cantidad: number
    porcentaje: number
    color: string
  }[]
  
  distribucionAprovisionamiento?: {
    tipo: string
    cantidad: number
    porcentaje: number
    color: string
  }[]
  
  // 🚨 Alertas globales
  alertasGlobales?: {
    criticas: number
    advertencias: number
    informativas: number
  }
  
  // 🎯 Tendencias
  tendenciaEjecucion: {
    valor: number
    esPositiva: boolean
    etiqueta: string
  }
  
  tendenciaDesviacion: {
    valor: number
    esPositiva: boolean
    etiqueta: string
  }
  
  tendencias?: {
    ejecucion: {
      valor: number
      esPositiva: boolean
      etiqueta: string
    }
    desviacion: {
      valor: number
      esPositiva: boolean
      etiqueta: string
    }
  }
}

export interface ResumenProyecto {
  id: string
  nombre: string
  codigo?: string
  clienteNombre?: string
  comercialNombre?: string
  gestorNombre?: string
  fechaInicio?: Date
  fechaFin?: Date
  estado: string
  // Montos presupuestados
  totalInterno: number
  totalCliente: number
  grandTotal: number
  descuento: number
  // Montos reales
  totalReal: number
  // KPIs calculados
  porcentajeEjecucion: number
  desviacion: number
  duracionDias?: number
  estadoTemporal: 'pendiente' | 'en_curso' | 'completado' | 'vencido'
  // Contadores
  totalListas: number
  totalPedidos: number
  // Coherencia
  coherenciaEstado: 'ok' | 'advertencia' | 'critica'
  coherenciaMensaje?: string
}

export interface ProyectoAprovisionamiento {
  id: string
  nombre: string
  codigo?: string
  clienteId?: string
  clienteNombre?: string
  comercialId?: string
  comercialNombre?: string
  gestorId?: string
  gestorNombre?: string
  fechaInicio?: Date | string
  fechaFin?: Date | string
  estado: string
  totalCliente: number
  totalInterno: number
  totalReal: number
  porcentajeEjecucion?: number
  desviacion?: number
  coherenciaEstado?: 'ok' | 'advertencia' | 'critica'
  coherenciaMensaje?: string
  totalListas?: number
  totalPedidos?: number
  montoTotalListas?: number
  montoTotalPedidos?: number
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface CoherenciaIndicator {
  estado: 'ok' | 'advertencia' | 'critica'
  mensaje?: string
  porcentaje?: number
}

// 🔍 Validaciones de coherencia
export interface ValidacionCoherencia {
  listaId: string
  listaCodigo: string
  montoLista: number
  montoPedidos: number
  diferencia: number
  porcentajeDesviacion: number
  estado: 'ok' | 'advertencia' | 'critica'
  mensaje: string
  pedidosAsociados: {
    id: string
    codigo: string
    monto: number
    estado: EstadoPedido
  }[]
  esCoherente?: boolean
  alertas?: AlertaTimeline[]
  sugerencias?: SugerenciaOptimizacion[]
  estadisticas?: {
    totalListas?: number
    totalPedidos?: number
    coherenciaPromedio?: number
    totalValidaciones?: number
    erroresEncontrados?: number
    advertenciasEncontradas?: number
  }
}

export interface AlertaAprovisionamiento {
  id: string
  tipo: 'critica' | 'advertencia' | 'info'
  titulo: string
  mensaje: string
  fechaCreacion: Date
  proyectoId?: string
  listaId?: string
  pedidoId?: string
  leida: boolean
}

// 📊 Payloads para APIs
export interface PayloadListasGantt {
  proyectoId?: string
  filtros?: FiltrosAprovisionamiento
}

export interface PayloadPedidosGantt {
  proyectoId?: string
  listaEquipoId?: string
  filtros?: FiltrosAprovisionamiento
}

export interface PayloadTimelineUnificado {
  proyectoId?: string
  fechaInicio?: Date
  fechaFin?: Date
  incluirListas: boolean
  incluirPedidos: boolean
}

export interface PayloadValidarCoherencia {
  listaId?: string
  proyectoId?: string
  incluirDetalles: boolean
}

// 📈 Respuestas de APIs
export interface ResponseListas {
  success: boolean
  data: {
    listas: import('./master-detail').ListaEquipoDetail[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
  timestamp: string
}

export interface ResponsePedidos {
  success: boolean
  data: {
    pedidos: any[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
  timestamp: string
}

export interface ResponseListasGantt {
  listas: GanttListaItem[]
  resumen: {
    totalListas: number
    montoTotal: number
    fechaInicioMinima: Date
    fechaFinMaxima: Date
  }
}

export interface ResponsePedidosGantt {
  pedidos: GanttPedidoItem[]
  resumen: {
    totalPedidos: number
    montoTotal: number
    fechaInicioMinima: Date
    fechaFinMaxima: Date
  }
}

export interface ResponseTimelineUnificado {
  listas: GanttListaItem[]
  pedidos: GanttPedidoItem[]
  validaciones: ValidacionCoherencia[]
  kpis: KPIAprovisionamiento
  alertas: AlertaAprovisionamiento[]
}

export interface ResponseProyectosConsolidado {
  proyectos: ResumenProyecto[]
  resumen: {
    totalProyectos: number
    montoTotalInterno: number
    montoTotalReal: number
    porcentajeEjecucionPromedio: number
    proyectosConAlertas: number
  }
  filtrosAplicados: FiltrosProyectos
}

// 🎨 Configuración de UI
export interface ConfiguracionGantt {
  mostrarMontos: boolean
  mostrarEstados: boolean
  mostrarDependencias: boolean
  zoom: 'dia' | 'semana' | 'mes'
  colorPorEstado: Record<string, string>
}

export interface ConfiguracionTabla {
  columnas: string[]
  ordenamiento: {
    campo: string
    direccion: 'asc' | 'desc'
  }
  paginacion: {
    pagina: number
    tamanoPagina: number
  }
}

// 📄 Exportación y reportes
export interface OpcionesExportacion {
  formato: 'excel' | 'pdf' | 'csv'
  incluirGraficos: boolean
  incluirDetalles: boolean
  fechaInicio?: Date
  fechaFin?: Date
  filtros?: FiltrosAprovisionamiento
}

export interface ReporteAprovisionamiento {
  titulo: string
  fechaGeneracion: Date
  filtrosAplicados: FiltrosAprovisionamiento
  resumenEjecutivo: KPIAprovisionamiento
  proyectos: ResumenProyecto[]
  validaciones: ValidacionCoherencia[]
  alertas: AlertaAprovisionamiento[]
}

// 🔄 Estados de carga y errores
export interface EstadoCarga {
  cargando: boolean
  error?: string
  ultimaActualizacion?: Date
}

export interface ErrorAprovisionamiento {
  codigo: string
  mensaje: string
  detalles?: any
  timestamp: Date
}

// 📱 Responsive y accesibilidad
export interface ConfiguracionResponsive {
  mostrarSidebar: boolean
  mostrarFiltros: boolean
  vistaCompacta: boolean
  disposicion: 'tabla' | 'cards' | 'gantt'
}

// 🎯 Tipos de utilidad
export type TipoVista = 'listas' | 'pedidos' | 'proyectos' | 'timeline'
export type TipoAlerta = 'critica' | 'advertencia' | 'info'
export type EstadoCoherencia = 'ok' | 'advertencia' | 'critica'
export type FormatoExportacion = 'excel' | 'pdf' | 'csv' | 'png' | 'svg'

// 🔧 Configuración del sistema
export interface ConfiguracionAprovisionamiento {
  umbralAdvertencia: number // % de desviación para advertencia
  umbralCritico: number // % de desviación para alerta crítica
  diasAnticipacionAlerta: number // días antes de fecha necesaria
  actualizacionAutomatica: boolean
  intervaloActualizacion: number // minutos
  notificacionesHabilitadas: boolean
}

// 📊 Métricas de performance
export interface MetricasPerformance {
  tiempoCargaListas: number
  tiempoCargaPedidos: number
  tiempoCargaGantt: number
  cantidadRegistros: number
  memoriaUtilizada: number
  erroresRecientes: ErrorAprovisionamiento[]
}
