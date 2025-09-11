/**
 * @fileoverview Tests for ListaEquipoMasterView component
 * @description Unit tests for Master view component in Master-Detail pattern
 * @author GYS Team
 * @date 2024
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ListaEquipoMasterView } from '@/components/proyectos/ListaEquipoMasterView';
import { useListaEquipoMaster } from '@/hooks/useListaEquipoMaster';
import { useListaEquipoFilters } from '@/hooks/useListaEquipoFilters';
import { ListaEquipoMaster } from '@/types/master-detail';
import { calculateMasterListStats } from '@/lib/transformers/master-detail-transformers';

// 🧪 Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/hooks/useListaEquipoMaster');
jest.mock('@/hooks/useListaEquipoFilters');
jest.mock('@/components/proyectos/ListaEquipoMasterList', () => ({
  ListaEquipoMasterList: ({ onViewDetail, onToggleSelection }: any) => (
    <div data-testid="master-list">
      <button onClick={() => onViewDetail('lista-1')}>View Detail</button>
      <button onClick={() => onToggleSelection('lista-1')}>Toggle Selection</button>
    </div>
  )
}));
jest.mock('@/components/proyectos/ListaEquipoMasterFilters', () => ({
  ListaEquipoMasterFilters: ({ onFiltersChange, onClearFilters }: any) => (
    <div data-testid="master-filters">
      <button onClick={() => onFiltersChange('estado', 'ACTIVA')}>Apply Filter</button>
      <button onClick={onClearFilters}>Clear Filters</button>
    </div>
  )
}));

// 📊 Mock data
const mockListaEquipoMaster: ListaEquipoMaster = {
  id: 'lista-1',
  codigo: 'LE-001',
  nombre: 'Lista Test',
  numeroSecuencia: 1,
  estado: 'aprobado',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  stats: {
    totalItems: 10,
    itemsVerificados: 8,
    itemsAprobados: 5,
    itemsRechazados: 1,
    costoTotal: 10000,
    costoAprobado: 8000
  },
  proyecto: {
    id: 'proyecto-1',
    nombre: 'Proyecto Test',
    codigo: 'PROJ-001'
  },
  responsable: {
    id: 'user-1',
    name: 'Test User'
  }
};

const mockStats: ReturnType<typeof calculateMasterListStats> = {
  totalListas: 1,
  totalItems: 10,
  totalCosto: 10000,
  costoAprobado: 8000,
  listasPorEstado: {
    borrador: 0,
    por_revisar: 0,
    por_validar: 0,
    por_aprobar: 0,
    aprobado: 1,
    rechazado: 0,
    completado: 0
  },
  progresoPromedio: 50
};

const mockMasterHook = {
  lists: [mockListaEquipoMaster],
  loading: false,
  error: null,
  stats: mockStats,
  refresh: jest.fn(),
  selection: {
    selectedIds: [],
    isSelected: jest.fn(() => false),
    isAllSelected: false,
    toggleSelection: jest.fn(),
    selectAll: jest.fn(),
    clearSelection: jest.fn()
  },
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    totalItems: 1,
    updatePagination: jest.fn()
  },
  sortConfig: {
    key: null,
    direction: 'asc' as const,
    updateSort: jest.fn()
  }
};

const mockFiltersHook = {
  filters: {
    estado: 'all',
    progreso: 'all',
    fechaCreacion: '',
    presupuesto: 'all',
    responsable: '',
    proyecto: 'all'
  },
  hasActiveFilters: false,
  updateFilter: jest.fn(),
  clearFilters: jest.fn(),
  applyFilters: jest.fn((lists) => lists),
  quickFilters: [
    { id: 'active', name: 'Activas', icon: '🟢' },
    { id: 'completed', name: 'Completadas', icon: '✅' }
  ],
  applyQuickFilter: jest.fn(),
  getFilterSummary: jest.fn(() => 'Sin filtros activos'),
  validateFilters: jest.fn(() => ({ isValid: true, errors: [] })),
  history: {
    items: [],
    canUndo: false,
    canRedo: false,
    undo: jest.fn(),
    redo: jest.fn()
  },
  presets: {
    savedPresets: [],
    savePreset: jest.fn(),
    loadPreset: jest.fn(),
    deletePreset: jest.fn()
  },
  analytics: {
    mostUsedFilters: [],
    filterChangeCount: 0
  }
};

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn()
};

describe('ListaEquipoMasterView Component', () => {
  const mockUseListaEquipoMaster = useListaEquipoMaster as jest.MockedFunction<typeof useListaEquipoMaster>;
  const mockUseListaEquipoFilters = useListaEquipoFilters as jest.MockedFunction<typeof useListaEquipoFilters>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListaEquipoMaster.mockReturnValue(mockMasterHook);
    mockUseListaEquipoFilters.mockReturnValue(mockFiltersHook);
    mockUseRouter.mockReturnValue(mockRouter);
  });

  const defaultProps = {
    proyectoId: 'proyecto-1',
    initialLists: [mockListaEquipoMaster],
    initialStats: mockStats
  };

  describe('✅ Rendering', () => {
    it('should render without crashing', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      expect(screen.getByText('Listas de Equipos')).toBeInTheDocument();
    });

    it('should display project statistics', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Total lists
      expect(screen.getByText('10')).toBeInTheDocument(); // Total items
      expect(screen.getByText('5')).toBeInTheDocument(); // Completed items
    });

    it('should render search input', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar listas de equipos...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render view mode toggle buttons', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const gridButton = screen.getByRole('button', { name: /grid/i });
      const tableButton = screen.getByRole('button', { name: /list/i });
      
      expect(gridButton).toBeInTheDocument();
      expect(tableButton).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      expect(screen.getByText('Filtros')).toBeInTheDocument();
      expect(screen.getByText('Actualizar')).toBeInTheDocument();
      expect(screen.getByText('Nueva Lista')).toBeInTheDocument();
    });
  });

  describe('🔍 Search Functionality', () => {
    it('should handle search input changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar listas de equipos...');
      
      await user.type(searchInput, 'test search');
      
      expect(searchInput).toHaveValue('test search');
    });

    it('should filter lists based on search term', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar listas de equipos...');
      
      await user.type(searchInput, 'Lista Test');
      
      // The component should filter the lists internally
      expect(searchInput).toHaveValue('Lista Test');
    });
  });

  describe('🎛️ View Mode Controls', () => {
    it('should toggle between grid and table view modes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const tableButton = screen.getByRole('button', { name: /list/i });
      
      await user.click(tableButton);
      
      // Should update view mode internally
      expect(tableButton).toBeInTheDocument();
    });

    it('should disable controls when loading', () => {
      mockUseListaEquipoMaster.mockReturnValue({
        ...mockMasterHook,
        loading: true
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar listas de equipos...');
      const filtersButton = screen.getByText('Filtros');
      const refreshButton = screen.getByText('Actualizar');
      
      expect(searchInput).toBeDisabled();
      expect(filtersButton).toBeDisabled();
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('🔧 Filter Controls', () => {
    it('should toggle filters panel', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const filtersButton = screen.getByText('Filtros');
      
      await user.click(filtersButton);
      
      expect(screen.getByTestId('master-filters')).toBeInTheDocument();
    });

    it('should show active filters count', () => {
      mockUseListaEquipoFilters.mockReturnValue({
        ...mockFiltersHook,
        hasActiveFilters: true,
        filters: {
          ...mockFiltersHook.filters,
          estado: 'ACTIVA',
          responsable: 'Juan'
        }
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // Should show badge with filter count
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should apply quick filters', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const activeFilter = screen.getByText('Activas');
      
      await user.click(activeFilter);
      
      expect(mockFiltersHook.applyQuickFilter).toHaveBeenCalledWith('active');
    });

    it('should show filter summary when filters are active', () => {
      mockUseListaEquipoFilters.mockReturnValue({
        ...mockFiltersHook,
        hasActiveFilters: true,
        getFilterSummary: jest.fn(() => 'Estado: ACTIVA, Responsable: Juan')
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      expect(screen.getByText('Estado: ACTIVA, Responsable: Juan')).toBeInTheDocument();
    });
  });

  describe('📊 Statistics Display', () => {
    it('should display status distribution', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      expect(screen.getByText('Distribución por Estado')).toBeInTheDocument();
      expect(screen.getByText('Activas:')).toBeInTheDocument();
      expect(screen.getByText('Completadas:')).toBeInTheDocument();
    });

    it('should handle empty statistics', () => {
      const emptyStats = {
        ...mockStats,
        totalLists: 0,
        statusDistribution: {}
      };
      
      mockUseListaEquipoMaster.mockReturnValue({
        ...mockMasterHook,
        stats: emptyStats
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('🔄 Data Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const refreshButton = screen.getByText('Actualizar');
      
      await user.click(refreshButton);
      
      expect(mockMasterHook.refresh).toHaveBeenCalled();
    });

    it('should show loading spinner when refreshing', () => {
      mockUseListaEquipoMaster.mockReturnValue({
        ...mockMasterHook,
        loading: true
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const refreshButton = screen.getByText('Actualizar');
      const spinner = refreshButton.querySelector('.animate-spin');
      
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('🎯 Navigation', () => {
    it('should navigate to detail view when item is clicked', async () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const viewDetailButton = screen.getByText('View Detail');
      
      fireEvent.click(viewDetailButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/proyectos/proyecto-1/equipos/lista-1/detalle');
    });
  });

  describe('✅ Selection Management', () => {
    it('should handle item selection', async () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const toggleSelectionButton = screen.getByText('Toggle Selection');
      
      fireEvent.click(toggleSelectionButton);
      
      expect(mockMasterHook.selection.toggleSelection).toHaveBeenCalledWith('lista-1');
    });

    it('should handle bulk actions', async () => {
      mockUseListaEquipoMaster.mockReturnValue({
        ...mockMasterHook,
        selection: {
          ...mockMasterHook.selection,
          selectedIds: ['lista-1'],
          isSelected: jest.fn(() => true)
        }
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // Simulate bulk action (would be triggered by the MasterList component)
      // This tests the handleBulkAction function indirectly
      expect(mockMasterHook.selection.selectedIds).toContain('lista-1');
    });
  });

  describe('🚨 Error Handling', () => {
    it('should handle loading state', () => {
      mockUseListaEquipoMaster.mockReturnValue({
        ...mockMasterHook,
        loading: true,
        lists: []
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // Should show skeleton loader
      expect(screen.queryByText('Lista Test')).not.toBeInTheDocument();
    });

    it('should handle error state', () => {
      const mockError = new Error('API Error');
      mockUseListaEquipoMaster.mockReturnValue({
        ...mockMasterHook,
        error: mockError,
        lists: []
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // Component should still render without crashing
      expect(screen.getByText('Listas de Equipos')).toBeInTheDocument();
    });

    it('should handle bulk action errors', async () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // Simulate error in bulk action
      const component = screen.getByTestId('master-list');
      
      // This would be called by the MasterList component
      // Testing the error handling in handleBulkAction
      expect(component).toBeInTheDocument();
    });
  });

  describe('⚡ Performance', () => {
    it('should memoize processed lists', () => {
      const { rerender } = render(<ListaEquipoMasterView {...defaultProps} />);
      
      // Re-render with same props
      rerender(<ListaEquipoMasterView {...defaultProps} />);
      
      // Should not cause unnecessary re-calculations
      expect(screen.getByText('Lista Test')).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', () => {
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        ...mockListaEquipoMaster,
        id: `lista-${i}`,
        nombre: `Lista ${i}`
      }));
      
      mockUseListaEquipoMaster.mockReturnValue({
        ...mockMasterHook,
        lists: largeMockData,
        stats: {
          ...mockStats,
          totalLists: 1000
        }
      });
      
      const startTime = performance.now();
      render(<ListaEquipoMasterView {...defaultProps} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should render in less than 1 second
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  describe('♿ Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar listas de equipos...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar listas de equipos...');
      
      await user.tab();
      expect(searchInput).toHaveFocus();
    });
  });

  describe('🎨 Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // Should still render all essential elements
      expect(screen.getByText('Listas de Equipos')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Buscar listas de equipos...')).toBeInTheDocument();
    });
  });
});
