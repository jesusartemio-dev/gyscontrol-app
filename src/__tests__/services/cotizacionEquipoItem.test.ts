// ===================================================
// 📁 Archivo: cotizacionEquipoItem.test.ts
// 📌 Ubicación: src/lib/services/__tests__/
// 🔧 Descripción: Tests para el servicio de cotización equipo items
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-01-27
// ===================================================

import { createCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'
import { buildApiUrl } from '@/lib/utils'

// Mock fetch globally
global.fetch = jest.fn()

// Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => `http://localhost:3000${path}`)
}))

const mockFetch = fetch as jest.MockedFunction<typeof fetch>
const mockBuildApiUrl = buildApiUrl as jest.MockedFunction<typeof buildApiUrl>

describe('cotizacionEquipoItem service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBuildApiUrl.mockImplementation((path: string) => `http://localhost:3000${path}`)
  })

  describe('createCotizacionEquipoItem', () => {
    const mockEquipoData = {
      id: 'equipo-1',
      codigo: 'EQ-001',
      descripcion: 'Equipo de prueba',
      marca: 'Marca Test',
      precioInterno: 100,
      precioVenta: 130,
      categoria: { nombre: 'Categoría Test' },
      unidad: { nombre: 'pza' }
    }

    const mockServiceData = {
      cotizacionEquipoId: 'cotizacion-equipo-1',
      catalogoEquipoId: 'equipo-1',
      cantidad: 2,
      precioUnitario: 130,
      observaciones: 'Test observaciones'
    }

    it('should create cotizacion equipo item successfully', async () => {
      // Mock POST create response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-item-id',
          ...mockServiceData
        })
      } as Response)

      const result = await createCotizacionEquipoItem(mockServiceData)

      expect(result).toBeDefined()
      expect(result.id).toBe('new-item-id')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should use correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-item-id' })
      } as Response)

      await createCotizacionEquipoItem(mockServiceData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cotizacion-equipo-item',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should validate required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-item-id' })
      } as Response)

      await createCotizacionEquipoItem(mockServiceData)

      const createCall = mockFetch.mock.calls[0]
      const payload = JSON.parse(createCall[1]?.body as string)
      
      expect(payload).toHaveProperty('cotizacionEquipoId')
      expect(payload).toHaveProperty('catalogoEquipoId')
      expect(payload).toHaveProperty('cantidad')
      expect(payload).toHaveProperty('precioUnitario')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(createCotizacionEquipoItem(mockServiceData))
        .rejects.toThrow('Network error')
    })

    it('should throw error when create item fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      } as Response)

      await expect(createCotizacionEquipoItem(mockServiceData))
        .rejects.toThrow()
    })

    it('should send correct payload structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-item-id' })
      } as Response)

      const serviceData = {
        ...mockServiceData,
        cantidad: 3,
        precioUnitario: 150
      }

      await createCotizacionEquipoItem(serviceData)

      const createCall = mockFetch.mock.calls[0]
      const payload = JSON.parse(createCall[1]?.body as string)
      
      expect(payload.cotizacionEquipoId).toBe(serviceData.cotizacionEquipoId)
      expect(payload.catalogoEquipoId).toBe(serviceData.catalogoEquipoId)
      expect(payload.cantidad).toBe(3)
      expect(payload.precioUnitario).toBe(150)
    })
  })
})
