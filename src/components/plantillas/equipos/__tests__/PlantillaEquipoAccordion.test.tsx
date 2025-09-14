// ===================================================
// 📁 Archivo: PlantillaEquipoAccordion.test.tsx
// 📌 Ubicación: src/components/plantillas/equipos/__tests__/
// 🔧 Descripción: Tests para PlantillaEquipoAccordion con funcionalidad multi-add
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-08
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlantillaEquipoAccordion from '../PlantillaEquipoAccordion'
import type { PlantillaEquipo, PlantillaEquipoItem } from '@/types'

// 🔧 Mock dependencies
jest.mock('../PlantillaEquipoItemTable', () => {
  return function MockPlantillaEquipoItemTable({ equipo, onItemChange }: any) {
    return (
      <div data-testid="item-table">
        <p>Items: {equipo.items.length}</p>
        <button onClick={() => onItemChange([...equipo.items, { id: 'new-item' }])}>
          Add Item
        </button>
      </div>
    )
  }
})

jest.mock('../PlantillaEquipoMultiAddModal', () => {
  return function MockPlantillaEquipoMultiAddModal({ isOpen, onClose, onItemsCreated }: any) {
    if (!isOpen) return null
    
    const mockItems = [
      { id: 'multi-item-1', nombre: 'Item 1' },
      { id: 'multi-item-2', nombre: 'Item 2' }
    ]
    
    return (
      <div data-testid="multi-add-modal">
        <h2>Multi Add Modal</h2>
        <button onClick={() => onItemsCreated(mockItems)}>Add Multiple Items</button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  }
})

const mockEquipo: PlantillaEquipo = {
  id: 'equipo-1',
  plantillaId: 'plantilla-1',
  nombre: 'Grupo Test',
  descripcion: 'Descripción del grupo test',
  orden: 1,
  subtotalInterno: 1000,
  subtotalCliente: 1500,
  items: [
    {
      id: 'item-1',
      plantillaEquipoId: 'equipo-1',
      catalogoEquipoId: 'catalogo-1',
      codigo: 'EQ001',
      nombre: 'Equipo Existente',
      descripcion: 'Descripción',
      marca: 'Marca',
      unidad: 'Unidad',
      categoria: 'Categoría',
      cantidad: 1,
      precioInterno: 100,
      precioVenta: 150,
      costoInterno: 100,
      costoCliente: 150,
      observaciones: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

const defaultProps = {
  equipo: mockEquipo,
  onItemChange: jest.fn(),
  onUpdatedNombre: jest.fn(),
  onDeletedGrupo: jest.fn(),
  onChange: jest.fn()
}

describe('PlantillaEquipoAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render accordion with equipment info', () => {
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    expect(screen.getByText('Grupo Test')).toBeInTheDocument()
    expect(screen.getByText('Cliente: $ 1500.00 | Interno: $ 1000.00')).toBeInTheDocument()
  })

  it('should show description when provided', () => {
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // ✅ Expand accordion to see content
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    fireEvent.click(trigger)
    
    expect(screen.getByText('Descripción del grupo test')).toBeInTheDocument()
  })

  it('should render "Agregar Items" button when accordion is expanded', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // ✅ Expand accordion
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    await user.click(trigger)
    
    expect(screen.getByText('Agregar Items')).toBeInTheDocument()
  })

  it('should open multi-add modal when "Agregar Items" button is clicked', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // ✅ Expand accordion
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    await user.click(trigger)
    
    // ✅ Click "Agregar Items" button
    const addItemsButton = screen.getByText('Agregar Items')
    await user.click(addItemsButton)
    
    expect(screen.getByTestId('multi-add-modal')).toBeInTheDocument()
    expect(screen.getByText('Multi Add Modal')).toBeInTheDocument()
  })

  it('should close multi-add modal when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // ✅ Open modal
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    await user.click(trigger)
    
    const addItemsButton = screen.getByText('Agregar Items')
    await user.click(addItemsButton)
    
    // ✅ Close modal
    const closeButton = screen.getByText('Close Modal')
    await user.click(closeButton)
    
    expect(screen.queryByTestId('multi-add-modal')).not.toBeInTheDocument()
  })

  it('should handle multiple items creation from modal', async () => {
    const user = userEvent.setup()
    const onItemChange = jest.fn()
    
    render(
      <PlantillaEquipoAccordion 
        {...defaultProps} 
        onItemChange={onItemChange}
      />
    )
    
    // ✅ Open modal
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    await user.click(trigger)
    
    const addItemsButton = screen.getByText('Agregar Items')
    await user.click(addItemsButton)
    
    // ✅ Add multiple items
    const addMultipleButton = screen.getByText('Add Multiple Items')
    await user.click(addMultipleButton)
    
    // ✅ Verify onItemChange is called with existing + new items
    expect(onItemChange).toHaveBeenCalledWith([
      mockEquipo.items[0], // existing item
      { id: 'multi-item-1', nombre: 'Item 1' },
      { id: 'multi-item-2', nombre: 'Item 2' }
    ])
  })

  it('should render item table component', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // ✅ Expand accordion
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    await user.click(trigger)
    
    expect(screen.getByTestId('item-table')).toBeInTheDocument()
    expect(screen.getByText('Items: 1')).toBeInTheDocument()
  })

  it('should pass correct props to item table', async () => {
    const user = userEvent.setup()
    const onItemChange = jest.fn()
    
    render(
      <PlantillaEquipoAccordion 
        {...defaultProps} 
        onItemChange={onItemChange}
      />
    )
    
    // ✅ Expand accordion
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    await user.click(trigger)
    
    // ✅ Test that item table receives correct props
    const addItemButton = screen.getByText('Add Item')
    await user.click(addItemButton)
    
    expect(onItemChange).toHaveBeenCalled()
  })

  it('should not show description when not provided', async () => {
    const user = userEvent.setup()
    const equipoSinDescripcion = { ...mockEquipo, descripcion: undefined }
    
    render(
      <PlantillaEquipoAccordion 
        {...defaultProps} 
        equipo={equipoSinDescripcion}
      />
    )
    
    // ✅ Expand accordion
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    await user.click(trigger)
    
    expect(screen.queryByText('Descripción del grupo test')).not.toBeInTheDocument()
  })

  it('should handle accordion expand/collapse correctly', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    const trigger = screen.getByRole('button', { name: /grupo test/i })
    
    // ✅ Initially collapsed - content should not be visible
    expect(screen.queryByText('Agregar Items')).not.toBeInTheDocument()
    
    // ✅ Expand
    await user.click(trigger)
    expect(screen.getByText('Agregar Items')).toBeInTheDocument()
    
    // ✅ Collapse
    await user.click(trigger)
    expect(screen.queryByText('Agregar Items')).not.toBeInTheDocument()
  })

  it('should display correct financial information in header', () => {
    const equipoConDinero = {
      ...mockEquipo,
      subtotalInterno: 2500.75,
      subtotalCliente: 3750.50
    }
    
    render(
      <PlantillaEquipoAccordion 
        {...defaultProps} 
        equipo={equipoConDinero}
      />
    )
    
    expect(screen.getByText('Cliente: $ 3750.50 | Interno: $ 2500.75')).toBeInTheDocument()
  })
})