// ===================================================
// 📁 Archivo: master-detail-transformers.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Funciones utilitarias para transformar datos
//    entre las vistas Master y Detail de Listas de Equipos
// 🧠 Uso: Optimiza el rendimiento separando datos de resumen
//    de datos completos según la vista requerida
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Creado: 2025-01-15
// ===================================================

import type {
  ListaEquipo,
  ListaEquipoItem,
  EstadoListaEquipo,
  EstadoListaItem,
  OrigenListaItem
} from '@/types/modelos'

import type {
  ListaEquipoMaster,
  ListaEquipoDetail,
  ListaEquipoItemDetail,
  ListaEquipoActions,
  StatsCalculator,
  ListaEquipoToMasterTransformer,
  ListaEquipoToDetailTransformer,
  ActionsCalculator
} from '@/types/master-detail'

// ==============================================
// 📊 CALCULADORES DE ESTADÍSTICAS
// ==============================================

/**
 * Calcula estadísticas básicas para la vista Master
 */
export const calculateMasterStats = (items: ListaEquipoItem[]): ListaEquipoMaster['stats'] => {
  const stats = {
    totalItems: items.length,
    itemsVerificados: 0,
    itemsAprobados: 0,
    costoTotal: 0,
    costoAprobado: 0,
    // 📦 Estadísticas de pedidos (inicializadas en 0, se calculan en otro lugar)
    itemsConPedido: 0,
    itemsSinPedido: 0,
    numeroPedidos: 0,
    pedidosCompletos: 0,
    pedidosParciales: 0,
    pedidosPendientes: 0
  }

  items.forEach(item => {
    // ✅ Contadores por estado
    if (item.verificado) stats.itemsVerificados++
    if (item.estado === 'aprobado') stats.itemsAprobados++

    // 💰 Cálculos de costos
    const costoItem = item.precioElegido || item.presupuesto || 0
    const costoTotal = costoItem * item.cantidad
    
    stats.costoTotal += costoTotal
    if (item.estado === 'aprobado') {
      stats.costoAprobado += costoTotal
    }
  })

  return stats
}

/**
 * Calcula estadísticas extendidas para la vista Detail
 */
export const calculateDetailStats = (items: ListaEquipoItem[]): ListaEquipoDetail['stats'] => {
  const basicStats = calculateMasterStats(items)
  
  const extendedStats = {
    ...basicStats,
    itemsPendientes: 0,
    costoPendiente: 0,
    
    // 📈 Estadísticas por origen
    itemsPorOrigen: {
      cotizado: 0,
      nuevo: 0,
      reemplazo: 0
    },
    
    // 📋 Estadísticas de pedidos
    itemsConPedido: 0,
    itemsSinPedido: 0
  }

  items.forEach(item => {
    const costoItem = item.precioElegido || item.presupuesto || 0
    const costoTotal = costoItem * item.cantidad
    
    // ✅ Estados adicionales
    if (item.estado === 'por_revisar' || item.estado === 'por_cotizar' || item.estado === 'por_aprobar') {
      extendedStats.itemsPendientes++
      extendedStats.costoPendiente += costoTotal
    }
    
    // (rechazado state removed from ListaEquipoItem)
    
    // 📊 Por origen
    if (item.origen === 'cotizado') extendedStats.itemsPorOrigen.cotizado++
    else if (item.origen === 'nuevo') extendedStats.itemsPorOrigen.nuevo++
    else if (item.origen === 'reemplazo') extendedStats.itemsPorOrigen.reemplazo++
    
    // 📦 Pedidos
    if (item.pedidos && item.pedidos.length > 0) {
      extendedStats.itemsConPedido++
    } else {
      extendedStats.itemsSinPedido++
    }
  })

  return extendedStats
}

// ==============================================
// 🔄 TRANSFORMADORES DE DATOS
// ==============================================

/**
 * Transforma una ListaEquipo completa a formato Master (optimizado)
 */
