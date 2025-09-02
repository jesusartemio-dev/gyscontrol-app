/**
 * @fileoverview Tests for useListaEquipoFilters hook
 * @description Unit tests for advanced filtering functionality in Master-Detail pattern
 * @author GYS Team
 * @date 2024
 */

import { renderHook, act } from '@testing-library/react';
import { useListaEquipoFilters } from '@/hooks/useListaEquipoFilters';
import { ListaEquipoMaster } from '@/types/modelos';

// 🧪 Mock dependencies
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: jest.fn((value) => value)
}));

// 📊 Mock data
const mockLists: ListaEquipoMaster[] = [
  {
    id: 'lista-1',
    nombre: 'Lista Equipos Oficina',
    descripcion: 'Equipos para oficina principal',
    estado: 'ACTIVA',
    fechaCreacion: new Date('2024-01-01'),
    fechaActualizacion: new Date('2024-01-02'),
    totalItems: 10,
    itemsCompletados: 5,
    presupuestoTotal: 15000,
    costoReal: 12000,
    responsable: 'Juan Pérez',
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Alpha',
      codigo: 'PROJ-001'
    }
  },
  {
    id: 'lista-2',
    nombre: 'Lista Equipos Laboratorio',
    descripcion: 'Equipos especializados para laboratorio',
    estado: 'COMPLETADA',
    fechaCreacion: new Date('2024-01-15'),
    fechaActualizacion: new Date('2024-01-20'),
    totalItems: 8,
    itemsCompletados: 8,
    presupuestoTotal: 25000,
    costoReal: 23000,
    responsable: 'María García',
    proyecto: {
      id: 'proyecto-2',
      nombre: 'Proyecto Beta',
      codigo: 'PROJ-002'
    }
  },
  {
    id: 'lista-3',
    nombre: 'Lista Equipos Producción',
    descripcion: 'Equipos para línea de producción',
    estado: 'PAUSADA',
    fechaCreacion: new Date('2024-02-01'),
    fechaActualizacion: new Date('2024-02-05'),
    totalItems: 15,
    itemsCompletados: 3,
    presupuestoTotal: 50000,
    costoReal: 10000,
    responsable: 'Carlos López',
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Alpha',
      codigo: 'PROJ-001'
    }
  }
];

const mockConfig = {
  enableHistory: true,
  enablePresets: true,
  enableAnalytics: true,
  debounceMs: 300,
  maxHistorySize: 10
};

