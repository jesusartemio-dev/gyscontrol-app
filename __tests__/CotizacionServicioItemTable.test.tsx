// ===================================================
// 📁 Archivo: CotizacionServicioItemTable.test.tsx
// 📌 Ubicación: __tests__/CotizacionServicioItemTable.test.tsx
// 🔧 Descripción: Tests para la tabla editable de items de servicio con cálculos en tiempo real
// 🧠 Uso: Verifica que los cálculos se actualicen correctamente durante la edición
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-23
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CotizacionServicioItemTable from '@/components/cotizaciones/CotizacionServicioItemTable'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import type { CotizacionServicioItem, Recurso, UnidadServicio } from '@/types'

// Mock dependencies
jest.mock('@/lib/services/recurso')
jest.mock('@/lib/services/unidadServicio')

const mockGetRecursos = getRecursos as jest.MockedFunction<typeof getRecursos>
const mockGetUnidadesServicio = getUnidadesServicio as jest.MockedFunction<typeof getUnidadesServicio>

// Mock data
const mockRecursos: Recurso[] = [
  {
    id: 'recurso-1',
    nombre: 'Programador Senior',
    costoHora: 30.50,
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z'
  },
  {
    id: 'recurso-2',
    nombre: 'Técnico Junior',
    costoHora: 20.00,
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z'
  }
]

const mockUnidadesServicio: UnidadServicio[] = [
  {
    id: 'unidad-1',
    nombre: 'Motores',
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z'
  }
]

const mockItems: CotizacionServicioItem[] = [
  {
    id: 'item-1',
    cotizacionServicioId: 'servicio-1',
    catalogoServicioId: 'catalogo-1',
    unidadServicioId: 'unidad-1',
    recursoId: 'recurso-1',
    nombre: 'Programación PLC',
    descripcion: 'Programación de lógica de control',
    categoria: 'PLC',
    formula: 'Escalonada',
    horaBase: 5,
    horaRepetido: 0,
    horaUnidad: 8,
    horaFijo: 1,
    unidadServicioNombre: 'Motores',
    recursoNombre: 'Programador Senior',
    costoHora: 30.50,
    cantidad: 2,
    horaTotal: 21,
    factorSeguridad: 1.0,
    costoInterno: 640.50,
    margen: 1.35,
    costoCliente: 864.68,
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z',
    unidadServicio: { id: 'unidad-1', nombre: 'Motores' },
    recurso: { id: 'recurso-1', nombre: 'Programador Senior', costoHora: 30.50 }
  },
  {
    id: 'item-2',
    cotizacionServicioId: 'servicio-1',
    catalogoServicioId: 'catalogo-2',
    unidadServicioId: 'unidad-1',
    recursoId: 'recurso-2',
    nombre: 'Configuración HMI',
    descripcion: 'Configuración de interfaz',
    categoria: 'HMI',
    formula: 'Fijo',
    horaBase: 0,
    horaRepetido: 0,
    horaUnidad: 0,
    horaFijo: 4,
    unidadServicioNombre: 'Motores',
    recursoNombre: 'Técnico Junior',
    costoHora: 20.00,
    cantidad: 1,
    horaTotal: 4,
    factorSeguridad: 1.0,
    costoInterno: 80.00,
    margen: 1.25,
    costoCliente: 100.00,
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z',
    unidadServicio: { id: 'unidad-1', nombre: 'Motores' },
    recurso: { id: 'recurso-2', nombre: 'Técnico Junior', costoHora: 20.00 }
  }
]

