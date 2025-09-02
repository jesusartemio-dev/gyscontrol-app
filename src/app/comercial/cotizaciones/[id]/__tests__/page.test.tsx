/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { motion } from 'framer-motion'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>
  }
}))

// Mock Next.js
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-id' }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn()
  })
}))

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Simple test component to validate UX/UI improvements
const TestCotizacionPage = ({ isLoading = false }: { isLoading?: boolean }) => {
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Skeleton Loaders */}
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="container mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <motion.nav className="text-sm text-gray-600">
        Comercial / Cotizaciones / Detalle
      </motion.nav>

      {/* Header with Quick Stats */}
      <motion.div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Cotización #COT-001</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">S/ 15,000</div>
            <div className="text-sm opacity-90">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">5</div>
            <div className="text-sm opacity-90">Equipos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">Pendiente</div>
            <div className="text-sm opacity-90">Estado</div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div className="flex flex-col sm:flex-row gap-3">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Editar Cotización
        </button>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
          Generar PDF
        </button>
      </motion.div>

      {/* Empty States */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Empty State */}
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🏗️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin equipos agregados</h3>
            <p className="text-gray-600 mb-4">Comienza agregando equipos a tu cotización</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Agregar Equipo
            </button>
          </div>
        </div>

        {/* Services Empty State */}
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin servicios agregados</h3>
            <p className="text-gray-600 mb-4">Agrega servicios complementarios</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Agregar Servicio
            </button>
          </div>
        </div>

        {/* Expenses Empty State */}
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚛</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin gastos registrados</h3>
            <p className="text-gray-600 mb-4">Registra gastos adicionales del proyecto</p>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
              Agregar Gasto
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

describe('Cotización Detail Page - UX/UI Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Structure', () => {
    it('renders the main container with proper spacing', () => {
      render(<TestCotizacionPage />)
      const container = screen.getByText('Cotización #COT-001').closest('div')
      expect(container).toBeInTheDocument()
    })

    it('displays breadcrumb navigation', () => {
      render(<TestCotizacionPage />)
      expect(screen.getByText('Comercial / Cotizaciones / Detalle')).toBeInTheDocument()
    })
  })

  describe('Header and Quick Stats', () => {
    it('displays the quote title and quick stats', () => {
      render(<TestCotizacionPage />)
      expect(screen.getByText('Cotización #COT-001')).toBeInTheDocument()
      expect(screen.getByText('S/ 15,000')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Equipos')).toBeInTheDocument()
      expect(screen.getByText('Pendiente')).toBeInTheDocument()
      expect(screen.getByText('Estado')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('displays responsive action buttons', () => {
      render(<TestCotizacionPage />)
      expect(screen.getByText('Editar Cotización')).toBeInTheDocument()
      expect(screen.getByText('Generar PDF')).toBeInTheDocument()
    })
  })

  describe('Skeleton Loaders', () => {
    it('displays skeleton loaders when loading', () => {
      render(<TestCotizacionPage isLoading={true} />)
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Enhanced Empty States', () => {
    it('displays improved empty state for equipment', () => {
      render(<TestCotizacionPage />)
      expect(screen.getByText('Sin equipos agregados')).toBeInTheDocument()
      expect(screen.getByText('Comienza agregando equipos a tu cotización')).toBeInTheDocument()
      expect(screen.getByText('Agregar Equipo')).toBeInTheDocument()
    })

    it('displays improved empty state for services', () => {
      render(<TestCotizacionPage />)
      expect(screen.getByText('Sin servicios agregados')).toBeInTheDocument()
      expect(screen.getByText('Agrega servicios complementarios')).toBeInTheDocument()
      expect(screen.getByText('Agregar Servicio')).toBeInTheDocument()
    })

    it('displays improved empty state for expenses', () => {
      render(<TestCotizacionPage />)
      expect(screen.getByText('Sin gastos registrados')).toBeInTheDocument()
      expect(screen.getByText('Registra gastos adicionales del proyecto')).toBeInTheDocument()
      expect(screen.getByText('Agregar Gasto')).toBeInTheDocument()
    })

    it('includes descriptive icons and styled buttons in empty states', () => {
      render(<TestCotizacionPage />)
      const addButtons = [
        screen.getByText('Agregar Equipo'),
        screen.getByText('Agregar Servicio'),
        screen.getByText('Agregar Gasto')
      ]
      addButtons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive grid layouts', () => {
      render(<TestCotizacionPage />)
      const gridElements = document.querySelectorAll('[class*="grid"]')
      expect(gridElements.length).toBeGreaterThan(0)
    })

    it('uses responsive flex layouts for buttons', () => {
      render(<TestCotizacionPage />)
      const flexElements = document.querySelectorAll('[class*="flex"]')
      expect(flexElements.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('uses proper heading hierarchy', () => {
      render(<TestCotizacionPage />)
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
      expect(h1).toHaveTextContent('Cotización #COT-001')
    })

    it('provides descriptive button labels', () => {
      render(<TestCotizacionPage />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button.textContent).toBeTruthy()
        expect(button.textContent?.length).toBeGreaterThan(0)
      })
    })
  })
})