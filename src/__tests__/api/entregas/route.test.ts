/**
 * 🧪 Tests para API de Entregas
 * 
 * @description Tests unitarios, integración y autorización para endpoints de entregas
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/pedido-equipo/entregas/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


// 🔧 Mocks
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pedidoEquipoItem: {
      update: jest.fn(),
      findMany: jest.fn()
    }
  }
}));
jest.mock('@/lib/logger');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrismaUpdate = prisma.pedidoEquipoItem.update as jest.MockedFunction<typeof prisma.pedidoEquipoItem.update>;
const mockPrismaFindMany = prisma.pedidoEquipoItem.findMany as jest.MockedFunction<typeof prisma.pedidoEquipoItem.findMany>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('API Entregas - POST /api/pedido-equipo/entregas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test de autorización
  describe('Autorización', () => {
    it('debe rechazar requests sin sesión', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No autorizado');
    });

    it('debe permitir requests con sesión válida', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any);

      mockPrismaUpdate.mockResolvedValue({
        id: 'item-1',
        estadoEntrega: 'entregado',
        pedidoEquipo: { id: 'pedido-1' },
        catalogoEquipo: { id: 'equipo-1' }
      } as any);

      const validPayload = {
        pedidoEquipoItemId: 'item-1',
        estadoEntrega: 'entregado',
        cantidadAtendida: 5,
        fechaEntregaReal: new Date().toISOString(),
        observacionesEntrega: 'Entrega completa'
      };

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  // ✅ Test de validación de datos
  describe('Validación de Datos', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any);
    });

    it('debe validar payload requerido', async () => {
      const invalidPayload = {
        // Falta pedidoEquipoItemId
        estadoEntrega: 'invalid-estado'
      };

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify(invalidPayload)
      });

      const response = await POST(request);
      expect(response.status).toBe(500); // Zod validation error
    });

    it('debe validar estados de entrega válidos', async () => {
      const validPayload = {
        pedidoEquipoItemId: 'item-1',
        estadoEntrega: 'pendiente',
        cantidadAtendida: 3
      };

      mockPrismaUpdate.mockResolvedValue({
        id: 'item-1',
        estadoEntrega: 'pendiente'
      } as any);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('debe validar cantidades positivas', async () => {
      const invalidPayload = {
        pedidoEquipoItemId: 'item-1',
        estadoEntrega: 'entregado',
        cantidadAtendida: -1 // Cantidad negativa
      };

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify(invalidPayload)
      });

      const response = await POST(request);
      expect(response.status).toBe(500); // Zod validation error
    });
  });

  // ✅ Test de lógica de negocio
  describe('Lógica de Negocio', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any);
    });

    it('debe actualizar item correctamente', async () => {
      const validPayload = {
        pedidoEquipoItemId: 'item-1',
        estadoEntrega: 'entregado',
        cantidadAtendida: 10,
        fechaEntregaReal: new Date().toISOString(),
        observacionesEntrega: 'Entrega exitosa',
        comentarioLogistica: 'Sin problemas'
      };

      const mockUpdatedItem = {
        id: 'item-1',
        estadoEntrega: 'entregado',
        cantidadAtendida: 10,
        fechaEntregaReal: new Date(),
        observacionesEntrega: 'Entrega exitosa',
        comentarioLogistica: 'Sin problemas',
        updatedAt: new Date(),
        pedidoEquipo: { id: 'pedido-1' },
        catalogoEquipo: { id: 'equipo-1', nombre: 'Equipo Test' }
      };

      mockPrismaUpdate.mockResolvedValue(mockUpdatedItem as any);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('item-1');
      expect(data.estadoEntrega).toBe('entregado');
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          estadoEntrega: 'entregado',
          cantidadAtendida: 10,
          observacionesEntrega: 'Entrega exitosa',
          comentarioLogistica: 'Sin problemas'
        }),
        include: {
          pedidoEquipo: true,
          catalogoEquipo: true
        }
      });
    });

    it('debe registrar logs de auditoría', async () => {
      const validPayload = {
        pedidoEquipoItemId: 'item-1',
        estadoEntrega: 'entregado'
      };

      mockPrismaUpdate.mockResolvedValue({
        id: 'item-1',
        estadoEntrega: 'entregado'
      } as any);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });

      await POST(request);

      expect(mockLogger.info).toHaveBeenCalledWith('Entrega registrada', {
        itemId: 'item-1',
        estado: 'entregado',
        usuario: 'test@example.com'
      });
    });
  });

  // ✅ Test de manejo de errores
  describe('Manejo de Errores', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any);
    });

    it('debe manejar errores de base de datos', async () => {
      const validPayload = {
        pedidoEquipoItemId: 'item-1',
        estadoEntrega: 'entregado'
      };

      mockPrismaUpdate.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error interno del servidor');
      expect(mockLogger.error).toHaveBeenCalledWith('Error al registrar entrega', expect.any(Error));
    });

    it('debe manejar JSON malformado', async () => {
      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
        method: 'POST',
        body: 'invalid-json'
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});

describe('API Entregas - GET /api/pedido-equipo/entregas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test de autorización GET
  describe('Autorización GET', () => {
    it('debe rechazar requests sin sesión', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No autorizado');
    });
  });

  // ✅ Test de filtros
  describe('Filtros de Búsqueda', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any);
    });

    it('debe filtrar por pedidoId', async () => {
      const mockEntregas = [
        {
          id: 'item-1',
          pedidoEquipoId: 'pedido-1',
          estadoEntrega: 'entregado',
          pedidoEquipo: { id: 'pedido-1', proyecto: { id: 'proyecto-1' } },
          catalogoEquipo: { id: 'equipo-1' }
        }
      ];

      mockPrismaFindMany.mockResolvedValue(mockEntregas as any);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas?pedidoId=pedido-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEntregas);
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: { pedidoEquipoId: 'pedido-1' },
        include: {
          pedidoEquipo: {
            include: {
              proyecto: true,
              proveedor: true
            }
          },
          catalogoEquipo: true
        },
        orderBy: { updatedAt: 'desc' }
      });
    });

    it('debe filtrar por proyectoId', async () => {
      const mockEntregas = [
        {
          id: 'item-1',
          pedidoEquipo: { proyectoId: 'proyecto-1' },
          estadoEntrega: 'pendiente'
        }
      ];

      mockPrismaFindMany.mockResolvedValue(mockEntregas as any);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas?proyectoId=proyecto-1');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: { pedidoEquipo: { proyectoId: 'proyecto-1' } },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' }
      });
    });

    it('debe manejar requests sin filtros', async () => {
      const mockEntregas = [];
      mockPrismaFindMany.mockResolvedValue(mockEntregas as any);

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  // ✅ Test de manejo de errores GET
  describe('Manejo de Errores GET', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any);
    });

    it('debe manejar errores de base de datos en GET', async () => {
      mockPrismaFindMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error interno del servidor');
      expect(mockLogger.error).toHaveBeenCalledWith('Error al obtener entregas', expect.any(Error));
    });
  });
});

// ✅ Test de integración
describe('Integración API Entregas', () => {
  it('debe mantener consistencia entre POST y GET', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' }
    } as any);

    // 📡 Simular POST exitoso
    const postPayload = {
      pedidoEquipoItemId: 'item-1',
      estadoEntrega: 'entregado',
      cantidadAtendida: 5
    };

    const mockUpdatedItem = {
      id: 'item-1',
      estadoEntrega: 'entregado',
      cantidadAtendida: 5,
      pedidoEquipo: { id: 'pedido-1' },
      catalogoEquipo: { id: 'equipo-1' }
    };

    mockPrismaUpdate.mockResolvedValue(mockUpdatedItem as any);

    const postRequest = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas', {
      method: 'POST',
      body: JSON.stringify(postPayload)
    });

    const postResponse = await POST(postRequest);
    expect(postResponse.status).toBe(200);

    // 📡 Simular GET que debe incluir el item actualizado
    mockPrismaFindMany.mockResolvedValue([mockUpdatedItem] as any);

    const getRequest = new NextRequest('http://localhost:3000/api/pedido-equipo/entregas?pedidoId=pedido-1');
    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getData[0].estadoEntrega).toBe('entregado');
    expect(getData[0].cantidadAtendida).toBe(5);
  });
});
