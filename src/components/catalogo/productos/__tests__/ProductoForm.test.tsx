// ===================================================
// 📁 Archivo: ProductoForm.test.tsx
// 📌 Ubicación: src/components/catalogo/productos/__tests__/
// 🔧 Descripción: Pruebas para ProductoForm component
// 🎨 Mejoras UX/UI: Testing completo de componentes
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductoForm } from '../ProductoForm'
import { ProductoService } from '@/lib/services/productoService'
import type { Producto } from '@prisma/client'

// 🔧 Mock ProductoService
jest.mock('@/lib/services/productoService')
const mockProductoService = ProductoService as jest.Mocked<typeof ProductoService>

// 🔧 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
}))

// 🔧 Mock toast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

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

const mockCategorias = ['Categoria A', 'Categoria B', 'Categoria C']
const mockUnidades = ['UND', 'KG', 'M', 'M2', 'M3']

describe('ProductoForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockProductoService.getCategorias.mockResolvedValue(mockCategorias)
    mockProductoService.getUnidades.mockResolvedValue(mockUnidades)
  })

  const defaultProps = {
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  }

  describe('Create Mode', () => {
    it('should render create form correctly', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      // ✅ Assert
      expect(screen.getByText('Crear Producto')).toBeInTheDocument()
      expect(screen.getByLabelText('Código *')).toBeInTheDocument()
      expect(screen.getByLabelText('Nombre *')).toBeInTheDocument()
      expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
      expect(screen.getByLabelText('Precio *')).toBeInTheDocument()
      expect(screen.getByText('Crear')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()

      // Wait for selects to load
      await waitFor(() => {
        expect(screen.getByText('Seleccionar categoría')).toBeInTheDocument()
        expect(screen.getByText('Seleccionar unidad')).toBeInTheDocument()
      })
    })

    it('should load categorias and unidades on mount', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.getCategorias).toHaveBeenCalled()
        expect(mockProductoService.getUnidades).toHaveBeenCalled()
      })
    })

    it('should validate required fields', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      const submitButton = screen.getByText('Crear')
      await userEvent.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('El código es requerido')).toBeInTheDocument()
        expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
        expect(screen.getByText('La categoría es requerida')).toBeInTheDocument()
        expect(screen.getByText('El precio es requerido')).toBeInTheDocument()
        expect(screen.getByText('La unidad es requerida')).toBeInTheDocument()
      })
    })

    it('should validate codigo format', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      const codigoInput = screen.getByLabelText('Código *')
      await userEvent.type(codigoInput, 'invalid code')

      const submitButton = screen.getByText('Crear')
      await userEvent.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('El código debe tener entre 3 y 20 caracteres alfanuméricos')).toBeInTheDocument()
      })
    })

    it('should validate precio as positive number', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      const precioInput = screen.getByLabelText('Precio *')
      await userEvent.type(precioInput, '-10')

      const submitButton = screen.getByText('Crear')
      await userEvent.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('El precio debe ser mayor a 0')).toBeInTheDocument()
      })
    })

    it('should submit form with valid data', async () => {
      // ✅ Arrange
      const createdProducto = { ...mockProducto, id: 'new-producto' }
      mockProductoService.createProducto.mockResolvedValue(createdProducto)

      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      // Fill form
      await userEvent.type(screen.getByLabelText('Código *'), 'PROD-NEW')
      await userEvent.type(screen.getByLabelText('Nombre *'), 'Nuevo Producto')
      await userEvent.type(screen.getByLabelText('Descripción'), 'Nueva descripción')
      await userEvent.type(screen.getByLabelText('Precio *'), '150.75')

      // Wait for selects to load and select options
      await waitFor(() => {
        expect(screen.getByText('Seleccionar categoría')).toBeInTheDocument()
      })

      const categoriaSelect = screen.getByText('Seleccionar categoría')
      await userEvent.click(categoriaSelect)
      await userEvent.click(screen.getByText('Categoria A'))

      const unidadSelect = screen.getByText('Seleccionar unidad')
      await userEvent.click(unidadSelect)
      await userEvent.click(screen.getByText('UND'))

      // Submit form
      const submitButton = screen.getByText('Crear')
      await userEvent.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.createProducto).toHaveBeenCalledWith({
          codigo: 'PROD-NEW',
          nombre: 'Nuevo Producto',
          descripcion: 'Nueva descripción',
          categoria: 'Categoria A',
          precio: 150.75,
          unidad: 'UND',
          activo: true,
        })
        expect(mockOnSuccess).toHaveBeenCalledWith(createdProducto)
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Producto creado exitosamente',
        })
      })
    })

    it('should handle create error', async () => {
      // ✅ Arrange
      mockProductoService.createProducto.mockRejectedValue(new Error('Error al crear'))

      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      // Fill required fields
      await userEvent.type(screen.getByLabelText('Código *'), 'PROD-NEW')
      await userEvent.type(screen.getByLabelText('Nombre *'), 'Nuevo Producto')
      await userEvent.type(screen.getByLabelText('Precio *'), '150')

      await waitFor(() => {
        expect(screen.getByText('Seleccionar categoría')).toBeInTheDocument()
      })

      const categoriaSelect = screen.getByText('Seleccionar categoría')
      await userEvent.click(categoriaSelect)
      await userEvent.click(screen.getByText('Categoria A'))

      const unidadSelect = screen.getByText('Seleccionar unidad')
      await userEvent.click(unidadSelect)
      await userEvent.click(screen.getByText('UND'))

      const submitButton = screen.getByText('Crear')
      await userEvent.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al crear',
          variant: 'destructive',
        })
      })
    })
  })

  describe('Edit Mode', () => {
    it('should render edit form with producto data', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} producto={mockProducto} />)

      // ✅ Assert
      expect(screen.getByText('Editar Producto')).toBeInTheDocument()
      expect(screen.getByDisplayValue('PROD-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Producto Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Descripción del producto test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100.5')).toBeInTheDocument()
      expect(screen.getByText('Actualizar')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Categoria A')).toBeInTheDocument()
        expect(screen.getByText('UND')).toBeInTheDocument()
      })
    })

    it('should have codigo field disabled in edit mode', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} producto={mockProducto} />)

      // ✅ Assert
      const codigoInput = screen.getByDisplayValue('PROD-001')
      expect(codigoInput).toBeDisabled()
    })

    it('should submit update with valid data', async () => {
      // ✅ Arrange
      const updatedProducto = { ...mockProducto, nombre: 'Producto Actualizado' }
      mockProductoService.updateProducto.mockResolvedValue(updatedProducto)

      // 🎯 Act
      render(<ProductoForm {...defaultProps} producto={mockProducto} />)

      // Update name
      const nombreInput = screen.getByDisplayValue('Producto Test')
      await userEvent.clear(nombreInput)
      await userEvent.type(nombreInput, 'Producto Actualizado')

      const submitButton = screen.getByText('Actualizar')
      await userEvent.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.updateProducto).toHaveBeenCalledWith(
          'producto-1',
          expect.objectContaining({
            nombre: 'Producto Actualizado',
          })
        )
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedProducto)
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Producto actualizado exitosamente',
        })
      })
    })

    it('should handle update error', async () => {
      // ✅ Arrange
      mockProductoService.updateProducto.mockRejectedValue(new Error('Error al actualizar'))

      // 🎯 Act
      render(<ProductoForm {...defaultProps} producto={mockProducto} />)

      const submitButton = screen.getByText('Actualizar')
      await userEvent.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al actualizar',
          variant: 'destructive',
        })
      })
    })
  })

  describe('Form Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      const cancelButton = screen.getByText('Cancelar')
      await userEvent.click(cancelButton)

      // ✅ Assert
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should toggle activo checkbox', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      const activoCheckbox = screen.getByLabelText('Activo')
      expect(activoCheckbox).toBeChecked()

      await userEvent.click(activoCheckbox)
      expect(activoCheckbox).not.toBeChecked()

      await userEvent.click(activoCheckbox)
      expect(activoCheckbox).toBeChecked()
    })

    it('should show loading state during submission', async () => {
      // ✅ Arrange
      let resolveCreate: (value: any) => void
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve
      })
      mockProductoService.createProducto.mockReturnValue(createPromise)

      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      // Fill required fields
      await userEvent.type(screen.getByLabelText('Código *'), 'PROD-NEW')
      await userEvent.type(screen.getByLabelText('Nombre *'), 'Nuevo Producto')
      await userEvent.type(screen.getByLabelText('Precio *'), '150')

      await waitFor(() => {
        expect(screen.getByText('Seleccionar categoría')).toBeInTheDocument()
      })

      const categoriaSelect = screen.getByText('Seleccionar categoría')
      await userEvent.click(categoriaSelect)
      await userEvent.click(screen.getByText('Categoria A'))

      const unidadSelect = screen.getByText('Seleccionar unidad')
      await userEvent.click(unidadSelect)
      await userEvent.click(screen.getByText('UND'))

      const submitButton = screen.getByText('Crear')
      await userEvent.click(submitButton)

      // ✅ Assert loading state
      expect(screen.getByText('Creando...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve promise
      resolveCreate!(mockProducto)
    })

    it('should handle categoria loading error', async () => {
      // ✅ Arrange
      mockProductoService.getCategorias.mockRejectedValue(new Error('Error loading categorias'))

      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al cargar categorías',
          variant: 'destructive',
        })
      })
    })

    it('should handle unidades loading error', async () => {
      // ✅ Arrange
      mockProductoService.getUnidades.mockRejectedValue(new Error('Error loading unidades'))

      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al cargar unidades',
          variant: 'destructive',
        })
      })
    })

    it('should reset form when switching between create and edit modes', async () => {
      // 🎯 Act
      const { rerender } = render(<ProductoForm {...defaultProps} />)

      // Fill some data
      await userEvent.type(screen.getByLabelText('Código *'), 'TEST')
      expect(screen.getByDisplayValue('TEST')).toBeInTheDocument()

      // Switch to edit mode
      rerender(<ProductoForm {...defaultProps} producto={mockProducto} />)

      // ✅ Assert
      expect(screen.getByDisplayValue('PROD-001')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('TEST')).not.toBeInTheDocument()
    })

    it('should handle keyboard navigation', async () => {
      // 🎯 Act
      render(<ProductoForm {...defaultProps} />)

      const codigoInput = screen.getByLabelText('Código *')
      codigoInput.focus()

      // ✅ Assert
      expect(codigoInput).toHaveFocus()

      // Test tab navigation
      await userEvent.tab()
      const nombreInput = screen.getByLabelText('Nombre *')
      expect(nombreInput).toHaveFocus()
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

export { mockProducto, mockCategorias, mockUnidades }