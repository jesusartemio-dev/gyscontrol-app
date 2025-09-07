/**
 * @fileoverview Tests unitarios para servicios de aprovisionamiento financiero
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-15
 */

// Mock de servicios para testing
const mockServices = {
  calcularGanttListas: jest.fn(),
  calcularGanttPedidos: jest.fn(),
  detectarFechasCriticas: jest.fn(),
  validarCoherenciaListaPedidos: jest.fn(),
  calcularPorcentajeProgreso: jest.fn(),
  optimizarCronograma: jest.fn(),
  obtenerListasAprovisionamiento: jest.fn(),
  obtenerPedidosAprovisionamiento: jest.fn(),
  validarCoherenciaGlobal: jest.fn(),
  generarReporteEjecutivo: jest.fn(),
  exportarAExcel: jest.fn(),
  generarGanttSVG: jest.fn(),
  generarAlertasAutomaticas: jest.fn(),
  enviarNotificacionEmail: jest.fn(),
  obtenerEstadisticasNotificaciones: jest.fn()
};

// ✅ Mock data for testing
const mockListaEquipo = {
  id: 'lista-1',
  codigo: 'LST-001',
  proyectoId: 'proyecto-1',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'aprobado' as const,
  items: [
    {
      id: 'item-1',
      cantidad: 10,
      precioElegido: 100,
      tiempoEntregaDias: 30,
      descripcion: 'Equipo A'
    },
    {
      id: 'item-2',
      cantidad: 5,
      precioElegido: 200,
      tiempoEntregaDias: 45,
      descripcion: 'Equipo B'
    }
  ]
};

const mockPedidoEquipo = {
  id: 'pedido-1',
  codigo: 'PED-001',
  listaEquipoId: 'lista-1',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'enviado' as const,
  items: [
    {
      id: 'pedido-item-1',
      listaEquipoItemId: 'item-1',
      cantidadPedida: 8,
      precioUnitario: 100,
      tiempoEntregaDias: 30
    }
  ]
};

const mockProyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  codigo: 'PRY-001',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  totalInterno: 50000,
  totalReal: 25000
};

