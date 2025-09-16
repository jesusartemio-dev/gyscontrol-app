// ===================================================
// 📁 Archivo: from-cotizacion.test.ts
// 📌 Tests para la API de creación de proyectos desde cotización
// ===================================================

import { POST } from '@/app/api/proyecto/from-cotizacion/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// ✅ Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cotizacion: {
      findUnique: jest.fn(),
    },
    cliente: {
      update: jest.fn(),
    },
    proyecto: {
      create: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/proyecto/from-cotizacion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockCotizacion = {
    id: 'cotizacion-1',
    estado: 'aprobada',
    clienteId: 'cliente-1',
    comercialId: 'comercial-1',
    totalCliente: 10000,
    descuento: 5,
    grandTotal: 9500,
    cliente: {
      id: 'cliente-1',
      codigo: 'CLI001',
      numeroSecuencia: 1,
    },
    equipos: [
      {
        nombre: 'Grupo Equipos 1',
        descripcion: 'Descripción equipos',
        subtotalInterno: 5000,
        subtotalCliente: 6000,
        items: [
          {
            catalogoEquipoId: 'equipo-1',
            codigo: 'EQ001',
            descripcion: 'Equipo test',
            categoria: 'categoria-1',
            unidad: 'unidad',
            marca: 'marca',
            cantidad: 2,
            precioInterno: 2500,
            precioCliente: 3000,
            costoInterno: 5000,
            costoCliente: 6000,
          },
        ],
      },
    ],
    servicios: [
      {
        nombre: 'Grupo Servicios 1',
        categoria: 'categoria-1',
        subtotalInterno: 2000,
        subtotalCliente: 2500,
        items: [
          {
            catalogoServicioId: 'servicio-1',
            categoria: 'categoria-1',
            costoHora: 100,
            margen: 1.25,
            nombre: 'Servicio test',
            horaTotal: 20,
            costoInterno: 2000,
            costoCliente: 2500,
          },
        ],
      },
    ],
    gastos: [
      {
        nombre: 'Grupo Gastos 1',
        descripcion: 'Descripción gastos',
        subtotalInterno: 1000,
        subtotalCliente: 1200,
        items: [
          {
            nombre: 'Gasto test',
            descripcion: 'Descripción gasto',
            cantidad: 1,
            precioUnitario: 1000,
            factorSeguridad: 1.1,
            margen: 1.2,
            costoInterno: 1000,
            costoCliente: 1200,
          },
        ],
      },
    ],
  }

  const mockProyecto = {
    id: 'proyecto-1',
    nombre: 'Proyecto Test',
    codigo: 'CLI00101',
    estado: 'en_planificacion',
    fechaInicio: new Date('2024-01-15'),
    fechaFin: new Date('2024-03-15'),
    clienteId: 'cliente-1',
    comercialId: 'comercial-1',
    gestorId: 'gestor-1',
    cotizacionId: 'cotizacion-1',
  }

  describe('POST /api/proyecto/from-cotizacion', () => {
    it('✅ should create project successfully with valid data', async () => {
      // Arrange
      const requestBody = {
        cotizacionId: 'cotizacion-1',
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        fechaFin: '2024-03-15',
        gestorId: 'gestor-1',
      }

      mockPrisma.cotizacion.findUnique.mockResolvedValue(mockCotizacion as any)
      mockPrisma.cliente.update.mockResolvedValue({ numeroSecuencia: 2 } as any)
      mockPrisma.proyecto.create.mockResolvedValue(mockProyecto as any)

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result).toEqual(mockProyecto)
      expect(mockPrisma.cotizacion.findUnique).toHaveBeenCalledWith({
        where: { id: 'cotizacion-1' },
        include: {
          cliente: true,
          equipos: { include: { items: true } },
          servicios: { include: { items: true } },
          gastos: { include: { items: true } },
        },
      })
      expect(mockPrisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 'cliente-1' },
        data: { numeroSecuencia: 2 },
      })
      expect(mockPrisma.proyecto.create).toHaveBeenCalled()
    })

    it('❌ should return 400 if cotizacionId is missing', async () => {
      // Arrange
      const requestBody = {
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        gestorId: 'gestor-1',
      }

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('cotización')
    })

    it('❌ should return 400 if cotización is not found', async () => {
      // Arrange
      const requestBody = {
        cotizacionId: 'invalid-id',
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        gestorId: 'gestor-1',
      }

      mockPrisma.cotizacion.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('Cotización no válida')
    })

    it('❌ should return 400 if cotización is not approved', async () => {
      // Arrange
      const requestBody = {
        cotizacionId: 'cotizacion-1',
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        gestorId: 'gestor-1',
      }

      const unapprovedCotizacion = { ...mockCotizacion, estado: 'borrador' }
      mockPrisma.cotizacion.findUnique.mockResolvedValue(unapprovedCotizacion as any)

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('no aprobada')
    })

    it('❌ should return 400 if required fields are missing', async () => {
      // Arrange
      const requestBody = {
        cotizacionId: 'cotizacion-1',
        // Missing nombre
        fechaInicio: '2024-01-15',
        gestorId: 'gestor-1',
      }

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toBeDefined()
    })

    it('✅ should generate correct project code with sequence', async () => {
      // Arrange
      const requestBody = {
        cotizacionId: 'cotizacion-1',
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        gestorId: 'gestor-1',
      }

      mockPrisma.cotizacion.findUnique.mockResolvedValue(mockCotizacion as any)
      mockPrisma.cliente.update.mockResolvedValue({ numeroSecuencia: 2 } as any)
      mockPrisma.proyecto.create.mockResolvedValue(mockProyecto as any)

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      await POST(request)

      // Assert
      const createCall = mockPrisma.proyecto.create.mock.calls[0][0]
      expect(createCall.data.codigo).toBe('CLI00101') // CLI001 + 01 (padded sequence)
    })

    it('✅ should calculate totals correctly from cotización data', async () => {
      // Arrange
      const requestBody = {
        cotizacionId: 'cotizacion-1',
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        gestorId: 'gestor-1',
      }

      mockPrisma.cotizacion.findUnique.mockResolvedValue(mockCotizacion as any)
      mockPrisma.cliente.update.mockResolvedValue({ numeroSecuencia: 2 } as any)
      mockPrisma.proyecto.create.mockResolvedValue(mockProyecto as any)

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      await POST(request)

      // Assert
      const createCall = mockPrisma.proyecto.create.mock.calls[0][0]
      expect(createCall.data.totalEquiposInterno).toBe(5000)
      expect(createCall.data.totalServiciosInterno).toBe(2000)
      expect(createCall.data.totalGastosInterno).toBe(1000)
      expect(createCall.data.totalInterno).toBe(8000)
      expect(createCall.data.totalCliente).toBe(10000)
      expect(createCall.data.descuento).toBe(5)
      expect(createCall.data.grandTotal).toBe(9500)
    })

    it('❌ should return 500 on database error', async () => {
      // Arrange
      const requestBody = {
        cotizacionId: 'cotizacion-1',
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        gestorId: 'gestor-1',
      }

      mockPrisma.cotizacion.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(result.error).toContain('Error interno')
    })
  })
})