/**
 * Test para verificar la corrección de tipos EstadoPedido en PedidoEquipoFilters
 * Valida que los filtros rápidos usen valores válidos del enum EstadoPedido
 */

import * as z from 'zod';
import { EstadoPedido } from '@prisma/client';
import type { FiltrosPedidoEquipo } from '@/types/aprovisionamiento';

// ✅ Mock del esquema filtrosSchema actualizado
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

// ✅ Mock de la función handleQuickFilter
class MockQuickFilterHandler {
  private filtros: FiltrosPedidoEquipo;
  private formValues: Record<string, any> = {};

  constructor(initialFiltros: FiltrosPedidoEquipo) {
    this.filtros = { ...initialFiltros };
  }

  // ✅ Simula form.setValue
  setValue(field: string, value: any) {
    this.formValues[field] = value;
  }

  // ✅ Simula la lógica de handleQuickFilter corregida
  handleQuickFilter(type: string): FiltrosPedidoEquipo {
    const newFiltros = { ...this.filtros };
    
    switch (type) {
      case 'vencidos':
        newFiltros.soloVencidos = !this.filtros.soloVencidos;
        this.setValue('soloVencidos', newFiltros.soloVencidos);
        break;
      case 'sin-recibir':
        newFiltros.soloSinRecibir = !this.filtros.soloSinRecibir;
        this.setValue('soloSinRecibir', newFiltros.soloSinRecibir);
        break;
      case 'urgentes':
        newFiltros.soloUrgentes = !this.filtros.soloUrgentes;
        this.setValue('soloUrgentes', newFiltros.soloUrgentes);
        break;
      case 'con-observaciones':
        newFiltros.tieneObservaciones = !this.filtros.tieneObservaciones;
        this.setValue('tieneObservaciones', newFiltros.tieneObservaciones);
        break;
      case 'pendientes':
        // ✅ Corregido: usar 'borrador' en lugar de 'pendiente'
        newFiltros.estado = this.filtros.estado === EstadoPedido.borrador ? undefined : EstadoPedido.borrador;
        this.setValue('estado', newFiltros.estado || '');
        break;
      case 'en-transito':
        // ✅ Corregido: usar 'enviado' en lugar de 'en_transito'
        newFiltros.estado = this.filtros.estado === EstadoPedido.enviado ? undefined : EstadoPedido.enviado;
        this.setValue('estado', newFiltros.estado || '');
        break;
    }
    
    this.filtros = newFiltros;
    return newFiltros;
  }

  getFiltros() {
    return this.filtros;
  }

  getFormValues() {
    return this.formValues;
  }
}

