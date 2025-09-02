// ===================================================
// 🧪 ModalAgregarItemDesdeEquipo.test.tsx
// 📝 Tests: Modal para agregar equipos técnicos a lista
// ✨ UX/UI: Tests para diseño moderno y animaciones
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import ModalAgregarItemDesdeEquipo from '../ModalAgregarItemDesdeEquipo'
import { getProyectoEquipoItemsDisponibles } from '@/lib/services/proyectoEquipoItem'
import { createListaEquipoItemFromProyecto } from '@/lib/services/listaEquipoItem'
import { ProyectoEquipoItem } from '@/types'

// 🎭 Mocks
jest.mock('sonner', () => ({
  toast: {
    warning: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn()
  }
}))

jest.mock('@/lib/services/proyectoEquipoItem', () => ({
  getProyectoEquipoItemsDisponibles: jest.fn(),
  updateProyectoEquipoItem: jest.fn()
}))

jest.mock('@/lib/services/listaEquipoItem', () => ({
  createListaEquipoItemFromProyecto: jest.fn()
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

// 📊 Mock Data
const mockItems: ProyectoEquipoItem[] = [
  {
    id: '1',
    codigo: 'EQ001',
    descripcion: 'Bomba centrífuga 10HP',
    unidad: 'UND',
    cantidad: 5,
    proyectoEquipo: {
      id: 'pe1',
      nombre: 'Sistema de Bombeo',
      proyectoId: 'proj1'
    },
    listaEquipos: []
  },
  {
    id: '2',
    codigo: 'EQ002',
    descripcion: 'Motor eléctrico 15HP',
    unidad: 'UND',
    cantidad: 3,
    proyectoEquipo: {
      id: 'pe2',
      nombre: 'Sistema Eléctrico',
      proyectoId: 'proj1'
    },
    listaEquipos: [
      { id: 'le1', cantidad: 3 } // Ya completo
    ]
  },
  {
    id: '3',
    codigo: 'EQ003',
    descripcion: 'Válvula de control 4"',
    unidad: 'UND',
    cantidad: 8,
    proyectoEquipo: {
      id: 'pe1',
      nombre: 'Sistema de Bombeo',
      proyectoId: 'proj1'
    },
    listaEquipos: [
      { id: 'le2', cantidad: 2 } // Faltan 6
    ]
  }
]

const defaultProps = {
  proyectoId: 'proj1',
  listaId: 'lista1',
  onClose: jest.fn(),
  onCreated: jest.fn()
}

describe('ModalAgregarItemDesdeEquipo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getProyectoEquipoItemsDisponibles as jest.Mock).mockResolvedValue(mockItems)
  })

  // ✅ Renderizado básico
  it('should render modal with modern design', async () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    expect(screen.getByText('Agregar Equipos Técnicos')).toBeInTheDocument()
    expect(screen.getByText('Selecciona los equipos que deseas agregar a la lista técnica')).toBeInTheDocument()
    expect(screen.getByText('Filtros y Búsqueda')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Equipos Disponibles')).toBeInTheDocument()
    })
  })

  // 🔄 Estados de carga
  it('should show loading state initially', () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    // Skeleton loaders should be visible
    const skeletons = screen.getAllByTestId(/skeleton/i)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // 📊 Carga de datos
  it('should load and display equipment items', async () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
      expect(screen.getByText('Bomba centrífuga 10HP')).toBeInTheDocument()
      expect(screen.getByText('EQ003')).toBeInTheDocument()
    })
    
    expect(getProyectoEquipoItemsDisponibles).toHaveBeenCalledWith('proj1')
  })

  // 🏷️ Badges de estado
  it('should show correct status badges', async () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      // Item completo
      expect(screen.getByText('Completo')).toBeInTheDocument()
      
      // Items con cantidades faltantes
      expect(screen.getByText('Faltan 6')).toBeInTheDocument()
    })
  })

  // 🔍 Funcionalidad de búsqueda
  it('should filter items by search term', async () => {
    const user = userEvent.setup()
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Buscar por código o descripción...')
    await user.type(searchInput, 'bomba')
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
      expect(screen.queryByText('EQ002')).not.toBeInTheDocument()
    })
  })

  // 🏷️ Filtro por grupo
  it('should filter items by equipment group', async () => {
    const user = userEvent.setup()
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    // Open select dropdown
    const selectTrigger = screen.getByRole('combobox')
    await user.click(selectTrigger)
    
    // Select specific group
    const groupOption = screen.getByText('Sistema Eléctrico')
    await user.click(groupOption)
    
    await waitFor(() => {
      expect(screen.getByText('EQ002')).toBeInTheDocument()
      expect(screen.queryByText('EQ001')).not.toBeInTheDocument()
    })
  })

  // ✅ Selección de items
  it('should allow selecting and deselecting items', async () => {
    const user = userEvent.setup()
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    const checkboxes = screen.getAllByRole('checkbox')
    const firstCheckbox = checkboxes[0]
    
    // Select item
    await user.click(firstCheckbox)
    expect(firstCheckbox).toBeChecked()
    
    // Should show selection count
    expect(screen.getByText('1 equipo seleccionado')).toBeInTheDocument()
    
    // Deselect item
    await user.click(firstCheckbox)
    expect(firstCheckbox).not.toBeChecked()
  })

  // 🚫 Items deshabilitados
  it('should disable completed items', async () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ002')).toBeInTheDocument()
    })
    
    const checkboxes = screen.getAllByRole('checkbox')
    const completedItemCheckbox = checkboxes.find(cb => 
      cb.closest('tr')?.textContent?.includes('EQ002')
    )
    
    expect(completedItemCheckbox).toBeDisabled()
  })

  // 📭 Estado vacío
  it('should show empty state when no items match filters', async () => {
    const user = userEvent.setup()
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Buscar por código o descripción...')
    await user.type(searchInput, 'nonexistent')
    
    await waitFor(() => {
      expect(screen.getByText('No se encontraron equipos')).toBeInTheDocument()
      expect(screen.getByText('Intenta ajustar los filtros de búsqueda')).toBeInTheDocument()
    })
  })

  // 🧹 Limpiar filtros
  it('should clear filters when clicking clear button', async () => {
    const user = userEvent.setup()
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Buscar por código o descripción...')
    await user.type(searchInput, 'nonexistent')
    
    await waitFor(() => {
      expect(screen.getByText('No se encontraron equipos')).toBeInTheDocument()
    })
    
    const clearButton = screen.getByText('Limpiar filtros')
    await user.click(clearButton)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
      expect(searchInput).toHaveValue('')
    })
  })

  // ⚠️ Validación sin selección
  it('should show warning when trying to add without selection', async () => {
    const user = userEvent.setup()
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Agregar')).toBeInTheDocument()
    })
    
    const addButton = screen.getByRole('button', { name: /agregar/i })
    await user.click(addButton)
    
    expect(toast.warning).toHaveBeenCalledWith(
      'Debes seleccionar al menos un ítem',
      { description: 'Marca los equipos que deseas agregar a la lista' }
    )
  })

  // ✅ Agregar items exitosamente
  it('should add selected items successfully', async () => {
    const user = userEvent.setup()
    ;(createListaEquipoItemFromProyecto as jest.Mock).mockResolvedValue({})
    
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    // Select first item (available)
    const checkboxes = screen.getAllByRole('checkbox')
    const availableCheckbox = checkboxes.find(cb => 
      !cb.hasAttribute('disabled') && cb.closest('tr')?.textContent?.includes('EQ001')
    )
    
    if (availableCheckbox) {
      await user.click(availableCheckbox)
    }
    
    const addButton = screen.getByRole('button', { name: /agregar \(1\)/i })
    await user.click(addButton)
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        '✅ 1 equipos agregados exitosamente',
        {
          id: 'adding-items',
          description: 'Los equipos han sido añadidos a la lista técnica'
        }
      )
      expect(defaultProps.onCreated).toHaveBeenCalled()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  // ❌ Error al agregar items
  it('should handle error when adding items', async () => {
    const user = userEvent.setup()
    ;(createListaEquipoItemFromProyecto as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    // Select first item
    const checkboxes = screen.getAllByRole('checkbox')
    const availableCheckbox = checkboxes.find(cb => 
      !cb.hasAttribute('disabled') && cb.closest('tr')?.textContent?.includes('EQ001')
    )
    
    if (availableCheckbox) {
      await user.click(availableCheckbox)
    }
    
    const addButton = screen.getByRole('button', { name: /agregar \(1\)/i })
    await user.click(addButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        '❌ Error al agregar los equipos seleccionados',
        {
          id: 'adding-items',
          description: 'Inténtalo nuevamente o contacta al administrador'
        }
      )
    })
  })

  // 🎯 Estadísticas rápidas
  it('should display quick statistics', async () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Total: 3 equipos')).toBeInTheDocument()
      expect(screen.getByText('Filtrados: 3 equipos')).toBeInTheDocument()
      expect(screen.getByText('Seleccionados: 0 equipos')).toBeInTheDocument()
    })
  })

  // 🎨 Responsive design
  it('should be responsive', async () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    const dialogContent = screen.getByRole('dialog')
    expect(dialogContent).toHaveClass('max-w-6xl')
    expect(dialogContent).toHaveClass('max-h-[90vh]')
  })

  // ♿ Accesibilidad
  it('should be accessible', async () => {
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    // Dialog should have proper ARIA attributes
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    
    // Buttons should be properly labeled
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
    
    // Table should have proper structure
    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)
    })
  })

  // 🔄 Loading states en botones
  it('should show loading state in buttons', async () => {
    const user = userEvent.setup()
    ;(createListaEquipoItemFromProyecto as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('EQ001')).toBeInTheDocument()
    })
    
    // Select item
    const checkboxes = screen.getAllByRole('checkbox')
    const availableCheckbox = checkboxes.find(cb => 
      !cb.hasAttribute('disabled') && cb.closest('tr')?.textContent?.includes('EQ001')
    )
    
    if (availableCheckbox) {
      await user.click(availableCheckbox)
    }
    
    const addButton = screen.getByRole('button', { name: /agregar \(1\)/i })
    await user.click(addButton)
    
    // Should show loading state
    expect(screen.getByText('Agregando...')).toBeInTheDocument()
    expect(addButton).toBeDisabled()
  })

  // 🎭 Error en carga inicial
  it('should handle error when loading items', async () => {
    ;(getProyectoEquipoItemsDisponibles as jest.Mock).mockRejectedValue(new Error('Load Error'))
    
    render(<ModalAgregarItemDesdeEquipo {...defaultProps} />)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al cargar los equipos disponibles')
    })
  })
})