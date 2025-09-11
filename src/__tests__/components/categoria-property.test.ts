/**
 * @fileoverview Test para verificar la propiedad categoria en FiltrosListaEquipo
 * @author TRAE AI Assistant
 * @version 1.0.0
 */

import { FiltrosListaEquipo } from '../../types/aprovisionamiento';
import { EstadoListaEquipo } from '../../types/modelos';

describe('FiltrosListaEquipo - categoria property', () => {
  // ✅ Test 1: Verificar que categoria es opcional
  it('should allow categoria as optional property', () => {
    const filtros: FiltrosListaEquipo = {
      busqueda: 'test'
    };
    
    expect(filtros.categoria).toBeUndefined();
  });

  // ✅ Test 2: Verificar que categoria acepta string
  it('should accept string value for categoria', () => {
    const filtros: FiltrosListaEquipo = {
      busqueda: 'test',
      categoria: 'equipos-electricos'
    };
    
    expect(filtros.categoria).toBe('equipos-electricos');
    expect(typeof filtros.categoria).toBe('string');
  });

  // ✅ Test 3: Verificar que categoria funciona con otros filtros
  it('should work with other filter properties', () => {
    const filtros: FiltrosListaEquipo = {
      busqueda: 'bomba',
      categoria: 'equipos-mecanicos',
      estado: 'aprobado' as EstadoListaEquipo,
      proyectoId: 'proyecto-123',
      montoMinimo: 1000,
      montoMaximo: 5000
    };
    
    expect(filtros.categoria).toBe('equipos-mecanicos');
    expect(filtros.busqueda).toBe('bomba');
    expect(filtros.estado).toBe('aprobado');
    expect(filtros.proyectoId).toBe('proyecto-123');
    expect(filtros.montoMinimo).toBe(1000);
    expect(filtros.montoMaximo).toBe(5000);
  });

  // ✅ Test 4: Verificar que categoria puede ser undefined
  it('should handle undefined categoria', () => {
    const filtros: FiltrosListaEquipo = {
      busqueda: 'test',
      categoria: undefined
    };
    
    expect(filtros.categoria).toBeUndefined();
  });

  // ✅ Test 5: Verificar que categoria puede ser string vacío
  it('should handle empty string categoria', () => {
    const filtros: FiltrosListaEquipo = {
      busqueda: 'test',
      categoria: ''
    };
    
    expect(filtros.categoria).toBe('');
    expect(typeof filtros.categoria).toBe('string');
  });

  // ✅ Test 6: Verificar compatibilidad con TypeScript
  it('should be TypeScript compliant', () => {
    // Este test verifica que el tipo se compile correctamente
    const createFiltros = (categoria?: string): FiltrosListaEquipo => ({
      busqueda: 'test',
      categoria
    });
    
    const filtrosConCategoria = createFiltros('instrumentos');
    const filtrosSinCategoria = createFiltros();
    
    expect(filtrosConCategoria.categoria).toBe('instrumentos');
    expect(filtrosSinCategoria.categoria).toBeUndefined();
  });

  // ✅ Test 7: Verificar que categoria funciona en contexto de filtrado
  it('should work in filtering context', () => {
    const filtrosBase: FiltrosListaEquipo = {
      busqueda: 'motor'
    };
    
    // Simular actualización de filtros
    const filtrosActualizados: FiltrosListaEquipo = {
      ...filtrosBase,
      categoria: 'equipos-rotativos'
    };
    
    expect(filtrosActualizados.busqueda).toBe('motor');
    expect(filtrosActualizados.categoria).toBe('equipos-rotativos');
  });
});
