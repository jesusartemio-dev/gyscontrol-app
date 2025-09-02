// ===================================================
// 📁 Archivo: ProductoSelect.test.tsx
// 📌 Ubicación: src/components/catalogo/productos/__tests__/
// 🔧 Descripción: Pruebas para ProductoSelect component
// 🎨 Mejoras UX/UI: Testing completo de componentes
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductoSelect } from '../ProductoSelect'
import { ProductoService } from '@/lib/services/productoService'
import type { Producto } from '@prisma/client'

// 🔧 Mock ProductoService
jest.mock('@/lib/services/productoService')
const mockProductoService = ProductoService as jest.Mocked<typeof ProductoService>

// 🔧 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// 🔧 Mock toast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// 📋 Test data
const mockProductos: Producto[] = [
  {
    id: 'producto-1',
    codigo: 'PROD-001',
    nombre: 'Producto Test 1',
    descripcion: 'Descripción del producto 1',
    categoria: 'Categoria A',
    precio: 100.50,
    unidad: 'UND',
    activo: true,
    creadoEn: new Date('2025-01-27T10:00:00Z'),
    actualizadoEn: new Date('2025-01-27T10:00:00Z'),
  },
  {
    id: 'producto-2',
    codigo: 'PROD-002',
    nombre: 'Producto Test 2',
    descripcion: 'Descripción del producto 2',
    categoria: 'Categoria B',
    precio: 200.75,
    unidad: 'KG',
    activo: true,
    creadoEn: new Date('2025-01-27T11:00:00Z'),
    actualizadoEn: new Date('2025-01-27T11:00:00Z'),
  },
  {
    id: 'producto-3',
    codigo: 'PROD-003',
    nombre: 'Producto Inactivo',
    descripcion: 'Producto inactivo',
    categoria: 'Categoria A',
    precio: 50.25,
    unidad: 'UND',
    activo: false,
    creadoEn: new Date('2025-01-27T12:00:00Z'),
    actualizadoEn: new Date('2025-01-27T12:00:00Z'),
  },
]

const mockPaginatedResponse = {
  success: true,
  data: mockProductos,
  pagination: {
    page: 1,
    limit: 10,
    total: 3,
    totalPages: 1,
  },
}

const mockCategorias = ['Categoria A', 'Categoria B', 'Categoria C']

