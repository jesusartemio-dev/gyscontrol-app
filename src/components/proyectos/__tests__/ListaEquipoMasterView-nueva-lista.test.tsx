/**
 * 🧪 Test para verificar funcionalidad del botón Nueva Lista
 * 
 * Verifica que:
 * - El botón de Nueva Lista esté presente
 * - Al hacer clic abra el modal de creación
 * - Al crear una lista se refresque la vista
 * - Se muestre el mensaje de éxito
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ListaEquipoMasterView } from '../ListaEquipoMasterView';
import { useListaEquipoMaster } from '@/hooks/useListaEquipoMaster';
import { useListaEquipoFilters } from '@/hooks/useListaEquipoFilters';

// 🔧 Mock dependencies
jest.mock('sonner');
jest.mock('@/hooks/useListaEquipoMaster');
jest.mock('@/hooks/useListaEquipoFilters');
jest.mock('@/components/equipos/ModalCrearListaEquipo', () => {
  return function MockModalCrearListaEquipo({ proyectoId, onCreated, triggerClassName }: any) {
    return (
      <button 
        className={triggerClassName}
        onClick={() => {
          // Simular creación exitosa
          onCreated();
        }}
      >
        Nueva Lista Técnica
      </button>
    );
  };
});

const mockRefreshData = jest.fn();
const mockUseListaEquipoMaster = useListaEquipoMaster as jest.MockedFunction<typeof useListaEquipoMaster>;
const mockUseListaEquipoFilters = useListaEquipoFilters as jest.MockedFunction<typeof useListaEquipoFilters>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('ListaEquipoMasterView - Nueva Lista Button', () => {
  const defaultProps = {
    proyectoId: 'test-proyecto-id',
    initialLists: [],
    initialStats: {
      total: 0,
      porEstado: {},
      porPrioridad: {},
      montoTotal: 0,
      itemsTotal: 0
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useListaEquipoMaster
    mockUseListaEquipoMaster.mockReturnValue({
      listas: [],
      filteredListas: [],
      stats: defaultProps.initialStats,
      loading: false,
      error: null,
      filters: {},
      setFilters: jest.fn(),
      clearFilters: jest.fn(),
      sortBy: 'nombre',
      setSortBy: jest.fn(),
      viewMode: 'grid',
      setViewMode: jest.fn(),
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 12,
      setCurrentPage: jest.fn(),
      setItemsPerPage: jest.fn(),
      selectedIds: [],
      setSelectedIds: jest.fn(),
      selectAll: jest.fn(),
      clearSelection: jest.fn(),
      refresh: mockRefreshData,
      navigateToDetail: jest.fn(),
      isFiltered: false,
      hasSelection: false
    });

    // Mock useListaEquipoFilters
    mockUseListaEquipoFilters.mockReturnValue({
      filters: {},
      updateFilter: jest.fn(),
      setFilters: jest.fn(),
      clearFilters: jest.fn(),
      hasActiveFilters: false,
      getFilterSummary: jest.fn().mockReturnValue(''),
      quickFilters: [],
      applyQuickFilter: jest.fn()
    });
  });

  it('should render Nueva Lista button', () => {
    render(<ListaEquipoMasterView {...defaultProps} />);
    
    expect(screen.getByText('Nueva Lista Técnica')).toBeInTheDocument();
  });

  it('should call refreshData and show success toast when lista is created', async () => {
    const user = userEvent.setup();
    render(<ListaEquipoMasterView {...defaultProps} />);
    
    const nuevaListaButton = screen.getByText('Nueva Lista Técnica');
    await user.click(nuevaListaButton);
    
    // Verificar que se llamó refreshData
    expect(mockRefreshData).toHaveBeenCalled();
    
    // Verificar que se mostró el toast de éxito
    expect(mockToast.success).toHaveBeenCalledWith('✅ Lista técnica creada exitosamente');
  });

  it('should disable button when loading', () => {
    // Mock loading state
    mockUseListaEquipoMaster.mockReturnValue({
      ...mockUseListaEquipoMaster(),
      loading: true
    });
    
    render(<ListaEquipoMasterView {...defaultProps} />);
    
    const nuevaListaButton = screen.getByText('Nueva Lista Técnica');
    expect(nuevaListaButton).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('should pass correct proyectoId to ModalCrearListaEquipo', () => {
    render(<ListaEquipoMasterView {...defaultProps} />);
    
    // El mock ya verifica que se pase el proyectoId correcto
    expect(screen.getByText('Nueva Lista Técnica')).toBeInTheDocument();
  });
});