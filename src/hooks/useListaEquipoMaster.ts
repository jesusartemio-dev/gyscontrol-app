/**
 * 🎯 useListaEquipoMaster Hook
 * 
 * Custom hook for managing equipment list data in Master-Detail pattern.
 * Features:
 * - Data fetching with SWR for caching and real-time updates
 * - Advanced filtering and sorting capabilities
 * - Pagination and infinite scroll support
 * - Selection management for bulk operations
 * - View mode persistence (grid/table)
 * - Real-time data synchronization
 * - Error handling and retry logic
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ListaEquipo } from '@/types/modelos';
import { ListaEquipoMaster } from '@/types/master-detail';
import { ListaEquipoUpdatePayload } from '@/types/payloads';
import { 
  getListasEquipoMaster,
  ListaEquipoMasterResponse,
  ListaEquipoFilters,
  ListaEquipoMaster as ServiceListaEquipoMaster
} from '@/lib/services/listaEquipo';
import { useListaEquipoSync } from './useListaEquipoSync';
import { 
  transformToMasterList,
  calculateMasterListStats,
  masterListUtils
} from '@/lib/transformers/master-detail-transformers';
import { FilterState } from '@/components/proyectos/ListaEquipoMasterFilters';

// ✅ Hook configuration interface
interface UseListaEquipoMasterConfig {
  proyectoId: string;
  initialFilters?: Partial<FilterState>;
  initialViewMode?: 'grid' | 'table';
  itemsPerPage?: number;
  enableRealTime?: boolean;
  enableSelection?: boolean;
}

// ✅ Sort options
export type SortOption = 
  | 'nombre-asc' 
  | 'nombre-desc'
  | 'fecha-asc' 
  | 'fecha-desc'
  | 'costo-asc' 
  | 'costo-desc'
  | 'progreso-asc' 
  | 'progreso-desc'
  | 'estado-asc' 
  | 'estado-desc';

// ✅ View mode type
export type ViewMode = 'grid' | 'table';

// ✅ Hook return interface
interface UseListaEquipoMasterReturn {
  // Data
  listas: ListaEquipoMaster[];
  filteredListas: ListaEquipoMaster[];
  stats: ReturnType<typeof calculateMasterListStats>;
  
  // Loading states
  loading: boolean;
  error: Error | null;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  
  // Filters and search
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  clearFilters: () => void;
  
  // Sorting
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  
  // Selection
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Actions
  refresh: () => Promise<void>;
  navigateToDetail: (listaId: string) => void;
  
  // CRUD operations
  updateLista: (listaId: string, payload: any) => Promise<any>;
  deleteLista: (listaId: string) => Promise<void>;
  
  // Sync operations
  syncMasterData: () => Promise<void>;
  invalidateCache: (listaId?: string) => void;
  emitSyncEvent: (event: any) => void;
  subscribeTo: (eventType: any, callback: (event: any) => void) => () => void;
  
  // Utilities
  isFiltered: boolean;
  hasSelection: boolean;
}

// ✅ Default filter state
const defaultFilters: FilterState = {
  search: '',
  estado: [],
  moneda: 'PEN',
  progreso: 'all'
};

// ✅ Main hook
export const useListaEquipoMaster = ({
  proyectoId,
  initialFilters = {},
  initialViewMode = 'grid',
  itemsPerPage: initialItemsPerPage = 12,
  enableRealTime = true,
  enableSelection = true
}: UseListaEquipoMasterConfig): UseListaEquipoMasterReturn => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🔄 State management
  const [filters, setFiltersState] = useState<FilterState>({
    ...defaultFilters,
    ...initialFilters
  });
  const [sortBy, setSortBy] = useState<SortOption>('fecha-desc');
  const [viewMode, setViewModeState] = useState<ViewMode>(initialViewMode);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 🔄 Initialize sync hook
  const {
    syncMasterData,
    invalidateCache,
    emitSyncEvent,
    subscribeTo,
    updateListaWithSync,
    deleteListaWithSync,
    isSyncing,
    lastSyncTime
  } = useListaEquipoSync({
    proyectoId,
    enableRealTime,
    enableOptimisticUpdates: true
  });
  
  // 📡 Data fetching with SWR using optimized Master endpoint
  const swrKey = useMemo(() => {
    const filterParams: ListaEquipoFilters = {
      proyectoId,
      search: filters.search || undefined,
      estado: filters.estado.length > 0 ? filters.estado.join(',') : undefined,
      page: currentPage,
      limit: itemsPerPage
    };
    return ['listas-equipo-master', filterParams];
  }, [proyectoId, filters.search, filters.estado, currentPage, itemsPerPage]);

  const {
    data: masterResponse,
    error,
    isLoading: loading,
    mutate
  } = useSWR(
    swrKey,
    ([_, filterParams]: [string, ListaEquipoFilters]) => getListasEquipoMaster(filterParams),
    {
      refreshInterval: enableRealTime ? 30000 : 0, // 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: (error) => {
        console.error('Error fetching equipment lists:', error);
        toast.error('Error al cargar las listas de equipos');
      }
    }
  );
  
  // 🔄 Refresh data with sync
  const refresh = useCallback(async () => {
    try {
      await syncMasterData();
      await mutate();
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Error al actualizar los datos');
    }
  }, [syncMasterData, mutate]);
  
  // 🔄 Update lista with sync
  const updateLista = useCallback(async (listaId: string, payload: ListaEquipoUpdatePayload) => {
    try {
      const updatedLista = await updateListaWithSync(listaId, payload);
      toast.success('Lista actualizada correctamente');
      return updatedLista;
    } catch (error) {
      console.error('Error updating lista:', error);
      toast.error('Error al actualizar la lista');
      throw error;
    }
  }, [updateListaWithSync]);
  
  // 🗑️ Delete lista with sync
  const deleteLista = useCallback(async (listaId: string) => {
    try {
      await deleteListaWithSync(listaId);
      toast.success('Lista eliminada correctamente');
    } catch (error) {
      console.error('Error deleting lista:', error);
      toast.error('Error al eliminar la lista');
      throw error;
    }
  }, [deleteListaWithSync]);
  
  // 🔄 Extract data from optimized Master response and convert to master-detail type
  const listas = useMemo(() => {
    if (!masterResponse?.data) return [];
    // Convert service type to master-detail type
    return masterResponse.data.map((lista: ServiceListaEquipoMaster): ListaEquipoMaster => ({
      ...lista,
      estado: lista.estado as any // Type assertion since both use EstadoListaEquipo now
    }));
  }, [masterResponse]);
  
  // 🔧 Helper function to parse SortOption
  const parseSortOption = (sortOption: SortOption): { field: string; direction: 'asc' | 'desc' } => {
    const [field, direction] = sortOption.split('-') as [string, 'asc' | 'desc'];
    
    // Map field names to match masterListUtils.sortBy expected fields
    const fieldMap: Record<string, string> = {
      'nombre': 'nombre',
      'fecha': 'updatedAt',
      'costo': 'costoTotal',
      'progreso': 'totalItems', // Use totalItems as proxy for progress
      'estado': 'estado'
    };
    
    return {
      field: fieldMap[field] || field,
      direction: direction || 'desc'
    };
  };

  // 🔍 Apply client-side filters (for filters not handled by server)
  const filteredListas = useMemo(() => {
    let result = [...listas];
    
    // Apply progress filter (client-side only)
    if (filters.progreso !== 'all') {
      result = masterListUtils.filterByProgress(result, filters.progreso);
    }
    
    // Apply date filters (client-side only)
    if (filters.fechaDesde) {
      result = result.filter(lista => 
        new Date(lista.updatedAt) >= filters.fechaDesde!
      );
    }
    
    if (filters.fechaHasta) {
      result = result.filter(lista => 
        new Date(lista.updatedAt) <= filters.fechaHasta!
      );
    }
    
    // Apply cost filters (client-side only)
    if (filters.costoMin !== undefined || filters.costoMax !== undefined) {
      result = masterListUtils.filterByCostRange(
        result, 
        filters.costoMin, 
        filters.costoMax
      );
    }
    
    // Apply items filters (client-side only)
    if (filters.itemsMin !== undefined) {
      result = result.filter(lista => lista.stats.totalItems >= filters.itemsMin!);
    }
    
    if (filters.itemsMax !== undefined) {
      result = result.filter(lista => lista.stats.totalItems <= filters.itemsMax!);
    }
    
    // Apply sorting (client-side)
    const { field, direction } = parseSortOption(sortBy);
    result = masterListUtils.sortBy(result, field as any, direction);
    
    return result;
  }, [listas, filters, sortBy]);
  
  // 📊 Calculate statistics from filtered data
  const stats = useMemo(() => {
    return calculateMasterListStats(filteredListas);
  }, [filteredListas]);
  
  // 📄 Calculate pagination from server response
  const totalPages = masterResponse?.pagination?.totalPages || 1;
  
  // 🔄 Handle filter changes
  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    setSelectedIds([]); // Clear selection when filters change
    
    // Refresh data when server-side filters change
    const serverFiltersChanged = (
      newFilters.search !== filters.search ||
      JSON.stringify(newFilters.estado) !== JSON.stringify(filters.estado)
    );
    
    if (serverFiltersChanged) {
      // SWR will automatically refetch due to key change
      setTimeout(() => refresh(), 100);
    }
  }, [filters.search, filters.estado, refresh]);
  
  // 🔄 Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [setFilters]);
  
  // 🔄 Handle view mode changes
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    // Persist view mode preference
    localStorage.setItem(`viewMode-${proyectoId}`, mode);
  }, [proyectoId]);
  
  // 🔄 Selection management
  const selectAll = useCallback(() => {
    const currentPageStart = (currentPage - 1) * itemsPerPage;
    const currentPageEnd = currentPageStart + itemsPerPage;
    const currentPageIds = filteredListas
      .slice(currentPageStart, currentPageEnd)
      .map(lista => lista.id);
    setSelectedIds(currentPageIds);
  }, [filteredListas, currentPage, itemsPerPage]);
  
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);
  
  // 🔄 Navigation
  const navigateToDetail = useCallback((listaId: string) => {
    router.push(`/proyectos/${proyectoId}/equipos/${listaId}/detalle`);
  }, [router, proyectoId]);
  
  // 🔄 Load view mode preference on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem(`viewMode-${proyectoId}`) as ViewMode;
    if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'table')) {
      setViewModeState(savedViewMode);
    }
  }, [proyectoId]);
  
  // 🔄 Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update search param
    if (filters.search) {
      params.set('search', filters.search);
    } else {
      params.delete('search');
    }
    
    // Update status params
    if (filters.estado.length > 0) {
      params.set('estado', filters.estado.join(','));
    } else {
      params.delete('estado');
    }
    
    // Update sort param
    if (sortBy !== 'fecha-desc') {
      params.set('sort', sortBy);
    } else {
      params.delete('sort');
    }
    
    // Update view mode param
    if (viewMode !== 'grid') {
      params.set('view', viewMode);
    } else {
      params.delete('view');
    }
    
    // Update page param
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    
    // Update URL without triggering navigation
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters, sortBy, viewMode, currentPage, searchParams]);
  
  // 📊 Computed properties
  const isFiltered = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.estado.length > 0 ||
      filters.fechaDesde !== undefined ||
      filters.fechaHasta !== undefined ||
      filters.costoMin !== undefined ||
      filters.costoMax !== undefined ||
      filters.itemsMin !== undefined ||
      filters.itemsMax !== undefined ||
      filters.progreso !== 'all'
    );
  }, [filters]);
  
  const hasSelection = selectedIds.length > 0;
  
  return {
    // Data
    listas,
    filteredListas,
    stats,
    
    // Loading states
    loading,
    error,
    isSyncing,
    lastSyncTime,
    
    // Filters and search
    filters,
    setFilters,
    clearFilters,
    
    // Sorting
    sortBy,
    setSortBy,
    
    // View mode
    viewMode,
    setViewMode,
    
    // Pagination
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    
    // Selection
    selectedIds,
    setSelectedIds,
    selectAll,
    clearSelection,
    
    // Actions
    refresh,
    navigateToDetail,
    
    // CRUD operations
    updateLista,
    deleteLista,
    
    // Sync operations
    syncMasterData,
    invalidateCache,
    emitSyncEvent,
    subscribeTo,
    
    // Utilities
    isFiltered,
    hasSelection
  };
};

export default useListaEquipoMaster;
export type { UseListaEquipoMasterConfig, UseListaEquipoMasterReturn };