describe('ProductoSelect', () => {
  const mockOnSelect = jest.fn()
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockProductoService.getProductos.mockResolvedValue(mockPaginatedResponse)
    mockProductoService.getCategorias.mockResolvedValue(mockCategorias)
  })

  const defaultProps = {
    onSelect: mockOnSelect,
    placeholder: 'Seleccionar producto',
  }

  describe('Single Selection Mode', () => {
    it('should render correctly in single selection mode', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      expect(screen.getByText('Seleccionar producto')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument()
    })

    it('should load productos on mount', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.getProductos).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          activo: true,
        })
      })
    })

    it('should display productos in dropdown', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // Wait for productos to load
      await waitFor(() => {
        expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
        expect(screen.getByText('Producto Test 2')).toBeInTheDocument()
      })

      // ✅ Assert
      expect(screen.getByText('PROD-001')).toBeInTheDocument()
      expect(screen.getByText('PROD-002')).toBeInTheDocument()
      expect(screen.getByText('S/ 100.50')).toBeInTheDocument()
      expect(screen.getByText('S/ 200.75')).toBeInTheDocument()
    })

    it('should filter out inactive productos by default', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
        expect(screen.getByText('Producto Test 2')).toBeInTheDocument()
      })

      expect(screen.queryByText('Producto Inactivo')).not.toBeInTheDocument()
    })

    it('should include inactive productos when includeInactive is true', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} includeInactive />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.getProductos).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          activo: undefined,
        })
      })
    })

    it('should handle search functionality', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar productos...')
      await userEvent.type(searchInput, 'Test 1')

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.getProductos).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Test 1',
          })
        )
      })
    })

    it('should handle categoria filter', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Todas las categorías')).toBeInTheDocument()
      })

      // Click on categoria filter
      const categoriaButton = screen.getByText('Todas las categorías')
      await userEvent.click(categoriaButton)

      await waitFor(() => {
        expect(screen.getByText('Categoria A')).toBeInTheDocument()
      })

      const categoriaOption = screen.getByText('Categoria A')
      await userEvent.click(categoriaOption)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.getProductos).toHaveBeenCalledWith(
          expect.objectContaining({
            categoria: 'Categoria A',
          })
        )
      })
    })

    it('should select producto and call onSelect', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
      })

      const productoOption = screen.getByText('Producto Test 1')
      await userEvent.click(productoOption)

      // ✅ Assert
      expect(mockOnSelect).toHaveBeenCalledWith(mockProductos[0])
    })

    it('should display selected producto', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} value={mockProductos[0]} />)

      // ✅ Assert
      expect(screen.getByText('PROD-001 - Producto Test 1')).toBeInTheDocument()
    })

    it('should clear selection when clear button is clicked', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} value={mockProductos[0]} />)

      const clearButton = screen.getByLabelText('Limpiar selección')
      await userEvent.click(clearButton)

      // ✅ Assert
      expect(mockOnSelect).toHaveBeenCalledWith(null)
    })
  })

  describe('Multiple Selection Mode', () => {
    const multipleProps = {
      ...defaultProps,
      multiple: true,
      onChange: mockOnChange,
    }

    it('should render correctly in multiple selection mode', async () => {
      // 🎯 Act
      render(<ProductoSelect {...multipleProps} />)

      // ✅ Assert
      expect(screen.getByText('Seleccionar producto')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument()
    })

    it('should select multiple productos', async () => {
      // 🎯 Act
      render(<ProductoSelect {...multipleProps} />)

      await waitFor(() => {
        expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
        expect(screen.getByText('Producto Test 2')).toBeInTheDocument()
      })

      // Select first producto
      const producto1 = screen.getByText('Producto Test 1')
      await userEvent.click(producto1)

      // Select second producto
      const producto2 = screen.getByText('Producto Test 2')
      await userEvent.click(producto2)

      // ✅ Assert
      expect(mockOnChange).toHaveBeenCalledWith([mockProductos[0]])
      expect(mockOnChange).toHaveBeenCalledWith([mockProductos[0], mockProductos[1]])
    })

    it('should display selected productos count', async () => {
      // 🎯 Act
      render(<ProductoSelect {...multipleProps} value={[mockProductos[0], mockProductos[1]]} />)

      // ✅ Assert
      expect(screen.getByText('2 productos seleccionados')).toBeInTheDocument()
    })

    it('should remove producto from selection', async () => {
      // 🎯 Act
      render(<ProductoSelect {...multipleProps} value={[mockProductos[0], mockProductos[1]]} />)

      await waitFor(() => {
        expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
      })

      // Click on already selected producto to remove it
      const producto1 = screen.getByText('Producto Test 1')
      await userEvent.click(producto1)

      // ✅ Assert
      expect(mockOnChange).toHaveBeenCalledWith([mockProductos[1]])
    })

    it('should clear all selections', async () => {
      // 🎯 Act
      render(<ProductoSelect {...multipleProps} value={[mockProductos[0], mockProductos[1]]} />)

      const clearButton = screen.getByLabelText('Limpiar selección')
      await userEvent.click(clearButton)

      // ✅ Assert
      expect(mockOnChange).toHaveBeenCalledWith([])
    })
  })

  describe('Pagination', () => {
    it('should handle pagination', async () => {
      // ✅ Arrange
      const paginatedResponse = {
        ...mockPaginatedResponse,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      }
      mockProductoService.getProductos.mockResolvedValue(paginatedResponse)

      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
      })

      // Click next page
      const nextButton = screen.getByLabelText('Página siguiente')
      await userEvent.click(nextButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.getProductos).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        )
      })
    })

    it('should disable previous button on first page', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Página anterior')).toBeInTheDocument()
      })

      // ✅ Assert
      const prevButton = screen.getByLabelText('Página anterior')
      expect(prevButton).toBeDisabled()
    })

    it('should disable next button on last page', async () => {
      // ✅ Arrange
      const lastPageResponse = {
        ...mockPaginatedResponse,
        pagination: {
          page: 3,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      }
      mockProductoService.getProductos.mockResolvedValue(lastPageResponse)

      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Página 3 de 3')).toBeInTheDocument()
      })

      // ✅ Assert
      const nextButton = screen.getByLabelText('Página siguiente')
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      // ✅ Arrange
      mockProductoService.getProductos.mockRejectedValue(new Error('API Error'))

      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al cargar productos',
          variant: 'destructive',
        })
      })
    })

    it('should handle categorias loading error', async () => {
      // ✅ Arrange
      mockProductoService.getCategorias.mockRejectedValue(new Error('Categorias Error'))

      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al cargar categorías',
          variant: 'destructive',
        })
      })
    })

    it('should display empty state when no productos found', async () => {
      // ✅ Arrange
      mockProductoService.getProductos.mockResolvedValue({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      })

      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('No se encontraron productos')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      expect(screen.getByText('Cargando productos...')).toBeInTheDocument()
    })

    it('should show loading state during search', async () => {
      // ✅ Arrange
      let resolveProducts: (value: any) => void
      const productsPromise = new Promise((resolve) => {
        resolveProducts = resolve
      })
      mockProductoService.getProductos.mockReturnValue(productsPromise)

      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar productos...')
      await userEvent.type(searchInput, 'test')

      // ✅ Assert loading state
      expect(screen.getByText('Buscando...')).toBeInTheDocument()

      // Resolve promise
      resolveProducts!(mockPaginatedResponse)
    })
  })

  describe('Accessibility', () => {
    it('should handle keyboard navigation', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar productos...')
      searchInput.focus()

      // ✅ Assert
      expect(searchInput).toHaveFocus()

      // Test arrow key navigation
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
      await waitFor(() => {
        expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
      })
    })

    it('should have proper ARIA labels', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} />)

      // ✅ Assert
      expect(screen.getByLabelText('Limpiar selección')).toBeInTheDocument()
      expect(screen.getByLabelText('Página anterior')).toBeInTheDocument()
      expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('should respect disabled prop', () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} disabled />)

      // ✅ Assert
      const searchInput = screen.getByPlaceholderText('Buscar productos...')
      expect(searchInput).toBeDisabled()
    })

    it('should use custom placeholder', () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} placeholder="Elegir producto" />)

      // ✅ Assert
      expect(screen.getByText('Elegir producto')).toBeInTheDocument()
    })

    it('should filter by categoria when provided', async () => {
      // 🎯 Act
      render(<ProductoSelect {...defaultProps} categoria="Categoria A" />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.getProductos).toHaveBeenCalledWith(
          expect.objectContaining({
            categoria: 'Categoria A',
          })
        )
      })
    })
  })
})

// 🧪 Test utilities
export const createMockProducto = (overrides?: Partial<Producto>): Producto => {
  return {
    id: 'test-id',
    codigo: 'TEST-001',
    nombre: 'Test Producto',
    descripcion: 'Test descripción',
    categoria: 'Test Categoria',
    precio: 100,
    unidad: 'UND',
    activo: true,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    ...overrides,
  }
}

export { mockProductos, mockPaginatedResponse, mockCategorias }