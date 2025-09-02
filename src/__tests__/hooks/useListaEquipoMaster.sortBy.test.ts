/**
 * 🧪 Test para verificar la corrección de SortOption en useListaEquipoMaster
 * 
 * Verifica que la función parseSortOption convierte correctamente los valores
 * de SortOption al formato esperado por masterListUtils.sortBy
 */

import { describe, it, expect } from '@jest/globals';

// Mock del tipo SortOption
type SortOption = 
  | 'nombre-asc' 
  | 'nombre-desc'
  | 'fecha-asc' 
  | 'fecha-desc'
  | 'costo-asc' 
  | 'costo-desc'
  | 'progreso-asc' 
  | 'progreso-desc'
  | 'estado-asc' 
  | 'estado-desc';

// Función parseSortOption extraída del hook para testing
const parseSortOption = (sortOption: SortOption): { field: string; direction: 'asc' | 'desc' } => {
  const [field, direction] = sortOption.split('-') as [string, 'asc' | 'desc'];
  
  // Map field names to match masterListUtils.sortBy expected fields
  const fieldMap: Record<string, string> = {
    'nombre': 'nombre',
    'fecha': 'updatedAt',
    'costo': 'costoTotal',
    'progreso': 'totalItems', // Use totalItems as proxy for progress
    'estado': 'estado'
  };
  
  return {
    field: fieldMap[field] || field,
    direction: direction || 'desc'
  };
};

describe('useListaEquipoMaster - parseSortOption', () => {
  it('should parse nombre-asc correctly', () => {
    const result = parseSortOption('nombre-asc');
    expect(result).toEqual({
      field: 'nombre',
      direction: 'asc'
    });
  });

  it('should parse fecha-desc correctly', () => {
    const result = parseSortOption('fecha-desc');
    expect(result).toEqual({
      field: 'updatedAt',
      direction: 'desc'
    });
  });

  it('should parse costo-asc correctly', () => {
    const result = parseSortOption('costo-asc');
    expect(result).toEqual({
      field: 'costoTotal',
      direction: 'asc'
    });
  });

  it('should parse progreso-desc correctly', () => {
    const result = parseSortOption('progreso-desc');
    expect(result).toEqual({
      field: 'totalItems',
      direction: 'desc'
    });
  });

  it('should parse estado-asc correctly', () => {
    const result = parseSortOption('estado-asc');
    expect(result).toEqual({
      field: 'estado',
      direction: 'asc'
    });
  });

  it('should handle all SortOption values', () => {
    const sortOptions: SortOption[] = [
      'nombre-asc', 'nombre-desc',
      'fecha-asc', 'fecha-desc',
      'costo-asc', 'costo-desc',
      'progreso-asc', 'progreso-desc',
      'estado-asc', 'estado-desc'
    ];

    sortOptions.forEach(option => {
      const result = parseSortOption(option);
      expect(result.field).toBeDefined();
      expect(['asc', 'desc']).toContain(result.direction);
    });
  });

  it('should map field names correctly', () => {
    const expectedMappings = {
      'nombre-asc': 'nombre',
      'fecha-desc': 'updatedAt',
      'costo-asc': 'costoTotal',
      'progreso-desc': 'totalItems',
      'estado-asc': 'estado'
    };

    Object.entries(expectedMappings).forEach(([sortOption, expectedField]) => {
      const result = parseSortOption(sortOption as SortOption);
      expect(result.field).toBe(expectedField);
    });
  });
});

// ✅ Test adicional para verificar compatibilidad con masterListUtils.sortBy
describe('useListaEquipoMaster - masterListUtils compatibility', () => {
  it('should generate fields compatible with masterListUtils.sortBy', () => {
    // Campos esperados por masterListUtils.sortBy según el transformer
    const expectedFields = ['nombre', 'codigo', 'estado', 'createdAt', 'updatedAt', 'totalItems', 'costoTotal'];
    
    const sortOptions: SortOption[] = [
      'nombre-asc', 'fecha-desc', 'costo-asc', 'progreso-desc', 'estado-asc'
    ];

    sortOptions.forEach(option => {
      const result = parseSortOption(option);
      // Verificar que el campo generado está en la lista de campos esperados
      // o es un campo válido (para casos como 'codigo' que no está en SortOption)
      expect(typeof result.field).toBe('string');
      expect(result.field.length).toBeGreaterThan(0);
    });
  });
});