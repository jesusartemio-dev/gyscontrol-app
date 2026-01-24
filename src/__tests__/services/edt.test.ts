// ===================================================
// 📁 Archivo: edt.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de EDT
// 🧠 Uso: Testing de servicios CRUD de EDT
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2026-01-22
// ===================================================

import {
  getEdtById,
  getEdts,
  createEdt,
  updateEdt,
  deleteEdt
} from '@/lib/services/edt'
import { buildApiUrl } from '@/lib/utils'
import type { Edt } from '@/types'
import type { EdtPayload } from '@/types/payloads'

// ✅ Mock fetch globally
global.fetch = jest.fn()

// ✅ Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => path)
}))

const mockEdt: Edt = {
  id: '1',
  nombre: 'EDT de prueba',
  descripcion: 'Descripción de prueba',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

const mockCreateData = {
  nombre: 'Nuevo EDT',
  descripcion: 'Nueva descripción'
}

const mockUpdatePayload: EdtPayload = {
  nombre: 'EDT actualizado',
  descripcion: 'Descripción actualizada'
}

describe('EDT Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getEdtById', () => {
    it('should get EDT by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEdt
      } as Response)

      const result = await getEdtById('1')

      expect(buildApiUrl).toHaveBeenCalledWith('/api/edt/1')
      expect(fetch).toHaveBeenCalledWith('/api/edt/1')
      expect(result).toEqual(mockEdt)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getEdtById('1')).rejects.toThrow('Error al obtener EDT por ID')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getEdtById('1')).rejects.toThrow('Network error')
    })
  })

  describe('getEdts', () => {
    it('should get all EDTs successfully', async () => {
      const mockEdts = [mockEdt]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEdts
      } as Response)

      const result = await getEdts()

      expect(buildApiUrl).toHaveBeenCalledWith('/api/edt')
      expect(fetch).toHaveBeenCalledWith('/api/edt')
      expect(result).toEqual(mockEdts)
    })

    it('should throw error when fetch fails with error data', async () => {
      const errorData = { error: 'Custom error message' }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => errorData
      } as Response)

      await expect(getEdts()).rejects.toThrow('Custom error message')
    })

    it('should throw default error when fetch fails without error data', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      } as Response)

      await expect(getEdts()).rejects.toThrow('Error al obtener EDTs')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getEdts()).rejects.toThrow('Network error')
    })
  })

  describe('createEdt', () => {
    it('should create EDT successfully', async () => {
      const expectedResult = { ...mockEdt, ...mockCreateData }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await createEdt(mockCreateData)

      expect(buildApiUrl).toHaveBeenCalledWith('/api/edt')
      expect(fetch).toHaveBeenCalledWith('/api/edt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCreateData)
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when creation fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(createEdt(mockCreateData)).rejects.toThrow('Error al crear EDT')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(createEdt(mockCreateData)).rejects.toThrow('Network error')
    })
  })

  describe('updateEdt', () => {
    it('should update EDT successfully', async () => {
      const expectedResult = { ...mockEdt, ...mockUpdatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await updateEdt('1', mockUpdatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/edt/1', {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' }
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when update fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(updateEdt('1', mockUpdatePayload)).rejects.toThrow('Error al actualizar EDT')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateEdt('1', mockUpdatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('deleteEdt', () => {
    it('should delete EDT successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEdt
      } as Response)

      const result = await deleteEdt('1')

      expect(fetch).toHaveBeenCalledWith('/api/edt/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockEdt)
    })

    it('should throw error when deletion fails with error data', async () => {
      const errorData = { error: 'Delete failed' }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => errorData
      } as Response)

      await expect(deleteEdt('1')).rejects.toThrow('Error al eliminar EDT')
    })

    it('should throw error when deletion fails without valid JSON', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error('Invalid JSON') }
      } as Response)

      await expect(deleteEdt('1')).rejects.toThrow('Error al eliminar EDT')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(deleteEdt('1')).rejects.toThrow('Network error')
    })
  })
})
