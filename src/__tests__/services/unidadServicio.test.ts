// ===================================================
// 📁 Archivo: unidadServicio.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de unidades de servicio
// 🧠 Uso: Testing de servicios CRUD de unidades de servicio
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getUnidadesServicio,
  getUnidadServicioById,
  createUnidadServicio,
  updateUnidadServicio,
  deleteUnidadServicio
} from '@/lib/services/unidadServicio'
import type {
  UnidadServicio,
  UnidadServicioPayload,
  UnidadServicioUpdatePayload
} from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockUnidadServicio: UnidadServicio = {
  id: '1',
  nombre: 'Unidad de servicio de prueba',
  simbolo: 'USP',
  descripcion: 'Descripción de prueba',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockCreatePayload: UnidadServicioPayload = {
  nombre: 'Nueva unidad de servicio',
  simbolo: 'NUS',
  descripcion: 'Nueva descripción'
}

const mockUpdatePayload: UnidadServicioUpdatePayload = {
  nombre: 'Unidad de servicio actualizada',
  simbolo: 'USA',
  descripcion: 'Descripción actualizada'
}

describe('UnidadServicio Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUnidadesServicio', () => {
    it('should get all unidades servicio successfully', async () => {
      const mockUnidades = [mockUnidadServicio]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnidades
      } as Response)

      const result = await getUnidadesServicio()

      expect(fetch).toHaveBeenCalledWith('/api/unidad-servicio', { cache: 'no-store' })
      expect(result).toEqual(mockUnidades)
    })

    it('should throw error when fetch fails', async () => {
      const errorMessage = 'Server error'
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => errorMessage
      } as Response)

      await expect(getUnidadesServicio()).rejects.toThrow(`Error al obtener unidades de servicio: ${errorMessage}`)
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getUnidadesServicio()).rejects.toThrow('Network error')
    })
  })

  describe('getUnidadServicioById', () => {
    it('should get unidad servicio by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnidadServicio
      } as Response)

      const result = await getUnidadServicioById('1')

      expect(fetch).toHaveBeenCalledWith('/api/unidad-servicio/1', { cache: 'no-store' })
      expect(result).toEqual(mockUnidadServicio)
    })

    it('should throw error when id is not provided', async () => {
      await expect(getUnidadServicioById('')).rejects.toThrow('ID de unidad no proporcionado')
    })

    it('should throw error when fetch fails', async () => {
      const errorMessage = 'Not found'
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => errorMessage
      } as Response)

      await expect(getUnidadServicioById('1')).rejects.toThrow(`Error al obtener unidad de servicio: ${errorMessage}`)
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getUnidadServicioById('1')).rejects.toThrow('Network error')
    })
  })

  describe('createUnidadServicio', () => {
    it('should create unidad servicio successfully', async () => {
      const expectedResult = { ...mockUnidadServicio, ...mockCreatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await createUnidadServicio(mockCreatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/unidad-servicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCreatePayload)
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when creation fails', async () => {
      const errorMessage = 'Creation failed'
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => errorMessage
      } as Response)

      await expect(createUnidadServicio(mockCreatePayload)).rejects.toThrow(`Error al crear unidad de servicio: ${errorMessage}`)
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(createUnidadServicio(mockCreatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('updateUnidadServicio', () => {
    it('should update unidad servicio successfully', async () => {
      const expectedResult = { ...mockUnidadServicio, ...mockUpdatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await updateUnidadServicio('1', mockUpdatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/unidad-servicio/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdatePayload)
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when id is not provided', async () => {
      await expect(updateUnidadServicio('', mockUpdatePayload)).rejects.toThrow('ID de unidad no proporcionado')
    })

    it('should throw error when update fails', async () => {
      const errorMessage = 'Update failed'
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => errorMessage
      } as Response)

      await expect(updateUnidadServicio('1', mockUpdatePayload)).rejects.toThrow(`Error al actualizar unidad de servicio: ${errorMessage}`)
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateUnidadServicio('1', mockUpdatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('deleteUnidadServicio', () => {
    it('should delete unidad servicio successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnidadServicio
      } as Response)

      const result = await deleteUnidadServicio('1')

      expect(fetch).toHaveBeenCalledWith('/api/unidad-servicio/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockUnidadServicio)
    })

    it('should throw error when id is not provided', async () => {
      await expect(deleteUnidadServicio('')).rejects.toThrow('ID de unidad no proporcionado')
    })

    it('should throw error when deletion fails', async () => {
      const errorMessage = 'Delete failed'
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => errorMessage
      } as Response)

      await expect(deleteUnidadServicio('1')).rejects.toThrow(`Error al eliminar unidad de servicio: ${errorMessage}`)
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(deleteUnidadServicio('1')).rejects.toThrow('Network error')
    })
  })
})