import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuotationList from '@/app/logistica/listas/[id]/cotizaciones/components/QuotationList'

// Mock fetch
global.fetch = jest.fn()

const mockQuotations = [
  {
    id: 'quote-1',
    codigo: 'Q001',
    descripcion: 'Cotización de prueba 1',
    estado: 'cotizado',
    precioUnitario: 100.50,
    tiempoEntrega: '2024-02-15',
    tiempoEntregaDias: 30,
    cotizacion: {
      proveedor: {
        nombre: 'Proveedor A'
      }
    },
    listaEquipoItem: {
      descripcion: 'Item de prueba',
      codigo: 'IT001',
      cantidad: 5
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'quote-2',
    codigo: 'Q002',
    descripcion: 'Cotización de prueba 2',
    estado: 'solicitado',
    precioUnitario: 95.25,
    tiempoEntrega: '2024-02-10',
    tiempoEntregaDias: 25,
    cotizacion: {
      proveedor: {
        nombre: 'Proveedor B'
      }
    },
    listaEquipoItem: {
      descripcion: 'Otro item',
      codigo: 'IT002',
      cantidad: 3
    },
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z'
  }
]

describe('QuotationList', () => {
  const defaultProps = {
    listaId: 'test-list',
    selectedIds: [],
    onSelectionChange: jest.fn(),
    onSelectQuotation: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ quotations: mockQuotations, total: 2 })
    })
  })

  it('renders loading state when loading prop is true', () => {
    render(<QuotationList {...defaultProps} loading={true} />)
    expect(screen.getByText('Cargando cotizaciones...')).toBeInTheDocument()
  })

  it('renders quotations after loading', async () => {
    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
      expect(screen.getByText('Proveedor B')).toBeInTheDocument()
    })

    expect(screen.getByText('$100.50')).toBeInTheDocument()
    expect(screen.getByText('2024-02-15')).toBeInTheDocument()
  })

  it('filters quotations by search term', async () => {
    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Buscar cotizaciones...')
    fireEvent.change(searchInput, { target: { value: 'Proveedor A' } })

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
      expect(screen.queryByText('Proveedor B')).not.toBeInTheDocument()
    })
  })

  it('filters quotations by status', async () => {
    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    })

    const statusFilter = screen.getByRole('combobox')
    fireEvent.click(statusFilter)
    fireEvent.click(screen.getByText('Cotizado'))

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
      expect(screen.queryByText('Proveedor B')).not.toBeInTheDocument()
    })
  })

  it('handles bulk selection', async () => {
    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    })

    const selectAllCheckbox = screen.getByRole('checkbox')
    fireEvent.click(selectAllCheckbox)

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(['quote-1', 'quote-2'])
  })

  it('handles individual selection', async () => {
    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // First item checkbox

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(['quote-1'])
  })

  it('calls onSelectQuotation when clicking on quotation', async () => {
    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    })

    const quotationDiv = screen.getByText('Cotización de prueba 1').closest('div')
    fireEvent.click(quotationDiv!)

    expect(defaultProps.onSelectQuotation).toHaveBeenCalledWith('quote-1')
  })

  it('shows empty state when no quotations', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ quotations: [], total: 0 })
    })

    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No se encontraron cotizaciones')).toBeInTheDocument()
    })
  })

  it('displays correct status badges', async () => {
    render(<QuotationList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Cotizado')).toBeInTheDocument()
      expect(screen.getByText('Solicitado')).toBeInTheDocument()
    })
  })

  it('shows selected count correctly', async () => {
    render(<QuotationList {...defaultProps} selectedIds={['quote-1']} />)

    await waitFor(() => {
      expect(screen.getByText('1 seleccionadas')).toBeInTheDocument()
    })
  })
})