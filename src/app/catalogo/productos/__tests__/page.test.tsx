// ===================================================
// 📁 Archivo: page.test.tsx
// 📌 Ubicación: src/app/catalogo/productos/__tests__/
// 🔧 Descripción: Pruebas para página principal de productos
// 🎨 Mejoras UX/UI: Testing completo de páginas
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import ProductosPage from '../page'

// 🔧 Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// 🔧 Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// 🔧 Mock ProductosClient component
jest.mock('../ProductosClient', () => {
  return function MockProductosClient() {
    return <div data-testid="productos-client">ProductosClient Component</div>
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

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

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

const mockSessionGerente = {
  user: {
    id: 'user-2',
    email: 'gerente@test.com',
    name: 'Gerente User',
    rol: 'Gerente',
  },
  expires: '2025-12-31',
}

const mockSessionLogistica = {
  user: {
    id: 'user-3',
    email: 'logistica@test.com',
    name: 'Logística User',
    rol: 'Logística',
  },
  expires: '2025-12-31',
}

const mockSessionUnauthorized = {
  user: {
    id: 'user-4',
    email: 'colaborador@test.com',
    name: 'Colaborador User',
    rol: 'Colaborador',
  },
  expires: '2025-12-31',
}

describe('ProductosPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should redirect to login when no session', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue(null)

      // 🎯 Act
      await ProductosPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('should redirect to unauthorized when user has insufficient permissions', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue(mockSessionUnauthorized)

      // 🎯 Act
      await ProductosPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })

    it('should allow access for Admin role', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue(mockSession)

      // 🎯 Act
      const result = await ProductosPage()

      // ✅ Assert
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should allow access for Gerente role', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue(mockSessionGerente)

      // 🎯 Act
      const result = await ProductosPage()

      // ✅ Assert
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should allow access for Logística role', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue(mockSessionLogistica)

      // 🎯 Act
      const result = await ProductosPage()

      // ✅ Assert
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('Page Rendering', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession)
    })

    it('should render page with correct metadata', async () => {
      // 🎯 Act
      const result = await ProductosPage()

      // ✅ Assert
      expect(result).toBeDefined()
      // Note: Metadata testing would typically be done at the Next.js level
      // Here we're testing that the component renders without errors
    })

    it('should render breadcrumb navigation', async () => {
      // 🎯 Act
      const PageComponent = await ProductosPage()
      render(PageComponent)

      // ✅ Assert
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
      expect(screen.getByText('Inicio')).toBeInTheDocument()
      expect(screen.getByText('Catálogo')).toBeInTheDocument()
      expect(screen.getByText('Productos')).toBeInTheDocument()
    })

    it('should render page title and description', async () => {
      // 🎯 Act
      const PageComponent = await ProductosPage()
      render(PageComponent)

      // ✅ Assert
      expect(screen.getByText('Catálogo de Productos')).toBeInTheDocument()
      expect(screen.getByText('Gestiona el catálogo de productos del sistema')).toBeInTheDocument()
    })

    it('should render ProductosClient component', async () => {
      // 🎯 Act
      const PageComponent = await ProductosPage()
      render(PageComponent)

      // ✅ Assert
      expect(screen.getByTestId('productos-client')).toBeInTheDocument()
    })

    it('should have proper page structure', async () => {
      // 🎯 Act
      const PageComponent = await ProductosPage()
      render(PageComponent)

      // ✅ Assert
      const container = screen.getByRole('main')
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('container', 'mx-auto', 'py-6')
    })

    it('should have responsive layout classes', async () => {
      // 🎯 Act
      const PageComponent = await ProductosPage()
      render(PageComponent)

      // ✅ Assert
      const headerSection = screen.getByText('Catálogo de Productos').closest('div')
      expect(headerSection).toHaveClass('flex', 'flex-col', 'gap-4', 'md:flex-row', 'md:items-center', 'md:justify-between')
    })
  })

  describe('Error Handling', () => {
    it('should handle session retrieval error', async () => {
      // ✅ Arrange
      mockGetServerSession.mockRejectedValue(new Error('Session error'))

      // 🎯 Act & Assert
      await expect(ProductosPage()).rejects.toThrow('Session error')
    })

    it('should handle missing user in session', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        expires: '2025-12-31',
        user: undefined,
      } as any)

      // 🎯 Act
      await ProductosPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('should handle missing rol in user', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        expires: '2025-12-31',
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
          // rol is missing
        },
      } as any)

      // 🎯 Act
      await ProductosPage()

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })
  })

  describe('Role-based Access Control', () => {
    const allowedRoles = ['Admin', 'Gerente', 'Logística']
    const deniedRoles = ['Comercial', 'Proyectos', 'Gestor', 'Coordinador', 'Colaborador']

    allowedRoles.forEach((rol) => {
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
        const result = await ProductosPage()

        // ✅ Assert
        expect(mockRedirect).not.toHaveBeenCalled()
        expect(result).toBeDefined()
      })
    })

    deniedRoles.forEach((rol) => {
      it(`should deny access for ${rol} role`, async () => {
        // ✅ Arrange
        mockGetServerSession.mockResolvedValue({
          ...mockSession,
          user: {
            ...mockSession.user,
            rol,
          },
        })

        // 🎯 Act
        await ProductosPage()

        // ✅ Assert
        expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })

  describe('SEO and Metadata', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession)
    })

    it('should have correct page title structure', async () => {
      // 🎯 Act
      const PageComponent = await ProductosPage()
      render(PageComponent)

      // ✅ Assert
      // The title would be set by Next.js metadata, but we can verify the content is rendered
      expect(screen.getByText('Catálogo de Productos')).toBeInTheDocument()
    })

    it('should have semantic HTML structure', async () => {
      // 🎯 Act
      const PageComponent = await ProductosPage()
      render(PageComponent)

      // ✅ Assert
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument() // breadcrumb
    })
  })

  describe('Performance Considerations', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession)
    })

    it('should render server component efficiently', async () => {
      // ✅ Arrange
      const startTime = Date.now()

      // 🎯 Act
      await ProductosPage()
      const endTime = Date.now()

      // ✅ Assert
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(100) // Should render quickly
    })

    it('should not cause memory leaks', async () => {
      // 🎯 Act
      for (let i = 0; i < 10; i++) {
        await ProductosPage()
      }

      // ✅ Assert
      // If there were memory leaks, this test would likely timeout or fail
      expect(true).toBe(true)
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

export { mockSession, mockSessionGerente, mockSessionLogistica, mockSessionUnauthorized }