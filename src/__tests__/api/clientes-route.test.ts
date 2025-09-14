// src/__tests__/api/clientes-route.test.ts
import { DELETE } from '../../app/api/clientes/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// 🧪 Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    cotizacion: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/clientes DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete cliente successfully when no dependencies exist', async () => {
    // 🎭 Arrange
    const clienteId = 'cliente-123'
    const mockCliente = {
      id: clienteId,
      nombre: 'Cliente Test',
      cotizaciones: [],
      proyectos: [],
    }

    mockPrisma.cliente.findUnique.mockResolvedValue(mockCliente)
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma)
    })
    mockPrisma.cliente.delete.mockResolvedValue(mockCliente as any)

    const request = new NextRequest('http://localhost:3000/api/clientes', {
      method: 'DELETE',
      body: JSON.stringify({ id: clienteId }),
    })

    // 🎬 Act
    const response = await DELETE(request)
    const data = await response.json()

    // 🎯 Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(mockPrisma.cliente.findUnique).toHaveBeenCalledWith({
      where: { id: clienteId },
      include: {
        cotizaciones: { select: { id: true } },
        proyectos: { select: { id: true } },
      },
    })
    expect(mockPrisma.cliente.delete).toHaveBeenCalledWith({ where: { id: clienteId } })
  })

  it('should return 404 when cliente does not exist', async () => {
    // 🎭 Arrange
    const clienteId = 'nonexistent-cliente'
    mockPrisma.cliente.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/clientes', {
      method: 'DELETE',
      body: JSON.stringify({ id: clienteId }),
    })

    // 🎬 Act
    const response = await DELETE(request)
    const data = await response.json()

    // 🎯 Assert
    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Cliente no encontrado' })
    expect(mockPrisma.cliente.delete).not.toHaveBeenCalled()
  })

  it('should return 400 when cliente has associated projects', async () => {
    // 🎭 Arrange
    const clienteId = 'cliente-with-projects'
    const mockCliente = {
      id: clienteId,
      nombre: 'Cliente con Proyectos',
      cotizaciones: [],
      proyectos: [{ id: 'proyecto-1' }, { id: 'proyecto-2' }],
    }

    mockPrisma.cliente.findUnique.mockResolvedValue(mockCliente)

    const request = new NextRequest('http://localhost:3000/api/clientes', {
      method: 'DELETE',
      body: JSON.stringify({ id: clienteId }),
    })

    // 🎬 Act
    const response = await DELETE(request)
    const data = await response.json()

    // 🎯 Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe('No se puede eliminar el cliente porque tiene proyectos asociados')
    expect(data.details).toBe('El cliente tiene 2 proyecto(s) asociado(s)')
    expect(mockPrisma.cliente.delete).not.toHaveBeenCalled()
  })

  it('should delete cliente with cotizaciones in transaction', async () => {
    // 🎭 Arrange
    const clienteId = 'cliente-with-cotizaciones'
    const mockCliente = {
      id: clienteId,
      nombre: 'Cliente con Cotizaciones',
      cotizaciones: [{ id: 'cotizacion-1' }, { id: 'cotizacion-2' }],
      proyectos: [],
    }

    mockPrisma.cliente.findUnique.mockResolvedValue(mockCliente)
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma)
    })
    mockPrisma.cotizacion.deleteMany.mockResolvedValue({ count: 2 })
    mockPrisma.cliente.delete.mockResolvedValue(mockCliente as any)

    const request = new NextRequest('http://localhost:3000/api/clientes', {
      method: 'DELETE',
      body: JSON.stringify({ id: clienteId }),
    })

    // 🎬 Act
    const response = await DELETE(request)
    const data = await response.json()

    // 🎯 Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.cotizacion.deleteMany).toHaveBeenCalledWith({
      where: { clienteId },
    })
    expect(mockPrisma.cliente.delete).toHaveBeenCalledWith({ where: { id: clienteId } })
  })

  it('should return 500 when database error occurs', async () => {
    // 🎭 Arrange
    const clienteId = 'cliente-error'
    mockPrisma.cliente.findUnique.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/clientes', {
      method: 'DELETE',
      body: JSON.stringify({ id: clienteId }),
    })

    // 🎬 Act
    const response = await DELETE(request)
    const data = await response.json()

    // 🎯 Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe('Error interno del servidor al eliminar cliente')
  })
})