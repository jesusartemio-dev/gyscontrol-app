// ===================================================
// 📁 Archivo: recurso.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de recursos
// 🧠 Uso: Testing de servicios CRUD de recursos
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getRecursos,
  createRecurso,
  updateRecurso,
  deleteRecurso
} from '@/lib/services/recurso'
import type { Recurso, RecursoPayload } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockRecurso: Recurso = {
  id: '1',
  nombre: 'Recurso Test',
  descripcion: 'Descripción del recurso test',
  tipo: 'material',
  unidad: 'unidad',
  costoUnitario: 100.50,
  disponible: true,
  stock: 50,
  stockMinimo: 10,
  proveedor: 'Proveedor Test',
  categoria: 'categoria-1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockRecursoPayload: RecursoPayload = {
  nombre: 'Recurso Test',
  descripcion: 'Descripción del recurso test',
  tipo: 'material',
  unidad: 'unidad',
  costoUnitario: 100.50,
  disponible: true,
  stock: 50,
  stockMinimo: 10,
  proveedor: 'Proveedor Test',
  categoria: 'categoria-1'
}

describe('Recurso Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getRecursos', () => {
    it('should get recursos successfully', async () => {
      const mockRecursos = [mockRecurso]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecursos
      } as Response)

      const result = await getRecursos()

      expect(fetch).toHaveBeenCalledWith('/api/recurso')
      expect(result).toEqual(mockRecursos)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(getRecursos()).rejects.toThrow('Error al listar recursos')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(getRecursos()).rejects.toThrow('Network error')
    })
  })

  describe('createRecurso', () => {
    it('should create recurso successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecurso
      } as Response)

      const result = await createRecurso(mockRecursoPayload)

      expect(fetch).toHaveBeenCalledWith('/api/recurso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRecursoPayload)
      })
      expect(result).toEqual(mockRecurso)
    })

    it('should throw error when creation fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as Response)

      await expect(createRecurso(mockRecursoPayload)).rejects.toThrow('Error al crear recurso')
    })

    it('should handle network error during creation', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(createRecurso(mockRecursoPayload)).rejects.toThrow('Network error')
    })
  })

  describe('updateRecurso', () => {
    it('should update recurso successfully', async () => {
      const updatedRecurso = { ...mockRecurso, nombre: 'Recurso Actualizado' }
      const updatePayload = { ...mockRecursoPayload, nombre: 'Recurso Actualizado' }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRecurso
      } as Response)

      const result = await updateRecurso('1', updatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/recurso/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })
      expect(result).toEqual(updatedRecurso)
    })

    it('should throw error when update fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      await expect(updateRecurso('1', mockRecursoPayload)).rejects.toThrow('Error al actualizar recurso')
    })

    it('should handle network error during update', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(updateRecurso('1', mockRecursoPayload)).rejects.toThrow('Network error')
    })
  })

  describe('deleteRecurso', () => {
    it('should delete recurso successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecurso
      } as Response)

      const result = await deleteRecurso('1')

      expect(fetch).toHaveBeenCalledWith('/api/recurso/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockRecurso)
    })

    it('should throw error when delete fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      await expect(deleteRecurso('1')).rejects.toThrow('Error al eliminar recurso')
    })

    it('should handle network error during delete', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(deleteRecurso('1')).rejects.toThrow('Network error')
    })
  })

  // ✅ Edge cases and validation tests
  describe('Edge Cases', () => {
    it('should handle empty response', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response)

      const result = await getRecursos()
      expect(result).toEqual([])
    })

    it('should handle malformed JSON response', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      } as Response)

      await expect(getRecursos()).rejects.toThrow('Invalid JSON')
    })

    it('should handle server timeout', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Request timeout')
      )

      await expect(getRecursos()).rejects.toThrow('Request timeout')
    })
  })

  // ✅ Performance and boundary tests
  describe('Performance Tests', () => {
    it('should handle large dataset', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockRecurso,
        id: `recurso-${i}`,
        nombre: `Recurso ${i}`
      }))
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => largeDataset
      } as Response)

      const result = await getRecursos()
      expect(result).toHaveLength(1000)
      expect(result[0]).toMatchObject({
        id: 'recurso-0',
        nombre: 'Recurso 0'
      })
    })

    it('should handle concurrent requests', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRecurso
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRecurso
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRecurso
        } as Response)

      const promises = [
        createRecurso(mockRecursoPayload),
        updateRecurso('1', mockRecursoPayload),
        deleteRecurso('1')
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toEqual(mockRecurso)
      })
    })
  })
})
