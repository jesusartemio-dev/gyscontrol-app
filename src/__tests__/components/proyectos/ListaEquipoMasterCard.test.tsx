/**
 * 🧪 ListaEquipoMasterCard Component Tests
 * 
 * Unit tests for the Master Card component in the Master-Detail pattern
 * ensuring proper rendering, interactions, and data display.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ListaEquipoMasterCard } from '@/components/proyectos/ListaEquipoMasterCard';
import { ListaEquipoMaster } from '@/types/master-detail';

// 🎭 Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// 🎭 Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn()
};

(useRouter as jest.Mock).mockReturnValue(mockRouter);

// 📊 Mock data for testing
const mockListaEquipo: ListaEquipoMaster = {
  id: 'lista-1',
  codigo: 'LST-001',
  nombre: 'Lista de Equipos Eléctricos',
  estado: 'por_cotizar',
  numeroSecuencia: 1,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
  stats: {
    totalItems: 25,
    itemsVerificados: 18,
    itemsAprobados: 15,
    itemsRechazados: 2,
    costoTotal: 150000,
    costoAprobado: 145000
  },
  responsable: {
    id: 'user-1',
    nombre: 'Juan Pérez',
    email: 'juan@example.com'
  },
  proyecto: {
    id: 'proyecto-1',
    nombre: 'Proyecto Construcción',
    codigo: 'PROJ-001'
  }
};

const mockOnNavigate = jest.fn();

describe('ListaEquipoMasterCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Basic Rendering Tests
  describe('Basic Rendering', () => {
    it('should render the card with basic information', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('Lista de Equipos Eléctricos')).toBeInTheDocument();
      expect(screen.getByText('Equipos eléctricos para el proyecto de construcción')).toBeInTheDocument();
    });

    it('should display the correct status badge', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const statusBadge = screen.getByText('Activo');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.closest('.bg-blue-100')).toBeInTheDocument();
    });

    it('should show statistics correctly', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('25')).toBeInTheDocument(); // Total items
      expect(screen.getByText('18')).toBeInTheDocument(); // Completed items
      expect(screen.getByText('75%')).toBeInTheDocument(); // Progress
    });

    it('should display cost information formatted correctly', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('S/ 150,000.00')).toBeInTheDocument();
    });
  });

  // ✅ Status Variants Tests
  describe('Status Variants', () => {
    const statusTests = [
      { status: 'draft' as const, expectedText: 'Borrador', expectedClass: 'bg-gray-100' },
      { status: 'active' as const, expectedText: 'Activo', expectedClass: 'bg-blue-100' },
      { status: 'completed' as const, expectedText: 'Completado', expectedClass: 'bg-green-100' },
      { status: 'on-hold' as const, expectedText: 'En Pausa', expectedClass: 'bg-yellow-100' },
      { status: 'cancelled' as const, expectedText: 'Cancelado', expectedClass: 'bg-red-100' }
    ];

    statusTests.forEach(({ status, expectedText, expectedClass }) => {
      it(`should render ${status} status correctly`, () => {
        const listaWithStatus = { ...mockListaEquipo, status };
        
        render(
          <ListaEquipoMasterCard 
            lista={listaWithStatus} 
            onNavigateToDetail={mockOnNavigate}
          />
        );

        const statusBadge = screen.getByText(expectedText);
        expect(statusBadge).toBeInTheDocument();
        expect(statusBadge.closest(`.${expectedClass.replace(' ', '.')}`)).toBeInTheDocument();
      });
    });
  });

  // ✅ Progress Bar Tests
  describe('Progress Bar', () => {
    it('should display progress bar with correct percentage', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should handle 0% progress correctly', () => {
      const listaWithZeroProgress = { 
        ...mockListaEquipo, 
        progress: 0,
        stats: {
          ...mockListaEquipo.stats,
          completedItems: 0
        }
      };
      
      render(
        <ListaEquipoMasterCard 
          lista={listaWithZeroProgress} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle 100% progress correctly', () => {
      const listaWithFullProgress = { 
        ...mockListaEquipo, 
        progress: 100,
        stats: {
          ...mockListaEquipo.stats,
          completedItems: 25
        }
      };
      
      render(
        <ListaEquipoMasterCard 
          lista={listaWithFullProgress} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  // ✅ Items Preview Tests
  describe('Items Preview', () => {
    it('should display preview items when available', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('Motor Eléctrico 5HP')).toBeInTheDocument();
      expect(screen.getByText('Panel de Control')).toBeInTheDocument();
      expect(screen.getByText('Cables de Alimentación')).toBeInTheDocument();
    });

    it('should show "Sin items" when no preview items', () => {
      const listaWithoutItems = {
        ...mockListaEquipo,
        itemsPreview: []
      };
      
      render(
        <ListaEquipoMasterCard 
          lista={listaWithoutItems} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('Sin items disponibles')).toBeInTheDocument();
    });

    it('should display item status badges correctly', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('Completado')).toBeInTheDocument();
      expect(screen.getByText('En Progreso')).toBeInTheDocument();
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });
  });

  // ✅ Interaction Tests
  describe('Interactions', () => {
    it('should call onNavigateToDetail when "Ver Detalles" button is clicked', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const detailButton = screen.getByText('Ver Detalles');
      fireEvent.click(detailButton);

      expect(mockOnNavigate).toHaveBeenCalledWith(mockListaEquipo.id);
    });

    it('should call onNavigateToDetail when card is clicked', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const card = screen.getByRole('article');
      fireEvent.click(card);

      expect(mockOnNavigate).toHaveBeenCalledWith(mockListaEquipo.id);
    });

    it('should show hover effects on card interaction', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveClass('hover:shadow-md');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  // ✅ Loading State Tests
  describe('Loading State', () => {
    it('should render skeleton when isLoading is true', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
          isLoading={true}
        />
      );

      // Should render skeleton elements instead of actual content
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render actual content when loading', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
          isLoading={true}
        />
      );

      expect(screen.queryByText('Lista de Equipos Eléctricos')).not.toBeInTheDocument();
    });
  });

  // ✅ Edge Cases Tests
  describe('Edge Cases', () => {
    it('should handle missing description gracefully', () => {
      const listaWithoutDescription = {
        ...mockListaEquipo,
        descripcion: undefined
      };
      
      render(
        <ListaEquipoMasterCard 
          lista={listaWithoutDescription} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('Lista de Equipos Eléctricos')).toBeInTheDocument();
      expect(screen.queryByText('Equipos eléctricos para el proyecto de construcción')).not.toBeInTheDocument();
    });

    it('should handle zero costs correctly', () => {
      const listaWithZeroCosts = {
        ...mockListaEquipo,
        stats: {
          ...mockListaEquipo.stats,
          totalCostoInterno: 0
        }
      };
      
      render(
        <ListaEquipoMasterCard 
          lista={listaWithZeroCosts} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      expect(screen.getByText('S/ 0.00')).toBeInTheDocument();
    });

    it('should handle very long names correctly', () => {
      const listaWithLongName = {
        ...mockListaEquipo,
        nombre: 'Lista de Equipos Eléctricos y Mecánicos para el Proyecto de Construcción de la Nueva Planta Industrial'
      };
      
      render(
        <ListaEquipoMasterCard 
          lista={listaWithLongName} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const nameElement = screen.getByText(listaWithLongName.nombre);
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveClass('line-clamp-2'); // Should have text truncation
    });
  });

  // ✅ Accessibility Tests
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Lista de Equipos Eléctricos'));
    });

    it('should have proper button accessibility', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const detailButton = screen.getByRole('button', { name: /ver detalles/i });
      expect(detailButton).toBeInTheDocument();
      expect(detailButton).not.toHaveAttribute('disabled');
    });

    it('should have proper progress bar accessibility', () => {
      render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  // ✅ Performance Tests
  describe('Performance', () => {
    it('should not re-render unnecessarily when props do not change', () => {
      const { rerender } = render(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const initialRender = screen.getByText('Lista de Equipos Eléctricos');
      
      // Re-render with same props
      rerender(
        <ListaEquipoMasterCard 
          lista={mockListaEquipo} 
          onNavigateToDetail={mockOnNavigate}
        />
      );

      const afterRerender = screen.getByText('Lista de Equipos Eléctricos');
      expect(initialRender).toBe(afterRerender); // Should be the same DOM node
    });
  });
});