// ===================================================
// 📁 Archivo: catalogoEquipo.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de catálogo de equipos
// 🧠 Uso: Testing de servicios CRUD de catálogo de equipos
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getCatalogoEquipoById,
  getCatalogoEquipos,
  createCatalogoEquipo,
  updateCatalogoEquipo,
  deleteCatalogoEquipo
} from '@/lib/services/catalogoEquipo'
import type { CatalogoEquipo } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

// ✅ Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => `http://localhost:3000${path}`)
}))

const mockCatalogoEquipo: CatalogoEquipo = {
  id: '1',
  codigo: 'EQ-001',
  descripcion: 'Equipo de prueba',
  marca: 'Marca Test',
  precioInterno: 100,
  margen: 20,
  precioVenta: 120,
  categoriaId: 'cat-1',
  unidadId: 'unidad-1',
  estado: 'activo',
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('CatalogoEquipo Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCatalogoEquipoById', () => {
    it('should get catalogo equipo by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogoEquipo
      } as Response)

      const result = await getCatalogoEquipoById('1')

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/catalogo-equipo/1')
      expect(result).toEqual(mockCatalogoEquipo)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getCatalogoEquipoById('1')).rejects.toThrow('Error al obtener catálogo de equipo por ID')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCatalogoEquipoById('1')).rejects.toThrow('Network error')
    })
  })

  describe('getCatalogoEquipos', () => {
    it('should get all catalogo equipos successfully', async () => {
      const mockEquipos = [mockCatalogoEquipo]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEquipos
      } as Response)

      const result = await getCatalogoEquipos()

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/catalogo-equipo')
      expect(result).toEqual(mockEquipos)
    })

    it('should throw error with custom message when response has error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Custom error message' })
      } as Response)

      await expect(getCatalogoEquipos()).rejects.toThrow('Custom error message')
    })

    it('should throw default error when response fails without custom error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      } as Response)

      await expect(getCatalogoEquipos()).rejects.toThrow('Error al obtener catálogo de equipos')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCatalogoEquipos()).rejects.toThrow('Network error')
    })
  })

  describe('createCatalogoEquipo', () => {
    const createData = {
      codigo: 'EQ-002',
      descripcion: 'Nuevo equipo',
      marca: 'Nueva Marca',
      precioInterno: 150,
      margen: 25,
      precioVenta: 187.5,
      categoriaId: 'cat-2',
      unidadId: 'unidad-2',
      estado: 'activo'
    }

    it('should create catalogo equipo successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockCatalogoEquipo, ...createData })
      } as Response)

      const result = await createCatalogoEquipo(createData)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/catalogo-equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      })
      expect(result).toEqual({ ...mockCatalogoEquipo, ...createData })
    })

    it('should throw error when creation fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(createCatalogoEquipo(createData)).rejects.toThrow('Error al crear equipo en catálogo')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(createCatalogoEquipo(createData)).rejects.toThrow('Network error')
    })
  })

  describe('updateCatalogoEquipo', () => {
    const updateData = {
      nombre: 'Equipo actualizado',
      descripcion: 'Descripción actualizada',
      precio: 200
    }

    it('should update catalogo equipo successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockCatalogoEquipo, ...updateData })
      } as Response)

      const result = await updateCatalogoEquipo('1', updateData)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/catalogo-equipo/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      expect(result).toEqual({ ...mockCatalogoEquipo, ...updateData })
    })

    it('should throw error when update fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(updateCatalogoEquipo('1', updateData)).rejects.toThrow('Error al actualizar equipo en catálogo')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateCatalogoEquipo('1', updateData)).rejects.toThrow('Network error')
    })
  })

  describe('deleteCatalogoEquipo', () => {
    it('should delete catalogo equipo successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true
      } as Response)

      await deleteCatalogoEquipo('1')

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/catalogo-equipo/1', {
        method: 'DELETE'
      })
    })

    it('should throw error when deletion fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(deleteCatalogoEquipo('1')).rejects.toThrow('Error al eliminar equipo del catálogo')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(deleteCatalogoEquipo('1')).rejects.toThrow('Network error')
    })
  })
})
