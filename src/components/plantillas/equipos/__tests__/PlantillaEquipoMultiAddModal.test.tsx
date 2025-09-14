// ===================================================
// 📁 Archivo: PlantillaEquipoMultiAddModal.test.tsx
// 📌 Ubicación: src/components/plantillas/equipos/__tests__/
// 🔧 Descripción: Tests para PlantillaEquipoMultiAddModal
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-08
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlantillaEquipoMultiAddModal from '../PlantillaEquipoMultiAddModal'
import { createPlantillaEquipoItem } from '@/lib/services/plantillaEquipoItem'
import type { CatalogoEquipo, PlantillaEquipoItem } from '@/types'

// 🔧 Mock dependencies
jest.mock('@/lib/services/plantillaEquipoItem')
jest.mock('@/components/catalogo/EquipoCatalogoModal', () => {
  return function MockEquipoCatalogoModal({ isOpen, onClose, onSelect }: any) {
    if (!isOpen) return null
    
    const mockEquipo: CatalogoEquipo = {
      id: 'equipo-1',
      codigo: 'EQ001',
      nombre: 'Equipo Test',
      descripcion: 'Descripción del equipo test',
      marca: 'Marca Test',
      precioInterno: 100,
      precioVenta: 150,
      categoria: { id: 'cat-1', nombre: 'Categoría Test' },
      unidad: { id: 'unidad-1', nombre: 'Unidad Test' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    return (
      <div data-testid="catalogo-modal">
        <button onClick={() => onSelect(mockEquipo)}>Seleccionar Equipo</button>
        <button onClick={onClose}>Cerrar</button>
      </div>
    )
  }
})

const mockCreatePlantillaEquipoItem = createPlantillaEquipoItem as jest.MockedFunction<typeof createPlantillaEquipoItem>

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  plantillaEquipoId: 'plantilla-1',
  onItemsCreated: jest.fn()
}

const mockCreatedItem: PlantillaEquipoItem = {
  id: 'item-1',
  plantillaEquipoId: 'plantilla-1',
  catalogoEquipoId: 'equipo-1',
  codigo: 'EQ001',
  nombre: 'Equipo Test',
  descripcion: 'Descripción del equipo test',
  marca: 'Marca Test',
  unidad: 'Unidad Test',
  categoria: 'Categoría Test',
  cantidad: 1,
  precioInterno: 100,
  precioVenta: 150,
  costoInterno: 100,
  costoCliente: 150,
  observaciones: 'Marca Test - Descripción del equipo test',
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('PlantillaEquipoMultiAddModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreatePlantillaEquipoItem.mockResolvedValue(mockCreatedItem)
  })

  it('should render modal when open', () => {
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    expect(screen.getByText('Agregar Múltiples Equipos')).toBeInTheDocument()
    expect(screen.getByText('Buscar Equipo del Catálogo')).toBeInTheDocument()
    expect(screen.getByText('No hay equipos seleccionados')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Agregar Múltiples Equipos')).not.toBeInTheDocument()
  })

  it('should open catalog modal when search button is clicked', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    
    expect(screen.getByTestId('catalogo-modal')).toBeInTheDocument()
  })

  it('should add equipment to temporary list when selected', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Open catalog modal
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    
    // ✅ Select equipment
    const selectButton = screen.getByText('Seleccionar Equipo')
    await user.click(selectButton)
    
    // ✅ Verify equipment is added to table
    expect(screen.getByText('EQ001')).toBeInTheDocument()
    expect(screen.getByText('Equipo Test')).toBeInTheDocument()
    expect(screen.getByText('Marca Test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument() // quantity input
  })

  it('should increment quantity when same equipment is selected twice', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment twice
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    
    // First selection
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // Second selection
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // ✅ Verify quantity is 2
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  it('should update quantity when input is changed', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // ✅ Change quantity
    const quantityInput = screen.getByDisplayValue('1')
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
  })

  it('should remove item when quantity is set to 0', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // ✅ Set quantity to 0
    const quantityInput = screen.getByDisplayValue('1')
    await user.clear(quantityInput)
    await user.type(quantityInput, '0')
    
    // ✅ Verify item is removed
    expect(screen.queryByText('EQ001')).not.toBeInTheDocument()
    expect(screen.getByText('No hay equipos seleccionados')).toBeInTheDocument()
  })

  it('should remove item when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // ✅ Click delete button
    const deleteButton = screen.getByRole('button', { name: /trash/i })
    await user.click(deleteButton)
    
    // ✅ Verify item is removed
    expect(screen.queryByText('EQ001')).not.toBeInTheDocument()
    expect(screen.getByText('No hay equipos seleccionados')).toBeInTheDocument()
  })

  it('should show error when quantity exceeds 1000', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // ✅ Set quantity over 1000
    const quantityInput = screen.getByDisplayValue('1')
    await user.clear(quantityInput)
    await user.type(quantityInput, '1001')
    
    expect(screen.getByText('La cantidad no puede ser mayor a 1000')).toBeInTheDocument()
  })

  it('should calculate totals correctly', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment with quantity 2
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    const quantityInput = screen.getByDisplayValue('1')
    await user.clear(quantityInput)
    await user.type(quantityInput, '2')
    
    // ✅ Verify totals (2 * 100 = 200 interno, 2 * 150 = 300 cliente)
    expect(screen.getByText('Total Interno:')).toBeInTheDocument()
    expect(screen.getByText('$200.00')).toBeInTheDocument()
    expect(screen.getByText('Total Cliente:')).toBeInTheDocument()
    expect(screen.getByText('$300.00')).toBeInTheDocument()
  })

  it('should save all items when save button is clicked', async () => {
    const user = userEvent.setup()
    const onItemsCreated = jest.fn()
    
    render(
      <PlantillaEquipoMultiAddModal 
        {...defaultProps} 
        onItemsCreated={onItemsCreated}
      />
    )
    
    // ✅ Add equipment
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // ✅ Click save button
    const saveButton = screen.getByText('Agregar 1 Equipo')
    await user.click(saveButton)
    
    // ✅ Verify service is called
    await waitFor(() => {
      expect(mockCreatePlantillaEquipoItem).toHaveBeenCalledWith({
        plantillaEquipoId: 'plantilla-1',
        catalogoEquipoId: 'equipo-1',
        cantidad: 1,
        observaciones: 'Marca Test - Descripción del equipo test'
      })
    })
    
    // ✅ Verify callback is called
    await waitFor(() => {
      expect(onItemsCreated).toHaveBeenCalledWith([mockCreatedItem])
    })
  })

  it('should show error when save fails', async () => {
    const user = userEvent.setup()
    mockCreatePlantillaEquipoItem.mockRejectedValue(new Error('Error de prueba'))
    
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    // ✅ Click save button
    const saveButton = screen.getByText('Agregar 1 Equipo')
    await user.click(saveButton)
    
    // ✅ Verify error is shown
    await waitFor(() => {
      expect(screen.getByText('Error de prueba')).toBeInTheDocument()
    })
  })

  it('should show error when trying to save without items', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Try to save without adding items
    const saveButton = screen.getByRole('button', { name: /agregar.*equipo/i })
    expect(saveButton).toBeDisabled()
  })

  it('should close modal when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    
    render(<PlantillaEquipoMultiAddModal {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByText('Cancelar')
    await user.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('should reset state when modal is closed and reopened', async () => {
    const { rerender } = render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    
    // ✅ Add equipment
    const user = userEvent.setup()
    const searchButton = screen.getByText('Buscar Equipo del Catálogo')
    await user.click(searchButton)
    await user.click(screen.getByText('Seleccionar Equipo'))
    
    expect(screen.getByText('EQ001')).toBeInTheDocument()
    
    // ✅ Close modal
    rerender(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={false} />)
    
    // ✅ Reopen modal
    rerender(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={true} />)
    
    // ✅ Verify state is reset
    expect(screen.queryByText('EQ001')).not.toBeInTheDocument()
    expect(screen.getByText('No hay equipos seleccionados')).toBeInTheDocument()
  })
})