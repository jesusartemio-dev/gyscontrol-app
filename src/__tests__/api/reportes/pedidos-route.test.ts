/**
 * 🧪 Tests para API de Reportes de Pedidos
 * 
 * @description Tests de métricas, filtros, performance y cache para reportes
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/reportes/pedidos/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { EstadoPedido } from '@/types/modelos';

// 🔧 Mocks
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pedidoEquipo: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    pedidoEquipoItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    proyecto: {
      findMany: jest.fn()
    }
  }
}));
jest.mock('@/lib/logger');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrismaPedidoFindMany = prisma.pedidoEquipo.findMany as jest.MockedFunction<typeof prisma.pedidoEquipo.findMany>;
const mockPrismaPedidoCount = prisma.pedidoEquipo.count as jest.MockedFunction<typeof prisma.pedidoEquipo.count>;
const mockPrismaItemFindMany = prisma.pedidoEquipoItem.findMany as jest.MockedFunction<typeof prisma.pedidoEquipoItem.findMany>;
const mockPrismaItemCount = prisma.pedidoEquipoItem.count as jest.MockedFunction<typeof prisma.pedidoEquipoItem.count>;
const mockPrismaItemAggregate = prisma.pedidoEquipoItem.aggregate as jest.MockedFunction<typeof prisma.pedidoEquipoItem.aggregate>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('API Reportes Pedidos - GET /api/reportes/pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test de autorización
  describe('Autorización', () => {
    it('debe rechazar requests sin sesión', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No autorizado');
    });

    it('debe permitir acceso a usuarios autenticados', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
      } as any);

      // Mock datos básicos
      mockPrismaPedidoCount.mockResolvedValue(10);
      mockPrismaItemCount.mockResolvedValue(50);
      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: 8.5 },
        _sum: { cantidad: 100, cantidadAtendida: 85 }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  // ✅ Test de métricas generales
  describe('Métricas Generales', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
      } as any);
    });

    it('debe calcular métricas básicas correctamente', async () => {
      // Mock datos de prueba
      mockPrismaPedidoCount.mockResolvedValue(15); // Total pedidos
      mockPrismaItemCount
        .mockResolvedValueOnce(100) // Total items
        .mockResolvedValueOnce(75)  // Items entregados
        .mockResolvedValueOnce(20)  // Items pendientes
        .mockResolvedValueOnce(5);  // Items retrasados

      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: 8.2 },
        _sum: { cantidad: 200, cantidadAtendida: 164 }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        totalPedidos: 15,
        totalItems: 100,
        itemsEntregados: 75,
        itemsPendientes: 20,
        itemsRetrasados: 5,
        porcentajeProgreso: expect.any(Number),
        tiempoPromedioEntrega: expect.any(Number)
      });
    });

    it('debe manejar casos sin datos', async () => {
      mockPrismaPedidoCount.mockResolvedValue(0);
      mockPrismaItemCount.mockResolvedValue(0);
      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: null },
        _sum: { cantidad: null, cantidadAtendida: null }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        totalPedidos: 0,
        totalItems: 0,
        itemsEntregados: 0,
        itemsPendientes: 0,
        itemsRetrasados: 0,
        porcentajeProgreso: 0,
        tiempoPromedioEntrega: 0
      });
    });
  });

  // ✅ Test de filtros avanzados
  describe('Filtros Avanzados', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
      } as any);
    });

    it('debe filtrar por proyecto', async () => {
      const proyectoId = 'proyecto-123';
      
      mockPrismaPedidoCount.mockResolvedValue(5);
      mockPrismaItemCount.mockResolvedValue(25);
      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: 7.5 },
        _sum: { cantidad: 50, cantidadAtendida: 37 }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/reportes/pedidos?proyectoId=${proyectoId}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaPedidoCount).toHaveBeenCalledWith({
        where: { proyectoId }
      });
    });

    it('debe filtrar por rango de fechas', async () => {
      const fechaDesde = '2025-01-01';
      const fechaHasta = '2025-01-31';
      
      mockPrismaPedidoCount.mockResolvedValue(8);
      mockPrismaItemCount.mockResolvedValue(40);
      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: 6.8 },
        _sum: { cantidad: 80, cantidadAtendida: 54 }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/reportes/pedidos?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaPedidoCount).toHaveBeenCalledWith({
        where: {
          fechaCreacion: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta)
          }
        }
      });
    });

    it('debe filtrar por estado de entrega', async () => {
      const estadoEntrega = 'pendiente';
      
      mockPrismaPedidoCount.mockResolvedValue(3);
      mockPrismaItemCount.mockResolvedValue(15);
      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: 0 },
        _sum: { cantidad: 30, cantidadAtendida: 0 }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/reportes/pedidos?estadoEntrega=${estadoEntrega}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaItemCount).toHaveBeenCalledWith({
        where: { estadoEntrega }
      });
    });

    it('debe combinar múltiples filtros', async () => {
      const proyectoId = 'proyecto-123';
      const estadoEntrega = 'entregado';
      const fechaDesde = '2025-01-01';
      
      mockPrismaPedidoCount.mockResolvedValue(2);
      mockPrismaItemCount.mockResolvedValue(12);
      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: 10 },
        _sum: { cantidad: 24, cantidadAtendida: 24 }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/reportes/pedidos?proyectoId=${proyectoId}&estadoEntrega=${estadoEntrega}&fechaDesde=${fechaDesde}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaPedidoCount).toHaveBeenCalledWith({
        where: {
          proyectoId,
          fechaCreacion: {
            gte: new Date(fechaDesde)
          }
        }
      });
    });
  });

  // ✅ Test de paginación y ordenamiento
  describe('Paginación y Ordenamiento', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
      } as any);
    });

    it('debe manejar paginación correctamente', async () => {
      const page = '2';
      const limit = '10';
      
      mockPrismaPedidoCount.mockResolvedValue(25);
      mockPrismaPedidoFindMany.mockResolvedValue([
        { id: 'pedido-11', numero: 'P-011' },
        { id: 'pedido-12', numero: 'P-012' }
      ] as any);

      const request = new NextRequest(`http://localhost:3000/api/reportes/pedidos?page=${page}&limit=${limit}&incluirDetalles=true`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3
      });
      expect(mockPrismaPedidoFindMany).toHaveBeenCalledWith({
        skip: 10, // (page - 1) * limit
        take: 10,
        include: expect.any(Object),
        orderBy: { fechaCreacion: 'desc' }
      });
    });

    it('debe ordenar por diferentes campos', async () => {
      const orderBy = 'numero';
      const order = 'asc';
      
      mockPrismaPedidoCount.mockResolvedValue(5);
      mockPrismaPedidoFindMany.mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3000/api/reportes/pedidos?orderBy=${orderBy}&order=${order}&incluirDetalles=true`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaPedidoFindMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        include: expect.any(Object),
        orderBy: { numero: 'asc' }
      });
    });
  });

  // ✅ Test de performance
  describe('Performance', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
      } as any);
    });

    it('debe ejecutar consultas en paralelo para métricas', async () => {
      const startTime = Date.now();
      
      // Simular consultas que toman tiempo
      mockPrismaPedidoCount.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(10), 50))
      );
      mockPrismaItemCount.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(50), 50))
      );
      mockPrismaItemAggregate.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          _avg: { cantidadAtendida: 8.5 },
          _sum: { cantidad: 100, cantidadAtendida: 85 }
        }), 50))
      );

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos');
      const response = await GET(request);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(response.status).toBe(200);
      // Las consultas en paralelo deberían tomar menos de 150ms (3 * 50ms secuencial)
      expect(executionTime).toBeLessThan(150);
    });

    it('debe optimizar consultas con índices apropiados', async () => {
      const proyectoId = 'proyecto-123';
      const fechaDesde = '2025-01-01';
      
      mockPrismaPedidoCount.mockResolvedValue(5);
      mockPrismaItemCount.mockResolvedValue(25);
      mockPrismaItemAggregate.mockResolvedValue({
        _avg: { cantidadAtendida: 7.5 },
        _sum: { cantidad: 50, cantidadAtendida: 37 }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/reportes/pedidos?proyectoId=${proyectoId}&fechaDesde=${fechaDesde}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verificar que se usan filtros optimizados
      expect(mockPrismaPedidoCount).toHaveBeenCalledWith({
        where: {
          proyectoId, // Índice en proyectoId
          fechaCreacion: { gte: new Date(fechaDesde) } // Índice en fechaCreacion
        }
      });
    });
  });

  // ✅ Test de manejo de errores
  describe('Manejo de Errores', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
      } as any);
    });

    it('debe manejar errores de base de datos', async () => {
      mockPrismaPedidoCount.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error interno del servidor');
      expect(mockLogger.error).toHaveBeenCalledWith('Error al obtener reportes de pedidos', expect.any(Error));
    });

    it('debe validar parámetros de fecha', async () => {
      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos?fechaDesde=invalid-date');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Fecha inválida');
    });

    it('debe validar parámetros de paginación', async () => {
      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos?page=-1&limit=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Parámetros de paginación inválidos');
    });
  });
});

describe('API Reportes Pedidos - POST /api/reportes/pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test de generación de reportes personalizados
  describe('Reportes Personalizados', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
      } as any);
    });

    it('debe generar reporte con filtros específicos', async () => {
      const reportePayload = {
        proyectoId: 'proyecto-123',
        fechaDesde: '2025-01-01',
        fechaHasta: '2025-01-31',
        incluirDetalles: true,
        formato: 'json'
      };

      mockPrismaPedidoFindMany.mockResolvedValue([
        {
          id: 'pedido-1',
          numero: 'P-001',
          estado: EstadoPedido.aprobado,
          items: [
            { id: 'item-1', estadoEntrega: 'entregado' },
        { id: 'item-2', estadoEntrega: 'pendiente' }
          ]
        }
      ] as any);

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos', {
        method: 'POST',
        body: JSON.stringify(reportePayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reporte).toBeDefined();
      expect(data.metadatos).toMatchObject({
        fechaGeneracion: expect.any(String),
        filtrosAplicados: reportePayload,
        totalRegistros: expect.any(Number)
      });
    });

    it('debe validar payload de reporte', async () => {
      const invalidPayload = {
        fechaDesde: 'invalid-date',
        incluirDetalles: 'not-boolean'
      };

      const request = new NextRequest('http://localhost:3000/api/reportes/pedidos', {
        method: 'POST',
        body: JSON.stringify(invalidPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Datos de reporte inválidos');
    });
  });
});

// ✅ Test de cache
describe('Cache de Reportes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com', rol: 'Gerente' }
    } as any);
  });

  it('debe incluir headers de cache apropiados', async () => {
    mockPrismaPedidoCount.mockResolvedValue(10);
    mockPrismaItemCount.mockResolvedValue(50);
    mockPrismaItemAggregate.mockResolvedValue({
      _avg: { cantidadAtendida: 8.5 },
      _sum: { cantidad: 100, cantidadAtendida: 85 }
    } as any);

    const request = new NextRequest('http://localhost:3000/api/reportes/pedidos');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=600');
  });

  it('debe invalidar cache con parámetros dinámicos', async () => {
    const request = new NextRequest('http://localhost:3000/api/reportes/pedidos?t=' + Date.now());
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });
});
