import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { motion } from 'framer-motion'
import ResumenTotalesCotizacion from '../ResumenTotalesCotizacion'
import type { Cotizacion } from '@/types'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Calculator: () => <div data-testid="calculator-icon" />,
  Wrench: () => <div data-testid="wrench-icon" />,
  Truck: () => <div data-testid="truck-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Percent: () => <div data-testid="percent-icon" />,
  Receipt: () => <div data-testid="receipt-icon" />,
  Target: () => <div data-testid="target-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} />
}))

const mockCotizacion: Cotizacion = {
  id: '1',
  nombre: 'Test Cotización',
  totalEquiposInterno: 1000,
  totalEquiposCliente: 1300,
  totalServiciosInterno: 2000,
  totalServiciosCliente: 2600,
  totalGastosInterno: 500,
  totalGastosCliente: 650,
  totalInterno: 3500,
  totalCliente: 4550,
  descuento: 50,
  grandTotal: 4500,
  estado: 'BORRADOR',
  etapa: 'INICIAL',
  createdAt: new Date(),
  updatedAt: new Date(),
  clienteId: null,
  cliente: null,
  equipos: [],
  servicios: [],
  gastos: []
}

describe('ResumenTotalesCotizacion', () => {
  it('renders financial summary title', () => {
    render(<ResumenTotalesCotizacion cotizacion={mockCotizacion} />)
    expect(screen.getByText('Resumen Financiero')).toBeInTheDocument()
  })

  it('displays all category totals correctly', () => {
    render(<ResumenTotalesCotizacion cotizacion={mockCotizacion} />)
    
    // Check equipment totals
    expect(screen.getByText('$1,000.00')).toBeInTheDocument() // Equipment internal
    expect(screen.getByText('$1,300.00')).toBeInTheDocument() // Equipment client
    
    // Check services totals
    expect(screen.getByText('$2,000.00')).toBeInTheDocument() // Services internal
    expect(screen.getByText('$2,600.00')).toBeInTheDocument() // Services client
    
    // Check expenses totals
    expect(screen.getByText('$500.00')).toBeInTheDocument() // Expenses internal
    expect(screen.getByText('$650.00')).toBeInTheDocument() // Expenses client
  })

  it('calculates and displays profitability percentages correctly', () => {
    render(<ResumenTotalesCotizacion cotizacion={mockCotizacion} />)
    
    // Equipment profitability: (1300-1000)/1000 * 100 = 30%
    expect(screen.getByText('30.0%')).toBeInTheDocument()
    
    // Services profitability: (2600-2000)/2000 * 100 = 30%
    expect(screen.getAllByText('30.0%')).toHaveLength(2)
    
    // Expenses profitability: (650-500)/500 * 100 = 30%
    expect(screen.getAllByText('30.0%')).toHaveLength(3)
  })

  it('displays total amounts correctly', () => {
    render(<ResumenTotalesCotizacion cotizacion={mockCotizacion} />)
    
    expect(screen.getByText('$3,500.00')).toBeInTheDocument() // Total interno
    expect(screen.getByText('$4,550.00')).toBeInTheDocument() // Total cliente
    expect(screen.getByText('$4,500.00')).toBeInTheDocument() // Grand total
  })

  it('shows discount when greater than 0', () => {
    render(<ResumenTotalesCotizacion cotizacion={mockCotizacion} />)
    expect(screen.getByText('-$50.00')).toBeInTheDocument()
    expect(screen.getByText('Descuento Aplicado')).toBeInTheDocument()
  })

  it('does not show discount section when discount is 0', () => {
    const cotizacionSinDescuento = { ...mockCotizacion, descuento: 0 }
    render(<ResumenTotalesCotizacion cotizacion={cotizacionSinDescuento} />)
    expect(screen.queryByText('Descuento Aplicado')).not.toBeInTheDocument()
  })

  it('renders category icons', () => {
    render(<ResumenTotalesCotizacion cotizacion={mockCotizacion} />)
    
    expect(screen.getByTestId('calculator-icon')).toBeInTheDocument()
    expect(screen.getByTestId('wrench-icon')).toBeInTheDocument()
    expect(screen.getByTestId('truck-icon')).toBeInTheDocument()
    expect(screen.getByTestId('receipt-icon')).toBeInTheDocument()
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
  })

  it('handles infinite profitability when internal cost is 0', () => {
    const cotizacionConCeroInterno = {
      ...mockCotizacion,
      totalEquiposInterno: 0,
      totalInterno: 2500
    }
    render(<ResumenTotalesCotizacion cotizacion={cotizacionConCeroInterno} />)
    expect(screen.getByText('∞')).toBeInTheDocument()
  })

  it('applies correct profitability color classes based on percentage', () => {
    // Test with low profitability (5%)
    const lowProfitCotizacion = {
      ...mockCotizacion,
      totalEquiposInterno: 1000,
      totalEquiposCliente: 1050, // 5% profit
      totalInterno: 1000,
      totalCliente: 1050
    }
    
    const { container } = render(<ResumenTotalesCotizacion cotizacion={lowProfitCotizacion} />)
    
    // Should have orange color for low profitability
    const badges = container.querySelectorAll('.text-orange-600')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('formats currency correctly using Intl.NumberFormat', () => {
    const largeCotizacion = {
      ...mockCotizacion,
      totalEquiposCliente: 123456.78,
      grandTotal: 123456.78
    }
    
    render(<ResumenTotalesCotizacion cotizacion={largeCotizacion} />)
    expect(screen.getByText('$123,456.78')).toBeInTheDocument()
  })

  it('renders responsive layout classes', () => {
    const { container } = render(<ResumenTotalesCotizacion cotizacion={mockCotizacion} />)
    
    // Check for responsive grid classes
    expect(container.querySelector('.sm\\:hidden')).toBeInTheDocument()
    expect(container.querySelector('.hidden.sm\\:grid')).toBeInTheDocument()
    expect(container.querySelector('.grid-cols-1.sm\\:grid-cols-2')).toBeInTheDocument()
  })
})

// Test utility functions
describe('ResumenTotalesCotizacion utility functions', () => {
  // Since the functions are not exported, we test them through component behavior
  it('calculates profitability correctly through component', () => {
    const testCases = [
      { interno: 100, cliente: 130, expected: '30.0%' }, // 30% profit
      { interno: 100, cliente: 115, expected: '15.0%' }, // 15% profit
      { interno: 100, cliente: 105, expected: '5.0%' },  // 5% profit
      { interno: 100, cliente: 95, expected: '-5.0%' },  // 5% loss
      { interno: 0, cliente: 100, expected: '∞' }        // Infinite
    ]

    testCases.forEach(({ interno, cliente, expected }) => {
      const testCotizacion = {
        ...mockCotizacion,
        totalEquiposInterno: interno,
        totalEquiposCliente: cliente,
        totalInterno: interno,
        totalCliente: cliente
      }
      
      const { unmount } = render(<ResumenTotalesCotizacion cotizacion={testCotizacion} />)
      expect(screen.getByText(expected)).toBeInTheDocument()
      unmount()
    })
  })
})
