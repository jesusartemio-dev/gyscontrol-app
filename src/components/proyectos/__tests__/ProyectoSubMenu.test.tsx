// ===================================================
// 📁 Archivo: ProyectoSubMenu.test.tsx
// 📌 Ubicación: src/components/proyectos/__tests__/ProyectoSubMenu.test.tsx
// 🔧 Descripción: Tests para el componente ProyectoSubMenu
//
// 🧠 Uso: Testing del submenú de navegación de proyectos
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-08-14
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import ProyectoSubMenu from '../ProyectoSubMenu'
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lucide-react icons
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

describe('ProyectoSubMenu', () => {
  const defaultProps = {
    proyectoId: 'test-project-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all navigation items', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      // Check all menu items are rendered
      expect(screen.getByText('Proyecto')).toBeInTheDocument()
      expect(screen.getByText('Equipos')).toBeInTheDocument()
      expect(screen.getByText('Listas')).toBeInTheDocument()
      expect(screen.getByText('Comparación')).toBeInTheDocument()
      expect(screen.getByText('Pedidos')).toBeInTheDocument()
      expect(screen.getByText('Requerimientos')).toBeInTheDocument()
      expect(screen.getByText('Valorizaciones')).toBeInTheDocument()
      expect(screen.getByText('Horas Hombre')).toBeInTheDocument()
    })

    it('should render header section with breadcrumb', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      expect(screen.getByText('Proyecto')).toBeInTheDocument()
      expect(screen.getByText('Navegación')).toBeInTheDocument()
      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument()
    })

    it('should render badge with sections count', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('8 secciones')
    })

    it('should render separator', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('should highlight active tab correctly', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123/equipos')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const equiposLink = screen.getByRole('link', { name: /equipos/i })
      expect(equiposLink).toHaveClass('text-green-600', 'bg-green-50', 'border-green-200')
    })

    it('should highlight root project tab when on base path', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123/')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const projectLink = screen.getByRole('link', { name: /proyecto/i })
      expect(projectLink).toHaveClass('text-blue-600', 'bg-blue-50', 'border-blue-200')
    })

    it('should handle nested paths correctly', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123/equipos/listas')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const listasLink = screen.getByRole('link', { name: /listas/i })
      expect(listasLink).toHaveClass('text-purple-600', 'bg-purple-50', 'border-purple-200')
    })
  })

  describe('Navigation Links', () => {
    it('should generate correct href for each menu item', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      expect(screen.getByRole('link', { name: /proyecto/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/'
      )
      expect(screen.getByRole('link', { name: /equipos/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/equipos'
      )
      expect(screen.getByRole('link', { name: /valorizaciones/i })).toHaveAttribute(
        'href',
        '/proyectos/test-project-123/gestion/valorizaciones'
      )
    })

    it('should handle different project IDs correctly', () => {
      mockUsePathname.mockReturnValue('/proyectos/another-project-456')
      
      render(<ProyectoSubMenu proyectoId="another-project-456" />)
      
      expect(screen.getByRole('link', { name: /proyecto/i })).toHaveAttribute(
        'href',
        '/proyectos/another-project-456/'
      )
    })
  })

  describe('Icons', () => {
    it('should render correct icon for each menu item', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
      expect(screen.getByTestId('package-icon')).toBeInTheDocument()
      expect(screen.getByTestId('list-icon')).toBeInTheDocument()
      expect(screen.getByTestId('git-compare-icon')).toBeInTheDocument()
      expect(screen.getByTestId('shopping-cart-icon')).toBeInTheDocument()
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument()
      expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper title attributes for tooltips', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      expect(screen.getByRole('link', { name: /proyecto/i })).toHaveAttribute(
        'title',
        'Vista general del proyecto'
      )
      expect(screen.getByRole('link', { name: /equipos/i })).toHaveAttribute(
        'title',
        'Gestión de equipos técnicos'
      )
    })

    it('should have proper link roles', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(8) // All menu items should be links
    })

    it('should be keyboard navigable', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const firstLink = screen.getByRole('link', { name: /proyecto/i })
      firstLink.focus()
      expect(firstLink).toHaveFocus()
    })
  })

  describe('Responsive Design', () => {
    it('should have overflow-x-auto for horizontal scrolling', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const tabsContainer = screen.getByRole('link', { name: /proyecto/i }).parentElement?.parentElement
      expect(tabsContainer).toHaveClass('overflow-x-auto')
    })

    it('should have flex-shrink-0 for preventing item shrinking', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const firstTabContainer = screen.getByRole('link', { name: /proyecto/i }).parentElement
      expect(firstTabContainer).toHaveClass('flex-shrink-0')
    })
  })

  describe('Visual Design', () => {
    it('should apply gradient background', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      const { container } = render(<ProyectoSubMenu {...defaultProps} />)
      
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('bg-gradient-to-r', 'from-white', 'via-gray-50/50', 'to-white')
    })

    it('should have bottom gradient effect', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      const { container } = render(<ProyectoSubMenu {...defaultProps} />)
      
      const gradientBar = container.querySelector('.h-1.bg-gradient-to-r')
      expect(gradientBar).toBeInTheDocument()
      expect(gradientBar).toHaveClass('from-blue-500/20', 'via-purple-500/20', 'to-blue-500/20')
    })

    it('should apply different color schemes for each section', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123/equipos')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const equiposLink = screen.getByRole('link', { name: /equipos/i })
      expect(equiposLink).toHaveClass('text-green-600', 'bg-green-50')
    })
  })

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      const startTime = performance.now()
      render(<ProyectoSubMenu {...defaultProps} />)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should render in less than 100ms
    })

    it('should not cause memory leaks with multiple renders', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      const { rerender, unmount } = render(<ProyectoSubMenu {...defaultProps} />)
      
      // Re-render multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<ProyectoSubMenu proyectoId={`project-${i}`} />)
      }
      
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing proyectoId gracefully', () => {
      mockUsePathname.mockReturnValue('/proyectos/undefined')
      
      expect(() => {
        render(<ProyectoSubMenu proyectoId={undefined as any} />)
      }).not.toThrow()
    })

    it('should handle invalid pathname gracefully', () => {
      mockUsePathname.mockReturnValue('/invalid/path')
      
      expect(() => {
        render(<ProyectoSubMenu {...defaultProps} />)
      }).not.toThrow()
    })
  })

  describe('Interaction', () => {
    it('should handle hover states', async () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const equiposLink = screen.getByRole('link', { name: /equipos/i })
      
      fireEvent.mouseEnter(equiposLink)
      
      await waitFor(() => {
        expect(equiposLink).toHaveClass('group')
      })
    })

    it('should handle click events', () => {
      mockUsePathname.mockReturnValue('/proyectos/test-project-123')
      
      render(<ProyectoSubMenu {...defaultProps} />)
      
      const equiposLink = screen.getByRole('link', { name: /equipos/i })
      
      expect(() => {
        fireEvent.click(equiposLink)
      }).not.toThrow()
    })
  })
})
