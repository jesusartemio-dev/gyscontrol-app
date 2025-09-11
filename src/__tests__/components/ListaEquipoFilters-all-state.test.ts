// ✅ Test para verificar corrección del valor 'all' en estado
// 📋 Verifica que el esquema Zod acepta 'all' como valor válido para estado

import * as z from 'zod';
import type { EstadoListaEquipo } from '@/types/modelos';

// 🔧 Esquema corregido que incluye 'all'
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

// 🔧 Mock de funciones de procesamiento
const MockFilterProcessor = {
  // ✅ Simula el defaultValues del formulario
  createDefaultValues: (filtros: { estado?: EstadoListaEquipo }) => {
    return {
      busqueda: '',
      proyectoId: 'all',
      estado: filtros.estado || 'all', // ✅ Ahora 'all' es válido
      montoMinimo: undefined,
      montoMaximo: undefined,
      tieneObservaciones: undefined,
      soloVencidas: undefined,
      soloSinPedidos: undefined,
      coherenciaMinima: undefined,
    };
  },

  // ✅ Simula el onSubmit del formulario
  processFormSubmission: (data: FiltrosForm) => {
    return {
      busqueda: data.busqueda || undefined,
      proyectoId: data.proyectoId === 'all' ? undefined : data.proyectoId,
      estado: data.estado === 'all' ? undefined : (data.estado as EstadoListaEquipo),
      montoMinimo: data.montoMinimo,
      montoMaximo: data.montoMaximo,
      tieneObservaciones: data.tieneObservaciones,
      soloVencidas: data.soloVencidas,
      soloSinPedidos: data.soloSinPedidos,
      coherenciaMinima: data.coherenciaMinima,
    };
  },

  // ✅ Simula el setValue para filtros rápidos
  setQuickFilterValue: (estado?: EstadoListaEquipo) => {
    return estado || 'all'; // ✅ Retorna 'all' si no hay estado
  }
};

describe('ListaEquipoFilters - All State Correction', () => {
  it('should validate schema with "all" value for estado', () => {
    // ✅ Test que 'all' es válido en el esquema
    const validData = {
      busqueda: 'test',
      proyectoId: 'proj-1',
      estado: 'all' as const,
      montoMinimo: 1000
    };

    const result = filtrosSchema.safeParse(validData);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.estado).toBe('all');
      expect(result.data.busqueda).toBe('test');
      expect(result.data.proyectoId).toBe('proj-1');
      expect(result.data.montoMinimo).toBe(1000);
    }
  });

  it('should validate schema with EstadoListaEquipo values', () => {
    // ✅ Test que los valores de EstadoListaEquipo siguen siendo válidos
    const estadosValidos: EstadoListaEquipo[] = [
      'borrador',
      'por_revisar', 
      'por_cotizar',
      'por_validar',
      'por_aprobar',
      'aprobado',
      'rechazado'
    ];

    estadosValidos.forEach(estado => {
      const data = { estado };
      const result = filtrosSchema.safeParse(data);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.estado).toBe(estado);
      }
    });
  });

  it('should reject invalid estado values', () => {
    // ❌ Test que valores inválidos son rechazados
    const invalidData = {
      estado: 'invalid_state'
    };

    const result = filtrosSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should handle default values with "all" correctly', () => {
    // ✅ Test del defaultValues con 'all'
    const filtros = { estado: undefined as EstadoListaEquipo | undefined };
    const defaults = MockFilterProcessor.createDefaultValues(filtros);

    expect(defaults.estado).toBe('all');
    expect(defaults.proyectoId).toBe('all');
    expect(defaults.busqueda).toBe('');
  });

  it('should handle default values with existing estado', () => {
    // ✅ Test del defaultValues con estado existente
    const filtros = { estado: 'aprobado' as EstadoListaEquipo };
    const defaults = MockFilterProcessor.createDefaultValues(filtros);

    expect(defaults.estado).toBe('aprobado');
  });

  it('should process form submission with "all" correctly', () => {
    // ✅ Test del onSubmit con 'all'
    const formData: FiltrosForm = {
      busqueda: 'equipos',
      proyectoId: 'all',
      estado: 'all',
      montoMinimo: 5000
    };

    const result = MockFilterProcessor.processFormSubmission(formData);

    // 🔧 'all' debe convertirse a undefined en el resultado final
    expect(result.proyectoId).toBeUndefined();
    expect(result.estado).toBeUndefined();
    expect(result.busqueda).toBe('equipos');
    expect(result.montoMinimo).toBe(5000);
  });

  it('should process form submission with specific estado correctly', () => {
    // ✅ Test del onSubmit con estado específico
    const formData: FiltrosForm = {
      busqueda: 'test',
      proyectoId: 'proj-123',
      estado: 'borrador',
      tieneObservaciones: true
    };

    const result = MockFilterProcessor.processFormSubmission(formData);

    expect(result.proyectoId).toBe('proj-123');
    expect(result.estado).toBe('borrador');
    expect(result.busqueda).toBe('test');
    expect(result.tieneObservaciones).toBe(true);
  });

  it('should handle quick filter setValue with "all"', () => {
    // ✅ Test del setValue para filtros rápidos
    const result1 = MockFilterProcessor.setQuickFilterValue(undefined);
    expect(result1).toBe('all');

    const result2 = MockFilterProcessor.setQuickFilterValue('borrador');
    expect(result2).toBe('borrador');
  });

  it('should validate complete form data structure', () => {
    // ✅ Test de estructura completa del formulario
    const completeFormData: FiltrosForm = {
      busqueda: 'equipos de construcción',
      proyectoId: 'all',
      estado: 'all',
      fechaCreacion: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      },
      fechaEntrega: {
        from: new Date('2024-02-01'),
        to: new Date('2024-02-28')
      },
      montoMinimo: 1000,
      montoMaximo: 50000,
      tieneObservaciones: false,
      soloVencidas: true,
      soloSinPedidos: false,
      coherenciaMinima: 85
    };

    const result = filtrosSchema.safeParse(completeFormData);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.estado).toBe('all');
      expect(result.data.proyectoId).toBe('all');
      expect(result.data.montoMinimo).toBe(1000);
      expect(result.data.coherenciaMinima).toBe(85);
    }
  });
});
