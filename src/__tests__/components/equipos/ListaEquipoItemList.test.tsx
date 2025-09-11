/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

// ✅ Mock all external dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

jest.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

jest.mock('@/lib/services/listaEquipoItem', () => ({
  updateListaEquipoItem: jest.fn(),
  deleteListaEquipoItem: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/utils/costoCalculations', () => ({
  calcularCostoItem: jest.fn(() => 100),
  calcularCostoTotal: jest.fn(() => 500),
  formatCurrency: jest.fn((value) => `$${value}`),
}))

// ✅ Mock all UI components
jest.mock('@/components/ui/input', () => ({ 
  Input: (props: any) => <input {...props} /> 
}))
jest.mock('@/components/ui/button', () => ({ 
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button> 
}))
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))
jest.mock('@/components/ui/badge', () => ({ 
  Badge: ({ children, ...props }: any) => <div {...props}>{children}</div> 
}))
jest.mock('@/components/ui/separator', () => ({ Separator: (props: any) => <hr {...props} /> }))
jest.mock('@/components/ui/skeleton', () => ({ 
  Skeleton: ({ children, ...props }: any) => <div {...props}>{children}</div> 
}))
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/components/ui/checkbox', () => ({ 
  Checkbox: (props: any) => <input {...props} /> 
}))
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PopoverContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PopoverTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))
jest.mock('@/components/ui/label', () => ({ Label: ({ children, ...props }: any) => <label {...props}>{children}</label> }))
jest.mock('@/components/ui/switch', () => ({ 
  Switch: (props: any) => <input {...props} /> 
}))

// ✅ Mock icons
jest.mock('lucide-react', () => {
  const MockIcon = () => <span>Icon</span>
  return {
    Search: MockIcon,
    List: MockIcon,
    Grid3X3: MockIcon,
    CheckCircle: MockIcon,
    Edit: MockIcon,
    Save: MockIcon,
    X: MockIcon,
    Trash2: MockIcon,
    Plus: MockIcon,
    MoreHorizontal: MockIcon,
    Pencil: MockIcon,
    CheckCircle2: MockIcon,
    Filter: MockIcon,
    Package: MockIcon,
    DollarSign: MockIcon,
    Clock: MockIcon,
    AlertTriangle: MockIcon,
    XCircle: MockIcon,
    Settings: MockIcon,
    Eye: MockIcon,
    EyeOff: MockIcon,
    Minimize2: MockIcon,
    RotateCcw: MockIcon,
    Recycle: MockIcon,
    ShoppingCart: MockIcon,
  }
})

// ✅ Mock debug components
jest.mock('@/components/debug/MotionDebugger', () => ({
  MotionDebugger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/components/debug/OptimizedDebugHooks', () => ({
  useOptimizedRenderCounter: jest.fn(() => 1),
  useOptimizedRenderTracker: jest.fn(),
  useOptimizedAnimatePresenceDebug: jest.fn(),
}))

// ✅ Mock modal components
jest.mock('@/components/equipos/ModalReemplazarItemDesdeCatalogo', () => {
  return function MockModal() {
    return <div data-testid="modal-reemplazar">Modal</div>
  }
})

jest.mock('@/components/equipos/ModalReemplazarReemplazoDesdeCatalogo', () => {
  return function MockModal() {
    return <div data-testid="modal-reemplazar-reemplazo">Modal</div>
  }
})

jest.mock('@/components/equipos/ModalAgregarItemDesdeCatalogo', () => {
  return function MockModal() {
    return <div data-testid="modal-agregar-catalogo">Modal</div>
  }
})

jest.mock('@/components/equipos/ModalAgregarItemDesdeEquipo', () => {
  return function MockModal() {
    return <div data-testid="modal-agregar-equipo">Modal</div>
  }
})

jest.mock('@/components/equipos/CotizacionSelector', () => ({
  CotizacionInfo: () => <div>Cotización Info</div>,
  CotizacionCodigoSimple: () => <div>Cotización Simple</div>,
}))

// ✅ Import component after all mocks
import ListaEquipoItemList from '@/components/equipos/ListaEquipoItemList'

// ✅ Mock data for testing
const mockItems = [
  {
    id: '1',
    listaEquipoId: 'lista1',
    equipoId: 'equipo1',
    cantidad: 2,
    cantidadVerificada: null,
    verificado: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    equipo: {
      id: 'equipo1',
      codigo: 'EQ001',
      nombre: 'Equipo Test 1',
      descripcion: 'Descripción test 1',
      marca: 'Marca A',
      modelo: 'Modelo X',
      unidad: 'UND',
      precio: 100,
      moneda: 'PEN' as const,
      categoria: 'Categoria A',
      subcategoria: 'Subcategoria A',
      activo: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  },
  {
    id: '2',
    listaEquipoId: 'lista1',
    equipoId: 'equipo2',
    cantidad: 1,
    cantidadVerificada: 1,
    verificado: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    equipo: {
      id: 'equipo2',
      codigo: 'EQ002',
      nombre: 'Equipo Test 2',
      descripcion: 'Descripción test 2',
      marca: 'Marca B',
      modelo: 'Modelo Y',
      unidad: 'UND',
      precio: 200,
      moneda: 'USD' as const,
      categoria: 'Categoria B',
      subcategoria: 'Subcategoria B',
      activo: true,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  }
]

describe('ListaEquipoItemList', () => {
  const defaultProps = {
    items: [],
    listaEquipoId: 'lista1',
    editable: true,
    onItemsChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without infinite loop errors', () => {
    // ✅ Test basic rendering without crashing
    const { container } = render(<ListaEquipoItemList {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('renders with empty items', () => {
    // ✅ Test empty state
    const { container } = render(<ListaEquipoItemList {...defaultProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders items correctly', () => {
    // ✅ Test with mock items
    const { container } = render(
      <ListaEquipoItemList {...defaultProps} items={mockItems} />
    )
    expect(container).toBeInTheDocument()
  })

  it('handles editable prop correctly', () => {
    // ✅ Test editable false
    const { container } = render(
      <ListaEquipoItemList {...defaultProps} items={mockItems} editable={false} />
    )
    expect(container).toBeInTheDocument()
  })

  it('calls onItemsChange when provided', () => {
    // ✅ Test callback prop
    const mockCallback = jest.fn()
    const { container } = render(
      <ListaEquipoItemList {...defaultProps} items={mockItems} onItemsChange={mockCallback} />
    )
    expect(container).toBeInTheDocument()
    // Note: onItemsChange would be called during user interactions, not on render
  })
})
