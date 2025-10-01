// ===================================================
// 📁 Archivo: import.test.ts
// 📌 Ubicación: src/__tests__/api/proveedor/import.test.ts
// 🔧 Descripción: Tests para API de importación masiva de proveedores
// 🧠 Uso: Verifica la funcionalidad de importación masiva
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { POST } from '@/app/api/proveedor/import/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'

// 🔧 Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    proveedor: {
      create: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = require('@/lib/prisma').prisma

describe('/api/proveedor/import', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should import providers successfully', async () => {
      // ✅ Setup
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@test.com' }
      } as any)

      const mockProveedores = [
        {
          id: '1',
          nombre: 'Proveedor Test 1',
          ruc: '12345678901',
          direccion: 'Av. Test 123',
          telefono: '123456789',
          correo: 'test1@test.com',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          nombre: 'Proveedor Test 2',
          ruc: '12345678902',
          direccion: 'Av. Test 456',
          telefono: '987654321',
          correo: 'test2@test.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.proveedor.create
        .mockResolvedValueOnce(mockProveedores[0])
        .mockResolvedValueOnce(mockProveedores[1])

      const requestBody = {
        proveedores: [
          {
            nombre: 'Proveedor Test 1',
            ruc: '12345678901',
            direccion: 'Av. Test 123',
            telefono: '123456789',
            correo: 'test1@test.com'
          },
          {
            nombre: 'Proveedor Test 2',
            ruc: '12345678902',
            direccion: 'Av. Test 456',
            telefono: '987654321',
            correo: 'test2@test.com'
          }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/proveedor/import', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // 📡 Execute
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.message).toBe('2 proveedores importados exitosamente')
      expect(data.creados).toBe(2)
      expect(data.total).toBe(2)
      expect(mockPrisma.proveedor.create).toHaveBeenCalledTimes(2)
    })

    it('should return 401 when not authenticated', async () => {
      // ✅ Setup
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/proveedor/import', {
        method: 'POST',
        body: JSON.stringify({ proveedores: [] }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // 📡 Execute
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('should return 400 for invalid data', async () => {
      // ✅ Setup
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@test.com' }
      } as any)

      const request = new NextRequest('http://localhost:3000/api/proveedor/import', {
        method: 'POST',
        body: JSON.stringify({ proveedores: [{ nombre: '' }] }), // Invalid: empty name
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // 📡 Execute
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos de entrada inválidos')
    })

    it('should handle database errors gracefully', async () => {
      // ✅ Setup
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@test.com' }
      } as any)

      mockPrisma.proveedor.create.mockRejectedValue(new Error('Database error'))

      const requestBody = {
        proveedores: [
          {
            nombre: 'Proveedor Test',
            ruc: '12345678901'
          }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/proveedor/import', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // 📡 Execute
      const response = await POST(request)
      const data = await response.json()

      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.creados).toBe(0) // No providers created due to error
      expect(data.total).toBe(1)
    })
  })
})
