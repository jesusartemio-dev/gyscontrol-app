// ===================================================
// 📁 Archivo: master-detail.ts
// 📌 Ubicación: src/types/
// 🔧 Descripción: Interfaces TypeScript específicas para el patrón
//    Master-Detail de las Listas de Equipos
// 🧠 Uso: Define las estructuras de datos optimizadas para las vistas
//    Master (resumen) y Detail (completa) de las listas de equipos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Creado: 2025-01-15
// ===================================================

import type {
  EstadoListaEquipo,
  EstadoListaItem,
  OrigenListaItem,
  ListaEquipo,
  ListaEquipoItem,
  Proyecto
} from './modelos'

// ==============================================
// 🎯 MASTER VIEW - Vista de Resumen de Listas
// ==============================================

/**
 * Interface optimizada para la vista Master (lista de resumen)
 * Contiene solo los datos esenciales para mostrar cards compactas
 */
export interface ListaEquipoMaster {
  id: string
  codigo: string
  nombre: string
  numeroSecuencia: number
  estado: EstadoListaEquipo
  createdAt: string
  updatedAt: string
  
  // 📅 Fechas de seguimiento
  fechaAprobacion?: string
  fechaAprobacionFinal?: string
  fechaAprobacionRevision?: string
  fechaNecesaria?: string
  fechaModificacion?: string
  
  // 👤 Información de modificación
  modificadoPor?: string
  
  // 📊 Estadísticas calculadas para la vista Master
  stats: {
    totalItems: number
    itemsVerificados: number
    itemsAprobados: number
    costoTotal: number
    costoAprobado: number
    // 📦 Estadísticas de pedidos
    itemsConPedido: number
    itemsSinPedido: number
    numeroPedidos: number
    pedidosCompletos: number
    pedidosParciales: number
    pedidosPendientes: number
  }
  
  // 🏗️ Información mínima del proyecto
  proyecto: {
    id: string
    nombre: string
    codigo: string
  }
  
  // 👤 Información del responsable (si aplica)
  responsable?: {
    id: string
    name: string
  }
  
  // 🎯 Coherencia calculada (porcentaje de consistencia)
  coherencia?: number
}

/**
 * Props para el componente Master List
 */
export interface ListaEquipoMasterListProps {
  listas: ListaEquipoMaster[]
  proyectoId: string
  isLoading?: boolean
  onCreateLista?: (payload: any) => Promise<void>
  onNavigateToDetail?: (listaId: string) => void
  onDeleteLista?: (listaId: string) => Promise<void>
  className?: string
}

/**
 * Props para cada card en la vista Master
 */
export interface ListaEquipoMasterCardProps {
  lista: ListaEquipoMaster
  onNavigateToDetail: (listaId: string) => void
  onDelete?: (listaId: string) => Promise<void>
  className?: string
}

// ==============================================
// 🔍 DETAIL VIEW - Vista Completa de Lista
// ==============================================

/**
 * Interface completa para la vista Detail
 * Incluye todos los datos necesarios para la gestión completa
 */
export interface ListaEquipoDetail extends ListaEquipo {
  // 📊 Estadísticas extendidas calculadas
  stats?: {
    totalItems: number
    itemsVerificados: number
    itemsAprobados: number
    itemsPendientes: number
    costoTotal: number
    costoAprobado: number
    costoPendiente: number
    
    // 📈 Estadísticas por origen
    itemsPorOrigen: {
      cotizado: number
      nuevo: number
      reemplazo: number
    }
    
    // 📋 Estadísticas de pedidos
    itemsConPedido: number
    itemsSinPedido: number
  }
  
  // 📊 Estadísticas de aprovisionamiento (desde API)
  estadisticas?: {
    totalItems: number
    totalPedidos: number
    montoTotal: number
    porcentajeEjecutado: number
  }
  
  // 🏗️ Información completa del proyecto
  proyecto: Proyecto
  
  // 📦 Items con información extendida
  items: ListaEquipoItemDetail[]
}

/**
 * Interface extendida para items en la vista Detail
 */
export interface ListaEquipoItemDetail extends ListaEquipoItem {
  // 📊 Información calculada del item
  calculated: {
    costoTotal: number
    tienePedidos: boolean
    cantidadPedida: number
    cantidadPendiente: number
    estadoPedido?: string
  }
  
