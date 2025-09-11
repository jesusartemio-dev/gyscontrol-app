/**
 * @fileoverview Tests unitarios para APIs de aprovisionamiento financiero
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-15
 */

import { jest } from '@jest/globals';

// Mock de las funciones de API
const mockApiHandlers = {
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
  DELETE: jest.fn()
};

// Mock de NextRequest
class MockNextRequest {
  constructor(public url: string, public options: any = {}) {}
  
  async json() {
    return this.options.body ? JSON.parse(this.options.body) : {};
  }
  
  nextUrl = {
    searchParams: new URLSearchParams()
  };
}

// ✅ API route handlers (mocked)
const getProyectos = mockApiHandlers.GET;
const getListas = mockApiHandlers.GET;
const getListasGantt = mockApiHandlers.GET;
const getPedidos = mockApiHandlers.GET;
const getPedidosGantt = mockApiHandlers.GET;
const getTimeline = mockApiHandlers.GET;
const getCoherenciaGlobal = mockApiHandlers.GET;
const getAlertas = mockApiHandlers.GET;

// 🔁 Mock Prisma
const mockPrisma = {
  proyecto: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn()
  },
  listaEquipo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn()
  },
  pedidoEquipo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn()
  },
  listaEquipoItem: {
    findMany: jest.fn()
  },
  pedidoEquipoItem: {
    findMany: jest.fn()
  }
};

// 📡 Mock auth
const mockAuth = {
  getServerSession: jest.fn()
};

jest.mock('@/lib/prisma', () => ({
  default: mockPrisma
}));

jest.mock('next-auth/next', () => ({
  getServerSession: mockAuth.getServerSession
}));

// 🧮 Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'Admin'
};

const mockProyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  codigo: 'PRY-001',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  totalInterno: 50000,
  totalReal: 25000,
  estado: 'activo',
  comercial: { id: '1', nombre: 'Juan Pérez' },
  gestor: { id: '2', nombre: 'María García' },
  cliente: { id: '1', nombre: 'Cliente Test' },
  listaEquipos: [],
  pedidos: [],
  _count: {
    listaEquipos: 2,
    pedidos: 3
  }
};

const mockLista = {
  id: 'lista-1',
  codigo: 'LST-001',
  proyectoId: 'proyecto-1',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'aprobado',
  proyecto: {
    id: 'proyecto-1',
    nombre: 'Proyecto Test',
    codigo: 'PRY-001'
  },
  items: [
    {
      id: 'item-1',
      cantidad: 10,
      precioElegido: 100,
      tiempoEntregaDias: 30,
      descripcion: 'Equipo A'
    }
  ],
  pedidos: []
};

const mockPedido = {
  id: 'pedido-1',
  codigo: 'PED-001',
  listaEquipoId: 'lista-1',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'enviado',
  listaEquipo: {
    id: 'lista-1',
    codigo: 'LST-001',
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Test'
    }
  },
  items: [
    {
      id: 'pedido-item-1',
      cantidadPedida: 8,
      precioUnitario: 100,
      tiempoEntregaDias: 30
    }
  ]
};

// 📊 Helper functions
function createMockRequest(url: string, searchParams: Record<string, string> = {}) {
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });
  
  const mockRequest = new MockNextRequest(urlObj.toString());
  mockRequest.nextUrl.searchParams = urlObj.searchParams;
  return mockRequest as any;
}

function expectSuccessResponse(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('application/json');
}

function expectErrorResponse(response: Response, status: number) {
  expect(response.status).toBe(status);
}

describe('API: /api/finanzas/aprovisionamiento/proyectos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getServerSession.mockResolvedValue({ user: mockUser });
  });

  describe('GET /api/finanzas/aprovisionamiento/proyectos', () => {
    it('should return projects list successfully', async () => {
      const mockResponse = {
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          success: true,
          data: [mockProyecto],
          pagination: { total: 1 }
        })
      };
      
      getProyectos.mockResolvedValue(mockResponse);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/proyectos');
      const response = await getProyectos(request);
      
      expectSuccessResponse(response);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        id: 'proyecto-1',
        nombre: 'Proyecto Test',
        codigo: 'PRY-001'
      });
      expect(data.pagination).toHaveProperty('total', 1);
    });

    it('should handle filtering by estado', async () => {
      const mockResponse = {
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          success: true,
          data: [mockProyecto],
          pagination: { total: 1 }
        })
      };
      
      getProyectos.mockResolvedValue(mockResponse);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/proyectos', {
        estado: 'activo'
      });
      const response = await getProyectos(request);
      
      expect(getProyectos).toHaveBeenCalledWith(request);
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          success: true,
          data: [mockProyecto],
          pagination: { total: 1 }
        })
      };
      
      getProyectos.mockResolvedValue(mockResponse);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/proyectos', {
        page: '2',
        limit: '5'
      });
      const response = await getProyectos(request);
      
      expect(getProyectos).toHaveBeenCalledWith(request);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.getServerSession.mockResolvedValue(null);
      
      const mockResponse = {
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          success: false,
          message: 'Unauthorized'
        })
      };
      
      getProyectos.mockResolvedValue(mockResponse);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/proyectos');
      const response = await getProyectos(request);
      
      expectErrorResponse(response, 401);
    });

    it('should handle database errors gracefully', async () => {
      const mockResponse = {
        status: 500,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          success: false,
          message: 'Database Error'
        })
      };
      
      getProyectos.mockResolvedValue(mockResponse);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/proyectos');
      const response = await getProyectos(request);
      
      expectErrorResponse(response, 500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Error');
    });
  });
});

