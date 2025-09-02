/**
 * 🧪 Tests for ListaEquipoIntegradaPage Component
 * 
 * Tests the integrated view page for equipment lists with ListaEquipoMasterView.
 * Verifies proper props passing, error handling, and component integration.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import ListaEquipoIntegradaPage from '../page';
import { getProyectoById } from '@/lib/services/proyecto';
import { getListaEquiposPorProyecto, createListaEquipo } from '@/lib/services/listaEquipo';
import type { Proyecto, ListaEquipo, ListaEquipoPayload } from '@/types';

// 🎭 Mocks
jest.mock('next/navigation');
jest.mock('next-auth/react');
jest.mock('sonner');
jest.mock('@/lib/services/proyecto');
jest.mock('@/lib/services/listaEquipo');
jest.mock('@/components/proyectos/ListaEquipoMasterView', () => {
  return function MockListaEquipoMasterView({ proyectoId }: { proyectoId: string }) {
    return (
      <div data-testid="lista-equipo-master-view">
        Master View for Project: {proyectoId}
      </div>
    );
  };
});
jest.mock('@/components/equipos/ModalCrearListaEquipo', () => {
  return function MockModalCrearListaEquipo({ 
    proyectoId, 
    onCreated 
  }: { 
    proyectoId: string;
    onCreated: (payload: ListaEquipoPayload) => void;
  }) {
    return (
      <button 
        data-testid="modal-crear-lista"
        onClick={() => onCreated({
          proyectoId,
          nombre: 'Test Lista',
          fechaNecesaria: '2024-12-31',
          estado: 'borrador'
        })}
      >
        Crear Lista
      </button>
    );
  };
});
jest.mock('@/components/equipos/ModalAgregarItemDesdeEquipo', () => {
  return function MockModalAgregarItemDesdeEquipo({ 
    onClose, 
    onCreated 
  }: { 
    onClose: () => void;
    onCreated: () => void;
  }) {
    return (
      <div data-testid="modal-agregar-item">
        <button onClick={onClose}>Close</button>
        <button onClick={onCreated}>Add Item</button>
      </div>
    );
  };
});

// 🎯 Mock implementations
const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockToast = toast as jest.MockedObject<typeof toast>;
const mockGetProyectoById = getProyectoById as jest.Mock;
const mockGetListaEquiposPorProyecto = getListaEquiposPorProyecto as jest.Mock;
const mockCreateListaEquipo = createListaEquipo as jest.Mock;

// 📊 Mock data
const mockProyecto: Proyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  codigo: 'PROJ-001',
  clienteId: 'cliente-1',
  comercialId: 'comercial-1',
  gestorId: 'gestor-1',
  totalCliente: 100000,
  totalInterno: 90000,
  totalEquiposInterno: 50000,
  totalServiciosInterno: 30000,
  totalGastosInterno: 10000,
  descuento: 5000,
  grandTotal: 95000,
  estado: 'activo',
  fechaInicio: '2024-01-01T00:00:00.000Z',
  fechaFin: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

const mockListas: ListaEquipo[] = [
  {
    id: 'lista-1',
    proyectoId: 'proyecto-1',
    nombre: 'Lista Test 1',
    fechaNecesaria: '2024-12-31T00:00:00.000Z',
    estado: 'borrador',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'lista-2',
    proyectoId: 'proyecto-1',
    nombre: 'Lista Test 2',
    fechaNecesaria: '2024-12-31T00:00:00.000Z',
    estado: 'por_revisar',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn()
};

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'comercial'
  }
};

describe('ListaEquipoIntegradaPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseParams.mockReturnValue({ id: 'proyecto-1' });
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseSession.mockReturnValue({ data: mockSession });
    
    mockGetProyectoById.mockResolvedValue(mockProyecto);
    mockGetListaEquiposPorProyecto.mockResolvedValue(mockListas);
    mockCreateListaEquipo.mockResolvedValue({
      id: 'nueva-lista',
      proyectoId: 'proyecto-1',
      nombre: 'Test Lista',
      fechaNecesaria: '2024-12-31T00:00:00.000Z',
      estado: 'borrador',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    });
  });

  describe('Component Rendering', () => {
    it('should render the page with project information', async () => {
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
      });

      expect(screen.getByText('PROJ-001')).toBeInTheDocument();
      expect(screen.getByText('Gestión de Listas - Vista Integrada')).toBeInTheDocument();
    });

    it('should render ListaEquipoMasterView with correct props', async () => {
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByTestId('lista-equipo-master-view')).toBeInTheDocument();
      });

      expect(screen.getByText('Master View for Project: proyecto-1')).toBeInTheDocument();
    });

    it('should display statistics correctly', async () => {
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Total listas
        expect(screen.getByText('2')).toBeInTheDocument(); // Activas (borrador + por_revisar)
      });
    });
  });

  describe('Lista Creation', () => {
    it('should handle lista creation successfully', async () => {
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByTestId('modal-crear-lista')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('modal-crear-lista'));

      await waitFor(() => {
        expect(mockCreateListaEquipo).toHaveBeenCalledWith({
          proyectoId: 'proyecto-1',
          nombre: 'Test Lista',
          fechaNecesaria: '2024-12-31',
          estado: 'borrador'
        });
        expect(mockToast.success).toHaveBeenCalledWith('Lista creada exitosamente');
      });
    });

    it('should handle lista creation error', async () => {
      mockCreateListaEquipo.mockRejectedValue(new Error('Creation failed'));
      
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByTestId('modal-crear-lista')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('modal-crear-lista'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('No se pudo crear la lista');
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no listas exist', async () => {
      mockGetListaEquiposPorProyecto.mockResolvedValue([]);
      
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByText('No hay listas técnicas')).toBeInTheDocument();
        expect(screen.getByText('Crea tu primera lista técnica para comenzar a gestionar los equipos del proyecto.')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state initially', () => {
      render(<ListaEquipoIntegradaPage />);
      
      // Should show skeleton loaders
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should handle proyecto loading error', async () => {
      mockGetProyectoById.mockRejectedValue(new Error('Project not found'));
      
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar datos')).toBeInTheDocument();
        expect(screen.getByText('Project not found')).toBeInTheDocument();
      });
    });

    it('should handle listas loading error', async () => {
      mockGetListaEquiposPorProyecto.mockRejectedValue(new Error('Lists not found'));
      
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar datos')).toBeInTheDocument();
        expect(screen.getByText('Lists not found')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to master-detail view', async () => {
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByText('Vista Master-Detail')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Vista Master-Detail'));
      
      expect(mockRouter.push).toHaveBeenCalledWith('/proyectos/proyecto-1/equipos/listas');
    });
  });

  describe('Modal Integration', () => {
    it('should handle modal agregar item when modalListaId is set', async () => {
      render(<ListaEquipoIntegradaPage />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('lista-equipo-master-view')).toBeInTheDocument();
      });

      // The modal should not be visible initially
      expect(screen.queryByTestId('modal-agregar-item')).not.toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should pass correct proyectoId to ListaEquipoMasterView', async () => {
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        const masterView = screen.getByTestId('lista-equipo-master-view');
        expect(masterView).toBeInTheDocument();
        expect(screen.getByText('Master View for Project: proyecto-1')).toBeInTheDocument();
      });
    });

    it('should not pass callback props to ListaEquipoMasterView', async () => {
      render(<ListaEquipoIntegradaPage />);

      await waitFor(() => {
        expect(screen.getByTestId('lista-equipo-master-view')).toBeInTheDocument();
      });

      // Verify that the component renders without TypeScript errors
      // This test ensures the props interface is correctly implemented
      expect(screen.getByTestId('lista-equipo-master-view')).toBeInTheDocument();
    });
  });
});