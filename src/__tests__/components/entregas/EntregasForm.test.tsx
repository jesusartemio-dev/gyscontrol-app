/**
 * 🧪 Tests para Componente EntregasForm
 * 
 * @description Tests para el formulario de creación/edición de entregas
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntregasForm } from '@/components/entregas/EntregasForm';

import type { EntregaItem, CatalogoEquipo, PedidoEquipo } from '@/types/modelos';

// 🔧 Mocks
jest.mock('@/lib/services/catalogoEquipos', () => ({
  obtenerCatalogoEquipos: jest.fn()
}));

jest.mock('@/lib/services/pedidos', () => ({
  obtenerPedidosEquipo: jest.fn()
}));

jest.mock('@/components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockCatalogoEquipos: CatalogoEquipo[] = [
  {
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
  {
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
  }
];

const mockPedidosEquipo: PedidoEquipo[] = [
  {
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
];

const mockEntregaExistente: EntregaItem = {
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
  catalogoEquipo: mockCatalogoEquipos[0],
  pedidoEquipo: mockPedidosEquipo[0]
};

const defaultProps = {
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  loading: false
};

// Mock de servicios
const mockObtenerCatalogoEquipos = require('@/lib/services/catalogoEquipos').obtenerCatalogoEquipos;
const mockObtenerPedidosEquipo = require('@/lib/services/pedidos').obtenerPedidosEquipo;

describe('EntregasForm Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockObtenerCatalogoEquipos.mockResolvedValue({
      equipos: mockCatalogoEquipos,
      total: mockCatalogoEquipos.length
    });
    mockObtenerPedidosEquipo.mockResolvedValue({
      pedidos: mockPedidosEquipo,
      total: mockPedidosEquipo.length
    });
  });

  // ✅ Test renderizado básico
  describe('Renderizado', () => {
    it('debe renderizar formulario de creación correctamente', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Nueva Entrega')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Pedido de Equipo')).toBeInTheDocument();
      expect(screen.getByLabelText('Equipo')).toBeInTheDocument();
      expect(screen.getByLabelText('Cantidad')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha Entrega Estimada')).toBeInTheDocument();
      expect(screen.getByLabelText('Estado')).toBeInTheDocument();
      expect(screen.getByLabelText('Observaciones')).toBeInTheDocument();
      expect(screen.getByText('Crear Entrega')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('debe renderizar formulario de edición con datos existentes', async () => {
      render(<EntregasForm {...defaultProps} entrega={mockEntregaExistente} />);

      await waitFor(() => {
        expect(screen.getByText('Editar Entrega')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Entrega programada')).toBeInTheDocument();
      expect(screen.getByText('Actualizar Entrega')).toBeInTheDocument();
    });

    it('debe mostrar estado de carga', () => {
      render(<EntregasForm {...defaultProps} loading={true} />);

      expect(screen.getByText('Guardando...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
    });

    it('debe cargar opciones de pedidos y equipos', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockObtenerPedidosEquipo).toHaveBeenCalled();
        expect(mockObtenerCatalogoEquipos).toHaveBeenCalled();
      });
    });
  });

  // ✅ Test validación de formulario
  describe('Validación', () => {
    it('debe mostrar errores de validación para campos requeridos', async () => {
      render(<EntregasForm {...defaultProps} />);

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Selecciona un pedido de equipo')).toBeInTheDocument();
        expect(screen.getByText('Selecciona un equipo')).toBeInTheDocument();
        expect(screen.getByText('La cantidad es requerida')).toBeInTheDocument();
        expect(screen.getByText('La fecha de entrega estimada es requerida')).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('debe validar cantidad mínima', async () => {
      render(<EntregasForm {...defaultProps} />);

      const cantidadInput = screen.getByLabelText('Cantidad');
      await user.type(cantidadInput, '0');

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La cantidad debe ser mayor a 0')).toBeInTheDocument();
      });
    });

    it('debe validar cantidad máxima', async () => {
      render(<EntregasForm {...defaultProps} />);

      const cantidadInput = screen.getByLabelText('Cantidad');
      await user.type(cantidadInput, '10001');

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La cantidad no puede exceder 10,000')).toBeInTheDocument();
      });
    });

    it('debe validar fecha de entrega no sea pasada', async () => {
      render(<EntregasForm {...defaultProps} />);

      const fechaInput = screen.getByLabelText('Fecha Entrega Estimada');
      const fechaPasada = new Date();
      fechaPasada.setDate(fechaPasada.getDate() - 1);
      
      await user.type(fechaInput, fechaPasada.toISOString().split('T')[0]);

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La fecha de entrega no puede ser en el pasado')).toBeInTheDocument();
      });
    });

    it('debe validar longitud máxima de observaciones', async () => {
      render(<EntregasForm {...defaultProps} />);

      const observacionesInput = screen.getByLabelText('Observaciones');
      const textoLargo = 'a'.repeat(1001);
      await user.type(observacionesInput, textoLargo);

      await waitFor(() => {
        expect(screen.getByText('Las observaciones no pueden exceder 1000 caracteres')).toBeInTheDocument();
      });
    });
  });

  // ✅ Test interacciones de formulario
  describe('Interacciones', () => {
    it('debe llenar y enviar formulario correctamente', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Pedido de Equipo')).toBeInTheDocument();
      });

      // Seleccionar pedido
      const pedidoSelect = screen.getByLabelText('Pedido de Equipo');
      await user.click(pedidoSelect);
      await user.click(screen.getByText('P-2025-001 - Proyecto Alpha'));

      // Seleccionar equipo
      const equipoSelect = screen.getByLabelText('Equipo');
      await user.click(equipoSelect);
      await user.click(screen.getByText('Laptop Dell Inspiron'));

      // Llenar cantidad
      const cantidadInput = screen.getByLabelText('Cantidad');
      await user.type(cantidadInput, '3');

      // Seleccionar fecha
      const fechaInput = screen.getByLabelText('Fecha Entrega Estimada');
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 7);
      await user.type(fechaInput, fechaFutura.toISOString().split('T')[0]);

      // Agregar observaciones
      const observacionesInput = screen.getByLabelText('Observaciones');
      await user.type(observacionesInput, 'Entrega urgente');

      // Enviar formulario
      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          pedidoEquipoId: 'pedido-1',
          catalogoEquipoId: 'equipo-1',
          cantidad: 3,
          fechaEntregaEstimada: expect.any(Date),
          estadoEntrega: 'pendiente',
          observaciones: 'Entrega urgente'
        });
      });
    });

    it('debe actualizar entrega existente', async () => {
      render(<EntregasForm {...defaultProps} entrega={mockEntregaExistente} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      });

      // Cambiar cantidad
      const cantidadInput = screen.getByLabelText('Cantidad');
      await user.clear(cantidadInput);
      await user.type(cantidadInput, '8');

      // Cambiar estado
      const estadoSelect = screen.getByLabelText('Estado');
      await user.click(estadoSelect);
      await user.click(screen.getByText('En Proceso'));

      // Enviar formulario
      const submitButton = screen.getByText('Actualizar Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          id: 'entrega-1',
          pedidoEquipoId: 'pedido-1',
          catalogoEquipoId: 'equipo-1',
          cantidad: 8,
          fechaEntregaEstimada: expect.any(Date),
          estadoEntrega: 'en_proceso',
          observaciones: 'Entrega programada'
        });
      });
    });

    it('debe cancelar formulario correctamente', async () => {
      render(<EntregasForm {...defaultProps} />);

      const cancelButton = screen.getByText('Cancelar');
      await user.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('debe limpiar formulario después de envío exitoso', async () => {
      const onSubmitSuccess = jest.fn().mockResolvedValue(true);
      render(<EntregasForm {...defaultProps} onSubmit={onSubmitSuccess} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Cantidad')).toBeInTheDocument();
      });

      // Llenar formulario mínimo
      const cantidadInput = screen.getByLabelText('Cantidad');
      await user.type(cantidadInput, '5');

      // Enviar formulario
      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(cantidadInput).toHaveValue('');
      });
    });
  });

  // ✅ Test selección de opciones
  describe('Selección de Opciones', () => {
    it('debe filtrar equipos por búsqueda', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Equipo')).toBeInTheDocument();
      });

      const equipoSelect = screen.getByLabelText('Equipo');
      await user.click(equipoSelect);

      // Buscar equipo específico
      const searchInput = screen.getByPlaceholderText('Buscar equipo...');
      await user.type(searchInput, 'Laptop');

      await waitFor(() => {
        expect(screen.getByText('Laptop Dell Inspiron')).toBeInTheDocument();
        expect(screen.queryByText('Monitor Samsung 24"')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar información adicional del equipo seleccionado', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Equipo')).toBeInTheDocument();
      });

      const equipoSelect = screen.getByLabelText('Equipo');
      await user.click(equipoSelect);
      await user.click(screen.getByText('Laptop Dell Inspiron'));

      await waitFor(() => {
        expect(screen.getByText('LAP-001')).toBeInTheDocument(); // Código del equipo
        expect(screen.getByText('S/ 2,500.00')).toBeInTheDocument(); // Precio
        expect(screen.getByText('Computadoras')).toBeInTheDocument(); // Categoría
      });
    });

    it('debe mostrar información del proyecto en pedido seleccionado', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Pedido de Equipo')).toBeInTheDocument();
      });

      const pedidoSelect = screen.getByLabelText('Pedido de Equipo');
      await user.click(pedidoSelect);
      await user.click(screen.getByText('P-2025-001 - Proyecto Alpha'));

      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument();
        expect(screen.getByText('ALPHA-2025')).toBeInTheDocument();
        expect(screen.getByText('Fecha requerida: 15/02/2025')).toBeInTheDocument();
      });
    });

    it('debe validar disponibilidad del equipo', async () => {
      const equipoNoDisponible = {
        ...mockCatalogoEquipos[0],
        disponible: false
      };

      mockObtenerCatalogoEquipos.mockResolvedValue({
        equipos: [equipoNoDisponible],
        total: 1
      });

      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Equipo')).toBeInTheDocument();
      });

      const equipoSelect = screen.getByLabelText('Equipo');
      await user.click(equipoSelect);

      expect(screen.getByText('Laptop Dell Inspiron (No disponible)')).toBeInTheDocument();
      expect(screen.getByText('Laptop Dell Inspiron (No disponible)')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // ✅ Test estados del formulario
  describe('Estados del Formulario', () => {
    it('debe manejar estado de carga de opciones', () => {
      mockObtenerCatalogoEquipos.mockImplementation(() => new Promise(() => {})); // Promesa que nunca se resuelve
      mockObtenerPedidosEquipo.mockImplementation(() => new Promise(() => {}));

      render(<EntregasForm {...defaultProps} />);

      expect(screen.getByText('Cargando opciones...')).toBeInTheDocument();
      expect(screen.getByLabelText('Pedido de Equipo')).toBeDisabled();
      expect(screen.getByLabelText('Equipo')).toBeDisabled();
    });

    it('debe manejar error al cargar opciones', async () => {
      mockObtenerCatalogoEquipos.mockRejectedValue(new Error('Error de red'));
      mockObtenerPedidosEquipo.mockRejectedValue(new Error('Error de red'));

      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar opciones')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });
    });

    it('debe reintentar carga de opciones', async () => {
      mockObtenerCatalogoEquipos.mockRejectedValueOnce(new Error('Error de red'));
      mockObtenerCatalogoEquipos.mockResolvedValueOnce({
        equipos: mockCatalogoEquipos,
        total: mockCatalogoEquipos.length
      });

      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Reintentar');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Equipo')).toBeEnabled();
      });
    });

    it('debe deshabilitar formulario durante envío', async () => {
      const onSubmitSlow = jest.fn().mockImplementation(() => new Promise(() => {})); // Promesa que nunca se resuelve
      render(<EntregasForm {...defaultProps} onSubmit={onSubmitSlow} loading={true} />);

      expect(screen.getByLabelText('Pedido de Equipo')).toBeDisabled();
      expect(screen.getByLabelText('Equipo')).toBeDisabled();
      expect(screen.getByLabelText('Cantidad')).toBeDisabled();
      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
    });
  });

  // ✅ Test accesibilidad
  describe('Accesibilidad', () => {
    it('debe tener etiquetas ARIA correctas', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Formulario de entrega');
      });

      expect(screen.getByLabelText('Pedido de Equipo')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Equipo')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Cantidad')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Fecha Entrega Estimada')).toHaveAttribute('aria-required', 'true');
    });

    it('debe asociar errores con campos correspondientes', async () => {
      render(<EntregasForm {...defaultProps} />);

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        const cantidadInput = screen.getByLabelText('Cantidad');
        const errorMessage = screen.getByText('La cantidad es requerida');
        
        expect(cantidadInput).toHaveAttribute('aria-describedby');
        expect(errorMessage).toHaveAttribute('id', cantidadInput.getAttribute('aria-describedby'));
      });
    });

    it('debe ser navegable por teclado', async () => {
      render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Pedido de Equipo')).toBeInTheDocument();
      });

      // Navegar con Tab
      const pedidoSelect = screen.getByLabelText('Pedido de Equipo');
      pedidoSelect.focus();

      await user.tab();
      expect(screen.getByLabelText('Equipo')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Cantidad')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Fecha Entrega Estimada')).toHaveFocus();
    });

    it('debe anunciar cambios de estado a lectores de pantalla', async () => {
      render(<EntregasForm {...defaultProps} />);

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Por favor, corrige los errores en el formulario');
      });
    });
  });

  // ✅ Test integración con servicios
  describe('Integración con Servicios', () => {
    it('debe manejar respuesta exitosa del servicio', async () => {
      const onSubmitSuccess = jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'nueva-entrega-1' }
      });

      render(<EntregasForm {...defaultProps} onSubmit={onSubmitSuccess} />);

      // Llenar formulario mínimo y enviar
      await waitFor(() => {
        expect(screen.getByLabelText('Cantidad')).toBeInTheDocument();
      });

      const cantidadInput = screen.getByLabelText('Cantidad');
      await user.type(cantidadInput, '5');

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Entrega creada exitosamente')).toBeInTheDocument();
      });
    });

    it('debe manejar errores del servicio', async () => {
      const onSubmitError = jest.fn().mockRejectedValue(new Error('Error del servidor'));

      render(<EntregasForm {...defaultProps} onSubmit={onSubmitError} />);

      // Llenar formulario mínimo y enviar
      await waitFor(() => {
        expect(screen.getByLabelText('Cantidad')).toBeInTheDocument();
      });

      const cantidadInput = screen.getByLabelText('Cantidad');
      await user.type(cantidadInput, '5');

      const submitButton = screen.getByText('Crear Entrega');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error al guardar entrega')).toBeInTheDocument();
      });
    });

    it('debe refrescar opciones cuando cambian las dependencias', async () => {
      const { rerender } = render(<EntregasForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockObtenerCatalogoEquipos).toHaveBeenCalledTimes(1);
        expect(mockObtenerPedidosEquipo).toHaveBeenCalledTimes(1);
      });

      // Simular cambio en props que requiere refrescar
      rerender(<EntregasForm {...defaultProps} key="new-key" />);

      await waitFor(() => {
        expect(mockObtenerCatalogoEquipos).toHaveBeenCalledTimes(2);
        expect(mockObtenerPedidosEquipo).toHaveBeenCalledTimes(2);
      });
    });
  });
});