describe('PedidoEquipoFilters - EstadoPedido Correction', () => {
  describe('EstadoPedido Enum Validation', () => {
    test('should validate all EstadoPedido enum values', () => {
      const estadosValidos = Object.values(EstadoPedido);
      
      expect(estadosValidos).toContain('borrador');
      expect(estadosValidos).toContain('enviado');
      expect(estadosValidos).toContain('atendido');
      expect(estadosValidos).toContain('parcial');
      expect(estadosValidos).toContain('entregado');
      expect(estadosValidos).toContain('cancelado');
    });

    test('should reject invalid estado values', () => {
      const estadosValidos = Object.values(EstadoPedido);
      
      // ❌ Valores que antes causaban error
      expect(estadosValidos.includes('pendiente' as EstadoPedido)).toBe(false);
      expect(estadosValidos.includes('en_transito' as EstadoPedido)).toBe(false);
    });

    test('should validate schema with valid EstadoPedido values', () => {
      const validData = {
        estado: EstadoPedido.borrador,
        busqueda: 'test',
      };

      const result = filtrosSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject schema with invalid estado values', () => {
      const invalidData = {
        estado: 'pendiente', // ❌ Valor inválido
        busqueda: 'test',
      };

      const result = filtrosSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Quick Filter Corrections', () => {
    let mockHandler: MockQuickFilterHandler;
    let initialFiltros: FiltrosPedidoEquipo;

    beforeEach(() => {
      initialFiltros = {
        busqueda: '',
        proyectoId: undefined,
        proveedorId: undefined,
        estado: undefined,
        fechaCreacion: undefined,
        fechaEntrega: undefined,
        montoMinimo: undefined,
        montoMaximo: undefined,
        tieneObservaciones: undefined,
        soloVencidos: false,
        soloSinRecibir: false,
        soloUrgentes: false,
        coherenciaMinima: undefined,
      };
      mockHandler = new MockQuickFilterHandler(initialFiltros);
    });

    test('should handle pendientes filter with borrador estado', () => {
      const result = mockHandler.handleQuickFilter('pendientes');
      
      expect(result.estado).toBe(EstadoPedido.borrador);
      expect(mockHandler.getFormValues().estado).toBe(EstadoPedido.borrador);
    });

    test('should toggle pendientes filter correctly', () => {
      // ✅ Activar filtro
      let result = mockHandler.handleQuickFilter('pendientes');
      expect(result.estado).toBe(EstadoPedido.borrador);
      
      // ✅ Desactivar filtro
      result = mockHandler.handleQuickFilter('pendientes');
      expect(result.estado).toBeUndefined();
      expect(mockHandler.getFormValues().estado).toBe('');
    });

    test('should handle en-transito filter with enviado estado', () => {
      const result = mockHandler.handleQuickFilter('en-transito');
      
      expect(result.estado).toBe(EstadoPedido.enviado);
      expect(mockHandler.getFormValues().estado).toBe(EstadoPedido.enviado);
    });

    test('should toggle en-transito filter correctly', () => {
      // ✅ Activar filtro
      let result = mockHandler.handleQuickFilter('en-transito');
      expect(result.estado).toBe(EstadoPedido.enviado);
      
      // ✅ Desactivar filtro
      result = mockHandler.handleQuickFilter('en-transito');
      expect(result.estado).toBeUndefined();
      expect(mockHandler.getFormValues().estado).toBe('');
    });

    test('should handle other quick filters without affecting estado', () => {
      const result = mockHandler.handleQuickFilter('vencidos');
      
      expect(result.soloVencidos).toBe(true);
      expect(result.estado).toBeUndefined(); // No debe cambiar
      expect(mockHandler.getFormValues().soloVencidos).toBe(true);
    });

    test('should handle multiple quick filters correctly', () => {
      // ✅ Activar múltiples filtros
      mockHandler.handleQuickFilter('pendientes');
      mockHandler.handleQuickFilter('vencidos');
      const result = mockHandler.handleQuickFilter('urgentes');
      
      expect(result.estado).toBe(EstadoPedido.borrador);
      expect(result.soloVencidos).toBe(true);
      expect(result.soloUrgentes).toBe(true);
    });
  });

  describe('Type Safety Validation', () => {
    test('should maintain type safety with EstadoPedido enum', () => {
      const validEstados: EstadoPedido[] = [
        EstadoPedido.borrador,
        EstadoPedido.enviado,
        EstadoPedido.atendido,
        EstadoPedido.parcial,
        EstadoPedido.entregado,
        EstadoPedido.cancelado,
      ];

      validEstados.forEach(estado => {
        const data = { estado };
        const result = filtrosSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    test('should work with FiltrosPedidoEquipo interface', () => {
      const filtros: FiltrosPedidoEquipo = {
        estado: EstadoPedido.borrador,
        soloVencidos: true,
        busqueda: 'test search',
      };

      expect(filtros.estado).toBe(EstadoPedido.borrador);
      expect(typeof filtros.soloVencidos).toBe('boolean');
      expect(typeof filtros.busqueda).toBe('string');
    });

    test('should validate complete form data with EstadoPedido', () => {
      const completeFormData = {
        busqueda: 'test search',
        proyectoId: 'proyecto-1',
        proveedorId: 'proveedor-1',
        estado: EstadoPedido.atendido,
        fechaCreacion: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31'),
        },
        fechaEntrega: {
          from: new Date('2024-02-01'),
          to: new Date('2024-02-28'),
        },
        montoMinimo: 1000,
        montoMaximo: 5000,
        tieneObservaciones: true,
        soloVencidos: false,
        soloSinRecibir: false,
        soloUrgentes: true,
        coherenciaMinima: 0.8,
      };

      const result = filtrosSchema.safeParse(completeFormData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.estado).toBe(EstadoPedido.atendido);
        expect(result.data.fechaCreacion?.from).toBeInstanceOf(Date);
        expect(result.data.fechaEntrega?.to).toBeInstanceOf(Date);
      }
    });
  });

  describe('Error Prevention', () => {
    test('should prevent the original type errors', () => {
      // ✅ Estos valores ahora son válidos
      const correctedValues = {
        borrador: EstadoPedido.borrador,
        enviado: EstadoPedido.enviado,
      };

      Object.values(correctedValues).forEach(estado => {
        const data = { estado };
        const result = filtrosSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    test('should maintain backward compatibility with undefined estado', () => {
      const dataWithUndefinedEstado = {
        busqueda: 'test',
        estado: undefined,
      };

      const result = filtrosSchema.safeParse(dataWithUndefinedEstado);
      expect(result.success).toBe(true);
    });

    test('should handle form reset scenarios', () => {
      const mockHandler = new MockQuickFilterHandler({
        estado: EstadoPedido.borrador,
        soloVencidos: true,
      } as FiltrosPedidoEquipo);

      // ✅ Reset estado
      const result = mockHandler.handleQuickFilter('pendientes');
      expect(result.estado).toBeUndefined();
      expect(mockHandler.getFormValues().estado).toBe('');
    });
  });
});
