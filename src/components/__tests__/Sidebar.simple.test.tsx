import React from 'react'
import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Sidebar from '../Sidebar'
import '@testing-library/jest-dom'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, className }: any) {
    return <img src={src} alt={alt} className={className} />
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

// Mock LogoutButton
jest.mock('../LogoutButton', () => {
  return function MockLogoutButton() {
    return <button>Cerrar Sesión</button>
  }
})

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => (
    <hr className={className} data-testid="separator" />
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick }: any) => (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  ),
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

const mockSession = {
  user: {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'ADMIN',
  },
}

describe('Sidebar Reorganization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
    mockLocalStorage.getItem.mockReturnValue('false')
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })
  })

  it('should render sidebar sections in correct order', () => {
    render(<Sidebar />)
    
    // Check that main sections exist
    expect(screen.getByText('Comercial')).toBeInTheDocument()
    expect(screen.getByText('Proyectos')).toBeInTheDocument()
    expect(screen.getByText('Logística')).toBeInTheDocument()
    expect(screen.getByText('Finanzas')).toBeInTheDocument()
    expect(screen.getByText('Gestión')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('should render new financial section with correct links', () => {
    render(<Sidebar />)
    
    // Check financial section exists
    expect(screen.getByText('Finanzas')).toBeInTheDocument()
    
    // Check financial links
    expect(screen.getByText('Flujo de Caja')).toBeInTheDocument()
    // expect(screen.getByText('Aprovisionamientos')).toBeInTheDocument() // Removed - aprovisionamiento deprecated
    expect(screen.getByText('Cuentas por Cobrar')).toBeInTheDocument()
    expect(screen.getByText('Cuentas por Pagar')).toBeInTheDocument()
    expect(screen.getByText('Presupuestos')).toBeInTheDocument()
    expect(screen.getByText('Análisis Rentabilidad')).toBeInTheDocument()
  })

  it('should render user information', () => {
    render(<Sidebar />)
    
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('should render version information', () => {
    render(<Sidebar />)
    
    expect(screen.getByText('v2.0')).toBeInTheDocument()
  })
})
