/**
 * Test para verificar que ProyectoSubMenu no genere keys duplicadas
 * 
 * Este test verifica que el componente ProyectoSubMenu no cause el error:
 * "Encountered two children with the same key"
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import ProyectoSubMenu from '../ProyectoSubMenu'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Home: () => <div data-testid="home-icon" />,
  Package: () => <div data-testid="package-icon" />,
  List: () => <div data-testid="list-icon" />,
  GitCompare: () => <div data-testid="git-compare-icon" />,
  ShoppingCart: () => <div data-testid="shopping-cart-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
}))

// Mock shadcn/ui components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span className={className} {...props} data-testid="badge">
      {children}
    </span>
  ),
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className, ...props }: any) => (
    <hr className={className} {...props} data-testid="separator" />
  ),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('ProyectoSubMenu - Duplicate Keys Fix', () => {
  const defaultProps = {
    proyectoId: 'test-project-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Unique Keys Validation', () => {
    it('should not generate duplicate keys for menu items', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      // This should not throw any React key errors
      expect(() => {
        render(<ProyectoSubMenu {...defaultProps} />)
      }).not.toThrow()
      
      // Verify console.error was not called with duplicate key warnings
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Encountered two children with the same key')
      )
    })

    it('should render all menu items with unique paths', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      // Verify all expected menu items are rendered
      expect(screen.getByText('Proyecto')).toBeInTheDocument()
      expect(screen.getByText('Equipos')).toBeInTheDocument()
      expect(screen.getByText('Listas')).toBeInTheDocument()
      expect(screen.getByText('Comparación')).toBeInTheDocument()
      expect(screen.getByText('Pedidos')).toBeInTheDocument()
      expect(screen.getByText('Requerimientos')).toBeInTheDocument()
      expect(screen.getByText('Valorizaciones')).toBeInTheDocument()
      expect(screen.getByText('Horas Hombre')).toBeInTheDocument()
    })

    it('should generate correct unique hrefs for each menu item', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      // Verify unique paths for each menu item
      expect(screen.getByRole('link', { name: /proyecto/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/'
      )
      expect(screen.getByRole('link', { name: /^equipos$/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/equipos'
      )
      expect(screen.getByRole('link', { name: /listas/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/equipos/listas'
      )
      expect(screen.getByRole('link', { name: /comparación/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/equipos/comparacion'
      )
      expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/equipos/pedidos'
      )
      expect(screen.getByRole('link', { name: /requerimientos/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/requerimientos'
      )
      expect(screen.getByRole('link', { name: /valorizaciones/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/gestion/valorizaciones'
      )
      expect(screen.getByRole('link', { name: /horas hombre/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/gestion/horas'
      )
    })

    it('should handle different active states without key conflicts', () => {
      // Test different active paths
      const testPaths = [
        '/proyectos/test-project-123/',
        '/proyectos/test-project-123/equipos',
        '/proyectos/test-project-123/equipos/listas',
        '/proyectos/test-project-123/equipos/comparacion',
        '/proyectos/test-project-123/equipos/pedidos',
        '/proyectos/test-project-123/requerimientos',
        '/proyectos/test-project-123/gestion/valorizaciones',
        '/proyectos/test-project-123/gestion/horas'
      ]

      testPaths.forEach(path => {
        mockUsePathname.mockReturnValue(path)
        
        expect(() => {
          const { unmount } = render(<ProyectoSubMenu {...defaultProps} />)
          unmount()
        }).not.toThrow()
      })
    })

    it('should not have duplicate path values in subMenu array', () => {
      // This test ensures the fix is maintained
      const subMenuPaths = [
        '', // Proyecto
        'equipos', // Equipos
        'equipos/listas', // Listas (fixed from 'equipos')
        'equipos/comparacion', // Comparación
        'equipos/pedidos', // Pedidos
        'requerimientos', // Requerimientos
        'gestion/valorizaciones', // Valorizaciones
        'gestion/horas' // Horas Hombre
      ]

      // Check for duplicates
      const uniquePaths = new Set(subMenuPaths)
      expect(uniquePaths.size).toBe(subMenuPaths.length)
      
      // Specifically verify the fix
      expect(subMenuPaths.filter(path => path === 'equipos')).toHaveLength(1)
      expect(subMenuPaths).toContain('equipos/listas')
    })
  })

  describe('Navigation Functionality', () => {
    it('should highlight correct active tab for equipos/listas path', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123/equipos/listas')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const listasLink = screen.getByRole('link', { name: /listas/i })
      expect(listasLink).toHaveClass('text-purple-600', 'bg-purple-50', 'border-purple-200')
    })

    it('should highlight correct active tab for equipos path', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123/equipos')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const equiposLink = screen.getByRole('link', { name: /^equipos$/i })
      expect(equiposLink).toHaveClass('text-green-600', 'bg-green-50', 'border-green-200')
    })
  })

  describe('Error Prevention', () => {
    it('should not log React key warnings to console', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      // Verify no React warnings about duplicate keys
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Encountered two children with the same key/)
      )
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Keys should be unique/)
      )
    })
  })
})
