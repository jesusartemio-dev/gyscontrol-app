/**
 * ✅ Tests para PlantillaServicioItemsModal
 * 
 * Pruebas unitarias para el modal de selección de items del catálogo de servicios
 * que permite agregar servicios filtrados por categoría a una plantilla.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import PlantillaServicioItemsModal from '@/components/plantillas/PlantillaServicioItemsModal'
import { getCatalogoServiciosByCategoriaId } from '@/lib/services/catalogoServicio'
import { getEdts } from '@/lib/services/edt'

// 🔧 Mocks
jest.mock('@/lib/services/catalogoServicio')
jest.mock('@/lib/services/edt')
jest.mock('@/lib/services/plantillaServicioItem')
jest.mock('@/lib/services/plantilla')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>
}))



jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader2-icon" />,
  Package: () => <div data-testid="package-icon" />
}))

const mockGetCatalogoServiciosByCategoriaId = getCatalogoServiciosByCategoriaId as jest.MockedFunction<typeof getCatalogoServiciosByCategoriaId>
const mockGetEdts = getEdts as jest.MockedFunction<typeof getEdts>

describe('PlantillaServicioItemsModal', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    plantillaId: 'plantilla-123',
    plantillaServicioId: 'plantilla-servicio-789',
    categoriaId: 'categoria-456',
    categoriaNombre: 'Servicios de Consultoría',
    onCreated: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetEdts.mockResolvedValue([
      {
        id: 'categoria-456',
        nombre: 'Servicios de Consultoría',
        descripcion: 'Categoría de servicios',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ])
    mockGetCatalogoServiciosByCategoriaId.mockResolvedValue([])
  })

  it('should render modal when open', () => {
    render(<PlantillaServicioItemsModal {...mockProps} />)
    
    expect(screen.getByText('Items desde Catálogo')).toBeInTheDocument()
    expect(screen.getByText('Servicios de Consultoría')).toBeInTheDocument()
    expect(screen.getByText('Cargando servicios...')).toBeInTheDocument()
  })

  it('should not render modal when closed', () => {
    render(<PlantillaServicioItemsModal {...mockProps} open={false} />)
    
    expect(screen.queryByText('Items desde Catálogo')).not.toBeInTheDocument()
  })

  it('should show empty state when no services available', async () => {
    render(<PlantillaServicioItemsModal {...mockProps} />)
    
    expect(await screen.findByText('No hay servicios disponibles')).toBeInTheDocument()
  })
})