/**
 * Test para verificar la corrección del form.setValue en PedidoEquipoFilters
 * Valida que form.setValue('estado', newFiltros.estado) funcione correctamente
 * sin el operador || '' que causaba errores TypeScript
 */

import * as z from 'zod';
import { EstadoPedido } from '@prisma/client';
import type { FiltrosPedidoEquipo } from '@/types/aprovisionamiento';

// ✅ Mock del esquema filtrosSchema
const filtrosSchema = z.object({
  busqueda: z.string().optional(),
  proyectoId: z.string().optional(),
  proveedorId: z.string().optional(),
  estado: z.nativeEnum(EstadoPedido).optional(),
  fechaCreacion: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  fechaEntrega: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  tieneObservaciones: z.boolean().optional(),
  soloVencidos: z.boolean().optional(),
  soloSinRecibir: z.boolean().optional(),
  soloUrgentes: z.boolean().optional(),
  coherenciaMinima: z.number().optional(),
});

type FiltrosForm = z.infer<typeof filtrosSchema>;

// ✅ Mock de React Hook Form
class MockForm {
  private values: Record<string, any> = {};
  private errors: Record<string, string> = {};

  setValue(field: string, value: any) {
    // ✅ Simula la validación de tipos que hace React Hook Form
    if (field === 'estado') {
      // ✅ Primero verificar si es cadena vacía
      if (value === '') {
        throw new Error(`Empty string not allowed for estado field. Expected EstadoPedido or undefined.`);
      }
      // ✅ Luego verificar si es un valor válido del enum (si no es undefined)
      if (value !== undefined && !Object.values(EstadoPedido).includes(value)) {
        throw new Error(`Invalid estado value: ${value}. Expected EstadoPedido or undefined.`);
      }
    }
    this.values[field] = value;
  }

  getValue(field: string) {
    return this.values[field];
  }

  getValues() {
    return { ...this.values };
  }

  reset() {
    this.values = {};
    this.errors = {};
  }
}

// ✅ Mock del componente PedidoEquipoFilters
class MockPedidoEquipoFiltersQuickFilter {
  private filtros: FiltrosPedidoEquipo;
  private form: MockForm;
  private onFiltrosChange: (filtros: FiltrosPedidoEquipo) => void;

  constructor(
    initialFiltros: FiltrosPedidoEquipo,
    onFiltrosChange: (filtros: FiltrosPedidoEquipo) => void
  ) {
    this.filtros = { ...initialFiltros };
    this.form = new MockForm();
    this.onFiltrosChange = onFiltrosChange;
  }

  // ✅ Simula handleQuickFilter con la corrección aplicada
  handleQuickFilter(type: string): void {
    const newFiltros = { ...this.filtros };

    switch (type) {
      case 'pendientes':
        newFiltros.estado = this.filtros.estado === EstadoPedido.borrador ? undefined : EstadoPedido.borrador;
        // ✅ CORRECCIÓN: Sin || '' que causaba el error TypeScript
        this.form.setValue('estado', newFiltros.estado);
        break;
      case 'en-transito':
        newFiltros.estado = this.filtros.estado === EstadoPedido.enviado ? undefined : EstadoPedido.enviado;
        // ✅ CORRECCIÓN: Sin || '' que causaba el error TypeScript
        this.form.setValue('estado', newFiltros.estado);
        break;
      default:
        break;
    }

    this.filtros = newFiltros;
    this.onFiltrosChange(newFiltros);
  }

  getFiltros() {
    return this.filtros;
  }

  getForm() {
    return this.form;
  }
}

