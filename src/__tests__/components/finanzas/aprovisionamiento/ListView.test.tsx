/**
 * 🧪 ListView Component Tests
 * 
 * Pruebas unitarias para el componente ListView.
 * Verifica funcionalidad de filtros, ordenamiento, paginación y renderizado.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListView } from '@/components/finanzas/aprovisionamiento/ListView';
import type { TimelineData, GanttItem } from '@/types/aprovisionamiento';

// ✅ Mock data
const mockTimelineData: TimelineData = {
  items: [
    {
      id: '1',
      label: 'LST-001',
      titulo: 'Lista de Materiales A',
      descripcion: 'Materiales para proyecto Alpha',
      fechaInicio: new Date('2024-01-15'),
      fechaFin: new Date('2024-01-30'),
      amount: 15000,
      estado: 'en_proceso',
      tipo: 'lista',
      progreso: 65,
      proyectoId: 'proj-1',
      responsableId: 'user-1',
      proveedorId: 'prov-1',
    },
    {
      id: '2',
      label: 'PED-002',
      titulo: 'Pedido de Compra B',
      descripcion: 'Pedido urgente para proyecto Beta',
      fechaInicio: new Date('2024-01-20'),
      fechaFin: new Date('2024-02-05'),
      amount: 25000,
      estado: 'completado',
      tipo: 'pedido',
      progreso: 100,
      proyectoId: 'proj-2',
      responsableId: 'user-2',
      proveedorId: 'prov-2',
    },
    {
      id: '3',
      label: 'LST-003',
      titulo: 'Lista de Servicios C',
      descripcion: 'Servicios especializados',
      fechaInicio: new Date('2024-02-01'),
      fechaFin: new Date('2024-02-15'),
      amount: 8000,
      estado: 'retrasado',
      tipo: 'lista',
      progreso: 30,
      proyectoId: 'proj-1',
      responsableId: 'user-1',
      proveedorId: 'prov-3',
    },
  ],
  alertas: [],
  resumen: {
    totalItems: 3,
    montoTotal: 48000,
    itemsVencidos: 0,
    itemsEnRiesgo: 1,
    itemsConAlertas: 0,
    porcentajeCompletado: 65,
    coherenciaPromedio: 85,
    distribucionPorTipo: {
      listas: 2,
      pedidos: 1,
    },
    alertasPorPrioridad: {
      alta: 0,
      media: 0,
      baja: 0,
    },
  },
};

// ✅ Mock handlers
const mockOnItemClick = jest.fn();
const mockOnItemEdit = jest.fn();

describe('ListView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Basic rendering
  it('renders correctly with data', () => {
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
        onItemEdit={mockOnItemEdit}
      />
    );

    expect(screen.getByText('Vista de Lista')).toBeInTheDocument();
    expect(screen.getByText('3 elementos de 3 totales')).toBeInTheDocument();
    expect(screen.getByText('Lista de Materiales A')).toBeInTheDocument();
    expect(screen.getByText('Pedido de Compra B')).toBeInTheDocument();
    expect(screen.getByText('Lista de Servicios C')).toBeInTheDocument();
  });

  // ✅ Loading state
  it('shows loading state', () => {
    render(
      <ListView
        data={mockTimelineData}
        loading={true}
      />
    );

    expect(screen.getByRole('generic')).toHaveClass('animate-spin');
  });

  // ✅ Empty state
  it('shows empty state when no data', () => {
    const emptyData: TimelineData = {
      ...mockTimelineData,
      items: [],
    };

    render(<ListView data={emptyData} />);

    expect(screen.getByText('No se encontraron elementos')).toBeInTheDocument();
    expect(screen.getByText('No hay elementos disponibles en este momento')).toBeInTheDocument();
  });

  // ✅ Search functionality
  it('filters items by search term', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar por código o título...');
    await user.type(searchInput, 'Materiales');

    await waitFor(() => {
      expect(screen.getByText('Lista de Materiales A')).toBeInTheDocument();
      expect(screen.queryByText('Pedido de Compra B')).not.toBeInTheDocument();
      expect(screen.queryByText('Lista de Servicios C')).not.toBeInTheDocument();
    });
  });

  // ✅ Status filter
  it('filters items by status', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    // Open status filter
    const statusFilter = screen.getAllByRole('combobox')[1]; // Second select is status
    await user.click(statusFilter);
    
    // Select 'completado'
    const completadoOption = screen.getByText('completado');
    await user.click(completadoOption);

    await waitFor(() => {
      expect(screen.queryByText('Lista de Materiales A')).not.toBeInTheDocument();
      expect(screen.getByText('Pedido de Compra B')).toBeInTheDocument();
      expect(screen.queryByText('Lista de Servicios C')).not.toBeInTheDocument();
    });
  });

  // ✅ Type filter
  it('filters items by type', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    // Open type filter
    const typeFilter = screen.getAllByRole('combobox')[2]; // Third select is type
    await user.click(typeFilter);
    
    // Select 'pedido'
    const pedidoOption = screen.getByText('Pedido');
    await user.click(pedidoOption);

    await waitFor(() => {
      expect(screen.queryByText('Lista de Materiales A')).not.toBeInTheDocument();
      expect(screen.getByText('Pedido de Compra B')).toBeInTheDocument();
      expect(screen.queryByText('Lista de Servicios C')).not.toBeInTheDocument();
    });
  });

  // ✅ Sorting functionality
  it('sorts items by column', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    // Click on 'Monto' column to sort
    const montoHeader = screen.getByRole('button', { name: /Monto/ });
    await user.click(montoHeader);

    // Check if items are sorted by amount (ascending)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Lista de Servicios C'); // Lowest amount first
    expect(rows[2]).toHaveTextContent('Lista de Materiales A');
    expect(rows[3]).toHaveTextContent('Pedido de Compra B'); // Highest amount last
  });

  // ✅ Item click handler
  it('calls onItemClick when view button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    const viewButtons = screen.getAllByRole('button', { name: '' }); // Eye icon buttons
    const firstViewButton = viewButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-lucide') === 'eye'
    );
    
    if (firstViewButton) {
      await user.click(firstViewButton);
      expect(mockOnItemClick).toHaveBeenCalledWith(mockTimelineData.items[0]);
    }
  });

  // ✅ Item edit handler
  it('calls onItemEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
        onItemEdit={mockOnItemEdit}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: '' }); // Edit icon buttons
    const firstEditButton = editButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-lucide') === 'edit'
    );
    
    if (firstEditButton) {
      await user.click(firstEditButton);
      expect(mockOnItemEdit).toHaveBeenCalledWith(mockTimelineData.items[0]);
    }
  });

  // ✅ Pagination
  it('handles pagination correctly', async () => {
    // Create data with more than 20 items to test pagination
    const manyItems: GanttItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i}`,
      label: `ITM-${i.toString().padStart(3, '0')}`,
      titulo: `Item ${i}`,
      descripcion: `Description for item ${i}`,
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2024-01-15'),
      amount: 1000 * (i + 1),
      estado: 'pendiente',
      tipo: 'lista',
      progreso: i * 4,
      proyectoId: 'proj-1',
      responsableId: 'user-1',
      proveedorId: 'prov-1',
    }));

    const largeData: TimelineData = {
      ...mockTimelineData,
      items: manyItems,
    };

    const user = userEvent.setup();
    
    render(<ListView data={largeData} />);

    // Should show pagination controls
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
    
    // Click next page
    const nextButton = screen.getByText('Siguiente');
    await user.click(nextButton);
    
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  });

  // ✅ Currency formatting
  it('formats currency correctly', () => {
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    expect(screen.getByText('S/ 15,000.00')).toBeInTheDocument();
    expect(screen.getByText('S/ 25,000.00')).toBeInTheDocument();
    expect(screen.getByText('S/ 8,000.00')).toBeInTheDocument();
  });

  // ✅ Progress bars
  it('displays progress bars correctly', () => {
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  // ✅ Status badges
  it('displays status badges with correct variants', () => {
    render(
      <ListView
        data={mockTimelineData}
        onItemClick={mockOnItemClick}
      />
    );

    const enProcesoBadge = screen.getByText('en_proceso');
    const completadoBadge = screen.getByText('completado');
    const retrasadoBadge = screen.getByText('retrasado');

    expect(enProcesoBadge).toBeInTheDocument();
    expect(completadoBadge).toBeInTheDocument();
    expect(retrasadoBadge).toBeInTheDocument();
  });
});

// ✅ Export for use in other tests
export { mockTimelineData, mockOnItemClick, mockOnItemEdit };