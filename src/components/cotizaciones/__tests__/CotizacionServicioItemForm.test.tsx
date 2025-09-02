import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import CotizacionServicioItemForm from '../CotizacionServicioItemForm'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItemService'
import type { CatalogoServicio } from '@/types'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/services/cotizacionServicioItemService', () => ({
  createCotizacionServicioItem: jest.fn()
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Calculator: () => <div data-testid="calculator-icon" />,
  Wrench: () => <div data-testid="wrench-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Clock: () => <div data-testid="clock-icon" />
}))

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

jest.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render, name }: any) => {
    const field = { name, onChange: jest.fn(), onBlur: jest.fn(), value: '' }
    const fieldState = { error: null }
    return render({ field, fieldState })
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: ({ children }: any) => <span className="error-message">{children}</span>
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => {
    const testId = props.name === 'cantidad' ? 'cantidad-input' : 
                   props.name === 'horas' ? 'horas-input' : 'input'
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

// Mock ServicioCatalogoModal
jest.mock('@/components/catalogo/ServicioCatalogoModal', () => {
  return function MockServicioCatalogoModal({ onSelect, selectedServicio }: any) {
    return (
      <div data-testid="servicio-modal">
        <button 
          onClick={() => onSelect(mockServicio)}
          data-testid="select-servicio-button"
        >
          Select Service
        </button>
        {selectedServicio && (
          <div data-testid="selected-servicio">
            {selectedServicio.descripcion}
          </div>
        )}
      </div>
    )
  }
})

const mockServicio: CatalogoServicio = {
  id: '1',
  codigo: 'SV001',
  descripcion: 'Test Service',
  costoInterno: 50,
  costoCliente: 75,
  unidad: 'HR',
  categoriaId: '1',
  categoria: {
    id: '1',
    nombre: 'Test Service Category',
    descripcion: 'Test Service Category Description',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockProps = {
  cotizacionServicioId: 'cotizacion-servicio-1',
  onItemAdded: jest.fn()
}

const mockCreateCotizacionServicioItem = createCotizacionServicioItem as jest.MockedFunction<typeof createCotizacionServicioItem>

describe('CotizacionServicioItemForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form with all required elements', () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    expect(screen.getByText('Agregar Servicio')).toBeInTheDocument()
    expect(screen.getByTestId('servicio-modal')).toBeInTheDocument()
    expect(screen.getByTestId('cantidad-input')).toBeInTheDocument()
    expect(screen.getByTestId('horas-input')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('shows service selection modal', () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    expect(screen.getByTestId('selected-servicio')).toBeInTheDocument()
    expect(screen.getByText('Test Service')).toBeInTheDocument()
  })

  it('displays cost preview when service is selected with quantity and hours', async () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    // Select service
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    // Enter quantity and hours
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    await userEvent.type(quantityInput, '2')
    await userEvent.type(hoursInput, '4')
    
    await waitFor(() => {
      // Internal cost: 50 * 2 * 4 = 400
      expect(screen.getByText('$400.00')).toBeInTheDocument()
      // Client cost: 75 * 2 * 4 = 600
      expect(screen.getByText('$600.00')).toBeInTheDocument()
    })
  })

  it('calculates and displays profitability correctly', async () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    // Select service
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    // Enter quantity and hours
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    await userEvent.type(quantityInput, '1')
    await userEvent.type(hoursInput, '1')
    
    await waitFor(() => {
      // Profitability: (75-50)/50 * 100 = 50%
      expect(screen.getByText('50.0%')).toBeInTheDocument()
    })
  })

  it('validates quantity input - requires positive number', async () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Try to submit with invalid quantity
    await userEvent.type(quantityInput, '0')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('La cantidad debe ser mayor a 0')).toBeInTheDocument()
    })
  })

  it('validates hours input - requires positive number', async () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    const hoursInput = screen.getByTestId('horas-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Try to submit with invalid hours
    await userEvent.type(hoursInput, '-1')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Las horas deben ser mayor a 0')).toBeInTheDocument()
    })
  })

  it('validates numeric inputs', async () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Try to submit with non-numeric values
    await userEvent.type(quantityInput, 'abc')
    await userEvent.type(hoursInput, 'xyz')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Debe ser un número válido')).toBeInTheDocument()
    })
  })

  it('requires service selection before submission', async () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Enter valid values but no service selected
    await userEvent.type(quantityInput, '2')
    await userEvent.type(hoursInput, '4')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Por favor selecciona un servicio')
    })
  })

  it('submits form successfully with valid data', async () => {
    mockCreateCotizacionServicioItem.mockResolvedValueOnce({
      id: 'new-item-id',
      cantidad: 2,
      horas: 4,
      costoInterno: 400,
      costoCliente: 600,
      catalogoServicioId: '1',
      cotizacionServicioId: 'cotizacion-servicio-1',
      catalogoServicio: mockServicio,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    // Select service
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    // Enter quantity and hours
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    await userEvent.type(quantityInput, '2')
    await userEvent.type(hoursInput, '4')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateCotizacionServicioItem).toHaveBeenCalledWith({
        cotizacionServicioId: 'cotizacion-servicio-1',
        catalogoServicioId: '1',
        cantidad: 2,
        horas: 4
      })
      expect(toast.success).toHaveBeenCalledWith('Servicio agregado exitosamente')
      expect(mockProps.onItemAdded).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Error creating service item'
    mockCreateCotizacionServicioItem.mockRejectedValueOnce(new Error(errorMessage))
    
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    // Select service and enter values
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    await userEvent.type(quantityInput, '2')
    await userEvent.type(hoursInput, '4')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al agregar servicio: Error creating service item')
    })
  })

  it('resets form after successful submission', async () => {
    mockCreateCotizacionServicioItem.mockResolvedValueOnce({
      id: 'new-item-id',
      cantidad: 1,
      horas: 1,
      costoInterno: 50,
      costoCliente: 75,
      catalogoServicioId: '1',
      cotizacionServicioId: 'cotizacion-servicio-1',
      catalogoServicio: mockServicio,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    // Select service and enter values
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    await userEvent.type(quantityInput, '1')
    await userEvent.type(hoursInput, '1')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(quantityInput).toHaveValue('')
      expect(hoursInput).toHaveValue('')
      expect(screen.queryByTestId('selected-servicio')).not.toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    // Mock a delayed response
    mockCreateCotizacionServicioItem.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    // Select service and enter values
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    await userEvent.type(quantityInput, '1')
    await userEvent.type(hoursInput, '1')
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    fireEvent.click(submitButton)
    
    // Check loading state
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('handles decimal hours correctly', async () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    // Select service
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    // Enter quantity and decimal hours
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    await userEvent.type(quantityInput, '1')
    await userEvent.type(hoursInput, '2.5')
    
    await waitFor(() => {
      // Internal cost: 50 * 1 * 2.5 = 125
      expect(screen.getByText('$125.00')).toBeInTheDocument()
      // Client cost: 75 * 1 * 2.5 = 187.5
      expect(screen.getByText('$187.50')).toBeInTheDocument()
    })
  })

  it('displays service unit correctly', () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    const selectButton = screen.getByTestId('select-servicio-button')
    fireEvent.click(selectButton)
    
    expect(screen.getByText('HR')).toBeInTheDocument() // Service unit
  })

  it('shows zero costs when no service is selected', () => {
    render(<CotizacionServicioItemForm {...mockProps} />)
    
    const quantityInput = screen.getByTestId('cantidad-input')
    const hoursInput = screen.getByTestId('horas-input')
    
    fireEvent.change(quantityInput, { target: { value: '2' } })
    fireEvent.change(hoursInput, { target: { value: '4' } })
    
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })
})