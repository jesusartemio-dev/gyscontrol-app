/**
 * ===================================================
 * TESTS: Servicio de Trazabilidad
 * ===================================================
 * 
 * Tests unitarios para el servicio de trazabilidad que maneja
 * la obtención y gestión de datos de seguimiento de pedidos.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

// 📡 Importaciones
import {
  obtenerTrazabilidad,
  obtenerMetricasEntrega,
  obtenerDatosGraficoProgreso,
  obtenerEventosTrazabilidad,
  crearEventoTrazabilidad,
  actualizarEventoTrazabilidad
} from '@/lib/services/trazabilidad';
import type {
  TrazabilidadEvent,
  MetricasEntregaData,
  GraficoProgresoData
} from '@/types/modelos';

// 🎭 Mock fetch globally
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    data: {
      id: 'TRZ-001',
      entidadId: 'PED-001',
      entidadTipo: 'PEDIDO',
      eventos: [
        {
          id: 'EVT-001',
          tipo: 'CREACION',
          descripcion: 'Pedido creado',
          fecha: new Date('2024-01-15T10:00:00Z'),
          usuario: 'admin@gys.com',
          metadata: { test: 'data' }
        }
      ]
    }
  })
});

// 🎭 Mock console to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Trazabilidad Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('obtenerTrazabilidad', () => {
    it('should fetch trazabilidad data successfully', async () => {
      const result = await obtenerTrazabilidad('PED-001', 'PEDIDO');
      
      expect(fetch).toHaveBeenCalledWith('/api/trazabilidad?entidadId=PED-001&entidadTipo=PEDIDO', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toHaveProperty('eventos');
      expect(Array.isArray(result.eventos)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(obtenerTrazabilidad('PED-001', 'PEDIDO'))
        .rejects.toThrow('Error al obtener trazabilidad');
    });
  });

  describe('obtenerMetricasEntrega', () => {
    it('should fetch metricas data successfully', async () => {
      const mockMetricas: MetricasEntregaData = {
        totalPedidos: 10,
        pedidosEntregados: 8,
        pedidosPendientes: 2,
        pedidosRetrasados: 1,
        tiempoPromedioEntrega: 15.5,
        eficienciaEntrega: 80,
        valorTotalEntregado: 50000,
        valorPendiente: 12000,
        tendenciaEntregas: 'up'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockMetricas })
      });

      const result = await obtenerMetricasEntrega('2024-01');
      
      expect(fetch).toHaveBeenCalledWith('/api/trazabilidad/metricas?periodo=2024-01', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockMetricas);
    });
  });

  describe('obtenerDatosGraficoProgreso', () => {
    it('should fetch grafico data successfully', async () => {
      const mockGrafico: GraficoProgresoData = {
        tipo: 'line',
        titulo: 'Progreso de Entregas',
        datos: [
          { fecha: '2024-01-01', valor: 10, meta: 12 },
          { fecha: '2024-01-02', valor: 15, meta: 12 }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGrafico })
      });

      const result = await obtenerDatosGraficoProgreso('PED-001', 'mensual');
      
      expect(fetch).toHaveBeenCalledWith('/api/trazabilidad/grafico?entidadId=PED-001&periodo=mensual', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockGrafico);
    });
  });

  describe('crearEventoTrazabilidad', () => {
    it('should create evento successfully', async () => {
      const nuevoEvento = {
        entidadId: 'PED-001',
        entidadTipo: 'PEDIDO' as const,
        tipo: 'ACTUALIZACION' as const,
        descripcion: 'Estado actualizado',
        metadata: { campo: 'estado', valor: 'EN_PROCESO' }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'EVT-002', ...nuevoEvento } })
      });

      const result = await crearEventoTrazabilidad(nuevoEvento);
      
      expect(fetch).toHaveBeenCalledWith('/api/trazabilidad/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEvento)
      });
      expect(result).toHaveProperty('id');
    });
  });
});