describe('useListaEquipoFilters Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('✅ Basic Functionality', () => {
    it('should initialize with default filters', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      expect(result.current.filters).toEqual({
        estado: 'all',
        progreso: 'all',
        fechaCreacion: '',
        presupuesto: 'all',
        responsable: '',
        proyecto: 'all'
      });
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('should update individual filters', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
      });

      expect(result.current.filters.estado).toBe('ACTIVA');
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should clear all filters', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.updateFilter('responsable', 'Juan');
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        estado: 'all',
        progreso: 'all',
        fechaCreacion: '',
        presupuesto: 'all',
        responsable: '',
        proyecto: 'all'
      });
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('🔍 Filtering Logic', () => {
    it('should filter by estado correctly', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
      });

      const filtered = result.current.applyFilters(mockLists);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].estado).toBe('ACTIVA');
    });

    it('should filter by progress range correctly', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('progreso', '0-50');
      });

      const filtered = result.current.applyFilters(mockLists);
      expect(filtered).toHaveLength(2); // Lists with 50% and 20% progress
    });

    it('should filter by responsable correctly', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('responsable', 'Juan');
      });

      const filtered = result.current.applyFilters(mockLists);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].responsable).toContain('Juan');
    });

    it('should filter by budget range correctly', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('presupuesto', '20000-60000');
      });

      const filtered = result.current.applyFilters(mockLists);
      expect(filtered).toHaveLength(2); // Lists with 25000 and 50000 budget
    });

    it('should apply multiple filters simultaneously', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.updateFilter('responsable', 'Juan');
      });

      const filtered = result.current.applyFilters(mockLists);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].estado).toBe('ACTIVA');
      expect(filtered[0].responsable).toContain('Juan');
    });
  });

  describe('⚡ Quick Filters', () => {
    it('should provide built-in quick filters', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      expect(result.current.quickFilters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'active', name: 'Activas' }),
          expect.objectContaining({ id: 'completed', name: 'Completadas' }),
          expect.objectContaining({ id: 'high-budget', name: 'Alto Presupuesto' }),
          expect.objectContaining({ id: 'behind-schedule', name: 'Atrasadas' }),
          expect.objectContaining({ id: 'recent', name: 'Recientes' })
        ])
      );
    });

    it('should apply quick filter correctly', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.applyQuickFilter('completed');
      });

      expect(result.current.filters.estado).toBe('COMPLETADA');
    });

    it('should apply high budget quick filter', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.applyQuickFilter('high-budget');
      });

      expect(result.current.filters.presupuesto).toBe('30000-Infinity');
    });
  });

  describe('📚 Filter History', () => {
    it('should track filter history when enabled', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.updateFilter('responsable', 'Juan');
      });

      expect(result.current.history.canUndo).toBe(true);
      expect(result.current.history.items).toHaveLength(2);
    });

    it('should undo filter changes', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.history.undo();
      });

      expect(result.current.filters.estado).toBe('all');
      expect(result.current.history.canRedo).toBe(true);
    });

    it('should redo filter changes', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.history.undo();
        result.current.history.redo();
      });

      expect(result.current.filters.estado).toBe('ACTIVA');
      expect(result.current.history.canRedo).toBe(false);
    });

    it('should limit history size', () => {
      const { result } = renderHook(() => useListaEquipoFilters({
        ...mockConfig,
        maxHistorySize: 3
      }));

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.updateFilter('responsable', `User ${i}`);
        }
      });

      expect(result.current.history.items.length).toBeLessThanOrEqual(3);
    });
  });

  describe('💾 Filter Presets', () => {
    it('should save filter preset', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.updateFilter('responsable', 'Juan');
        result.current.presets.savePreset('my-preset', 'Mi Preset Personalizado');
      });

      expect(result.current.presets.savedPresets).toHaveLength(1);
      expect(result.current.presets.savedPresets[0].name).toBe('Mi Preset Personalizado');
    });

    it('should load filter preset', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.presets.savePreset('test-preset', 'Test Preset');
        result.current.clearFilters();
        result.current.presets.loadPreset('test-preset');
      });

      expect(result.current.filters.estado).toBe('ACTIVA');
    });

    it('should delete filter preset', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.presets.savePreset('delete-me', 'Delete Me');
        result.current.presets.deletePreset('delete-me');
      });

      expect(result.current.presets.savedPresets).toHaveLength(0);
    });
  });

  describe('📊 Filter Analytics', () => {
    it('should track filter usage when analytics enabled', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.updateFilter('responsable', 'Juan');
        result.current.applyQuickFilter('completed');
      });

      expect(result.current.analytics.mostUsedFilters).toBeDefined();
      expect(result.current.analytics.filterChangeCount).toBeGreaterThan(0);
    });

    it('should track most used filters', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        // Use 'estado' filter multiple times
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.updateFilter('estado', 'COMPLETADA');
        result.current.updateFilter('estado', 'PAUSADA');
        result.current.updateFilter('responsable', 'Juan');
      });

      const mostUsed = result.current.analytics.mostUsedFilters;
      expect(mostUsed[0]).toEqual({ filter: 'estado', count: 3 });
    });
  });

  describe('💾 Persistence', () => {
    it('should persist filters to localStorage', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
      });

      const stored = localStorage.getItem('lista-equipo-filters');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.estado).toBe('ACTIVA');
    });

    it('should restore filters from localStorage', () => {
      // Pre-populate localStorage
      localStorage.setItem('lista-equipo-filters', JSON.stringify({
        estado: 'COMPLETADA',
        responsable: 'María'
      }));

      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      expect(result.current.filters.estado).toBe('COMPLETADA');
      expect(result.current.filters.responsable).toBe('María');
    });
  });

  describe('🔧 Utility Functions', () => {
    it('should generate filter summary correctly', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
        result.current.updateFilter('responsable', 'Juan');
      });

      const summary = result.current.getFilterSummary();
      expect(summary).toContain('Estado: ACTIVA');
      expect(summary).toContain('Responsable: Juan');
    });

    it('should validate filter values', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      const isValid = result.current.validateFilters({
        estado: 'INVALID_STATE',
        progreso: '150-200', // Invalid range
        fechaCreacion: 'invalid-date',
        presupuesto: 'all',
        responsable: '',
        proyecto: 'all'
      });

      expect(isValid.isValid).toBe(false);
      expect(isValid.errors).toContain('Estado inválido');
      expect(isValid.errors).toContain('Rango de progreso inválido');
    });
  });

  describe('⚡ Performance', () => {
    it('should debounce filter updates', () => {
      const { useDebounce } = require('@/hooks/useDebounce');
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('responsable', 'J');
        result.current.updateFilter('responsable', 'Ju');
        result.current.updateFilter('responsable', 'Juan');
      });

      expect(useDebounce).toHaveBeenCalledWith('Juan', 300);
    });

    it('should handle large datasets efficiently', () => {
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        ...mockLists[0],
        id: `lista-${i}`,
        nombre: `Lista ${i}`,
        estado: i % 2 === 0 ? 'ACTIVA' : 'COMPLETADA'
      }));

      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
      });

      const startTime = performance.now();
      const filtered = result.current.applyFilters(largeMockData);
      const endTime = performance.now();

      expect(filtered).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe('🚨 Error Handling', () => {
    it('should handle invalid filter values gracefully', () => {
      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'INVALID_STATE' as any);
      });

      // Should not crash and should maintain valid state
      expect(result.current.filters.estado).toBe('all');
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useListaEquipoFilters(mockConfig));

      act(() => {
        result.current.updateFilter('estado', 'ACTIVA');
      });

      // Should not crash
      expect(result.current.filters.estado).toBe('ACTIVA');

      // Restore original function
      localStorage.setItem = originalSetItem;
    });
  });
});