// ===================================================
// 📁 Archivo: page.test.tsx
// 📌 Ubicación: src/app/catalogo/productos/nuevo/__tests__/
// 🔧 Descripción: Pruebas para página de creación de producto
// 🎨 Mejoras UX/UI: Testing completo de páginas de creación
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { render, screen } from '@testing-library/react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import NuevoProductoPage from '../page'

// 🔧 Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>

// 🔧 Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// 🔧 Mock ProductoForm component
jest.mock('@/components/catalogo/productos/ProductoForm', () => {
  return function MockProductoForm({ onSuccess, onCancel }: any) {
    return (
      <div data-testid="producto-form">
        <h2>Crear Producto</h2>
        <button onClick={() => onSuccess({ id: 'new-id', nombre: 'New Producto' })}>Success</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})

// 🔧 Mock Breadcrumb component
jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ children }: any) => <nav data-testid="breadcrumb">{children}</nav>,
  BreadcrumbList: ({ children }: any) => <ol>{children}</ol>,
  BreadcrumbItem: ({ children }: any) => <li>{children}</li>,
  BreadcrumbLink: ({ children, href }: any) => <a href={href}>{children}</a>,
  BreadcrumbSeparator: () => <span>/</span>,
  BreadcrumbPage: ({ children }: any) => <span>{children}</span>,
}))

// 🔧 Mock Card components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}))

// 🔧 Mock useRouter
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  redirect: jest.fn(),
}))

// 📋 Test data
const mockSession = {
  user: {
    id: 'user-1',
    email: 'admin@test.com',
    name: 'Admin User',
    rol: 'Admin',
  },
  expires: '2025-12-31',
}

describe('NuevoProductoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
  })

  describe('Authentication', () => {
    it('should redirect to login when not authenticated', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue(null)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('should not redirect when authenticated', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('Authorization', () => {
    const authorizedRoles = ['Admin', 'Gerente', 'Logística']
    const unauthorizedRoles = ['Comercial', 'Proyectos', 'Gestor', 'Coordinador', 'Colaborador']

    authorizedRoles.forEach((rol) => {
      it(`should allow access for ${rol} role`, async () => {
        // ✅ Arrange
        mockGetServerSession.mockResolvedValue({
          ...mockSession,
          user: {
            ...mockSession.user,
            rol,
          },
        })

        // 🎯 Act
        const result = await NuevoProductoPage()

        // ✅ Assert
        expect(mockRedirect).not.toHaveBeenCalled()
        expect(result).toBeDefined()
      })
    })

    unauthorizedRoles.forEach((rol) => {
      it(`should redirect unauthorized ${rol} role`, async () => {
        // ✅ Arrange
        mockGetServerSession.mockResolvedValue({
          ...mockSession,
          user: {
            ...mockSession.user,
            rol,
          },
        })

        // 🎯 Act
        await NuevoProductoPage()

        // ✅ Assert
        expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })

  describe('Page Rendering', () => {
    it('should render page with correct structure', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByTestId('producto-form')).toBeInTheDocument()
    })

    it('should render breadcrumb navigation', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByText('Inicio')).toBeInTheDocument()
      expect(screen.getByText('Catálogo')).toBeInTheDocument()
      expect(screen.getByText('Productos')).toBeInTheDocument()
      expect(screen.getByText('Nuevo')).toBeInTheDocument()
    })

    it('should render page title and description', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByText('Crear Nuevo Producto')).toBeInTheDocument()
      expect(screen.getByText('Complete la información para crear un nuevo producto en el catálogo')).toBeInTheDocument()
    })

    it('should render ProductoForm component', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByTestId('producto-form')).toBeInTheDocument()
      expect(screen.getByText('Crear Producto')).toBeInTheDocument()
    })
  })

  describe('Metadata', () => {
    it('should have correct metadata', () => {
      // ✅ Assert
      expect(NuevoProductoPage.metadata).toEqual({
        title: 'Nuevo Producto - GYS',
        description: 'Crear un nuevo producto en el catálogo',
      })
    })
  })

  describe('Session Edge Cases', () => {
    it('should handle session without user', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('should handle session with user without rol', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
        },
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })

    it('should handle getServerSession throwing error', async () => {
      // ✅ Arrange
      mockGetServerSession.mockRejectedValue(new Error('Session error'))

      // 🎯 Act & Assert
      await expect(NuevoProductoPage()).rejects.toThrow('Session error')
    })
  })

  describe('Role-based Access Control', () => {
    it('should handle null rol gracefully', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
          rol: null,
        },
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })

    it('should handle undefined rol gracefully', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
          rol: undefined,
        },
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })

    it('should handle empty string rol', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
          rol: '',
        },
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })

    it('should handle case-sensitive rol matching', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
          rol: 'admin', // lowercase
        },
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })

    it('should handle unknown rol', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
          rol: 'UnknownRole',
        },
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })
  })

  describe('Performance', () => {
    it('should not make unnecessary session calls', async () => {
      // 🎯 Act
      await NuevoProductoPage()

      // ✅ Assert
      expect(mockGetServerSession).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent requests properly', async () => {
      // 🎯 Act
      const promises = [
        NuevoProductoPage(),
        NuevoProductoPage(),
        NuevoProductoPage(),
      ]

      await Promise.all(promises)

      // ✅ Assert
      expect(mockGetServerSession).toHaveBeenCalledTimes(3)
    })
  })

  describe('Component Integration', () => {
    it('should pass correct props to ProductoForm', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByTestId('producto-form')).toBeInTheDocument()
      // The form should be in create mode (no producto prop)
      expect(screen.queryByText('Editing:')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper page structure for screen readers', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByRole('navigation')).toBeInTheDocument() // breadcrumb
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument() // page title
    })

    it('should have descriptive page title', async () => {
      // 🎯 Act
      const result = await NuevoProductoPage()
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByText('Crear Nuevo Producto')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle session service errors gracefully', async () => {
      // ✅ Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockGetServerSession.mockRejectedValue(new Error('Database connection failed'))

      // 🎯 Act & Assert
      await expect(NuevoProductoPage()).rejects.toThrow('Database connection failed')

      consoleErrorSpy.mockRestore()
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

export { mockSession }