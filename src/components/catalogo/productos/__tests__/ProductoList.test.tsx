// ===================================================
// 📁 Archivo: ProductoList.test.tsx
// 📌 Ubicación: src/components/catalogo/productos/__tests__/
// 🔧 Descripción: Pruebas para ProductoList component
// 🎨 Mejoras UX/UI: Testing completo de componentes
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductoList } from '../ProductoList'
import { ProductoService } from '@/lib/services/productoService'
import type { Producto } from '@prisma/client'

// 🔧 Mock ProductoService
jest.mock('@/lib/services/productoService')
const mockProductoService = ProductoService as jest.Mocked<typeof ProductoService>

// 🔧 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// 🔧 Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
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
    activo: false,
    creadoEn: new Date('2025-01-27T11:00:00Z'),
    actualizadoEn: new Date('2025-01-27T11:00:00Z'),
  },
]

const mockPaginatedResponse = {
  success: true,
  data: mockProductos,
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
}

const mockCategorias = ['Categoria A', 'Categoria B', 'Categoria C']

describe('ProductoList', () => {
  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnView = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockProductoService.getProductos.mockResolvedValue(mockPaginatedResponse)
    mockProductoService.getCategorias.mockResolvedValue(mockCategorias)
  })

  const defaultProps = {
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onView: mockOnView,
    canEdit: true,
    canDelete: true,
  }

  it('should render loading state initially', () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    // ✅ Assert
    expect(screen.getByText('Cargando productos...')).toBeInTheDocument()
  })

  it('should render productos after loading', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    // ✅ Assert
    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
      expect(screen.getByText('Producto Test 2')).toBeInTheDocument()
    })

    expect(screen.getByText('PROD-001')).toBeInTheDocument()
    expect(screen.getByText('PROD-002')).toBeInTheDocument()
    expect(screen.getByText('S/ 100.50')).toBeInTheDocument()
    expect(screen.getByText('S/ 200.75')).toBeInTheDocument()
  })

  it('should display empty state when no productos', async () => {
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
    render(<ProductoList {...defaultProps} />)

    // ✅ Assert
    await waitFor(() => {
      expect(screen.getByText('No se encontraron productos')).toBeInTheDocument()
    })
  })

  it('should handle search functionality', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

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
    render(<ProductoList {...defaultProps} />)

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

  it('should handle activo filter', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Todos los estados')).toBeInTheDocument()
    })

    // Click on activo filter
    const activoButton = screen.getByText('Todos los estados')
    await userEvent.click(activoButton)

    await waitFor(() => {
      expect(screen.getByText('Solo activos')).toBeInTheDocument()
    })

    const activoOption = screen.getByText('Solo activos')
    await userEvent.click(activoOption)

    // ✅ Assert
    await waitFor(() => {
      expect(mockProductoService.getProductos).toHaveBeenCalledWith(
        expect.objectContaining({
          activo: true,
        })
      )
    })
  })

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
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
    })

    // Click next page
    const nextButton = screen.getByLabelText('Ir a la página siguiente')
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

  it('should call onView when view button is clicked', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByLabelText('Ver producto')
    await userEvent.click(viewButtons[0])

    // ✅ Assert
    expect(mockOnView).toHaveBeenCalledWith(mockProductos[0])
  })

  it('should call onEdit when edit button is clicked', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByLabelText('Editar producto')
    await userEvent.click(editButtons[0])

    // ✅ Assert
    expect(mockOnEdit).toHaveBeenCalledWith(mockProductos[0])
  })

  it('should call onDelete when delete button is clicked', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText('Eliminar producto')
    await userEvent.click(deleteButtons[0])

    // ✅ Assert
    expect(mockOnDelete).toHaveBeenCalledWith(mockProductos[0])
  })

  it('should hide edit button when canEdit is false', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} canEdit={false} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    // ✅ Assert
    expect(screen.queryByLabelText('Editar producto')).not.toBeInTheDocument()
  })

  it('should hide delete button when canDelete is false', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} canDelete={false} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    // ✅ Assert
    expect(screen.queryByLabelText('Eliminar producto')).not.toBeInTheDocument()
  })

  it('should display correct status badges', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    // ✅ Assert
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('should handle API error gracefully', async () => {
    // ✅ Arrange
    mockProductoService.getProductos.mockRejectedValue(new Error('API Error'))

    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    // ✅ Assert
    await waitFor(() => {
      expect(screen.getByText('Error al cargar productos')).toBeInTheDocument()
    })
  })

  it('should refresh data when refresh button is clicked', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    const refreshButton = screen.getByLabelText('Actualizar lista')
    await userEvent.click(refreshButton)

    // ✅ Assert
    expect(mockProductoService.getProductos).toHaveBeenCalledTimes(2)
  })

  it('should clear filters when clear button is clicked', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument()
    })

    // Add some filters
    const searchInput = screen.getByPlaceholderText('Buscar productos...')
    await userEvent.type(searchInput, 'Test')

    // Clear filters
    const clearButton = screen.getByText('Limpiar filtros')
    await userEvent.click(clearButton)

    // ✅ Assert
    expect(searchInput).toHaveValue('')
    await waitFor(() => {
      expect(mockProductoService.getProductos).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '',
          categoria: undefined,
          activo: undefined,
        })
      )
    })
  })

  it('should display correct item count', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    // ✅ Assert
    await waitFor(() => {
      expect(screen.getByText('Mostrando 2 de 2 productos')).toBeInTheDocument()
    })
  })

  it('should handle keyboard navigation', async () => {
    // 🎯 Act
    render(<ProductoList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Buscar productos...')
    searchInput.focus()

    // ✅ Assert
    expect(searchInput).toHaveFocus()

    // Test tab navigation
    await userEvent.tab()
    const categoriaButton = screen.getByText('Todas las categorías')
    expect(categoriaButton).toHaveFocus()
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