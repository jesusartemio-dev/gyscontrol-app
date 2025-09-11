// ===================================================
// 📁 Archivo: CotizacionSelector.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para el componente CotizacionSelector
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CotizacionSelector, CotizacionBadge, CotizacionInfo, CotizacionCodigoSimple } from '../CotizacionSelector'
import { CotizacionProveedorItem } from '@/types/modelos'
import { toast } from 'sonner'
import { seleccionarCotizacion } from '@/lib/services/cotizacionProveedorItem'

// 🧪 Mock de sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

// 🧪 Mock de servicios
jest.mock('@/lib/services/cotizacionProveedorItem', () => ({
  seleccionarCotizacion: jest.fn()
}))

// 🧪 Mock de fetch
global.fetch = jest.fn()

const mockCotizaciones: CotizacionProveedorItem[] = [
  {
    id: 'cot-1',
    listaEquipoItemId: 'item-1',
    cotizacionId: 'cotizacion-1',
    precioUnitario: 100,
    tiempoEntrega: '5 días',
    tiempoEntregaDias: 5,
    esSeleccionada: true,
    cotizacion: {
      id: 'cotizacion-1',
      codigo: 'COT-001',
      proveedor: {
        id: 'prov-1',
        nombre: 'Proveedor A'
      }
    }
  },
  {
    id: 'cot-2',
    listaEquipoItemId: 'item-1',
    cotizacionId: 'cotizacion-2',
    precioUnitario: 120,
    tiempoEntrega: '7 días',
    tiempoEntregaDias: 7,
    esSeleccionada: false,
    cotizacion: {
      id: 'cotizacion-2',
      codigo: 'COT-002',
      proveedor: {
        id: 'prov-2',
        nombre: 'Proveedor B'
      }
    }
  },
  {
    id: 'cot-3',
    listaEquipoItemId: 'item-1',
    cotizacionId: 'cotizacion-3',
    precioUnitario: 90,
    tiempoEntrega: '3 días',
    tiempoEntregaDias: 3,
    esSeleccionada: false,
    cotizacion: {
      id: 'cotizacion-3',
      codigo: 'COT-003',
      proveedor: {
        id: 'prov-3',
        nombre: 'Proveedor C'
      }
    }
  }
]

describe('CotizacionSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  // ✅ Test: Renderizado sin cotizaciones
  it('should render empty state when no cotizaciones provided', () => {
    render(
      <CotizacionSelector
        cotizaciones={[]}
        listaEquipoItemId="item-1"
      />
    )

    expect(screen.getByText('Sin cotizaciones')).toBeInTheDocument()
  })

  // ✅ Test: Renderizado con una sola cotización
  it('should render single cotization as badge', () => {
    const singleCotizacion = [mockCotizaciones[0]]
    
    render(
      <CotizacionSelector
        cotizaciones={singleCotizacion}
        cotizacionSeleccionadaId="cot-1"
        listaEquipoItemId="item-1"
      />
    )

    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByRole('generic')).toHaveClass('bg-green-500')
  })

  // ✅ Test: Renderizado con múltiples cotizaciones
  it('should render dropdown with multiple cotizaciones', () => {
    render(
      <CotizacionSelector
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId="cot-1"
        listaEquipoItemId="item-1"
      />
    )

    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('3 cotizaciones')).toBeInTheDocument()
  })

  // ✅ Test: Abrir dropdown y mostrar opciones
  it('should show all cotizaciones when dropdown is opened', async () => {
    render(
      <CotizacionSelector
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId="cot-1"
        listaEquipoItemId="item-1"
      />
    )

    // Abrir dropdown
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('COT-002')).toBeInTheDocument()
      expect(screen.getByText('COT-003')).toBeInTheDocument()
      expect(screen.getByText('Proveedor B')).toBeInTheDocument()
      expect(screen.getByText('Proveedor C')).toBeInTheDocument()
    })
  })

  // ✅ Test: Seleccionar nueva cotización
  it('should call API when selecting new cotization', async () => {
    const mockOnChange = jest.fn()
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    render(
      <CotizacionSelector
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId="cot-1"
        listaEquipoItemId="item-1"
        onSelectionChange={mockOnChange}
      />
    )

    // Abrir dropdown
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    // Seleccionar nueva cotización
    await waitFor(() => {
      const option = screen.getByText('COT-002')
      fireEvent.click(option)
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/lista-equipo-item/item-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cotizacionSeleccionadaId: 'cot-2'
        })
      })
      expect(toast.success).toHaveBeenCalledWith('Cotización seleccionada actualizada')
      expect(mockOnChange).toHaveBeenCalledWith('cot-2')
    })
  })

  // ✅ Test: Manejo de errores en la API
  it('should handle API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(
      <CotizacionSelector
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId="cot-1"
        listaEquipoItemId="item-1"
      />
    )

    // Abrir dropdown
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    // Seleccionar nueva cotización
    await waitFor(() => {
      const option = screen.getByText('COT-002')
      fireEvent.click(option)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al actualizar la cotización seleccionada')
    })
  })

  // ✅ Test: Modo solo lectura
  it('should be disabled in readOnly mode', () => {
    render(
      <CotizacionSelector
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId="cot-1"
        listaEquipoItemId="item-1"
        readOnly={true}
      />
    )

    const trigger = screen.getByRole('button')
    expect(trigger).toBeDisabled()
  })
})

