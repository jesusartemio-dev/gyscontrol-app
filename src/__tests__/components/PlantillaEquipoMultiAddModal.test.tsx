/**
 * 🧪 Tests for PlantillaEquipoMultiAddModal - Dynamic filtering functionality
 * 
 * Tests the dynamic filtering between categories and brands:
 * - Brand filtering based on selected category
 * - Category filtering based on selected brand
 * - Cross-filtering behavior and reset logic
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import PlantillaEquipoMultiAddModal from '@/components/plantillas/equipos/PlantillaEquipoMultiAddModal'
import * as catalogoEquipoService from '@/lib/services/catalogoEquipo'
import * as categoriaEquipoService from '@/lib/services/categoriaEquipo'
import * as plantillaEquipoItemService from '@/lib/services/plantillaEquipoItem'
import type { CatalogoEquipo, CategoriaEquipo } from '@/types'

// 🔧 Mock dependencies
jest.mock('sonner')
jest.mock('@/lib/services/catalogoEquipo')
jest.mock('@/lib/services/categoriaEquipo')
jest.mock('@/lib/services/plantillaEquipoItem')

const mockGetCatalogoEquipos = catalogoEquipoService.getCatalogoEquipos as jest.MockedFunction<typeof catalogoEquipoService.getCatalogoEquipos>
const mockGetCategoriasEquipo = categoriaEquipoService.getCategoriasEquipo as jest.MockedFunction<typeof categoriaEquipoService.getCategoriasEquipo>
const mockCreatePlantillaEquipoItem = plantillaEquipoItemService.createPlantillaEquipoItem as jest.MockedFunction<typeof plantillaEquipoItemService.createPlantillaEquipoItem>
const mockToast = toast as jest.Mocked<typeof toast>

// 📋 Mock data
const mockCategorias: CategoriaEquipo[] = [
  { id: 'cat1', nombre: 'Drives', descripcion: 'Variable frequency drives' },
  { id: 'cat2', nombre: 'Motors', descripcion: 'Electric motors' },
  { id: 'cat3', nombre: 'Sensors', descripcion: 'Industrial sensors' }
]

const mockEquipos: CatalogoEquipo[] = [
  {
    id: 'eq1',
    codigo: 'DRV001',
    descripcion: 'Allen-Bradley PowerFlex 525',
    marca: 'Allen-Bradley',
    categoriaId: 'cat1',
    precioVenta: 1500,
    precioInterno: 1200
  },
  {
    id: 'eq2',
    codigo: 'DRV002',
    descripcion: 'Siemens SINAMICS G120',
    marca: 'Siemens',
    categoriaId: 'cat1',
    precioVenta: 1800,
    precioInterno: 1400
  },
  {
    id: 'eq3',
    codigo: 'MOT001',
    descripcion: 'ABB M3BP Motor',
    marca: 'ABB',
    categoriaId: 'cat2',
    precioVenta: 800,
    precioInterno: 600
  },
  {
    id: 'eq4',
    codigo: 'SEN001',
    descripcion: 'Siemens Proximity Sensor',
    marca: 'Siemens',
    categoriaId: 'cat3',
    precioVenta: 150,
    precioInterno: 100
  }
]

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  plantillaEquipoId: 'test-plantilla-id',
  onItemsCreated: jest.fn()
}

describe('PlantillaEquipoMultiAddModal - Dynamic Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCatalogoEquipos.mockResolvedValue(mockEquipos)
    mockGetCategoriasEquipo.mockResolvedValue(mockCategorias)
    mockCreatePlantillaEquipoItem.mockResolvedValue({
      id: 'item1',
      plantillaEquipoId: 'plantilla1',
      catalogoEquipoId: 'eq1',
      cantidad: 1,
      precioUnitario: 1500,
      observaciones: ''
    } as any)
  })

  // ✅ Test 1: Initial state shows all categories and brands
  it('should show all categories and brands initially', async () => {
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Drives')).toBeInTheDocument()
      expect(screen.getByText('Motors')).toBeInTheDocument()
      expect(screen.getByText('Sensors')).toBeInTheDocument()
    })

    // Click on brand selector to see options
    const brandSelect = screen.getByDisplayValue('Marcas')
    fireEvent.click(brandSelect)

    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley')).toBeInTheDocument()
      expect(screen.getByText('Siemens')).toBeInTheDocument()
      expect(screen.getByText('ABB')).toBeInTheDocument()
    })
  })

  // ✅ Test 2: Selecting category filters available brands
  it('should filter brands when category is selected', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Drives')).toBeInTheDocument()
    })

    // Select "Drives" category
    const categorySelect = screen.getByDisplayValue('Categorías')
    await user.click(categorySelect)
    await user.click(screen.getByText('Drives'))

    // Check that only brands from Drives category are available
    const brandSelect = screen.getByDisplayValue('Marcas')
    await user.click(brandSelect)

    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley')).toBeInTheDocument()
      expect(screen.getByText('Siemens')).toBeInTheDocument()
      // ABB should not be available as it's only in Motors category
      expect(screen.queryByText('ABB')).not.toBeInTheDocument()
    })
  })

  // ✅ Test 3: Selecting brand filters available categories
  it('should filter categories when brand is selected', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley')).toBeInTheDocument()
    })

    // Select "Siemens" brand
    const brandSelect = screen.getByDisplayValue('Marcas')
    await user.click(brandSelect)
    await user.click(screen.getByText('Siemens'))

    // Check that only categories with Siemens products are available
    const categorySelect = screen.getByDisplayValue('Categorías')
    await user.click(categorySelect)

    await waitFor(() => {
      expect(screen.getByText('Drives')).toBeInTheDocument()
      expect(screen.getByText('Sensors')).toBeInTheDocument()
      // Motors should not be available as Siemens has no motors in our mock data
      expect(screen.queryByText('Motors')).not.toBeInTheDocument()
    })
  })

  // ✅ Test 4: Cross-filtering resets incompatible selections
  it('should reset brand when selected category has no products from that brand', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('ABB')).toBeInTheDocument()
    })

    // First select ABB brand (only available in Motors)
    const brandSelect = screen.getByDisplayValue('Marcas')
    await user.click(brandSelect)
    await user.click(screen.getByText('ABB'))

    // Then select Drives category (which has no ABB products)
    const categorySelect = screen.getByDisplayValue('Categorías')
    await user.click(categorySelect)
    await user.click(screen.getByText('Drives'))

    // Brand filter should reset to 'todas'
    await waitFor(() => {
      expect(screen.getByDisplayValue('Marcas')).toBeInTheDocument()
    })
  })

  // ✅ Test 5: Equipment list updates based on filters
  it('should filter equipment list based on category and brand selection', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley PowerFlex 525')).toBeInTheDocument()
      expect(screen.getByText('Siemens SINAMICS G120')).toBeInTheDocument()
      expect(screen.getByText('ABB M3BP Motor')).toBeInTheDocument()
      expect(screen.getByText('Siemens Proximity Sensor')).toBeInTheDocument()
    })

    // Select Drives category
    const categorySelect = screen.getByDisplayValue('Categorías')
    await user.click(categorySelect)
    await user.click(screen.getByText('Drives'))

    // Only drives should be visible
    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley PowerFlex 525')).toBeInTheDocument()
      expect(screen.getByText('Siemens SINAMICS G120')).toBeInTheDocument()
      expect(screen.queryByText('ABB M3BP Motor')).not.toBeInTheDocument()
      expect(screen.queryByText('Siemens Proximity Sensor')).not.toBeInTheDocument()
    })

    // Now select Allen-Bradley brand
    const brandSelect = screen.getByDisplayValue('Marcas')
    await user.click(brandSelect)
    await user.click(screen.getByText('Allen-Bradley'))

    // Only Allen-Bradley drives should be visible
    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley PowerFlex 525')).toBeInTheDocument()
      expect(screen.queryByText('Siemens SINAMICS G120')).not.toBeInTheDocument()
    })
  })

  // ✅ Test 6: Reset to 'todas' shows all options again
  it('should show all options when filters are reset to todas', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Drives')).toBeInTheDocument()
    })

    // Select a category first
    const categorySelect = screen.getByDisplayValue('Categorías')
    await user.click(categorySelect)
    await user.click(screen.getByText('Drives'))

    // Reset to 'todas'
    await user.click(categorySelect)
    await user.click(screen.getByText('Categorías'))

    // All equipment should be visible again
    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley PowerFlex 525')).toBeInTheDocument()
      expect(screen.getByText('Siemens SINAMICS G120')).toBeInTheDocument()
      expect(screen.getByText('ABB M3BP Motor')).toBeInTheDocument()
      expect(screen.getByText('Siemens Proximity Sensor')).toBeInTheDocument()
    })
  })
})