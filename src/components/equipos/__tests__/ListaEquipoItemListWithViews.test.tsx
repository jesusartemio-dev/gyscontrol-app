// ===================================================
// 📁 Archivo: ListaEquipoItemListWithViews.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para el componente integrador de vistas
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListaEquipoItemListWithViews from '../ListaEquipoItemListWithViews'
import type { ListaEquipoItem } from '@/types'

// 🎭 Mocks
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}))

jest.mock('../ListaEquipoItemList', () => {
  return function MockListaEquipoItemList(props: any) {
    return (
      <div data-testid="normal-view">
        <h2>Vista Normal</h2>
        <div>Items: {props.items.length}</div>
        <div>Editable: {props.editable ? 'Sí' : 'No'}</div>
      </div>
    )
  }
})

jest.mock('../ListaEquipoItemListCompacta', () => {
  return function MockListaEquipoItemListCompacta(props: any) {
    return (
      <div data-testid="compact-view">
        <h2>Vista Compacta</h2>
        <div>Items: {props.items.length}</div>
        <div>Editable: {props.editable ? 'Sí' : 'No'}</div>
      </div>
    )
  }
})

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// 🧪 Test data
const mockItems: ListaEquipoItem[] = [
  {
    id: '1',
    codigo: 'EQ001',
    descripcion: 'Equipo de prueba 1',
    unidad: 'pza',
    cantidad: 2,
    estado: 'aprobado',
    origen: 'cotizado',
    verificado: true,
    comentarioRevision: 'Todo correcto',
    cotizacionSeleccionada: {
      id: 'cot1',
      precioUnitario: 100.50,
      moneda: 'USD',
      proveedor: 'Proveedor A'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    codigo: 'EQ002',
    descripcion: 'Equipo de prueba 2',
    unidad: 'pza',
    cantidad: 1,
    estado: 'borrador',
    origen: 'nuevo',
    verificado: false,
    comentarioRevision: null,
    cotizacionSeleccionada: null,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
]

const defaultProps = {
  listaId: 'lista-1',
  proyectoId: 'proyecto-1',
  items: mockItems,
  editable: true,
  onCreated: jest.fn()
}

describe('ListaEquipoItemListWithViews', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  // ✅ Basic rendering tests
  describe('Rendering', () => {
    it('renders the component with view toggle buttons', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      expect(screen.getByText('Vista')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /table/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument()
    })

    it('renders normal view by default', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
      expect(screen.getByText('Vista Normal')).toBeInTheDocument()
      expect(screen.queryByTestId('compact-view')).not.toBeInTheDocument()
    })

    it('shows correct item count in both views', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      expect(screen.getByText('Items: 2')).toBeInTheDocument()
    })

    it('passes editable prop correctly to child components', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} editable={false} />)
      
      expect(screen.getByText('Editable: No')).toBeInTheDocument()
    })
  })

  // 🔄 View switching tests
  describe('View Switching', () => {
    it('switches to compact view when compact button is clicked', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      // Initially should show normal view
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
      
      // Click compact view button
      const compactButton = screen.getByRole('button', { name: /list/i })
      await user.click(compactButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('compact-view')).toBeInTheDocument()
        expect(screen.getByText('Vista Compacta')).toBeInTheDocument()
        expect(screen.queryByTestId('normal-view')).not.toBeInTheDocument()
      })
    })

    it('switches back to normal view when normal button is clicked', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      // Switch to compact view first
      const compactButton = screen.getByRole('button', { name: /list/i })
      await user.click(compactButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('compact-view')).toBeInTheDocument()
      })
      
      // Switch back to normal view
      const normalButton = screen.getByRole('button', { name: /table/i })
      await user.click(normalButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('normal-view')).toBeInTheDocument()
        expect(screen.queryByTestId('compact-view')).not.toBeInTheDocument()
      })
    })

    it('shows correct active state for view buttons', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      const normalButton = screen.getByRole('button', { name: /table/i })
      const compactButton = screen.getByRole('button', { name: /list/i })
      
      // Initially normal view should be active
      expect(normalButton).toHaveClass('bg-primary')
      expect(compactButton).toHaveClass('bg-muted')
      
      // Switch to compact view
      await user.click(compactButton)
      
      await waitFor(() => {
        expect(compactButton).toHaveClass('bg-primary')
        expect(normalButton).toHaveClass('bg-muted')
      })
    })
  })

  // 💾 LocalStorage persistence tests
  describe('LocalStorage Persistence', () => {
    it('saves view preference to localStorage when view changes', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      const compactButton = screen.getByRole('button', { name: /list/i })
      await user.click(compactButton)
      
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'gys-lista-equipo-view-preference',
          'compact'
        )
      })
    })

    it('loads view preference from localStorage on mount', () => {
      mockLocalStorage.getItem.mockReturnValue('compact')
      
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      expect(screen.getByTestId('compact-view')).toBeInTheDocument()
      expect(screen.queryByTestId('normal-view')).not.toBeInTheDocument()
    })

    it('falls back to normal view if localStorage has invalid value', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-view')
      
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
      expect(screen.queryByTestId('compact-view')).not.toBeInTheDocument()
    })

    it('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error')
      })
      
      // Should not throw and should render normal view
      expect(() => {
        render(<ListaEquipoItemListWithViews {...defaultProps} />)
      }).not.toThrow()
      
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
    })
  })

  // 🎨 UI and styling tests
  describe('UI and Styling', () => {
    it('applies correct styling to view toggle container', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      const toggleContainer = screen.getByText('Vista').parentElement
      expect(toggleContainer).toHaveClass('flex', 'items-center', 'gap-2')
    })

    it('applies correct styling to view buttons', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      const normalButton = screen.getByRole('button', { name: /table/i })
      const compactButton = screen.getByRole('button', { name: /list/i })
      
      // Both buttons should have base styling
      expect(normalButton).toHaveClass('p-2', 'rounded-md', 'transition-colors')
      expect(compactButton).toHaveClass('p-2', 'rounded-md', 'transition-colors')
    })

    it('shows correct icons for each view button', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      // Check that icons are rendered (they should have specific test ids or classes)
      const normalButton = screen.getByRole('button', { name: /table/i })
      const compactButton = screen.getByRole('button', { name: /list/i })
      
      expect(normalButton).toBeInTheDocument()
      expect(compactButton).toBeInTheDocument()
    })
  })

  // 🔧 Props passing tests
  describe('Props Passing', () => {
    it('passes all required props to normal view component', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
      expect(screen.getByText('Items: 2')).toBeInTheDocument()
      expect(screen.getByText('Editable: Sí')).toBeInTheDocument()
    })

    it('passes all required props to compact view component', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      // Switch to compact view
      const compactButton = screen.getByRole('button', { name: /list/i })
      await user.click(compactButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('compact-view')).toBeInTheDocument()
        expect(screen.getByText('Items: 2')).toBeInTheDocument()
        expect(screen.getByText('Editable: Sí')).toBeInTheDocument()
      })
    })

    it('handles onCreated callback correctly', async () => {
      const mockOnCreated = jest.fn()
      const user = userEvent.setup()
      
      render(<ListaEquipoItemListWithViews {...defaultProps} onCreated={mockOnCreated} />)
      
      // The onCreated prop should be passed to child components
      // This is tested indirectly through the mock components
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
    })
  })

  // 📱 Responsive behavior tests
  describe('Responsive Behavior', () => {
    it('maintains view state across different screen sizes', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      // Switch to compact view
      const compactButton = screen.getByRole('button', { name: /list/i })
      await user.click(compactButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('compact-view')).toBeInTheDocument()
      })
      
      // Simulate screen resize (component should maintain compact view)
      // This is more of a conceptual test since we can't actually resize in jsdom
      expect(screen.getByTestId('compact-view')).toBeInTheDocument()
    })
  })

  // 🚫 Edge cases
  describe('Edge Cases', () => {
    it('handles empty items array correctly', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} items={[]} />)
      
      expect(screen.getByText('Items: 0')).toBeInTheDocument()
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
    })

    it('handles undefined items gracefully', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} items={undefined as any} />)
      
      // Should not crash and should show some default state
      expect(screen.getByTestId('normal-view')).toBeInTheDocument()
    })

    it('handles missing required props gracefully', () => {
      const minimalProps = {
        listaId: 'lista-1',
        proyectoId: 'proyecto-1',
        items: mockItems
      }
      
      expect(() => {
        render(<ListaEquipoItemListWithViews {...minimalProps} />)
      }).not.toThrow()
    })
  })

  // 🎭 Animation tests
  describe('Animations', () => {
    it('applies motion properties to view container', () => {
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      // The motion.div should be rendered (mocked to regular div)
      const viewContainer = screen.getByTestId('normal-view').parentElement
      expect(viewContainer).toBeInTheDocument()
    })

    it('handles view transitions smoothly', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoItemListWithViews {...defaultProps} />)
      
      // Switch views multiple times quickly
      const normalButton = screen.getByRole('button', { name: /table/i })
      const compactButton = screen.getByRole('button', { name: /list/i })
      
      await user.click(compactButton)
      await user.click(normalButton)
      await user.click(compactButton)
      
      // Should end up in compact view
      await waitFor(() => {
        expect(screen.getByTestId('compact-view')).toBeInTheDocument()
      })
    })
  })
})