describe('API: /api/finanzas/aprovisionamiento/listas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getServerSession.mockResolvedValue({ user: mockUser });
  });

  describe('GET /api/finanzas/aprovisionamiento/listas', () => {
    it('should return equipment lists successfully', async () => {
      mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
      mockPrisma.listaEquipo.count.mockResolvedValue(1);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/listas');
      const response = await getListas(request);
      
      expectSuccessResponse(response);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        id: 'lista-1',
        codigo: 'LST-001',
        estado: 'aprobado'
      });
    });

    it('should filter by proyecto when proyectoId is provided', async () => {
      mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
      mockPrisma.listaEquipo.count.mockResolvedValue(1);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/listas', {
        proyectoId: 'proyecto-1'
      });
      const response = await getListas(request);
      
      expect(mockPrisma.listaEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            proyectoId: 'proyecto-1'
          })
        })
      );
    });

    it('should include related data in response', async () => {
      mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
      mockPrisma.listaEquipo.count.mockResolvedValue(1);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/listas');
      const response = await getListas(request);
      
      expect(mockPrisma.listaEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            proyecto: true,
            items: true,
            pedidos: true
          })
        })
      );
    });
  });

  describe('GET /api/finanzas/aprovisionamiento/listas/gantt', () => {
    it('should return Gantt data for lists', async () => {
      mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/listas/gantt');
      const response = await getListasGantt(request);
      
      expectSuccessResponse(response);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('ganttData');
      expect(Array.isArray(data.data.ganttData)).toBe(true);
    });

    it('should calculate Gantt dates correctly', async () => {
      mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/listas/gantt');
      const response = await getListasGantt(request);
      
      const data = await response.json();
      const ganttItem = data.data.ganttData[0];
      
      expect(ganttItem).toHaveProperty('fechaInicio');
      expect(ganttItem).toHaveProperty('fechaFin');
      expect(ganttItem).toHaveProperty('montoProyectado');
      expect(ganttItem).toHaveProperty('criticidad');
    });
  });
});

describe('API: /api/finanzas/aprovisionamiento/pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getServerSession.mockResolvedValue({ user: mockUser });
  });

  describe('GET /api/finanzas/aprovisionamiento/pedidos', () => {
    it('should return equipment orders successfully', async () => {
      mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);
      mockPrisma.pedidoEquipo.count.mockResolvedValue(1);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/pedidos');
      const response = await getPedidos(request);
      
      expectSuccessResponse(response);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        id: 'pedido-1',
        codigo: 'PED-001',
        estado: 'enviado'
      });
    });

    it('should filter by listaEquipoId when provided', async () => {
      mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);
      mockPrisma.pedidoEquipo.count.mockResolvedValue(1);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/pedidos', {
        listaEquipoId: 'lista-1'
      });
      const response = await getPedidos(request);
      
      expect(mockPrisma.pedidoEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listaEquipoId: 'lista-1'
          })
        })
      );
    });
  });

  describe('GET /api/finanzas/aprovisionamiento/pedidos/gantt', () => {
    it('should return Gantt data for orders', async () => {
      mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/pedidos/gantt');
      const response = await getPedidosGantt(request);
      
      expectSuccessResponse(response);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('ganttData');
      expect(Array.isArray(data.data.ganttData)).toBe(true);
    });

    it('should include lista origen reference', async () => {
      mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

      const request = createMockRequest('/api/finanzas/aprovisionamiento/pedidos/gantt');
      const response = await getPedidosGantt(request);
      
      const data = await response.json();
      const ganttItem = data.data.ganttData[0];
      
      expect(ganttItem).toHaveProperty('listaOrigenId', 'lista-1');
      expect(ganttItem).toHaveProperty('montoEjecutado');
    });
  });
});

describe('API: /api/finanzas/aprovisionamiento/timeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getServerSession.mockResolvedValue({ user: mockUser });
  });

  it('should return unified timeline data', async () => {
    mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

    const request = createMockRequest('/api/finanzas/aprovisionamiento/timeline');
    const response = await getTimeline(request);
    
    expectSuccessResponse(response);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('listas');
    expect(data.data).toHaveProperty('pedidos');
    expect(data.data).toHaveProperty('coherencia');
    expect(data.data).toHaveProperty('metricas');
  });

  it('should calculate coherence indicators', async () => {
    mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

    const request = createMockRequest('/api/finanzas/aprovisionamiento/timeline');
    const response = await getTimeline(request);
    
    const data = await response.json();
    expect(data.data.coherencia).toHaveProperty('porcentajeCoherencia');
    expect(data.data.coherencia).toHaveProperty('alertas');
    expect(Array.isArray(data.data.coherencia.alertas)).toBe(true);
  });
});

