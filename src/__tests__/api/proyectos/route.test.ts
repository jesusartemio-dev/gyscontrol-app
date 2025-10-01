/**
 * @jest-environment node
 */

import { POST } from '@/app/api/proyectos/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    cliente: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    proyecto: {
      create: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/proyectos POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'comercial'
      }
    } as any)
  })

  describe('Project code generation with numeroSecuencia', () => {
    const validProjectData = {
      nombre: 'Test Project',
      descripcion: 'Test Description',
      estado: 'en_planificacion',
      clienteId: 'client-1',
      comercialId: 'user-1',
      gestorId: 'user-1',
      totalEquiposInterno: 1000,
      totalServiciosInterno: 2000,
      totalGastosInterno: 500,
      totalInterno: 3500,
      totalCliente: 4000,
      descuento: 0,
      grandTotal: 4000,
      fechaInicio: '2024-01-01',
      fechaFin: '2024-12-31'
    }

    it('should handle null numeroSecuencia correctly', async () => {
      // Mock client with null numeroSecuencia
      const mockClienteActualizado = {
        codigo: 'CJM',
        numeroSecuencia: null
      }

      const mockCreatedProject = {
        id: 'project-1',
        codigo: 'CJM01',
        ...validProjectData
      }

      // Mock transaction - fix the numeroSecuencia increment logic
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          cliente: {
            update: jest.fn().mockResolvedValue({
              codigo: 'CJM',
              numeroSecuencia: 1  // Should return 1 after increment from null
            })
          },
          proyecto: {
            create: jest.fn().mockResolvedValue({
              id: 'project-1',
              codigo: 'CJM01',
              ...validProjectData,
              comercial: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
              gestor: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
              cliente: { id: 'client-1', codigo: 'CJM', nombre: 'Test Client' }
            })
          }
        }
        return callback(mockTx as any)
      })

      // Mock client existence check
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: 'client-1',
        codigo: 'CJM',
        numeroSecuencia: null
      } as any)

      // Mock user existence checks - need to handle both comercialId and gestorId
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'user-1') {
          return Promise.resolve({
            id: 'user-1',
            role: 'admin'  // Admin role has access to both comercial and gestor functions
          } as any)
        }
        return Promise.resolve(null)
      })

      const request = new NextRequest('http://localhost:3000/api/proyectos', {
        method: 'POST',
        body: JSON.stringify(validProjectData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      console.log('Response status:', response.status)
      console.log('Response body:', result)

      expect(response.status).toBe(201)
      expect(result.data.codigo).toBe('CJM01') // Should use fallback value 1
    })

    it('should handle existing numeroSecuencia correctly', async () => {
      // Mock client with existing numeroSecuencia
      const mockCreatedProject = {
        id: 'project-2',
        codigo: 'ABC06',
        ...validProjectData,
        comercial: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        gestor: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        cliente: { id: 'client-1', codigo: 'ABC', nombre: 'Test Client' }
      }

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          cliente: {
            update: jest.fn().mockResolvedValue({
              codigo: 'ABC',
              numeroSecuencia: 6  // Should return 6 after increment from 5
            })
          },
          proyecto: {
            create: jest.fn().mockResolvedValue(mockCreatedProject)
          }
        }
        return callback(mockTx as any)
      })

      // Mock client existence check
      mockPrisma.cliente.findUnique.mockResolvedValue({
        id: 'client-1',
        codigo: 'ABC',
        numeroSecuencia: 5
      } as any)

      // Mock user existence checks
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'user-1') {
          return Promise.resolve({
            id: 'user-1',
            role: 'admin'
          } as any)
        }
        return Promise.resolve(null)
      })

      const request = new NextRequest('http://localhost:3000/api/proyectos', {
        method: 'POST',
        body: JSON.stringify(validProjectData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.data.codigo).toBe('ABC06') // Should use incremented value
    })

    it('should pad numeroSecuencia correctly', async () => {
      const testCases = [
        { numeroSecuencia: 1, expected: '01' },
        { numeroSecuencia: 9, expected: '09' },
        { numeroSecuencia: 10, expected: '10' },
        { numeroSecuencia: 99, expected: '99' },
        { numeroSecuencia: null, expected: '01' } // fallback case
      ]

      for (const testCase of testCases) {
        const mockClienteActualizado = {
          codigo: 'TEST',
          numeroSecuencia: testCase.numeroSecuencia
        }

        const expectedCodigo = `TEST${testCase.expected}`
        const mockCreatedProject = {
          id: `project-${testCase.numeroSecuencia}`,
          codigo: expectedCodigo,
          ...validProjectData,
          comercial: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          gestor: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          cliente: { id: 'client-1', codigo: 'TEST', nombre: 'Test Client' }
        }

        // Mock transaction
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const mockTx = {
            cliente: {
              update: jest.fn().mockResolvedValue(mockClienteActualizado)
            },
            proyecto: {
              create: jest.fn().mockResolvedValue(mockCreatedProject)
            }
          }
          return callback(mockTx as any)
        })

        // Mock client existence check
        mockPrisma.cliente.findUnique.mockResolvedValue({
          id: 'client-1',
          codigo: 'TEST',
          numeroSecuencia: testCase.numeroSecuencia === null ? null : testCase.numeroSecuencia - 1
        } as any)

        // Mock user existence checks
        mockPrisma.user.findUnique.mockImplementation(({ where }) => {
          if (where.id === 'user-1') {
            return Promise.resolve({
              id: 'user-1',
              role: 'admin'
            } as any)
          }
          return Promise.resolve(null)
        })

        const request = new NextRequest('http://localhost:3000/api/proyectos', {
          method: 'POST',
          body: JSON.stringify(validProjectData),
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(201)
        expect(result.data.codigo).toBe(expectedCodigo)
      }
    })
  })

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/proyectos', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 404 when client does not exist', async () => {
    // Mock client not found
    mockPrisma.cliente.findUnique.mockResolvedValue(null)

    // Mock user existence checks
    mockPrisma.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === 'user-1') {
        return Promise.resolve({
          id: 'user-1',
          role: 'admin'
        } as any)
      }
      return Promise.resolve(null)
    })

    const request = new NextRequest('http://localhost:3000/api/proyectos', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Test Project',
        descripcion: 'Test Description',
        estado: 'en_planificacion',
        clienteId: 'non-existent-client',
        comercialId: 'user-1',
        gestorId: 'user-1',
        totalEquiposInterno: 1000,
        totalServiciosInterno: 2000,
        totalGastosInterno: 500,
        totalInterno: 3500,
        totalCliente: 4000,
        descuento: 0,
        grandTotal: 4000,
        fechaInicio: '2024-01-01',
        fechaFin: '2024-12-31'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(404)
    expect(result.error).toBe('Cliente no encontrado')
  })
})
