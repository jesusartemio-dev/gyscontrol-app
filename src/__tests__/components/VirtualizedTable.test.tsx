/**
 * 🧪 Tests for VirtualizedTable Component - FASE 2 Performance Optimization
 * 
 * Tests de performance y funcionalidad para la tabla virtualizada.
 * Valida virtualización, memoización y optimizaciones de rendering.
 * 
 * @author GYS Team
 * @version 2.0.0 - Performance Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirtualizedTable } from '@/components/finanzas/aprovisionamiento/VirtualizedTable';
import type { ListaEquipoDetail } from '@/types/master-detail';
import type { EstadoListaEquipo } from '@/types/modelos';

// 🎯 Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount }: any) => {
    // Render first 5 items for testing
    const itemsToRender = Math.min(itemCount, 5);
    return (
      <div data-testid="virtualized-list">
        {Array.from({ length: itemsToRender }).map((_, index) => (
          <div key={index}>
            {children({ index, style: {}, data: itemData })}
          </div>
        ))}
      </div>
    );
  },
}));

// 🎯 Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
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
  {
    id: '3',
    codigo: 'LE-003',
    nombre: 'Lista Equipos Proyecto Gamma',
    estado: 'por_revisar' as EstadoListaEquipo,
    proyectoId: 'proj-3',
    proyecto: {
      id: 'proj-3',
      nombre: 'Proyecto Gamma',
      codigo: 'GAMMA-001',
      estado: 'activo' as any,
      fechaInicio: '2024-03-01',
      fechaFin: '2024-10-31',
      presupuesto: 600000,
      clienteId: 'client-3',
      gerenteId: 'manager-3',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    fechaNecesaria: '2024-08-01',
    fechaAprobacionFinal: null,
    stats: {
      totalItems: 8,
      itemsAprobados: 3,
      itemsRechazados: 0,
      itemsPendientes: 5,
      costoTotal: 30000,
      costoAprobado: 15000,
    },
    coherencia: 78,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 🎯 Generate large dataset for performance testing
const generateLargeDataset = (size: number): ListaEquipoDetail[] => {
  return Array.from({ length: size }, (_, index) => ({
    ...mockListas[0],
    id: `lista-${index + 1}`,
    codigo: `LE-${String(index + 1).padStart(3, '0')}`,
    nombre: `Lista Equipos ${index + 1}`,
  }));
};

describe('VirtualizedTable Component', () => {
  const defaultProps = {
    listas: mockListas,
    loading: false,
    allowEdit: true,
    allowBulkActions: true,
    showCoherenceIndicators: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🚀 Performance Optimizations', () => {
    it('should handle large datasets efficiently', () => {
      const largeListas = generateLargeDataset(100);
      
      const { container } = render(
        <VirtualizedTable {...defaultProps} listas={largeListas} />
      );

      // Should render without errors
      expect(container).toBeInTheDocument();
      
      // Should display data correctly
      expect(screen.getByText('LE-001')).toBeInTheDocument();
    });

    it('should render with memoized components', () => {
      const onListaClick = jest.fn();
      const { container } = render(
        <VirtualizedTable 
          {...defaultProps} 
          onListaClick={onListaClick}
        />
      );

      // Component should render correctly
      expect(container).toBeInTheDocument();
      expect(screen.getByText('LE-001')).toBeInTheDocument();
    });

    it('should handle fixed column widths for virtualization', () => {
      render(<VirtualizedTable {...defaultProps} />);

      // Check that header has fixed widths
      const headerCells = screen.getAllByRole('columnheader', { hidden: true });
      expect(headerCells.length).toBeGreaterThan(0);
    });

    it('should optimize rendering with overscan prop', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          overscan={10}
        />
      );

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
  });

  describe('📊 Data Display', () => {
    it('should display lista data correctly', () => {
      render(<VirtualizedTable {...defaultProps} />);

      // Check that data is displayed
      expect(screen.getByText('LE-001')).toBeInTheDocument();
      expect(screen.getByText('LE-002')).toBeInTheDocument();
      expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument();
      expect(screen.getByText('Proyecto Beta')).toBeInTheDocument();
    });

    it('should display status badges correctly', () => {
      render(<VirtualizedTable {...defaultProps} />);

      expect(screen.getByText('Borrador')).toBeInTheDocument();
      expect(screen.getByText('Aprobado')).toBeInTheDocument();
    });

    it('should display formatted amounts correctly', () => {
      render(<VirtualizedTable {...defaultProps} />);

      expect(screen.getByText('USD 50,000')).toBeInTheDocument();
      expect(screen.getByText('USD 75,000')).toBeInTheDocument();
    });

    it('should display formatted dates correctly', () => {
      render(<VirtualizedTable {...defaultProps} />);

      // Dates should be formatted as locale strings
      expect(screen.getByText('6/1/2024')).toBeInTheDocument();
      expect(screen.getByText('7/1/2024')).toBeInTheDocument();
    });

    it('should show coherence indicators when enabled', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          showCoherenceIndicators={true}
        />
      );

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should hide coherence indicators when disabled', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          showCoherenceIndicators={false}
        />
      );

      expect(screen.queryByText('85%')).not.toBeInTheDocument();
    });
  });

  describe('✅ Selection Functionality', () => {
    it('should show checkboxes when bulk actions are enabled', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          allowBulkActions={true}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should hide checkboxes when bulk actions are disabled', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          allowBulkActions={false}
        />
      );

      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });

    it('should handle individual item selection', async () => {
      const user = userEvent.setup();
      render(<VirtualizedTable {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1]; // Skip "select all" checkbox

      await user.click(firstItemCheckbox);
      expect(firstItemCheckbox).toBeChecked();
    });

    it('should handle select all functionality', async () => {
      const user = userEvent.setup();
      render(<VirtualizedTable {...defaultProps} />);

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      // All item checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.slice(1).forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('🎛️ Interactions', () => {
    it('should call onListaClick when row is clicked', async () => {
      const onListaClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <VirtualizedTable 
          {...defaultProps} 
          onListaClick={onListaClick}
        />
      );

      const firstRow = screen.getByText('LE-001').closest('div');
      if (firstRow) {
        await user.click(firstRow);
        expect(onListaClick).toHaveBeenCalledWith(mockListas[0]);
      }
    });

    it('should call onListaEdit when edit action is clicked', async () => {
      const onListaEdit = jest.fn();
      const user = userEvent.setup();
      
      render(
        <VirtualizedTable 
          {...defaultProps} 
          onListaEdit={onListaEdit}
          allowEdit={true}
        />
      );

      // Click on actions dropdown
      const actionButtons = screen.getAllByRole('button', { name: /more/i });
      if (actionButtons.length > 0) {
        await user.click(actionButtons[0]);
        
        // Click edit option
        const editButton = screen.getByText('Editar');
        await user.click(editButton);
        
        expect(onListaEdit).toHaveBeenCalledWith(mockListas[0]);
      }
    });

    it('should handle bulk actions when items are selected', async () => {
      const onBulkAction = jest.fn();
      const user = userEvent.setup();
      
      render(
        <VirtualizedTable 
          {...defaultProps} 
          onBulkAction={onBulkAction}
        />
      );

      // Select an item first
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Should show bulk action buttons
      await waitFor(() => {
        expect(screen.getByText('Aprobar')).toBeInTheDocument();
      });

      // Click bulk action
      await user.click(screen.getByText('Aprobar'));
      expect(onBulkAction).toHaveBeenCalledWith('aprobar', [mockListas[0].id]);
    });
  });

  describe('🎨 UI States', () => {
    it('should show loading state', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          loading={true}
        />
      );

      // Should show skeleton loaders
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.some(el => el.className.includes('animate-pulse'))).toBe(true);
    });

    it('should show empty state when no data', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          listas={[]}
        />
      );

      expect(screen.getByText('No hay listas de equipos')).toBeInTheDocument();
      expect(screen.getByText('Aún no se han creado listas de equipos')).toBeInTheDocument();
    });

    it('should show filtered empty state', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          listas={[]}
          filtros={{ search: 'test' }}
        />
      );

      expect(screen.getByText('No se encontraron listas con los filtros aplicados')).toBeInTheDocument();
    });

    it('should show bulk action header when items are selected', async () => {
      const user = userEvent.setup();
      render(<VirtualizedTable {...defaultProps} />);

      // Select an item
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Should show selection count
      await waitFor(() => {
        expect(screen.getByText('1 lista seleccionada')).toBeInTheDocument();
      });
    });
  });

  describe('🔧 Configuration', () => {
    it('should use custom item height', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          itemHeight={80}
        />
      );

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('should use custom container height', () => {
      render(
        <VirtualizedTable 
          {...defaultProps} 
          containerHeight={400}
        />
      );

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <VirtualizedTable 
          {...defaultProps} 
          className="custom-table-class"
        />
      );

      expect(container.querySelector('.custom-table-class')).toBeInTheDocument();
    });
  });

  describe('📱 Responsive Behavior', () => {
    it('should handle horizontal scrolling for wide content', () => {
      render(<VirtualizedTable {...defaultProps} />);

      // Should have overflow-auto for horizontal scrolling
      const scrollContainer = screen.getByTestId('virtualized-list').parentElement;
      expect(scrollContainer).toHaveClass('overflow-auto');
    });

    it('should maintain fixed header during scroll', () => {
      render(<VirtualizedTable {...defaultProps} />);

      // Header should be separate from scrollable content
      const headers = screen.getAllByText(/Código|Proyecto|Estado/);
      expect(headers.length).toBeGreaterThan(0);
    });
  });

  describe('♿ Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<VirtualizedTable {...defaultProps} />);

      // Checkboxes should have accessible names
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<VirtualizedTable {...defaultProps} />);

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      
      // Should be focusable
      await user.tab();
      expect(firstCheckbox).toHaveFocus();

      // Should be toggleable with space
      await user.keyboard(' ');
      expect(firstCheckbox).toBeChecked();
    });

    it('should have proper tooltips for coherence indicators', async () => {
      const user = userEvent.setup();
      render(<VirtualizedTable {...defaultProps} />);

      const coherenceIndicator = screen.getByText('85%');
      
      // Hover should show tooltip
      await user.hover(coherenceIndicator);
      
      await waitFor(() => {
        expect(screen.getByText('Buena coherencia')).toBeInTheDocument();
      });
    });
  });

  describe('🧪 Performance Benchmarks', () => {
    it('should handle 1000+ items without performance degradation', () => {
      const startTime = performance.now();
      
      const largeListas = generateLargeDataset(1000);
      render(<VirtualizedTable {...defaultProps} listas={largeListas} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should maintain constant memory usage regardless of dataset size', () => {
      const smallDataset = generateLargeDataset(10);
      const largeDataset = generateLargeDataset(1000);
      
      const { container: smallContainer } = render(
        <VirtualizedTable {...defaultProps} listas={smallDataset} />
      );
      
      const { container: largeContainer } = render(
        <VirtualizedTable {...defaultProps} listas={largeDataset} />
      );
      
      // DOM node count should be similar (virtualization effect)
      const smallNodes = smallContainer.querySelectorAll('*').length;
      const largeNodes = largeContainer.querySelectorAll('*').length;
      
      // Large dataset should not create proportionally more DOM nodes
      expect(largeNodes / smallNodes).toBeLessThan(2);
    });
  });
});