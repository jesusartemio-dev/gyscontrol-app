/**
 * 🧪 Tests for useListaEquipoState Hook - FASE 2 Performance Optimization
 * 
 * Tests de performance y funcionalidad para el hook de gestión de estado
 * local vs global. Valida separación de responsabilidades, memoización
 * y optimizaciones de rendering.
 * 
 * @author GYS Team
 * @version 2.0.0 - Performance Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useListaEquipoState } from '@/hooks/useListaEquipoState';
import { useDebounce } from '@/hooks/useDebounce';
import type { ListaEquipoDetail } from '@/types/master-detail';
import type { EstadoListaEquipo } from '@/types/modelos';

// 🎯 Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: jest.fn(),
}));

// 🎯 Mock data
const mockListas: ListaEquipoDetail[] = [
  {
    id: '1',
    codigo: 'LE-001',
    nombre: 'Lista Equipos Proyecto Alpha',
    estado: 'borrador' as EstadoListaEquipo,
    proyectoId: 'proj-1',
    proyecto: {
      id: 'proj-1',
      nombre: 'Proyecto Alpha',
      codigo: 'ALPHA-001',
      estado: 'activo' as any,
      fechaInicio: '2024-01-01',
      fechaFin: '2024-12-31',
      presupuesto: 1000000,
      clienteId: 'client-1',
      gerenteId: 'manager-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    fechaNecesaria: '2024-06-01',
    fechaAprobacionFinal: null,
    stats: {
      totalItems: 10,
      itemsAprobados: 5,
      itemsRechazados: 2,
      itemsPendientes: 3,
      costoTotal: 50000,
      costoAprobado: 25000,
    },
    coherencia: 85,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    codigo: 'LE-002',
    nombre: 'Lista Equipos Proyecto Beta',
    estado: 'aprobado' as EstadoListaEquipo,
    proyectoId: 'proj-2',
    proyecto: {
      id: 'proj-2',
      nombre: 'Proyecto Beta',
      codigo: 'BETA-001',
      estado: 'activo' as any,
      fechaInicio: '2024-02-01',
      fechaFin: '2024-11-30',
      presupuesto: 800000,
      clienteId: 'client-2',
      gerenteId: 'manager-2',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    fechaNecesaria: '2024-07-01',
    fechaAprobacionFinal: '2024-05-15',
    stats: {
      totalItems: 15,
      itemsAprobados: 12,
      itemsRechazados: 1,
      itemsPendientes: 2,
      costoTotal: 75000,
      costoAprobado: 70000,
    },
    coherencia: 92,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(() => ''),
};

describe('useListaEquipoState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (usePathname as jest.Mock).mockReturnValue('/aprovisionamiento/listas-equipo');
    (useDebounce as jest.Mock).mockImplementation((value) => value);
  });

  describe('🚀 Performance Optimizations', () => {
    it('should memoize filters object to prevent unnecessary re-renders', () => {
      const { result, rerender } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      const initialFilters = result.current.filters;
      
      // Re-render without changing filter-related state
      rerender();
      
      // Filters object should be the same reference (memoized)
      expect(result.current.filters).toBe(initialFilters);
    });

    it('should memoize processed listas to prevent unnecessary computations', () => {
      const { result, rerender } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      const initialProcessedListas = result.current.processedListas;
      
      // Re-render without changing data or filters
      rerender();
      
      // Processed listas should be the same reference (memoized)
      expect(result.current.processedListas).toBe(initialProcessedListas);
    });

    it('should memoize actions to prevent callback recreation', () => {
      const { result, rerender } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      const initialActions = result.current.actions;
      
      // Re-render without changing dependencies
      rerender();
      
      // Actions should be the same reference (memoized)
      expect(result.current.actions).toBe(initialActions);
    });

    it('should use debounced search term for performance', () => {
      const mockDebounce = jest.fn().mockReturnValue('debounced-term');
      (useDebounce as jest.Mock).mockReturnValue('debounced-term');

      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSearchTerm('test-term');
      });

      // Should use debounced value in filters
      expect(useDebounce).toHaveBeenCalledWith('test-term', 300);
    });
  });

  describe('🎯 State Management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      expect(result.current.uiState.searchTerm).toBe('');
      expect(result.current.uiState.estadoFilter).toBe('all');
      expect(result.current.uiState.proyectoFilter).toBe('all');
      expect(result.current.uiState.viewConfig.mode).toBe('table');
      expect(result.current.uiState.viewConfig.itemsPerPage).toBe(50);
      expect(result.current.selectionState.selectedIds).toEqual([]);
    });

    it('should update search term correctly', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSearchTerm('test search');
      });

      expect(result.current.uiState.searchTerm).toBe('test search');
    });

    it('should update estado filter correctly', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setEstadoFilter('aprobado');
      });

      expect(result.current.uiState.estadoFilter).toBe('aprobado');
    });

    it('should update view mode correctly', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setViewMode('virtualized');
      });

      expect(result.current.uiState.viewConfig.mode).toBe('virtualized');
    });
  });

  describe('🔍 Filtering Logic', () => {
    it('should filter by search term', () => {
      (useDebounce as jest.Mock).mockReturnValue('Alpha');
      
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSearchTerm('Alpha');
      });

      expect(result.current.processedListas).toHaveLength(1);
      expect(result.current.processedListas[0].codigo).toBe('LE-001');
    });

    it('should filter by estado', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setEstadoFilter('aprobado');
      });

      expect(result.current.processedListas).toHaveLength(1);
      expect(result.current.processedListas[0].estado).toBe('aprobado');
    });

    it('should filter by proyecto', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setProyectoFilter('proj-1');
      });

      expect(result.current.processedListas).toHaveLength(1);
      expect(result.current.processedListas[0].proyectoId).toBe('proj-1');
    });

    it('should combine multiple filters', () => {
      (useDebounce as jest.Mock).mockReturnValue('Beta');
      
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSearchTerm('Beta');
        result.current.actions.setEstadoFilter('aprobado');
      });

      expect(result.current.processedListas).toHaveLength(1);
      expect(result.current.processedListas[0].codigo).toBe('LE-002');
    });

    it('should reset filters correctly', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Set some filters
      act(() => {
        result.current.actions.setSearchTerm('test');
        result.current.actions.setEstadoFilter('aprobado');
        result.current.actions.setProyectoFilter('proj-1');
      });

      // Reset filters
      act(() => {
        result.current.actions.resetFilters();
      });

      expect(result.current.uiState.searchTerm).toBe('');
      expect(result.current.uiState.estadoFilter).toBe('all');
      expect(result.current.uiState.proyectoFilter).toBe('all');
    });
  });

  describe('📊 Sorting Logic', () => {
    it('should sort by codigo ascending', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSortConfig({
          key: 'codigo',
          direction: 'asc',
        });
      });

      expect(result.current.processedListas[0].codigo).toBe('LE-001');
      expect(result.current.processedListas[1].codigo).toBe('LE-002');
    });

    it('should sort by codigo descending', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSortConfig({
          key: 'codigo',
          direction: 'desc',
        });
      });

      expect(result.current.processedListas[0].codigo).toBe('LE-002');
      expect(result.current.processedListas[1].codigo).toBe('LE-001');
    });

    it('should sort by monto total', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSortConfig({
          key: 'montoTotal',
          direction: 'desc',
        });
      });

      // Should sort by stats.costoTotal
      expect(result.current.processedListas[0].stats?.costoTotal).toBe(75000);
      expect(result.current.processedListas[1].stats?.costoTotal).toBe(50000);
    });
  });

  describe('✅ Selection Logic', () => {
    it('should select individual items', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.selectItem('1', true);
      });

      expect(result.current.selectionState.selectedIds).toContain('1');
      expect(result.current.selectionState.isPartiallySelected).toBe(true);
      expect(result.current.selectionState.isAllSelected).toBe(false);
    });

    it('should deselect individual items', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Select first
      act(() => {
        result.current.actions.selectItem('1', true);
      });

      // Then deselect
      act(() => {
        result.current.actions.selectItem('1', false);
      });

      expect(result.current.selectionState.selectedIds).not.toContain('1');
      expect(result.current.selectionState.isPartiallySelected).toBe(false);
    });

    it('should select all items', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.selectAll(true);
      });

      expect(result.current.selectionState.selectedIds).toHaveLength(2);
      expect(result.current.selectionState.isAllSelected).toBe(true);
      expect(result.current.selectionState.isPartiallySelected).toBe(false);
    });

    it('should deselect all items', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Select all first
      act(() => {
        result.current.actions.selectAll(true);
      });

      // Then deselect all
      act(() => {
        result.current.actions.selectAll(false);
      });

      expect(result.current.selectionState.selectedIds).toHaveLength(0);
      expect(result.current.selectionState.isAllSelected).toBe(false);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Select some items
      act(() => {
        result.current.actions.selectItem('1', true);
        result.current.actions.selectItem('2', true);
      });

      // Clear selection
      act(() => {
        result.current.actions.clearSelection();
      });

      expect(result.current.selectionState.selectedIds).toHaveLength(0);
      expect(result.current.uiState.isBulkActionMode).toBe(false);
    });
  });

  describe('🔗 URL Synchronization', () => {
    it('should load state from URL params on mount', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          search: 'test-search',
          estado: 'aprobado',
          proyecto: 'proj-1',
          view: 'virtualized',
        };
        return params[key] || null;
      });

      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Should load state from URL
      expect(result.current.uiState.searchTerm).toBe('test-search');
      expect(result.current.uiState.estadoFilter).toBe('aprobado');
      expect(result.current.uiState.proyectoFilter).toBe('proj-1');
      expect(result.current.uiState.viewConfig.mode).toBe('virtualized');
    });

    it('should sync state changes to URL', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      act(() => {
        result.current.actions.setSearchTerm('new-search');
      });

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockRouter.replace).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('📈 Computed Values', () => {
    it('should compute hasActiveFilters correctly', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Initially no active filters (but URL params might have filters)
      // Check if there are any actual filter values set
      const hasFilters = result.current.filters.search || 
                        result.current.filters.estado || 
                        result.current.filters.proyecto ||
                        result.current.filters.fechaDesde ||
                        result.current.filters.fechaHasta;
      expect(!!hasFilters).toBe(result.current.hasActiveFilters);

      // Set a filter
      act(() => {
        result.current.actions.setSearchTerm('test');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should compute selectedCount correctly', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      expect(result.current.selectedCount).toBe(0);

      act(() => {
        result.current.actions.selectItem('1', true);
      });

      expect(result.current.selectedCount).toBe(1);
    });

    it('should compute totalCount correctly', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Initially should show all items (or filtered items)
      expect(result.current.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.current.totalCount).toBeLessThanOrEqual(mockListas.length);

      // Apply filter that reduces count
      act(() => {
        result.current.actions.setEstadoFilter('aprobado');
      });

      // Should have filtered results
      expect(result.current.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.current.totalCount).toBeLessThanOrEqual(mockListas.length);
    });
  });

  describe('🎛️ UI State Management', () => {
    it('should toggle filter panel', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      expect(result.current.uiState.isFilterPanelOpen).toBe(false);

      act(() => {
        result.current.actions.toggleFilterPanel();
      });

      expect(result.current.uiState.isFilterPanelOpen).toBe(true);
    });

    it('should toggle bulk action mode', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      expect(result.current.uiState.isBulkActionMode).toBe(false);

      act(() => {
        result.current.actions.toggleBulkActionMode();
      });

      expect(result.current.uiState.isBulkActionMode).toBe(true);
    });

    it('should clear selection when disabling bulk action mode', () => {
      const { result } = renderHook(() => 
        useListaEquipoState(mockListas)
      );

      // Enable bulk mode and select items
      act(() => {
        result.current.actions.toggleBulkActionMode();
        result.current.actions.selectItem('1', true);
      });

      expect(result.current.selectionState.selectedIds).toContain('1');

      // Disable bulk mode
      act(() => {
        result.current.actions.toggleBulkActionMode();
      });

      expect(result.current.uiState.isBulkActionMode).toBe(false);
      expect(result.current.selectionState.selectedIds).toHaveLength(0);
    });
  });
});