export const transformToMaster: ListaEquipoToMasterTransformer = (lista: ListaEquipo): ListaEquipoMaster => {
  const stats = calculateMasterStats(lista.listaEquipoItem || [])
  
  return {
    id: lista.id,
    codigo: lista.codigo,
    nombre: lista.nombre,
    numeroSecuencia: lista.numeroSecuencia,
    estado: lista.estado,
    createdAt: lista.createdAt,
    updatedAt: lista.updatedAt,
    stats,
    proyecto: {
      id: lista.proyecto?.id || '',
      nombre: lista.proyecto?.nombre || '',
      codigo: lista.proyecto?.codigo || ''
    },
    responsable: lista.proyecto?.gestor ? {
      id: lista.proyecto.gestor.id,
      name: lista.proyecto.gestor.name || 'Sin nombre'
    } : undefined
  }
}

/**
 * Transforma una ListaEquipo a formato Detail (completo)
 */
export const transformToDetail: ListaEquipoToDetailTransformer = (lista: ListaEquipo): ListaEquipoDetail => {
  const stats = calculateDetailStats(lista.listaEquipoItem || [])
  const itemsDetail = (lista.listaEquipoItem || []).map(transformItemToDetail)
  
  return {
    ...lista,
    stats,
    items: itemsDetail
  } as ListaEquipoDetail
}

/**
 * Transforma un ListaEquipoItem a formato Detail con información calculada
 */
export const transformItemToDetail = (item: ListaEquipoItem): ListaEquipoItemDetail => {
  const costoUnitario = item.precioElegido || item.presupuesto || 0
  const costoTotal = costoUnitario * item.cantidad
  
  // 📦 Información de pedidos
  const cantidadPedida = item.pedidos?.reduce((sum, pedido) => sum + pedido.cantidadPedida, 0) || 0
  const cantidadPendiente = Math.max(0, item.cantidad - cantidadPedida)
  const tienePedidos = (item.pedidos?.length || 0) > 0
  
  // 📊 Estado de pedido general
  let estadoPedido: string | undefined
  if (cantidadPedida === 0) estadoPedido = 'sin_pedido'
  else if (cantidadPedida >= item.cantidad) estadoPedido = 'completo'
  else estadoPedido = 'parcial'
  
  return {
    ...item,
    calculated: {
      costoTotal,
      tienePedidos,
      cantidadPedida,
      cantidadPendiente,
      estadoPedido
    },
    editing: {
      cantidad: false,
      comentario: false
    }
  }
}

// ==============================================
// 🔐 CALCULADOR DE ACCIONES DISPONIBLES
// ==============================================

/**
 * Determina qué acciones están disponibles según el estado de la lista y rol del usuario
 */
export const calculateAvailableActions: ActionsCalculator = (
  lista: ListaEquipo,
  userRole: string
): ListaEquipoActions => {
  const estado = lista.estado
  const isAdmin = userRole === 'admin'
  const isGerente = userRole === 'gerente'
  const isGestor = userRole === 'gestor'
  const isCoordinador = userRole === 'coordinador'
  const isProyectos = userRole === 'proyectos'
  
  // 🔐 Permisos base por rol
  const canManage = isAdmin || isGerente || isGestor
  const canCoordinate = canManage || isCoordinador
  const canProject = canCoordinate || isProyectos
  
  return {
    // ✏️ Edición general
    canEdit: estado === 'borrador' && canProject,
    
    // 🗑️ Eliminación
    canDelete: estado === 'borrador' && canManage,
    
    // ➕ Agregar items
    canAddItems: (estado === 'borrador' || estado === 'por_revisar') && canProject,
    
    // 📦 Crear pedido
    canCreatePedido: estado === 'aprobada' && canProject,
    
    // ✅ Aprobar
    canApprove: (
      (estado === 'por_aprobar' && canManage)
    ),

    // ❌ Rechazar
    canReject: (
      (estado === 'por_aprobar' && canManage) ||
      (estado === 'por_revisar' && canCoordinate)
    ),
    
    // 📤 Enviar a revisión
    canSendToReview: estado === 'borrador' && canProject
  }
}

// ==============================================
// 🎨 HELPERS DE UI
// ==============================================

