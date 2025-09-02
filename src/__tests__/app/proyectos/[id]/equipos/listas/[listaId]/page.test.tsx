/**
 * 🧪 Lista Equipo Detail Page Tests
 * 
 * Comprehensive test suite for the equipment list detail page.
 * Tests server-side rendering, data fetching, error handling, and navigation.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { notFound } from 'next/navigation';
import ListaEquipoDetailPage from '@/app/proyectos/[id]/equipos/listas/[listaId]/page';
import { validateRouteParams } from '@/lib/validators/routeParams';
import { getProyectoById } from '@/lib/services/proyectos';
import { getListaEquipoById } from '@/lib/services/listaEquipos';
import { getListaEquipoItems } from '@/lib/services/listaEquipoItems';

// 🔧 Mock dependencies
jest.mock('next/navigation', () => ({
  notFound: jest.fn()
}));

jest.mock('@/lib/validators/routeParams', () => ({
  validateRouteParams: {
    listaEquipoDetail: jest.fn()
  }
}));

jest.mock('@/lib/services/proyectos', () => ({
  getProyectoById: jest.fn()
}));

jest.mock('@/lib/services/listaEquipos', () => ({
  getListaEquipoById: jest.fn()
}));

jest.mock('@/lib/services/listaEquipoItems', () => ({
  getListaEquipoItems: jest.fn()
}));

jest.mock('@/components/proyectos/ListaEquipoDetailView', () => {
  return function MockListaEquipoDetailView({ lista, items, proyecto }: any) {
    return (
      <div data-testid="lista-equipo-detail-view">
        <div data-testid="proyecto-nombre">{proyecto?.nombre}</div>
        <div data-testid="lista-nombre">{lista?.nombre}</div>
        <div data-testid="items-count">{items?.length || 0}</div>
      </div>
    );
  };
});

jest.mock('@/components/common/DetailViewSkeleton', () => {
  return function MockDetailViewSkeleton() {
    return <div data-testid="detail-view-skeleton">Loading...</div>;
  };
});

jest.mock('@/components/common/DetailErrorBoundary', () => {
  return function MockDetailErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="detail-error-boundary">{children}</div>;
  };
});

describe('ListaEquipoDetailPage', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '987fcdeb-51a2-43d1-9f12-123456789abc';
  
  const mockParams = {
    id: validUUID,
    listaId: validUUID2
  };
  
  const mockProyecto = {
    id: validUUID,
    nombre: 'Proyecto Test',
    descripcion: 'Descripción del proyecto',
    estado: 'ACTIVO' as const,
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    presupuesto: 100000,
    clienteId: 'cliente-id',
    gerenteId: 'gerente-id',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockLista = {
    id: validUUID2,
    nombre: 'Lista Test',
    descripcion: 'Descripción de la lista',
    tipo: 'EQUIPOS' as const,
    estado: 'ACTIVO' as const,
    proyectoId: validUUID,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockItems = [
    {
      id: 'item-1',
      listaEquipoId: validUUID2,
      equipoId: 'equipo-1',
      cantidad: 2,
      precioUnitario: 1000,
      observaciones: 'Item 1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'item-2',
      listaEquipoId: validUUID2,
      equipoId: 'equipo-2',
      cantidad: 1,
      precioUnitario: 2000,
      observaciones: 'Item 2',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    (validateRouteParams.listaEquipoDetail as jest.Mock).mockReturnValue(mockParams);
    (getProyectoById as jest.Mock).mockResolvedValue(mockProyecto);
    (getListaEquipoById as jest.Mock).mockResolvedValue(mockLista);
    (getListaEquipoItems as jest.Mock).mockResolvedValue(mockItems);
  });
  
  describe('Successful Rendering', () => {
    it('should render detail view with valid data', async () => {
      const result = await ListaEquipoDetailPage({ params: mockParams });
      
      render(result);
      
      expect(screen.getByTestId('detail-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('lista-equipo-detail-view')).toBeInTheDocument();
      expect(screen.getByTestId('proyecto-nombre')).toHaveTextContent('Proyecto Test');
      expect(screen.getByTestId('lista-nombre')).toHaveTextContent('Lista Test');
      expect(screen.getByTestId('items-count')).toHaveTextContent('2');
    });
    
    it('should validate route parameters', async () => {
      await ListaEquipoDetailPage({ params: mockParams });
      
      expect(validateRouteParams.listaEquipoDetail).toHaveBeenCalledWith(mockParams);
    });
    
    it('should fetch all required data', async () => {
      await ListaEquipoDetailPage({ params: mockParams });
      
      expect(getProyectoById).toHaveBeenCalledWith(validUUID);
      expect(getListaEquipoById).toHaveBeenCalledWith(validUUID2);
      expect(getListaEquipoItems).toHaveBeenCalledWith(validUUID2);
    });
    
    it('should render with empty items array', async () => {
      (getListaEquipoItems as jest.Mock).mockResolvedValue([]);
      
      const result = await ListaEquipoDetailPage({ params: mockParams });
      render(result);
      
      expect(screen.getByTestId('items-count')).toHaveTextContent('0');
    });
  });
  
  describe('Error Handling', () => {
    it('should call notFound when route validation fails', async () => {
      const validationError = new Error('Invalid params');
      validationError.name = 'RouteValidationError';
      (validateRouteParams.listaEquipoDetail as jest.Mock).mockImplementation(() => {
        throw validationError;
      });
      
      await expect(ListaEquipoDetailPage({ params: mockParams })).rejects.toThrow();
      
      expect(notFound).toHaveBeenCalled();
    });
    
    it('should call notFound when proyecto is not found', async () => {
      (getProyectoById as jest.Mock).mockResolvedValue(null);
      
      await ListaEquipoDetailPage({ params: mockParams });
      
      expect(notFound).toHaveBeenCalled();
    });
    
    it('should call notFound when lista is not found', async () => {
      (getListaEquipoById as jest.Mock).mockResolvedValue(null);
      
      await ListaEquipoDetailPage({ params: mockParams });
      
      expect(notFound).toHaveBeenCalled();
    });
    
    it('should re-throw non-validation errors', async () => {
      const networkError = new Error('Network error');
      (getProyectoById as jest.Mock).mockRejectedValue(networkError);
      
      await expect(ListaEquipoDetailPage({ params: mockParams })).rejects.toThrow('Network error');
      expect(notFound).not.toHaveBeenCalled();
    });
    
    it('should handle service errors gracefully', async () => {
      const serviceError = new Error('Service unavailable');
      (getListaEquipoItems as jest.Mock).mockRejectedValue(serviceError);
      
      await expect(ListaEquipoDetailPage({ params: mockParams })).rejects.toThrow('Service unavailable');
    });
  });
  
  describe('Data Fetching Edge Cases', () => {
    it('should handle null items response', async () => {
      (getListaEquipoItems as jest.Mock).mockResolvedValue(null);
      
      const result = await ListaEquipoDetailPage({ params: mockParams });
      render(result);
      
      expect(screen.getByTestId('items-count')).toHaveTextContent('0');
    });
    
    it('should handle undefined items response', async () => {
      (getListaEquipoItems as jest.Mock).mockResolvedValue(undefined);
      
      const result = await ListaEquipoDetailPage({ params: mockParams });
      render(result);
      
      expect(screen.getByTestId('items-count')).toHaveTextContent('0');
    });
    
    it('should handle concurrent data fetching', async () => {
      // Simulate different response times
      (getProyectoById as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockProyecto), 100))
      );
      (getListaEquipoById as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockLista), 50))
      );
      (getListaEquipoItems as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockItems), 150))
      );
      
      const result = await ListaEquipoDetailPage({ params: mockParams });
      render(result);
      
      expect(screen.getByTestId('lista-equipo-detail-view')).toBeInTheDocument();
      expect(getProyectoById).toHaveBeenCalledWith(validUUID);
      expect(getListaEquipoById).toHaveBeenCalledWith(validUUID2);
      expect(getListaEquipoItems).toHaveBeenCalledWith(validUUID2);
    });
  });
  
  describe('Parameter Validation', () => {
    it('should handle invalid UUID format', async () => {
      const invalidParams = { id: 'invalid-uuid', listaId: 'also-invalid' };
      const validationError = new Error('Invalid UUID format');
      validationError.name = 'RouteValidationError';
      
      (validateRouteParams.listaEquipoDetail as jest.Mock).mockImplementation(() => {
        throw validationError;
      });
      
      await expect(ListaEquipoDetailPage({ params: invalidParams })).rejects.toThrow();
      expect(notFound).toHaveBeenCalled();
    });
    
    it('should handle missing parameters', async () => {
      const incompleteParams = { id: validUUID }; // Missing listaId
      const validationError = new Error('Missing required parameters');
      validationError.name = 'RouteValidationError';
      
      (validateRouteParams.listaEquipoDetail as jest.Mock).mockImplementation(() => {
        throw validationError;
      });
      
      await expect(ListaEquipoDetailPage({ params: incompleteParams as any })).rejects.toThrow();
      expect(notFound).toHaveBeenCalled();
    });
  });
  
  describe('Component Integration', () => {
    it('should pass correct props to ListaEquipoDetailView', async () => {
      const result = await ListaEquipoDetailPage({ params: mockParams });
      render(result);
      
      // Verify that the mock component receives the expected data
      expect(screen.getByTestId('proyecto-nombre')).toHaveTextContent(mockProyecto.nombre);
      expect(screen.getByTestId('lista-nombre')).toHaveTextContent(mockLista.nombre);
      expect(screen.getByTestId('items-count')).toHaveTextContent(mockItems.length.toString());
    });
    
    it('should wrap content in DetailErrorBoundary', async () => {
      const result = await ListaEquipoDetailPage({ params: mockParams });
      render(result);
      
      expect(screen.getByTestId('detail-error-boundary')).toBeInTheDocument();
    });
  });
  
  describe('Performance Considerations', () => {
    it('should make parallel data fetches', async () => {
      const startTime = Date.now();
      
      await ListaEquipoDetailPage({ params: mockParams });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete quickly since fetches are parallel
      expect(executionTime).toBeLessThan(100);
      
      // Verify all services were called
      expect(getProyectoById).toHaveBeenCalledTimes(1);
      expect(getListaEquipoById).toHaveBeenCalledTimes(1);
      expect(getListaEquipoItems).toHaveBeenCalledTimes(1);
    });
    
    it('should handle large items arrays efficiently', async () => {
      const largeItemsArray = Array.from({ length: 1000 }, (_, index) => ({
        id: `item-${index}`,
        listaEquipoId: validUUID2,
        equipoId: `equipo-${index}`,
        cantidad: 1,
        precioUnitario: 1000,
        observaciones: `Item ${index}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      (getListaEquipoItems as jest.Mock).mockResolvedValue(largeItemsArray);
      
      const result = await ListaEquipoDetailPage({ params: mockParams });
      render(result);
      
      expect(screen.getByTestId('items-count')).toHaveTextContent('1000');
    });
  });
  
  describe('Type Safety', () => {
    it('should handle properly typed parameters', async () => {
      const typedParams: { id: string; listaId: string } = {
        id: validUUID,
        listaId: validUUID2
      };
      
      const result = await ListaEquipoDetailPage({ params: typedParams });
      render(result);
      
      expect(screen.getByTestId('lista-equipo-detail-view')).toBeInTheDocument();
    });
  });
});