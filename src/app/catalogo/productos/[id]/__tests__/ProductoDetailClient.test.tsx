// ===================================================
// 📁 Archivo: ProductoDetailClient.test.tsx
// 📌 Ubicación: src/app/catalogo/productos/[id]/__tests__/
// 🔧 Descripción: Pruebas para ProductoDetailClient component
// 🎨 Mejoras UX/UI: Testing completo de componentes de detalle
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ProductoDetailClient from '../ProductoDetailClient'
import { ProductoService } from '@/lib/services/productoService'
import type { Producto } from '@prisma/client'

// 🔧 Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// 🔧 Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// 🔧 Mock ProductoService
jest.mock('@/lib/services/productoService')
const mockProductoService = ProductoService as jest.Mocked<typeof ProductoService>

// 🔧 Mock ProductoForm component
jest.mock('@/components/catalogo/productos/ProductoForm', () => {
  return function MockProductoForm({ onSuccess, onCancel, producto }: any) {
    return (
      <div data-testid="producto-form">
        <button onClick={() => onSuccess({ ...producto, nombre: 'Updated Producto' })}>Success</button>
        <button onClick={onCancel}>Cancel</button>
        <span>Editing: {producto?.nombre}</span>
      </div>
    )
  }
})

// 🔧 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
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

// 🔧 Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}))

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

