// ===================================================
// 📁 Archivo: page.test.tsx
// 📌 Ubicación: src/app/catalogo/productos/[id]/__tests__/
// 🔧 Descripción: Pruebas para página de detalle de producto
// 🎨 Mejoras UX/UI: Testing completo de páginas de detalle
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { render, screen, waitFor } from '@testing-library/react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import ProductoDetailPage from '../page'
import { ProductoService } from '@/lib/services/productoService'
import type { Producto } from '@prisma/client'

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

// 🔧 Mock ProductoService
jest.mock('@/lib/services/productoService')
const mockProductoService = ProductoService as jest.Mocked<typeof ProductoService>

// 🔧 Mock ProductoDetailClient
jest.mock('../ProductoDetailClient', () => {
  return function MockProductoDetailClient({ producto }: { producto: Producto }) {
    return (
      <div data-testid="producto-detail-client">
        <h1>{producto.nombre}</h1>
        <p>{producto.descripcion}</p>
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

// 🔧 Mock notFound
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  notFound: jest.fn(),
  redirect: jest.fn(),
}))

const { notFound } = require('next/navigation')
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>

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

describe('ProductoDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
    mockProductoService.getProductoById.mockResolvedValue(mockProducto)
  })

  describe('Authentication', () => {
    it('should redirect to login when not authenticated', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue(null)

      // 🎯 Act
      await ProductoDetailPage({ params: { id: 'producto-1' } })

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('should not redirect when authenticated', async () => {
      // 🎯 Act
      const result = await ProductoDetailPage({ params: { id: 'producto-1' } })

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
        const result = await ProductoDetailPage({ params: { id: 'producto-1' } })

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
        await ProductoDetailPage({ params: { id: 'producto-1' } })

        // ✅ Assert
        expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })

  describe('Data Fetching', () => {
    it('should fetch producto by id', async () => {
      // 🎯 Act
      await ProductoDetailPage({ params: { id: 'producto-1' } })

      // ✅ Assert
      expect(mockProductoService.getProductoById).toHaveBeenCalledWith('producto-1')
    })

    it('should call notFound when producto does not exist', async () => {
      // ✅ Arrange
      mockProductoService.getProductoById.mockResolvedValue(null)

      // 🎯 Act
      await ProductoDetailPage({ params: { id: 'nonexistent-id' } })

      // ✅ Assert
      expect(mockNotFound).toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      // ✅ Arrange
      mockProductoService.getProductoById.mockRejectedValue(new Error('Service error'))

      // 🎯 Act & Assert
      await expect(ProductoDetailPage({ params: { id: 'producto-1' } })).rejects.toThrow('Service error')
    })
  })

  describe('Page Rendering', () => {
    it('should render page with correct structure', async () => {
      // 🎯 Act
      const result = await ProductoDetailPage({ params: { id: 'producto-1' } })
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
      expect(screen.getByTestId('producto-detail-client')).toBeInTheDocument()
    })

    it('should render breadcrumb navigation', async () => {
      // 🎯 Act
      const result = await ProductoDetailPage({ params: { id: 'producto-1' } })
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByText('Inicio')).toBeInTheDocument()
      expect(screen.getByText('Catálogo')).toBeInTheDocument()
      expect(screen.getByText('Productos')).toBeInTheDocument()
      expect(screen.getByText('Producto Test')).toBeInTheDocument()
    })

    it('should pass producto to ProductoDetailClient', async () => {
      // 🎯 Act
      const result = await ProductoDetailPage({ params: { id: 'producto-1' } })
      render(result as React.ReactElement)

      // ✅ Assert
      expect(screen.getByText('Producto Test')).toBeInTheDocument()
      expect(screen.getByText('Descripción del producto test')).toBeInTheDocument()
    })
  })

  describe('Metadata Generation', () => {
    it('should generate correct metadata for existing producto', async () => {
      // 🎯 Act
      const metadata = await ProductoDetailPage.generateMetadata(
        { params: { id: 'producto-1' } },
        {}
      )

      // ✅ Assert
      expect(metadata.title).toBe('Producto Test - GYS')
      expect(metadata.description).toBe('Detalles del producto: Producto Test')
    })

    it('should generate default metadata for non-existing producto', async () => {
      // ✅ Arrange
      mockProductoService.getProductoById.mockResolvedValue(null)

      // 🎯 Act
      const metadata = await ProductoDetailPage.generateMetadata(
        { params: { id: 'nonexistent-id' } },
        {}
      )

      // ✅ Assert
      expect(metadata.title).toBe('Producto no encontrado - GYS')
      expect(metadata.description).toBe('El producto solicitado no fue encontrado')
    })

    it('should handle metadata generation errors', async () => {
      // ✅ Arrange
      mockProductoService.getProductoById.mockRejectedValue(new Error('Service error'))

      // 🎯 Act
      const metadata = await ProductoDetailPage.generateMetadata(
        { params: { id: 'producto-1' } },
        {}
      )

      // ✅ Assert
      expect(metadata.title).toBe('Error - GYS')
      expect(metadata.description).toBe('Error al cargar el producto')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty producto id', async () => {
      // 🎯 Act
      await ProductoDetailPage({ params: { id: '' } })

      // ✅ Assert
      expect(mockProductoService.getProductoById).toHaveBeenCalledWith('')
    })

    it('should handle special characters in producto id', async () => {
      // ✅ Arrange
      const specialId = 'producto-123!@#$%'

      // 🎯 Act
      await ProductoDetailPage({ params: { id: specialId } })

      // ✅ Assert
      expect(mockProductoService.getProductoById).toHaveBeenCalledWith(specialId)
    })

    it('should handle very long producto id', async () => {
      // ✅ Arrange
      const longId = 'a'.repeat(1000)

      // 🎯 Act
      await ProductoDetailPage({ params: { id: longId } })

      // ✅ Assert
      expect(mockProductoService.getProductoById).toHaveBeenCalledWith(longId)
    })
  })

  describe('Session Edge Cases', () => {
    it('should handle session without user', async () => {
      // ✅ Arrange
      mockGetServerSession.mockResolvedValue({
        expires: '2025-12-31',
      } as any)

      // 🎯 Act
      await ProductoDetailPage({ params: { id: 'producto-1' } })

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
      await ProductoDetailPage({ params: { id: 'producto-1' } })

      // ✅ Assert
      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized')
    })

    it('should handle getServerSession throwing error', async () => {
      // ✅ Arrange
      mockGetServerSession.mockRejectedValue(new Error('Session error'))

      // 🎯 Act & Assert
      await expect(ProductoDetailPage({ params: { id: 'producto-1' } })).rejects.toThrow('Session error')
    })
  })

  describe('Performance', () => {
    it('should not make unnecessary service calls', async () => {
      // 🎯 Act
      await ProductoDetailPage({ params: { id: 'producto-1' } })

      // ✅ Assert
      expect(mockProductoService.getProductoById).toHaveBeenCalledTimes(1)
      expect(mockGetServerSession).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent requests properly', async () => {
      // 🎯 Act
      const promises = [
        ProductoDetailPage({ params: { id: 'producto-1' } }),
        ProductoDetailPage({ params: { id: 'producto-2' } }),
        ProductoDetailPage({ params: { id: 'producto-3' } }),
      ]

      await Promise.all(promises)

      // ✅ Assert
      expect(mockProductoService.getProductoById).toHaveBeenCalledTimes(3)
      expect(mockProductoService.getProductoById).toHaveBeenCalledWith('producto-1')
      expect(mockProductoService.getProductoById).toHaveBeenCalledWith('producto-2')
      expect(mockProductoService.getProductoById).toHaveBeenCalledWith('producto-3')
    })
  })
})

// 🧪 Test utilities
export const createMockParams = (id: string) => ({ params: { id } })

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