// ===================================================
// 📁 Archivo: ListaEquipoItemListCompacta.test.tsx
// 📌 Tests para ListaEquipoItemListCompacta
// 🧠 Uso: Validar funcionalidad de lista compacta de items
// ✍️ Autor: Jesús Artemio + IA GYS
// 🗕️ Fecha: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import ListaEquipoItemListCompacta from '../ListaEquipoItemListCompacta'
import { updateListaEquipoItem } from '@/lib/services/listaEquipoItem'
import type { ListaEquipoItem } from '@/types'

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/services/listaEquipoItem', () => ({
  updateListaEquipoItem: jest.fn(),
  deleteListaEquipoItem: jest.fn()
}))

jest.mock('@/lib/utils/costoCalculations', () => ({
  calcularCostoItem: jest.fn(),
  calcularCostoTotal: jest.fn(),
  formatCurrency: jest.fn()
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}))

// Mock data
const mockItems: ListaEquipoItem[] = [
  {
    id: '1',
    codigo: 'EQ001',
    descripcion: 'Equipo de prueba 1',
    unidad: 'pza',
    cantidad: 2,
    costoElegido: 500.00,
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
    costoElegido: null,
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

describe('ListaEquipoItemListCompacta', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders items correctly', () => {
    render(<ListaEquipoItemListCompacta {...defaultProps} />)
    
    expect(screen.getByText('EQ001')).toBeInTheDocument()
    expect(screen.getByText('EQ002')).toBeInTheDocument()
    expect(screen.getByText('Equipo de prueba 1')).toBeInTheDocument()
    expect(screen.getByText('Equipo de prueba 2')).toBeInTheDocument()
  })

  it('handles non-editable mode correctly', () => {
    render(<ListaEquipoItemListCompacta {...defaultProps} editable={false} />)
    
    // Should not show checkboxes or action buttons
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})