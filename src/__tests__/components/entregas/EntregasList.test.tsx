/**
 * 🧪 Tests para Componente EntregasList
 * 
 * @description Tests para el componente de listado de entregas
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntregasList } from '@/components/entregas/EntregasList';
import { EstadoEntregaItem } from '@/types/modelos';
import type { EntregaItem } from '@/types/modelos';

// 🔧 Mocks
jest.mock('@/lib/services/entregas', () => ({
  obtenerEntregas: jest.fn(),
  actualizarEntrega: jest.fn(),
  eliminarEntrega: jest.fn()
}));

jest.mock('@/components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockEntregas: EntregaItem[] = [
  {
    id: 'entrega-1',
    pedidoEquipoId: 'pedido-1',
    catalogoEquipoId: 'equipo-1',
    cantidad: 5,
    fechaEntregaEstimada: new Date('2025-02-15'),
    fechaEntregaReal: null,
    estadoEntrega: 'pendiente',
    observaciones: 'Entrega programada',
    fechaCreacion: new Date('2025-01-15'),
    fechaActualizacion: new Date('2025-01-15'),
    catalogoEquipo: {
      id: 'equipo-1',
      nombre: 'Laptop Dell Inspiron',
      codigo: 'LAP-001',
      categoria: 'Computadoras',
      descripcion: 'Laptop para desarrollo',
      precio: 2500.00,
      moneda: 'PEN',
      disponible: true,
      fechaCreacion: new Date('2025-01-01'),
      fechaActualizacion: new Date('2025-01-01')
    },
    pedidoEquipo: {
      id: 'pedido-1',
      numero: 'P-2025-001',
      proyectoId: 'proyecto-1',
      fechaPedido: new Date('2025-01-15'),
      fechaEntregaRequerida: new Date('2025-02-15'),
      estado: 'APROBADO',
      observaciones: 'Pedido urgente',
      fechaCreacion: new Date('2025-01-15'),
      fechaActualizacion: new Date('2025-01-15'),
      proyecto: {
        id: 'proyecto-1',
        nombre: 'Proyecto Alpha',
        codigo: 'ALPHA-2025',
        descripcion: 'Proyecto de desarrollo',
        fechaInicio: new Date('2025-01-01'),
        fechaFinEstimada: new Date('2025-06-30'),
        estado: 'ACTIVO',
        presupuesto: 100000.00,
        moneda: 'PEN',
        clienteId: 'cliente-1',
        fechaCreacion: new Date('2025-01-01'),
        fechaActualizacion: new Date('2025-01-01')
      }
    }
  },
  {
    id: 'entrega-2',
    pedidoEquipoId: 'pedido-2',
    catalogoEquipoId: 'equipo-2',
    cantidad: 3,
    fechaEntregaEstimada: new Date('2025-02-10'),
    fechaEntregaReal: new Date('2025-02-08'),
    estadoEntrega: 'entregado',
    observaciones: 'Entrega completada',
    fechaCreacion: new Date('2025-01-10'),
    fechaActualizacion: new Date('2025-02-08'),
    catalogoEquipo: {
      id: 'equipo-2',
      nombre: 'Monitor Samsung 24"',
      codigo: 'MON-001',
      categoria: 'Monitores',
      descripcion: 'Monitor para oficina',
      precio: 800.00,
      moneda: 'PEN',
      disponible: true,
      fechaCreacion: new Date('2025-01-01'),
      fechaActualizacion: new Date('2025-01-01')
    },
    pedidoEquipo: {
      id: 'pedido-2',
      numero: 'P-2025-002',
      proyectoId: 'proyecto-1',
      fechaPedido: new Date('2025-01-10'),
      fechaEntregaRequerida: new Date('2025-02-10'),
      estado: 'COMPLETADO',
      observaciones: 'Pedido completado',
      fechaCreacion: new Date('2025-01-10'),
      fechaActualizacion: new Date('2025-02-08'),
      proyecto: {
        id: 'proyecto-1',
        nombre: 'Proyecto Alpha',
        codigo: 'ALPHA-2025',
        descripcion: 'Proyecto de desarrollo',
        fechaInicio: new Date('2025-01-01'),
        fechaFinEstimada: new Date('2025-06-30'),
        estado: 'ACTIVO',
        presupuesto: 100000.00,
        moneda: 'PEN',
        clienteId: 'cliente-1',
        fechaCreacion: new Date('2025-01-01'),
        fechaActualizacion: new Date('2025-01-01')
      }
    }
  }
];

const defaultProps = {
  entregas: mockEntregas,
  loading: false,
  onRefresh: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onUpdateStatus: jest.fn()
};

describe('EntregasList Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test renderizado básico
  describe('Renderizado', () => {
    it('debe renderizar la lista de entregas correctamente', () => {
      render(<EntregasList {...defaultProps} />);

      // Verificar headers de la tabla
      expect(screen.getByText('Equipo')).toBeInTheDocument();
      expect(screen.getByText('Proyecto')).toBeInTheDocument();
      expect(screen.getByText('Cantidad')).toBeInTheDocument();
      expect(screen.getByText('Fecha Estimada')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();

      // Verificar datos de las entregas
      expect(screen.getByText('Laptop Dell Inspiron')).toBeInTheDocument();
      expect(screen.getByText('Monitor Samsung 24"')).toBeInTheDocument();
      expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('debe mostrar estado de carga', () => {
      render(<EntregasList {...defaultProps} loading={true} entregas={[]} />);

      expect(screen.getByTestId('entregas-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Laptop Dell Inspiron')).not.toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay entregas', () => {
      render(<EntregasList {...defaultProps} entregas={[]} />);

      expect(screen.getByText('No se encontraron entregas')).toBeInTheDocument();
      expect(screen.getByText('No hay entregas registradas en el sistema')).toBeInTheDocument();
    });

    it('debe renderizar badges de estado correctamente', () => {
      render(<EntregasList {...defaultProps} />);

      const badgePendiente = screen.getByText('Pendiente');
      const badgeEntregado = screen.getByText('Entregado');

      expect(badgePendiente).toBeInTheDocument();
      expect(badgePendiente).toHaveClass('bg-yellow-100', 'text-yellow-800');
      
      expect(badgeEntregado).toBeInTheDocument();
      expect(badgeEntregado).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  // ✅ Test interacciones
  describe('Interacciones', () => {
    it('debe llamar onEdit cuando se hace clic en editar', async () => {
      render(<EntregasList {...defaultProps} />);

      const editButtons = screen.getAllByLabelText('Editar entrega');
      await user.click(editButtons[0]);

      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockEntregas[0]);
    });

    it('debe llamar onDelete cuando se confirma eliminación', async () => {
      render(<EntregasList {...defaultProps} />);

      const deleteButtons = screen.getAllByLabelText('Eliminar entrega');
      await user.click(deleteButtons[0]);

      // Verificar que aparece el diálogo de confirmación
      expect(screen.getByText('¿Eliminar entrega?')).toBeInTheDocument();
      expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();

      // Confirmar eliminación
      const confirmButton = screen.getByText('Eliminar');
      await user.click(confirmButton);

      expect(defaultProps.onDelete).toHaveBeenCalledWith('entrega-1');
    });

    it('debe cancelar eliminación correctamente', async () => {
      render(<EntregasList {...defaultProps} />);

      const deleteButtons = screen.getAllByLabelText('Eliminar entrega');
      await user.click(deleteButtons[0]);

      // Cancelar eliminación
      const cancelButton = screen.getByText('Cancelar');
      await user.click(cancelButton);

      expect(defaultProps.onDelete).not.toHaveBeenCalled();
      expect(screen.queryByText('¿Eliminar entrega?')).not.toBeInTheDocument();
    });

    it('debe actualizar estado de entrega', async () => {
      render(<EntregasList {...defaultProps} />);

      // Buscar dropdown de estado para la primera entrega (pendiente)
      const statusSelects = screen.getAllByDisplayValue('Pendiente');
      await user.click(statusSelects[0]);

      // Seleccionar nuevo estado
      const entregadoOption = screen.getByText('Entregado');
      await user.click(entregadoOption);

      expect(defaultProps.onUpdateStatus).toHaveBeenCalledWith(
        'entrega-1',
        'entregado'
      );
    });

    it('debe llamar onRefresh cuando se hace clic en actualizar', async () => {
      render(<EntregasList {...defaultProps} />);

      const refreshButton = screen.getByLabelText('Actualizar lista');
      await user.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  // ✅ Test filtros y búsqueda
  describe('Filtros y Búsqueda', () => {
    it('debe filtrar entregas por texto de búsqueda', async () => {
      render(<EntregasList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar entregas...');
      await user.type(searchInput, 'Laptop');

      await waitFor(() => {
        expect(screen.getByText('Laptop Dell Inspiron')).toBeInTheDocument();
        expect(screen.queryByText('Monitor Samsung 24"')).not.toBeInTheDocument();
      });
    });

    it('debe filtrar entregas por estado', async () => {
      render(<EntregasList {...defaultProps} />);

      const statusFilter = screen.getByLabelText('Filtrar por estado');
      await user.click(statusFilter);
      
      const entregadoFilter = screen.getByText('Solo Entregados');
      await user.click(entregadoFilter);

      await waitFor(() => {
        expect(screen.getByText('Monitor Samsung 24"')).toBeInTheDocument();
        expect(screen.queryByText('Laptop Dell Inspiron')).not.toBeInTheDocument();
      });
    });

    it('debe filtrar entregas por proyecto', async () => {
      render(<EntregasList {...defaultProps} />);

      const projectFilter = screen.getByLabelText('Filtrar por proyecto');
      await user.type(projectFilter, 'Alpha');

      await waitFor(() => {
        expect(screen.getByText('Laptop Dell Inspiron')).toBeInTheDocument();
        expect(screen.getByText('Monitor Samsung 24"')).toBeInTheDocument();
      });
    });

    it('debe limpiar filtros correctamente', async () => {
      render(<EntregasList {...defaultProps} />);

      // Aplicar filtro
      const searchInput = screen.getByPlaceholderText('Buscar entregas...');
      await user.type(searchInput, 'Laptop');

      // Limpiar filtros
      const clearButton = screen.getByText('Limpiar filtros');
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Laptop Dell Inspiron')).toBeInTheDocument();
        expect(screen.getByText('Monitor Samsung 24"')).toBeInTheDocument();
        expect(searchInput).toHaveValue('');
      });
    });
  });

  // ✅ Test ordenamiento
  describe('Ordenamiento', () => {
    it('debe ordenar por fecha estimada', async () => {
      render(<EntregasList {...defaultProps} />);

      const fechaHeader = screen.getByText('Fecha Estimada');
      await user.click(fechaHeader);

      // Verificar que el orden cambió (Monitor antes que Laptop por fecha)
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Monitor Samsung 24"'); // Fecha más temprana
      expect(rows[2]).toHaveTextContent('Laptop Dell Inspiron'); // Fecha más tardía
    });

    it('debe ordenar por estado', async () => {
      render(<EntregasList {...defaultProps} />);

      const estadoHeader = screen.getByText('Estado');
      await user.click(estadoHeader);

      // Verificar ordenamiento alfabético por estado
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Entregado'); // Alfabéticamente primero
      expect(rows[2]).toHaveTextContent('Pendiente'); // Alfabéticamente segundo
    });

    it('debe alternar dirección de ordenamiento', async () => {
      render(<EntregasList {...defaultProps} />);

      const fechaHeader = screen.getByText('Fecha Estimada');
      
      // Primer clic - ascendente
      await user.click(fechaHeader);
      let rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Monitor Samsung 24"');

      // Segundo clic - descendente
      await user.click(fechaHeader);
      rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Laptop Dell Inspiron');
    });
  });

  // ✅ Test paginación
  describe('Paginación', () => {
    const manyEntregas = Array.from({ length: 25 }, (_, i) => ({
      ...mockEntregas[0],
      id: `entrega-${i + 1}`,
      catalogoEquipo: {
        ...mockEntregas[0].catalogoEquipo,
        nombre: `Equipo ${i + 1}`
      }
    }));

    it('debe mostrar paginación cuando hay muchas entregas', () => {
      render(<EntregasList {...defaultProps} entregas={manyEntregas} />);

      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
      expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
    });

    it('debe navegar entre páginas', async () => {
      render(<EntregasList {...defaultProps} entregas={manyEntregas} />);

      // Ir a página siguiente
      const nextButton = screen.getByLabelText('Página siguiente');
      await user.click(nextButton);

      expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
      expect(screen.getByText('Equipo 11')).toBeInTheDocument(); // Primer item de página 2
    });

    it('debe cambiar tamaño de página', async () => {
      render(<EntregasList {...defaultProps} entregas={manyEntregas} />);

      const pageSizeSelect = screen.getByLabelText('Elementos por página');
      await user.click(pageSizeSelect);
      
      const option20 = screen.getByText('20 por página');
      await user.click(option20);

      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });
  });

  // ✅ Test accesibilidad
  describe('Accesibilidad', () => {
    it('debe tener etiquetas ARIA correctas', () => {
      render(<EntregasList {...defaultProps} />);

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Lista de entregas');
      expect(screen.getByLabelText('Buscar entregas...')).toBeInTheDocument();
      expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument();
      expect(screen.getByLabelText('Actualizar lista')).toBeInTheDocument();
    });

    it('debe ser navegable por teclado', async () => {
      render(<EntregasList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar entregas...');
      searchInput.focus();

      // Navegar con Tab
      await user.tab();
      expect(screen.getByLabelText('Filtrar por estado')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Actualizar lista')).toHaveFocus();
    });

    it('debe anunciar cambios de estado a lectores de pantalla', async () => {
      render(<EntregasList {...defaultProps} />);

      const statusSelects = screen.getAllByDisplayValue('Pendiente');
      await user.click(statusSelects[0]);

      const entregadoOption = screen.getByText('Entregado');
      await user.click(entregadoOption);

      // Verificar que hay un anuncio para lectores de pantalla
      expect(screen.getByRole('status')).toHaveTextContent('Estado actualizado a Entregado');
    });
  });

  // ✅ Test manejo de errores
  describe('Manejo de Errores', () => {
    it('debe mostrar error cuando falla la actualización de estado', async () => {
      const onUpdateStatusError = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      render(<EntregasList {...defaultProps} onUpdateStatus={onUpdateStatusError} />);

      const statusSelects = screen.getAllByDisplayValue('Pendiente');
      await user.click(statusSelects[0]);

      const entregadoOption = screen.getByText('Entregado');
      await user.click(entregadoOption);

      await waitFor(() => {
        expect(screen.getByText('Error al actualizar estado')).toBeInTheDocument();
      });
    });

    it('debe mostrar error cuando falla la eliminación', async () => {
      const onDeleteError = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      render(<EntregasList {...defaultProps} onDelete={onDeleteError} />);

      const deleteButtons = screen.getAllByLabelText('Eliminar entrega');
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Eliminar');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Error al eliminar entrega')).toBeInTheDocument();
      });
    });

    it('debe recuperarse de errores de carga', () => {
      const { rerender } = render(
        <EntregasList {...defaultProps} loading={true} entregas={[]} />
      );

      // Simular error de carga
      rerender(
        <EntregasList 
          {...defaultProps} 
          loading={false} 
          entregas={[]} 
          error="Error al cargar entregas" 
        />
      );

      expect(screen.getByText('Error al cargar entregas')).toBeInTheDocument();
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
  });

  // ✅ Test responsive
  describe('Diseño Responsive', () => {
    it('debe adaptar tabla en móviles', () => {
      // Simular viewport móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<EntregasList {...defaultProps} />);

      // En móvil debería mostrar cards en lugar de tabla
      expect(screen.getByTestId('entregas-mobile-view')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('debe mostrar información condensada en tablets', () => {
      // Simular viewport tablet
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(<EntregasList {...defaultProps} />);

      // Algunas columnas deberían estar ocultas
      expect(screen.queryByText('Observaciones')).not.toBeInTheDocument();
      expect(screen.getByText('Equipo')).toBeInTheDocument();
    });
  });
});