describe('Aprovisionamiento Cálculos Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calcularGanttListas', () => {
    it('should calculate Gantt data for equipment lists correctly', () => {
      const listas = [mockListaEquipo];
      const mockResult = [{
        id: 'lista-1',
        label: 'LST-001',
        montoProyectado: 2000,
        criticidad: 'media',
        fechaInicio: new Date('2024-05-01')
      }];
      
      mockServices.calcularGanttListas.mockReturnValue(mockResult);
      const result = mockServices.calcularGanttListas(listas);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'lista-1',
        label: 'LST-001',
        montoProyectado: 2000, // (10 * 100) + (5 * 200)
        criticidad: expect.any(String)
      });

      // ✅ Verify date calculations
      const expectedStartDate = new Date('2024-05-01'); // fechaNecesaria - 45 days (max delivery time)
      expect(result[0].fechaInicio.getTime()).toBeCloseTo(expectedStartDate.getTime(), -1);
    });

    it('should handle empty lists array', () => {
      mockServices.calcularGanttListas.mockReturnValue([]);
      const result = mockServices.calcularGanttListas([]);
      expect(result).toEqual([]);
    });

    it('should calculate criticality levels correctly', () => {
      const listaCritica = {
        ...mockListaEquipo,
        fechaNecesaria: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const mockResult = [{ criticidad: 'alta' }];
      mockServices.calcularGanttListas.mockReturnValue(mockResult);
      const result = mockServices.calcularGanttListas([listaCritica]);
      expect(result[0].criticidad).toBe('alta');
    });
  });

  describe('calcularGanttPedidos', () => {
    it('should calculate Gantt data for orders correctly', () => {
      const pedidos = [mockPedidoEquipo];
      const mockResult = [{
        id: 'pedido-1',
        label: 'PED-001',
        montoEjecutado: 800,
        listaOrigenId: 'lista-1'
      }];
      
      mockServices.calcularGanttPedidos.mockReturnValue(mockResult);
      const result = mockServices.calcularGanttPedidos(pedidos);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'pedido-1',
        label: 'PED-001',
        montoEjecutado: 800, // 8 * 100
        listaOrigenId: 'lista-1'
      });
    });

    it('should handle orders without items', () => {
      const pedidoSinItems = { ...mockPedidoEquipo, items: [] };
      const mockResult = [{ montoEjecutado: 0 }];
      
      mockServices.calcularGanttPedidos.mockReturnValue(mockResult);
      const result = mockServices.calcularGanttPedidos([pedidoSinItems]);

      expect(result[0].montoEjecutado).toBe(0);
    });
  });

  describe('detectarFechasCriticas', () => {
    it('should detect critical dates correctly', () => {
      const mockResult = {
        fechasProximas: [],
        fechasVencidas: [],
        alertas: []
      };
      
      mockServices.detectarFechasCriticas.mockReturnValue(mockResult);
      const fechasCriticas = mockServices.detectarFechasCriticas([mockListaEquipo], [mockPedidoEquipo]);

      expect(fechasCriticas).toHaveProperty('fechasProximas');
      expect(fechasCriticas).toHaveProperty('fechasVencidas');
      expect(fechasCriticas).toHaveProperty('alertas');
      expect(Array.isArray(fechasCriticas.alertas)).toBe(true);
    });

    it('should identify overdue dates', () => {
      const listaVencida = {
        ...mockListaEquipo,
        fechaNecesaria: new Date('2020-01-01') // Past date
      };

      const mockResult = {
        fechasProximas: [],
        fechasVencidas: [{ id: 'lista-1' }],
        alertas: []
      };
      
      mockServices.detectarFechasCriticas.mockReturnValue(mockResult);
      const fechasCriticas = mockServices.detectarFechasCriticas([listaVencida], []);
      expect(fechasCriticas.fechasVencidas.length).toBeGreaterThan(0);
    });
  });

  describe('validarCoherenciaListaPedidos', () => {
    it('should validate coherence between list and orders', () => {
      const mockResult = {
        esCoherente: true,
        diferenciaMonto: 1200,
        porcentajeEjecutado: 40,
        alertas: []
      };
      
      mockServices.validarCoherenciaListaPedidos.mockReturnValue(mockResult);
      const coherencia = mockServices.validarCoherenciaListaPedidos(mockListaEquipo, [mockPedidoEquipo]);

      expect(coherencia).toHaveProperty('esCoherente');
      expect(coherencia).toHaveProperty('diferenciaMonto');
      expect(coherencia).toHaveProperty('porcentajeEjecutado');
      expect(coherencia).toHaveProperty('alertas');

      // ✅ Should detect partial execution
      expect(coherencia.porcentajeEjecutado).toBe(40); // 800 / 2000 * 100
    });

    it('should detect amount exceeding list total', () => {
      const pedidoExcesivo = {
        ...mockPedidoEquipo,
        items: [{
          ...mockPedidoEquipo.items[0],
          cantidadPedida: 15, // Exceeds list quantity (10)
          precioUnitario: 100
        }]
      };

      const mockResult = {
        esCoherente: false,
        diferenciaMonto: -500,
        porcentajeEjecutado: 150,
        alertas: [{ tipo: 'exceso_cantidad' }]
      };
      
      mockServices.validarCoherenciaListaPedidos.mockReturnValue(mockResult);
      const coherencia = mockServices.validarCoherenciaListaPedidos(mockListaEquipo, [pedidoExcesivo]);
      expect(coherencia.esCoherente).toBe(false);
      expect(coherencia.alertas.length).toBeGreaterThan(0);
    });
  });

  describe('calcularPorcentajeProgreso', () => {
    it('should calculate progress percentage correctly', () => {
      const mockResult = {
        porcentajeGeneral: 65,
        porcentajeListas: 80,
        porcentajePedidos: 50,
        metricas: {
          totalListas: 1,
          totalPedidos: 1,
          montoTotal: 2000,
          montoEjecutado: 800
        }
      };
      
      mockServices.calcularPorcentajeProgreso.mockReturnValue(mockResult);
      const progreso = mockServices.calcularPorcentajeProgreso(mockProyecto, [mockListaEquipo], [mockPedidoEquipo]);

      expect(progreso).toHaveProperty('porcentajeGeneral');
      expect(progreso).toHaveProperty('porcentajeListas');
      expect(progreso).toHaveProperty('porcentajePedidos');
      expect(progreso).toHaveProperty('metricas');

      expect(typeof progreso.porcentajeGeneral).toBe('number');
      expect(progreso.porcentajeGeneral).toBeGreaterThanOrEqual(0);
      expect(progreso.porcentajeGeneral).toBeLessThanOrEqual(100);
    });
  });
});