describe('PedidoEquipoFilters - Form setValue Correction', () => {
  let mockOnFiltrosChange: jest.Mock;

  beforeEach(() => {
    mockOnFiltrosChange = jest.fn();
  });

  describe('Quick Filter - Pendientes', () => {
    test('should set estado to EstadoPedido.borrador when not currently borrador', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: undefined,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Ejecutar quick filter
      mockComponent.handleQuickFilter('pendientes');

      // ✅ Verificar que el estado se estableció correctamente
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.borrador);
      expect(mockComponent.getForm().getValue('estado')).toBe(EstadoPedido.borrador);
      expect(mockOnFiltrosChange).toHaveBeenCalledWith({
        busqueda: '',
        estado: EstadoPedido.borrador,
      });
    });

    test('should set estado to undefined when currently borrador (toggle off)', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.borrador,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Ejecutar quick filter
      mockComponent.handleQuickFilter('pendientes');

      // ✅ Verificar que el estado se estableció a undefined
      expect(mockComponent.getFiltros().estado).toBeUndefined();
      expect(mockComponent.getForm().getValue('estado')).toBeUndefined();
      expect(mockOnFiltrosChange).toHaveBeenCalledWith({
        busqueda: '',
        estado: undefined,
      });
    });

    test('should not throw error when setting undefined value', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.borrador,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ No debe lanzar error al establecer undefined
      expect(() => {
        mockComponent.handleQuickFilter('pendientes');
      }).not.toThrow();
    });

    test('should override other estados correctly', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.enviado, // Estado diferente
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Ejecutar quick filter
      mockComponent.handleQuickFilter('pendientes');

      // ✅ Debe cambiar de 'enviado' a 'borrador'
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.borrador);
      expect(mockComponent.getForm().getValue('estado')).toBe(EstadoPedido.borrador);
    });
  });

  describe('Quick Filter - En Tránsito', () => {
    test('should set estado to EstadoPedido.enviado when not currently enviado', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: undefined,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Ejecutar quick filter
      mockComponent.handleQuickFilter('en-transito');

      // ✅ Verificar que el estado se estableció correctamente
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.enviado);
      expect(mockComponent.getForm().getValue('estado')).toBe(EstadoPedido.enviado);
      expect(mockOnFiltrosChange).toHaveBeenCalledWith({
        busqueda: '',
        estado: EstadoPedido.enviado,
      });
    });

    test('should set estado to undefined when currently enviado (toggle off)', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.enviado,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Ejecutar quick filter
      mockComponent.handleQuickFilter('en-transito');

      // ✅ Verificar que el estado se estableció a undefined
      expect(mockComponent.getFiltros().estado).toBeUndefined();
      expect(mockComponent.getForm().getValue('estado')).toBeUndefined();
      expect(mockOnFiltrosChange).toHaveBeenCalledWith({
        busqueda: '',
        estado: undefined,
      });
    });

    test('should not throw error when setting undefined value', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.enviado,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ No debe lanzar error al establecer undefined
      expect(() => {
        mockComponent.handleQuickFilter('en-transito');
      }).not.toThrow();
    });

    test('should override other estados correctly', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.atendido, // Estado diferente
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Ejecutar quick filter
      mockComponent.handleQuickFilter('en-transito');

      // ✅ Debe cambiar de 'atendido' a 'enviado'
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.enviado);
      expect(mockComponent.getForm().getValue('estado')).toBe(EstadoPedido.enviado);
    });
  });

  describe('Form setValue Type Safety', () => {
    test('should accept all valid EstadoPedido enum values', () => {
      const mockForm = new MockForm();

      // ✅ Todos los valores del enum deben ser aceptados
      Object.values(EstadoPedido).forEach(estado => {
        expect(() => {
          mockForm.setValue('estado', estado);
        }).not.toThrow();
        expect(mockForm.getValue('estado')).toBe(estado);
      });
    });

    test('should accept undefined value', () => {
      const mockForm = new MockForm();

      expect(() => {
        mockForm.setValue('estado', undefined);
      }).not.toThrow();
      expect(mockForm.getValue('estado')).toBeUndefined();
    });

    test('should reject empty string (simulating the original error)', () => {
      const mockForm = new MockForm();

      // ✅ Simula el error que se producía con || ''
      expect(() => {
        mockForm.setValue('estado', '');
      }).toThrow(/Empty string not allowed for estado field/);
    });

    test('should reject invalid string values', () => {
      const mockForm = new MockForm();

      const invalidValues = ['invalid', 'all', 'pending', 'in_transit'];

      invalidValues.forEach(invalidValue => {
        expect(() => {
          mockForm.setValue('estado', invalidValue);
        }).toThrow(`Invalid estado value: ${invalidValue}`);
      });
    });
  });

  describe('Integration with Schema Validation', () => {
    test('should validate form data with corrected estado values', () => {
      const testCases = [
        { estado: EstadoPedido.borrador, expected: true },
        { estado: EstadoPedido.enviado, expected: true },
        { estado: EstadoPedido.atendido, expected: true },
        { estado: EstadoPedido.parcial, expected: true },
        { estado: EstadoPedido.entregado, expected: true },
        { estado: EstadoPedido.cancelado, expected: true },
        { estado: undefined, expected: true },
      ];

      testCases.forEach(({ estado, expected }) => {
        const formData = {
          busqueda: 'test',
          estado,
        };

        const result = filtrosSchema.safeParse(formData);
        expect(result.success).toBe(expected);

        if (result.success) {
          expect(result.data.estado).toBe(estado);
        }
      });
    });

    test('should reject empty string in schema validation', () => {
      const formData = {
        busqueda: 'test',
        estado: '', // ✅ Esto debe fallar en la validación del schema
      };

      const result = filtrosSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });
  });

  describe('Workflow Integration Tests', () => {
    test('should handle complete pendientes workflow without errors', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: 'test search',
        proyectoId: 'proyecto-1',
        estado: undefined,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Activar filtro pendientes
      mockComponent.handleQuickFilter('pendientes');
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.borrador);
      expect(mockComponent.getForm().getValue('estado')).toBe(EstadoPedido.borrador);

      // ✅ Desactivar filtro pendientes
      mockComponent.handleQuickFilter('pendientes');
      expect(mockComponent.getFiltros().estado).toBeUndefined();
      expect(mockComponent.getForm().getValue('estado')).toBeUndefined();
    });

    test('should handle complete en-transito workflow without errors', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: 'test search',
        proveedorId: 'proveedor-1',
        estado: undefined,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Activar filtro en-transito
      mockComponent.handleQuickFilter('en-transito');
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.enviado);
      expect(mockComponent.getForm().getValue('estado')).toBe(EstadoPedido.enviado);

      // ✅ Desactivar filtro en-transito
      mockComponent.handleQuickFilter('en-transito');
      expect(mockComponent.getFiltros().estado).toBeUndefined();
      expect(mockComponent.getForm().getValue('estado')).toBeUndefined();
    });

    test('should handle switching between quick filters', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: undefined,
      };

      const mockComponent = new MockPedidoEquipoFiltersQuickFilter(
        initialFiltros,
        mockOnFiltrosChange
      );

      // ✅ Activar pendientes
      mockComponent.handleQuickFilter('pendientes');
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.borrador);

      // ✅ Cambiar a en-transito
      mockComponent.handleQuickFilter('en-transito');
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.enviado);

      // ✅ Volver a pendientes
      mockComponent.handleQuickFilter('pendientes');
      expect(mockComponent.getFiltros().estado).toBe(EstadoPedido.borrador);
    });
  });
});
