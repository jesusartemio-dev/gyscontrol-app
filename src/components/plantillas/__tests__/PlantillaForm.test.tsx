import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlantillaForm from '../PlantillaForm'
import { createPlantilla } from '@/lib/services/plantilla'
import type { Plantilla } from '@/app/comercial/plantillas/page'

// Mock dependencies
jest.mock('@/lib/services/plantilla')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>
  }
}))

const mockCreatePlantilla = createPlantilla as jest.MockedFunction<typeof createPlantilla>

const mockPlantilla: Plantilla = {
  id: '1',
  nombre: 'Test Plantilla',
  totalInterno: 0,
  totalCliente: 0
}

describe('PlantillaForm', () => {
  const mockOnCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form with all elements', () => {
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    expect(screen.getByText('Nueva Plantilla')).toBeInTheDocument()
    expect(screen.getByText('Crea una nueva plantilla para tus cotizaciones comerciales')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre de la plantilla')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear plantilla/i })).toBeInTheDocument()
  })

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup()
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    await user.click(submitButton)
    
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(mockCreatePlantilla).not.toHaveBeenCalled()
  })

  it('shows validation error for short name', async () => {
    const user = userEvent.setup()
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    await user.type(input, 'AB')
    await user.click(submitButton)
    
    expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument()
    expect(mockCreatePlantilla).not.toHaveBeenCalled()
  })

  it('shows validation error for long name', async () => {
    const user = userEvent.setup()
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    const longName = 'A'.repeat(101)
    await user.type(input, longName)
    await user.click(submitButton)
    
    expect(screen.getByText('El nombre no puede exceder 100 caracteres')).toBeInTheDocument()
    expect(mockCreatePlantilla).not.toHaveBeenCalled()
  })

  it('clears validation error when user starts typing', async () => {
    const user = userEvent.setup()
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    // Trigger validation error
    await user.click(submitButton)
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    
    // Start typing to clear error
    await user.type(input, 'Test')
    expect(screen.queryByText('El nombre es obligatorio')).not.toBeInTheDocument()
  })

  it('successfully creates plantilla with valid data', async () => {
    const user = userEvent.setup()
    mockCreatePlantilla.mockResolvedValue(mockPlantilla)
    
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    await user.type(input, 'Test Plantilla')
    await user.click(submitButton)
    
    expect(mockCreatePlantilla).toHaveBeenCalledWith({
      nombre: 'Test Plantilla',
      totalInterno: 0,
      totalCliente: 0
    })
    
    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalledWith(mockPlantilla)
    })
    
    // Form should be reset
    expect(input).toHaveValue('')
  })

  it('shows loading state during creation', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: Plantilla) => void
    const promise = new Promise<Plantilla>((resolve) => {
      resolvePromise = resolve
    })
    mockCreatePlantilla.mockReturnValue(promise)
    
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    await user.type(input, 'Test Plantilla')
    await user.click(submitButton)
    
    // Should show loading state
    expect(screen.getByText('Creando...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    expect(input).toBeDisabled()
    
    // Resolve promise
    resolvePromise!(mockPlantilla)
    
    await waitFor(() => {
      expect(screen.getByText('Crear Plantilla')).toBeInTheDocument()
    })
  })

  it('handles creation error', async () => {
    const user = userEvent.setup()
    mockCreatePlantilla.mockRejectedValue(new Error('Network error'))
    
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    await user.type(input, 'Test Plantilla')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Ocurrió un error al crear la plantilla. Por favor, inténtalo de nuevo.')).toBeInTheDocument()
    })
    
    expect(mockOnCreated).not.toHaveBeenCalled()
  })

  it('disables submit button when validation errors exist', async () => {
    const user = userEvent.setup()
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    // Type invalid input
    await user.type(input, 'AB')
    await user.click(submitButton)
    
    // Button should be disabled due to validation error
    expect(submitButton).toBeDisabled()
  })

  it('trims whitespace from input', async () => {
    const user = userEvent.setup()
    mockCreatePlantilla.mockResolvedValue(mockPlantilla)
    
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    
    await user.type(input, '  Test Plantilla  ')
    await user.click(submitButton)
    
    expect(mockCreatePlantilla).toHaveBeenCalledWith({
      nombre: 'Test Plantilla',
      totalInterno: 0,
      totalCliente: 0
    })
  })

  it('has proper accessibility attributes', () => {
    render(<PlantillaForm onCreated={mockOnCreated} />)
    
    const input = screen.getByLabelText('Nombre de la plantilla')
    expect(input).toHaveAttribute('id', 'nombre')
    expect(input).toHaveAttribute('placeholder', 'Ej: Plantilla Sistema Eléctrico')
    
    const submitButton = screen.getByRole('button', { name: /crear plantilla/i })
    expect(submitButton).toHaveAttribute('type', 'submit')
  })
})