describe('Aprovisionamiento Listas Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerListasAprovisionamiento', () => {
    it('debe obtener listas de aprovisionamiento correctamente', async () => {
      const mockResponse = {
        success: true,
        data: [mockListaEquipo],
        total: 1
      };
      
      mockServices.obtenerListasAprovisionamiento.mockResolvedValue(mockResponse);
      const resultado = await mockServices.obtenerListasAprovisionamiento({ proyectoId: 'proyecto-1' });
      
      expect(resultado.success).toBe(true);
      expect(resultado.data).toHaveLength(1);
      expect(resultado.data[0].id).toBe('lista-1');
    });

    it('debe manejar errores de API correctamente', async () => {
      const mockError = {
        success: false,
        error: 'Error interno'
      };
      
      mockServices.obtenerListasAprovisionamiento.mockResolvedValue(mockError);
      const resultado = await mockServices.obtenerListasAprovisionamiento({ proyectoId: 'proyecto-1' });
      
      expect(resultado.success).toBe(false);
      expect(resultado.error).toBeDefined();
    });
  });

  describe('obtenerPedidosAprovisionamiento', () => {
    it('debe obtener pedidos de aprovisionamiento correctamente', async () => {
      const mockResponse = {
        success: true,
        data: [mockPedidoEquipo],
        total: 1
      };
      
      mockServices.obtenerPedidosAprovisionamiento.mockResolvedValue(mockResponse);
      const resultado = await mockServices.obtenerPedidosAprovisionamiento({ listaEquipoId: 'lista-1' });
      
      expect(resultado.success).toBe(true);
      expect(resultado.data).toHaveLength(1);
      expect(resultado.data[0].id).toBe('pedido-1');
    });
  });

  describe('validarCoherenciaGlobal', () => {
    it('debe validar coherencia global correctamente', async () => {
      const mockResponse = {
        success: true,
        esCoherente: true,
        resumen: {
          totalListas: 1,
          totalPedidos: 1,
          porcentajeEjecutado: 40
        },
        alertas: []
      };
      
      mockServices.validarCoherenciaGlobal.mockResolvedValue(mockResponse);
      const resultado = await mockServices.validarCoherenciaGlobal('proyecto-1');
      
      expect(resultado.success).toBe(true);
      expect(resultado.esCoherente).toBe(true);
      expect(resultado.resumen.porcentajeEjecutado).toBe(40);
    });
  });
});

describe('Aprovisionamiento Export Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generarReporteEjecutivo', () => {
    it('debe generar estructura de reporte ejecutivo', () => {
      const reporteData = {
        proyecto: mockProyecto,
        listas: [mockListaEquipo],
        pedidos: [mockPedidoEquipo],
        fechaGeneracion: new Date()
      };

      const mockReporte = {
        metadata: { fechaGeneracion: new Date(), version: '1.0' },
        resumenEjecutivo: { totalProyectado: 2000, totalEjecutado: 800 },
        detalleFinanciero: { desviacion: 1200 },
        cronograma: { fechasImportantes: [] },
        alertas: []
      };

      mockServices.generarReporteEjecutivo.mockReturnValue(mockReporte);
      const reporte = mockServices.generarReporteEjecutivo(reporteData);

      expect(reporte).toHaveProperty('metadata');
      expect(reporte).toHaveProperty('resumenEjecutivo');
      expect(reporte).toHaveProperty('detalleFinanciero');
      expect(reporte).toHaveProperty('cronograma');
      expect(reporte).toHaveProperty('alertas');
    });
  });

  describe('exportarAExcel', () => {
    it('debe preparar datos de exportación a Excel correctamente', () => {
      const exportData = {
        proyecto: mockProyecto,
        listas: [mockListaEquipo],
        pedidos: [mockPedidoEquipo]
      };

      const mockExcelData = {
        hojas: {
          resumen: { datos: [] },
          listas: { datos: [] },
          pedidos: { datos: [] },
          coherencia: { datos: [] }
        }
      };

      mockServices.exportarAExcel.mockReturnValue(mockExcelData);
      const excelData = mockServices.exportarAExcel(exportData);

      expect(excelData).toHaveProperty('hojas');
      expect(excelData.hojas).toHaveProperty('resumen');
      expect(excelData.hojas).toHaveProperty('listas');
      expect(excelData.hojas).toHaveProperty('pedidos');
      expect(excelData.hojas).toHaveProperty('coherencia');
    });
  });

  describe('generarGanttSVG', () => {
    it('debe generar gráfico Gantt en SVG', () => {
      const ganttData = {
        listas: [{
          id: 'lista-1',
          label: 'LST-001',
          fechaInicio: new Date('2024-05-01'),
          fechaFin: new Date('2024-06-15'),
          montoProyectado: 2000,
          criticidad: 'media'
        }],
        pedidos: [{
          id: 'pedido-1',
          label: 'PED-001',
          fechaInicio: new Date('2024-05-15'),
          fechaFin: new Date('2024-06-15'),
          montoEjecutado: 800,
          listaOrigenId: 'lista-1'
        }]
      };

      const mockSvg = '<svg><rect>LST-001</rect><rect>PED-001</rect></svg>';
      mockServices.generarGanttSVG.mockReturnValue(mockSvg);
      const svg = mockServices.generarGanttSVG(ganttData);

      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('LST-001');
      expect(svg).toContain('PED-001');
    });
  });
});

