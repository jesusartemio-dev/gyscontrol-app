import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PedidoEquipoItemModalAgregar from '../PedidoEquipoItemModalAgregar'
import { ListaEquipoItem, CotizacionProveedorItem } from '@/types'

// Mock data for testing
const mockCotizacionSeleccionada: CotizacionProveedorItem = {
  id: 'cot-1',
  cotizacionId: 'cotizacion-1',
  listaEquipoItemId: '1',
  listaId: 'lista1',
  codigo: 'CPU001',
  descripcion: 'CPU Intel Core i7',
  unidad: 'pieza',
  cantidadOriginal: 10,
  presupuesto: 500.00,
  precioUnitario: 500.00,
  cantidad: 2,
  costoTotal: 1000.00,
  tiempoEntrega: '1 semana',
  tiempoEntregaDias: 7,
  estado: 'cotizado',
  esSeleccionada: true,
  cotizacion: {
    id: 'cotizacion-1',
    proveedorId: 'prov-1',
    proyectoId: 'proyecto-1',
    codigo: 'COT-001',
    numeroSecuencia: 1,
    estado: 'cotizado',
    proveedor: {
      id: 'prov-1',
      nombre: 'Proveedor Test',
      ruc: '12345678901'
    },
    proyecto: {} as any,
    items: []
  }
}

const mockItems: ListaEquipoItem[] = [
  {
    id: '1',
    codigo: 'CPU001',
    descripcion: 'CPU Intel Core i7',
    unidad: 'pieza',
    cantidad: 10,
    verificado: true,
    comentarioRevision: undefined,
    presupuesto: 500.00,
    precioElegido: 500.00,
    costoElegido: 1000.00,
    costoPedido: undefined,
    costoReal: undefined,
    cantidadPedida: 2,
    cantidadEntregada: undefined,
    estado: 'por_cotizar',
    origen: 'cotizado',
    tiempoEntrega: 'stock',
    tiempoEntregaDias: 0,
    listaId: 'lista1',
    proyectoEquipoItemId: 'pei-1',
    proyectoEquipoId: 'pe-1',
    reemplazaProyectoEquipoItemId: undefined,
    proveedorId: 'prov-1',
    cotizacionSeleccionadaId: 'cot-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lista: {
      id: 'lista1',
      proyectoId: 'proyecto-1',
      codigo: 'LST-001',
      nombre: 'Lista Test',
      numeroSecuencia: 1,
      estado: 'por_cotizar',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      items: []
    },
    cotizaciones: [],
    pedidos: [],
    cotizacionSeleccionada: mockCotizacionSeleccionada
  },
  {
    id: '2',
    codigo: 'RAM001',
    descripcion: 'Memoria RAM 16GB',
    unidad: 'pieza',
    cantidad: 5,
    verificado: true,
    comentarioRevision: undefined,
    presupuesto: 200.00,
    precioElegido: 200.00,
    costoElegido: 200.00,
    costoPedido: undefined,
    costoReal: undefined,
    cantidadPedida: 1,
    cantidadEntregada: undefined,
    estado: 'por_cotizar',
    origen: 'cotizado',
    tiempoEntrega: '2 semanas',
    tiempoEntregaDias: 14,
    listaId: 'lista1',
    proyectoEquipoItemId: 'pei-2',
    proyectoEquipoId: 'pe-1',
    reemplazaProyectoEquipoItemId: undefined,
    proveedorId: undefined,
    cotizacionSeleccionadaId: undefined,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lista: {
      id: 'lista1',
      proyectoId: 'proyecto-1',
      codigo: 'LST-001',
      nombre: 'Lista Test',
      numeroSecuencia: 1,
      estado: 'por_cotizar',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      items: []
    },
    cotizaciones: [],
    pedidos: [],
    cotizacionSeleccionada: undefined
  },
  {
    id: '3',
    codigo: 'HDD001',
    descripcion: 'Disco Duro 1TB',
    unidad: 'pieza',
    cantidad: 0,
    verificado: true,
    comentarioRevision: undefined,
    presupuesto: 100.00,
    precioElegido: 100.00,
    costoElegido: 0.00,
    costoPedido: undefined,
    costoReal: undefined,
    cantidadPedida: 0,
    cantidadEntregada: undefined,
    estado: 'por_cotizar',
    origen: 'cotizado',
    tiempoEntrega: undefined,
    tiempoEntregaDias: undefined,
    listaId: 'lista1',
    proyectoEquipoItemId: 'pei-3',
    proyectoEquipoId: 'pe-1',
    reemplazaProyectoEquipoItemId: undefined,
    proveedorId: undefined,
    cotizacionSeleccionadaId: undefined,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lista: {
      id: 'lista1',
      proyectoId: 'proyecto-1',
      codigo: 'LST-001',
      nombre: 'Lista Test',
      numeroSecuencia: 1,
      estado: 'por_cotizar',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      items: []
    },
    cotizaciones: [],
    pedidos: [],
    cotizacionSeleccionada: undefined
  }
]

