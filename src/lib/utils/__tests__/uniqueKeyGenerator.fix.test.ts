/**
 * Test para verificar la solución de keys duplicadas en uniqueKeyGenerator
 * 
 * Este test verifica que múltiples instancias del mismo componente
 * generen keys únicas para evitar el error de React:
 * "Encountered two children with the same key"
 */

// @vitest-environment node

import {
  generateEquiposKey,
  generateServiciosKey,
  generateGastosKey,
  clearKeyCache
} from '../uniqueKeyGenerator';

describe('uniqueKeyGenerator - Duplicate Key Fix', () => {
  beforeEach(() => {
    clearKeyCache();
  });

  afterEach(() => {
    clearKeyCache();
  });

  describe('Multiple component instances with same contextId', () => {
    it('should generate unique keys for equipos across multiple component instances', () => {
      const contextId = 'cotizacion-123';
      
      // Simular múltiples instancias del mismo componente
      const key1 = generateEquiposKey(contextId);
      const key2 = generateEquiposKey(contextId);
      const key3 = generateEquiposKey(contextId);
      
      // ✅ Todas las keys deben ser diferentes
      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
      
      // ✅ Todas deben contener el contextId
      expect(key1).toContain('cotizacion-123');
      expect(key2).toContain('cotizacion-123');
      expect(key3).toContain('cotizacion-123');
      
      // ✅ Todas deben tener el prefijo equipos
      expect(key1).toContain('equipos');
      expect(key2).toContain('equipos');
      expect(key3).toContain('equipos');
    });

    it('should generate unique keys for servicios across multiple component instances', () => {
      const contextId = 'cotizacion-456';
      
      const key1 = generateServiciosKey(contextId);
      const key2 = generateServiciosKey(contextId);
      
      expect(key1).not.toBe(key2);
      expect(key1).toContain('servicios');
      expect(key2).toContain('servicios');
    });

    it('should generate unique keys for gastos across multiple component instances', () => {
      const contextId = 'cotizacion-789';
      
      const key1 = generateGastosKey(contextId);
      const key2 = generateGastosKey(contextId);
      
      expect(key1).not.toBe(key2);
      expect(key1).toContain('gastos');
      expect(key2).toContain('gastos');
    });
  });

  describe('Consistency across re-renders', () => {
    it('should return the same key for the same component instance on re-renders', () => {
      const contextId = 'cotizacion-consistency';
      
      // Primera llamada (primera renderización)
      const firstRender = generateEquiposKey(contextId);
      
      // Segunda llamada (re-renderización del mismo componente)
      const secondRender = generateEquiposKey(contextId);
      
      // ✅ Debe ser la misma key para el mismo componente
      expect(firstRender).toBe(secondRender);
    });
  });

  describe('Different contexts generate different keys', () => {
    it('should generate different keys for different cotizacion IDs', () => {
      const key1 = generateEquiposKey('cotizacion-111');
      const key2 = generateEquiposKey('cotizacion-222');
      
      expect(key1).not.toBe(key2);
      expect(key1).toContain('cotizacion-111');
      expect(key2).toContain('cotizacion-222');
    });
  });

  describe('Instance identifiers', () => {
    it('should include instance identifiers in generated keys', () => {
      const contextId = 'test-context';
      
      const key1 = generateEquiposKey(contextId);
      const key2 = generateEquiposKey(contextId);
      
      // ✅ Las keys deben contener identificadores de instancia
      expect(key1).toMatch(/inst\d+/);
      expect(key2).toMatch(/inst\d+/);
      
      // ✅ Los identificadores de instancia deben ser diferentes
      const inst1Match = key1.match(/inst(\d+)/);
      const inst2Match = key2.match(/inst(\d+)/);
      
      expect(inst1Match).toBeTruthy();
      expect(inst2Match).toBeTruthy();
      expect(inst1Match![1]).not.toBe(inst2Match![1]);
    });
  });

  describe('Cache clearing', () => {
    it('should clear all caches when clearKeyCache is called', () => {
      const contextId = 'cache-test';
      
      // Generar algunas keys
      const key1 = generateEquiposKey(contextId);
      const key2 = generateServiciosKey(contextId);
      
      // Limpiar cache
      clearKeyCache();
      
      // Generar nuevas keys después de limpiar
      const newKey1 = generateEquiposKey(contextId);
      const newKey2 = generateServiciosKey(contextId);
      
      // ✅ Las nuevas keys deben ser diferentes (cache limpiado)
      expect(newKey1).not.toBe(key1);
      expect(newKey2).not.toBe(key2);
    });
  });
});