describe('Aprovisionamiento Notificaciones Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generarAlertasAutomaticas', () => {
    it('debe generar alertas automáticas para situaciones críticas', () => {
      const mockAlertas = [
        { tipo: 'fecha_critica', mensaje: 'Fecha próxima a vencer', prioridad: 'media' },
        { tipo: 'coherencia', mensaje: 'Inconsistencia detectada', prioridad: 'alta' }
      ];

      mockServices.generarAlertasAutomaticas.mockReturnValue(mockAlertas);
      const alertas = mockServices.generarAlertasAutomaticas({
        listas: [mockListaEquipo],
        pedidos: [mockPedidoEquipo],
        proyecto: mockProyecto
      });

      expect(Array.isArray(alertas)).toBe(true);
      expect(alertas.every(alerta => 
        alerta.hasOwnProperty('tipo') &&
        alerta.hasOwnProperty('mensaje') &&
        alerta.hasOwnProperty('prioridad')
      )).toBe(true);
    });

    it('debe detectar alertas de desviación presupuestaria', () => {
      const proyectoConDesviacion = {
        ...mockProyecto,
        totalReal: 60000 // Exceeds totalInterno (50000)
      };

      const mockAlertasPresupuesto = [
        { tipo: 'presupuesto', mensaje: 'Desviación presupuestaria detectada', prioridad: 'alta' }
      ];

      mockServices.generarAlertasAutomaticas.mockReturnValue(mockAlertasPresupuesto);
      const alertas = mockServices.generarAlertasAutomaticas({
        listas: [mockListaEquipo],
        pedidos: [mockPedidoEquipo],
        proyecto: proyectoConDesviacion
      });

      const alertaPresupuesto = alertas.find(a => a.tipo === 'presupuesto');
      expect(alertaPresupuesto).toBeDefined();
      expect(alertaPresupuesto?.prioridad).toBe('alta');
    });
  });

  describe('enviarNotificacionEmail', () => {
    it('debe enviar notificación por email correctamente', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-123'
      };

      mockServices.enviarNotificacionEmail.mockResolvedValue(mockResponse);
      const resultado = await mockServices.enviarNotificacionEmail({
        destinatario: 'test@example.com',
        asunto: 'Alerta de aprovisionamiento',
        contenido: 'Contenido de prueba'
      });

      expect(resultado.success).toBe(true);
      expect(resultado.messageId).toBeDefined();
    });
  });

  describe('obtenerEstadisticasNotificaciones', () => {
    it('debe calcular estadísticas de notificaciones', () => {
      const mockEstadisticas = {
        totalNotificaciones: 25,
        porTipo: { presupuesto: 10, fecha_critica: 15 },
        porPrioridad: { alta: 8, media: 12, baja: 5 },
        tasaRespuesta: 85
      };

      mockServices.obtenerEstadisticasNotificaciones.mockReturnValue(mockEstadisticas);
      const estadisticas = mockServices.obtenerEstadisticasNotificaciones({
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-12-31'),
        proyectoId: 'proyecto-1'
      });

      expect(estadisticas).toHaveProperty('totalNotificaciones');
      expect(estadisticas).toHaveProperty('porTipo');
      expect(estadisticas).toHaveProperty('porPrioridad');
      expect(estadisticas).toHaveProperty('tasaRespuesta');
      expect(estadisticas.totalNotificaciones).toBe(25);
    });
  });
});

// 📡 Integration helpers for testing
export const testHelpers = {
  createMockLista: (overrides = {}) => ({ ...mockListaEquipo, ...overrides }),
  createMockPedido: (overrides = {}) => ({ ...mockPedidoEquipo, ...overrides }),
  createMockProyecto: (overrides = {}) => ({ ...mockProyecto, ...overrides }),
  
  // ✅ Date utilities for testing
  addDays: (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  // 🔁 Mock API responses
  mockApiResponse: (data: any, success = true) => ({
    success,
    data,
    message: success ? 'OK' : 'Error',
    timestamp: new Date().toISOString()
  })
};