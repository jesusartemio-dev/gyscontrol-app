/**
 * @jest-environment node
 * Tests para aprovisionamientoClient.ts - Servicios de aprovisionamiento
 * Ejecutar con: npm run test:server
 */

import { listasEquipoClientService, pedidosEquipoClientService } from '../aprovisionamientoClient'

// 🔧 Mock fetch global
global.fetch = jest.fn()

// 🔧 Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => `http://localhost:3000${path}`)
}))

describe('aprovisionamientoClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('listasEquipoClientService.obtenerListas', () => {
    it('should handle null API response gracefully', async () => {
      // ✅ Simular respuesta null de la API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      })

      const result = await listasEquipoClientService.obtenerListas()

      expect(result).toEqual({
        success: false,
        data: {
          listas: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
          }
        },
        timestamp: expect.any(String)
      })
    })

    it('should handle non-array API response gracefully', async () => {
      // ✅ Simular respuesta que no es array de la API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('invalid response')
      })

      const result = await listasEquipoClientService.obtenerListas()

      expect(result.success).toBe(false)
      expect(result.data.listas).toEqual([])
      expect(result.data.pagination.total).toBe(0)
    })

    it('should handle valid API response correctly', async () => {
      // ✅ Simular respuesta válida de la API - ahora devuelve directamente un array
      const mockApiResponse = [
        {
          id: '1',
          nombre: 'Lista Test',
          descripcion: 'Lista de prueba',
          codigo: 'LEQ-001',
          estado: 'por_revisar',
          coherencia: { porcentajeEjecutado: 85.7 }
        },
        {
          id: '2',
          nombre: 'Lista Test 2',
          descripcion: 'Segunda lista de prueba',
          codigo: 'LEQ-002',
          estado: 'aprobado',
          coherencia: 75
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await listasEquipoClientService.obtenerListas({ page: 1, limit: 20 })

      expect(result.success).toBe(true)
      expect(result.data.listas).toHaveLength(2)
      expect(result.data.listas[0].id).toBe('1')
      expect(result.data.listas[0].nombre).toBe('Lista Test')
      expect(result.data.listas[0].coherencia).toBe(86) // rounded from 85.7
      expect(result.data.listas[1].coherencia).toBe(75) // number stays as is
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false
      })
    })

    it('should handle API error response', async () => {
      // ✅ Simular error de la API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(listasEquipoClientService.obtenerListas()).rejects.toThrow()
    })
  })

  describe('pedidosEquipoClientService.obtenerPedidos', () => {
    it('should handle null API response gracefully', async () => {
      // ✅ Simular respuesta null de la API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      })

      const result = await pedidosEquipoClientService.obtenerPedidos()

      expect(result).toEqual({
        success: false,
        data: {
          pedidos: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
          }
        },
        timestamp: expect.any(String)
      })
    })

    it('should handle valid API response correctly', async () => {
      // ✅ Simular respuesta válida de la API
      const mockApiResponse = {
        success: true,
        data: [
          {
            id: '1',
            numero: 'PED-001',
            estado: 'pendiente'
          }
        ],
        estadisticas: {
          pagina: 1,
          limite: 20,
          total: 1,
          totalPaginas: 1
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await pedidosEquipoClientService.obtenerPedidos()

      expect(result.success).toBe(true)
      expect(result.data.pedidos).toHaveLength(1)
      expect(result.data.pedidos[0].numero).toBe('PED-001')
      expect(result.data.pagination.total).toBe(1)
    })
  })

  describe('buildQueryParams', () => {
    it('should build query params correctly with filters', async () => {
      const mockApiResponse = {
        success: true,
        data: [],
        estadisticas: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      await listasEquipoClientService.obtenerListas({
        proyectoId: 'proj-1',
        estado: ['pendiente'],
        page: 2,
        limit: 10
      })

      // ✅ Verificar que fetch fue llamado con los parámetros correctos
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/listas-equipo?proyectoId=proj-1&estado=pendiente&page=2&limit=10',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      )
    })
  })
})
