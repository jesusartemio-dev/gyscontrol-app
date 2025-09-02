/**
 * @fileoverview Tests for useListaEquipoMaster hook
 * @description Unit tests for Master-Detail pattern hook functionality
 * @author GYS Team
 * @date 2024
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useListaEquipoMaster } from '@/hooks/useListaEquipoMaster';
import { ListaEquipoMaster } from '@/types/master-detail';
import { masterListUtils } from '@/lib/transformers/master-detail-transformers';

// 🧪 Mock dependencies
jest.mock('@/lib/transformers/master-detail-transformers', () => ({
  masterListUtils: {
    filterLists: jest.fn(),
    sortLists: jest.fn(),
    calculateProgress: jest.fn(),
    formatCurrency: jest.fn(),
    formatDate: jest.fn()
  }
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn()
}));

// 📊 Mock data
const mockListaEquipoMaster: ListaEquipoMaster = {
  id: 'lista-1',
  codigo: 'LST-001',
  nombre: 'Lista Test',
  estado: 'borrador',
  numeroSecuencia: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  stats: {
    totalItems: 10,
    itemsVerificados: 5,
    itemsAprobados: 3,
    itemsRechazados: 1,
    costoTotal: 10000,
    costoAprobado: 8000
  },
  responsable: {
    id: 'user-1',
    nombre: 'Test User',
    email: 'test@example.com'
  },
  proyecto: {
    id: 'proyecto-1',
    nombre: 'Proyecto Test',
    codigo: 'PROJ-001'
  }
};

const mockConfig = {
  proyectoId: 'proyecto-1',
  refreshInterval: 30000,
  enableRealTimeSync: true,
  cacheKey: 'listas-equipo-master'
};

describe('useListaEquipoMaster Hook', () => {
  const mockSWR = require('swr').default;
  const mockMasterListUtils = masterListUtils as jest.Mocked<typeof masterListUtils>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 🔧 Setup default SWR mock
    mockSWR.mockReturnValue({
      data: [mockListaEquipoMaster],
      error: null,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn()
    });

    // 🔧 Setup utility mocks
    mockMasterListUtils.filterLists.mockImplementation((lists) => lists);
    mockMasterListUtils.sortLists.mockImplementation((lists) => lists);
    mockMasterListUtils.calculateProgress.mockReturnValue(50);
    mockMasterListUtils.formatCurrency.mockReturnValue('S/ 10,000.00');
    mockMasterListUtils.formatDate.mockReturnValue('01/01/2024');
  });

  describe('✅ Basic Functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.lists).toEqual([mockListaEquipoMaster]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.stats).toBeDefined();
    });

    it('should handle loading state correctly', () => {
      mockSWR.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
        isValidating: false,
        mutate: jest.fn()
      });

      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.loading).toBe(true);
      expect(result.current.lists).toEqual([]);
    });

    it('should handle error state correctly', () => {
      const mockError = new Error('API Error');
      mockSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn()
      });

      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.error).toBe(mockError);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('🔄 Data Management', () => {
    it('should refresh data when refresh is called', async () => {
      const mockMutate = jest.fn();
      mockSWR.mockReturnValue({
        data: [mockListaEquipoMaster],
        error: null,
        isLoading: false,
        isValidating: false,
        mutate: mockMutate
      });

      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockMutate).toHaveBeenCalled();
    });

    it('should calculate stats correctly', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.stats).toEqual({
        totalLists: 1,
        totalItems: 10,
        completedItems: 5,
        totalBudget: 10000,
        totalCost: 8000,
        averageProgress: 50,
        statusDistribution: {
          ACTIVA: 1
        }
      });
    });
  });

  describe('🎛️ Selection Management', () => {
    it('should handle single selection', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      act(() => {
        result.current.selection.toggleSelection('lista-1');
      });

      expect(result.current.selection.selectedIds).toContain('lista-1');
      expect(result.current.selection.isSelected('lista-1')).toBe(true);
    });

    it('should handle select all', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      act(() => {
        result.current.selection.selectAll();
      });

      expect(result.current.selection.selectedIds).toEqual(['lista-1']);
      expect(result.current.selection.isAllSelected).toBe(true);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      act(() => {
        result.current.selection.selectAll();
        result.current.selection.clearSelection();
      });

      expect(result.current.selection.selectedIds).toEqual([]);
      expect(result.current.selection.isAllSelected).toBe(false);
    });
  });

  describe('📄 Pagination', () => {
    it('should handle pagination correctly', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      act(() => {
        result.current.pagination.updatePagination({ page: 2, pageSize: 5 });
      });

      expect(result.current.pagination.currentPage).toBe(2);
      expect(result.current.pagination.pageSize).toBe(5);
    });

    it('should calculate total pages correctly', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.pagination.totalPages).toBe(1);
      expect(result.current.pagination.totalItems).toBe(1);
    });
  });

  describe('🔍 Sorting', () => {
    it('should handle sort configuration', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      act(() => {
        result.current.sortConfig.updateSort({ key: 'nombre', direction: 'desc' });
      });

      expect(result.current.sortConfig.key).toBe('nombre');
      expect(result.current.sortConfig.direction).toBe('desc');
    });

    it('should toggle sort direction', () => {
      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      act(() => {
        result.current.sortConfig.updateSort({ key: 'nombre', direction: 'asc' });
        result.current.sortConfig.updateSort({ key: 'nombre', direction: 'desc' });
      });

      expect(result.current.sortConfig.direction).toBe('desc');
    });
  });

  describe('⚡ Performance', () => {
    it('should memoize stats calculation', () => {
      const { result, rerender } = renderHook(() => useListaEquipoMaster(mockConfig));
      
      const initialStats = result.current.stats;
      rerender();
      
      expect(result.current.stats).toBe(initialStats);
    });

    it('should handle large datasets efficiently', () => {
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        ...mockListaEquipoMaster,
        id: `lista-${i}`,
        nombre: `Lista ${i}`
      }));

      mockSWR.mockReturnValue({
        data: largeMockData,
        error: null,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn()
      });

      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.lists).toHaveLength(1000);
      expect(result.current.stats.totalLists).toBe(1000);
    });
  });

  describe('🔄 Real-time Sync', () => {
    it('should enable real-time sync when configured', () => {
      const configWithSync = { ...mockConfig, enableRealTimeSync: true };
      
      renderHook(() => useListaEquipoMaster(configWithSync));

      expect(mockSWR).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          refreshInterval: 30000
        })
      );
    });

    it('should disable real-time sync when configured', () => {
      const configWithoutSync = { ...mockConfig, enableRealTimeSync: false };
      
      renderHook(() => useListaEquipoMaster(configWithoutSync));

      expect(mockSWR).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          refreshInterval: 0
        })
      );
    });
  });

  describe('🚨 Error Handling', () => {
    it('should handle network errors gracefully', () => {
      const networkError = new Error('Network Error');
      mockSWR.mockReturnValue({
        data: undefined,
        error: networkError,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn()
      });

      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.error).toBe(networkError);
      expect(result.current.lists).toEqual([]);
    });

    it('should handle malformed data gracefully', () => {
      mockSWR.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn()
      });

      const { result } = renderHook(() => useListaEquipoMaster(mockConfig));

      expect(result.current.lists).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });
});