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
      // Mock GET equipo response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEquipoData
        } as Response)
        // Mock POST create item response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'new-item-id',
            cotizacionEquipoId: 'cotizacion-equipo-1',
            codigo: 'EQ-001',
            descripcion: 'Equipo de prueba',
            categoria: 'Categoría Test',
            unidad: 'pza',
            marca: 'Marca Test',
            precioInterno: 100,
            precioCliente: 130,
            cantidad: 2,
            costoInterno: 200,
            costoCliente: 260
          })
        } as Response)

      const result = await createCotizacionEquipoItem(mockServiceData)

      // Verify GET equipo call
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'http://localhost:3000/api/catalogo-equipo/equipo-1')

      // Verify POST create item call
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/cotizacion-equipo-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacionEquipoId: 'cotizacion-equipo-1',
          catalogoEquipoId: 'equipo-1',
          codigo: 'EQ-001',
          descripcion: 'Equipo de prueba',
          categoria: 'Categoría Test',
          unidad: 'pza',
          marca: 'Marca Test',
          precioInterno: 100,
          precioCliente: 130,
          cantidad: 2,
          costoInterno: 200,
          costoCliente: 260
        })
      })

      expect(result.id).toBe('new-item-id')
    })

    it('should handle missing categoria gracefully', async () => {
      const equipoSinCategoria = {
        ...mockEquipoData,
        categoria: null
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => equipoSinCategoria
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'new-item-id' })
        } as Response)

      await createCotizacionEquipoItem(mockServiceData)

      const createCall = mockFetch.mock.calls[1]
      const payload = JSON.parse(createCall[1]?.body as string)
      expect(payload.categoria).toBe('Sin categoría')
    })

    it('should handle missing unidad gracefully', async () => {
      const equipoSinUnidad = {
        ...mockEquipoData,
        unidad: null
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => equipoSinUnidad
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'new-item-id' })
        } as Response)

      await createCotizacionEquipoItem(mockServiceData)

      const createCall = mockFetch.mock.calls[1]
      const payload = JSON.parse(createCall[1]?.body as string)
      expect(payload.unidad).toBe('pza')
    })

    it('should throw error when equipo fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response)

      await expect(createCotizacionEquipoItem(mockServiceData))
        .rejects.toThrow('Error al obtener datos del equipo')
    })

    it('should throw error when create item fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEquipoData
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Campo faltante: codigo' })
        } as Response)

      await expect(createCotizacionEquipoItem(mockServiceData))
        .rejects.toThrow('Campo faltante: codigo')
    })

    it('should calculate costs correctly', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEquipoData
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'new-item-id' })
        } as Response)

      const serviceData = {
        ...mockServiceData,
        cantidad: 3,
        precioUnitario: 150
      }

      await createCotizacionEquipoItem(serviceData)

      const createCall = mockFetch.mock.calls[1]
      const payload = JSON.parse(createCall[1]?.body as string)
      
      expect(payload.costoInterno).toBe(300) // 100 * 3
      expect(payload.costoCliente).toBe(450) // 150 * 3
    })
  })
})
