import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import CotizacionGastoItemForm from '../CotizacionGastoItemForm'
import { createCotizacionGastoItem } from '@/lib/services/cotizacionGastoItemService'
import type { CatalogoGasto } from '@/types'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/services/cotizacionGastoItemService', () => ({
  createCotizacionGastoItem: jest.fn()
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Calculator: () => <div data-testid="calculator-icon" />,
  Truck: () => <div data-testid="truck-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Receipt: () => <div data-testid="receipt-icon" />
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render, name }: any) => {
    const field = { name, onChange: vi.fn(), onBlur: vi.fn(), value: '' }
    const fieldState = { error: null }
    return render({ field, fieldState })
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: ({ children }: any) => <span className="error-message">{children}</span>
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => {
    const testId = props.name === 'cantidad' ? 'cantidad-input' : 'input'
    return <input {...props} data-testid={testId} />
  }
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type} 
      {...props}
      data-testid="submit-button"
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className} data-testid="badge">{children}</span>
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} data-testid="separator" />
}))

// Mock GastoCatalogoModal
vi.mock('@/components/catalogo/GastoCatalogoModal', () => {
  return {
    default: function MockGastoCatalogoModal({ onSelect, selectedGasto }: any) {
      return (
        <div data-testid="gasto-modal">
          <button 
            onClick={() => onSelect(mockGasto)}
            data-testid="select-gasto-button"
          >
            Select Expense
          </button>
          {selectedGasto && (
            <div data-testid="selected-gasto">
              {selectedGasto.descripcion}
            </div>
          )}
        </div>
      )
    }
  }
})