/**
 * Obtiene el color del badge según el estado de la lista
 */
export const getEstadoListaBadgeVariant = (estado: EstadoListaEquipo) => {
  switch (estado) {
    case 'borrador': return 'secondary'
    case 'por_revisar': return 'outline'
    case 'por_cotizar': return 'outline'
    case 'por_aprobar': return 'default'
    case 'aprobada': return 'default'
    case 'anulada': return 'destructive'
    default: return 'secondary'
  }
}

/**
 * Obtiene el color del badge según el estado del item
 */
export const getEstadoItemBadgeVariant = (estado: EstadoListaItem) => {
  switch (estado) {
    case 'borrador': return 'secondary'
    case 'por_revisar': return 'outline'
    case 'por_cotizar': return 'outline'
    case 'por_aprobar': return 'default'
    case 'aprobado': return 'default'
    default: return 'secondary'
  }
}

/**
 * Obtiene el color del badge según el origen del item
 */
export const getOrigenItemBadgeVariant = (origen: OrigenListaItem) => {
  switch (origen) {
    case 'cotizado': return 'default'
    case 'nuevo': return 'secondary'
    case 'reemplazo': return 'outline'
    default: return 'secondary'
  }
}

/**
 * Formatea un número como moneda
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Formatea una fecha de manera legible
 */
export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateString))
}

/**
 * Calcula el porcentaje de progreso de una lista
 */
export const calculateProgress = (stats: ListaEquipoMaster['stats'] | ListaEquipoDetail['stats']): number => {
  if (!stats || stats.totalItems === 0) return 0
  return Math.round((stats.itemsAprobados / stats.totalItems) * 100)
}

// ==============================================
// 🔍 FILTROS Y BÚSQUEDA
// ==============================================

/**
 * Filtra listas según criterios de búsqueda
 */
export const filterListas = (
  listas: ListaEquipoMaster[],
  filters: {
    busqueda?: string
    estado?: EstadoListaEquipo[]
    fechaDesde?: string
    fechaHasta?: string
  }
): ListaEquipoMaster[] => {
  return listas.filter(lista => {
    // 🔍 Búsqueda por texto
    if (filters.busqueda) {
      const searchTerm = filters.busqueda.toLowerCase()
      const matchesSearch = 
        lista.nombre.toLowerCase().includes(searchTerm) ||
        lista.codigo.toLowerCase().includes(searchTerm) ||
        lista.proyecto.nombre.toLowerCase().includes(searchTerm)
      
      if (!matchesSearch) return false
    }
    
    // 📊 Filtro por estado
    if (filters.estado && filters.estado.length > 0) {
      if (!filters.estado.includes(lista.estado)) return false
    }
    
    // 📅 Filtro por fecha
    if (filters.fechaDesde) {
      if (new Date(lista.createdAt) < new Date(filters.fechaDesde)) return false
    }
    
    if (filters.fechaHasta) {
      if (new Date(lista.createdAt) > new Date(filters.fechaHasta)) return false
    }
    
    return true
  })
}

/**
 * Ordena listas según criterios especificados
 */
export const sortListas = (
  listas: ListaEquipoMaster[],
  sortBy: 'nombre' | 'codigo' | 'estado' | 'createdAt' | 'updatedAt' | 'totalItems' | 'costoTotal',
  direction: 'asc' | 'desc' = 'desc'
): ListaEquipoMaster[] => {
  return [...listas].sort((a, b) => {
    let valueA: any
    let valueB: any
    
    switch (sortBy) {
      case 'totalItems':
        valueA = a.stats.totalItems
        valueB = b.stats.totalItems
        break
      case 'costoTotal':
        valueA = a.stats.costoTotal
        valueB = b.stats.costoTotal
        break
      case 'createdAt':
      case 'updatedAt':
        valueA = new Date(a[sortBy]).getTime()
        valueB = new Date(b[sortBy]).getTime()
        break
      default:
        valueA = a[sortBy]
        valueB = b[sortBy]
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1
    if (valueA > valueB) return direction === 'asc' ? 1 : -1
    return 0
  })
}
