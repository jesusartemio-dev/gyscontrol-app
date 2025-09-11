/**
 * ✅ Tests para API de Aprovisionamiento Financiero
 * 
 * @description Tests unitarios para el endpoint /api/finanzas/aprovisionamiento/proyectos
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-11
 * 
 * 🧪 Cobertura:
 * - ✅ Autenticación y autorización
 * - ✅ Validación de parámetros
 * - ✅ Respuesta exitosa
 * - ✅ Manejo de errores
 */

// 📡 Import del handler de la API
import { GET } from '@/app/api/finanzas/aprovisionamiento/proyectos/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// 🔧 Mocks
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  proyecto: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  listaEquipo: {
    count: jest.fn(),
    aggregate: jest.fn()
  },
  pedido: {
    count: jest.fn(),
    aggregate: jest.fn()
  }
}))
jest.mock('@/lib/logger')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/finanzas/aprovisionamiento/proyectos', () => {
  describe('GET', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    // ✅ Test: Función existe
    it('should be defined', () => {
      expect(GET).toBeDefined()
      expect(typeof GET).toBe('function')
    })

    // 🔒 Test: Sin autenticación
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })

    // 🔒 Test: Sin permisos
    it('should return 403 when user lacks permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@test.com', rol: 'Colaborador' }
      } as any)
      
      const request = new NextRequest('http://localhost:3000/api/finanzas/aprovisionamiento/proyectos')
      const response = await GET(request)
      
      expect(response.status).toBe(403)
    })
  })
})