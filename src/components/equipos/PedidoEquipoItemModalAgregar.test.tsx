/**
 * @fileoverview Tests for PedidoEquipoItemModalAgregar component
 * Tests modal functionality, UX/UI improvements, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import PedidoEquipoItemModalAgregar from './PedidoEquipoItemModalAgregar';
import type { ItemCatalogo } from '@/types/modelos';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock data
const mockItems: ItemCatalogo[] = [
  {
    id: '1',
    codigo: 'ITEM001',
    descripcion: 'Item de prueba 1',
    unidad: 'UND',
    tiempoEntrega: 5,
    disponible: true,
    precioUnitario: 100.50,
    categoria: 'Categoria A',
    subcategoria: 'Sub A',
    marca: 'Marca A',
    modelo: 'Modelo A',
    especificaciones: 'Especificaciones A',
    activo: true,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
  },
  {
    id: '2',
    codigo: 'ITEM002',
    descripcion: 'Item de prueba 2',
    unidad: 'KG',
    tiempoEntrega: 10,
    disponible: false,
    precioUnitario: 250.75,
    categoria: 'Categoria B',
    subcategoria: 'Sub B',
    marca: 'Marca B',
    modelo: 'Modelo B',
    especificaciones: 'Especificaciones B',
    activo: true,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
  },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onAgregar: jest.fn(),
  items: mockItems,
};

describe('PedidoEquipoItemModalAgregar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Basic rendering tests
  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      expect(screen.getByText('Agregar Items al Pedido')).toBeInTheDocument();
      expect(screen.getByText('Selecciona los items que deseas agregar al pedido de equipo')).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      render(<PedidoEquipoItemModalAgregar {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Agregar Items al Pedido')).not.toBeInTheDocument();
    });

    it('should render all items in table', () => {
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      expect(screen.getByText('ITEM001')).toBeInTheDocument();
      expect(screen.getByText('Item de prueba 1')).toBeInTheDocument();
      expect(screen.getByText('ITEM002')).toBeInTheDocument();
      expect(screen.getByText('Item de prueba 2')).toBeInTheDocument();
    });
  });

  // ✅ Search functionality tests
  describe('Search Functionality', () => {
    it('should filter items by search term', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por código o descripción...');
      await user.type(searchInput, 'ITEM001');
      
      expect(screen.getByText('ITEM001')).toBeInTheDocument();
      expect(screen.queryByText('ITEM002')).not.toBeInTheDocument();
      expect(screen.getByText('1 item encontrado')).toBeInTheDocument();
    });

    it('should show empty state when no items match search', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por código o descripción...');
      await user.type(searchInput, 'NONEXISTENT');
      
      expect(screen.getByText('No se encontraron items')).toBeInTheDocument();
      expect(screen.getByText('Limpiar búsqueda')).toBeInTheDocument();
    });

    it('should clear search when clicking clear button', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por código o descripción...');
      await user.type(searchInput, 'NONEXISTENT');
      
      const clearButton = screen.getByText('Limpiar búsqueda');
      await user.click(clearButton);
      
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('ITEM001')).toBeInTheDocument();
      expect(screen.getByText('ITEM002')).toBeInTheDocument();
    });
  });

  // ✅ Filter functionality tests
  describe('Filter Functionality', () => {
    it('should filter by availability when checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const availabilityFilter = screen.getByLabelText('Solo disponibles');
      await user.click(availabilityFilter);
      
      expect(screen.getByText('ITEM001')).toBeInTheDocument();
      expect(screen.queryByText('ITEM002')).not.toBeInTheDocument();
      expect(screen.getByText('1 item encontrado')).toBeInTheDocument();
    });
  });

  // ✅ Item selection tests
  describe('Item Selection', () => {
    it('should select and deselect items', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1]; // Skip the "Solo disponibles" checkbox
      
      await user.click(firstItemCheckbox);
      expect(firstItemCheckbox).toBeChecked();
      
      // Should show selected items summary
      expect(screen.getByText('1 item seleccionado')).toBeInTheDocument();
      expect(screen.getByText('Total: S/ 100.50')).toBeInTheDocument();
      
      await user.click(firstItemCheckbox);
      expect(firstItemCheckbox).not.toBeChecked();
    });

    it('should update quantity for selected items', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1];
      
      await user.click(firstItemCheckbox);
      
      const incrementButton = screen.getByLabelText('Incrementar cantidad');
      await user.click(incrementButton);
      
      const quantityInput = screen.getByDisplayValue('2');
      expect(quantityInput).toBeInTheDocument();
      expect(screen.getByText('Total: S/ 201.00')).toBeInTheDocument();
    });

    it('should not allow quantity below 1', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1];
      
      await user.click(firstItemCheckbox);
      
      const decrementButton = screen.getByLabelText('Decrementar cantidad');
      await user.click(decrementButton);
      
      const quantityInput = screen.getByDisplayValue('1');
      expect(quantityInput).toBeInTheDocument();
    });
  });

  // ✅ Form submission tests
  describe('Form Submission', () => {
    it('should add selected items successfully', async () => {
      const user = userEvent.setup();
      const mockOnAgregar = jest.fn().mockResolvedValue(undefined);
      
      render(
        <PedidoEquipoItemModalAgregar 
          {...defaultProps} 
          onAgregar={mockOnAgregar}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1];
      
      await user.click(firstItemCheckbox);
      
      const addButton = screen.getByText(/Agregar 1 item/);
      await user.click(addButton);
      
      await waitFor(() => {
        expect(mockOnAgregar).toHaveBeenCalledWith([
          {
            itemId: '1',
            cantidad: 1,
            costoUnitario: 100.50,
            fechaRecomendadaCompra: expect.any(Date),
          },
        ]);
      });
    });

    it('should show error when no items selected', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const addButton = screen.getByText('Agregar Items');
      expect(addButton).toBeDisabled();
    });

    it('should handle submission errors', async () => {
      const user = userEvent.setup();
      const mockOnAgregar = jest.fn().mockRejectedValue(new Error('Error de prueba'));
      
      render(
        <PedidoEquipoItemModalAgregar 
          {...defaultProps} 
          onAgregar={mockOnAgregar}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1];
      
      await user.click(firstItemCheckbox);
      
      const addButton = screen.getByText(/Agregar 1 item/);
      await user.click(addButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al agregar items al pedido');
      });
    });
  });

  // ✅ Modal behavior tests
  describe('Modal Behavior', () => {
    it('should close modal and reset state', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(
        <PedidoEquipoItemModalAgregar 
          {...defaultProps} 
          onClose={mockOnClose}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1];
      await user.click(firstItemCheckbox);
      
      const cancelButton = screen.getByText('Cancelar');
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ✅ UX/UI improvements tests
  describe('UX/UI Improvements', () => {
    it('should display proper badges for availability', () => {
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      expect(screen.getByText('Disponible')).toBeInTheDocument();
      expect(screen.getByText('No disponible')).toBeInTheDocument();
    });

    it('should format prices correctly', () => {
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      expect(screen.getByText('S/ 100.50')).toBeInTheDocument();
      expect(screen.getByText('S/ 250.75')).toBeInTheDocument();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockOnAgregar = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <PedidoEquipoItemModalAgregar 
          {...defaultProps} 
          onAgregar={mockOnAgregar}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1];
      
      await user.click(firstItemCheckbox);
      
      const addButton = screen.getByText(/Agregar 1 item/);
      await user.click(addButton);
      
      expect(screen.getByText('Agregando items...')).toBeInTheDocument();
    });
  });

  // ✅ Accessibility tests
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      expect(screen.getByLabelText('Solo disponibles')).toBeInTheDocument();
      expect(screen.getByLabelText('Incrementar cantidad')).toBeInTheDocument();
      expect(screen.getByLabelText('Decrementar cantidad')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PedidoEquipoItemModalAgregar {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por código o descripción...');
      searchInput.focus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByLabelText('Solo disponibles')).toHaveFocus();
    });
  });
});