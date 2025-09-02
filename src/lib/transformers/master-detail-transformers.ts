/**
 * 🎯 Master-Detail Transformers
 * 
 * Transformadores de datos para el patrón Master-Detail de Listas de Equipos.
 * Optimiza el rendimiento separando datos de resumen de datos completos.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import type {
  ListaEquipo,
  ListaEquipoItem,
  EstadoListaEquipo,
  EstadoListaItem,
  OrigenListaItem
} from '@/types/modelos';

import type {
  ListaEquipoMaster,
  ListaEquipoDetail,
  ListaEquipoItemDetail,
  ListaEquipoActions,
  StatsCalculator,
  ListaEquipoToMasterTransformer,
  ListaEquipoToDetailTransformer,
  ActionsCalculator
} from '@/types/master-detail';

// ==============================================
// 📊 CALCULADORES DE ESTADÍSTICAS
// ==============================================

/**
 * Calcula estadísticas básicas para la vista Master
 */
export const calculateMasterStats: StatsCalculator = (items: ListaEquipoItem[]) => {
  const stats = {
    totalItems: items.length,
    itemsVerificados: 0,
    itemsAprobados: 0,
    itemsRechazados: 0,
    costoTotal: 0,
    costoAprobado: 0
  };

  items.forEach(item => {
    // ✅ Contadores por estado
    if (item.verificado) stats.itemsVerificados++;
    if (item.estado === 'aprobado') stats.itemsAprobados++;
    if (item.estado === 'rechazado') stats.itemsRechazados++;

    // 💰 Cálculos de costos
    const costoItem = item.precioElegido || item.presupuesto || 0;
    const costoTotal = costoItem * item.cantidad;
    
    stats.costoTotal += costoTotal;
    if (item.estado === 'aprobado') {
      stats.costoAprobado += costoTotal;
    }
  });

  return stats;
};

/**
 * Transforma una ListaEquipo completa a formato Master (optimizado)
 */
export const transformToMaster: ListaEquipoToMasterTransformer = (lista: ListaEquipo): ListaEquipoMaster => {
  const stats = calculateMasterStats(lista.items || []);
  
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
  };
};

// ==============================================
// 🔄 FUNCIONES PRINCIPALES PARA HOOKS
// ==============================================

/**
 * Transforma un array de ListaEquipo a formato Master
 */
export const transformToMasterList = (listas: ListaEquipo[]): ListaEquipoMaster[] => {
  return listas.map(transformToMaster);
};

/**
 * Calcula estadísticas agregadas de múltiples listas Master
 */
export const calculateMasterListStats = (listas: ListaEquipoMaster[]) => {
  const stats = {
    totalListas: listas.length,
    totalItems: 0,
    totalCosto: 0,
    costoAprobado: 0,
    listasPorEstado: {
      borrador: 0,
      por_revisar: 0,
      por_cotizar: 0,
      por_validar: 0,
      por_aprobar: 0,
      aprobado: 0,
      rechazado: 0
    },
    progresoPromedio: 0
  };

  listas.forEach(lista => {
    // ✅ Validar que lista.stats existe antes de acceder a sus propiedades
    if (lista.stats) {
      stats.totalItems += lista.stats.totalItems || 0;
      stats.totalCosto += lista.stats.costoTotal || 0;
      stats.costoAprobado += lista.stats.costoAprobado || 0;
    }
    
    // ✅ Incrementar contador por estado (siempre disponible)
    if (lista.estado && stats.listasPorEstado.hasOwnProperty(lista.estado)) {
      stats.listasPorEstado[lista.estado]++;
    }
  });

  // Calcular progreso promedio
  if (stats.totalListas > 0) {
    const progresoTotal = listas.reduce((sum, lista) => {
      // ✅ Validar que lista.stats existe antes de calcular progreso
      if (!lista.stats || !lista.stats.totalItems) {
        return sum; // No contribuye al progreso si no tiene stats o items
      }
      
      const progreso = (lista.stats.itemsAprobados || 0) / lista.stats.totalItems * 100;
      return sum + progreso;
    }, 0);
    stats.progresoPromedio = Math.round(progresoTotal / stats.totalListas);
  }

  return stats;
};

