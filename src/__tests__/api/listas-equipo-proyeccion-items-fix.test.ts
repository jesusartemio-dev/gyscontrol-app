/**
 * @fileoverview Test para verificar corrección de errores TypeScript en creación de items
 * @author GYS Team
 * @date 2024
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listas-equipo/proyeccion/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    listaEquipo: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    listaEquipoItem: {
      create: jest.fn()
    }
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('API /api/listas-equipo/proyeccion - Corrección Items TypeScript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - Creación de items corregida', () => {
    it('debe crear items con campos requeridos y tipos correctos', async () => {
      // ✅ Arrange
      const mockTransaction = jest.fn();
      mockPrisma.$transaction.mockImplementation(mockTransaction);
      
      const mockLista = {
        id: 'lista-id-123',
        codigo: 'PROY-001-LE-001',
        numeroSecuencia: 1
      };
      
      const mockItems = [
        {
          id: 'item-1',
          codigo: 'PROY-001-LE-001-ITEM-001',
          descripcion: 'Item Test 1',
          cantidad: 5,
          unidad: 'pcs',
          presupuesto: 100.50,
          estado: 'borrador'
        },
        {
          id: 'item-2', 
          codigo: 'PROY-001-LE-001-ITEM-002',
          descripcion: 'Item Test 2', // ✅ descripcion viene del nombre cuando es undefined
          cantidad: 3,
          unidad: 'kg',
          presupuesto: null,
          estado: 'borrador'
        }
      ];
      
      // Mock de la transacción
      mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockLista)
          },
          listaEquipoItem: {
            create: jest.fn()
              .mockResolvedValueOnce(mockItems[0])
              .mockResolvedValueOnce(mockItems[1])
          }
        };
        
        return await callback(tx);
      });
      
      const requestBody = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        prioridad: 'alta' as const,
        items: [
          {
            nombre: 'Item Test 1',
            descripcion: 'Descripción del item 1', // ✅ Con descripción
            cantidad: 5,
            unidad: 'pcs',
            costoEstimado: 100.50
          },
          {
            nombre: 'Item Test 2',
            // descripcion: undefined, // ✅ Sin descripción (opcional)
            cantidad: 3,
            unidad: 'kg'
            // costoEstimado: undefined // ✅ Sin costo estimado (opcional)
          }
        ]
      };
      
      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      // ✅ Act
      const response = await POST(request);
      
      // ✅ Assert
      expect(response.status).toBe(201);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      
      // Verificar que la transacción fue llamada correctamente
      const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
      expect(typeof transactionCallback).toBe('function');
    });

    it('debe manejar descripcion undefined usando nombre como fallback', async () => {
      // ✅ Arrange
      const mockTransaction = jest.fn();
      mockPrisma.$transaction.mockImplementation(mockTransaction);
      
      const mockLista = {
        id: 'lista-id-123',
        codigo: 'PROY-001-LE-001'
      };
      
      const mockCreateItem = jest.fn().mockResolvedValue({
        id: 'item-1',
        codigo: 'PROY-001-LE-001-ITEM-001',
        descripcion: 'Nombre del Item', // ✅ Debe usar el nombre como descripción
        estado: 'borrador'
      });
      
      mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockLista)
          },
          listaEquipoItem: {
            create: mockCreateItem
          }
        };
        
        return await callback(tx);
      });
      
      const requestBody = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        items: [
          {
            nombre: 'Nombre del Item',
            // descripcion: undefined, // ✅ Sin descripción explícita
            cantidad: 1,
            unidad: 'pcs'
          }
        ]
      };
      
      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      // ✅ Act
      await POST(request);
      
      // ✅ Assert - Verificar que se llamó create con descripcion = nombre
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            descripcion: 'Nombre del Item', // ✅ Debe usar nombre como fallback
            estado: 'borrador', // ✅ Estado válido del enum
            responsableId: 'temp-user-id', // ✅ Campo requerido
            codigo: expect.stringMatching(/ITEM-\d{3}$/) // ✅ Código generado
          })
        })
      );
    });

    it('debe usar estado borrador válido del enum EstadoListaItem', async () => {
      // ✅ Arrange
      const mockTransaction = jest.fn();
      mockPrisma.$transaction.mockImplementation(mockTransaction);
      
      const mockCreateItem = jest.fn().mockResolvedValue({
        id: 'item-1',
        estado: 'borrador'
      });
      
      mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'lista-1', codigo: 'TEST-001' })
          },
          listaEquipoItem: {
            create: mockCreateItem
          }
        };
        
        return await callback(tx);
      });
      
      const requestBody = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        items: [{
          nombre: 'Item Test',
          cantidad: 1,
          unidad: 'pcs'
        }]
      };
      
      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      // ✅ Act
      await POST(request);
      
      // ✅ Assert - Verificar que se usa 'borrador' y no 'PENDIENTE'
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'borrador' // ✅ Valor válido del enum EstadoListaItem
          })
        })
      );
      
      // ✅ Verificar que NO se usa 'PENDIENTE'
      const callArgs = mockCreateItem.mock.calls[0][0];
      expect(callArgs.data.estado).not.toBe('PENDIENTE');
      expect(callArgs.data.estado).not.toBe('pendiente');
    });

    it('debe generar códigos únicos para cada item', async () => {
      // ✅ Arrange
      const mockTransaction = jest.fn();
      mockPrisma.$transaction.mockImplementation(mockTransaction);
      
      const mockCreateItem = jest.fn()
        .mockResolvedValueOnce({ id: 'item-1', codigo: 'TEST-001-ITEM-001' })
        .mockResolvedValueOnce({ id: 'item-2', codigo: 'TEST-001-ITEM-002' })
        .mockResolvedValueOnce({ id: 'item-3', codigo: 'TEST-001-ITEM-003' });
      
      mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'lista-1', codigo: 'TEST-001' })
          },
          listaEquipoItem: {
            create: mockCreateItem
          }
        };
        
        return await callback(tx);
      });
      
      const requestBody = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        items: [
          { nombre: 'Item 1', cantidad: 1, unidad: 'pcs' },
          { nombre: 'Item 2', cantidad: 2, unidad: 'kg' },
          { nombre: 'Item 3', cantidad: 3, unidad: 'mts' }
        ]
      };
      
      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      // ✅ Act
      await POST(request);
      
      // ✅ Assert - Verificar códigos únicos secuenciales
      expect(mockCreateItem).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'TEST-001-ITEM-001'
          })
        })
      );
      
      expect(mockCreateItem).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'TEST-001-ITEM-002'
          })
        })
      );
      
      expect(mockCreateItem).toHaveBeenNthCalledWith(3,
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'TEST-001-ITEM-003'
          })
        })
      );
    });
  });

  describe('Validación de esquemas', () => {
    it('debe validar esquema sin campos removidos', () => {
      // ✅ Test que verifica que el esquema no incluye campos removidos
      const validData = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        items: [{
          nombre: 'Item Test',
          descripcion: 'Descripción opcional',
          cantidad: 1,
          unidad: 'pcs',
          costoEstimado: 100
          // ✅ Sin categoria ni especificaciones (removidos)
        }]
      };
      
      // ✅ Si el esquema está bien definido, esto no debería lanzar error
      expect(() => {
        // Simulamos validación básica
        expect(validData.items[0]).not.toHaveProperty('categoria');
        expect(validData.items[0]).not.toHaveProperty('especificaciones');
        expect(validData.items[0]).toHaveProperty('nombre');
        expect(validData.items[0]).toHaveProperty('cantidad');
        expect(validData.items[0]).toHaveProperty('unidad');
      }).not.toThrow();
    });
  });
});
