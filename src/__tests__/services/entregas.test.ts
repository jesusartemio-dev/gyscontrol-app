// ===================================================
// 📁 Archivo: entregas.test.ts
// 📌 Tests para el servicio de entregas
// 🧠 Uso: Verificar funcionalidad del servicio de entregas
// ✍️ Autor: GYS Team + IA
// 🗕️ Última actualización: 2025-01-17
// ===================================================

import {
  registrarEntrega,
  actualizarEntrega,
  obtenerHistorialEntregas,
  obtenerEstadoEntrega,
  validarTransicionEstado,
  calcularProgresoEntrega,
  determinarEstadoPorCantidad
} from '@/lib/services/entregas';
import { EstadoEntregaItem } from '@/types/modelos';
import type { EntregaItemPayload } from '@/lib/validators/trazabilidad';

// 🎭 Mock del logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// 🎭 Mock de fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Servicio de Entregas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('registrarEntrega', () => {
    const mockEntregaData: EntregaItemPayload = {
      pedidoEquipoItemId: 'item-123',
      estadoEntrega: EstadoEntregaItem.EN_PROCESO,
      cantidadAtendida: 5,
      fechaEntregaReal: new Date('2025-01-17'),
      observacionesEntrega: 'Entrega parcial',
      comentarioLogistica: 'Todo en orden'
    };

    it('debe registrar una entrega exitosamente', async () => {
      // 🎯 Arrange
      const mockResponse = {
        id: 'item-123',
        ...mockEntregaData,
        updatedAt: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // 🎬 Act
      const resultado = await registrarEntrega(mockEntregaData);

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pedido-equipo-item/item-123/entrega',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockEntregaData)
        })
      );
      expect(resultado).toEqual(mockResponse);
    });

    it('debe manejar errores de la API', async () => {
      // 🎯 Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Datos inválidos' })
      });

      // 🎬 Act & Assert
      await expect(registrarEntrega(mockEntregaData))
        .rejects
        .toThrow('Datos inválidos');
    });

    it('debe manejar errores de red', async () => {
      // 🎯 Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // 🎬 Act & Assert
      await expect(registrarEntrega(mockEntregaData))
        .rejects
        .toThrow('Network error');
    });
  });

  describe('actualizarEntrega', () => {
    const mockUpdateData: Partial<EntregaItemPayload> = {
      estadoEntrega: EstadoEntregaItem.ENTREGADO,
      cantidadAtendida: 10,
      observacionesEntrega: 'Entrega completa'
    };

    it('debe actualizar una entrega exitosamente', async () => {
      // 🎯 Arrange
      const mockResponse = {
        id: 'item-123',
        ...mockUpdateData,
        updatedAt: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // 🎬 Act
      const resultado = await actualizarEntrega('item-123', mockUpdateData);

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pedido-equipo-item/item-123/entrega',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockUpdateData)
        })
      );
      expect(resultado).toEqual(mockResponse);
    });
  });

  describe('obtenerHistorialEntregas', () => {
    it('debe obtener el historial de entregas', async () => {
      // 🎯 Arrange
      const mockHistorial = {
        item: {
          id: 'item-123',
          codigo: 'EQ-001',
          descripcion: 'Equipo de prueba'
        },
        historial: [
          {
            id: 'evento-1',
            estado: EstadoEntregaItem.EN_PROCESO,
            descripcion: 'Entrega iniciada',
            fecha: new Date().toISOString()
          }
        ],
        estadisticas: {
          totalEventos: 1,
          ultimoEstado: EstadoEntregaItem.EN_PROCESO
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistorial
      });

      // 🎬 Act
      const resultado = await obtenerHistorialEntregas('item-123');

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pedido-equipo-item/item-123/entregas',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      expect(resultado).toEqual(mockHistorial);
    });
  });

  describe('obtenerEstadoEntrega', () => {
    it('debe obtener el estado actual de entrega', async () => {
      // 🎯 Arrange
      const mockEstado = {
        id: 'item-123',
        estadoEntrega: EstadoEntregaItem.PARCIAL,
        cantidadAtendida: 5,
        fechaEntregaReal: new Date().toISOString(),
        observacionesEntrega: 'Entrega parcial'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstado
      });

      // 🎬 Act
      const resultado = await obtenerEstadoEntrega('item-123');

      // 🔍 Assert
      expect(resultado.estadoEntrega).toBe(EstadoEntregaItem.PARCIAL);
      expect(resultado.cantidadAtendida).toBe(5);
      expect(resultado.fechaEntregaReal).toBeInstanceOf(Date);
    });
  });

  describe('validarTransicionEstado', () => {
    it('debe validar transiciones permitidas', () => {
      // ✅ Transiciones válidas
      expect(validarTransicionEstado(
        EstadoEntregaItem.PENDIENTE, 
        EstadoEntregaItem.EN_PROCESO
      )).toBe(true);
      
      expect(validarTransicionEstado(
        EstadoEntregaItem.EN_PROCESO, 
        EstadoEntregaItem.ENTREGADO
      )).toBe(true);
      
      expect(validarTransicionEstado(
        EstadoEntregaItem.PARCIAL, 
        EstadoEntregaItem.ENTREGADO
      )).toBe(true);
    });

    it('debe rechazar transiciones inválidas', () => {
      // ❌ Transiciones inválidas
      expect(validarTransicionEstado(
        EstadoEntregaItem.ENTREGADO, 
        EstadoEntregaItem.PENDIENTE
      )).toBe(false);
      
      expect(validarTransicionEstado(
        EstadoEntregaItem.CANCELADO, 
        EstadoEntregaItem.EN_PROCESO
      )).toBe(false);
    });
  });

  describe('calcularProgresoEntrega', () => {
    it('debe calcular el progreso correctamente', () => {
      expect(calcularProgresoEntrega(10, 5)).toBe(50);
      expect(calcularProgresoEntrega(10, 10)).toBe(100);
      expect(calcularProgresoEntrega(10, 0)).toBe(0);
      expect(calcularProgresoEntrega(0, 5)).toBe(0); // División por cero
    });

    it('debe limitar el progreso al 100%', () => {
      expect(calcularProgresoEntrega(10, 15)).toBe(100);
    });
  });

  describe('determinarEstadoPorCantidad', () => {
    it('debe determinar el estado basado en cantidades', () => {
      expect(determinarEstadoPorCantidad(10, 0)).toBe(EstadoEntregaItem.PENDIENTE);
      expect(determinarEstadoPorCantidad(10, 5)).toBe(EstadoEntregaItem.PARCIAL);
      expect(determinarEstadoPorCantidad(10, 10)).toBe(EstadoEntregaItem.ENTREGADO);
      expect(determinarEstadoPorCantidad(10, 15)).toBe(EstadoEntregaItem.ENTREGADO);
    });
  });
});
