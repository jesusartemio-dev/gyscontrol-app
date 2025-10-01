// ===================================================
// 📁 Archivo: proyecto.test.ts
// 📌 Tests para el servicio de proyectos
// ===================================================

import { crearProyectoDesdeCotizacion, getProyectoById } from '@/lib/services/proyecto'
import { buildApiUrl } from '@/lib/utils'

// ✅ Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// ✅ Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn(),
}))
const mockBuildApiUrl = buildApiUrl as jest.MockedFunction<typeof buildApiUrl>

describe('Proyecto Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBuildApiUrl.mockImplementation((path) => `http://localhost:3000${path}`)
  })

  describe('crearProyectoDesdeCotizacion', () => {
    const mockProyectoData = {
      nombre: 'Proyecto Test',
      fechaInicio: '2024-01-15',
      fechaFin: '2024-03-15',
      gestorId: 'gestor-1',
    }

    const mockProyectoResponse = {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      codigo: 'CLI00101',
      estado: 'en_planificacion',
      fechaInicio: '2024-01-15T00:00:00.000Z',
      fechaFin: '2024-03-15T00:00:00.000Z',
      clienteId: 'cliente-1',
      comercialId: 'comercial-1',
      gestorId: 'gestor-1',
      cotizacionId: 'cotizacion-1',
    }

    it('✅ should create project successfully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProyectoResponse,
      } as Response)

      // Act
      const result = await crearProyectoDesdeCotizacion('cotizacion-1', mockProyectoData)

      // Assert
      expect(result).toEqual(mockProyectoResponse)
      expect(mockBuildApiUrl).toHaveBeenCalledWith('/api/proyecto/from-cotizacion')
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/proyecto/from-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacionId: 'cotizacion-1',
          ...mockProyectoData,
        }),
      })
    })

    it('❌ should throw error when API returns error', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response)

      // Act & Assert
      await expect(
        crearProyectoDesdeCotizacion('cotizacion-1', mockProyectoData)
      ).rejects.toThrow('Error al crear proyecto desde cotización')
    })

    it('❌ should throw error when fetch fails', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Act & Assert
      await expect(
        crearProyectoDesdeCotizacion('cotizacion-1', mockProyectoData)
      ).rejects.toThrow('Network error')
    })
  })

  describe('getProyectoById', () => {
    const mockProyecto = {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      codigo: 'CLI00101',
      estado: 'en_planificacion',
      fechaInicio: '2024-01-15T00:00:00.000Z',
      fechaFin: '2024-03-15T00:00:00.000Z',
      clienteId: 'cliente-1',
      comercialId: 'comercial-1',
      gestorId: 'gestor-1',
    }

    beforeEach(() => {
      // Reset environment for each test
      delete (global as any).window
      delete process.env.NEXTAUTH_URL
    })

    it('✅ should get project by id successfully (client-side)', async () => {
      // Arrange - simulate client-side environment
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProyecto,
      } as Response)

      // Act
      const result = await getProyectoById('proyecto-1')

      // Assert
      expect(result).toEqual(mockProyecto)
      expect(mockFetch).toHaveBeenCalledWith('/api/proyecto/proyecto-1', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      })

      // Cleanup
      delete (global as any).window
    })

    it('✅ should get project by id successfully (server-side with NEXTAUTH_URL)', async () => {
      // Arrange - simulate server-side environment
      delete (global as any).window
      process.env.NEXTAUTH_URL = 'http://localhost:3000'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProyecto,
      } as Response)

      // Act
      const result = await getProyectoById('proyecto-1')

      // Assert
      expect(result).toEqual(mockProyecto)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/proyecto/proyecto-1', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      })
    })

    it('✅ should return null when project not found', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      // Act
      const result = await getProyectoById('invalid-id')

      // Assert
      expect(result).toBeNull()
    })

    it('✅ should return null when API returns server error', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      // Act
      const result = await getProyectoById('proyecto-1')

      // Assert
      expect(result).toBeNull()
    })

    it('✅ should return null when fetch fails', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Act
      const result = await getProyectoById('proyecto-1')

      // Assert
      expect(result).toBeNull()
    })

    it('✅ should use default URL when NEXTAUTH_URL is not set (server-side)', async () => {
      // Arrange - simulate server-side environment without NEXTAUTH_URL
      delete (global as any).window
      delete process.env.NEXTAUTH_URL

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProyecto,
      } as Response)

      // Act
      const result = await getProyectoById('proyecto-1')

      // Assert
      expect(result).toEqual(mockProyecto)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/proyecto/proyecto-1', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      })
    })
  })
})
