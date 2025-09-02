// ===================================================
// 📁 Archivo: LogisticaSubMenu.test.tsx
// 📌 Ubicación: src/components/logistica/__tests__/LogisticaSubMenu.test.tsx
// 🔧 Descripción: Tests para el componente LogisticaSubMenu mejorado
//
// 🧠 Uso: Testing del submenú de navegación de logística
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-15
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import LogisticaSubMenu from '../LogisticaSubMenu'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr {...props} />,
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('LogisticaSubMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component with header and navigation', () => {
      mockUsePathname.mockReturnValue('/logistica/pedidos')
      
      render(<LogisticaSubMenu />)
      
      expect(screen.getByText('Logística')).toBeInTheDocument()
      expect(screen.getByText('Gestión integral de equipos y proveedores')).toBeInTheDocument()
      expect(screen.getByText('Sistema Integrado')).toBeInTheDocument()
      expect(screen.getByText('Sistema activo')).toBeInTheDocument()
    })

    it('should render all navigation items with icons', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      // Check all menu items are present
      expect(screen.getByText('Listas')).toBeInTheDocument()
      expect(screen.getByText('Pedidos')).toBeInTheDocument()
      expect(screen.getByText('Cotizaciones')).toBeInTheDocument()
      expect(screen.getByText('Proveedores')).toBeInTheDocument()
    })

    it('should render navigation links with correct hrefs', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      expect(screen.getByRole('link', { name: /listas/i })).toHaveAttribute('href', '/logistica/listas')
      expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute('href', '/logistica/pedidos')
      expect(screen.getByRole('link', { name: /cotizaciones/i })).toHaveAttribute('href', '/logistica/cotizaciones')
      expect(screen.getByRole('link', { name: /proveedores/i })).toHaveAttribute('href', '/logistica/proveedores')
    })
  })

  describe('Active State', () => {
    it('should highlight the active menu item - Listas', () => {
      mockUsePathname.mockReturnValue('/logistica/listas')
      
      render(<LogisticaSubMenu />)
      
      const listasLink = screen.getByRole('link', { name: /listas/i })
      expect(listasLink).toHaveClass('text-green-600')
      expect(listasLink).toHaveClass('bg-gray-50')
    })

    it('should highlight the active menu item - Pedidos', () => {
       mockUsePathname.mockReturnValue('/logistica/pedidos')
       
       render(<LogisticaSubMenu />)
       
       const pedidosLink = screen.getByRole('link', { name: /pedidos/i })
       expect(pedidosLink).toHaveClass('text-blue-600')
       expect(pedidosLink).toHaveClass('bg-gray-50')
     })

    it('should highlight the active menu item - Cotizaciones', () => {
      mockUsePathname.mockReturnValue('/logistica/cotizaciones')
      
      render(<LogisticaSubMenu />)
      
      const cotizacionesLink = screen.getByRole('link', { name: /cotizaciones/i })
      expect(cotizacionesLink).toHaveClass('text-orange-600')
      expect(cotizacionesLink).toHaveClass('bg-gray-50')
    })

    it('should highlight the active menu item - Proveedores', () => {
      mockUsePathname.mockReturnValue('/logistica/proveedores')
      
      render(<LogisticaSubMenu />)
      
      const proveedoresLink = screen.getByRole('link', { name: /proveedores/i })
      expect(proveedoresLink).toHaveClass('text-purple-600')
      expect(proveedoresLink).toHaveClass('bg-gray-50')
    })

    it('should not highlight any item when on base logistica path', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const listasLink = screen.getByRole('link', { name: /listas/i })
      const pedidosLink = screen.getByRole('link', { name: /pedidos/i })
      const cotizacionesLink = screen.getByRole('link', { name: /cotizaciones/i })
      const proveedoresLink = screen.getByRole('link', { name: /proveedores/i })
      
      expect(listasLink).toHaveClass('text-gray-600')
      expect(pedidosLink).toHaveClass('text-gray-600')
      expect(cotizacionesLink).toHaveClass('text-gray-600')
      expect(proveedoresLink).toHaveClass('text-gray-600')
    })
  })

  describe('Tooltips and Accessibility', () => {
    it('should have proper title attributes for accessibility', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      expect(screen.getByRole('link', { name: /listas/i })).toHaveAttribute('title', 'Listas técnicas de equipos')
      expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute('title', 'Gestión de pedidos de equipos')
      expect(screen.getByRole('link', { name: /cotizaciones/i })).toHaveAttribute('title', 'Cotizaciones de proveedores')
      expect(screen.getByRole('link', { name: /proveedores/i })).toHaveAttribute('title', 'Gestión de proveedores')
    })

    it('should have proper ARIA roles', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(4)
      
      links.forEach(link => {
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href')
      })
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive classes for mobile and desktop', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      // Check for responsive navigation container
      const navContainer = screen.getByText('Pedidos').closest('.flex')
      expect(navContainer).toHaveClass('flex-wrap')
      expect(navContainer).toHaveClass('gap-2')
      expect(navContainer).toHaveClass('lg:gap-4')
    })

    it('should hide text on small screens and show on larger screens', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const pedidosText = screen.getByText('Pedidos')
      expect(pedidosText).toHaveClass('hidden')
      expect(pedidosText).toHaveClass('sm:inline')
    })

    it('should show system status only on large screens', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const systemStatus = screen.getByText('Sistema activo').closest('div')
      expect(systemStatus).toHaveClass('hidden')
      expect(systemStatus).toHaveClass('lg:flex')
    })
  })

  describe('Visual Elements', () => {
    it('should render the separator component', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const separator = screen.getByRole('separator')
      expect(separator).toBeInTheDocument()
    })

    it('should render the badge component', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const badge = screen.getByText('Sistema Integrado')
      expect(badge).toBeInTheDocument()
    })

    it('should have proper styling classes', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const container = screen.getByText('Logística').closest('div')
      expect(container).toHaveClass('bg-white/95')
      expect(container).toHaveClass('backdrop-blur-sm')
      expect(container).toHaveClass('border-b')
      expect(container).toHaveClass('shadow-sm')
    })
  })

  describe('Interaction', () => {
    it('should handle hover states properly', async () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const pedidosLink = screen.getByRole('link', { name: /pedidos/i })
      
      // Check hover classes are present
      expect(listasLink).toHaveClass('hover:bg-gray-50')
      expect(listasLink).toHaveClass('hover:shadow-sm')
      expect(pedidosLink).toHaveClass('hover:text-blue-700')
    })

    it('should have proper transition classes', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const links = screen.getAllByRole('link')
      
      links.forEach(link => {
        expect(link).toHaveClass('transition-all')
        expect(link).toHaveClass('duration-200')
        expect(link).toHaveClass('ease-in-out')
      })
    })
  })

  describe('Color Schemes', () => {
    it('should apply correct color schemes for each menu item', () => {
      mockUsePathname.mockReturnValue('/logistica')
      
      render(<LogisticaSubMenu />)
      
      const pedidosLink = screen.getByRole('link', { name: /pedidos/i })
      const listasLink = screen.getByRole('link', { name: /listas/i })
      const proveedoresLink = screen.getByRole('link', { name: /proveedores/i })
      const cotizacionesLink = screen.getByRole('link', { name: /cotizaciones/i })
      
      // Check hover color classes
      expect(pedidosLink).toHaveClass('hover:text-blue-700')
      expect(listasLink).toHaveClass('hover:text-green-700')
      expect(proveedoresLink).toHaveClass('hover:text-purple-700')
      expect(cotizacionesLink).toHaveClass('hover:text-orange-700')
    })
  })

  describe('Performance', () => {
    it('should render without performance issues', () => {
      mockUsePathname.mockReturnValue('/logistica/pedidos')
      
      const startTime = performance.now()
      render(<LogisticaSubMenu />)
      const endTime = performance.now()
      
      // Should render in less than 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should not cause memory leaks on multiple renders', () => {
      mockUsePathname.mockReturnValue('/logistica/pedidos')
      
      const { rerender, unmount } = render(<LogisticaSubMenu />)
      
      // Re-render multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<LogisticaSubMenu />)
      }
      
      // Should unmount without issues
      expect(() => unmount()).not.toThrow()
    })
  })
})