// 🔧 Mock Lucide icons
jest.mock('lucide-react', () => ({
  Edit: () => <span data-testid="edit-icon">Edit</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Package: () => <span data-testid="package-icon">Package</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  DollarSign: () => <span data-testid="dollar-icon">Dollar</span>,
  Tag: () => <span data-testid="tag-icon">Tag</span>,
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

const mockSession = {
  user: {
    id: 'user-1',
    email: 'admin@test.com',
    name: 'Admin User',
    rol: 'Admin',
  },
  expires: '2025-12-31',
}

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

describe('ProductoDetailClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })
    mockUseRouter.mockReturnValue(mockRouter)
    mockProductoService.deleteProducto.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should render producto details correctly', () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert
      expect(screen.getByText('Producto Test')).toBeInTheDocument()
      expect(screen.getByText('PROD-001')).toBeInTheDocument()
      expect(screen.getByText('Descripción del producto test')).toBeInTheDocument()
      expect(screen.getByText('Categoria A')).toBeInTheDocument()
      expect(screen.getByText('S/ 100.50')).toBeInTheDocument()
      expect(screen.getByText('UND')).toBeInTheDocument()
    })

    it('should render active badge for active products', () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert
      const activeBadge = screen.getByText('Activo')
      expect(activeBadge).toBeInTheDocument()
      expect(activeBadge).toHaveAttribute('data-variant', 'default')
    })

    it('should render inactive badge for inactive products', () => {
      // ✅ Arrange
      const inactiveProducto = { ...mockProducto, activo: false }

      // 🎯 Act
      render(<ProductoDetailClient producto={inactiveProducto} />)

      // ✅ Assert
      const inactiveBadge = screen.getByText('Inactivo')
      expect(inactiveBadge).toBeInTheDocument()
      expect(inactiveBadge).toHaveAttribute('data-variant', 'secondary')
    })

    it('should render formatted dates', () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert
      expect(screen.getByText('27/01/2025')).toBeInTheDocument()
    })

    it('should render all icons', () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert
      expect(screen.getByTestId('package-icon')).toBeInTheDocument()
      expect(screen.getByTestId('tag-icon')).toBeInTheDocument()
      expect(screen.getByTestId('dollar-icon')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    })
  })

  describe('Permissions', () => {
    const testCases = [
      {
        rol: 'Admin',
        canEdit: true,
        canDelete: true,
      },
      {
        rol: 'Gerente',
        canEdit: true,
        canDelete: true,
      },
      {
        rol: 'Logística',
        canEdit: true,
        canDelete: false,
      },
      {
        rol: 'Colaborador',
        canEdit: false,
        canDelete: false,
      },
    ]

    testCases.forEach(({ rol, canEdit, canDelete }) => {
      it(`should show correct action buttons for ${rol} role`, () => {
        // ✅ Arrange
        mockUseSession.mockReturnValue({
          data: {
            ...mockSession,
            user: {
              ...mockSession.user,
              rol,
            },
          },
          status: 'authenticated',
          update: jest.fn(),
        })

        // 🎯 Act
        render(<ProductoDetailClient producto={mockProducto} />)

        // ✅ Assert
        if (canEdit) {
          expect(screen.getByText('Editar')).toBeInTheDocument()
        } else {
          expect(screen.queryByText('Editar')).not.toBeInTheDocument()
        }

        if (canDelete) {
          expect(screen.getByText('Eliminar')).toBeInTheDocument()
        } else {
          expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
        }
      })
    })
  })

  describe('Edit Functionality', () => {
    it('should open edit dialog when edit button is clicked', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const editButton = screen.getByText('Editar')
      await userEvent.click(editButton)

      // ✅ Assert
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Editar Producto')).toBeInTheDocument()
      expect(screen.getByTestId('producto-form')).toBeInTheDocument()
      expect(screen.getByText('Editing: Producto Test')).toBeInTheDocument()
    })

    it('should close edit dialog when cancelled', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const editButton = screen.getByText('Editar')
      await userEvent.click(editButton)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)

      // ✅ Assert
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should handle successful edit', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const editButton = screen.getByText('Editar')
      await userEvent.click(editButton)

      const successButton = screen.getByText('Success')
      await userEvent.click(successButton)

      // ✅ Assert
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Éxito',
        description: 'Producto actualizado exitosamente',
      })
    })
  })

  describe('Delete Functionality', () => {
    it('should open delete confirmation dialog when delete button is clicked', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const deleteButton = screen.getByText('Eliminar')
      await userEvent.click(deleteButton)

      // ✅ Assert
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
      expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument()
      expect(screen.getByText('Esta acción no se puede deshacer. El producto "Producto Test" será eliminado permanentemente.')).toBeInTheDocument()
    })

    it('should close delete dialog when cancelled', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const deleteButton = screen.getByText('Eliminar')
      await userEvent.click(deleteButton)

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()

      const cancelButton = screen.getByText('Cancelar')
      await userEvent.click(cancelButton)

      // ✅ Assert
      expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument()
    })

    it('should delete producto and navigate back when confirmed', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const deleteButton = screen.getByText('Eliminar')
      await userEvent.click(deleteButton)

      const confirmButton = screen.getByText('Eliminar')
      await userEvent.click(confirmButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.deleteProducto).toHaveBeenCalledWith('producto-1')
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Producto eliminado exitosamente',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/catalogo/productos')
      })
    })

    it('should handle delete error', async () => {
      // ✅ Arrange
      mockProductoService.deleteProducto.mockRejectedValue(new Error('Delete error'))

      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const deleteButton = screen.getByText('Eliminar')
      await userEvent.click(deleteButton)

      const confirmButton = screen.getByText('Eliminar')
      await userEvent.click(confirmButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Delete error',
          variant: 'destructive',
        })
      })
    })

    it('should show loading state during deletion', async () => {
      // ✅ Arrange
      let resolveDelete: () => void
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve
      })
      mockProductoService.deleteProducto.mockReturnValue(deletePromise)

      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const deleteButton = screen.getByText('Eliminar')
      await userEvent.click(deleteButton)

      const confirmButton = screen.getByText('Eliminar')
      await userEvent.click(confirmButton)

      // ✅ Assert loading state
      expect(screen.getByText('Eliminando...')).toBeInTheDocument()
      expect(confirmButton).toBeDisabled()

      // Resolve promise
      resolveDelete!()
    })
  })

  describe('Session Handling', () => {
    it('should handle missing session gracefully', () => {
      // ✅ Arrange
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert
      expect(screen.getByText('Producto Test')).toBeInTheDocument()
      expect(screen.queryByText('Editar')).not.toBeInTheDocument()
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
    })

    it('should handle loading session state', () => {
      // ✅ Arrange
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      })

      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert
      expect(screen.getByText('Producto Test')).toBeInTheDocument()
    })
  })

  describe('Price Formatting', () => {
    it('should format price correctly for different values', () => {
      const testCases = [
        { precio: 100.50, expected: 'S/ 100.50' },
        { precio: 1000, expected: 'S/ 1,000.00' },
        { precio: 0, expected: 'S/ 0.00' },
        { precio: 99.99, expected: 'S/ 99.99' },
      ]

      testCases.forEach(({ precio, expected }) => {
        const producto = { ...mockProducto, precio }
        const { rerender } = render(<ProductoDetailClient producto={producto} />)

        expect(screen.getByText(expected)).toBeInTheDocument()

        rerender(<div />)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert
      const editButton = screen.getByText('Editar')
      expect(editButton).toHaveAttribute('aria-label', 'Editar producto')

      const deleteButton = screen.getByText('Eliminar')
      expect(deleteButton).toHaveAttribute('aria-label', 'Eliminar producto')
    })

    it('should handle keyboard navigation', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const editButton = screen.getByText('Editar')
      editButton.focus()

      // ✅ Assert
      expect(editButton).toHaveFocus()

      // Test Tab navigation
      fireEvent.keyDown(editButton, { key: 'Tab' })
      const deleteButton = screen.getByText('Eliminar')
      expect(deleteButton).toHaveFocus()
    })

    it('should support Enter key for actions', async () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      const editButton = screen.getByText('Editar')
      editButton.focus()

      // Test Enter key
      fireEvent.keyDown(editButton, { key: 'Enter' })
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Animation States', () => {
    it('should render with proper motion props', () => {
      // 🎯 Act
      render(<ProductoDetailClient producto={mockProducto} />)

      // ✅ Assert - Check that motion components are rendered
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })
  })
})

// 🧪 Test utilities
export const createMockProducto = (overrides?: Partial<Producto>): Producto => {
  return {
    id: 'test-producto',
    codigo: 'TEST-001',
    nombre: 'Test Producto',
    descripcion: 'Test description',
    categoria: 'Test Category',
    precio: 100,
    unidad: 'UND',
    activo: true,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    ...overrides,
  }
}

export { mockProducto, mockSession }