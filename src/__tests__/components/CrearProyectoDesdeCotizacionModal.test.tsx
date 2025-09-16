/**
 * 🧪 Tests for CrearProyectoDesdeCotizacionModal Component
 * 
 * Tests the modal component for creating projects from quotations,
 * including rendering, validation, form submission, and error handling.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { crearProyectoDesdeCotizacion } from '@/lib/services/proyecto'
import CrearProyectoDesdeCotizacionModal from '@/components/proyectos/CrearProyectoDesdeCotizacionModal'
import type { Cotizacion } from '@/types'

// 🔧 Mock dependencies
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))
jest.mock('@/lib/services/proyecto', () => ({
  crearProyectoDesdeCotizacion: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockToast = toast as jest.Mocked<typeof toast>
const mockCrearProyecto = crearProyectoDesdeCotizacion as jest.MockedFunction<typeof crearProyectoDesdeCotizacion>

// 📋 Mock data
const mockCotizacion: Cotizacion = {
  id: 'cot-123',
  numero: 'COT-2024-001',
  clienteId: 'client-123',
  cliente: {
    id: 'client-123',
    nombre: 'Cliente Test',
    email: 'test@example.com',
    telefono: '123456789',
    direccion: 'Test Address',
    ruc: '12345678901',
    contacto: 'Contact Person',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  fechaEmision: new Date(),
  fechaVencimiento: new Date(),
  estado: 'pendiente',
  subtotal: 1000,
  igv: 180,
  total: 1180,
  observaciones: 'Test observations',
  activo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  gastos: []
}

const mockProyecto = {
  id: 'proj-123',
  nombre: 'Proyecto Test',
  clienteId: 'client-123',
  fechaInicio: new Date(),
  fechaFin: new Date(),
}

describe('CrearProyectoDesdeCotizacionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    })
  })

  it('should render the trigger button', () => {
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    const button = screen.getByRole('button', { name: /crear proyecto/i })
    expect(button).toBeInTheDocument()
  })

  it('should open modal when trigger button is clicked', async () => {
    const user = userEvent.setup()
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(triggerButton)
    
    expect(screen.getByText('Crear Proyecto desde Cotización')).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre del proyecto/i)).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // Open modal
    const triggerButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(triggerButton)
    
    // Try to submit without filling required fields
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(createButton)
    
    expect(mockToast.error).toHaveBeenCalledWith('Por favor, completa todos los campos requeridos')
  })

  it('should create project successfully', async () => {
    const user = userEvent.setup()
    mockCrearProyecto.mockResolvedValue(mockProyecto)
    
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // Open modal
    const triggerButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(triggerButton)
    
    // Fill form
    const nombreInput = screen.getByLabelText(/nombre del proyecto/i)
    const fechaInicioInput = screen.getByLabelText(/fecha de inicio/i)
    
    await user.type(nombreInput, 'Proyecto Test')
    await user.type(fechaInicioInput, '2024-01-15')
    
    // Submit form
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(createButton)
    
    await waitFor(() => {
      expect(mockCrearProyecto).toHaveBeenCalledWith({
        cotizacionId: mockCotizacion.id,
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        fechaFin: undefined
      })
    })
    
    expect(mockToast.success).toHaveBeenCalledWith('Proyecto creado exitosamente')
    expect(mockPush).toHaveBeenCalledWith(`/proyectos/${mockProyecto.id}`)
  })

  it('should handle creation errors', async () => {
    const user = userEvent.setup()
    mockCrearProyecto.mockRejectedValue(new Error('Error al crear proyecto'))
    
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // Open modal
    const triggerButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(triggerButton)
    
    // Fill form
    const nombreInput = screen.getByLabelText(/nombre del proyecto/i)
    const fechaInicioInput = screen.getByLabelText(/fecha de inicio/i)
    
    await user.type(nombreInput, 'Proyecto Test')
    await user.type(fechaInicioInput, '2024-01-15')
    
    // Submit form
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(createButton)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al crear proyecto desde cotización')
    })
  })

  it('should include end date when provided', async () => {
    const user = userEvent.setup()
    mockCrearProyecto.mockResolvedValue(mockProyecto)
    
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // Open modal
    const triggerButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(triggerButton)
    
    // Fill form with end date
    const nombreInput = screen.getByLabelText(/nombre del proyecto/i)
    const fechaInicioInput = screen.getByLabelText(/fecha de inicio/i)
    const fechaFinInput = screen.getByLabelText(/fecha de fin/i)
    
    await user.type(nombreInput, 'Proyecto Test')
    await user.type(fechaInicioInput, '2024-01-15')
    await user.type(fechaFinInput, '2024-06-15')
    
    // Submit form
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(createButton)
    
    await waitFor(() => {
      expect(mockCrearProyecto).toHaveBeenCalledWith({
        cotizacionId: mockCotizacion.id,
        nombre: 'Proyecto Test',
        fechaInicio: '2024-01-15',
        fechaFin: '2024-06-15'
      })
    })
  })

  it('should render with custom props', () => {
    render(
      <CrearProyectoDesdeCotizacionModal 
        cotizacion={mockCotizacion}
        buttonVariant="outline"
        showIcon={false}
      />
    )
    
    const button = screen.getByRole('button', { name: /crear proyecto/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('border-input')
  })

  it('should show loading state during creation', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockCrearProyecto.mockReturnValue(promise)
    
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // Open modal and fill form
    const triggerButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(triggerButton)
    
    const nombreInput = screen.getByLabelText(/nombre del proyecto/i)
    const fechaInicioInput = screen.getByLabelText(/fecha de inicio/i)
    
    await user.type(nombreInput, 'Proyecto Test')
    await user.type(fechaInicioInput, '2024-01-15')
    
    // Submit form
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    await user.click(createButton)
    
    // Check loading state
    expect(screen.getByText(/creando.../i)).toBeInTheDocument()
    
    // Resolve promise
    resolvePromise!(mockProyecto)
    
    await waitFor(() => {
      expect(screen.queryByText(/creando.../i)).not.toBeInTheDocument()
    })
  })
})