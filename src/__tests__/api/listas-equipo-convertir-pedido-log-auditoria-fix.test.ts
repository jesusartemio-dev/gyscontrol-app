/**
 * Test para verificar la eliminación del log de auditoría en convertir-pedido
 * Valida que la operación funcione correctamente sin el modelo LogAuditoria
 * y que se registre el log básico con console.log
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

// Mock console.log to verify it's called
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/listas-equipo/convertir-pedido - Log Auditoria Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', role: 'proyectos' }
    } as any);
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
  });

  it('should complete conversion without LogAuditoria and log to console', async () => {
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
              cantidadPedida: 5,
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

    // ✅ Verificar que console.log fue llamado con el mensaje correcto
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Pedido creado: PED-001 desde lista: LST-001')
    );
  });

  it('should not attempt to access logAuditoria model', async () => {
    const mockTransaction = jest.fn();
    mockPrisma.$transaction.mockImplementation(mockTransaction);

    // Mock transaction callback that would fail if logAuditoria is accessed
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
              cantidadPedida: 10,
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
        // ✅ No incluir logAuditoria para simular que no existe
        // Si el código intenta acceder a logAuditoria, fallará
      };
      
      // Verificar que no se intenta acceder a logAuditoria
      const txProxy = new Proxy(mockTx, {
        get(target, prop) {
          if (prop === 'logAuditoria') {
            throw new Error('logAuditoria should not be accessed');
          }
          return target[prop as keyof typeof target];
        }
      });
      
      return await callback(txProxy as any);
    });

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
      method: 'POST',
      body: JSON.stringify({
        listaId: 'lista-1',
        items: [
          { itemId: 'item-1', cantidadAConvertir: 10 }
        ],
        fechaNecesaria: '2024-12-31T00:00:00.000Z'
      })
    });

    // ✅ La operación debe completarse sin errores
    const response = await POST(request);
    expect(response.status).toBe(200);

    // ✅ Verificar que console.log fue llamado
    expect(mockConsoleLog).toHaveBeenCalled();
  });

  it('should log correct information for multiple conversions', async () => {
    const mockTransaction = jest.fn();
    mockPrisma.$transaction.mockImplementation(mockTransaction);

    // Mock multiple conversion scenarios
    const scenarios = [
      { listaId: 'lista-1', codigo: 'LST-001', pedidoCodigo: 'PED-001' },
      { listaId: 'lista-2', codigo: 'LST-002', pedidoCodigo: 'PED-002' }
    ];

    for (const scenario of scenarios) {
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          listaEquipo: {
            findUnique: jest.fn().mockResolvedValue({
              id: scenario.listaId,
              codigo: scenario.codigo,
              responsableId: 'user-1'
            }),
            update: jest.fn().mockResolvedValue({})
          },
          listaEquipoItem: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'item-1',
                cantidad: 10,
                cantidadPedida: 10,
                precioElegido: 100
              }
            ]),
            updateMany: jest.fn().mockResolvedValue({})
          },
          pedidoEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: `pedido-${scenario.listaId}`,
              codigo: scenario.pedidoCodigo
            })
          },
          pedidoEquipoItem: {
            createMany: jest.fn().mockResolvedValue({})
          }
        };
        
        return await callback(mockTx);
      });

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/convertir-pedido', {
        method: 'POST',
        body: JSON.stringify({
          listaId: scenario.listaId,
          items: [
            { itemId: 'item-1', cantidadAConvertir: 10 }
          ],
          fechaNecesaria: '2024-12-31T00:00:00.000Z'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // ✅ Verificar que se logueó la información correcta para cada escenario
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Pedido creado: ${scenario.pedidoCodigo} desde lista: ${scenario.codigo}`
      );
    }
  });
});