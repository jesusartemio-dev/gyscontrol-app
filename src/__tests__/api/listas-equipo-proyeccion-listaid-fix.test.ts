/**
 * @fileoverview Test para verificar la corrección del campo listaId en ListaEquipoItem
 * 
 * Verifica que:
 * - Se usa 'listaId' correctamente en lugar de 'listaEquipoId'
 * - La creación de items funciona sin errores de TypeScript
 * - Los items se asocian correctamente con la lista
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listas-equipo/proyeccion/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    listaEquipo: {
      count: jest.fn(),
    },
    listaEquipoItem: {
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('API /api/listas-equipo/proyeccion - Corrección listaId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe usar listaId correctamente al crear items', async () => {
    // Arrange
    const mockLista = {
      id: 'lista-123',
      codigo: 'LST-001',
      nombre: 'Lista Test',
      numeroSecuencia: 1,
      proyectoId: 'proyecto-123',
      responsableId: 'temp-user-id',
      prioridad: 'media',
      fechaLimite: null,
      estado: 'borrador',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockItems = [
      {
        id: 'item-1',
        listaId: 'lista-123', // ✅ Campo correcto
        responsableId: 'temp-user-id',
        codigo: 'LST-001-ITEM-001',
        descripcion: 'Equipo de prueba 1',
        cantidad: 2,
        unidad: 'unidad',
        presupuesto: 1000,
        estado: 'borrador',
      },
      {
        id: 'item-2',
        listaId: 'lista-123', // ✅ Campo correcto
        responsableId: 'temp-user-id',
        codigo: 'LST-001-ITEM-002',
        descripcion: 'Equipo de prueba 2',
        cantidad: 1,
        unidad: 'pieza',
        presupuesto: 500,
        estado: 'borrador',
      },
    ];

    // Mock de la transacción
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue(mockLista),
        },
        listaEquipoItem: {
          create: jest.fn()
            .mockResolvedValueOnce(mockItems[0])
            .mockResolvedValueOnce(mockItems[1]),
        },
      };
      return callback(mockTx as any);
    });

    const requestBody = {
      nombre: 'Lista Test',
      proyectoId: 'proyecto-123',
      prioridad: 'media',
      items: [
        {
          nombre: 'Equipo de prueba 1',
          descripcion: 'Equipo de prueba 1',
          cantidad: 2,
          unidad: 'unidad',
          costoEstimado: 1000,
        },
        {
          nombre: 'Equipo de prueba 2',
          cantidad: 1,
          unidad: 'pieza',
          costoEstimado: 500,
        },
      ],
    };

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();

    // Verificar que se llamó a $transaction
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    // Verificar que se crearon los items con listaId correcto
    const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
    const mockTx = {
      listaEquipo: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(mockLista),
      },
      listaEquipoItem: {
        create: jest.fn()
          .mockResolvedValueOnce(mockItems[0])
          .mockResolvedValueOnce(mockItems[1]),
      },
    };

    await transactionCallback(mockTx as any);

    // Verificar que se usó listaId en lugar de listaEquipoId
    expect(mockTx.listaEquipoItem.create).toHaveBeenCalledTimes(2);
    
    const firstItemCall = mockTx.listaEquipoItem.create.mock.calls[0][0];
    const secondItemCall = mockTx.listaEquipoItem.create.mock.calls[1][0];

    expect(firstItemCall.data).toHaveProperty('listaId', 'lista-123');
    expect(firstItemCall.data).not.toHaveProperty('listaEquipoId');
    
    expect(secondItemCall.data).toHaveProperty('listaId', 'lista-123');
    expect(secondItemCall.data).not.toHaveProperty('listaEquipoId');
  });

  it('debe generar códigos únicos para cada item', async () => {
    // Arrange
    const mockLista = {
      id: 'lista-456',
      codigo: 'LST-002',
      nombre: 'Lista Códigos Test',
      numeroSecuencia: 2,
      proyectoId: 'proyecto-456',
      responsableId: 'temp-user-id',
      prioridad: 'alta',
      fechaLimite: null,
      estado: 'borrador',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        listaEquipo: {
          count: jest.fn().mockResolvedValue(1),
          create: jest.fn().mockResolvedValue(mockLista),
        },
        listaEquipoItem: {
          create: jest.fn()
            .mockResolvedValueOnce({ id: 'item-1', codigo: 'LST-002-ITEM-001' })
            .mockResolvedValueOnce({ id: 'item-2', codigo: 'LST-002-ITEM-002' })
            .mockResolvedValueOnce({ id: 'item-3', codigo: 'LST-002-ITEM-003' }),
        },
      };
      return callback(mockTx as any);
    });

    const requestBody = {
      nombre: 'Lista Códigos Test',
      proyectoId: 'proyecto-456',
      prioridad: 'alta',
      items: [
        { nombre: 'Item 1', cantidad: 1, unidad: 'pza', costoEstimado: 100 },
        { nombre: 'Item 2', cantidad: 2, unidad: 'mt', costoEstimado: 200 },
        { nombre: 'Item 3', cantidad: 3, unidad: 'kg', costoEstimado: 300 },
      ],
    };

    const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200);

    // Verificar generación de códigos únicos
    const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
    const mockTx = {
      listaEquipo: {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockLista),
      },
      listaEquipoItem: {
        create: jest.fn()
          .mockResolvedValueOnce({ id: 'item-1' })
          .mockResolvedValueOnce({ id: 'item-2' })
          .mockResolvedValueOnce({ id: 'item-3' }),
      },
    };

    await transactionCallback(mockTx as any);

    const calls = mockTx.listaEquipoItem.create.mock.calls;
    expect(calls[0][0].data.codigo).toBe('LST-002-ITEM-001');
    expect(calls[1][0].data.codigo).toBe('LST-002-ITEM-002');
    expect(calls[2][0].data.codigo).toBe('LST-002-ITEM-003');
  });
});
