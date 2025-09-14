// ===================================================
// 📁 Archivo: unidad.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de unidades
// 🧠 Uso: Testing de servicios CRUD de unidades
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getUnidades,
  createUnidad,
  updateUnidad,
  deleteUnidad
} from '@/lib/services/unidad'
import { buildApiUrl } from '@/lib/utils'
import type { Unidad, UnidadPayload, UnidadUpdatePayload } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

// ✅ Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => path)
}))

const mockUnidad: Unidad = {
  id: '1',
  nombre: 'Unidad de prueba',
  simbolo: 'UP',
  descripcion: 'Descripción de prueba',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockCreatePayload: UnidadPayload = {
  nombre: 'Nueva unidad',
  simbolo: 'NU',
  descripcion: 'Nueva descripción'
}

const mockUpdatePayload: UnidadUpdatePayload = {
  nombre: 'Unidad actualizada',
  simbolo: 'UA',
  descripcion: 'Descripción actualizada'
}

describe('Unidad Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getUnidades', () => {
    it('should get all unidades successfully', async () => {
      const mockUnidades = [mockUnidad]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnidades
      } as Response)

      const result = await getUnidades()

      expect(buildApiUrl).toHaveBeenCalledWith('/api/unidad')
      expect(fetch).toHaveBeenCalledWith('/api/unidad', { cache: 'no-store' })
      expect(result).toEqual(mockUnidades)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getUnidades()).rejects.toThrow('Error al obtener unidades')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getUnidades()).rejects.toThrow('Network error')
    })
  })

  describe('createUnidad', () => {
    it('should create unidad successfully', async () => {
      const expectedResult = { ...mockUnidad, ...mockCreatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await createUnidad(mockCreatePayload)

      expect(buildApiUrl).toHaveBeenCalledWith('/api/unidad')
      expect(fetch).toHaveBeenCalledWith('/api/unidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCreatePayload)
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when creation fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(createUnidad(mockCreatePayload)).rejects.toThrow('Error al crear unidad')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(createUnidad(mockCreatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('updateUnidad', () => {
    it('should update unidad successfully', async () => {
      const expectedResult = { ...mockUnidad, ...mockUpdatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await updateUnidad('1', mockUpdatePayload)

      expect(buildApiUrl).toHaveBeenCalledWith('/api/unidad/1')
      expect(fetch).toHaveBeenCalledWith('/api/unidad/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdatePayload)
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when update fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(updateUnidad('1', mockUpdatePayload)).rejects.toThrow('Error al actualizar unidad')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateUnidad('1', mockUpdatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('deleteUnidad', () => {
    it('should delete unidad successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true
      } as Response)

      await deleteUnidad('1')

      expect(buildApiUrl).toHaveBeenCalledWith('/api/unidad/1')
      expect(fetch).toHaveBeenCalledWith('/api/unidad/1', {
        method: 'DELETE'
      })
    })

    it('should throw error when deletion fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(deleteUnidad('1')).rejects.toThrow('Error al eliminar unidad')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(deleteUnidad('1')).rejects.toThrow('Network error')
    })
  })
})