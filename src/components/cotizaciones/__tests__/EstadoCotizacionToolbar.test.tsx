import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import EstadoCotizacionToolbar from '../EstadoCotizacionToolbar'
import { updateCotizacion } from '@/lib/services/cotizacionService'
import type { Cotizacion } from '@/types'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/lib/services/cotizacionService', () => ({
  updateCotizacion: vi.fn()
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-text-icon" />,
  Send: () => <div data-testid="send-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Handshake: () => <div data-testid="handshake-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => {
    const testId = children?.toString().includes('Estado') ? 'estado-button' :
                   children?.toString().includes('Etapa') ? 'etapa-button' : 'button'
    return (
      <button 
        onClick={onClick} 
        disabled={disabled} 
        {...props}
        data-testid={testId}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </button>
    )
  }
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
  )
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} data-testid="separator" />
}))

const mockCotizacion: Cotizacion = {
  id: '1',
  numero: 'COT-001',
  fecha: new Date('2024-01-15'),
  validoHasta: new Date('2024-02-15'),
  estado: 'borrador',
  etapa: 'inicial',
  descuento: 0,
  totalInterno: 1000,
  totalCliente: 1300,
  totalFinal: 1300,
  clienteId: 'client-1',
  cliente: {
    id: 'client-1',
    nombre: 'Test Client',
    email: 'test@client.com',
    telefono: '123456789',
    direccion: 'Test Address',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockProps = {
  cotizacion: mockCotizacion,
  onCotizacionUpdated: vi.fn()
}

const mockUpdateCotizacion = updateCotizacion as any

describe('EstadoCotizacionToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders toolbar with current estado and etapa', () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    expect(screen.getByText('Estado y Etapa de Cotización')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
    expect(screen.getByText('Inicial')).toBeInTheDocument()
    expect(screen.getByTestId('estado-button')).toBeInTheDocument()
    expect(screen.getByTestId('etapa-button')).toBeInTheDocument()
  })

  it('displays correct icons for current estado and etapa', () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    expect(screen.getByTestId('file-text-icon')).toBeInTheDocument() // Borrador icon
    expect(screen.getByTestId('target-icon')).toBeInTheDocument() // Inicial icon
  })

  it('shows estado options when estado button is clicked', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    fireEvent.click(estadoButton)
    
    // Should show estado options
    await waitFor(() => {
      expect(screen.getByText('Enviado')).toBeInTheDocument()
      expect(screen.getByText('Aprobado')).toBeInTheDocument()
      expect(screen.getByText('Rechazado')).toBeInTheDocument()
    })
  })

  it('shows etapa options when etapa button is clicked', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const etapaButton = screen.getByTestId('etapa-button')
    fireEvent.click(etapaButton)
    
    // Should show etapa options
    await waitFor(() => {
      expect(screen.getByText('Revisión')).toBeInTheDocument()
      expect(screen.getByText('Negociación')).toBeInTheDocument()
      expect(screen.getByText('Finalizada')).toBeInTheDocument()
    })
  })

  it('updates estado successfully', async () => {
    const updatedCotizacion = { ...mockCotizacion, estado: 'enviado' as const }
    mockUpdateCotizacion.mockResolvedValueOnce(updatedCotizacion)
    
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    fireEvent.click(estadoButton)
    
    await waitFor(() => {
      const enviadoOption = screen.getByText('Enviado')
      fireEvent.click(enviadoOption)
    })
    
    await waitFor(() => {
      expect(mockUpdateCotizacion).toHaveBeenCalledWith('1', { estado: 'enviado' })
      expect(toast.success).toHaveBeenCalledWith('Estado actualizado a Enviado')
      expect(mockProps.onCotizacionUpdated).toHaveBeenCalledWith(updatedCotizacion)
    })
  })

  it('updates etapa successfully', async () => {
    const updatedCotizacion = { ...mockCotizacion, etapa: 'revision' as const }
    mockUpdateCotizacion.mockResolvedValueOnce(updatedCotizacion)
    
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const etapaButton = screen.getByTestId('etapa-button')
    fireEvent.click(etapaButton)
    
    await waitFor(() => {
      const revisionOption = screen.getByText('Revisión')
      fireEvent.click(revisionOption)
    })
    
    await waitFor(() => {
      expect(mockUpdateCotizacion).toHaveBeenCalledWith('1', { etapa: 'revision' })
      expect(toast.success).toHaveBeenCalledWith('Etapa actualizada a Revisión')
      expect(mockProps.onCotizacionUpdated).toHaveBeenCalledWith(updatedCotizacion)
    })
  })

  it('handles estado update errors gracefully', async () => {
    const errorMessage = 'Error updating estado'
    mockUpdateCotizacion.mockRejectedValueOnce(new Error(errorMessage))
    
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    fireEvent.click(estadoButton)
    
    await waitFor(() => {
      const enviadoOption = screen.getByText('Enviado')
      fireEvent.click(enviadoOption)
    })
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al actualizar estado: Error updating estado')
    })
  })

  it('handles etapa update errors gracefully', async () => {
    const errorMessage = 'Error updating etapa'
    mockUpdateCotizacion.mockRejectedValueOnce(new Error(errorMessage))
    
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const etapaButton = screen.getByTestId('etapa-button')
    fireEvent.click(etapaButton)
    
    await waitFor(() => {
      const revisionOption = screen.getByText('Revisión')
      fireEvent.click(revisionOption)
    })
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al actualizar etapa: Error updating etapa')
    })
  })

  it('shows loading state during estado update', async () => {
    // Mock a delayed response
    mockUpdateCotizacion.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    fireEvent.click(estadoButton)
    
    await waitFor(() => {
      const enviadoOption = screen.getByText('Enviado')
      fireEvent.click(enviadoOption)
    })
    
    // Check loading state
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(estadoButton).toBeDisabled()
  })

  it('shows loading state during etapa update', async () => {
    // Mock a delayed response
    mockUpdateCotizacion.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const etapaButton = screen.getByTestId('etapa-button')
    fireEvent.click(etapaButton)
    
    await waitFor(() => {
      const revisionOption = screen.getByText('Revisión')
      fireEvent.click(revisionOption)
    })
    
    // Check loading state
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    expect(etapaButton).toBeDisabled()
  })

  it('displays correct badge variants for different estados', () => {
    const estadoVariants = [
      { estado: 'borrador', expectedVariant: 'secondary' },
      { estado: 'enviado', expectedVariant: 'default' },
      { estado: 'aprobado', expectedVariant: 'default' },
      { estado: 'rechazado', expectedVariant: 'destructive' }
    ]
    
    estadoVariants.forEach(({ estado, expectedVariant }) => {
      const cotizacionWithEstado = { ...mockCotizacion, estado: estado as any }
      const { rerender } = render(
        <EstadoCotizacionToolbar 
          cotizacion={cotizacionWithEstado} 
          onCotizacionUpdated={mockProps.onCotizacionUpdated} 
        />
      )
      
      const badges = screen.getAllByTestId('badge')
      const estadoBadge = badges.find(badge => 
        badge.textContent?.toLowerCase().includes(estado.charAt(0).toUpperCase() + estado.slice(1))
      )
      
      expect(estadoBadge).toHaveAttribute('data-variant', expectedVariant)
      
      rerender(<div />)
    })
  })

  it('prevents selecting the same estado', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    fireEvent.click(estadoButton)
    
    await waitFor(() => {
      const borradorOption = screen.getByText('Borrador')
      fireEvent.click(borradorOption)
    })
    
    // Should not call update service for same estado
    expect(mockUpdateCotizacion).not.toHaveBeenCalled()
  })

  it('prevents selecting the same etapa', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const etapaButton = screen.getByTestId('etapa-button')
    fireEvent.click(etapaButton)
    
    await waitFor(() => {
      const inicialOption = screen.getByText('Inicial')
      fireEvent.click(inicialOption)
    })
    
    // Should not call update service for same etapa
    expect(mockUpdateCotizacion).not.toHaveBeenCalled()
  })

  it('displays all available estados with correct icons', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    fireEvent.click(estadoButton)
    
    await waitFor(() => {
      expect(screen.getByText('Borrador')).toBeInTheDocument()
      expect(screen.getByText('Enviado')).toBeInTheDocument()
      expect(screen.getByText('Aprobado')).toBeInTheDocument()
      expect(screen.getByText('Rechazado')).toBeInTheDocument()
      
      // Check for corresponding icons
      expect(screen.getAllByTestId('file-text-icon')).toHaveLength(2) // Current + option
      expect(screen.getByTestId('send-icon')).toBeInTheDocument()
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
    })
  })

  it('displays all available etapas with correct icons', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const etapaButton = screen.getByTestId('etapa-button')
    fireEvent.click(etapaButton)
    
    await waitFor(() => {
      expect(screen.getByText('Inicial')).toBeInTheDocument()
      expect(screen.getByText('Revisión')).toBeInTheDocument()
      expect(screen.getByText('Negociación')).toBeInTheDocument()
      expect(screen.getByText('Finalizada')).toBeInTheDocument()
      
      // Check for corresponding icons
      expect(screen.getAllByTestId('target-icon')).toHaveLength(2) // Current + option
      expect(screen.getByTestId('users-icon')).toBeInTheDocument()
      expect(screen.getByTestId('handshake-icon')).toBeInTheDocument()
      expect(screen.getByTestId('trophy-icon')).toBeInTheDocument()
    })
  })

  it('closes estado dropdown when clicking outside', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    fireEvent.click(estadoButton)
    
    await waitFor(() => {
      expect(screen.getByText('Enviado')).toBeInTheDocument()
    })
    
    // Click outside (on the card)
    const card = screen.getByTestId('card')
    fireEvent.click(card)
    
    await waitFor(() => {
      expect(screen.queryByText('Enviado')).not.toBeInTheDocument()
    })
  })

  it('closes etapa dropdown when clicking outside', async () => {
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const etapaButton = screen.getByTestId('etapa-button')
    fireEvent.click(etapaButton)
    
    await waitFor(() => {
      expect(screen.getByText('Revisión')).toBeInTheDocument()
    })
    
    // Click outside (on the card)
    const card = screen.getByTestId('card')
    fireEvent.click(card)
    
    await waitFor(() => {
      expect(screen.queryByText('Revisión')).not.toBeInTheDocument()
    })
  })

  it('handles rapid successive clicks gracefully', async () => {
    mockUpdateCotizacion.mockResolvedValue({ ...mockCotizacion, estado: 'enviado' })
    
    render(<EstadoCotizacionToolbar {...mockProps} />)
    
    const estadoButton = screen.getByTestId('estado-button')
    
    // Rapid clicks
    fireEvent.click(estadoButton)
    fireEvent.click(estadoButton)
    fireEvent.click(estadoButton)
    
    await waitFor(() => {
      const enviadoOption = screen.getByText('Enviado')
      fireEvent.click(enviadoOption)
      fireEvent.click(enviadoOption)
    })
    
    // Should only call update once due to loading state
    await waitFor(() => {
      expect(mockUpdateCotizacion).toHaveBeenCalledTimes(1)
    })
  })
})
