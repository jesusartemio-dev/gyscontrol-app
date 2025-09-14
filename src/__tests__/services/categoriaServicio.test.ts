// ===================================================
// 📁 Archivo: categoriaServicio.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de categoría de servicios
// 🧠 Uso: Testing de servicios CRUD de categoría de servicios
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getCategoriaServicioById,
  getCategoriasServicio,
  createCategoriaServicio,
  updateCategoriaServicio,
  deleteCategoriaServicio
} from '@/lib/services/categoriaServicio'
import { buildApiUrl } from '@/lib/utils'
import type { CategoriaServicio, CategoriaServicioUpdatePayload } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

// ✅ Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => path)
}))

const mockCategoriaServicio: CategoriaServicio = {
  id: '1',
  nombre: 'Categoría de prueba',
  descripcion: 'Descripción de prueba',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockCreateData = {
  nombre: 'Nueva categoría',
  descripcion: 'Nueva descripción'
}

const mockUpdatePayload: CategoriaServicioUpdatePayload = {
  nombre: 'Categoría actualizada',
  descripcion: 'Descripción actualizada'
}

describe('CategoriaServicio Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getCategoriaServicioById', () => {
    it('should get categoria servicio by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategoriaServicio
      } as Response)

      const result = await getCategoriaServicioById('1')

      expect(buildApiUrl).toHaveBeenCalledWith('/api/categoria-servicio/1')
      expect(fetch).toHaveBeenCalledWith('/api/categoria-servicio/1')
      expect(result).toEqual(mockCategoriaServicio)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getCategoriaServicioById('1')).rejects.toThrow('Error al obtener categoría de servicio por ID')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCategoriaServicioById('1')).rejects.toThrow('Network error')
    })
  })

  describe('getCategoriasServicio', () => {
    it('should get all categorias servicio successfully', async () => {
      const mockCategorias = [mockCategoriaServicio]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategorias
      } as Response)

      const result = await getCategoriasServicio()

      expect(buildApiUrl).toHaveBeenCalledWith('/api/categoria-servicio')
      expect(fetch).toHaveBeenCalledWith('/api/categoria-servicio')
      expect(result).toEqual(mockCategorias)
    })

    it('should throw error when fetch fails with error data', async () => {
      const errorData = { error: 'Custom error message' }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => errorData
      } as Response)

      await expect(getCategoriasServicio()).rejects.toThrow('Custom error message')
    })

    it('should throw default error when fetch fails without error data', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      } as Response)

      await expect(getCategoriasServicio()).rejects.toThrow('Error al obtener categorías de servicio')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCategoriasServicio()).rejects.toThrow('Network error')
    })
  })

  describe('createCategoriaServicio', () => {
    it('should create categoria servicio successfully', async () => {
      const expectedResult = { ...mockCategoriaServicio, ...mockCreateData }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await createCategoriaServicio(mockCreateData)

      expect(buildApiUrl).toHaveBeenCalledWith('/api/categoria-servicio')
      expect(fetch).toHaveBeenCalledWith('/api/categoria-servicio', {
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

      await expect(createCategoriaServicio(mockCreateData)).rejects.toThrow('Error al crear categoría de servicio')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(createCategoriaServicio(mockCreateData)).rejects.toThrow('Network error')
    })
  })

  describe('updateCategoriaServicio', () => {
    it('should update categoria servicio successfully', async () => {
      const expectedResult = { ...mockCategoriaServicio, ...mockUpdatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await updateCategoriaServicio('1', mockUpdatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/categoria-servicio/1', {
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

      await expect(updateCategoriaServicio('1', mockUpdatePayload)).rejects.toThrow('Error al actualizar categoría')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateCategoriaServicio('1', mockUpdatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('deleteCategoriaServicio', () => {
    it('should delete categoria servicio successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategoriaServicio
      } as Response)

      const result = await deleteCategoriaServicio('1')

      expect(fetch).toHaveBeenCalledWith('/api/categoria-servicio/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockCategoriaServicio)
    })

    it('should throw error when deletion fails with error data', async () => {
      const errorData = { error: 'Delete failed' }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => errorData
      } as Response)

      await expect(deleteCategoriaServicio('1')).rejects.toThrow('Error al eliminar categoría')
    })

    it('should throw error when deletion fails without valid JSON', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error('Invalid JSON') }
      } as Response)

      await expect(deleteCategoriaServicio('1')).rejects.toThrow('Error al eliminar categoría')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(deleteCategoriaServicio('1')).rejects.toThrow('Network error')
    })
  })
})