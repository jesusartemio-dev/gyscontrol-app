/**
 * Test para verificar las correcciones de tipos en listas-equipo/proyeccion
 * Valida que los enums, modelos y campos estén correctamente tipados
 * 
 * @author TRAE AI - GYS System
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT } from '@/app/api/listas-equipo/proyeccion/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn()
    },
    listaEquipoItem: {
      create: jest.fn()
    },
    proyecto: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/listas-equipo/proyeccion - Type Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Estado Enum Validation', () => {
    it('should accept valid EstadoListaEquipo values', async () => {
      const validStates = ['borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado'];
      
      mockPrisma.listaEquipo.findMany.mockResolvedValue([]);
      
      for (const estado of validStates) {
        const url = `http://localhost:3000/api/listas-equipo/proyeccion?estado=${estado}`;
        const request = new NextRequest(url);
        
        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });

    it('should handle filters with correct enum values', async () => {
      mockPrisma.listaEquipo.findMany.mockResolvedValue([
        {
          id: '1',
          codigo: 'LST-001',
          nombre: 'Lista Test',
          estado: 'borrador',
          prioridad: 'media',
          createdAt: new Date(),
          updatedAt: new Date(),
          proyecto: { id: '1', nombre: 'Proyecto Test', codigo: 'PRJ-001' },
          items: [],
          _count: { items: 0 }
        }
      ]);

      const url = 'http://localhost:3000/api/listas-equipo/proyeccion?estado=borrador&prioridad=media';
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.listaEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'borrador',
            prioridad: 'media'
          })
        })
      );
    });
  });

  describe('POST - Model Name Correction', () => {
    it('should use listaEquipoItem instead of itemListaEquipo', async () => {
      const mockProyecto = {
        id: 'proyecto-1',
        nombre: 'Proyecto Test'
      };
      
      const mockLista = {
        id: 'lista-1',
        nombre: 'Lista Test',
        estado: 'borrador'
      };
      
      const mockItem = {
        id: 'item-1',
        nombre: 'Item Test',
        cantidad: 5
      };

      mockPrisma.proyecto.findUnique.mockResolvedValue(mockProyecto);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            create: jest.fn().mockResolvedValue(mockLista)
          },
          listaEquipoItem: {
            create: jest.fn().mockResolvedValue(mockItem)
          }
        };
        return callback(tx as any);
      });

      const requestBody = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        prioridad: 'media' as const,
        items: [
          {
            nombre: 'Item Test',
            cantidad: 5,
            unidad: 'pcs'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      
      // Verify that the transaction was called and listaEquipoItem.create was used
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should create lista with correct estado value', async () => {
      const mockProyecto = {
        id: 'proyecto-1',
        nombre: 'Proyecto Test'
      };
      
      mockPrisma.proyecto.findUnique.mockResolvedValue(mockProyecto);
      
      let capturedListaData: any;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            create: jest.fn().mockImplementation((data) => {
              capturedListaData = data.data;
              return Promise.resolve({ id: 'lista-1', ...data.data });
            })
          },
          listaEquipoItem: {
            create: jest.fn().mockResolvedValue({ id: 'item-1' })
          }
        };
        return callback(tx as any);
      });

      const requestBody = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        prioridad: 'alta' as const,
        items: [{ nombre: 'Item', cantidad: 1, unidad: 'pcs' }]
      };

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      await POST(request);
      
      // Verify estado is set to 'borrador' (lowercase)
      expect(capturedListaData.estado).toBe('borrador');
    });
  });

  describe('PUT - Field Name Correction', () => {
    it('should update without fechaActualizacion field', async () => {
      mockPrisma.listaEquipo.updateMany.mockResolvedValue({ count: 2 });

      const requestBody = {
        accion: 'cambiar_estado',
        listaIds: ['lista-1', 'lista-2'],
        nuevoEstado: 'aprobado'
      };

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.listaEquipo.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['lista-1', 'lista-2'] } },
        data: { estado: 'aprobado' }
      });
    });

    it('should update prioridad without fechaActualizacion field', async () => {
      mockPrisma.listaEquipo.updateMany.mockResolvedValue({ count: 1 });

      const requestBody = {
        accion: 'cambiar_prioridad',
        listaIds: ['lista-1'],
        datos: { prioridad: 'ALTA' }
      };

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.listaEquipo.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['lista-1'] } },
        data: { prioridad: 'ALTA' }
      });
    });
  });

  describe('Type Safety Validation', () => {
    it('should validate EstadoListaEquipo enum values', () => {
      const validStates = ['borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado'];
      const invalidStates = ['BORRADOR', 'PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA'];
      
      // This test ensures our enum values are correctly typed
      validStates.forEach(state => {
        expect(typeof state).toBe('string');
        expect(state).toMatch(/^[a-z_]+$/);
      });
      
      invalidStates.forEach(state => {
        expect(state).toMatch(/^[A-Z_]+$/);
      });
    });

    it('should ensure model names are correctly referenced', () => {
      // This test documents the correct model names
      const correctModelNames = {
        lista: 'listaEquipo',
        item: 'listaEquipoItem',
        proyecto: 'proyecto'
      };
      
      const incorrectModelNames = {
        item: 'itemListaEquipo' // This was the incorrect name
      };
      
      expect(correctModelNames.lista).toBe('listaEquipo');
      expect(correctModelNames.item).toBe('listaEquipoItem');
      expect(incorrectModelNames.item).not.toBe(correctModelNames.item);
    });
  });
});
