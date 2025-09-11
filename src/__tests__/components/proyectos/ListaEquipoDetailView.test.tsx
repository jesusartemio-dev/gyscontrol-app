/**
 * 🧪 ListaEquipoDetailView Component Tests
 * 
 * Comprehensive test suite for the ListaEquipoDetailView component.
 * Tests rendering, interactions, data management, and error handling.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ListaEquipoDetailView from '@/components/proyectos/ListaEquipoDetailView';
import { ListaEquipo, ListaEquipoItem, Proyecto } from '@/types/modelos';
import * as listaEquipoService from '@/lib/services/listaEquipo';
import * as listaEquipoItemService from '@/lib/services/listaEquipoItem';
import * as proyectoService from '@/lib/services/proyecto';

// 🎭 Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

jest.mock('@/lib/services/listaEquipo');
jest.mock('@/lib/services/listaEquipoItem');
jest.mock('@/lib/services/proyecto');

jest.mock('@/components/equipos/ListaEquipoItemList', () => {
  return function MockListaEquipoItemList({ onCreated, ...props }: any) {
    return (
      <div data-testid="lista-equipo-item-list">
        <button onClick={onCreated} data-testid="refresh-items">
          Refresh Items
        </button>
        <div>Items: {props.items?.length || 0}</div>
      </div>
    );
  };
});

jest.mock('@/components/equipos/ListaEquipoForm', () => {
  return function MockListaEquipoForm(props: any) {
    return <div data-testid="lista-equipo-form">Lista Equipo Form</div>;
  };
});

// 📊 Mock data
const mockProyecto: Proyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  descripcion: 'Descripción del proyecto test',
  estado: 'ACTIVO',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  presupuesto: 100000,
  clienteId: 'cliente-1',
  responsableId: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockLista: ListaEquipo = {
  id: 'lista-1',
  nombre: 'Lista Test',
  descripcion: 'Descripción de la lista test',
  estado: 'BORRADOR',
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockItems: ListaEquipoItem[] = [
  {
    id: 'item-1',
    listaEquipoId: 'lista-1',
    catalogoEquipoId: 'catalogo-1',
    cantidad: 2,
    estado: 'pendiente',
    costoElegido: 1000,
    observaciones: 'Item test 1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'item-2',
    listaEquipoId: 'lista-1',
    catalogoEquipoId: 'catalogo-2',
    cantidad: 1,
    estado: 'aprobado',
    costoElegido: 2000,
    observaciones: 'Item test 2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const mockRouterPush = jest.fn();

// 🧪 Test setup
const defaultProps = {
  proyectoId: 'proyecto-1',
  listaId: 'lista-1',
  initialLista: mockLista,
  initialItems: mockItems,
  initialProyecto: mockProyecto
};

const renderComponent = (props = {}) => {
  return render(
    <ListaEquipoDetailView {...defaultProps} {...props} />
  );
};

describe('ListaEquipoDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush
    });
  });
  
  // ✅ Rendering Tests
  describe('Rendering', () => {
    it('should render the component with initial data', () => {
      renderComponent();
      
      expect(screen.getByText('Lista Test')).toBeInTheDocument();
      expect(screen.getByText('Descripción de la lista test')).toBeInTheDocument();
      expect(screen.getByText('Borrador')).toBeInTheDocument();
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    });
    
    it('should render breadcrumb navigation', () => {
      renderComponent();
      
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
      expect(screen.getByText('Equipos')).toBeInTheDocument();
      expect(screen.getByText('Listas')).toBeInTheDocument();
      expect(screen.getByText('Lista Test')).toBeInTheDocument();
    });
    
    it('should render statistics overview', () => {
      renderComponent();
      
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total items
      expect(screen.getByText('Completados')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Completed items
      expect(screen.getByText('Progreso')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument(); // Progress
      expect(screen.getByText('Costo Total')).toBeInTheDocument();
    });
    
    it('should render tabbed interface', () => {
      renderComponent();
      
      expect(screen.getByRole('tab', { name: /items/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /historial/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /configuración/i })).toBeInTheDocument();
    });
    
    it('should render status badge with correct styling', () => {
      renderComponent();
      
      const statusBadge = screen.getByText('Borrador');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.closest('.bg-gray-100')).toBeInTheDocument();
    });
  });
  
  // 🔄 Loading States Tests
  describe('Loading States', () => {
    it('should show loading skeleton when no initial data provided', () => {
      renderComponent({
        initialLista: undefined,
        initialItems: [],
        initialProyecto: undefined
      });
      
      expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(3);
    });
    
    it('should load data when not provided initially', async () => {
      const mockGetListaEquipo = jest.spyOn(listaEquipoService, 'getListaEquipo')
        .mockResolvedValue(mockLista);
      const mockGetProyecto = jest.spyOn(proyectoService, 'getProyecto')
        .mockResolvedValue(mockProyecto);
      const mockGetItems = jest.spyOn(listaEquipoItemService, 'getListaEquipoItems')
        .mockResolvedValue(mockItems);
      
      renderComponent({
        initialLista: undefined,
        initialItems: [],
        initialProyecto: undefined
      });
      
      await waitFor(() => {
        expect(mockGetListaEquipo).toHaveBeenCalledWith('lista-1');
        expect(mockGetProyecto).toHaveBeenCalledWith('proyecto-1');
        expect(mockGetItems).toHaveBeenCalledWith('lista-1');
      });
    });
  });
  
  // 🎯 Navigation Tests
  describe('Navigation', () => {
    it('should navigate back to master view when back button is clicked', () => {
      renderComponent();
      
      const backButton = screen.getByRole('button', { name: /volver/i });
      fireEvent.click(backButton);
      
      expect(mockRouterPush).toHaveBeenCalledWith('/proyectos/proyecto-1/equipos/listas');
    });
    
    it('should have correct breadcrumb links', () => {
      renderComponent();
      
      const proyectoLink = screen.getByRole('link', { name: 'Proyecto Test' });
      expect(proyectoLink).toHaveAttribute('href', '/proyectos/proyecto-1');
      
      const equiposLink = screen.getByRole('link', { name: 'Equipos' });
      expect(equiposLink).toHaveAttribute('href', '/proyectos/proyecto-1/equipos');
      
      const listasLink = screen.getByRole('link', { name: 'Listas' });
      expect(listasLink).toHaveAttribute('href', '/proyectos/proyecto-1/equipos/listas');
    });
  });
  
  // ✏️ Edit Mode Tests
  describe('Edit Mode', () => {
    it('should enter edit mode when edit button is clicked', () => {
      renderComponent();
      
      const editButton = screen.getByRole('button', { name: /editar/i });
      fireEvent.click(editButton);
      
      expect(screen.getByDisplayValue('Lista Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Descripción de la lista test')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
    
    it('should cancel edit mode when cancel button is clicked', () => {
      renderComponent();
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /editar/i });
      fireEvent.click(editButton);
      
      // Modify input
      const nameInput = screen.getByDisplayValue('Lista Test');
      fireEvent.change(nameInput, { target: { value: 'Modified Name' } });
      
      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);
      
      // Should revert to original values
      expect(screen.getByText('Lista Test')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Modified Name')).not.toBeInTheDocument();
    });
    
    it('should save changes when save button is clicked', async () => {
      const mockUpdateListaEquipo = jest.spyOn(listaEquipoService, 'updateListaEquipo')
        .mockResolvedValue({ ...mockLista, nombre: 'Updated Name' });
      
      renderComponent();
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /editar/i });
      fireEvent.click(editButton);
      
      // Modify input
      const nameInput = screen.getByDisplayValue('Lista Test');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      // Save
      const saveButton = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateListaEquipo).toHaveBeenCalledWith('lista-1', {
          nombre: 'Updated Name',
          descripcion: 'Descripción de la lista test'
        });
        expect(toast.success).toHaveBeenCalledWith('Lista actualizada correctamente');
      });
    });
  });
  
  // 📑 Tab Navigation Tests
  describe('Tab Navigation', () => {
    it('should switch between tabs', () => {
      renderComponent();
      
      // Initially on items tab
      expect(screen.getByTestId('lista-equipo-item-list')).toBeInTheDocument();
      
      // Switch to history tab
      const historyTab = screen.getByRole('tab', { name: /historial/i });
      fireEvent.click(historyTab);
      
      expect(screen.getByText('Historial de Cambios')).toBeInTheDocument();
      
      // Switch to settings tab
      const settingsTab = screen.getByRole('tab', { name: /configuración/i });
      fireEvent.click(settingsTab);
      
      expect(screen.getByText('Configuración de Lista')).toBeInTheDocument();
    });
    
    it('should refresh items when refresh button is clicked', async () => {
      const mockGetItems = jest.spyOn(listaEquipoItemService, 'getListaEquipoItems')
        .mockResolvedValue([...mockItems, {
          id: 'item-3',
          listaEquipoId: 'lista-1',
          catalogoEquipoId: 'catalogo-3',
          cantidad: 1,
          estado: 'pendiente',
          costoElegido: 500,
          observaciones: 'New item',
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      
      renderComponent();
      
      const refreshButton = screen.getByRole('button', { name: /actualizar/i });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockGetItems).toHaveBeenCalledWith('lista-1');
        expect(toast.success).toHaveBeenCalledWith('Items actualizados');
      });
    });
  });
  
  // 📊 Statistics Tests
  describe('Statistics Calculation', () => {
    it('should calculate statistics correctly', () => {
      renderComponent();
      
      // Total items: 2
      expect(screen.getByText('2')).toBeInTheDocument();
      
      // Completed items: 1 (only 'aprobado' status)
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // Progress: 50% (1/2 * 100)
      expect(screen.getByText('50%')).toBeInTheDocument();
      
      // Total cost: 3000 (1000 + 2000)
      expect(screen.getByText(/3,000/)).toBeInTheDocument();
    });
    
    it('should handle empty items list', () => {
      renderComponent({ initialItems: [] });
      
      expect(screen.getByText('0')).toBeInTheDocument(); // Total items
      expect(screen.getByText('0%')).toBeInTheDocument(); // Progress
    });
  });
  
  // 🚨 Error Handling Tests
  describe('Error Handling', () => {
    it('should show error state when lista is null', () => {
      renderComponent({ initialLista: null });
      
      expect(screen.getByText('Error al cargar los datos')).toBeInTheDocument();
      expect(screen.getByText('No se pudo cargar la información de la lista')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /volver a listas/i })).toBeInTheDocument();
    });
    
    it('should show error state when proyecto is null', () => {
      renderComponent({ initialProyecto: null });
      
      expect(screen.getByText('Error al cargar los datos')).toBeInTheDocument();
    });
    
    it('should handle update errors gracefully', async () => {
      const mockUpdateListaEquipo = jest.spyOn(listaEquipoService, 'updateListaEquipo')
        .mockRejectedValue(new Error('Update failed'));
      
      renderComponent();
      
      // Enter edit mode and try to save
      const editButton = screen.getByRole('button', { name: /editar/i });
      fireEvent.click(editButton);
      
      const saveButton = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al actualizar la lista');
      });
    });
    
    it('should handle refresh errors gracefully', async () => {
      const mockGetItems = jest.spyOn(listaEquipoItemService, 'getListaEquipoItems')
        .mockRejectedValue(new Error('Refresh failed'));
      
      renderComponent();
      
      const refreshButton = screen.getByRole('button', { name: /actualizar/i });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al actualizar los items');
      });
    });
  });
  
  // ♿ Accessibility Tests
  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderComponent();
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
    
    it('should support keyboard navigation', () => {
      renderComponent();
      
      const firstTab = screen.getByRole('tab', { name: /items/i });
      const secondTab = screen.getByRole('tab', { name: /historial/i });
      
      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);
      
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(secondTab);
    });
  });
  
  // 🎨 Visual States Tests
  describe('Visual States', () => {
    it('should render different status badges correctly', () => {
      const statusTests = [
        { estado: 'BORRADOR', expectedClass: 'bg-gray-100', expectedText: 'Borrador' },
        { estado: 'PENDIENTE', expectedClass: 'bg-yellow-100', expectedText: 'Pendiente' },
        { estado: 'EN_PROCESO', expectedClass: 'bg-blue-100', expectedText: 'En Proceso' },
        { estado: 'COMPLETADA', expectedClass: 'bg-green-100', expectedText: 'Completada' },
        { estado: 'CANCELADA', expectedClass: 'bg-red-100', expectedText: 'Cancelada' }
      ];
      
      statusTests.forEach(({ estado, expectedText }) => {
        const { unmount } = renderComponent({
          initialLista: { ...mockLista, estado: estado as any }
        });
        
        expect(screen.getByText(expectedText)).toBeInTheDocument();
        unmount();
      });
    });
    
    it('should show loading state for refresh button', async () => {
      const mockGetItems = jest.spyOn(listaEquipoItemService, 'getListaEquipoItems')
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockItems), 100)));
      
      renderComponent();
      
      const refreshButton = screen.getByRole('button', { name: /actualizar/i });
      fireEvent.click(refreshButton);
      
      // Should show loading state
      expect(refreshButton).toBeDisabled();
      
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });
  
  // 🔄 Data Updates Tests
  describe('Data Updates', () => {
    it('should update items list when onCreated is called', async () => {
      const mockGetItems = jest.spyOn(listaEquipoItemService, 'getListaEquipoItems')
        .mockResolvedValue([...mockItems, {
          id: 'item-3',
          listaEquipoId: 'lista-1',
          catalogoEquipoId: 'catalogo-3',
          cantidad: 1,
          estado: 'pendiente',
          costoElegido: 500,
          observaciones: 'New item',
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      
      renderComponent();
      
      // Simulate item creation
      const refreshItemsButton = screen.getByTestId('refresh-items');
      fireEvent.click(refreshItemsButton);
      
      await waitFor(() => {
        expect(mockGetItems).toHaveBeenCalledWith('lista-1');
      });
    });
  });
});
