/**
 * @file CotizacionEquipoMultiAddModal.test.tsx
 * @description Tests for CotizacionEquipoMultiAddModal component with dynamic filtering functionality
 * @author GYS Team
 * @date 2024
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CotizacionEquipoMultiAddModal from '@/components/cotizaciones/CotizacionEquipoMultiAddModal'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { createCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'
import type { CatalogoEquipo, CategoriaEquipo } from '@/types'

// ✅ Mock external dependencies
jest.mock('@/lib/services/catalogoEquipo')
jest.mock('@/lib/services/categoriaEquipo')
jest.mock('@/lib/services/cotizacionEquipoItem')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

const mockGetCatalogoEquipos = getCatalogoEquipos as jest.MockedFunction<typeof getCatalogoEquipos>
const mockGetCategoriasEquipo = getCategoriasEquipo as jest.MockedFunction<typeof getCategoriasEquipo>
const mockCreateCotizacionEquipoItem = createCotizacionEquipoItem as jest.MockedFunction<typeof createCotizacionEquipoItem>

// ✅ Mock data
const mockCategorias: CategoriaEquipo[] = [
  { id: 'cat-1', nombre: 'Drives', descripcion: 'Variadores de frecuencia' },
  { id: 'cat-2', nombre: 'Sensores', descripcion: 'Sensores industriales' },
  { id: 'cat-3', nombre: 'Actuadores', descripcion: 'Actuadores eléctricos' }
]

const mockEquipos: CatalogoEquipo[] = [
  {
    id: 'eq-1',
    codigo: 'DRV001',
    descripcion: 'Variador Allen-Bradley PowerFlex',
    marca: 'Allen-Bradley',
    categoriaId: 'cat-1',
    precioVenta: 1500,
    precioInterno: 1200
  },
  {
    id: 'eq-2', 
    codigo: 'DRV002',
    descripcion: 'Variador Siemens SINAMICS',
    marca: 'Siemens',
    categoriaId: 'cat-1',
    precioVenta: 1800,
    precioInterno: 1400
  },
  {
    id: 'eq-3',
    codigo: 'SEN001', 
    descripcion: 'Sensor Allen-Bradley PhotoEye',
    marca: 'Allen-Bradley',
    categoriaId: 'cat-2',
    precioVenta: 250,
    precioInterno: 200
  },
  {
    id: 'eq-4',
    codigo: 'ACT001',
    descripcion: 'Actuador Schneider Electric',
    marca: 'Schneider',
    categoriaId: 'cat-3', 
    precioVenta: 800,
    precioInterno: 650
  }
]

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  cotizacionEquipoId: 'test-cotizacion-id',
  onItemsCreated: jest.fn()
}

describe('CotizacionEquipoMultiAddModal - Dynamic Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCatalogoEquipos.mockResolvedValue(mockEquipos)
    mockGetCategoriasEquipo.mockResolvedValue(mockCategorias)
  })

  it('should render modal with all equipos initially', async () => {
    render(<CotizacionEquipoMultiAddModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Agregar Múltiples Equipos')).toBeInTheDocument()
    })
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Variador Allen-Bradley PowerFlex')).toBeInTheDocument()
      expect(screen.getByText('Variador Siemens SINAMICS')).toBeInTheDocument()
      expect(screen.getByText('Sensor Allen-Bradley PhotoEye')).toBeInTheDocument()
      expect(screen.getByText('Actuador Schneider Electric')).toBeInTheDocument()
    })
  })

  it('should filter brands dynamically when category is selected', async () => {
    render(<CotizacionEquipoMultiAddModal {...defaultProps} />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Variador Allen-Bradley PowerFlex')).toBeInTheDocument()
    })
    
    // Select "Drives" category
    const categorySelect = screen.getByDisplayValue('Categorías')
    fireEvent.click(categorySelect)
    
    await waitFor(() => {
      const drivesOption = screen.getByText('Drives')
      fireEvent.click(drivesOption)
    })
    
    // Check that only Allen-Bradley and Siemens brands are available (both have drives)
    const brandSelect = screen.getByDisplayValue('Marcas')
    fireEvent.click(brandSelect)
    
    await waitFor(() => {
      expect(screen.getByText('Allen-Bradley')).toBeInTheDocument()
      expect(screen.getByText('Siemens')).toBeInTheDocument()
      // Schneider should not be available as it doesn't have drives
      expect(screen.queryByText('Schneider')).not.toBeInTheDocument()
    })
  })

  it('should filter categories dynamically when brand is selected', async () => {
    render(<CotizacionEquipoMultiAddModal {...defaultProps} />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Variador Allen-Bradley PowerFlex')).toBeInTheDocument()
    })
    
    // Select "Allen-Bradley" brand
    const brandSelect = screen.getByDisplayValue('Marcas')
    fireEvent.click(brandSelect)
    
    await waitFor(() => {
      const allenBradleyOption = screen.getByText('Allen-Bradley')
      fireEvent.click(allenBradleyOption)
    })
    
    // Check that only Drives and Sensores categories are available (Allen-Bradley has both)
    const categorySelect = screen.getByDisplayValue('Categorías')
    fireEvent.click(categorySelect)
    
    await waitFor(() => {
      expect(screen.getByText('Drives')).toBeInTheDocument()
      expect(screen.getByText('Sensores')).toBeInTheDocument()
      // Actuadores should not be available as Allen-Bradley doesn't have actuators
      expect(screen.queryByText('Actuadores')).not.toBeInTheDocument()
    })
  })

  it('should reset brand filter when selecting incompatible category', async () => {
    render(<CotizacionEquipoMultiAddModal {...defaultProps} />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Variador Allen-Bradley PowerFlex')).toBeInTheDocument()
    })
    
    // First select Schneider brand
    const brandSelect = screen.getByDisplayValue('Marcas')
    fireEvent.click(brandSelect)
    
    await waitFor(() => {
      const schneiderOption = screen.getByText('Schneider')
      fireEvent.click(schneiderOption)
    })
    
    // Then select Drives category (Schneider doesn't have drives)
    const categorySelect = screen.getByDisplayValue('Categorías')
    fireEvent.click(categorySelect)
    
    await waitFor(() => {
      const drivesOption = screen.getByText('Drives')
      fireEvent.click(drivesOption)
    })
    
    // Brand filter should reset to "todas"
    await waitFor(() => {
      expect(screen.getByDisplayValue('Marcas')).toBeInTheDocument()
    })
  })

  it('should reset category filter when selecting incompatible brand', async () => {
    render(<CotizacionEquipoMultiAddModal {...defaultProps} />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Variador Allen-Bradley PowerFlex')).toBeInTheDocument()
    })
    
    // First select Actuadores category
    const categorySelect = screen.getByDisplayValue('Categorías')
    fireEvent.click(categorySelect)
    
    await waitFor(() => {
      const actuadoresOption = screen.getByText('Actuadores')
      fireEvent.click(actuadoresOption)
    })
    
    // Then select Allen-Bradley brand (doesn't have actuators)
    const brandSelect = screen.getByDisplayValue('Marcas')
    fireEvent.click(brandSelect)
    
    await waitFor(() => {
      const allenBradleyOption = screen.getByText('Allen-Bradley')
      fireEvent.click(allenBradleyOption)
    })
    
    // Category filter should reset to "todas"
    await waitFor(() => {
      expect(screen.getByDisplayValue('Categorías')).toBeInTheDocument()
    })
  })

  it('should show filtered equipos when both category and brand are selected', async () => {
    render(<CotizacionEquipoMultiAddModal {...defaultProps} />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Variador Allen-Bradley PowerFlex')).toBeInTheDocument()
    })
    
    // Select Drives category
    const categorySelect = screen.getByDisplayValue('Categorías')
    fireEvent.click(categorySelect)
    
    await waitFor(() => {
      const drivesOption = screen.getByText('Drives')
      fireEvent.click(drivesOption)
    })
    
    // Select Allen-Bradley brand
    const brandSelect = screen.getByDisplayValue('Marcas')
    fireEvent.click(brandSelect)
    
    await waitFor(() => {
      const allenBradleyOption = screen.getByText('Allen-Bradley')
      fireEvent.click(allenBradleyOption)
    })
    
    // Should only show Allen-Bradley drives
    await waitFor(() => {
      expect(screen.getByText('Variador Allen-Bradley PowerFlex')).toBeInTheDocument()
      expect(screen.queryByText('Variador Siemens SINAMICS')).not.toBeInTheDocument()
      expect(screen.queryByText('Sensor Allen-Bradley PhotoEye')).not.toBeInTheDocument()
      expect(screen.queryByText('Actuador Schneider Electric')).not.toBeInTheDocument()
    })
  })
})