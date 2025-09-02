// ===================================================
// 📁 Archivo: ProductosClient.test.tsx
// 📌 Ubicación: src/app/catalogo/productos/__tests__/
// 🔧 Descripción: Pruebas para ProductosClient component
// 🎨 Mejoras UX/UI: Testing completo de componentes cliente
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ProductosClient from '../ProductosClient'
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

// 🔧 Mock ProductoList component
jest.mock('@/components/catalogo/productos/ProductoList', () => {
  return function MockProductoList({ onEdit, onDelete, onView, canEdit, canDelete }: any) {
    return (
      <div data-testid="producto-list">
        <button onClick={() => onView({ id: 'test-id', nombre: 'Test Producto' })}>View Test</button>
        {canEdit && (
          <button onClick={() => onEdit({ id: 'test-id', nombre: 'Test Producto' })}>Edit Test</button>
        )}
        {canDelete && (
          <button onClick={() => onDelete({ id: 'test-id', nombre: 'Test Producto' })}>Delete Test</button>
        )}
      </div>
    )
  }
})

// 🔧 Mock ProductoForm component
jest.mock('@/components/catalogo/productos/ProductoForm', () => {
  return function MockProductoForm({ onSuccess, onCancel, producto }: any) {
    return (
      <div data-testid="producto-form">
        <button onClick={() => onSuccess({ id: 'new-id', nombre: 'New Producto' })}>Success</button>
        <button onClick={onCancel}>Cancel</button>
        {producto && <span>Editing: {producto.nombre}</span>}
      </div>
    )
  }
})

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

// 🔧 Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
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

