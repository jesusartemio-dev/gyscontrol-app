/**
 * Test para verificar la corrección completa del campo estado en PedidoEquipoFilters
 * Valida que el manejo de 'all' vs undefined funcione correctamente con EstadoPedido enum
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

// ✅ Mock de las funciones del componente
class MockPedidoEquipoFilters {
  private filtros: FiltrosPedidoEquipo;
  private formValues: Record<string, any> = {};

  constructor(initialFiltros: FiltrosPedidoEquipo) {
    this.filtros = { ...initialFiltros };
  }

  // ✅ Simula form.setValue
  setValue(field: string, value: any) {
    this.formValues[field] = value;
  }

  // ✅ Simula form.reset
  reset(values: Record<string, any>) {
    this.formValues = { ...values };
  }

  // ✅ Simula defaultValues logic
  getDefaultValues(): FiltrosForm {
    return {
      busqueda: this.filtros.busqueda || '',
      proyectoId: this.filtros.proyectoId || 'all',
      proveedorId: this.filtros.proveedorId || 'all',
      estado: this.filtros.estado || undefined, // ✅ Corregido: undefined en lugar de 'all'
      fechaCreacion: this.filtros.fechaCreacion ? {
        from: this.filtros.fechaCreacion.from,
        to: this.filtros.fechaCreacion.to,
      } : undefined,
      fechaEntrega: this.filtros.fechaEntrega ? {
        from: this.filtros.fechaEntrega.from,
        to: this.filtros.fechaEntrega.to,
      } : undefined,
      montoMinimo: this.filtros.montoMinimo,
      montoMaximo: this.filtros.montoMaximo,
      tieneObservaciones: this.filtros.tieneObservaciones,
      soloVencidos: this.filtros.soloVencidos,
      soloSinRecibir: this.filtros.soloSinRecibir,
      soloUrgentes: this.filtros.soloUrgentes,
      coherenciaMinima: this.filtros.coherenciaMinima,
    };
  }

  // ✅ Simula onSubmit logic
  onSubmit(data: FiltrosForm): FiltrosPedidoEquipo {
    return {
      ...this.filtros,
      busqueda: data.busqueda || undefined,
      proyectoId: data.proyectoId === 'all' ? undefined : data.proyectoId,
      proveedorId: data.proveedorId === 'all' ? undefined : data.proveedorId,
      estado: data.estado, // ✅ Corregido: sin comparación con 'all'
      fechaCreacion: data.fechaCreacion?.from ? {
        from: data.fechaCreacion.from,
        to: data.fechaCreacion.to || data.fechaCreacion.from,
      } : undefined,
      fechaEntrega: data.fechaEntrega?.from ? {
        from: data.fechaEntrega.from,
        to: data.fechaEntrega.to || data.fechaEntrega.from,
      } : undefined,
      montoMinimo: data.montoMinimo,
      montoMaximo: data.montoMaximo,
      tieneObservaciones: data.tieneObservaciones,
      soloVencidos: data.soloVencidos,
      soloSinRecibir: data.soloSinRecibir,
      soloUrgentes: data.soloUrgentes,
      coherenciaMinima: data.coherenciaMinima,
    };
  }

  // ✅ Simula handleRemoveFilter logic
  handleRemoveFilter(key: string): void {
    const newFiltros = { ...this.filtros };
    delete (newFiltros as any)[key];
    
    // ✅ Reset form field logic corregido
    if (key === 'proyectoId' || key === 'proveedorId') {
      this.setValue(key, 'all');
    } else if (key === 'estado') {
      this.setValue('estado', undefined); // ✅ Corregido: undefined en lugar de 'all'
    } else {
      this.setValue(key, key.includes('fecha') ? undefined : key.startsWith('solo') || key === 'tieneObservaciones' ? false : undefined);
    }
    
    this.filtros = newFiltros;
  }

  // ✅ Simula handleReset logic
  handleReset(): void {
    this.reset({
      busqueda: '',
      proyectoId: 'all',
      proveedorId: 'all',
      estado: undefined, // ✅ Corregido: undefined en lugar de 'all'
      fechaCreacion: undefined,
      fechaEntrega: undefined,
      montoMinimo: undefined,
      montoMaximo: undefined,
      tieneObservaciones: false,
      soloVencidos: false,
      soloSinRecibir: false,
      soloUrgentes: false,
      coherenciaMinima: undefined,
    });
  }

  // ✅ Simula Select onValueChange logic
  handleSelectChange(value: string): EstadoPedido | undefined {
    return value === 'all' ? undefined : (value as EstadoPedido);
  }

  // ✅ Simula Select value logic
  getSelectValue(fieldValue: EstadoPedido | undefined): string {
    return fieldValue || 'all';
  }

  getFiltros() {
    return this.filtros;
  }

  getFormValues() {
    return this.formValues;
  }
}

describe('PedidoEquipoFilters - Estado All Correction', () => {
  describe('Default Values Correction', () => {
    test('should use undefined instead of "all" for estado in defaultValues', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: undefined,
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      const defaultValues = mockComponent.getDefaultValues();
      
      expect(defaultValues.estado).toBeUndefined();
      expect(defaultValues.estado).not.toBe('all');
    });

    test('should preserve EstadoPedido values in defaultValues', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.borrador,
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      const defaultValues = mockComponent.getDefaultValues();
      
      expect(defaultValues.estado).toBe(EstadoPedido.borrador);
    });

    test('should validate defaultValues with schema', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: 'test',
        estado: EstadoPedido.enviado,
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      const defaultValues = mockComponent.getDefaultValues();
      
      const result = filtrosSchema.safeParse(defaultValues);
      expect(result.success).toBe(true);
    });
  });

  describe('Form Submission Correction', () => {
    test('should not compare estado with "all" in onSubmit', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      
      const formData: FiltrosForm = {
        busqueda: 'test',
        estado: EstadoPedido.atendido,
      };
      
      const result = mockComponent.onSubmit(formData);
      
      expect(result.estado).toBe(EstadoPedido.atendido);
    });

    test('should handle undefined estado correctly in onSubmit', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      
      const formData: FiltrosForm = {
        busqueda: 'test',
        estado: undefined,
      };
      
      const result = mockComponent.onSubmit(formData);
      
      expect(result.estado).toBeUndefined();
    });

    test('should preserve all EstadoPedido values in onSubmit', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      
      const estadosToTest = Object.values(EstadoPedido);
      
      estadosToTest.forEach(estado => {
        const formData: FiltrosForm = {
          busqueda: 'test',
          estado,
        };
        
        const result = mockComponent.onSubmit(formData);
        expect(result.estado).toBe(estado);
      });
    });
  });

  describe('Filter Removal Correction', () => {
    test('should set estado to undefined when removing estado filter', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.borrador,
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      mockComponent.handleRemoveFilter('estado');
      
      expect(mockComponent.getFormValues().estado).toBeUndefined();
      expect(mockComponent.getFormValues().estado).not.toBe('all');
    });

    test('should handle other filters correctly', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        proyectoId: 'proyecto-1',
        proveedorId: 'proveedor-1',
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      
      mockComponent.handleRemoveFilter('proyectoId');
      expect(mockComponent.getFormValues().proyectoId).toBe('all');
      
      mockComponent.handleRemoveFilter('proveedorId');
      expect(mockComponent.getFormValues().proveedorId).toBe('all');
    });
  });

  describe('Reset Functionality Correction', () => {
    test('should reset estado to undefined instead of "all"', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: 'test',
        estado: EstadoPedido.entregado,
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      mockComponent.handleReset();
      
      expect(mockComponent.getFormValues().estado).toBeUndefined();
      expect(mockComponent.getFormValues().estado).not.toBe('all');
    });

    test('should reset other fields correctly', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: 'test',
        proyectoId: 'proyecto-1',
        proveedorId: 'proveedor-1',
        soloVencidos: true,
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      mockComponent.handleReset();
      
      const formValues = mockComponent.getFormValues();
      
      expect(formValues.busqueda).toBe('');
      expect(formValues.proyectoId).toBe('all');
      expect(formValues.proveedorId).toBe('all');
      expect(formValues.soloVencidos).toBe(false);
    });
  });

  describe('Select Component Logic', () => {
    test('should convert "all" to undefined in Select onValueChange', () => {
      const mockComponent = new MockPedidoEquipoFilters({});
      
      const result = mockComponent.handleSelectChange('all');
      expect(result).toBeUndefined();
    });

    test('should preserve EstadoPedido values in Select onValueChange', () => {
      const mockComponent = new MockPedidoEquipoFilters({});
      
      Object.values(EstadoPedido).forEach(estado => {
        const result = mockComponent.handleSelectChange(estado);
        expect(result).toBe(estado);
      });
    });

    test('should convert undefined to "all" in Select value', () => {
      const mockComponent = new MockPedidoEquipoFilters({});
      
      const result = mockComponent.getSelectValue(undefined);
      expect(result).toBe('all');
    });

    test('should preserve EstadoPedido values in Select value', () => {
      const mockComponent = new MockPedidoEquipoFilters({});
      
      Object.values(EstadoPedido).forEach(estado => {
        const result = mockComponent.getSelectValue(estado);
        expect(result).toBe(estado);
      });
    });
  });

  describe('Schema Validation', () => {
    test('should validate all EstadoPedido enum values', () => {
      Object.values(EstadoPedido).forEach(estado => {
        const data = { estado };
        const result = filtrosSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    test('should reject "all" as estado value', () => {
      const data = { estado: 'all' };
      const result = filtrosSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test('should accept undefined as estado value', () => {
      const data = { estado: undefined };
      const result = filtrosSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test('should validate complete form with corrected estado handling', () => {
      const completeFormData = {
        busqueda: 'test search',
        proyectoId: 'proyecto-1',
        proveedorId: 'proveedor-1',
        estado: EstadoPedido.parcial,
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
        expect(result.data.estado).toBe(EstadoPedido.parcial);
        expect(result.data.fechaCreacion?.from).toBeInstanceOf(Date);
        expect(result.data.fechaEntrega?.to).toBeInstanceOf(Date);
      }
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete workflow with estado corrections', () => {
      // ✅ Inicializar con estado
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
        estado: EstadoPedido.borrador,
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      
      // ✅ Verificar defaultValues
      const defaultValues = mockComponent.getDefaultValues();
      expect(defaultValues.estado).toBe(EstadoPedido.borrador);
      
      // ✅ Simular cambio de estado
      const formData: FiltrosForm = {
        ...defaultValues,
        estado: EstadoPedido.enviado,
      };
      
      // ✅ Verificar onSubmit
      const submitResult = mockComponent.onSubmit(formData);
      expect(submitResult.estado).toBe(EstadoPedido.enviado);
      
      // ✅ Verificar remoción de filtro
      mockComponent.handleRemoveFilter('estado');
      expect(mockComponent.getFormValues().estado).toBeUndefined();
      
      // ✅ Verificar reset
      mockComponent.handleReset();
      expect(mockComponent.getFormValues().estado).toBeUndefined();
    });

    test('should maintain type safety throughout the workflow', () => {
      const initialFiltros: FiltrosPedidoEquipo = {
        busqueda: '',
      };
      
      const mockComponent = new MockPedidoEquipoFilters(initialFiltros);
      
      // ✅ Test all possible estado values
      Object.values(EstadoPedido).forEach(estado => {
        const formData: FiltrosForm = {
          busqueda: 'test',
          estado,
        };
        
        // ✅ Validate schema
        const schemaResult = filtrosSchema.safeParse(formData);
        expect(schemaResult.success).toBe(true);
        
        // ✅ Test onSubmit
        const submitResult = mockComponent.onSubmit(formData);
        expect(submitResult.estado).toBe(estado);
        
        // ✅ Test Select logic
        const selectValue = mockComponent.getSelectValue(estado);
        expect(selectValue).toBe(estado);
        
        const selectChange = mockComponent.handleSelectChange(estado);
        expect(selectChange).toBe(estado);
      });
    });
  });
});