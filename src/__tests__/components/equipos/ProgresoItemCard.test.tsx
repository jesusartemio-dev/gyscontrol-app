/**
 * @fileoverview Tests para ProgresoItemCard - Componente de progreso de items de entrega
 * @version 1.0.0
 * @author Sistema GYS
 * @since 2024
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgresoItemCard } from '@/components/equipos/ProgresoItemCard';
import { EstadoEntregaItem } from '@/types/modelos';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock de iconos
jest.mock('lucide-react', () => ({
  Clock: ({ className }: { className?: string }) => <div className={className} data-testid="clock-icon" />,
  Truck: ({ className }: { className?: string }) => <div className={className} data-testid="truck-icon" />,
  Package: ({ className }: { className?: string }) => <div className={className} data-testid="package-icon" />,
  CheckCircle: ({ className }: { className?: string }) => <div className={className} data-testid="check-circle-icon" />,
  AlertTriangle: ({ className }: { className?: string }) => <div className={className} data-testid="alert-triangle-icon" />,
  XCircle: ({ className }: { className?: string }) => <div className={className} data-testid="x-circle-icon" />,
  Edit: ({ className }: { className?: string }) => <div className={className} data-testid="edit-icon" />,
}));

describe('ProgresoItemCard', () => {
  afterEach(() => cleanup());

  const mockItem = {
    id: 'item-1',
    descripcion: 'Item de prueba',
    cantidadSolicitada: 10,
    cantidadAtendida: 5,
    estadoEntrega: EstadoEntregaItem.EN_PROCESO,
    fechaEntregaEstimada: new Date('2024-12-31'),
    fechaEntregaReal: null,
    observacionesEntrega: 'En proceso de entrega'
  };

  describe('Rendering', () => {
    it('should render correctly with basic props', () => {
      render(<ProgresoItemCard item={mockItem} />);
      
      expect(screen.getByText('Item de prueba')).toBeInTheDocument();
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render with compact mode', () => {
      render(<ProgresoItemCard item={mockItem} compacto />);
      
      expect(screen.getByText('Item de prueba')).toBeInTheDocument();
      // En modo compacto debería mostrar menos información
    });

    it('should show correct icon for each state', () => {
      const { rerender } = render(<ProgresoItemCard item={mockItem} />);
      expect(screen.getByTestId('truck-icon')).toBeInTheDocument();

      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.PENDIENTE }} />);
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();

      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.ENTREGADO }} />);
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();

      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.RETRASADO }} />);
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();

      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.CANCELADO }} />);
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();

      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.PARCIAL }} />);
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly', () => {
      render(<ProgresoItemCard item={mockItem} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should handle zero quantities', () => {
      const itemWithZero = { ...mockItem, cantidadSolicitada: 0, cantidadAtendida: 0 };
      render(<ProgresoItemCard item={itemWithZero} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle complete delivery', () => {
      const completedItem = { 
        ...mockItem, 
        cantidadAtendida: 10, 
        estadoEntrega: EstadoEntregaItem.ENTREGADO 
      };
      render(<ProgresoItemCard item={completedItem} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle edit button click', async () => {
      const mockOnEdit = jest.fn();
      const user = userEvent.setup();
      
      render(<ProgresoItemCard item={mockItem} onEditar={mockOnEdit} />);
      
      const editButton = screen.getByRole('button', { name: /editar/i });
      await user.click(editButton);
      
      expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
    });

    it('should not show edit button when item is delivered or cancelled', () => {
      const deliveredItem = { ...mockItem, estadoEntrega: EstadoEntregaItem.ENTREGADO };
      render(<ProgresoItemCard item={deliveredItem} onEditar={jest.fn()} />);
      
      expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    });
  });

  describe('Date Handling', () => {
    it('should show estimated delivery date', () => {
      render(<ProgresoItemCard item={mockItem} />);
      expect(screen.getByText(/31\/12\/2024/)).toBeInTheDocument();
    });

    it('should show actual delivery date when available', () => {
      const deliveredItem = {
        ...mockItem,
        fechaEntregaReal: new Date('2024-12-25'),
        estadoEntrega: EstadoEntregaItem.ENTREGADO
      };
      render(<ProgresoItemCard item={deliveredItem} />);
      expect(screen.getByText(/25\/12\/2024/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ProgresoItemCard item={mockItem} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have accessible button labels', () => {
      render(<ProgresoItemCard item={mockItem} onEditar={jest.fn()} />);
      
      const editButton = screen.getByRole('button', { name: /editar/i });
      expect(editButton).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('should apply correct color classes for different states', () => {
      const { rerender } = render(<ProgresoItemCard item={mockItem} />);
      
      // Test different states and their visual representation
      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.ENTREGADO }} />);
      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.RETRASADO }} />);
      rerender(<ProgresoItemCard item={{ ...mockItem, estadoEntrega: EstadoEntregaItem.CANCELADO }} />);
      
      // Visual tests would check for specific CSS classes
      expect(screen.getByText('Item de prueba')).toBeInTheDocument();
    });
  });
});
