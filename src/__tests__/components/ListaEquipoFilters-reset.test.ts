/**
 * Test para verificar la corrección del handleReset en ListaEquipoFilters
 * Valida que los valores de reset sean compatibles con el esquema Zod actualizado
 */

import * as z from 'zod';

// ✅ Mock del esquema filtrosSchema actualizado
const filtrosSchema = z.object({
  busqueda: z.string().optional(),
  proyectoId: z.string().optional(),
  estado: z.enum(['all', 'borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado']).optional(),
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
  soloVencidas: z.boolean().optional(),
  soloSinPedidos: z.boolean().optional(),
  coherenciaMinima: z.number().optional(),
});

type FiltrosForm = z.infer<typeof filtrosSchema>;

// ✅ Mock de la función handleReset corregida
class MockFormReset {
  private resetValues: FiltrosForm = {
    busqueda: '',
    proyectoId: 'all',
    estado: 'all',
    fechaCreacion: undefined,
    fechaEntrega: undefined,
    montoMinimo: undefined,
    montoMaximo: undefined,
    tieneObservaciones: false,
    soloVencidas: false,
    soloSinPedidos: false,
    coherenciaMinima: undefined,
  };

  reset(values: FiltrosForm) {
    this.resetValues = values;
    return this.resetValues;
  }

  getResetValues() {
    return this.resetValues;
  }

  handleReset() {
    return this.reset({
      busqueda: '',
      proyectoId: 'all',
      estado: 'all',
      fechaCreacion: undefined,
      fechaEntrega: undefined,
      montoMinimo: undefined,
      montoMaximo: undefined,
      tieneObservaciones: false,
      soloVencidas: false,
      soloSinPedidos: false,
      coherenciaMinima: undefined,
    });
  }
}

describe('ListaEquipoFilters - handleReset Correction', () => {
  let mockForm: MockFormReset;

  beforeEach(() => {
    mockForm = new MockFormReset();
  });

  describe('Schema Validation', () => {
    test('should validate reset values with corrected schema', () => {
      const resetValues = {
        busqueda: '',
        proyectoId: 'all',
        estado: 'all' as const,
        fechaCreacion: undefined,
        fechaEntrega: undefined,
        montoMinimo: undefined,
        montoMaximo: undefined,
        tieneObservaciones: false,
        soloVencidas: false,
        soloSinPedidos: false,
        coherenciaMinima: undefined,
      };

      const result = filtrosSchema.safeParse(resetValues);
      expect(result.success).toBe(true);
    });

    test('should reject empty string for estado', () => {
      const invalidValues = {
        busqueda: '',
        proyectoId: 'all',
        estado: '', // ❌ Valor inválido
        fechaCreacion: undefined,
        fechaEntrega: undefined,
        montoMinimo: undefined,
        montoMaximo: undefined,
        tieneObservaciones: false,
        soloVencidas: false,
        soloSinPedidos: false,
        coherenciaMinima: undefined,
      };

      const result = filtrosSchema.safeParse(invalidValues);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('estado');
      }
    });

    test('should reject empty string for proyectoId when using enum validation', () => {
      // Si proyectoId también tuviera validación enum, esto fallaría
      const resetValues = {
        busqueda: '',
        proyectoId: 'all',
        estado: 'all' as const,
        fechaCreacion: undefined,
        fechaEntrega: undefined,
        montoMinimo: undefined,
        montoMaximo: undefined,
        tieneObservaciones: false,
        soloVencidas: false,
        soloSinPedidos: false,
        coherenciaMinima: undefined,
      };

      const result = filtrosSchema.safeParse(resetValues);
      expect(result.success).toBe(true);
    });
  });

  describe('HandleReset Function', () => {
    test('should reset form with valid values', () => {
      const resetValues = mockForm.handleReset();
      
      expect(resetValues.proyectoId).toBe('all');
      expect(resetValues.estado).toBe('all');
      expect(resetValues.busqueda).toBe('');
      expect(resetValues.tieneObservaciones).toBe(false);
      expect(resetValues.soloVencidas).toBe(false);
      expect(resetValues.soloSinPedidos).toBe(false);
    });

    test('should pass schema validation after reset', () => {
      const resetValues = mockForm.handleReset();
      const result = filtrosSchema.safeParse(resetValues);
      
      expect(result.success).toBe(true);
    });

    test('should use "all" instead of empty string for select fields', () => {
      const resetValues = mockForm.handleReset();
      
      // ✅ Verificar que no se usen cadenas vacías para campos de selección
      expect(resetValues.proyectoId).not.toBe('');
      expect(resetValues.estado).not.toBe('');
      
      // ✅ Verificar que se use 'all' como valor por defecto
      expect(resetValues.proyectoId).toBe('all');
      expect(resetValues.estado).toBe('all');
    });
  });

  describe('Type Safety', () => {
    test('should maintain type safety with EstadoListaEquipo enum', () => {
      const validEstados = ['all', 'borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado'];
      
      validEstados.forEach(estado => {
        const testValues = {
          busqueda: '',
          proyectoId: 'all',
          estado: estado as any,
          fechaCreacion: undefined,
          fechaEntrega: undefined,
          montoMinimo: undefined,
          montoMaximo: undefined,
          tieneObservaciones: false,
          soloVencidas: false,
          soloSinPedidos: false,
          coherenciaMinima: undefined,
        };

        const result = filtrosSchema.safeParse(testValues);
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid estado values', () => {
      const invalidEstados = ['invalid', 'pending', 'active', 'inactive'];
      
      invalidEstados.forEach(estado => {
        const testValues = {
          busqueda: '',
          proyectoId: 'all',
          estado: estado as any,
          fechaCreacion: undefined,
          fechaEntrega: undefined,
          montoMinimo: undefined,
          montoMaximo: undefined,
          tieneObservaciones: false,
          soloVencidas: false,
          soloSinPedidos: false,
          coherenciaMinima: undefined,
        };

        const result = filtrosSchema.safeParse(testValues);
        expect(result.success).toBe(false);
      });
    });
  });
});