const mockGasto: CatalogoGasto = {
  id: '1',
  codigo: 'GS001',
  descripcion: 'Test Expense',
  costoInterno: 25,
  costoCliente: 35,
  unidad: 'UN',
  categoriaId: '1',
  categoria: {
    id: '1',
    nombre: 'Test Expense Category',
    descripcion: 'Test Expense Category Description',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockProps = {
  cotizacionGastoId: 'cotizacion-gasto-1',
  onItemAdded: vi.fn()
}

const mockCreateCotizacionGastoItem = createCotizacionGastoItem as any

describe('CotizacionGastoItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with all required elements', () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    expect(screen.getByText('Agregar Gasto')).toBeInTheDocument()
    expect(screen.getByTestId('gasto-modal')).toBeInTheDocument()
    expect(screen.getByTestId('cantidad-input')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('shows expense selection modal', () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    expect(screen.getByTestId('selected-gasto')).toBeInTheDocument()
    expect(screen.getByText('Test Expense')).toBeInTheDocument()
  })

  it('displays cost preview when expense is selected with quantity', async () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    // Select expense
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    // Enter quantity
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '3')
    
    await waitFor(() => {
      // Internal cost: 25 * 3 = 75
      expect(screen.getByText('$75.00')).toBeInTheDocument()
      // Client cost: 35 * 3 = 105
      expect(screen.getByText('$105.00')).toBeInTheDocument()
    })
  })

  it('calculates and displays profitability correctly', async () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    // Select expense
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    // Enter quantity
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '1')
    
    await waitFor(() => {
      // Profitability: (35-25)/25 * 100 = 40%
      expect(screen.getByText('40.0%')).toBeInTheDocument()
    })
  })

  it('validates quantity input - requires positive number', async () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Try to submit with invalid quantity
    await userEvent.type(quantityInput, '0')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('La cantidad debe ser mayor a 0')).toBeInTheDocument()
    })
  })

  it('validates quantity input - requires number', async () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Try to submit with non-numeric quantity
    await userEvent.type(quantityInput, 'abc')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Debe ser un número válido')).toBeInTheDocument()
    })
  })

  it('requires expense selection before submission', async () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Enter valid quantity but no expense selected
    await userEvent.type(quantityInput, '2')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Por favor selecciona un gasto')
    })
  })

  it('submits form successfully with valid data', async () => {
    mockCreateCotizacionGastoItem.mockResolvedValueOnce({
      id: 'new-item-id',
      cantidad: 3,
      costoInterno: 75,
      costoCliente: 105,
      catalogoGastoId: '1',
      cotizacionGastoId: 'cotizacion-gasto-1',
      catalogoGasto: mockGasto,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    // Select expense
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    // Enter quantity
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '3')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateCotizacionGastoItem).toHaveBeenCalledWith({
        cotizacionGastoId: 'cotizacion-gasto-1',
        catalogoGastoId: '1',
        cantidad: 3
      })
      expect(toast.success).toHaveBeenCalledWith('Gasto agregado exitosamente')
      expect(mockProps.onItemAdded).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Error creating expense item'
    mockCreateCotizacionGastoItem.mockRejectedValueOnce(new Error(errorMessage))
    
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    // Select expense and enter quantity
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '3')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al agregar gasto: Error creating expense item')
    })
  })

  it('resets form after successful submission', async () => {
    mockCreateCotizacionGastoItem.mockResolvedValueOnce({
      id: 'new-item-id',
      cantidad: 1,
      costoInterno: 25,
      costoCliente: 35,
      catalogoGastoId: '1',
      cotizacionGastoId: 'cotizacion-gasto-1',
      catalogoGasto: mockGasto,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    // Select expense and enter quantity
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '1')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(quantityInput).toHaveValue('')
      expect(screen.queryByTestId('selected-gasto')).not.toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    // Mock a delayed response
    mockCreateCotizacionGastoItem.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    // Select expense and enter quantity
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '1')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    // Check loading state
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('handles decimal quantities correctly', async () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    // Select expense
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    // Enter decimal quantity
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '2.5')
    
    await waitFor(() => {
      // Internal cost: 25 * 2.5 = 62.5
      expect(screen.getByText('$62.50')).toBeInTheDocument()
      // Client cost: 35 * 2.5 = 87.5
      expect(screen.getByText('$87.50')).toBeInTheDocument()
    })
  })

  it('displays expense unit correctly', () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    expect(screen.getByText('UN')).toBeInTheDocument() // Expense unit
  })

  it('shows zero costs when no expense is selected', () => {
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    fireEvent.change(quantityInput, { target: { value: '3' } })
    
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('handles high profitability expenses', async () => {
    const highProfitGasto = {
      ...mockGasto,
      costoInterno: 10,
      costoCliente: 50 // 400% profitability
    }
    
    // Mock the modal to return high profit expense
    const MockHighProfitModal = ({ onSelect }: any) => (
      <div data-testid="gasto-modal">
        <button 
          onClick={() => onSelect(highProfitGasto)}
          data-testid="select-gasto-button"
        >
          Select High Profit Expense
        </button>
      </div>
    )
    
    vi.doMock('@/components/catalogo/GastoCatalogoModal', () => ({ default: MockHighProfitModal }))
    
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '1')
    
    await waitFor(() => {
      expect(screen.getByText('400.0%')).toBeInTheDocument()
    })
  })

  it('handles zero profitability expenses', async () => {
    const zeroProfitGasto = {
      ...mockGasto,
      costoInterno: 30,
      costoCliente: 30 // 0% profitability
    }
    
    // Mock the modal to return zero profit expense
    const MockZeroProfitModal = ({ onSelect }: any) => (
      <div data-testid="gasto-modal">
        <button 
          onClick={() => onSelect(zeroProfitGasto)}
          data-testid="select-gasto-button"
        >
          Select Zero Profit Expense
        </button>
      </div>
    )
    
    vi.doMock('@/components/catalogo/GastoCatalogoModal', () => ({ default: MockZeroProfitModal }))
    
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '1')
    
    await waitFor(() => {
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  it('formats large currency amounts correctly', async () => {
    const expensiveGasto = {
      ...mockGasto,
      costoInterno: 1500.75,
      costoCliente: 2250.50
    }
    
    // Mock the modal to return expensive expense
    const MockExpensiveModal = ({ onSelect }: any) => (
      <div data-testid="gasto-modal">
        <button 
          onClick={() => onSelect(expensiveGasto)}
          data-testid="select-gasto-button"
        >
          Select Expensive Expense
        </button>
      </div>
    )
    
    vi.doMock('@/components/catalogo/GastoCatalogoModal', () => ({ default: MockExpensiveModal }))
    
    render(<CotizacionGastoItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-gasto-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '2')
    
    await waitFor(() => {
      expect(screen.getByText('$3,001.50')).toBeInTheDocument() // Internal: 1500.75 * 2
      expect(screen.getByText('$4,501.00')).toBeInTheDocument() // Client: 2250.50 * 2
    })
  })
})
