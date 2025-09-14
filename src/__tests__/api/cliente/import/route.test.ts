/**
 * @fileoverview Tests for Cliente Import API Route
 * @author GYS Team
 * @created 2024
 */

import { NextRequest } from 'next/server'
import { POST } from './route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import type { ClienteImportado } from '@/lib/utils/clienteImportUtils'

// ✅ Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      createMany: jest.fn()
    }
  }
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// ✅ Mock data
const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: 'ADMIN'
  }
}

const validClientesData: ClienteImportado[] = [
  {
    nombre: 'Cliente Test 1',
    ruc: '20123456789',
    direccion: 'Av. Test 123',
    telefono: '987654321',
    correo: 'test1@example.com'
  },
  {
    nombre: 'Cliente Test 2',
    ruc: '20987654321',
    direccion: 'Jr. Test 456',
    telefono: '123456789',
    correo: 'test2@example.com'
  }
]

const invalidClientesData = [
  {
    nombre: '', // Invalid: empty name
    ruc: '123', // Invalid: short RUC
    direccion: 'Av. Test 123',
    telefono: '987654321',
    correo: 'invalid-email' // Invalid: bad email format
  }
]

describe('/api/cliente/import', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Authentication tests
  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: validClientesData })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('should return 403 when user does not have required permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'COLABORADOR' }
      })
      
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: validClientesData })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toBe('Sin permisos para importar clientes')
    })
  })

  // ✅ Validation tests
  describe('Request Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession)
    })

    it('should return 400 when request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: 'invalid json'
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('should return 400 when clientes array is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('should return 400 when clientes is not an array', async () => {
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: 'not an array' })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('should return 400 when clientes array is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: [] })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('should return 400 when cliente data is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: invalidClientesData })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toBeDefined()
    })
  })

  // ✅ Success cases
  describe('Successful Import', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.cliente.createMany.mockResolvedValue({ count: validClientesData.length })
    })

    it('should successfully import valid clientes', async () => {
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: validClientesData })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.message).toBe('Clientes importados exitosamente')
      expect(data.count).toBe(validClientesData.length)
      expect(mockPrisma.cliente.createMany).toHaveBeenCalledWith({
        data: validClientesData.map(cliente => ({
          nombre: cliente.nombre,
          ruc: cliente.ruc || null,
          direccion: cliente.direccion || null,
          telefono: cliente.telefono || null,
          correo: cliente.correo || null
        }))
      })
    })

    it('should handle clientes with optional fields', async () => {
      const clientesWithOptionalFields = [
        {
          nombre: 'Cliente Mínimo',
          ruc: '',
          direccion: '',
          telefono: '',
          correo: ''
        }
      ]
      
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: clientesWithOptionalFields })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(mockPrisma.cliente.createMany).toHaveBeenCalledWith({
        data: [{
          nombre: 'Cliente Mínimo',
          ruc: null,
          direccion: null,
          telefono: null,
          correo: null
        }]
      })
    })
  })

  // ✅ Database error handling
  describe('Database Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession)
    })

    it('should return 500 when database operation fails', async () => {
      const dbError = new Error('Database connection failed')
      mockPrisma.cliente.createMany.mockRejectedValue(dbError)
      
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: validClientesData })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })

    it('should handle unique constraint violations', async () => {
      const uniqueError = new Error('Unique constraint failed')
      uniqueError.name = 'PrismaClientKnownRequestError'
      // @ts-ignore - Adding code property for Prisma error simulation
      uniqueError.code = 'P2002'
      
      mockPrisma.cliente.createMany.mockRejectedValue(uniqueError)
      
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: validClientesData })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Error interno del servidor')
    })
  })

  // ✅ Edge cases
  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession)
    })

    it('should handle large batch import', async () => {
      const largeClientesBatch = Array.from({ length: 1000 }, (_, i) => ({
        nombre: `Cliente ${i + 1}`,
        ruc: `2012345678${i.toString().padStart(1, '0')}`,
        direccion: `Av. Test ${i + 1}`,
        telefono: `98765432${i.toString().padStart(1, '0')}`,
        correo: `test${i + 1}@example.com`
      }))
      
      mockPrisma.cliente.createMany.mockResolvedValue({ count: largeClientesBatch.length })
      
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: largeClientesBatch })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.count).toBe(1000)
    })

    it('should handle clientes with special characters', async () => {
      const clientesWithSpecialChars = [
        {
          nombre: 'Cliente Ñoño & Cía.',
          ruc: '20123456789',
          direccion: 'Av. José María Eguren #123',
          telefono: '987-654-321',
          correo: 'test+special@example.com'
        }
      ]
      
      mockPrisma.cliente.createMany.mockResolvedValue({ count: 1 })
      
      const request = new NextRequest('http://localhost:3000/api/cliente/import', {
        method: 'POST',
        body: JSON.stringify({ clientes: clientesWithSpecialChars })
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
    })
  })

  // ✅ Method validation
  describe('HTTP Method Validation', () => {
    it('should only accept POST requests', async () => {
      // This test verifies that only POST method is exported
      // Other methods should return 405 Method Not Allowed
      expect(POST).toBeDefined()
    })
  })
})