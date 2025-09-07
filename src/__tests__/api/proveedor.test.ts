// ===================================================
// 📁 Archivo: proveedor.test.ts
// 📌 Ubicación: src/__tests__/api/
// 🔧 Descripción: Tests para la API de proveedores
//
// 🧠 Uso: Verificar endpoints CRUD de proveedores
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/proveedor/route'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    proveedor: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('/api/proveedor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
  })

  describe('GET /api/proveedor', () => {
    it('returns all providers successfully', async () => {
      const mockProviders = [
        {
          id: '1',
          nombre: 'CEYESA',
          ruc: '20545610672',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          nombre: 'SODIMAC',
          ruc: '20100070970',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ]

      ;(prisma.proveedor.findMany as jest.Mock).mockResolvedValue(mockProviders)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockProviders)
      expect(prisma.proveedor.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      })
    })

    it('handles database error', async () => {
      ;(prisma.proveedor.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Error interno del servidor',
      })
    })
  })

  describe('POST /api/proveedor', () => {
    it('creates provider successfully', async () => {
      const newProvider = {
        nombre: 'NUEVO PROVEEDOR',
        ruc: '12345678901',
      }

      const createdProvider = {
        id: 'new-id',
        ...newProvider,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.proveedor.create as jest.Mock).mockResolvedValue(createdProvider)

      const request = new NextRequest('http://localhost:3000/api/proveedor', {
        method: 'POST',
        body: JSON.stringify(newProvider),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(createdProvider)
      expect(prisma.proveedor.create).toHaveBeenCalledWith({
        data: newProvider,
      })
    })

    it('validates required fields', async () => {
      const invalidProvider = {
        ruc: '12345678901',
        // nombre is missing
      }

      const request = new NextRequest('http://localhost:3000/api/proveedor', {
        method: 'POST',
        body: JSON.stringify(invalidProvider),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('nombre')
      expect(prisma.proveedor.create).not.toHaveBeenCalled()
    })

    it('validates RUC format', async () => {
      const invalidProvider = {
        nombre: 'Test Provider',
        ruc: 'invalid-ruc',
      }

      const request = new NextRequest('http://localhost:3000/api/proveedor', {
        method: 'POST',
        body: JSON.stringify(invalidProvider),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('RUC')
      expect(prisma.proveedor.create).not.toHaveBeenCalled()
    })

    it('handles database error during creation', async () => {
      const newProvider = {
        nombre: 'NUEVO PROVEEDOR',
        ruc: '12345678901',
      }

      ;(prisma.proveedor.create as jest.Mock).mockRejectedValue(
        new Error('Unique constraint violation')
      )

      const request = new NextRequest('http://localhost:3000/api/proveedor', {
        method: 'POST',
        body: JSON.stringify(newProvider),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Error interno del servidor',
      })
    })

    it('handles invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/proveedor', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(prisma.proveedor.create).not.toHaveBeenCalled()
    })
  })
})