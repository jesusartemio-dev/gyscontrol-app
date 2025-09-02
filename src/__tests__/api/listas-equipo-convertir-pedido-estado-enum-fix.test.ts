/**
 * Test para verificar la corrección del enum EstadoListaEquipo en convertir-pedido
 * Valida que se usen valores válidos del enum: 'aprobado' y 'por_revisar'
 * en lugar de 'convertida' y 'parcial'
 * 
 * @author TRAE AI - GYS System
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listas-equipo/convertir-pedido/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn()
  }
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/listas-equipo/convertir-pedido - Estado Enum Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', role: 'proyectos' }
    } as any);
  });

  it('should set estado to "aprobado" when all items are fully converted', async () => {
    const mockTransaction = jest.fn();
    mockPrisma.$transaction.mockImplementation(mockTransaction);

    // Mock transaction callback
    mockTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'lista-1',
            codigo: 'LST-001',
            responsableId: 'user-1'
          }),
          update: jest.fn().mockResolvedValue({})
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'item-1',
              cantidad: 10,
              cantidadPedida: 10, // ✅ Totalmente convertido
              precioElegido: 100
            },
            {
              id: 'item-2', 
              cantidad: 5,
              cantidadPedida: 5, // ✅ Totalmente convertido
              precioElegido: 50
            }
          ]),
          updateMany: jest.fn().mockResolvedValue({})
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'pedido-1',
            codigo: 'PED-001'
          })
        },
        pedidoEquipoItem: {
          createMany: jest.fn().mockResolvedValue({})
        },
        logAuditoria: {
          create: jest.fn().mockResolvedValue({})
        }
      };
      
      return await callback(mockTx);
    });

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-1',
        items: [
          { itemId: 'item-1', cantidadAConvertir: 10 },
          { itemId: 'item-2', cantidadAConvertir: 5 }
        ],
        fechaNecesaria: '2024-12-31T00:00:00.000Z'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // ✅ Verificar que se llamó update con estado 'aprobado'
    const updateCall = mockTransaction.mock.calls[0][0];
    await updateCall({
      listaEquipo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lista-1',
          codigo: 'LST-001',
          responsableId: 'user-1'
        }),
        update: jest.fn().mockImplementation((params) => {
          expect(params.data.estado).toBe('aprobado');
          return Promise.resolve({});
        })
      },
      listaEquipoItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'item-1', cantidad: 10, cantidadPedida: 10, precioElegido: 100 },
          { id: 'item-2', cantidad: 5, cantidadPedida: 5, precioElegido: 50 }
        ]),
        updateMany: jest.fn()
      },
      pedidoEquipo: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'pedido-1', codigo: 'PED-001' })
      },
      pedidoEquipoItem: { createMany: jest.fn() },
      logAuditoria: { create: jest.fn() }
    });
  });

  it('should set estado to "por_revisar" when some items remain pending', async () => {
    const mockTransaction = jest.fn();
    mockPrisma.$transaction.mockImplementation(mockTransaction);

    // Mock transaction callback
    mockTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'lista-1',
            codigo: 'LST-001',
            responsableId: 'user-1'
          }),
          update: jest.fn().mockResolvedValue({})
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'item-1',
              cantidad: 10,
              cantidadPedida: 5, // ✅ Parcialmente convertido
              precioElegido: 100
            },
            {
              id: 'item-2',
              cantidad: 8,
              cantidadPedida: 0, // ✅ No convertido
              precioElegido: 75
            }
          ]),
          updateMany: jest.fn().mockResolvedValue({})
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'pedido-1',
            codigo: 'PED-001'
          })
        },
        pedidoEquipoItem: {
          createMany: jest.fn().mockResolvedValue({})
        },
        logAuditoria: {
          create: jest.fn().mockResolvedValue({})
        }
      };
      
      return await callback(mockTx);
    });

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-1',
        items: [
          { itemId: 'item-1', cantidadAConvertir: 5 }
        ],
        fechaNecesaria: '2024-12-31T00:00:00.000Z'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // ✅ Verificar que se llamó update con estado 'por_revisar'
    const updateCall = mockTransaction.mock.calls[0][0];
    await updateCall({
      listaEquipo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lista-1',
          codigo: 'LST-001',
          responsableId: 'user-1'
        }),
        update: jest.fn().mockImplementation((params) => {
          expect(params.data.estado).toBe('por_revisar');
          return Promise.resolve({});
        })
      },
      listaEquipoItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'item-1', cantidad: 10, cantidadPedida: 5, precioElegido: 100 },
          { id: 'item-2', cantidad: 8, cantidadPedida: 0, precioElegido: 75 }
        ]),
        updateMany: jest.fn()
      },
      pedidoEquipo: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'pedido-1', codigo: 'PED-001' })
      },
      pedidoEquipoItem: { createMany: jest.fn() },
      logAuditoria: { create: jest.fn() }
    });
  });

  it('should handle null cantidadPedida values correctly', async () => {
    const mockTransaction = jest.fn();
    mockPrisma.$transaction.mockImplementation(mockTransaction);

    // Mock transaction callback
    mockTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'lista-1',
            codigo: 'LST-001',
            responsableId: 'user-1'
          }),
          update: jest.fn().mockResolvedValue({})
        },
        listaEquipoItem: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'item-1',
              cantidad: 10,
              cantidadPedida: null, // ✅ Null (tratado como 0)
              precioElegido: 100
            }
          ]),
          updateMany: jest.fn().mockResolvedValue({})
        },
        pedidoEquipo: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'pedido-1',
            codigo: 'PED-001'
          })
        },
        pedidoEquipoItem: {
          createMany: jest.fn().mockResolvedValue({})
        },
        logAuditoria: {
          create: jest.fn().mockResolvedValue({})
        }
      };
      
      return await callback(mockTx);
    });

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-1',
        items: [
          { itemId: 'item-1', cantidadAConvertir: 5 }
        ],
        fechaNecesaria: '2024-12-31T00:00:00.000Z'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // ✅ Verificar que se llamó update con estado 'por_revisar' (porque null < cantidad)
    const updateCall = mockTransaction.mock.calls[0][0];
    await updateCall({
      listaEquipo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lista-1',
          codigo: 'LST-001',
          responsableId: 'user-1'
        }),
        update: jest.fn().mockImplementation((params) => {
          expect(params.data.estado).toBe('por_revisar');
          return Promise.resolve({});
        })
      },
      listaEquipoItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'item-1', cantidad: 10, cantidadPedida: null, precioElegido: 100 }
        ]),
        updateMany: jest.fn()
      },
      pedidoEquipo: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'pedido-1', codigo: 'PED-001' })
      },
      pedidoEquipoItem: { createMany: jest.fn() },
      logAuditoria: { create: jest.fn() }
    });
  });
});