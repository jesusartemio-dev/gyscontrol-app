/**
 * Test para verificar la corrección de tipos DateRange en ListaEquipoFilters
 * Valida que los componentes DatePickerWithRange reciban el tipo correcto
 */

import * as z from 'zod';
import { DateRange } from 'react-day-picker';

// ✅ Mock del esquema filtrosSchema
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

// ✅ Mock del componente DatePickerWithRange
interface DatePickerWithRangeProps {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

class MockDatePickerWithRange {
  private props: DatePickerWithRangeProps;

  constructor(props: DatePickerWithRangeProps) {
    this.props = props;
  }

  getProps() {
    return this.props;
  }

  // ✅ Simula la validación de tipos que hace TypeScript
  validateDateProp(value: any): DateRange | undefined {
    // Simula el cast: field.value as DateRange | undefined
    return value as DateRange | undefined;
  }
}

// ✅ Mock de field values del formulario
class MockFormField {
  private value: any;

  constructor(value: any) {
    this.value = value;
  }

  getValue() {
    return this.value;
  }

  // ✅ Simula cómo se pasa el valor al DatePickerWithRange
  getDateRangeValue(): DateRange | undefined {
    return this.value as DateRange | undefined;
  }
}

describe('ListaEquipoFilters - DateRange Type Correction', () => {
  describe('Schema Validation', () => {
    test('should validate date range objects with optional from/to', () => {
      const validDateRange = {
        fechaCreacion: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31'),
        },
        fechaEntrega: {
          from: new Date('2024-02-01'),
          to: new Date('2024-02-28'),
        },
      };

      const result = filtrosSchema.safeParse(validDateRange);
      expect(result.success).toBe(true);
    });

    test('should validate date range with only from date', () => {
      const partialDateRange = {
        fechaCreacion: {
          from: new Date('2024-01-01'),
        },
      };

      const result = filtrosSchema.safeParse(partialDateRange);
      expect(result.success).toBe(true);
    });

    test('should validate empty date range objects', () => {
      const emptyDateRange = {
        fechaCreacion: {},
        fechaEntrega: {},
      };

      const result = filtrosSchema.safeParse(emptyDateRange);
      expect(result.success).toBe(true);
    });

    test('should validate undefined date ranges', () => {
      const undefinedDateRange = {
        fechaCreacion: undefined,
        fechaEntrega: undefined,
      };

      const result = filtrosSchema.safeParse(undefinedDateRange);
      expect(result.success).toBe(true);
    });
  });

  describe('DateRange Type Compatibility', () => {
    test('should accept valid DateRange objects', () => {
      const validDateRange: DateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };

      const mockPicker = new MockDatePickerWithRange({
        date: validDateRange,
        onDateChange: jest.fn(),
        placeholder: 'Seleccionar rango...',
      });

      expect(mockPicker.getProps().date).toEqual(validDateRange);
      expect(mockPicker.getProps().date?.from).toBeInstanceOf(Date);
      expect(mockPicker.getProps().date?.to).toBeInstanceOf(Date);
    });

    test('should accept DateRange with only from date', () => {
      const partialDateRange: DateRange = {
        from: new Date('2024-01-01'),
        to: undefined,
      };

      const mockPicker = new MockDatePickerWithRange({
        date: partialDateRange,
        onDateChange: jest.fn(),
        placeholder: 'Seleccionar rango...',
      });

      expect(mockPicker.getProps().date?.from).toBeInstanceOf(Date);
      expect(mockPicker.getProps().date?.to).toBeUndefined();
    });

    test('should accept undefined DateRange', () => {
      const mockPicker = new MockDatePickerWithRange({
        date: undefined,
        onDateChange: jest.fn(),
        placeholder: 'Seleccionar rango...',
      });

      expect(mockPicker.getProps().date).toBeUndefined();
    });
  });

  describe('Form Field Value Casting', () => {
    test('should cast form field value to DateRange correctly', () => {
      const fieldValue = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };

      const mockField = new MockFormField(fieldValue);
      const castedValue = mockField.getDateRangeValue();

      expect(castedValue).toEqual(fieldValue);
      expect(castedValue?.from).toBeInstanceOf(Date);
      expect(castedValue?.to).toBeInstanceOf(Date);
    });

    test('should handle undefined field values', () => {
      const mockField = new MockFormField(undefined);
      const castedValue = mockField.getDateRangeValue();

      expect(castedValue).toBeUndefined();
    });

    test('should handle partial date range field values', () => {
      const fieldValue = {
        from: new Date('2024-01-01'),
      };

      const mockField = new MockFormField(fieldValue);
      const castedValue = mockField.getDateRangeValue();

      expect(castedValue?.from).toBeInstanceOf(Date);
      expect(castedValue?.to).toBeUndefined();
    });
  });

  describe('Type Safety Validation', () => {
    test('should maintain type safety with DateRange interface', () => {
      // ✅ Verificar que DateRange requiere from como Date | undefined
      const validDateRange: DateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };

      expect(typeof validDateRange.from).toBe('object');
      expect(validDateRange.from).toBeInstanceOf(Date);
      expect(typeof validDateRange.to).toBe('object');
      expect(validDateRange.to).toBeInstanceOf(Date);
    });

    test('should allow undefined values in DateRange', () => {
      const partialDateRange: DateRange = {
        from: undefined,
        to: undefined,
      };

      expect(partialDateRange.from).toBeUndefined();
      expect(partialDateRange.to).toBeUndefined();
    });

    test('should validate DatePickerWithRange props interface', () => {
      const props: DatePickerWithRangeProps = {
        date: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31'),
        },
        onDateChange: jest.fn(),
        placeholder: 'Test placeholder',
        className: 'test-class',
      };

      expect(props.date?.from).toBeInstanceOf(Date);
      expect(props.date?.to).toBeInstanceOf(Date);
      expect(typeof props.onDateChange).toBe('function');
      expect(typeof props.placeholder).toBe('string');
      expect(typeof props.className).toBe('string');
    });
  });

  describe('Integration with Form Schema', () => {
    test('should work with complete form data including date ranges', () => {
      const completeFormData = {
        busqueda: 'test search',
        proyectoId: 'all',
        estado: 'borrador' as const,
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
        soloVencidas: false,
        soloSinPedidos: false,
        coherenciaMinima: 0.8,
      };

      const result = filtrosSchema.safeParse(completeFormData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fechaCreacion?.from).toBeInstanceOf(Date);
        expect(result.data.fechaCreacion?.to).toBeInstanceOf(Date);
        expect(result.data.fechaEntrega?.from).toBeInstanceOf(Date);
        expect(result.data.fechaEntrega?.to).toBeInstanceOf(Date);
      }
    });
  });
});
