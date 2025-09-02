import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import CotizacionEquipoItemForm from '../CotizacionEquipoItemForm'
import { createCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItemService'
import type { CatalogoEquipo } from '@/types'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/lib/services/cotizacionEquipoItemService', () => ({
  createCotizacionEquipoItem: vi.fn()
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
  Package: () => <div data-testid="package-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Loader2: () => <div data-testid="loader-icon" />
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
  Input: (props: any) => <input {...props} data-testid="cantidad-input" />
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

// Mock EquipoCatalogoModal
vi.mock('@/components/catalogo/EquipoCatalogoModal', () => {
  return {
    default: function MockEquipoCatalogoModal({ onSelect, selectedEquipo }: any) {
      return (
        <div data-testid="equipo-modal">
          <button 
            onClick={() => onSelect(mockEquipo)}
            data-testid="select-equipo-button"
          >
            Select Equipment
          </button>
          {selectedEquipo && (
            <div data-testid="selected-equipo">
              {selectedEquipo.descripcion}
            </div>
          )}
        </div>
      )
    }
  }
})

const mockEquipo: CatalogoEquipo = {
  id: '1',
  codigo: 'EQ001',
  descripcion: 'Test Equipment',
  marca: 'Test Brand',
  modelo: 'Test Model',
  costoInterno: 100,
  costoCliente: 130,
  unidad: 'PCS',
  categoriaId: '1',
  categoria: {
    id: '1',
    nombre: 'Test Category',
    descripcion: 'Test Category Description',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockProps = {
  cotizacionEquipoId: 'cotizacion-equipo-1',
  onItemAdded: vi.fn()
}

const mockCreateCotizacionEquipoItem = createCotizacionEquipoItem as any

describe('CotizacionEquipoItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with all required elements', () => {
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    expect(screen.getByText('Agregar Equipo')).toBeInTheDocument()
    expect(screen.getByTestId('equipo-modal')).toBeInTheDocument()
    expect(screen.getByTestId('cantidad-input')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('shows equipment selection modal', () => {
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-equipo-button')
    fireEvent.click(selectButton)
    
    expect(screen.getByTestId('selected-equipo')).toBeInTheDocument()
    expect(screen.getByText('Test Equipment')).toBeInTheDocument()
  })

  it('displays cost preview when equipment is selected', async () => {
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    // Select equipment
    const selectButton = screen.getByTestId('select-equipo-button')
    fireEvent.click(selectButton)
    
    // Enter quantity
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '2')
    
    await waitFor(() => {
      expect(screen.getByText('$200.00')).toBeInTheDocument() // Internal cost: 100 * 2
      expect(screen.getByText('$260.00')).toBeInTheDocument() // Client cost: 130 * 2
    })
  })

  it('calculates and displays profitability correctly', async () => {
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    // Select equipment
    const selectButton = screen.getByTestId('select-equipo-button')
    fireEvent.click(selectButton)
    
    // Enter quantity
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '1')
    
    await waitFor(() => {
      // Profitability: (130-100)/100 * 100 = 30%
      expect(screen.getByText('30.0%')).toBeInTheDocument()
    })
  })

  it('validates quantity input - requires positive number', async () => {
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
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
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Try to submit with non-numeric quantity
    await userEvent.type(quantityInput, 'abc')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Debe ser un número válido')).toBeInTheDocument()
    })
  })

  it('requires equipment selection before submission', async () => {
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Enter valid quantity but no equipment selected
    await userEvent.type(quantityInput, '2')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Por favor selecciona un equipo')
    })
  })

  it('submits form successfully with valid data', async () => {
    mockCreateCotizacionEquipoItem.mockResolvedValueOnce({
      id: 'new-item-id',
      cantidad: 2,
      costoInterno: 200,
      costoCliente: 260,
      catalogoEquipoId: '1',
      cotizacionEquipoId: 'cotizacion-equipo-1',
      catalogoEquipo: mockEquipo,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    // Select equipment
    const selectButton = screen.getByTestId('select-equipo-button')
    fireEvent.click(selectButton)
    
    // Enter quantity
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '2')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateCotizacionEquipoItem).toHaveBeenCalledWith({
        cotizacionEquipoId: 'cotizacion-equipo-1',
        catalogoEquipoId: '1',
        cantidad: 2
      })
      expect(toast.success).toHaveBeenCalledWith('Equipo agregado exitosamente')
      expect(mockProps.onItemAdded).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Error creating equipment item'
    mockCreateCotizacionEquipoItem.mockRejectedValueOnce(new Error(errorMessage))
    
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    // Select equipment and enter quantity
    const selectButton = screen.getByTestId('select-equipo-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '2')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al agregar equipo: Error creating equipment item')
    })
  })

  it('resets form after successful submission', async () => {
    mockCreateCotizacionEquipoItem.mockResolvedValueOnce({
      id: 'new-item-id',
      cantidad: 1,
      costoInterno: 100,
      costoCliente: 130,
      catalogoEquipoId: '1',
      cotizacionEquipoId: 'cotizacion-equipo-1',
      catalogoEquipo: mockEquipo,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    // Select equipment and enter quantity
    const selectButton = screen.getByTestId('select-equipo-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '1')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(quantityInput).toHaveValue('')
      expect(screen.queryByTestId('selected-equipo')).not.toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    // Mock a delayed response
    mockCreateCotizacionEquipoItem.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    // Select equipment and enter quantity
    const selectButton = screen.getByTestId('select-equipo-button')
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

  it('formats currency correctly in cost preview', async () => {
    const expensiveEquipo = {
      ...mockEquipo,
      costoInterno: 1234.56,
      costoCliente: 1604.93
    }
    
    // Mock the modal to return expensive equipment
    const MockExpensiveModal = ({ onSelect }: any) => (
      <div data-testid="equipo-modal">
        <button 
          onClick={() => onSelect(expensiveEquipo)}
          data-testid="select-equipo-button"
        >
          Select Expensive Equipment
        </button>
      </div>
    )
    
    jest.doMock('@/components/catalogo/EquipoCatalogoModal', () => MockExpensiveModal)
    
    render(<CotizacionEquipoItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-equipo-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    await userEvent.type(quantityInput, '2')
    
    await waitFor(() => {
      expect(screen.getByText('$2,469.12')).toBeInTheDocument() // Internal: 1234.56 * 2
      expect(screen.getByText('$3,209.86')).toBeInTheDocument() // Client: 1604.93 * 2
    })
  })
})