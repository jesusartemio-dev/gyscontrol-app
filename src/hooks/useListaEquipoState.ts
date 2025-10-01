/**
 * 🚀 useListaEquipoState Hook - FASE 2 Performance Optimization
 * 
 * Hook personalizado para separar estado local (UI) vs estado global (datos)
 * Optimiza la gestión de filtros, selección y estado de UI sin afectar
 * el cache global de React Query.
 * 
 * Separación de responsabilidades:
 * - Estado Local: filtros, selección, ordenamiento, UI state
 * - Estado Global: datos de listas (React Query cache)
 * 
 * Optimizaciones FASE 2:
 * - Debounce inteligente para filtros
 * - Memoización de computaciones costosas
 * - Estado local optimizado con useReducer
 * - Callbacks estables con useCallback
 * - Sincronización eficiente con URL params
 * 
 * @author GYS Team
 * @version 2.0.0 - Performance Optimized
 */

'use client';

import { useState, useCallback, useMemo, useReducer, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import type { ListaEquipoDetail } from '@/types/master-detail';
import type { FiltrosListaEquipo } from '@/types/aprovisionamiento';
import type { EstadoListaEquipo } from '@/types/modelos';

// 🎯 Types for local UI state
interface SortConfig {
  key: keyof ListaEquipoDetail | 'proyecto' | 'montoTotal' | 'alertas';
  direction: 'asc' | 'desc';
}

interface ViewConfig {
  mode: 'table' | 'virtualized' | 'cards';
  itemsPerPage: number;
  showCoherenceIndicators: boolean;
  compactMode: boolean;
}

interface SelectionState {
  selectedIds: string[];
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

// 🎯 UI State interface
interface UIState {
  // Filters
  searchTerm: string;
  estadoFilter: EstadoListaEquipo | 'all';
  proyectoFilter: string | 'all';
  fechaDesde: string;
  fechaHasta: string;
  
  // Sorting
  sortConfig: SortConfig | null;
  
  // View configuration
  viewConfig: ViewConfig;
  
  // Selection
  selection: SelectionState;
  
  // UI flags
  isFilterPanelOpen: boolean;
  isExportDialogOpen: boolean;
  isBulkActionMode: boolean;
}

// 🎯 UI Actions
type UIAction =
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_ESTADO_FILTER'; payload: EstadoListaEquipo | 'all' }
  | { type: 'SET_PROYECTO_FILTER'; payload: string | 'all' }
  | { type: 'SET_FECHA_RANGE'; payload: { desde: string; hasta: string } }
  | { type: 'SET_SORT_CONFIG'; payload: SortConfig | null }
  | { type: 'SET_VIEW_MODE'; payload: ViewConfig['mode'] }
  | { type: 'SET_ITEMS_PER_PAGE'; payload: number }
  | { type: 'TOGGLE_COHERENCE_INDICATORS' }
  | { type: 'TOGGLE_COMPACT_MODE' }
  | { type: 'SET_SELECTED_IDS'; payload: string[] }
  | { type: 'SELECT_ALL'; payload: { ids: string[]; isSelected: boolean } }
  | { type: 'SELECT_ITEM'; payload: { id: string; isSelected: boolean } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_FILTER_PANEL' }
  | { type: 'TOGGLE_EXPORT_DIALOG' }
  | { type: 'TOGGLE_BULK_ACTION_MODE' }
  | { type: 'RESET_FILTERS' }
  | { type: 'LOAD_FROM_URL'; payload: Partial<UIState> };

// 🎯 Initial state
const initialUIState: UIState = {
  searchTerm: '',
  estadoFilter: 'all',
  proyectoFilter: 'all',
  fechaDesde: '',
  fechaHasta: '',
  sortConfig: null,
  viewConfig: {
    mode: 'table',
    itemsPerPage: 50,
    showCoherenceIndicators: true,
    compactMode: false,
  },
  selection: {
    selectedIds: [],
    isAllSelected: false,
    isPartiallySelected: false,
  },
  isFilterPanelOpen: false,
  isExportDialogOpen: false,
  isBulkActionMode: false,
};

// 🚀 OPTIMIZED: UI State reducer
function uiStateReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.payload,
      };

    case 'SET_ESTADO_FILTER':
      return {
        ...state,
        estadoFilter: action.payload,
      };

    case 'SET_PROYECTO_FILTER':
      return {
        ...state,
        proyectoFilter: action.payload,
      };

    case 'SET_FECHA_RANGE':
      return {
        ...state,
        fechaDesde: action.payload.desde,
        fechaHasta: action.payload.hasta,
      };

    case 'SET_SORT_CONFIG':
      return {
        ...state,
        sortConfig: action.payload,
      };

    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewConfig: {
          ...state.viewConfig,
          mode: action.payload,
        },
      };

    case 'SET_ITEMS_PER_PAGE':
      return {
        ...state,
        viewConfig: {
          ...state.viewConfig,
          itemsPerPage: action.payload,
        },
      };

    case 'TOGGLE_COHERENCE_INDICATORS':
      return {
        ...state,
        viewConfig: {
          ...state.viewConfig,
          showCoherenceIndicators: !state.viewConfig.showCoherenceIndicators,
        },
      };

    case 'TOGGLE_COMPACT_MODE':
      return {
        ...state,
        viewConfig: {
          ...state.viewConfig,
          compactMode: !state.viewConfig.compactMode,
        },
      };

    case 'SET_SELECTED_IDS':
      const selectedIds = action.payload;
      return {
        ...state,
        selection: {
          selectedIds,
          isAllSelected: false, // Will be computed separately
          isPartiallySelected: selectedIds.length > 0,
        },
      };

    case 'SELECT_ALL':
      return {
        ...state,
        selection: {
          selectedIds: action.payload.isSelected ? action.payload.ids : [],
          isAllSelected: action.payload.isSelected,
          isPartiallySelected: false,
        },
      };

    case 'SELECT_ITEM':
      const currentIds = state.selection.selectedIds;
      const newIds = action.payload.isSelected
        ? [...currentIds, action.payload.id]
        : currentIds.filter(id => id !== action.payload.id);
      
      return {
        ...state,
        selection: {
          selectedIds: newIds,
          isAllSelected: false, // Will be computed separately
          isPartiallySelected: newIds.length > 0,
        },
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selection: {
          selectedIds: [],
          isAllSelected: false,
          isPartiallySelected: false,
        },
        isBulkActionMode: false,
      };

    case 'TOGGLE_FILTER_PANEL':
      return {
        ...state,
        isFilterPanelOpen: !state.isFilterPanelOpen,
      };

    case 'TOGGLE_EXPORT_DIALOG':
      return {
        ...state,
        isExportDialogOpen: !state.isExportDialogOpen,
      };

    case 'TOGGLE_BULK_ACTION_MODE':
      return {
        ...state,
        isBulkActionMode: !state.isBulkActionMode,
        selection: state.isBulkActionMode ? {
          selectedIds: [],
          isAllSelected: false,
          isPartiallySelected: false,
        } : state.selection,
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        searchTerm: '',
        estadoFilter: 'all',
        proyectoFilter: 'all',
        fechaDesde: '',
        fechaHasta: '',
        sortConfig: null,
      };

    case 'LOAD_FROM_URL':
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}

