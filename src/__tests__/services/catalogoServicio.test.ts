// ===================================================
// 📁 Archivo: catalogoServicio.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de catálogo de servicios
// 🧠 Uso: Testing de servicios CRUD de catálogo de servicios
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getCatalogoServicios,
  getCatalogoServiciosByCategoriaId,
  getCatalogoServicioById,
  createCatalogoServicio,
  updateCatalogoServicio,
  deleteCatalogoServicio
} from '@/lib/services/catalogoServicio'
import type { CatalogoServicio, CatalogoServicioPayload, CatalogoServicioUpdatePayload } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockCatalogoServicio: CatalogoServicio = {
  id: '1',
  codigo: 'SRV-001',
  descripcion: 'Servicio de prueba',
  categoriaServicioId: 'cat-srv-1',
  nivelServicioId: 'nivel-1',
  unidadServicioId: 'unidad-srv-1',
  precioInterno: 50,
  margen: 30,
  precioVenta: 65,
  estado: 'activo',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockCreatePayload: CatalogoServicioPayload = {
  codigo: 'SRV-002',
  descripcion: 'Nuevo servicio',
  categoriaServicioId: 'cat-srv-2',
  nivelServicioId: 'nivel-2',
  unidadServicioId: 'unidad-srv-2',
  precioInterno: 75,
  margen: 25,
  precioVenta: 93.75,
  estado: 'activo'
}

const mockUpdatePayload: CatalogoServicioUpdatePayload = {
  descripcion: 'Servicio actualizado',
  precioInterno: 80,
  margen: 35
}

describe('CatalogoServicio Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCatalogoServicios', () => {
    it('should get all catalogo servicios successfully', async () => {
      const mockServicios = [mockCatalogoServicio]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockServicios
      } as Response)

      const result = await getCatalogoServicios()

      expect(fetch).toHaveBeenCalledWith('/api/catalogo-servicio')
      expect(result).toEqual(mockServicios)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getCatalogoServicios()).rejects.toThrow('Error al obtener servicios')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCatalogoServicios()).rejects.toThrow('Network error')
    })
  })

  describe('getCatalogoServiciosByCategoriaId', () => {
    it('should get servicios by categoria id successfully', async () => {
      const mockServicios = [mockCatalogoServicio]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockServicios
      } as Response)

      const result = await getCatalogoServiciosByCategoriaId('cat-srv-1')

      expect(fetch).toHaveBeenCalledWith('/api/catalogo-servicio/categoria/cat-srv-1')
      expect(result).toEqual(mockServicios)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getCatalogoServiciosByCategoriaId('cat-srv-1')).rejects.toThrow('Error al obtener servicios por ID de categoría')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCatalogoServiciosByCategoriaId('cat-srv-1')).rejects.toThrow('Network error')
    })
  })

  describe('getCatalogoServicioById', () => {
    it('should get catalogo servicio by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogoServicio
      } as Response)

      const result = await getCatalogoServicioById('1')

      expect(fetch).toHaveBeenCalledWith('/api/catalogo-servicio/1')
      expect(result).toEqual(mockCatalogoServicio)
    })

    it('should throw error when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(getCatalogoServicioById('1')).rejects.toThrow('Error al obtener servicio')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(getCatalogoServicioById('1')).rejects.toThrow('Network error')
    })
  })

  describe('createCatalogoServicio', () => {
    it('should create catalogo servicio successfully', async () => {
      const expectedResult = { ...mockCatalogoServicio, ...mockCreatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await createCatalogoServicio(mockCreatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/catalogo-servicio', {
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

      await expect(createCatalogoServicio(mockCreatePayload)).rejects.toThrow('Error al crear servicio')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(createCatalogoServicio(mockCreatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('updateCatalogoServicio', () => {
    it('should update catalogo servicio successfully', async () => {
      const expectedResult = { ...mockCatalogoServicio, ...mockUpdatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult
      } as Response)

      const result = await updateCatalogoServicio('1', mockUpdatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/catalogo-servicio/1', {
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

      await expect(updateCatalogoServicio('1', mockUpdatePayload)).rejects.toThrow('Error al actualizar servicio')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateCatalogoServicio('1', mockUpdatePayload)).rejects.toThrow('Network error')
    })
  })

  describe('deleteCatalogoServicio', () => {
    it('should delete catalogo servicio successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogoServicio
      } as Response)

      const result = await deleteCatalogoServicio('1')

      expect(fetch).toHaveBeenCalledWith('/api/catalogo-servicio/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockCatalogoServicio)
    })

    it('should throw error when deletion fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(deleteCatalogoServicio('1')).rejects.toThrow('Error al eliminar servicio')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      await expect(deleteCatalogoServicio('1')).rejects.toThrow('Network error')
    })
  })
})