const mockProps = {
  open: true,
  onClose: jest.fn(),
  pedidoId: 'pedido1',
  responsableId: 'user1',
  items: mockItems,
  onCreateItem: jest.fn().mockResolvedValue(undefined)
}

describe('PedidoEquipoItemModalAgregar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render modal with correct title', () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    expect(screen.getByText('Agregar ítems al pedido')).toBeInTheDocument()
  })

  it('should display delivery time column instead of price column', () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    // Check that "Tiempo Entrega" header is present
    expect(screen.getByText('Tiempo Entrega')).toBeInTheDocument()
    
    // Check that "Precio Unit." header is not present
    expect(screen.queryByText('Precio Unit.')).not.toBeInTheDocument()
  })

  it('should display correct delivery time values', () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    // Check delivery time values - now showing quotation delivery time when available
    expect(screen.getByText('1 semana')).toBeInTheDocument() // First item (from quotation)
    expect(screen.getByText('2 semanas')).toBeInTheDocument() // Second item (base time)
    expect(screen.getByText('No especificado')).toBeInTheDocument() // Third item
  })

  it('should allow selecting items and setting quantities', async () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    // Select first item
    const firstCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(firstCheckbox)
    
    // Check that quantity input appears
    const quantityInput = screen.getByDisplayValue('1')
    expect(quantityInput).toBeInTheDocument()
    
    // Change quantity
    fireEvent.change(quantityInput, { target: { value: '3' } })
    expect(quantityInput).toHaveValue(3)
  })

  it('should call onCreateItem when adding selected items', async () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    // Select first item
    const firstCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(firstCheckbox)
    
    // Set quantity
    const quantityInput = screen.getByDisplayValue('1')
    fireEvent.change(quantityInput, { target: { value: '2' } })
    
    // Click add button
    const addButton = screen.getByText('Agregar ítems seleccionados')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(mockProps.onCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          pedidoId: 'pedido1',
          responsableId: 'user1',
          listaEquipoItemId: '1',
          codigo: 'CPU001',
          descripcion: 'CPU Intel Core i7',
          unidad: 'pieza',
          cantidadPedida: 2
        })
      )
    })
  })

  it('should disable items with no remaining quantity', () => {
    const itemsWithNoStock = [
      {
        ...mockItems[0],
        cantidad: 2,
        cantidadPedida: 2 // Same as cantidad, so restante = 0
      }
    ]
    
    render(
      <PedidoEquipoItemModalAgregar 
        {...mockProps} 
        items={itemsWithNoStock}
      />
    )
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('should display delivery time from selected quotation when available', () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    // CPU001 should show quotation delivery time ("1 semana") instead of base time ("stock")
    const rows = screen.getAllByRole('row')
    const cpu001Row = rows.find(row => row.textContent?.includes('CPU001'))
    expect(cpu001Row).toHaveTextContent('1 semana')
    expect(cpu001Row).not.toHaveTextContent('stock')
    
    // RAM001 should show base delivery time ("2 semanas") since no quotation selected
    const ram001Row = rows.find(row => row.textContent?.includes('RAM001'))
    expect(ram001Row).toHaveTextContent('2 semanas')
    
    // HDD001 should show "No especificado" since no delivery time defined
    const hdd001Row = rows.find(row => row.textContent?.includes('HDD001'))
    expect(hdd001Row).toHaveTextContent('No especificado')
  })

  it('should close modal when cancel button is clicked', () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('should disable add button when no items are selected', () => {
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)
    
    const addButton = screen.getByText('Agregar ítems seleccionados')
    expect(addButton).toBeDisabled()
  })
})