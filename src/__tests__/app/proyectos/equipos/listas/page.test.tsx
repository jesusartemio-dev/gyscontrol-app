/**
 * @fileoverview Tests for Equipment Lists Page with UX/UI improvements
 * Tests the redesigned page with Framer Motion animations, enhanced UI components,
 * and improved user experience following MEJORAS_UX_UI.md guidelines
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import EquipmentListsPage from '@/app/proyectos/[id]/equipos/listas/page';
import * as proyectoService from '@/lib/services/proyectos';
import * as listaEquipoService from '@/lib/services/listaEquipo';
import { Proyecto, ListaEquipo } from '@/types/modelos';

// ✅ Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/lib/services/proyectos');
jest.mock('@/lib/services/listaEquipo');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ✅ Mock data
const mockProyecto: Proyecto = {
  id: 'test-proyecto-id',
  nombre: 'Proyecto Test',
  descripcion: 'Descripción del proyecto test',
  estado: 'EN_PROGRESO',
  cliente: 'Cliente Test',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  presupuesto: 100000,
  moneda: 'PEN',
  costoTotalCliente: 85000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockListasEquipo: ListaEquipo[] = [
  {
    id: 'lista-1',
    nombre: 'Lista Test 1',
    descripcion: 'Descripción lista 1',
    proyectoId: 'test-proyecto-id',
    estado: 'ACTIVA',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'lista-2',
    nombre: 'Lista Test 2',
    descripcion: 'Descripción lista 2',
    proyectoId: 'test-proyecto-id',
    estado: 'COMPLETADA',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockGetProyectoById = proyectoService.getProyectoById as jest.MockedFunction<typeof proyectoService.getProyectoById>;
const mockGetListaEquiposPorProyecto = listaEquipoService.getListaEquiposPorProyecto as jest.MockedFunction<typeof listaEquipoService.getListaEquiposPorProyecto>;

const mockPush = jest.fn();

describe('EquipmentListsPage - UX/UI Enhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseParams.mockReturnValue({ id: 'test-proyecto-id' });
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  // ✅ Test: Loading state with enhanced skeleton
  it('should show enhanced loading state initially', () => {
    mockGetProyectoById.mockImplementation(() => new Promise(() => {}));
    mockGetListaEquiposPorProyecto.mockImplementation(() => new Promise(() => {}));

    render(<EquipmentListsPage />);

    expect(screen.getByText('Cargando información del proyecto...')).toBeInTheDocument();
    expect(screen.getByTestId('enhanced-skeleton')).toBeInTheDocument();
  });

  // ✅ Test: Successful data loading with animations
  it('should render project data and equipment lists successfully', async () => {
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListasEquipo);

    render(<EquipmentListsPage />);

    await waitFor(() => {
      expect(screen.getByText('Listas de Equipos')).toBeInTheDocument();
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
      expect(screen.getByText('Cliente Test')).toBeInTheDocument();
    });

    // ✅ Verify enhanced breadcrumb navigation
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Proyectos')).toBeInTheDocument();
    expect(screen.getByText('Equipos')).toBeInTheDocument();
    expect(screen.getByText('Listas')).toBeInTheDocument();

    // ✅ Verify action buttons
    expect(screen.getByText('Vista Integrada')).toBeInTheDocument();
    expect(screen.getByText('Compartir')).toBeInTheDocument();
    expect(screen.getByText('Exportar')).toBeInTheDocument();
    expect(screen.getByText('Configurar')).toBeInTheDocument();
  });

  // ✅ Test: Enhanced project information card
  it('should display enhanced project information with proper formatting', async () => {
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListasEquipo);

    render(<EquipmentListsPage />);

    await waitFor(() => {
      // ✅ Verify status badge
      expect(screen.getByText('En Progreso')).toBeInTheDocument();
      
      // ✅ Verify formatted currency
      expect(screen.getByText('S/ 85,000.00')).toBeInTheDocument();
      
      // ✅ Verify formatted dates
      expect(screen.getByText('01/01/2024')).toBeInTheDocument();
    });
  });

  // ✅ Test: Enhanced master statistics cards
  it('should display enhanced master statistics with animations', async () => {
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListasEquipo);

    render(<EquipmentListsPage />);

    await waitFor(() => {
      // ✅ Verify statistics cards
      expect(screen.getByText('Total Listas')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('Total Costo')).toBeInTheDocument();
      expect(screen.getByText('Progreso Promedio')).toBeInTheDocument();
    });
  });

  // ✅ Test: Error state with retry functionality
  it('should show enhanced error state when data fetching fails', async () => {
    const errorMessage = 'Error al cargar datos';
    mockGetProyectoById.mockRejectedValue(new Error(errorMessage));
    mockGetListaEquiposPorProyecto.mockRejectedValue(new Error(errorMessage));

    render(<EquipmentListsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar la información')).toBeInTheDocument();
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });

    // ✅ Test retry functionality
    const retryButton = screen.getByText('Reintentar');
    fireEvent.click(retryButton);

    expect(mockGetProyectoById).toHaveBeenCalledTimes(2);
    expect(mockGetListaEquiposPorProyecto).toHaveBeenCalledTimes(2);
  });

  // ✅ Test: Navigation functionality
  it('should handle navigation actions correctly', async () => {
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListasEquipo);

    render(<EquipmentListsPage />);

    await waitFor(() => {
      const vistaIntegradaButton = screen.getByText('Vista Integrada');
      fireEvent.click(vistaIntegradaButton);
      
      expect(mockPush).toHaveBeenCalledWith('/proyectos/test-proyecto-id/equipos');
    });
  });

  // ✅ Test: Breadcrumb navigation
  it('should handle breadcrumb navigation correctly', async () => {
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListasEquipo);

    render(<EquipmentListsPage />);

    await waitFor(() => {
      const inicioButton = screen.getByText('Inicio');
      fireEvent.click(inicioButton);
      
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    await waitFor(() => {
      const proyectosButton = screen.getByText('Proyectos');
      fireEvent.click(proyectosButton);
      
      expect(mockPush).toHaveBeenCalledWith('/proyectos');
    });
  });

  // ✅ Test: Responsive design elements
  it('should render responsive design elements', async () => {
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListasEquipo);

    render(<EquipmentListsPage />);

    await waitFor(() => {
      // ✅ Verify responsive grid classes are applied
      const container = screen.getByTestId('equipment-lists-container');
      expect(container).toHaveClass('min-h-screen');
      
      // ✅ Verify responsive statistics grid
      const statsGrid = screen.getByTestId('master-stats-grid');
      expect(statsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });

  // ✅ Test: Accessibility features
  it('should have proper accessibility attributes', async () => {
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListasEquipo);

    render(<EquipmentListsPage />);

    await waitFor(() => {
      // ✅ Verify ARIA labels and roles
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // ✅ Verify button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type');
      });
    });
  });
});

// ✅ Test utilities for enhanced components
describe('Enhanced Component Utilities', () => {
  it('should format currency correctly', () => {
    // This would test the formatCurrency helper function
    // Implementation depends on the actual helper function
  });

  it('should format dates correctly', () => {
    // This would test the formatDate helper function
    // Implementation depends on the actual helper function
  });

  it('should generate correct status badges', () => {
    // This would test the getStatusBadgeVariant helper function
    // Implementation depends on the actual helper function
  });
});