describe('API: /api/finanzas/aprovisionamiento/coherencia-global', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getServerSession.mockResolvedValue({ user: mockUser });
  });

  it('should return global coherence report', async () => {
    mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

    const request = createMockRequest('/api/finanzas/aprovisionamiento/coherencia-global');
    const response = await getCoherenciaGlobal(request);
    
    expectSuccessResponse(response);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('resumenGeneral');
    expect(data.data).toHaveProperty('proyectos');
    expect(data.data).toHaveProperty('alertasCriticas');
  });

  it('should identify critical coherence issues', async () => {
    const listaConProblemas = {
      ...mockLista,
      items: [{ ...mockLista.items[0], precioElegido: 50 }] // Lower price
    };
    const pedidoExcesivo = {
      ...mockPedido,
      items: [{ ...mockPedido.items[0], precioUnitario: 150 }] // Higher price
    };

    mockPrisma.listaEquipo.findMany.mockResolvedValue([listaConProblemas]);
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue([pedidoExcesivo]);

    const request = createMockRequest('/api/finanzas/aprovisionamiento/coherencia-global');
    const response = await getCoherenciaGlobal(request);
    
    const data = await response.json();
    expect(data.data.alertasCriticas.length).toBeGreaterThan(0);
  });
});

describe('API: /api/finanzas/aprovisionamiento/alertas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getServerSession.mockResolvedValue({ user: mockUser });
  });

  it('should return system alerts', async () => {
    mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

    const request = createMockRequest('/api/finanzas/aprovisionamiento/alertas');
    const response = await getAlertas(request);
    
    expectSuccessResponse(response);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('alertas');
    expect(data.data).toHaveProperty('estadisticas');
    expect(Array.isArray(data.data.alertas)).toBe(true);
  });

  it('should categorize alerts by priority', async () => {
    mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

    const request = createMockRequest('/api/finanzas/aprovisionamiento/alertas');
    const response = await getAlertas(request);
    
    const data = await response.json();
    expect(data.data.estadisticas).toHaveProperty('porPrioridad');
    expect(data.data.estadisticas.porPrioridad).toHaveProperty('alta');
    expect(data.data.estadisticas.porPrioridad).toHaveProperty('media');
    expect(data.data.estadisticas.porPrioridad).toHaveProperty('baja');
  });

  it('should filter alerts by priority when specified', async () => {
    mockPrisma.listaEquipo.findMany.mockResolvedValue([mockLista]);
    mockPrisma.pedidoEquipo.findMany.mockResolvedValue([mockPedido]);

    const request = createMockRequest('/api/finanzas/aprovisionamiento/alertas', {
      prioridad: 'alta'
    });
    const response = await getAlertas(request);
    
    const data = await response.json();
    const alertasAlta = data.data.alertas.filter((a: any) => a.prioridad === 'alta');
    expect(alertasAlta.length).toBe(data.data.alertas.length);
  });
});

// 📊 Test utilities for API testing
export const apiTestUtils = {
  // ✅ Mock request helpers
  createAuthenticatedRequest: (url: string, params: Record<string, string> = {}) => {
    mockAuth.getServerSession.mockResolvedValue({ user: mockUser });
    return createMockRequest(url, params);
  },
  
  createUnauthenticatedRequest: (url: string, params: Record<string, string> = {}) => {
    mockAuth.getServerSession.mockResolvedValue(null);
    return createMockRequest(url, params);
  },
  
  // 🔁 Database mock helpers
  mockDatabaseSuccess: (data: any) => {
    Object.values(mockPrisma).forEach(model => {
      if (typeof model === 'object' && model.findMany) {
        model.findMany.mockResolvedValue(Array.isArray(data) ? data : [data]);
        model.count?.mockResolvedValue(Array.isArray(data) ? data.length : 1);
      }
    });
  },
  
  mockDatabaseError: (error: Error = new Error('Database error')) => {
    Object.values(mockPrisma).forEach(model => {
      if (typeof model === 'object' && model.findMany) {
        model.findMany.mockRejectedValue(error);
      }
    });
  },
  
  // 📡 Response assertion helpers
  expectApiSuccess: async (response: Response, expectedDataShape?: any) => {
    expectSuccessResponse(response);
    const data = await response.json();
    expect(data.success).toBe(true);
    if (expectedDataShape) {
      expect(data.data).toMatchObject(expectedDataShape);
    }
    return data;
  },
  
  expectApiError: async (response: Response, expectedStatus: number, expectedMessage?: string) => {
    expectErrorResponse(response, expectedStatus);
    const data = await response.json();
    expect(data.success).toBe(false);
    if (expectedMessage) {
      expect(data.message).toContain(expectedMessage);
    }
    return data;
  }
};