// 🚀 MAIN: useListaEquipoState hook
export function useListaEquipoState(listas: ListaEquipoDetail[] = []) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 🎯 UI State with reducer
  const [uiState, dispatch] = useReducer(uiStateReducer, initialUIState);
  
  // 🚀 OPTIMIZED: Debounced search term
  const debouncedSearchTerm = useDebounce(uiState.searchTerm, 300);
  
  // 🚀 OPTIMIZED: Memoized filters object for React Query
  const filters: FiltrosListaEquipo = useMemo(() => ({
    search: debouncedSearchTerm,
    estado: uiState.estadoFilter !== 'all' ? uiState.estadoFilter : undefined,
    proyectoId: uiState.proyectoFilter !== 'all' ? uiState.proyectoFilter : undefined,
    fechaDesde: uiState.fechaDesde || undefined,
    fechaHasta: uiState.fechaHasta || undefined,
    page: 1, // Always reset to first page when filters change
    limit: uiState.viewConfig.itemsPerPage,
  }), [
    debouncedSearchTerm,
    uiState.estadoFilter,
    uiState.proyectoFilter,
    uiState.fechaDesde,
    uiState.fechaHasta,
    uiState.viewConfig.itemsPerPage,
  ]);
  
  // 🚀 OPTIMIZED: Memoized filtered and sorted data
  const processedListas = useMemo(() => {
    let filtered = [...listas];
    
    // Apply local filtering (for client-side data)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(lista => 
        lista.codigo.toLowerCase().includes(searchLower) ||
        lista.nombre.toLowerCase().includes(searchLower) ||
        lista.proyecto?.nombre?.toLowerCase().includes(searchLower)
      );
    }
    
    if (uiState.estadoFilter !== 'all') {
      filtered = filtered.filter(lista => lista.estado === uiState.estadoFilter);
    }
    
    if (uiState.proyectoFilter !== 'all') {
      filtered = filtered.filter(lista => lista.proyectoId === uiState.proyectoFilter);
    }
    
    // Apply date range filter
    if (uiState.fechaDesde) {
      const fechaDesde = new Date(uiState.fechaDesde);
      filtered = filtered.filter(lista => 
        lista.fechaNecesaria && new Date(lista.fechaNecesaria) >= fechaDesde
      );
    }
    
    if (uiState.fechaHasta) {
      const fechaHasta = new Date(uiState.fechaHasta);
      filtered = filtered.filter(lista => 
        lista.fechaNecesaria && new Date(lista.fechaNecesaria) <= fechaHasta
      );
    }
    
    // Apply sorting
    if (uiState.sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (uiState.sortConfig!.key) {
          case 'proyecto':
            aValue = a.proyecto?.nombre || '';
            bValue = b.proyecto?.nombre || '';
            break;
          case 'montoTotal':
            aValue = a.stats?.costoTotal || 0;
            bValue = b.stats?.costoTotal || 0;
            break;
          case 'alertas':
            aValue = a.stats?.itemsRechazados || 0;
            bValue = b.stats?.itemsRechazados || 0;
            break;
          default:
            aValue = a[uiState.sortConfig!.key as keyof ListaEquipoDetail];
            bValue = b[uiState.sortConfig!.key as keyof ListaEquipoDetail];
        }
        
        if (aValue < bValue) {
          return uiState.sortConfig!.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return uiState.sortConfig!.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [listas, debouncedSearchTerm, uiState.estadoFilter, uiState.proyectoFilter, uiState.fechaDesde, uiState.fechaHasta, uiState.sortConfig]);
  
  // 🚀 OPTIMIZED: Memoized selection state computation
  const selectionState = useMemo(() => {
    const { selectedIds } = uiState.selection;
    const totalItems = processedListas.length;
    const isAllSelected = totalItems > 0 && selectedIds.length === totalItems;
    const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < totalItems;
    
    return {
      ...uiState.selection,
      isAllSelected,
      isPartiallySelected,
    };
  }, [uiState.selection, processedListas.length]);
  
  // 🚀 OPTIMIZED: Stable action handlers
  const actions = useMemo(() => ({
    // Filter actions
    setSearchTerm: (term: string) => dispatch({ type: 'SET_SEARCH_TERM', payload: term }),
    setEstadoFilter: (estado: EstadoListaEquipo | 'all') => dispatch({ type: 'SET_ESTADO_FILTER', payload: estado }),
    setProyectoFilter: (proyectoId: string | 'all') => dispatch({ type: 'SET_PROYECTO_FILTER', payload: proyectoId }),
    setFechaRange: (desde: string, hasta: string) => dispatch({ type: 'SET_FECHA_RANGE', payload: { desde, hasta } }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
    
    // Sort actions
    setSortConfig: (config: SortConfig | null) => dispatch({ type: 'SET_SORT_CONFIG', payload: config }),
    
    // View actions
    setViewMode: (mode: ViewConfig['mode']) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
    setItemsPerPage: (count: number) => dispatch({ type: 'SET_ITEMS_PER_PAGE', payload: count }),
    toggleCoherenceIndicators: () => dispatch({ type: 'TOGGLE_COHERENCE_INDICATORS' }),
    toggleCompactMode: () => dispatch({ type: 'TOGGLE_COMPACT_MODE' }),
    
    // Selection actions
    selectAll: (isSelected: boolean) => {
      const ids = isSelected ? processedListas.map(lista => lista.id) : [];
      dispatch({ type: 'SELECT_ALL', payload: { ids, isSelected } });
    },
    selectItem: (id: string, isSelected: boolean) => dispatch({ type: 'SELECT_ITEM', payload: { id, isSelected } }),
    clearSelection: () => dispatch({ type: 'CLEAR_SELECTION' }),
    
    // UI actions
    toggleFilterPanel: () => dispatch({ type: 'TOGGLE_FILTER_PANEL' }),
    toggleExportDialog: () => dispatch({ type: 'TOGGLE_EXPORT_DIALOG' }),
    toggleBulkActionMode: () => dispatch({ type: 'TOGGLE_BULK_ACTION_MODE' }),
  }), [processedListas]);
  
  // 🚀 OPTIMIZED: URL synchronization
  const syncWithURL = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update URL params
    if (uiState.searchTerm) {
      params.set('search', uiState.searchTerm);
    } else {
      params.delete('search');
    }
    
    if (uiState.estadoFilter !== 'all') {
      params.set('estado', uiState.estadoFilter);
    } else {
      params.delete('estado');
    }
    
    if (uiState.proyectoFilter !== 'all') {
      params.set('proyecto', uiState.proyectoFilter);
    } else {
      params.delete('proyecto');
    }
    
    if (uiState.viewConfig.mode !== 'table') {
      params.set('view', uiState.viewConfig.mode);
    } else {
      params.delete('view');
    }
    
    // Update URL without causing navigation
    const newURL = `${pathname}?${params.toString()}`;
    if (newURL !== `${pathname}?${searchParams.toString()}`) {
      router.replace(newURL, { scroll: false });
    }
  }, [uiState, pathname, searchParams, router]);
  
  // 🎯 Load state from URL on mount
  useEffect(() => {
    const urlState: Partial<UIState> = {};
    
    const search = searchParams.get('search');
    if (search) urlState.searchTerm = search;
    
    const estado = searchParams.get('estado') as EstadoListaEquipo;
    if (estado) urlState.estadoFilter = estado;
    
    const proyecto = searchParams.get('proyecto');
    if (proyecto) urlState.proyectoFilter = proyecto;
    
    const view = searchParams.get('view') as ViewConfig['mode'];
    if (view) {
      urlState.viewConfig = {
        ...initialUIState.viewConfig,
        mode: view,
      };
    }
    
    if (Object.keys(urlState).length > 0) {
      dispatch({ type: 'LOAD_FROM_URL', payload: urlState });
    }
  }, []); // Only run on mount
  
  // 🎯 Sync with URL when state changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(syncWithURL, 500);
    return () => clearTimeout(timeoutId);
  }, [syncWithURL]);
  
  return {
    // State
    uiState,
    filters, // For React Query
    processedListas, // For local rendering
    selectionState,
    
    // Actions
    actions,
    
    // Computed values
    hasActiveFilters: !!(uiState.searchTerm || uiState.estadoFilter !== 'all' || uiState.proyectoFilter !== 'all' || uiState.fechaDesde || uiState.fechaHasta),
    selectedCount: selectionState.selectedIds.length,
    totalCount: processedListas.length,
    
    // Utils
    syncWithURL,
  };
}

export type { UIState, SortConfig, ViewConfig, SelectionState };
export default useListaEquipoState;
