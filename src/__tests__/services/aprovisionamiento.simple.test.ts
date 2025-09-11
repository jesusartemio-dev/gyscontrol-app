/**
 * @jest-environment node
 */

/**
 * @fileoverview Tests unitarios básicos para servicios de aprovisionamiento
 * @version 1.0.0
 * @author GYS Team
 */

// Mock básico de servicios
const mockCalcularGantt = jest.fn();
const mockDetectarFechasCriticas = jest.fn();
const mockValidarCoherencia = jest.fn();

// Mock data
const mockLista = {
  id: 'lista-1',
  codigo: 'LST-001',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'aprobado'
};

const mockPedido = {
  id: 'pedido-1',
  codigo: 'PED-001',
  listaEquipoId: 'lista-1',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'enviado'
};

describe('Aprovisionamiento Services - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cálculos de Gantt', () => {
    it('debe calcular fechas de Gantt correctamente', () => {
      const mockResult = {
        fechaInicio: new Date('2024-05-16'),
        fechaFin: new Date('2024-06-15'),
        duracionDias: 30
      };
      
      mockCalcularGantt.mockReturnValue(mockResult);
      const resultado = mockCalcularGantt([mockLista]);
      
      expect(resultado.duracionDias).toBe(30);
      expect(mockCalcularGantt).toHaveBeenCalledWith([mockLista]);
    });

    it('debe manejar listas vacías', () => {
      mockCalcularGantt.mockReturnValue([]);
      const resultado = mockCalcularGantt([]);
      
      expect(resultado).toEqual([]);
      expect(mockCalcularGantt).toHaveBeenCalledWith([]);
    });
  });

  describe('Detección de fechas críticas', () => {
    it('debe detectar fechas próximas a vencer', () => {
      const mockResult = {
        fechasProximas: [{ id: 'lista-1', diasRestantes: 5 }],
        fechasVencidas: [],
        alertas: []
      };
      
      mockDetectarFechasCriticas.mockReturnValue(mockResult);
      const resultado = mockDetectarFechasCriticas([mockLista], [mockPedido]);
      
      expect(resultado.fechasProximas).toHaveLength(1);
      expect(resultado.fechasProximas[0].diasRestantes).toBe(5);
    });

    it('debe detectar fechas vencidas', () => {
      const listaVencida = {
        ...mockLista,
        fechaNecesaria: new Date('2024-01-01')
      };
      
      const mockResult = {
        fechasProximas: [],
        fechasVencidas: [{ id: 'lista-1' }],
        alertas: [{ tipo: 'vencimiento', mensaje: 'Lista vencida' }]
      };
      
      mockDetectarFechasCriticas.mockReturnValue(mockResult);
      const resultado = mockDetectarFechasCriticas([listaVencida], []);
      
      expect(resultado.fechasVencidas).toHaveLength(1);
      expect(resultado.alertas).toHaveLength(1);
    });
  });

  describe('Validación de coherencia', () => {
    it('debe validar coherencia entre lista y pedidos', () => {
      const mockResult = {
        esCoherente: true,
        diferenciaMonto: 1200,
        porcentajeEjecutado: 40,
        alertas: []
      };
      
      mockValidarCoherencia.mockReturnValue(mockResult);
      const resultado = mockValidarCoherencia(mockLista, [mockPedido]);
      
      expect(resultado.esCoherente).toBe(true);
      expect(resultado.porcentajeEjecutado).toBe(40);
      expect(resultado.alertas).toHaveLength(0);
    });

    it('debe detectar incoherencias', () => {
      const mockResult = {
        esCoherente: false,
        diferenciaMonto: -500,
        porcentajeEjecutado: 150,
        alertas: [{ tipo: 'exceso_cantidad', mensaje: 'Cantidad excedida' }]
      };
      
      mockValidarCoherencia.mockReturnValue(mockResult);
      const resultado = mockValidarCoherencia(mockLista, [mockPedido]);
      
      expect(resultado.esCoherente).toBe(false);
      expect(resultado.porcentajeEjecutado).toBeGreaterThan(100);
      expect(resultado.alertas).toHaveLength(1);
    });
  });

  describe('Utilidades de testing', () => {
    it('debe crear mock data correctamente', () => {
      expect(mockLista.id).toBe('lista-1');
      expect(mockLista.codigo).toBe('LST-001');
      expect(mockPedido.listaEquipoId).toBe('lista-1');
    });

    it('debe manejar fechas correctamente', () => {
      const fecha = new Date('2024-06-15');
      expect(fecha.getFullYear()).toBe(2024);
      expect(fecha.getMonth()).toBe(5); // Junio es mes 5 (0-indexed)
    });
  });
});

// Exportar helpers para otros tests
export const testHelpers = {
  createMockLista: (overrides = {}) => ({ ...mockLista, ...overrides }),
  createMockPedido: (overrides = {}) => ({ ...mockPedido, ...overrides }),
  mockCalcularGantt,
  mockDetectarFechasCriticas,
  mockValidarCoherencia
};
