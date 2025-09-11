/**
 * @fileoverview Tests for ListaEquipoMasterList component
 * @description Unit tests for Master list component in Master-Detail pattern
 * @author GYS Team
 * @date 2024
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListaEquipoMasterList } from '@/components/proyectos/ListaEquipoMasterList';
import { ListaEquipoMaster } from '@/types/master-detail';
import { SortConfig } from '@/types/modelos';

// 🎭 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>
  },
  AnimatePresence: ({ children }: any) => children
}));

// 🎭 Mock child components
jest.mock('@/components/proyectos/ListaEquipoMasterCard', () => ({
  ListaEquipoMasterCard: ({ lista, onSelect, onViewDetail, onEdit, onDelete, isSelected }: any) => (
    <div data-testid={`master-card-${lista.id}`}>
      <span>{lista.nombre}</span>
      <button onClick={() => onSelect(lista.id)}>Select</button>
      <button onClick={() => onViewDetail(lista.id)}>View Detail</button>
      <button onClick={() => onEdit(lista.id)}>Edit</button>
      <button onClick={() => onDelete(lista.id)}>Delete</button>
      {isSelected && <span data-testid="selected-indicator">Selected</span>}
    </div>
  )
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children, onClick }: any) => (
    <th onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
      {children}
    </th>
  ),
  TableCell: ({ children }: any) => <td>{children}</td>
}));

// 📊 Mock data
const mockListas: ListaEquipoMaster[] = [
  {
    id: 'lista-1',
    codigo: 'LST-001',
    nombre: 'Lista Equipos Eléctricos',
    estado: 'por_cotizar',
    numeroSecuencia: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    stats: {
      totalItems: 25,
      itemsVerificados: 15,
      itemsAprobados: 12,
      itemsRechazados: 2,
      costoTotal: 50000,
      costoAprobado: 35000
    },
    responsable: {
      id: 'user-1',
      nombre: 'Juan Pérez',
      email: 'juan@example.com'
    },
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Torre',
      codigo: 'PROJ-001'
    }
  },
  {
    id: 'lista-2',
    codigo: 'LST-002',
    nombre: 'Lista Equipos Mecánicos',
    estado: 'aprobado',
    numeroSecuencia: 2,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20'),
    stats: {
      totalItems: 15,
      itemsVerificados: 15,
      itemsAprobados: 15,
      itemsRechazados: 0,
      costoTotal: 30000,
      costoAprobado: 28000
    },
    responsable: {
      id: 'user-2',
      nombre: 'María García',
      email: 'maria@example.com'
    },
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Torre',
      codigo: 'PROJ-001'
    }
  },
  {
    id: 'lista-3',
    codigo: 'LST-003',
    nombre: 'Lista Equipos Hidráulicos',
    estado: 'por_revisar',
    numeroSecuencia: 3,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-25'),
    stats: {
      totalItems: 20,
      itemsVerificados: 8,
      itemsAprobados: 5,
      itemsRechazados: 1,
      costoTotal: 40000,
      costoAprobado: 15000
    },
    responsable: {
      id: 'user-3',
      nombre: 'Carlos López',
      email: 'carlos@example.com'
    },
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Torre',
      codigo: 'PROJ-001'
    }
  }
];

const mockSelection = {
  selectedIds: [],
  isSelected: jest.fn(() => false),
  isAllSelected: false,
  toggleSelection: jest.fn(),
  selectAll: jest.fn(),
  clearSelection: jest.fn()
};

const mockSortConfig: SortConfig = {
  key: null,
  direction: 'asc',
  updateSort: jest.fn()
};

const mockProps = {
  listas: mockListas,
  viewMode: 'grid' as const,
  selection: mockSelection,
  sortConfig: mockSortConfig,
  onViewDetail: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onBulkAction: jest.fn(),
  loading: false,
  showActions: true,
  compact: false
};

describe('ListaEquipoMasterList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('✅ Rendering', () => {
    it('should render without crashing', () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      expect(screen.getByText('Lista Equipos Eléctricos')).toBeInTheDocument();
      expect(screen.getByText('Lista Equipos Mecánicos')).toBeInTheDocument();
      expect(screen.getByText('Lista Equipos Hidráulicos')).toBeInTheDocument();
    });

    it('should render empty state when no lists provided', () => {
      const emptyProps = {
        ...mockProps,
        listas: []
      };
      
      render(<ListaEquipoMasterList {...emptyProps} />);
      
      expect(screen.getByText('No hay listas de equipos disponibles')).toBeInTheDocument();
      expect(screen.getByText('Crea una nueva lista para comenzar')).toBeInTheDocument();
    });

    it('should show loading skeleton when loading', () => {
      const loadingProps = {
        ...mockProps,
        loading: true
      };
      
      render(<ListaEquipoMasterList {...loadingProps} />);
      
      expect(screen.getByTestId('master-list-skeleton')).toBeInTheDocument();
    });
  });

  describe('🎨 View Modes', () => {
    it('should render grid view by default', () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const gridContainer = screen.getByTestId('master-list-grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid');
    });

    it('should render table view when viewMode is table', () => {
      const tableProps = {
        ...mockProps,
        viewMode: 'table' as const
      };
      
      render(<ListaEquipoMasterList {...tableProps} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Progreso')).toBeInTheDocument();
      expect(screen.getByText('Presupuesto')).toBeInTheDocument();
      expect(screen.getByText('Responsable')).toBeInTheDocument();
    });

    it('should apply compact styling when compact is true', () => {
      const compactProps = {
        ...mockProps,
        compact: true
      };
      
      render(<ListaEquipoMasterList {...compactProps} />);
      
      const gridContainer = screen.getByTestId('master-list-grid');
      expect(gridContainer).toHaveClass('gap-2'); // Reduced gap in compact mode
    });
  });

  describe('🎯 Selection Functionality', () => {
    it('should show select all checkbox in table view', () => {
      const tableProps = {
        ...mockProps,
        viewMode: 'table' as const
      };
      
      render(<ListaEquipoMasterList {...tableProps} />);
      
      const selectAllCheckbox = screen.getByLabelText('Seleccionar todos');
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('should handle select all functionality', async () => {
      const user = userEvent.setup();
      const tableProps = {
        ...mockProps,
        viewMode: 'table' as const
      };
      
      render(<ListaEquipoMasterList {...tableProps} />);
      
      const selectAllCheckbox = screen.getByLabelText('Seleccionar todos');
      await user.click(selectAllCheckbox);
      
      expect(mockSelection.selectAll).toHaveBeenCalled();
    });

    it('should handle individual item selection', async () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const selectButton = screen.getAllByText('Select')[0];
      fireEvent.click(selectButton);
      
      expect(mockSelection.toggleSelection).toHaveBeenCalledWith('lista-1');
    });

    it('should show selected state for selected items', () => {
      const selectedProps = {
        ...mockProps,
        selection: {
          ...mockSelection,
          selectedIds: ['lista-1'],
          isSelected: jest.fn((id) => id === 'lista-1')
        }
      };
      
      render(<ListaEquipoMasterList {...selectedProps} />);
      
      expect(screen.getByTestId('selected-indicator')).toBeInTheDocument();
    });
  });

  describe('📊 Sorting Functionality', () => {
    it('should show sortable column headers in table view', () => {
      const tableProps = {
        ...mockProps,
        viewMode: 'table' as const
      };
      
      render(<ListaEquipoMasterList {...tableProps} />);
      
      const nameHeader = screen.getByText('Nombre');
      const statusHeader = screen.getByText('Estado');
      const progressHeader = screen.getByText('Progreso');
      
      expect(nameHeader).toHaveClass('cursor-pointer');
      expect(statusHeader).toHaveClass('cursor-pointer');
      expect(progressHeader).toHaveClass('cursor-pointer');
    });

    it('should handle column sorting', async () => {
      const user = userEvent.setup();
      const tableProps = {
        ...mockProps,
        viewMode: 'table' as const
      };
      
      render(<ListaEquipoMasterList {...tableProps} />);
      
      const nameHeader = screen.getByText('Nombre');
      await user.click(nameHeader);
      
      expect(mockSortConfig.updateSort).toHaveBeenCalledWith('nombre');
    });

    it('should show sort indicators', () => {
      const sortedProps = {
        ...mockProps,
        viewMode: 'table' as const,
        sortConfig: {
          ...mockSortConfig,
          key: 'nombre',
          direction: 'asc' as const
        }
      };
      
      render(<ListaEquipoMasterList {...sortedProps} />);
      
      const nameHeader = screen.getByText('Nombre');
      expect(nameHeader.parentElement).toContainHTML('↑'); // Ascending indicator
    });
  });

  describe('🎛️ Action Handling', () => {
    it('should handle view detail action', async () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const viewDetailButton = screen.getAllByText('View Detail')[0];
      fireEvent.click(viewDetailButton);
      
      expect(mockProps.onViewDetail).toHaveBeenCalledWith('lista-1');
    });

    it('should handle edit action', async () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith('lista-1');
    });

    it('should handle delete action', async () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
      
      expect(mockProps.onDelete).toHaveBeenCalledWith('lista-1');
    });

    it('should hide actions when showActions is false', () => {
      const noActionsProps = {
        ...mockProps,
        showActions: false
      };
      
      render(<ListaEquipoMasterList {...noActionsProps} />);
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('📱 Responsive Design', () => {
    it('should adapt grid columns based on screen size', () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const gridContainer = screen.getByTestId('master-list-grid');
      expect(gridContainer).toHaveClass(
        'grid-cols-1',
        'md:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4'
      );
    });

    it('should show horizontal scroll for table on mobile', () => {
      const tableProps = {
        ...mockProps,
        viewMode: 'table' as const
      };
      
      render(<ListaEquipoMasterList {...tableProps} />);
      
      const tableContainer = screen.getByTestId('table-container');
      expect(tableContainer).toHaveClass('overflow-x-auto');
    });
  });

  describe('🎨 Visual States', () => {
    it('should show hover effects on interactive elements', () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const cards = screen.getAllByTestId(/master-card-/);
      cards.forEach(card => {
        expect(card.parentElement).toHaveClass('hover:shadow-lg');
      });
    });

    it('should apply different styling for different states', () => {
      render(<ListaEquipoMasterList {...mockProps} />);
      
      // Each card should have appropriate styling based on its state
      expect(screen.getByTestId('master-card-lista-1')).toBeInTheDocument();
      expect(screen.getByTestId('master-card-lista-2')).toBeInTheDocument();
      expect(screen.getByTestId('master-card-lista-3')).toBeInTheDocument();
    });
  });

  describe('🔄 Data Updates', () => {
    it('should re-render when listas prop changes', () => {
      const { rerender } = render(<ListaEquipoMasterList {...mockProps} />);
      
      const updatedListas = [
        {
          ...mockListas[0],
          nombre: 'Lista Actualizada'
        }
      ];
      
      rerender(<ListaEquipoMasterList {...mockProps} listas={updatedListas} />);
      
      expect(screen.getByText('Lista Actualizada')).toBeInTheDocument();
      expect(screen.queryByText('Lista Equipos Eléctricos')).not.toBeInTheDocument();
    });

    it('should handle real-time updates smoothly', async () => {
      const { rerender } = render(<ListaEquipoMasterList {...mockProps} />);
      
      // Simulate adding a new item
      const newLista: ListaEquipoMaster = {
        id: 'lista-4',
        nombre: 'Nueva Lista',
        descripcion: 'Nueva descripción',
        estado: 'ACTIVA',
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        totalItems: 5,
        itemsCompletados: 0,
        presupuestoTotal: 10000,
        costoReal: 0,
        responsable: 'Nuevo Usuario',
        proyecto: {
          id: 'proyecto-1',
          nombre: 'Proyecto Torre',
          codigo: 'PROJ-001'
        }
      };
      
      rerender(<ListaEquipoMasterList {...mockProps} listas={[...mockListas, newLista]} />);
      
      await waitFor(() => {
        expect(screen.getByText('Nueva Lista')).toBeInTheDocument();
      });
    });
  });

  describe('♿ Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      const tableProps = {
        ...mockProps,
        viewMode: 'table' as const
      };
      
      render(<ListaEquipoMasterList {...tableProps} />);
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Lista de equipos');
      
      const selectAllCheckbox = screen.getByLabelText('Seleccionar todos');
      expect(selectAllCheckbox).toHaveAttribute('role', 'checkbox');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ListaEquipoMasterList {...mockProps} />);
      
      const firstSelectButton = screen.getAllByText('Select')[0];
      
      await user.tab();
      expect(firstSelectButton).toHaveFocus();
    });

    it('should announce changes to screen readers', () => {
      const selectedProps = {
        ...mockProps,
        selection: {
          ...mockSelection,
          selectedIds: ['lista-1', 'lista-2']
        }
      };
      
      render(<ListaEquipoMasterList {...selectedProps} />);
      
      const announcement = screen.getByLabelText(/2 elementos seleccionados/);
      expect(announcement).toBeInTheDocument();
    });
  });

  describe('⚡ Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeListas = Array.from({ length: 1000 }, (_, i) => ({
        ...mockListas[0],
        id: `lista-${i}`,
        nombre: `Lista ${i}`
      }));
      
      const startTime = performance.now();
      render(<ListaEquipoMasterList {...mockProps} listas={largeListas} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should render in less than 1 second
    });

    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <ListaEquipoMasterList {...props} />;
      };
      
      const { rerender } = render(<TestComponent {...mockProps} />);
      
      // Re-render with same props
      rerender(<TestComponent {...mockProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(2); // Initial + rerender
    });
  });

  describe('🚨 Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedListas = [
        {
          ...mockListas[0],
          fechaCreacion: null,
          totalItems: undefined,
          presupuestoTotal: 'invalid'
        }
      ] as any;
      
      expect(() => {
        render(<ListaEquipoMasterList {...mockProps} listas={malformedListas} />);
      }).not.toThrow();
    });

    it('should handle missing required props', () => {
      const incompleteProps = {
        ...mockProps,
        onViewDetail: undefined,
        onEdit: undefined
      } as any;
      
      expect(() => {
        render(<ListaEquipoMasterList {...incompleteProps} />);
      }).not.toThrow();
    });
  });
});
