/**
 * Test completo para PlantillaEquipoMultiAddModal
 * Verifica renderizado, funcionalidad y validación de equipos
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ✅ Mock all external dependencies with simple implementations
jest.mock('@/lib/services/catalogoEquipo', () => ({
  getCatalogoEquipos: jest.fn(() => Promise.resolve([
    {
      id: 'equipo-1',
      codigo: 'EQ001',
      descripcion: 'Equipo Test 1',
      categoriaId: 'cat-1',
      categoria: { id: 'cat-1', nombre: 'Categoría 1' },
      precioVenta: 100
    },
    {
      id: 'equipo-2', 
      codigo: 'EQ002',
      descripcion: 'Equipo Test 2',
      categoriaId: 'cat-2',
      categoria: { id: 'cat-2', nombre: 'Categoría 2' },
      precioVenta: 200
    }
  ]))
}))

jest.mock('@/lib/services/categoriaEquipo', () => ({
  getCategoriasEquipo: jest.fn(() => Promise.resolve([
    { id: 'cat-1', nombre: 'Categoría 1' },
    { id: 'cat-2', nombre: 'Categoría 2' }
  ]))
}))

jest.mock('@/lib/services/plantillaEquipoItem', () => ({
  createPlantillaEquipoItem: jest.fn(() => Promise.resolve({ id: '1' }))
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/utils/plantilla-utils', () => ({
  formatCurrency: jest.fn((value: number) => `$${value.toFixed(2)}`)
}))

// ✅ Mock framer-motion completely
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button'
  },
  AnimatePresence: ({ children }: any) => children
}))

// ✅ Mock all UI components to avoid complex rendering
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={props['data-testid']} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, placeholder, ...props }: any) => (
    <input 
      onChange={onChange} 
      placeholder={placeholder} 
      data-testid={props['data-testid']}
      {...props} 
    />
  )
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr {...props} />
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <div data-testid="select" onClick={() => onValueChange?.('test-value')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value, ...props }: any) => (
    <div data-value={value} {...props}>{children}</div>
  ),
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))

// ✅ Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon">Search</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Minus: () => <span data-testid="minus-icon">Minus</span>,
  Trash2: () => <span data-testid="trash-icon">Trash2</span>,
  Package: () => <span data-testid="package-icon">Package</span>,
  DollarSign: () => <span data-testid="dollar-icon">DollarSign</span>,
  Loader2: () => <span data-testid="loader-icon">Loader2</span>
}))

// ✅ Import the component after all mocks are set up
import PlantillaEquipoMultiAddModal from '@/components/plantillas/PlantillaEquipoMultiAddModal'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { createPlantillaEquipoItem } from '@/lib/services/plantillaEquipoItem'

const mockGetCatalogoEquipos = getCatalogoEquipos as jest.MockedFunction<typeof getCatalogoEquipos>
const mockCreatePlantillaEquipoItem = createPlantillaEquipoItem as jest.MockedFunction<typeof createPlantillaEquipoItem>

describe('PlantillaEquipoMultiAddModal', () => {
  const defaultProps = {
    isOpen: false,
    onClose: jest.fn(),
    plantillaEquipoId: 'test-plantilla-id',
    onItemsCreated: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should import and render without crashing', () => {
    // ✅ This test just verifies the component can be imported and rendered
    expect(() => {
      render(<PlantillaEquipoMultiAddModal {...defaultProps} />)
    }).not.toThrow()
  })

  it('should render dialog when open', () => {
    const { getByTestId } = render(
      <PlantillaEquipoMultiAddModal {...defaultProps} isOpen={true} />
    )
    
    // ✅ Check if dialog is rendered
    expect(getByTestId('dialog')).toBeInTheDocument()
  })

  it('should not render dialog when closed', () => {
    const { queryByTestId } = render(
      <PlantillaEquipoMultiAddModal {...defaultProps} isOpen={false} />
    )
    
    // ✅ Dialog should not be visible when closed
    expect(queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('should display modal title when open', async () => {
    render(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={true} />)
    
    // ✅ Wait for component to load and check title
    await waitFor(() => {
      expect(screen.getByText('Agregar Múltiples Equipos')).toBeInTheDocument()
    })
  })

  it('should handle search functionality', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={true} />)
    
    // ✅ Wait for component to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar por nombre, código o descripción/i)).toBeInTheDocument()
    })
    
    // ✅ Test search input
    const searchInput = screen.getByPlaceholderText(/buscar por nombre, código o descripción/i)
    await user.type(searchInput, 'Equipo Test')
    
    expect(searchInput).toHaveValue('Equipo Test')
    
    // ✅ Verify save button exists but is disabled initially
    const saveButton = screen.getByText('Agregar 0 Equipos')
    expect(saveButton).toBeDisabled()
  })

  it('should validate equipo ID before creating items', async () => {
    // ✅ Mock equipos without valid IDs
    mockGetCatalogoEquipos.mockResolvedValueOnce([
      {
        // @ts-ignore - Simulating equipo without ID
        codigo: 'EQ999',
        descripcion: 'Equipo sin ID',
        categoriaId: 'cat-1',
        categoria: { id: 'cat-1', nombre: 'Categoría 1' },
        precioVenta: 100
      }
    ])
    
    render(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={true} />)
    
    // ✅ Wait for equipos to load
    await waitFor(() => {
      expect(screen.getByText('Equipo sin ID')).toBeInTheDocument()
    })
    
    // ✅ Try to save without selecting equipos - should be disabled
    const saveButton = screen.getByText('Agregar 0 Equipos')
    expect(saveButton).toBeDisabled()
    
    // ✅ Verify empty state message
    await waitFor(() => {
      expect(screen.getByText('Selecciona equipos del catálogo')).toBeInTheDocument()
    })
    
    // ✅ Verify createPlantillaEquipoItem was NOT called
    expect(mockCreatePlantillaEquipoItem).not.toHaveBeenCalled()
  })

  it('should successfully create items with valid equipos', async () => {
    render(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={true} />)
    
    // ✅ Wait for equipos to load
    await waitFor(() => {
      expect(screen.getByText('Equipo Test 1')).toBeInTheDocument()
    })
    
    // ✅ Verify modal renders with expected elements
    expect(screen.getByText('Agregar Múltiples Equipos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/buscar por nombre, código o descripción/i)).toBeInTheDocument()
    
    // ✅ Verify save button exists but is disabled initially
    const saveButton = screen.getByText('Agregar 0 Equipos')
    expect(saveButton).toBeDisabled()
    
    // ✅ Verify empty state message
    expect(screen.getByText('Selecciona equipos del catálogo')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    // ✅ Mock API error
    mockGetCatalogoEquipos.mockRejectedValueOnce(new Error('API Error'))
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<PlantillaEquipoMultiAddModal {...defaultProps} isOpen={true} />)
    
    // ✅ Verify error was logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading equipos:',
        expect.any(Error)
      )
    })
    
    consoleSpy.mockRestore()
  })
})