  // 🔄 Estado de edición inline
  editing?: {
    cantidad: boolean
    comentario: boolean
  }
}

/**
 * Props para el componente Detail View
 */
export interface ListaEquipoDetailViewProps {
  listaId: string
  lista?: ListaEquipoDetail
  isLoading?: boolean
  onUpdateLista?: (payload: any) => Promise<void>
  onDeleteLista?: () => Promise<void>
  onCreatePedido?: (itemsSeleccionados: string[]) => Promise<void>
  onNavigateBack?: () => void
  className?: string
}

/**
 * Props para la tabla de items en Detail View
 */
export interface ListaEquipoItemTableProps {
  items: ListaEquipoItemDetail[]
  listaId: string
  listaEstado: EstadoListaEquipo
  isLoading?: boolean
  onUpdateItem?: (itemId: string, payload: any) => Promise<void>
  onDeleteItem?: (itemId: string) => Promise<void>
  onToggleVerificado?: (itemId: string, verificado: boolean, comentario?: string) => Promise<void>
  className?: string
}

// ==============================================
// 🔧 UTILIDADES Y HELPERS
// ==============================================

/**
 * Filtros disponibles para las listas
 */
export interface ListaEquipoFilters {
  estado?: EstadoListaEquipo[]
  fechaDesde?: string
  fechaHasta?: string
  busqueda?: string
  responsableId?: string
}

/**
 * Opciones de ordenamiento
 */
export interface ListaEquipoSortOptions {
  campo: 'nombre' | 'codigo' | 'estado' | 'createdAt' | 'updatedAt' | 'totalItems' | 'costoTotal'
  direccion: 'asc' | 'desc'
}

/**
 * Configuración de vista (Master/Detail)
 */
export interface ListaEquipoViewConfig {
  vista: 'master' | 'detail'
  filtros: ListaEquipoFilters
  ordenamiento: ListaEquipoSortOptions
  paginacion: {
    pagina: number
    limite: number
    total: number
  }
}

/**
 * Estados de carga para diferentes operaciones
 */
export interface ListaEquipoLoadingStates {
  loading: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
  loadingItems: boolean
  updatingItem: boolean
  creatingPedido: boolean
}

/**
 * Acciones disponibles según el estado de la lista
 */
export interface ListaEquipoActions {
  canEdit: boolean
  canDelete: boolean
  canAddItems: boolean
  canCreatePedido: boolean
  canApprove: boolean
  canReject: boolean
  canSendToReview: boolean
}

// ==============================================
// 🎨 UI COMPONENTS PROPS
// ==============================================

/**
 * Props para el header de la vista Detail
 */
export interface ListaEquipoDetailHeaderProps {
  lista: ListaEquipoDetail
  actions: ListaEquipoActions
  loadingStates: ListaEquipoLoadingStates
  onUpdateEstado?: (nuevoEstado: EstadoListaEquipo) => Promise<void>
  onDelete?: () => Promise<void>
  onNavigateBack?: () => void
}

/**
 * Props para las estadísticas en ambas vistas
 */
export interface ListaEquipoStatsProps {
  stats: ListaEquipoMaster['stats'] | ListaEquipoDetail['stats']
  variant?: 'compact' | 'detailed'
  className?: string
}

/**
 * Props para los modales de acciones
 */
export interface ListaEquipoModalProps {
  isOpen: boolean
  onClose: () => void
  listaId: string
  onSuccess?: () => void
}

// ==============================================
// 🔄 TRANSFORMERS Y MAPPERS
// ==============================================

/**
 * Función para transformar ListaEquipo completa a Master
 */
export type ListaEquipoToMasterTransformer = (lista: ListaEquipo) => ListaEquipoMaster

/**
 * Función para transformar ListaEquipo a Detail
 */
export type ListaEquipoToDetailTransformer = (lista: ListaEquipo) => ListaEquipoDetail

/**
 * Función para calcular estadísticas
 */
export type StatsCalculator = (items: ListaEquipoItem[]) => ListaEquipoMaster['stats'] | ListaEquipoDetail['stats']

/**
 * Función para determinar acciones disponibles
 */
export type ActionsCalculator = (lista: ListaEquipo, userRole: string) => ListaEquipoActions