// ==============================================
// 🛠️ UTILIDADES MASTER LIST
// ==============================================

export const masterListUtils = {
  /**
   * Filtra listas por estado
   */
  filterByStatus: (listas: ListaEquipoMaster[], estados: EstadoListaEquipo[]): ListaEquipoMaster[] => {
    return listas.filter(lista => estados.includes(lista.estado));
  },

  /**
   * Filtra listas por progreso
   */
  filterByProgress: (listas: ListaEquipoMaster[], progreso: string): ListaEquipoMaster[] => {
    return listas.filter(lista => {
      const progresoLista = lista.stats.totalItems > 0 
        ? (lista.stats.itemsAprobados / lista.stats.totalItems) * 100 
        : 0;
      
      switch (progreso) {
        case 'sin_iniciar':
          return progresoLista === 0;
        case 'en_progreso':
          return progresoLista > 0 && progresoLista < 100;
        case 'aprobado':
          return progresoLista === 100;
        default:
          return true;
      }
    });
  },

  /**
   * Filtra listas por rango de costo
   */
  filterByCostRange: (
    listas: ListaEquipoMaster[], 
    costoMin?: number, 
    costoMax?: number
  ): ListaEquipoMaster[] => {
    return listas.filter(lista => {
      const costo = lista.stats.costoTotal;
      if (costoMin !== undefined && costo < costoMin) return false;
      if (costoMax !== undefined && costo > costoMax) return false;
      return true;
    });
  },

  /**
   * Ordena listas por criterio específico
   */
  sortBy: (
    listas: ListaEquipoMaster[], 
    sortBy: 'nombre' | 'codigo' | 'estado' | 'createdAt' | 'updatedAt' | 'totalItems' | 'costoTotal',
    direction: 'asc' | 'desc' = 'desc'
  ): ListaEquipoMaster[] => {
    return [...listas].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortBy) {
        case 'nombre':
        case 'codigo':
        case 'estado':
          valueA = a[sortBy];
          valueB = b[sortBy];
          break;
        case 'createdAt':
        case 'updatedAt':
          valueA = new Date(a[sortBy]);
          valueB = new Date(b[sortBy]);
          break;
        case 'totalItems':
          valueA = a.stats.totalItems;
          valueB = b.stats.totalItems;
          break;
        case 'costoTotal':
          valueA = a.stats.costoTotal;
          valueB = b.stats.costoTotal;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  /**
   * Calcula el progreso de una lista individual
   */
  calculateProgress: (lista: ListaEquipoMaster): number => {
    if (lista.stats.totalItems === 0) return 0;
    return Math.round((lista.stats.itemsAprobados / lista.stats.totalItems) * 100);
  },

  /**
   * Obtiene el color del badge según el estado
   */
  getEstadoBadgeVariant: (estado: EstadoListaEquipo) => {
    switch (estado) {
      case 'borrador':
        return 'secondary';
      case 'por_revisar':
        return 'outline';
      case 'por_validar':
        return 'default';
      case 'por_aprobar':
        return 'default';
      case 'aprobado':
        return 'default';
      case 'rechazado':
        return 'destructive';
      case 'por_cotizar':
        return 'outline';
      default:
        return 'secondary';
    }
  },

  /**
   * Formatea moneda
   */
  formatCurrency: (amount: number, currency: string = 'PEN'): string => {
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  },

  /**
   * Formatea fecha
   */
  formatDate: (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

// ==============================================
// 📤 EXPORTS ADICIONALES
// ==============================================

// Re-export funciones del archivo utils para compatibilidad
export {
  calculateDetailStats,
  transformToDetail,
  transformItemToDetail,
  calculateAvailableActions,
  getEstadoListaBadgeVariant,
  getEstadoItemBadgeVariant,
  getOrigenItemBadgeVariant,
  filterListas,
  sortListas
} from '@/lib/utils/master-detail-transformers';