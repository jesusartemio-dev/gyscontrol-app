import { render } from '@testing-library/react'
import PerformanceOptimizer from './PerformanceOptimizer'
import { PedidoEquipo } from '@/types'

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => 100),
  },
})

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn((callback) => {
    setTimeout(callback, 16)
    return 1
  }),
})

describe('PerformanceOptimizer', () => {
  const mockData: PedidoEquipo[] = [
    {
      id: '1',
      proyectoId: 'proj-1',
      responsableId: 'user-1',
      codigo: 'PED-001',
      numeroSecuencia: 1,
      estado: 'enviado',
      fechaPedido: '2024-01-15T10:00:00.000Z',
      fechaNecesaria: '2024-02-15T10:00:00.000Z',
      items: [],
    } as PedidoEquipo,
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(window.performance.now as jest.Mock).mockReturnValue(100)
  })

  it('renders without crashing', () => {
    const { container } = render(
      <PerformanceOptimizer data={mockData} />
    )
    
    expect(container).toBeInTheDocument()
  })

  it('renders with onOptimize prop', () => {
    const mockOnOptimize = jest.fn()
    const { container } = render(
      <PerformanceOptimizer data={mockData} onOptimize={mockOnOptimize} />
    )
    
    expect(container).toBeInTheDocument()
  })

  it('renders with className prop', () => {
    const mockOnOptimize = jest.fn()
    const { container } = render(
      <PerformanceOptimizer 
        data={mockData} 
        onOptimize={mockOnOptimize} 
        className="test-class" 
      />
    )
    
    expect(container.firstChild).toHaveClass('test-class')
  })
})