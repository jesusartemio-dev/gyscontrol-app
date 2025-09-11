/**
 * @fileoverview Tests for ListaEquipoMasterFilters component
 * @description Unit tests for Master filters component in Master-Detail pattern
 * @author GYS Team
 * @date 2024
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListaEquipoMasterFilters } from '@/components/proyectos/ListaEquipoMasterFilters';
import { MasterFilters } from '@/types/modelos';

// 🎭 Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select-container">
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        data-testid="select"
      >
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, type, ...props }: any) => (
    <input
      type={type || 'text'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid={props['data-testid'] || 'input'}
      {...props}
    />
  )
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant} ${size}`}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span className={`badge ${variant}`}>{children}</span>
  )
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />
}));

// 📊 Mock data
const mockFilters: MasterFilters = {
  estado: 'all',
  progreso: 'all',
  fechaCreacion: '',
  presupuesto: 'all',
  responsable: '',
  proyecto: 'all'
};

const mockActiveFilters: MasterFilters = {
  estado: 'ACTIVA',
  progreso: 'high',
  fechaCreacion: '2024-01-01',
  presupuesto: 'high',
  responsable: 'Juan Pérez',
  proyecto: 'proyecto-1'
};

const mockQuickFilters = [
  { id: 'active', name: 'Activas', icon: '🟢', count: 5 },
  { id: 'completed', name: 'Completadas', icon: '✅', count: 3 },
  { id: 'paused', name: 'Pausadas', icon: '⏸️', count: 2 },
  { id: 'high-progress', name: 'Alto Progreso', icon: '📈', count: 4 }
];

const mockFilterPresets = [
  {
    id: 'preset-1',
    name: 'Listas Activas',
    filters: { estado: 'ACTIVA', progreso: 'all' },
    isDefault: true
  },
  {
    id: 'preset-2',
    name: 'Completadas Recientes',
    filters: { estado: 'COMPLETADA', fechaCreacion: '2024-01-01' },
    isDefault: false
  }
];

const mockProps = {
  filters: mockFilters,
  onFiltersChange: jest.fn(),
  onClearFilters: jest.fn(),
  quickFilters: mockQuickFilters,
  onQuickFilter: jest.fn(),
  filterPresets: mockFilterPresets,
  onSavePreset: jest.fn(),
  onLoadPreset: jest.fn(),
  onDeletePreset: jest.fn(),
  isOpen: true,
  onToggle: jest.fn(),
  hasActiveFilters: false,
  activeFiltersCount: 0,
  loading: false,
  compact: false
};

describe('ListaEquipoMasterFilters Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('✅ Rendering', () => {
    it('should render without crashing', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      expect(screen.getByText('Filtros Avanzados')).toBeInTheDocument();
    });

    it('should render all filter sections', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Progreso')).toBeInTheDocument();
      expect(screen.getByText('Fecha de Creación')).toBeInTheDocument();
      expect(screen.getByText('Presupuesto')).toBeInTheDocument();
      expect(screen.getByText('Responsable')).toBeInTheDocument();
      expect(screen.getByText('Proyecto')).toBeInTheDocument();
    });

    it('should render quick filters section', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      expect(screen.getByText('Filtros Rápidos')).toBeInTheDocument();
      expect(screen.getByText('Activas')).toBeInTheDocument();
      expect(screen.getByText('Completadas')).toBeInTheDocument();
      expect(screen.getByText('Pausadas')).toBeInTheDocument();
      expect(screen.getByText('Alto Progreso')).toBeInTheDocument();
    });

    it('should render filter presets section', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      expect(screen.getByText('Presets de Filtros')).toBeInTheDocument();
      expect(screen.getByText('Listas Activas')).toBeInTheDocument();
      expect(screen.getByText('Completadas Recientes')).toBeInTheDocument();
    });

    it('should hide content when isOpen is false', () => {
      const closedProps = {
        ...mockProps,
        isOpen: false
      };
      
      render(<ListaEquipoMasterFilters {...closedProps} />);
      
      expect(screen.queryByText('Estado')).not.toBeInTheDocument();
      expect(screen.queryByText('Progreso')).not.toBeInTheDocument();
    });
  });

  describe('🔧 Filter Controls', () => {
    it('should handle estado filter changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const estadoSelect = screen.getAllByTestId('select')[0];
      await user.selectOptions(estadoSelect, 'ACTIVA');
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith('estado', 'ACTIVA');
    });

    it('should handle progreso filter changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const progresoSelect = screen.getAllByTestId('select')[1];
      await user.selectOptions(progresoSelect, 'high');
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith('progreso', 'high');
    });

    it('should handle fecha creacion filter changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const fechaInput = screen.getByTestId('fecha-creacion-input');
      await user.type(fechaInput, '2024-01-15');
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith('fechaCreacion', '2024-01-15');
    });

    it('should handle presupuesto filter changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const presupuestoSelect = screen.getAllByTestId('select')[2];
      await user.selectOptions(presupuestoSelect, 'high');
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith('presupuesto', 'high');
    });

    it('should handle responsable filter changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const responsableInput = screen.getByTestId('responsable-input');
      await user.type(responsableInput, 'Juan Pérez');
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith('responsable', 'Juan Pérez');
    });

    it('should handle proyecto filter changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const proyectoSelect = screen.getAllByTestId('select')[3];
      await user.selectOptions(proyectoSelect, 'proyecto-1');
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith('proyecto', 'proyecto-1');
    });
  });

  describe('⚡ Quick Filters', () => {
    it('should render quick filter buttons with counts', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      expect(screen.getByText('🟢 Activas (5)')).toBeInTheDocument();
      expect(screen.getByText('✅ Completadas (3)')).toBeInTheDocument();
      expect(screen.getByText('⏸️ Pausadas (2)')).toBeInTheDocument();
      expect(screen.getByText('📈 Alto Progreso (4)')).toBeInTheDocument();
    });

    it('should handle quick filter clicks', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const activeFilter = screen.getByText('🟢 Activas (5)');
      await user.click(activeFilter);
      
      expect(mockProps.onQuickFilter).toHaveBeenCalledWith('active');
    });

    it('should show active state for applied quick filters', () => {
      const activeQuickFilterProps = {
        ...mockProps,
        activeQuickFilter: 'active'
      };
      
      render(<ListaEquipoMasterFilters {...activeQuickFilterProps} />);
      
      const activeFilter = screen.getByText('🟢 Activas (5)');
      expect(activeFilter.parentElement).toHaveClass('bg-blue-100');
    });
  });

  describe('💾 Filter Presets', () => {
    it('should render preset buttons', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      expect(screen.getByText('Listas Activas')).toBeInTheDocument();
      expect(screen.getByText('Completadas Recientes')).toBeInTheDocument();
    });

    it('should show default preset indicator', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const defaultPreset = screen.getByText('Listas Activas');
      expect(defaultPreset.parentElement).toContainHTML('⭐');
    });

    it('should handle preset loading', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const preset = screen.getByText('Listas Activas');
      await user.click(preset);
      
      expect(mockProps.onLoadPreset).toHaveBeenCalledWith('preset-1');
    });

    it('should handle preset saving', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const saveButton = screen.getByText('Guardar Preset');
      await user.click(saveButton);
      
      expect(mockProps.onSavePreset).toHaveBeenCalled();
    });

    it('should handle preset deletion', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const deleteButtons = screen.getAllByLabelText('Eliminar preset');
      await user.click(deleteButtons[1]); // Delete second preset (not default)
      
      expect(mockProps.onDeletePreset).toHaveBeenCalledWith('preset-2');
    });
  });

  describe('🧹 Clear Filters', () => {
    it('should show clear filters button when filters are active', () => {
      const activeFiltersProps = {
        ...mockProps,
        hasActiveFilters: true,
        activeFiltersCount: 3
      };
      
      render(<ListaEquipoMasterFilters {...activeFiltersProps} />);
      
      expect(screen.getByText('Limpiar Filtros (3)')).toBeInTheDocument();
    });

    it('should handle clear filters action', async () => {
      const user = userEvent.setup();
      const activeFiltersProps = {
        ...mockProps,
        hasActiveFilters: true,
        activeFiltersCount: 3
      };
      
      render(<ListaEquipoMasterFilters {...activeFiltersProps} />);
      
      const clearButton = screen.getByText('Limpiar Filtros (3)');
      await user.click(clearButton);
      
      expect(mockProps.onClearFilters).toHaveBeenCalled();
    });

    it('should disable clear button when no active filters', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const clearButton = screen.getByText('Limpiar Filtros');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('📊 Active Filters Display', () => {
    it('should show active filters summary', () => {
      const activeFiltersProps = {
        ...mockProps,
        filters: mockActiveFilters,
        hasActiveFilters: true,
        activeFiltersCount: 6
      };
      
      render(<ListaEquipoMasterFilters {...activeFiltersProps} />);
      
      expect(screen.getByText('Filtros Activos (6)')).toBeInTheDocument();
    });

    it('should display individual active filter badges', () => {
      const activeFiltersProps = {
        ...mockProps,
        filters: mockActiveFilters,
        hasActiveFilters: true
      };
      
      render(<ListaEquipoMasterFilters {...activeFiltersProps} />);
      
      expect(screen.getByText('Estado: ACTIVA')).toBeInTheDocument();
      expect(screen.getByText('Progreso: Alto')).toBeInTheDocument();
      expect(screen.getByText('Responsable: Juan Pérez')).toBeInTheDocument();
    });

    it('should allow removing individual filters', async () => {
      const user = userEvent.setup();
      const activeFiltersProps = {
        ...mockProps,
        filters: mockActiveFilters,
        hasActiveFilters: true
      };
      
      render(<ListaEquipoMasterFilters {...activeFiltersProps} />);
      
      const removeButtons = screen.getAllByLabelText('Remover filtro');
      await user.click(removeButtons[0]);
      
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith('estado', 'all');
    });
  });

  describe('🎨 Compact Mode', () => {
    it('should apply compact styling when compact is true', () => {
      const compactProps = {
        ...mockProps,
        compact: true
      };
      
      render(<ListaEquipoMasterFilters {...compactProps} />);
      
      const container = screen.getByTestId('filters-container');
      expect(container).toHaveClass('p-3'); // Reduced padding
    });

    it('should hide advanced sections in compact mode', () => {
      const compactProps = {
        ...mockProps,
        compact: true
      };
      
      render(<ListaEquipoMasterFilters {...compactProps} />);
      
      expect(screen.queryByText('Presets de Filtros')).not.toBeInTheDocument();
    });
  });

  describe('🔄 Loading States', () => {
    it('should show loading state when loading is true', () => {
      const loadingProps = {
        ...mockProps,
        loading: true
      };
      
      render(<ListaEquipoMasterFilters {...loadingProps} />);
      
      expect(screen.getByTestId('filters-skeleton')).toBeInTheDocument();
    });

    it('should disable controls when loading', () => {
      const loadingProps = {
        ...mockProps,
        loading: true
      };
      
      render(<ListaEquipoMasterFilters {...loadingProps} />);
      
      const selects = screen.getAllByTestId('select');
      const inputs = screen.getAllByTestId('input');
      
      selects.forEach(select => {
        expect(select).toBeDisabled();
      });
      
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('♿ Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const filtersContainer = screen.getByRole('region');
      expect(filtersContainer).toHaveAttribute('aria-label', 'Filtros de búsqueda');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const firstSelect = screen.getAllByTestId('select')[0];
      
      await user.tab();
      expect(firstSelect).toHaveFocus();
    });

    it('should announce filter changes to screen readers', () => {
      const activeFiltersProps = {
        ...mockProps,
        hasActiveFilters: true,
        activeFiltersCount: 3
      };
      
      render(<ListaEquipoMasterFilters {...activeFiltersProps} />);
      
      const announcement = screen.getByLabelText('3 filtros activos aplicados');
      expect(announcement).toBeInTheDocument();
    });
  });

  describe('📱 Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const filtersGrid = screen.getByTestId('filters-grid');
      expect(filtersGrid).toHaveClass(
        'grid-cols-1',
        'md:grid-cols-2',
        'lg:grid-cols-3'
      );
    });

    it('should stack quick filters on mobile', () => {
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const quickFiltersContainer = screen.getByTestId('quick-filters-container');
      expect(quickFiltersContainer).toHaveClass('flex-wrap');
    });
  });

  describe('🚨 Error Handling', () => {
    it('should handle invalid filter values gracefully', () => {
      const invalidFiltersProps = {
        ...mockProps,
        filters: {
          ...mockFilters,
          fechaCreacion: 'invalid-date',
          presupuesto: 'invalid-range'
        } as any
      };
      
      expect(() => {
        render(<ListaEquipoMasterFilters {...invalidFiltersProps} />);
      }).not.toThrow();
    });

    it('should handle missing callback functions', () => {
      const incompleteProps = {
        ...mockProps,
        onFiltersChange: undefined,
        onClearFilters: undefined
      } as any;
      
      expect(() => {
        render(<ListaEquipoMasterFilters {...incompleteProps} />);
      }).not.toThrow();
    });
  });

  describe('⚡ Performance', () => {
    it('should debounce text input changes', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterFilters {...mockProps} />);
      
      const responsableInput = screen.getByTestId('responsable-input');
      
      await user.type(responsableInput, 'Juan');
      
      // Should not call onFiltersChange immediately for each keystroke
      expect(mockProps.onFiltersChange).not.toHaveBeenCalled();
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockProps.onFiltersChange).toHaveBeenCalledWith('responsable', 'Juan');
      }, { timeout: 1000 });
    });

    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<ListaEquipoMasterFilters {...mockProps} />);
      
      // Re-render with same props
      rerender(<ListaEquipoMasterFilters {...mockProps} />);
      
      expect(screen.getByText('Filtros Avanzados')).toBeInTheDocument();
    });
  });
});
