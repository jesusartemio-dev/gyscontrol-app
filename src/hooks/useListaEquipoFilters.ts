/**
 * 🎯 useListaEquipoFilters Hook
 * 
 * Advanced filtering hook for equipment lists Master-Detail pattern.
 * Features:
 * - Complex filter state management
 * - Filter presets and saved configurations
 * - Filter history with undo/redo functionality
 * - URL and localStorage persistence
 * - Real-time filter validation
 * - Quick filter shortcuts
 * - Filter analytics and suggestions
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  FilterState, 
  FilterPreset 
} from '@/components/proyectos/ListaEquipoMasterFilters';
import { useDebounce } from '@/hooks/useDebounce';

// ✅ Filter history entry
interface FilterHistoryEntry {
  id: string;
  filters: FilterState;
  timestamp: Date;
  description: string;
}

// ✅ Quick filter options
interface QuickFilter {
  id: string;
  name: string;
  description: string;
  filters: Partial<FilterState>;
  icon?: string;
}

// ✅ Hook configuration
interface UseListaEquipoFiltersConfig {
  proyectoId: string;
  initialFilters?: Partial<FilterState>;
  enableHistory?: boolean;
  enablePresets?: boolean;
  enablePersistence?: boolean;
  maxHistoryEntries?: number;
}

// ✅ Hook return interface
interface UseListaEquipoFiltersReturn {
  // Current filters
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  
  // Filter validation
  isValid: boolean;
  validationErrors: string[];
  
  // Presets
  presets: FilterPreset[];
  savePreset: (name: string, description?: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  
  // History
  history: FilterHistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Quick filters
  quickFilters: QuickFilter[];
  applyQuickFilter: (filterId: string) => void;
  
  // Analytics
  filterStats: {
    totalFilters: number;
    activeFilters: number;
    mostUsedFilters: string[];
  };
  
  // Utilities
  hasActiveFilters: boolean;
  getFilterSummary: () => string;
  exportFilters: () => string;
  importFilters: (filtersJson: string) => boolean;
}

// ✅ Default filter state
const defaultFilters: FilterState = {
  search: '',
  estado: [],
  moneda: 'USD',
  progreso: 'all'
};

// ✅ Built-in quick filters
const builtInQuickFilters: QuickFilter[] = [
  {
    id: 'completed',
    name: 'Completadas',
    description: 'Listas 100% completadas',
    filters: { progreso: 'completed' },
    icon: '✅'
  },
  {
    id: 'in-progress',
    name: 'En Progreso',
    description: 'Listas parcialmente completadas',
    filters: { progreso: 'in_progress' },
    icon: '🔄'
  },
  {
    id: 'pending',
    name: 'Pendientes',
    description: 'Listas sin iniciar',
    filters: { progreso: 'pending' },
    icon: '⏳'
  },
  {
    id: 'high-cost',
    name: 'Alto Costo',
    description: 'Listas con costo > $10,000',
    filters: { costoMin: 10000, moneda: 'USD' },
    icon: '💰'
  },
  {
    id: 'recent',
    name: 'Recientes',
    description: 'Actualizadas en los últimos 7 días',
    filters: { fechaDesde: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    icon: '🕒'
  }
];

// ✅ Main hook
export const useListaEquipoFilters = ({
  proyectoId,
  initialFilters = {},
  enableHistory = true,
  enablePresets = true,
  enablePersistence = true,
  maxHistoryEntries = 10
}: UseListaEquipoFiltersConfig): UseListaEquipoFiltersReturn => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🔄 State management
  const [filters, setFiltersState] = useState<FilterState>({
    ...defaultFilters,
    ...initialFilters
  });
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [history, setHistory] = useState<FilterHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filterUsageStats, setFilterUsageStats] = useState<Record<string, number>>({});
  
  // 🔍 Debounced filters for performance
  const debouncedFilters = useDebounce(filters, 300);
  
  // 📊 Filter validation
  const { isValid, validationErrors } = useMemo(() => {
    const errors: string[] = [];
    
    // Validate date range
    if (filters.fechaDesde && filters.fechaHasta && filters.fechaDesde > filters.fechaHasta) {
      errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    
    // Validate cost range
    if (filters.costoMin !== undefined && filters.costoMax !== undefined && filters.costoMin > filters.costoMax) {
      errors.push('El costo mínimo debe ser menor al costo máximo');
    }
    
    // Validate items range
    if (filters.itemsMin !== undefined && filters.itemsMax !== undefined && filters.itemsMin > filters.itemsMax) {
      errors.push('El número mínimo de items debe ser menor al máximo');
    }
    
    // Validate negative values
    if (filters.costoMin !== undefined && filters.costoMin < 0) {
      errors.push('El costo mínimo no puede ser negativo');
    }
    
    if (filters.costoMax !== undefined && filters.costoMax < 0) {
      errors.push('El costo máximo no puede ser negativo');
    }
    
    if (filters.itemsMin !== undefined && filters.itemsMin < 0) {
      errors.push('El número mínimo de items no puede ser negativo');
    }
    
    if (filters.itemsMax !== undefined && filters.itemsMax < 0) {
      errors.push('El número máximo de items no puede ser negativo');
    }
    
    return {
      isValid: errors.length === 0,
      validationErrors: errors
    };
  }, [filters]);
  
  // 🔄 Update individual filter
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K, 
    value: FilterState[K]
  ) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
    
    // Track filter usage
    setFilterUsageStats(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
  }, []);
  
  // 🔄 Set filters with history tracking
  const setFilters = useCallback((newFilters: FilterState) => {
    if (enableHistory) {
      // Add current state to history
      const historyEntry: FilterHistoryEntry = {
        id: Date.now().toString(),
        filters: { ...filters },
        timestamp: new Date(),
        description: getFilterDescription(newFilters)
      };
      
      setHistory(prev => {
        const newHistory = [...prev.slice(0, historyIndex + 1), historyEntry];
        return newHistory.slice(-maxHistoryEntries);
      });
      
      setHistoryIndex(prev => Math.min(prev + 1, maxHistoryEntries - 1));
    }
    
    setFiltersState(newFilters);
  }, [filters, enableHistory, historyIndex, maxHistoryEntries]);
  
  // 🔄 Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [setFilters]);
  
  // 💾 Preset management
  const savePreset = useCallback((name: string, description?: string) => {
    if (!enablePresets) return;
    
    const preset: FilterPreset = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
      isDefault: false
    };
    
    setPresets(prev => [...prev, preset]);
    
    // Persist to localStorage
    if (enablePersistence) {
      const savedPresets = [...presets, preset];
      localStorage.setItem(`filterPresets-${proyectoId}`, JSON.stringify(savedPresets));
    }
    
    toast.success(`Filtro "${name}" guardado exitosamente`);
  }, [filters, presets, proyectoId, enablePresets, enablePersistence]);
  
  const loadPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setFilters(preset.filters);
      toast.success(`Filtro "${preset.name}" aplicado`);
    }
  }, [presets, setFilters]);
  
  const deletePreset = useCallback((presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
    
    // Update localStorage
    if (enablePersistence) {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      localStorage.setItem(`filterPresets-${proyectoId}`, JSON.stringify(updatedPresets));
    }
    
    toast.success('Filtro eliminado');
  }, [presets, proyectoId, enablePersistence]);
  
  // ↩️ History management
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
      setFiltersState(history[historyIndex - 1].filters);
    }
  }, [canUndo, history, historyIndex]);
  
  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
      setFiltersState(history[historyIndex + 1].filters);
    }
  }, [canRedo, history, historyIndex]);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);
  
  // ⚡ Quick filters
  const applyQuickFilter = useCallback((filterId: string) => {
    const quickFilter = builtInQuickFilters.find(qf => qf.id === filterId);
    if (quickFilter) {
      const newFilters = { ...filters, ...quickFilter.filters };
      setFilters(newFilters);
      toast.success(`Filtro rápido "${quickFilter.name}" aplicado`);
    }
  }, [filters, setFilters]);
  
  // 📊 Filter analytics
  const filterStats = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([key, value]) => {
      if (key === 'search') return value !== '';
      if (key === 'estado') return Array.isArray(value) && value.length > 0;
      if (key === 'progreso') return value !== 'all';
      return value !== undefined && value !== null;
    }).length;
    
    const mostUsedFilters = Object.entries(filterUsageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => key);
    
    return {
      totalFilters: Object.keys(filters).length,
      activeFilters,
      mostUsedFilters
    };
  }, [filters, filterUsageStats]);
  
  // 🔍 Utilities
  const hasActiveFilters = useMemo(() => {
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
  
  const getFilterSummary = useCallback(() => {
    const parts: string[] = [];
    
    if (filters.search) parts.push(`Búsqueda: "${filters.search}"`);
    if (filters.estado.length > 0) parts.push(`Estados: ${filters.estado.join(', ')}`);
    if (filters.progreso !== 'all') parts.push(`Progreso: ${filters.progreso}`);
    if (filters.fechaDesde) parts.push(`Desde: ${filters.fechaDesde.toLocaleDateString()}`);
    if (filters.fechaHasta) parts.push(`Hasta: ${filters.fechaHasta.toLocaleDateString()}`);
    if (filters.costoMin !== undefined) parts.push(`Costo min: ${filters.costoMin}`);
    if (filters.costoMax !== undefined) parts.push(`Costo max: ${filters.costoMax}`);
    
    return parts.length > 0 ? parts.join(' | ') : 'Sin filtros activos';
  }, [filters]);
  
  const exportFilters = useCallback(() => {
    return JSON.stringify(filters, null, 2);
  }, [filters]);
  
  const importFilters = useCallback((filtersJson: string) => {
    try {
      const importedFilters = JSON.parse(filtersJson) as FilterState;
      setFilters(importedFilters);
      toast.success('Filtros importados exitosamente');
      return true;
    } catch (error) {
      toast.error('Error al importar filtros: formato inválido');
      return false;
    }
  }, [setFilters]);
  
  // 🔄 Load saved data on mount
  useEffect(() => {
    if (!enablePersistence) return;
    
    // Load presets
    const savedPresets = localStorage.getItem(`filterPresets-${proyectoId}`);
    if (savedPresets) {
      try {
        const parsedPresets = JSON.parse(savedPresets) as FilterPreset[];
        setPresets(parsedPresets);
      } catch (error) {
        console.error('Error loading saved presets:', error);
      }
    }
    
    // Load filter usage stats
    const savedStats = localStorage.getItem(`filterStats-${proyectoId}`);
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats) as Record<string, number>;
        setFilterUsageStats(parsedStats);
      } catch (error) {
        console.error('Error loading filter stats:', error);
      }
    }
  }, [proyectoId, enablePersistence]);
  
  // 💾 Persist filter usage stats
  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem(`filterStats-${proyectoId}`, JSON.stringify(filterUsageStats));
    }
  }, [filterUsageStats, proyectoId, enablePersistence]);
  
  return {
    // Current filters
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    
    // Filter validation
    isValid,
    validationErrors,
    
    // Presets
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    
    // History
    history,
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
    
    // Quick filters
    quickFilters: builtInQuickFilters,
    applyQuickFilter,
    
    // Analytics
    filterStats,
    
    // Utilities
    hasActiveFilters,
    getFilterSummary,
    exportFilters,
    importFilters
  };
};

// ✅ Helper function to generate filter description
function getFilterDescription(filters: FilterState): string {
  const parts: string[] = [];
  
  if (filters.search) parts.push('búsqueda');
  if (filters.estado.length > 0) parts.push('estado');
  if (filters.progreso !== 'all') parts.push('progreso');
  if (filters.fechaDesde || filters.fechaHasta) parts.push('fechas');
  if (filters.costoMin !== undefined || filters.costoMax !== undefined) parts.push('costo');
  
  return parts.length > 0 ? `Filtros: ${parts.join(', ')}` : 'Filtros limpiados';
}

export default useListaEquipoFilters;
export type { 
  UseListaEquipoFiltersConfig, 
  UseListaEquipoFiltersReturn, 
  QuickFilter,
  FilterHistoryEntry
};
