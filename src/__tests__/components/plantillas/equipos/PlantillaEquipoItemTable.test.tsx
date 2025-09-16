// ===================================================
// 📁 Archivo: PlantillaEquipoItemTable.test.tsx
// 📌 Ubicación: src/components/plantillas/equipos/
// 🔧 Descripción: Tests para PlantillaEquipoItemTable
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlantillaEquipoItemTable from '@/components/plantillas/equipos/PlantillaEquipoItemTable'
import type { PlantillaEquipoItem } from '@/types'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    warning: jest.fn()
  }
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Save: () => <div data-testid="save-icon">Save</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Pencil: () => <div data-testid="pencil-icon">Pencil</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>
}))

const mockItems: PlantillaEquipoItem[] = [
  {
    id: '1',
    codigo: 'IC695CPU310',
    descripcion: 'CPU GE RX3i',
    unidad: 'pieza',
    cantidad: 1,
    precioInterno: 3000,
    precioCliente: 3750,
    costoInterno: 3000,
    costoCliente: 3750,
    plantillaEquipoId: 'equipo1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    codigo: 'IC695ETM001',
    descripcion: 'Módulo Ethernet GE RX3i',
    unidad: 'pieza',
    cantidad: 2,
    precioInterno: 600,
    precioCliente: 750,
    costoInterno: 1200,
    costoCliente: 1500,
    plantillaEquipoId: 'equipo1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('PlantillaEquipoItemTable', () => {
  const mockOnUpdated = jest.fn()
  const mockOnDeleted = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders table with items correctly', () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    // Check headers
    expect(screen.getByText('Código')).toBeInTheDocument()
    expect(screen.getByText('Descripción')).toBeInTheDocument()
    expect(screen.getByText('Cantidad')).toBeInTheDocument()
    expect(screen.getByText('Unidad')).toBeInTheDocument()
    expect(screen.getByText('P. Interno (USD)')).toBeInTheDocument()
    expect(screen.getByText('P. Cliente (USD)')).toBeInTheDocument()
    expect(screen.getByText('Costo Interno')).toBeInTheDocument()
    expect(screen.getByText('Costo Cliente')).toBeInTheDocument()
    expect(screen.getByText('% Margen')).toBeInTheDocument()
    expect(screen.getByText('Acción')).toBeInTheDocument()

    // Check items
    expect(screen.getByText('IC695CPU310')).toBeInTheDocument()
    expect(screen.getByText('CPU GE RX3i')).toBeInTheDocument()
    expect(screen.getByText('IC695ETM001')).toBeInTheDocument()
    expect(screen.getByText('Módulo Ethernet GE RX3i')).toBeInTheDocument()
  })

  it('displays totals correctly', () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    expect(screen.getByText('USD 4200.00')).toBeInTheDocument() // Total interno
    expect(screen.getByText('USD 5250.00')).toBeInTheDocument() // Total cliente
  })

  it('calculates margin correctly', () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    // First item: (3750 - 3000) / 3000 * 100 = 25%
    const marginCells = screen.getAllByText('25.0%')
    expect(marginCells.length).toBeGreaterThan(0)
  })

  it('filters items by code and description', () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    const filterInput = screen.getByPlaceholderText('Filtrar por código o descripción...')
    
    // Filter by code
    fireEvent.change(filterInput, { target: { value: 'IC695CPU' } })
    expect(screen.getByText('IC695CPU310')).toBeInTheDocument()
    expect(screen.queryByText('IC695ETM001')).not.toBeInTheDocument()

    // Filter by description
    fireEvent.change(filterInput, { target: { value: 'Ethernet' } })
    expect(screen.queryByText('IC695CPU310')).not.toBeInTheDocument()
    expect(screen.getByText('IC695ETM001')).toBeInTheDocument()
  })

  it('enters edit mode when pencil button is clicked', () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    const pencilButton = screen.getAllByTestId('pencil-icon')[0].closest('button')
    
    fireEvent.click(pencilButton!)
    
    // Should show input field and save/cancel buttons
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    expect(screen.getByTestId('save-icon')).toBeInTheDocument()
  })

  it('saves changes when save button is clicked', async () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    const pencilButton = screen.getAllByTestId('pencil-icon')[0].closest('button')
    
    fireEvent.click(pencilButton!)
    
    const quantityInput = screen.getByDisplayValue('1')
    fireEvent.change(quantityInput, { target: { value: '3' } })
    
    const saveButton = screen.getByTestId('save-icon').closest('button')
    fireEvent.click(saveButton!)
    
    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalledWith({
        ...mockItems[0],
        cantidad: 3,
        costoInterno: 9000, // 3 * 3000
        costoCliente: 11250 // 3 * 3750
      })
    })
  })

  it('shows warning when trying to save with zero quantity', async () => {
    const { toast } = require('sonner')
    
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    const pencilButton = screen.getAllByTestId('pencil-icon')[0].closest('button')
    
    fireEvent.click(pencilButton!)

    const quantityInput = screen.getByDisplayValue('1')
    fireEvent.change(quantityInput, { target: { value: '0' } })
    
    const saveButton = screen.getByTestId('save-icon').closest('button')
    fireEvent.click(saveButton!)
    
    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith('Cantidad debe ser mayor que cero.')
      expect(mockOnUpdated).not.toHaveBeenCalled()
    })
  })

  it('calls onDeleted when delete button is clicked', () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    const trashButton = screen.getAllByTestId('trash-icon')[0].closest('button')
    
    fireEvent.click(trashButton!)
    
    expect(mockOnDeleted).toHaveBeenCalledWith('1')
  })

  it('cancels edit mode when X button is clicked', () => {
    render(
      <PlantillaEquipoItemTable
        items={mockItems}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />
    )

    const pencilButton = screen.getAllByTestId('pencil-icon')[0].closest('button')
    
    fireEvent.click(pencilButton!)

    const cancelButton = screen.getByTestId('x-icon').closest('button')
    fireEvent.click(cancelButton!)
    
    // Should exit edit mode
    expect(screen.queryByDisplayValue('1')).not.toBeInTheDocument()
  })
})