describe('ProductosClient', () => {
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
    it('should render ProductoList component', () => {
      // 🎯 Act
      render(<ProductosClient />)

      // ✅ Assert
      expect(screen.getByTestId('producto-list')).toBeInTheDocument()
    })

    it('should render create button for authorized users', () => {
      // 🎯 Act
      render(<ProductosClient />)

      // ✅ Assert
      expect(screen.getByText('Nuevo Producto')).toBeInTheDocument()
    })

    it('should not render create button for unauthorized users', () => {
      // ✅ Arrange
      mockUseSession.mockReturnValue({
        data: {
          ...mockSession,
          user: {
            ...mockSession.user,
            rol: 'Colaborador',
          },
        },
        status: 'authenticated',
        update: jest.fn(),
      })

      // 🎯 Act
      render(<ProductosClient />)

      // ✅ Assert
      expect(screen.queryByText('Nuevo Producto')).not.toBeInTheDocument()
    })
  })

  describe('Permissions', () => {
    const testCases = [
      {
        rol: 'Admin',
        canCreate: true,
        canEdit: true,
        canDelete: true,
      },
      {
        rol: 'Gerente',
        canCreate: true,
        canEdit: true,
        canDelete: true,
      },
      {
        rol: 'Logística',
        canCreate: true,
        canEdit: true,
        canDelete: false,
      },
      {
        rol: 'Colaborador',
        canCreate: false,
        canEdit: false,
        canDelete: false,
      },
    ]

    testCases.forEach(({ rol, canCreate, canEdit, canDelete }) => {
      it(`should have correct permissions for ${rol} role`, () => {
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
        render(<ProductosClient />)

        // ✅ Assert
        if (canCreate) {
          expect(screen.getByText('Nuevo Producto')).toBeInTheDocument()
        } else {
          expect(screen.queryByText('Nuevo Producto')).not.toBeInTheDocument()
        }

        if (canEdit) {
          expect(screen.getByText('Edit Test')).toBeInTheDocument()
        } else {
          expect(screen.queryByText('Edit Test')).not.toBeInTheDocument()
        }

        if (canDelete) {
          expect(screen.getByText('Delete Test')).toBeInTheDocument()
        } else {
          expect(screen.queryByText('Delete Test')).not.toBeInTheDocument()
        }
      })
    })
  })

  describe('Create Producto', () => {
    it('should open create dialog when create button is clicked', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const createButton = screen.getByText('Nuevo Producto')
      await userEvent.click(createButton)

      // ✅ Assert
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Crear Producto')).toBeInTheDocument()
      expect(screen.getByTestId('producto-form')).toBeInTheDocument()
    })

    it('should close create dialog when form is cancelled', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const createButton = screen.getByText('Nuevo Producto')
      await userEvent.click(createButton)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)

      // ✅ Assert
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should close create dialog and show success message when form is submitted', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const createButton = screen.getByText('Nuevo Producto')
      await userEvent.click(createButton)

      const successButton = screen.getByText('Success')
      await userEvent.click(successButton)

      // ✅ Assert
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Éxito',
        description: 'Producto creado exitosamente',
      })
    })
  })

  describe('Edit Producto', () => {
    it('should open edit dialog when edit is triggered', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const editButton = screen.getByText('Edit Test')
      await userEvent.click(editButton)

      // ✅ Assert
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Editar Producto')).toBeInTheDocument()
      expect(screen.getByText('Editing: Test Producto')).toBeInTheDocument()
    })

    it('should close edit dialog when form is cancelled', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const editButton = screen.getByText('Edit Test')
      await userEvent.click(editButton)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)

      // ✅ Assert
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should close edit dialog and show success message when form is submitted', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const editButton = screen.getByText('Edit Test')
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

  describe('View Producto', () => {
    it('should navigate to producto detail when view is triggered', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const viewButton = screen.getByText('View Test')
      await userEvent.click(viewButton)

      // ✅ Assert
      expect(mockRouter.push).toHaveBeenCalledWith('/catalogo/productos/test-id')
    })
  })

  describe('Delete Producto', () => {
    it('should open delete confirmation dialog when delete is triggered', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const deleteButton = screen.getByText('Delete Test')
      await userEvent.click(deleteButton)

      // ✅ Assert
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
      expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument()
      expect(screen.getByText('Esta acción no se puede deshacer. El producto será eliminado permanentemente.')).toBeInTheDocument()
    })

    it('should close delete dialog when cancelled', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const deleteButton = screen.getByText('Delete Test')
      await userEvent.click(deleteButton)

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()

      const cancelButton = screen.getByText('Cancelar')
      await userEvent.click(cancelButton)

      // ✅ Assert
      expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument()
    })

    it('should delete producto and show success message when confirmed', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const deleteButton = screen.getByText('Delete Test')
      await userEvent.click(deleteButton)

      const confirmButton = screen.getByText('Eliminar')
      await userEvent.click(confirmButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProductoService.deleteProducto).toHaveBeenCalledWith('test-id')
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Producto eliminado exitosamente',
        })
        expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument()
      })
    })

    it('should handle delete error', async () => {
      // ✅ Arrange
      mockProductoService.deleteProducto.mockRejectedValue(new Error('Delete error'))

      // 🎯 Act
      render(<ProductosClient />)

      const deleteButton = screen.getByText('Delete Test')
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
      render(<ProductosClient />)

      const deleteButton = screen.getByText('Delete Test')
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
      render(<ProductosClient />)

      // ✅ Assert
      expect(screen.getByTestId('producto-list')).toBeInTheDocument()
      expect(screen.queryByText('Nuevo Producto')).not.toBeInTheDocument()
    })

    it('should handle loading session state', () => {
      // ✅ Arrange
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      })

      // 🎯 Act
      render(<ProductosClient />)

      // ✅ Assert
      expect(screen.getByTestId('producto-list')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      // 🎯 Act
      render(<ProductosClient />)

      // ✅ Assert
      const createButton = screen.getByText('Nuevo Producto')
      expect(createButton).toHaveAttribute('aria-label', 'Crear nuevo producto')
    })

    it('should handle keyboard navigation', async () => {
      // 🎯 Act
      render(<ProductosClient />)

      const createButton = screen.getByText('Nuevo Producto')
      createButton.focus()

      // ✅ Assert
      expect(createButton).toHaveFocus()

      // Test Enter key
      fireEvent.keyDown(createButton, { key: 'Enter' })
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
    })
  })
})

// 🧪 Test utilities
export const createMockSession = (overrides?: any) => {
  return {
    user: {
      id: 'test-user',
      email: 'test@test.com',
      name: 'Test User',
      rol: 'Admin',
      ...overrides?.user,
    },
    expires: '2025-12-31',
    ...overrides,
  }
}

export { mockProducto, mockSession }