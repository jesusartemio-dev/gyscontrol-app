import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CotizacionProveedorList from '../CotizacionProveedorList'
import { CotizacionProveedor } from '@/types'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

const mockCotizaciones: CotizacionProveedor[] = [
  {
    id: 'cot-1',
    proveedorId: 'prov-1',
    proyectoId: 'proj-1',
    codigo: 'COT-001',
    numeroSecuencia: 1,
    estado: 'pendiente',
    proveedor: {
      id: 'prov-1',
      nombre: 'Proveedor Test',
      ruc: '12345678901',
    },
    proyecto: {
      id: 'proj-1',
      clienteId: 'client-1',
      comercialId: 'comercial-1',
      gestorId: 'gestor-1',
      nombre: 'Proyecto Test',
      totalEquiposInterno: 1000,
      totalServiciosInterno: 500,
      totalGastosInterno: 200,
      totalInterno: 1700,
      totalCliente: 2000,
      descuento: 0,
      grandTotal: 2000,
      totalRealEquipos: 0,
      totalRealServicios: 0,
      totalRealGastos: 0,
      totalReal: 0,
      codigo: 'PROJ-001',
      estado: 'activo',
      fechaInicio: '2024-01-01',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      cliente: {
        id: 'client-1',
        nombre: 'Cliente Test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      comercial: {
        id: 'comercial-1',
        name: 'Comercial Test',
        email: 'comercial@test.com',
        password: 'password',
        role: 'comercial',
        proyectosComercial: [],
        proyectosGestor: [],
        cotizaciones: [],
        ProyectoEquipos: [],
        ProyectoEquipoItems: [],
        ProyectoServicios: [],
        ProyectoServicioItems: [],
      },
      gestor: {
        id: 'gestor-1',
        name: 'Gestor Test',
        email: 'gestor@test.com',
        password: 'password',
        role: 'gestor',
        proyectosComercial: [],
        proyectosGestor: [],
        cotizaciones: [],
        ProyectoEquipos: [],
        ProyectoEquipoItems: [],
        ProyectoServicios: [],
        ProyectoServicioItems: [],
      },
      equipos: [],
      servicios: [],
      gastos: [],
      ListaEquipo: [],
      cotizaciones: [],
      valorizaciones: [],
      registrosHoras: [],
    },
    items: [],
  },
]

const mockOnUpdate = jest.fn()
const mockOnDelete = jest.fn()

describe('CotizacionProveedorList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders cotizaciones correctly', () => {
    render(
      <CotizacionProveedorList
        data={mockCotizaciones}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('📄 Cotizaciones de Proveedor')).toBeInTheDocument()
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('Estado: pendiente')).toBeInTheDocument()
    expect(screen.getByText('🧾 Proveedor Test')).toBeInTheDocument()
  })

  it('enters edit mode when edit button is clicked', () => {
    render(
      <CotizacionProveedorList
        data={mockCotizaciones}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    expect(screen.getByPlaceholderText('Código de cotización')).toBeInTheDocument()
    expect(screen.getByDisplayValue('COT-001')).toBeInTheDocument()
  })

  it('calls onUpdate with correct payload when saving', () => {
    render(
      <CotizacionProveedorList
        data={mockCotizaciones}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    // Change the codigo
    const input = screen.getByPlaceholderText('Código de cotización')
    fireEvent.change(input, { target: { value: 'COT-002' } })

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    expect(mockOnUpdate).toHaveBeenCalledWith('cot-1', {
      codigo: 'COT-002',
    })
  })

  it('shows error when trying to save without codigo', () => {
    const { toast } = require('sonner')
    
    render(
      <CotizacionProveedorList
        data={mockCotizaciones}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    // Clear the codigo
    const input = screen.getByPlaceholderText('Código de cotización')
    fireEvent.change(input, { target: { value: '' } })

    // Try to save
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    expect(toast.error).toHaveBeenCalledWith('Código es obligatorio')
    expect(mockOnUpdate).not.toHaveBeenCalled()
  })
})