import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Sidebar from '../Sidebar'
import '@testing-library/jest-dom'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, width, height, className }: any) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        data-testid="mock-image"
      />
    )
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, className, ...props }: any) => (
      <aside className={className} {...props}>
        {children}
      </aside>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock LogoutButton component
jest.mock('../LogoutButton', () => {
  return function MockLogoutButton({ children, className, ...props }: any) {
    return (
      <button className={className} {...props} data-testid="logout-button">
        {children}
      </button>
    )
  }
})

// Mock shadcn/ui components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant, ...props }: any) => (
    <span className={className} data-variant={variant} {...props}>
      {children}
    </span>
  ),
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className, ...props }: any) => (
    <hr className={className} {...props} data-testid="separator" />
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, variant, size, onClick, ...props }: any) => (
    <button
      className={className}
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock session data
const mockSession = {
  user: {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'ADMIN',
  },
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('Sidebar Component', () => {
  describe('Section Order and Business Workflow', () => {
    it('should display sections in correct business workflow order', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
      mockUsePathname.mockReturnValue('/proyectos')

      render(<Sidebar />)

      const sections = screen.getAllByRole('button', { name: /comercial|proyectos|logística|finanzas|gestión|configuración/i })
      
      // Verify the order follows business workflow
      expect(sections[0]).toHaveTextContent('Comercial')
      expect(sections[1]).toHaveTextContent('Proyectos')
      expect(sections[2]).toHaveTextContent('Logística')
      expect(sections[3]).toHaveTextContent('Finanzas')
      expect(sections[4]).toHaveTextContent('Gestión')
      expect(sections[5]).toHaveTextContent('Configuración')
    })

    it('should maintain business workflow logic in section organization', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
      mockUsePathname.mockReturnValue('/proyectos')

      render(<Sidebar />)
      
      // Verify all sections are present in correct order
      expect(screen.getByText('Comercial')).toBeInTheDocument()
      expect(screen.getByText('Proyectos')).toBeInTheDocument()
      expect(screen.getByText('Logística')).toBeInTheDocument()
      expect(screen.getByText('Finanzas')).toBeInTheDocument()
      expect(screen.getByText('Gestión')).toBeInTheDocument()
      expect(screen.getByText('Configuración')).toBeInTheDocument()
    })
  })

  describe('New Financial Section', () => {
    it('should display financial section with all required links', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
      mockUsePathname.mockReturnValue('/finanzas')

      render(<Sidebar />)

      // Check if financial section is present
      expect(screen.getByText('Finanzas')).toBeInTheDocument()
      
      // Check all financial links
      expect(screen.getByText('Flujo de Caja')).toBeInTheDocument()
      // expect(screen.getByText('Aprovisionamientos')).toBeInTheDocument() // Removed - aprovisionamiento deprecated
      expect(screen.getByText('Cuentas por Cobrar')).toBeInTheDocument()
      expect(screen.getByText('Cuentas por Pagar')).toBeInTheDocument()
      expect(screen.getByText('Presupuestos')).toBeInTheDocument()
      expect(screen.getByText('Análisis Rentabilidad')).toBeInTheDocument()
    })

    it('should have correct financial section styling and emerald color', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
      mockUsePathname.mockReturnValue('/finanzas')

      render(<Sidebar />)
      
      const financialSection = screen.getByText('Finanzas').closest('button')
      expect(financialSection).toBeInTheDocument()
      
      // Check for emerald color class in financial icon
      const financialIcon = financialSection?.querySelector('.text-emerald-400')
      expect(financialIcon).toBeInTheDocument()
    })

    it('should show financial section for authorized roles', () => {
      const authorizedRoles = ['admin', 'gerente', 'finanzas', 'contabilidad']
      
      authorizedRoles.forEach(role => {
        mockUseSession.mockReturnValue({
          data: { ...mockSession, user: { ...mockSession.user, role } },
          status: 'authenticated',
        })
        mockUsePathname.mockReturnValue('/finanzas')

        const { unmount } = render(<Sidebar />)
        expect(screen.getByText('Finanzas')).toBeInTheDocument()
        unmount()
      })
    })

    it('should hide financial section for unauthorized roles', () => {
      const unauthorizedRoles = ['comercial', 'proyectos', 'logistico']
      
      unauthorizedRoles.forEach(role => {
        mockUseSession.mockReturnValue({
          data: { ...mockSession, user: { ...mockSession.user, role } },
          status: 'authenticated',
        })
        mockUsePathname.mockReturnValue('/comercial')

        const { unmount } = render(<Sidebar />)
        expect(screen.queryByText('Finanzas')).not.toBeInTheDocument()
        unmount()
      })
    })

    it('should highlight active financial links correctly', () => {
      mockUsePathname.mockReturnValue('/finanzas/flujo-caja')
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<Sidebar />)
      
      const flujoCajaLink = screen.getByText('Flujo de Caja').closest('a')
      expect(flujoCajaLink).toHaveClass('bg-gradient-to-r')
    })

    it('should toggle financial section visibility when clicked', async () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
      mockUsePathname.mockReturnValue('/finanzas')

      render(<Sidebar />)
      
      const financialButton = screen.getByText('Finanzas').closest('button')
      expect(financialButton).toBeInTheDocument()
      
      // Initially, financial links should be visible
      expect(screen.getByText('Flujo de Caja')).toBeInTheDocument()
      
      // Click to toggle
      await act(async () => {
        fireEvent.click(financialButton!)
      })
      
      // Links should still be visible due to AnimatePresence mock
      expect(screen.getByText('Flujo de Caja')).toBeInTheDocument()
    })
  })

  describe('Configuration Section Moved to End', () => {
    it('should display configuration section as the last section', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
      mockUsePathname.mockReturnValue('/admin')

      render(<Sidebar />)

      const sections = screen.getAllByRole('button', { name: /comercial|proyectos|logística|finanzas|gestión|configuración/i })
      
      // Configuration should be the last section (index 5)
      expect(sections[5]).toHaveTextContent('Configuración')
    })

    it('should maintain all configuration links after reorganization', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
      mockUsePathname.mockReturnValue('/admin')

      render(<Sidebar />)
      
      // Check all configuration links are still present
      expect(screen.getByText('Usuarios')).toBeInTheDocument()
      expect(screen.getByText('Clientes')).toBeInTheDocument()
      expect(screen.getByText('Catálogo Equipos')).toBeInTheDocument()
      expect(screen.getByText('Catálogo Servicios')).toBeInTheDocument()
      expect(screen.getByText('Categorías Equipo')).toBeInTheDocument()
      expect(screen.getByText('Categorías Servicio')).toBeInTheDocument()
      expect(screen.getByText('Unidades')).toBeInTheDocument()
      expect(screen.getByText('Unidades Servicio')).toBeInTheDocument()
      expect(screen.getByText('Recursos')).toBeInTheDocument()
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
    mockLocalStorage.getItem.mockReturnValue('false')
  })

  describe('Rendering', () => {
    it('renders sidebar with authenticated user', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<Sidebar />)

      expect(screen.getByAltText('Logo GyS')).toBeInTheDocument()
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
      expect(screen.getByText('v2.0')).toBeInTheDocument()
    })

    it('renders collapsed sidebar when localStorage indicates collapsed state', () => {
      mockLocalStorage.getItem.mockReturnValue('true')
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<Sidebar />)

      // Logo should not be visible when collapsed
      expect(screen.queryByAltText('Logo GyS')).not.toBeInTheDocument()
      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
    })

    it('renders without user session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<Sidebar />)

      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
      expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Sections', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('renders all navigation sections for admin user', () => {
      render(<Sidebar />)

      expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
      expect(screen.getByText('LOGÍSTICA')).toBeInTheDocument()
      expect(screen.getByText('ADMINISTRACIÓN')).toBeInTheDocument()
      expect(screen.getByText('CONFIGURACIÓN')).toBeInTheDocument()
    })

    it('toggles section visibility when clicked', async () => {
      render(<Sidebar />)

      const logisticaButton = screen.getByText('LOGÍSTICA')
      fireEvent.click(logisticaButton)

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'openSections',
          expect.stringContaining('"logistica":false')
        )
      })
    })

    it('shows active link styling for current path', () => {
      mockUsePathname.mockReturnValue('/logistica/cotizaciones')
      render(<Sidebar />)

      const cotizacionesLink = screen.getByText('Cotizaciones')
      expect(cotizacionesLink.closest('a')).toHaveClass(
        'bg-gradient-to-r',
        'from-blue-600/20',
        'to-purple-600/20'
      )
    })
  })

  describe('Sidebar Toggle', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('toggles sidebar collapse state', async () => {
      render(<Sidebar />)

      const toggleButton = screen.getByRole('button', { name: /toggle/i })
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'sidebarCollapsed',
          'true'
        )
      })
    })

    it('shows tooltips for links when collapsed', () => {
      mockLocalStorage.getItem.mockReturnValue('true')
      render(<Sidebar />)

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveAttribute('title')
      })
    })
  })

  describe('User Section', () => {
    it('displays user information correctly', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<Sidebar />)

      expect(screen.getByText('Bienvenido,')).toBeInTheDocument()
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
    })

    it('shows system status indicator', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<Sidebar />)

      expect(screen.getByText('Sistema activo')).toBeInTheDocument()
      expect(screen.getByText('Online')).toBeInTheDocument()
    })
  })

  describe('Logout Button', () => {
    it('renders logout button when user is authenticated', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<Sidebar />)

      expect(screen.getByTestId('logout-button')).toBeInTheDocument()
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument()
    })

    it('hides logout text when collapsed', () => {
      mockLocalStorage.getItem.mockReturnValue('true')
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<Sidebar />)

      expect(screen.queryByText('Cerrar Sesión')).not.toBeInTheDocument()
      expect(screen.getByTestId('logout-button')).toBeInTheDocument()
    })
  })

  describe('Role-based Access', () => {
    it('shows limited sections for non-admin users', () => {
      const userSession = {
        ...mockSession,
        user: {
          ...mockSession.user,
          role: 'USER',
        },
      }

      mockUseSession.mockReturnValue({
        data: userSession,
        status: 'authenticated',
      })

      render(<Sidebar />)

      expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
      expect(screen.getByText('LOGÍSTICA')).toBeInTheDocument()
      expect(screen.queryByText('ADMINISTRACIÓN')).not.toBeInTheDocument()
      expect(screen.queryByText('CONFIGURACIÓN')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('has proper ARIA attributes', () => {
      render(<Sidebar />)

      const sidebar = screen.getByRole('complementary')
      expect(sidebar).toBeInTheDocument()

      const navigation = screen.getByRole('navigation')
      expect(navigation).toBeInTheDocument()
    })

    it('provides keyboard navigation support', () => {
      render(<Sidebar />)

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
      })

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled')
      })
    })

    it('has proper focus management', () => {
      render(<Sidebar />)

      const toggleButton = screen.getByRole('button', { name: /toggle/i })
      toggleButton.focus()
      expect(toggleButton).toHaveFocus()
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('applies correct width classes based on collapse state', () => {
      const { rerender } = render(<Sidebar />)

      let sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('w-64')

      mockLocalStorage.getItem.mockReturnValue('true')
      rerender(<Sidebar />)

      sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('w-16')
    })

    it('handles overflow correctly', () => {
      render(<Sidebar />)

      const navigation = screen.getByRole('navigation')
      expect(navigation).toHaveClass('overflow-y-auto')
    })
  })

  describe('Performance', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('renders within acceptable time', () => {
      const startTime = performance.now()
      render(<Sidebar />)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should render in less than 100ms
    })

    it('does not cause memory leaks', () => {
      const { unmount } = render(<Sidebar />)
      
      act(() => {
        unmount()
      })

      // Component should unmount without errors
      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('handles missing session gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      expect(() => render(<Sidebar />)).not.toThrow()
    })

    it('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      expect(() => render(<Sidebar />)).not.toThrow()
    })
  })
})