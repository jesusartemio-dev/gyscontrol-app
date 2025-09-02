// ===================================================
// 📁 Archivo: productoService.test.ts
// 📌 Ubicación: src/lib/services/__tests__/
// 🔧 Descripción: Pruebas para ProductoService
// 🎨 Mejoras UX/UI: Testing completo de servicios
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { ProductoService } from '../productoService'
import type { Producto } from '@prisma/client'
import type { CreateProductoPayload, UpdateProductoPayload } from '@/types/payloads'

// 🔧 Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// 📋 Test data
const mockProducto: Producto = {
  id: 'producto-1',
  codigo: 'PROD-001',
  nombre: 'Producto Test',
  descripcion: 'Descripción del producto test',
  categoria: 'Categoria A',
  precio: 100.50,
  unidad: 'UND',
  activo: true,
  creadoEn: new Date('2025-01-27T10:00:00Z'),
  actualizadoEn: new Date('2025-01-27T10:00:00Z'),
}

const mockProductos = [mockProducto]

const mockPaginatedResponse = {
  success: true,
  data: mockProductos,
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  },
}

const mockSingleResponse = {
  success: true,
  data: mockProducto,
}

const mockErrorResponse = {
  success: false,
  message: 'Error de prueba',
}

// 🧪 Helper function to create mock response
const createMockResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('ProductoService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProductos', () => {
    it('should fetch productos successfully', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockPaginatedResponse))

      // 🎯 Act
      const result = await ProductoService.getProductos()

      // ✅ Assert
      expect(result).toEqual(mockPaginatedResponse)
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos?page=1&limit=10')
    })

    it('should handle search parameter', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockPaginatedResponse))

      // 🎯 Act
      await ProductoService.getProductos({ search: 'test' })

      // ✅ Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos?page=1&limit=10&search=test')
    })

    it('should handle categoria filter', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockPaginatedResponse))

      // 🎯 Act
      await ProductoService.getProductos({ categoria: 'Categoria A' })

      // ✅ Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos?page=1&limit=10&categoria=Categoria%20A')
    })

    it('should handle activo filter', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockPaginatedResponse))

      // 🎯 Act
      await ProductoService.getProductos({ activo: true })

      // ✅ Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos?page=1&limit=10&activo=true')
    })

    it('should handle pagination parameters', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockPaginatedResponse))

      // 🎯 Act
      await ProductoService.getProductos({ page: 2, limit: 20 })

      // ✅ Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos?page=2&limit=20')
    })

    it('should handle multiple filters', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockPaginatedResponse))

      // 🎯 Act
      await ProductoService.getProductos({
        search: 'test',
        categoria: 'Categoria A',
        activo: true,
        page: 2,
        limit: 5,
      })

      // ✅ Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/catalogo/productos?page=2&limit=5&search=test&categoria=Categoria%20A&activo=true'
      )
    })

    it('should throw error when fetch fails', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockErrorResponse, 500))

      // 🎯 Act & Assert
      await expect(ProductoService.getProductos()).rejects.toThrow('Error de prueba')
    })

    it('should throw error when network fails', async () => {
      // ✅ Arrange
      mockFetch.mockRejectedValue(new Error('Network error'))

      // 🎯 Act & Assert
      await expect(ProductoService.getProductos()).rejects.toThrow('Network error')
    })
  })

  describe('getProductoById', () => {
    it('should fetch producto by id successfully', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValue(createMockResponse(mockSingleResponse))

      // 🎯 Act
      const result = await ProductoService.getProductoById('producto-1')

      // ✅ Assert
      expect(result).toEqual(mockProducto)
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos/producto-1')
    })

    it('should throw error when producto not found', async () => {
      // ✅ Arrange
      const notFoundResponse = {
        success: false,
        message: 'Producto no encontrado',
      }
      mockFetch.mockResolvedValue(createMockResponse(notFoundResponse, 404))

      // 🎯 Act & Assert
      await expect(ProductoService.getProductoById('nonexistent')).rejects.toThrow('Producto no encontrado')
    })

    it('should throw error when fetch fails', async () => {
      // ✅ Arrange
      mockFetch.mockRejectedValue(new Error('Network error'))

      // 🎯 Act & Assert
      await expect(ProductoService.getProductoById('producto-1')).rejects.toThrow('Network error')
    })
  })

  describe('createProducto', () => {
    const createPayload: CreateProductoPayload = {
      codigo: 'PROD-002',
      nombre: 'Nuevo Producto',
      descripcion: 'Descripción del nuevo producto',
      categoria: 'Categoria B',
      precio: 200.75,
      unidad: 'KG',
      activo: true,
    }

    it('should create producto successfully', async () => {
      // ✅ Arrange
      const createdProducto = { ...mockProducto, ...createPayload, id: 'producto-2' }
      const createResponse = {
        success: true,
        data: createdProducto,
      }
      mockFetch.mockResolvedValue(createMockResponse(createResponse, 201))

      // 🎯 Act
      const result = await ProductoService.createProducto(createPayload)

      // ✅ Assert
      expect(result).toEqual(createdProducto)
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload),
      })
    })

    it('should throw error when validation fails', async () => {
      // ✅ Arrange
      const validationError = {
        success: false,
        message: 'Datos inválidos',
      }
      mockFetch.mockResolvedValue(createMockResponse(validationError, 400))

      // 🎯 Act & Assert
      await expect(ProductoService.createProducto(createPayload)).rejects.toThrow('Datos inválidos')
    })

    it('should throw error when codigo already exists', async () => {
      // ✅ Arrange
      const duplicateError = {
        success: false,
        message: 'Ya existe un producto con este código',
      }
      mockFetch.mockResolvedValue(createMockResponse(duplicateError, 409))

      // 🎯 Act & Assert
      await expect(ProductoService.createProducto(createPayload)).rejects.toThrow(
        'Ya existe un producto con este código'
      )
    })
  })

  describe('updateProducto', () => {
    const updatePayload: UpdateProductoPayload = {
      nombre: 'Producto Actualizado',
      descripcion: 'Nueva descripción',
      precio: 150.75,
      activo: false,
    }

    it('should update producto successfully', async () => {
      // ✅ Arrange
      const updatedProducto = { ...mockProducto, ...updatePayload }
      const updateResponse = {
        success: true,
        data: updatedProducto,
      }
      mockFetch.mockResolvedValue(createMockResponse(updateResponse))

      // 🎯 Act
      const result = await ProductoService.updateProducto('producto-1', updatePayload)

      // ✅ Assert
      expect(result).toEqual(updatedProducto)
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos/producto-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      })
    })

    it('should throw error when producto not found', async () => {
      // ✅ Arrange
      const notFoundError = {
        success: false,
        message: 'Producto no encontrado',
      }
      mockFetch.mockResolvedValue(createMockResponse(notFoundError, 404))

      // 🎯 Act & Assert
      await expect(ProductoService.updateProducto('nonexistent', updatePayload)).rejects.toThrow(
        'Producto no encontrado'
      )
    })

    it('should throw error when validation fails', async () => {
      // ✅ Arrange
      const validationError = {
        success: false,
        message: 'Datos inválidos',
      }
      mockFetch.mockResolvedValue(createMockResponse(validationError, 400))

      // 🎯 Act & Assert
      await expect(ProductoService.updateProducto('producto-1', updatePayload)).rejects.toThrow(
        'Datos inválidos'
      )
    })
  })

  describe('deleteProducto', () => {
    it('should delete producto successfully', async () => {
      // ✅ Arrange
      const deleteResponse = {
        success: true,
        message: 'Producto eliminado exitosamente',
      }
      mockFetch.mockResolvedValue(createMockResponse(deleteResponse))

      // 🎯 Act
      await ProductoService.deleteProducto('producto-1')

      // ✅ Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos/producto-1', {
        method: 'DELETE',
      })
    })

    it('should throw error when producto not found', async () => {
      // ✅ Arrange
      const notFoundError = {
        success: false,
        message: 'Producto no encontrado',
      }
      mockFetch.mockResolvedValue(createMockResponse(notFoundError, 404))

      // 🎯 Act & Assert
      await expect(ProductoService.deleteProducto('nonexistent')).rejects.toThrow('Producto no encontrado')
    })

    it('should throw error when producto is in use', async () => {
      // ✅ Arrange
      const constraintError = {
        success: false,
        message: 'No se puede eliminar el producto porque está siendo utilizado en otros registros',
      }
      mockFetch.mockResolvedValue(createMockResponse(constraintError, 409))

      // 🎯 Act & Assert
      await expect(ProductoService.deleteProducto('producto-1')).rejects.toThrow(
        'No se puede eliminar el producto porque está siendo utilizado en otros registros'
      )
    })
  })

  describe('getCategorias', () => {
    const mockCategorias = ['Categoria A', 'Categoria B', 'Categoria C']

    it('should fetch categorias successfully', async () => {
      // ✅ Arrange
      const categoriasResponse = {
        success: true,
        data: mockCategorias,
      }
      mockFetch.mockResolvedValue(createMockResponse(categoriasResponse))

      // 🎯 Act
      const result = await ProductoService.getCategorias()

      // ✅ Assert
      expect(result).toEqual(mockCategorias)
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos/categorias')
    })

    it('should throw error when fetch fails', async () => {
      // ✅ Arrange
      mockFetch.mockRejectedValue(new Error('Network error'))

      // 🎯 Act & Assert
      await expect(ProductoService.getCategorias()).rejects.toThrow('Network error')
    })
  })

  describe('getUnidades', () => {
    const mockUnidades = ['UND', 'KG', 'M', 'M2', 'M3']

    it('should fetch unidades successfully', async () => {
      // ✅ Arrange
      const unidadesResponse = {
        success: true,
        data: mockUnidades,
      }
      mockFetch.mockResolvedValue(createMockResponse(unidadesResponse))

      // 🎯 Act
      const result = await ProductoService.getUnidades()

      // ✅ Assert
      expect(result).toEqual(mockUnidades)
      expect(mockFetch).toHaveBeenCalledWith('/api/catalogo/productos/unidades')
    })

    it('should throw error when fetch fails', async () => {
      // ✅ Arrange
      mockFetch.mockRejectedValue(new Error('Network error'))

      // 🎯 Act & Assert
      await expect(ProductoService.getUnidades()).rejects.toThrow('Network error')
    })
  })
})

// 🧪 Test utilities
export const createMockProducto = (overrides?: Partial<Producto>): Producto => {
  return {
    ...mockProducto,
    ...overrides,
  }
}

export const createMockCreatePayload = (overrides?: Partial<CreateProductoPayload>): CreateProductoPayload => {
  return {
    codigo: 'PROD-TEST',
    nombre: 'Producto Test',
    descripcion: 'Descripción test',
    categoria: 'Test',
    precio: 100,
    unidad: 'UND',
    activo: true,
    ...overrides,
  }
}

export { mockProducto, mockProductos, mockPaginatedResponse, mockSingleResponse }