describe('CotizacionBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Test: Renderizado básico
  it('should render quotation badge with code', () => {
    render(
      <CotizacionBadge 
        cotizacion={mockCotizaciones[0]} 
        isSelected={true}
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('5 días')).toBeInTheDocument()
  })

  // ✅ Test: Badge seleccionado
  it('should show selected state', () => {
    render(
      <CotizacionBadge 
        cotizacion={mockCotizaciones[0]} 
        isSelected={true}
      />
    )
    
    const badge = screen.getByText('COT-001').closest('div')
    expect(badge).toHaveClass('border-green-500')
  })

  // ✅ Test: Badge no seleccionado
  it('should show unselected state', () => {
    render(
      <CotizacionBadge 
        cotizacion={mockCotizaciones[1]} 
        isSelected={false}
      />
    )
    
    const badge = screen.getByText('COT-002').closest('div')
    expect(badge).not.toHaveClass('border-green-500')
  })
})

describe('CotizacionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Test: Renderizado básico sin cotizaciones
  it('should render empty state when no quotations are provided', () => {
    render(
      <CotizacionInfo 
        cotizaciones={[]} 
        cotizacionSeleccionadaId={undefined} 
      />
    )
    
    expect(screen.getByText('Sin cotizaciones')).toBeInTheDocument()
  })

  // ✅ Test: Renderizado con cotizaciones pero sin selección
  it('should render all quotations when none is selected', () => {
    render(
      <CotizacionInfo 
        cotizaciones={mockCotizaciones} 
        cotizacionSeleccionadaId={undefined} 
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('COT-002')).toBeInTheDocument()
    expect(screen.getByText('No seleccionada')).toBeInTheDocument()
  })

  // ✅ Test: Modo interactivo - selección de cotización
  it('should handle quotation selection in interactive mode', async () => {
    const mockOnSelectionChange = jest.fn()
    ;(seleccionarCotizacion as jest.Mock).mockResolvedValue({})
    
    render(
      <CotizacionInfo 
        cotizaciones={mockCotizaciones} 
        cotizacionSeleccionadaId={undefined}
        interactive={true}
        onSelectionChange={mockOnSelectionChange}
        listaEquipoItemId="item-1"
      />
    )
    
    // Abrir popover
    const trigger = screen.getByText('No seleccionada')
    fireEvent.click(trigger)
    
    // Seleccionar cotización
    await waitFor(() => {
      const cotizacionButton = screen.getByText('COT-001')
      fireEvent.click(cotizacionButton)
    })
    
    await waitFor(() => {
      expect(seleccionarCotizacion).toHaveBeenCalledWith('item-1', 'cot-1')
      expect(mockOnSelectionChange).toHaveBeenCalledWith('cot-1')
      expect(toast.success).toHaveBeenCalledWith('Cotización seleccionada correctamente')
    })
  })
})

describe('CotizacionCodigoSimple', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Test: Renderizado básico sin cotizaciones
  it('should render dash when no quotations are provided', () => {
    render(
      <CotizacionCodigoSimple 
        cotizaciones={[]} 
        cotizacionSeleccionadaId={undefined} 
      />
    )
    
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  // ✅ Test: Renderizado con selección
  it('should render selected quotation code', () => {
    render(
      <CotizacionCodigoSimple 
        cotizaciones={mockCotizaciones} 
        cotizacionSeleccionadaId="cot-1" 
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
  })

  // ✅ Test: Modo interactivo
  it('should render interactive mode correctly', () => {
    const mockOnSelectionChange = jest.fn()
    
    render(
      <CotizacionCodigoSimple 
        cotizaciones={mockCotizaciones} 
        cotizacionSeleccionadaId="cot-1"
        interactive={true}
        onSelectionChange={mockOnSelectionChange}
        listaEquipoItemId="item-1"
      />
    )
    
    // Debería mostrar el código de la cotización seleccionada con funcionalidad interactiva
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    
    // Verificar que tiene el botón interactivo
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })
})
