// ===================================================
// 📁 Archivo: categoriaEquipo.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de categoría de equipos
// 🧠 Uso: Testing de servicios CRUD de categoría de equipos
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getCategoriasEquipo,
  createCategoriaEquipo,
  updateCategoriaEquipo,
  deleteCategoriaEquipo
} from '@/lib/services/categoriaEquipo'
import { buildApiUrl } from '@/lib/utils'

// ✅ Mock fetch globally
global.fetch = jest.fn()

// ✅ Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => path)
}))

const mockCategoriaEquipo = {
  id: '1',
  nombre: 'Categoría de prueba',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockCreateData = {
  nombre: 'Nueva categoría'
}

const mockUpdateData = {
  nombre: 'Categoría actualizada'
}

describe('CategoriaEquipo Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCategoriasEquipo', () => {
    it('should get all categorias equipo successfully', async () => {
      const mockCategorias = [mockCategoriaEquipo]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategorias
      } as Response)

      const result = await getCategoriasEquipo()

      expect(buildApiUrl).toHaveBeenCalledWith('/api/categoria-equipo')
      expect(fetch).toHaveBeenCalledWith('/api/categoria-equipo')
      expect(result).toEqual(mockCategorias)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getCategoriasEquipo()).rejects.toThrow('Failed to fetch categorias equipo')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCategoriasEquipo()).rejects.toThrow('Network error')
    })
  })

  describe('createCategoriaEquipo', () => {
    it('should create categoria equipo successfully', async () => {
      const expectedResult = { ...mockCategoriaEquipo, ...mockCreateData }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await createCategoriaEquipo(mockCreateData)

      expect(buildApiUrl).toHaveBeenCalledWith('/api/categoria-equipo')
      expect(fetch).toHaveBeenCalledWith('/api/categoria-equipo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockCreateData)
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when creation fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(createCategoriaEquipo(mockCreateData)).rejects.toThrow('Failed to create categoria equipo')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(createCategoriaEquipo(mockCreateData)).rejects.toThrow('Network error')
    })
  })

  describe('updateCategoriaEquipo', () => {
    it('should update categoria equipo successfully', async () => {
      const expectedResult = { ...mockCategoriaEquipo, ...mockUpdateData }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await updateCategoriaEquipo('1', mockUpdateData)

      expect(fetch).toHaveBeenCalledWith('/api/categoria-equipo/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdateData)
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when update fails', async () => {
      const errorText = 'Update failed'
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => errorText
      } as Response)

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await expect(updateCategoriaEquipo('1', mockUpdateData)).rejects.toThrow('Error al actualizar categoría de equipo: ' + errorText)
      
      consoleSpy.mockRestore()
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateCategoriaEquipo('1', mockUpdateData)).rejects.toThrow('Network error')
    })
  })

  describe('deleteCategoriaEquipo', () => {
    it('should delete categoria equipo successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategoriaEquipo
      } as Response)

      const result = await deleteCategoriaEquipo('1')

      expect(fetch).toHaveBeenCalledWith('/api/categoria-equipo/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockCategoriaEquipo)
    })

    it('should throw error when deletion fails', async () => {
      const errorText = 'Delete failed'
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => errorText
      } as Response)

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await expect(deleteCategoriaEquipo('1')).rejects.toThrow('Error al eliminar categoría de equipo: ' + errorText)
      
      consoleSpy.mockRestore()
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(deleteCategoriaEquipo('1')).rejects.toThrow('Network error')
    })
  })
})