describe('CotizacionServicioItemTable', () => {
  const defaultProps = {
    items: mockItems,
    onUpdated: jest.fn(),
    onDeleted: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetRecursos.mockResolvedValue(mockRecursos)
    mockGetUnidadesServicio.mockResolvedValue(mockUnidadesServicio)
  })

  it('should render table with service items', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    expect(screen.getByText('Programación PLC')).toBeInTheDocument()
    expect(screen.getByText('Configuración HMI')).toBeInTheDocument()
    expect(screen.getByText('$30.50')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })

  it('should show correct totals in footer', () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    // Check totals
    expect(screen.getByText('25.00')).toBeInTheDocument() // Total HH (21 + 4)
    expect(screen.getByText('$720.50')).toBeInTheDocument() // Total costo interno (640.50 + 80.00)
    expect(screen.getByText('$964.68')).toBeInTheDocument() // Total costo cliente (864.68 + 100.00)
  })

  it('should enter edit mode when pencil button is clicked', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    const editButtons = screen.getAllByRole('button')
    const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
    
    if (pencilButton) {
      fireEvent.click(pencilButton)
    }

    await waitFor(() => {
      // Should show input fields
      expect(screen.getByDisplayValue('2')).toBeInTheDocument() // cantidad
      expect(screen.getByDisplayValue('1')).toBeInTheDocument() // factorSeguridad
      expect(screen.getByDisplayValue('1.35')).toBeInTheDocument() // margen
    })
  })

  it('should update calculations in real-time when editing cantidad', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    // Enter edit mode for first item
    const editButtons = screen.getAllByRole('button')
    const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
    
    if (pencilButton) {
      fireEvent.click(pencilButton)
    }

    await waitFor(() => {
      const cantidadInput = screen.getByDisplayValue('2')
      
      // Change cantidad from 2 to 3
      fireEvent.change(cantidadInput, { target: { value: '3' } })

      // Should recalculate hours: base(5) + repetido(0) + unidad(8)*cantidad(3) + fijo(1) = 30
      // Should recalculate costoInterno: 30 * 30.50 * 1.0 = 915
      // Should recalculate costoCliente: 915 * 1.35 = 1235.25
      
      // Check if calculations updated in real-time
      expect(screen.getByText('30.00')).toBeInTheDocument() // New horaTotal
      expect(screen.getByText('$915.00')).toBeInTheDocument() // New costoInterno
      expect(screen.getByText('$1235.25')).toBeInTheDocument() // New costoCliente
    })
  })

  it('should update calculations when changing factorSeguridad', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    // Enter edit mode
    const editButtons = screen.getAllByRole('button')
    const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
    
    if (pencilButton) {
      fireEvent.click(pencilButton)
    }

    await waitFor(() => {
      const factorInput = screen.getByDisplayValue('1')
      
      // Change factor from 1.0 to 1.2
      fireEvent.change(factorInput, { target: { value: '1.2' } })

      // Should recalculate costoInterno: 21 * 30.50 * 1.2 = 768.60
      // Should recalculate costoCliente: 768.60 * 1.35 = 1037.61
      
      expect(screen.getByText('$768.60')).toBeInTheDocument()
      expect(screen.getByText('$1037.61')).toBeInTheDocument()
    })
  })

  it('should update calculations when changing margen', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    // Enter edit mode
    const editButtons = screen.getAllByRole('button')
    const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
    
    if (pencilButton) {
      fireEvent.click(pencilButton)
    }

    await waitFor(() => {
      const margenInput = screen.getByDisplayValue('1.35')
      
      // Change margen from 1.35 to 1.5
      fireEvent.change(margenInput, { target: { value: '1.5' } })

      // Should recalculate costoCliente: 640.50 * 1.5 = 960.75
      expect(screen.getByText('$960.75')).toBeInTheDocument()
    })
  })

  it('should update totals in real-time during editing', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    // Enter edit mode for first item
    const editButtons = screen.getAllByRole('button')
    const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
    
    if (pencilButton) {
      fireEvent.click(pencilButton)
    }

    await waitFor(() => {
      const cantidadInput = screen.getByDisplayValue('2')
      
      // Change cantidad from 2 to 5
      fireEvent.change(cantidadInput, { target: { value: '5' } })

      // New calculations for first item:
      // horaTotal: 5 + 0 + (8*5) + 1 = 46
      // costoInterno: 46 * 30.50 * 1.0 = 1403
      // costoCliente: 1403 * 1.35 = 1894.05
      
      // New totals should include edited values:
      // Total HH: 46 + 4 = 50
      // Total costoInterno: 1403 + 80 = 1483
      // Total costoCliente: 1894.05 + 100 = 1994.05
      
      expect(screen.getByText('50.00')).toBeInTheDocument() // Updated total HH
      expect(screen.getByText('$1483.00')).toBeInTheDocument() // Updated total interno
      expect(screen.getByText('$1994.05')).toBeInTheDocument() // Updated total cliente
    })
  })

  it('should save changes when save button is clicked', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    // Enter edit mode
    const editButtons = screen.getAllByRole('button')
    const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
    
    if (pencilButton) {
      fireEvent.click(pencilButton)
    }

    await waitFor(() => {
      const cantidadInput = screen.getByDisplayValue('2')
      fireEvent.change(cantidadInput, { target: { value: '3' } })

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i })
      fireEvent.click(saveButton)

      // Should call onUpdated with calculated values
      expect(defaultProps.onUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'item-1',
          cantidad: 3,
          horaTotal: 30,
          costoInterno: 915,
          costoCliente: 1235.25
        })
      )
    })
  })

  it('should cancel editing when cancel button is clicked', async () => {
    render(<CotizacionServicioItemTable {...defaultProps} />)

    // Enter edit mode
    const editButtons = screen.getAllByRole('button')
    const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
    
    if (pencilButton) {
      fireEvent.click(pencilButton)
    }

    await waitFor(() => {
      const cantidadInput = screen.getByDisplayValue('2')
      fireEvent.change(cantidadInput, { target: { value: '5' } })

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /x/i })
      fireEvent.click(cancelButton)

      // Should revert to original values
      expect(screen.getByText('21.00')).toBeInTheDocument() // Original horaTotal
      expect(screen.getByText('$640.50')).toBeInTheDocument() // Original costoInterno
    })
  })
})