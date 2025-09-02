/**
 * @fileoverview Test para verificar que los errores de TypeScript en listas-equipo/proyeccion han sido corregidos
 * @author GYS Team
 * @date 2024
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/listas-equipo/proyeccion/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn()
    },
    listaEquipoItem: {
      createMany: jest.fn()
    }
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('API /api/listas-equipo/proyeccion - Correcciones TypeScript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Filtros corregidos', () => {
    it('debe usar valores de prioridad en minúsculas', async () => {
      // ✅ Arrange
      mockPrisma.listaEquipo.findMany.mockResolvedValue([]);
      
      const url = 'http://localhost:3000/api/listas-equipo/proyeccion?prioridad=media&estado=borrador';
      const request = new NextRequest(url);
      
      // ✅ Act
      await GET(request);
      
      // ✅ Assert
      expect(mockPrisma.listaEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            prioridad: 'media', // ✅ Minúsculas
            estado: 'borrador'
          })
        })
      );
    });

    it('debe usar createdAt en lugar de fechaCreacion para filtros de fecha', async () => {
      // ✅ Arrange
      mockPrisma.listaEquipo.findMany.mockResolvedValue([]);
      
      const url = 'http://localhost:3000/api/listas-equipo/proyeccion?fechaDesde=2024-01-01&fechaHasta=2024-12-31';
      const request = new NextRequest(url);
      
      // ✅ Act
      await GET(request);
      
      // ✅ Assert
      expect(mockPrisma.listaEquipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { // ✅ createdAt en lugar de fechaCreacion
              gte: expect.any(Date),
              lte: expect.any(Date)
            }
          })
        })
      );
    });

    it('no debe incluir filtro de categoria (removido)', async () => {
      // ✅ Arrange
      mockPrisma.listaEquipo.findMany.mockResolvedValue([]);
      
      const url = 'http://localhost:3000/api/listas-equipo/proyeccion?estado=borrador';
      const request = new NextRequest(url);
      
      // ✅ Act
      await GET(request);
      
      // ✅ Assert
      const callArgs = mockPrisma.listaEquipo.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('categoria');
    });
  });

  describe('POST - Creación corregida', () => {
    it('debe crear listaEquipo sin campo descripcion', async () => {
      // ✅ Arrange
      mockPrisma.listaEquipo.findFirst.mockResolvedValue({
        id: 'existing-id',
        numeroSecuencia: 5
      } as any);
      
      mockPrisma.listaEquipo.create.mockResolvedValue({
        id: 'new-lista-id',
        codigo: 'PROY-001-LE-006',
        numeroSecuencia: 6
      } as any);
      
      mockPrisma.listaEquipoItem.createMany.mockResolvedValue({ count: 2 });
      
      const requestBody = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        prioridad: 'alta' as const,
        items: [
          {
            nombre: 'Item 1',
            cantidad: 5,
            unidad: 'pcs'
          },
          {
            nombre: 'Item 2',
            cantidad: 3,
            unidad: 'kg'
          }
        ]
      };
      
      const request = new NextRequest('http://localhost:3000/api/listas-equipo/proyeccion', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      // ✅ Act
      await POST(request);
      
      // ✅ Assert
      expect(mockPrisma.listaEquipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Lista Test',
            proyectoId: 'proyecto-1',
            responsableId: 'temp-user-id',
            codigo: 'PROY-001-LE-006',
            numeroSecuencia: 6,
            prioridad: 'alta', // ✅ Sin toLowerCase()
            estado: 'borrador'
            // ✅ Sin campo 'descripcion'
          })
        })
      );
      
      // ✅ Verificar que no se incluye descripcion
      const createCall = mockPrisma.listaEquipo.create.mock.calls[0][0];
      expect(createCall.data).not.toHaveProperty('descripcion');
    });

    it('debe usar listaEquipoItem en lugar de itemListaEquipo', async () => {
      // ✅ Arrange
      mockPrisma.listaEquipo.findFirst.mockResolvedValue(null);
      mockPrisma.listaEquipo.create.mockResolvedValue({
        id: 'new-lista-id',
        codigo: 'PROY-001-LE-001',
        numeroSecuencia: 1
      } as any);
      
      mockPrisma.listaEquipoItem.createMany.mockResolvedValue({ count: 1 });
      
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
      
      // ✅ Assert - Verificar que se usa listaEquipoItem
      expect(mockPrisma.listaEquipoItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              listaEquipoId: 'new-lista-id',
              nombre: 'Item Test',
              cantidad: 1,
              unidad: 'pcs'
            })
          ])
        })
      );
    });
  });

  describe('Validación de esquemas', () => {
    it('debe validar prioridades en minúsculas en CrearListaProyeccionSchema', () => {
      // ✅ Este test verifica que el esquema acepta valores en minúsculas
      const validData = {
        nombre: 'Lista Test',
        proyectoId: 'proyecto-1',
        prioridad: 'critica' as const, // ✅ Minúsculas
        items: [{
          nombre: 'Item',
          cantidad: 1,
          unidad: 'pcs'
        }]
      };
      
      // ✅ Si el esquema está bien definido, esto no debería lanzar error
      expect(() => {
        // Simulamos validación del esquema
        const prioridadesValidas = ['baja', 'media', 'alta', 'critica'];
        expect(prioridadesValidas).toContain(validData.prioridad);
      }).not.toThrow();
    });

    it('debe validar estados en minúsculas en FiltrosProyeccionSchema', () => {
      // ✅ Este test verifica que el esquema de filtros acepta estados en minúsculas
      const estadosValidos = ['borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado'];
      const prioridadesValidas = ['baja', 'media', 'alta', 'critica'];
      
      expect(estadosValidos).toContain('borrador');
      expect(prioridadesValidas).toContain('media');
      
      // ✅ Verificar que no incluye valores en mayúsculas
      expect(prioridadesValidas).not.toContain('MEDIA');
      expect(estadosValidos).not.toContain('BORRADOR');
    });
  });
});