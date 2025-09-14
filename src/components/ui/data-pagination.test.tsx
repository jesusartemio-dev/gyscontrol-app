/**
 * 🧪 Tests para DataPagination Component
 * 
 * Tests del lado cliente usando React Testing Library
 * para el componente de paginación de datos.
 * 
 * @author Sistema GYS
 * @version 1.0.0
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataPagination, usePagination } from './data-pagination'
import type { PaginationMeta } from '@/types/payloads'

// 🎭 Mock de componentes UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('50')}>
        {children}
      </div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <div>Select Value</div>
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

jest.mock('@/components/ui/pagination', () => ({
  Pagination: ({ children, className }: any) => (
    <nav className={className}>{children}</nav>
  ),
  PaginationContent: ({ children }: any) => <ul>{children}</ul>,
  PaginationItem: ({ children }: any) => <li>{children}</li>,
  PaginationLink: ({ children, onClick, isActive, ...props }: any) => (
    <button 
      onClick={onClick} 
      data-active={isActive}
      {...props}
    >
      {children}
    </button>
  ),
  PaginationNext: ({ onClick, className }: any) => (
    <button onClick={onClick} className={className}>Next</button>
  ),
  PaginationPrevious: ({ onClick, className }: any) => (
    <button onClick={onClick} className={className}>Previous</button>
  ),
  PaginationEllipsis: () => <span>...</span>
}))

jest.mock('lucide-react', () => ({
  ChevronLeft: () => <span>←</span>,
  ChevronRight: () => <span>→</span>,
  ChevronsLeft: () => <span>⇤</span>,
  ChevronsRight: () => <span>⇥</span>
}))

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

describe('DataPagination Component', () => {
  // 📊 Datos de prueba
  const mockPagination: PaginationMeta = {
    page: 2,
    limit: 25,
    total: 100,
    totalPages: 4,
    hasNext: true,
    hasPrev: true
  }

  const mockOnPageChange = jest.fn()
  const mockOnLimitChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Renderizado básico', () => {
    it('debe renderizar correctamente con props mínimas', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />
      )

      // ✅ Verificar información de registros
      expect(screen.getByText(/Mostrando/)).toBeInTheDocument()
      expect(screen.getByText(/26/)).toBeInTheDocument() // startItem
      expect(screen.getByText(/50/)).toBeInTheDocument() // endItem
      expect(screen.getByText(/100/)).toBeInTheDocument() // total
    })

    it('debe mostrar navegación de páginas', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />
      )

      // ✅ Verificar botones de navegación
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('⇤')).toBeInTheDocument() // Primera página
      expect(screen.getByText('⇥')).toBeInTheDocument() // Última página
    })

    it('no debe renderizar si totalPages <= 1', () => {
      const singlePagePagination: PaginationMeta = {
        ...mockPagination,
        totalPages: 1,
        hasNext: false
      }

      const { container } = render(
        <DataPagination
          pagination={singlePagePagination}
          onPageChange={mockOnPageChange}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Navegación por páginas', () => {
    it('debe llamar onPageChange al hacer clic en página específica', async () => {
      const user = userEvent.setup()
      
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />
      )

      // 🔄 Buscar y hacer clic en página 3
      const page3Button = screen.getByRole('button', { name: /Ir a página 3/i })
      await user.click(page3Button)

      expect(mockOnPageChange).toHaveBeenCalledWith(3)
    })

    it('debe navegar a página anterior', async () => {
      const user = userEvent.setup()
      
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />
      )

      const prevButton = screen.getByText('Previous')
      await user.click(prevButton)

      expect(mockOnPageChange).toHaveBeenCalledWith(1)
    })

    it('debe navegar a página siguiente', async () => {
      const user = userEvent.setup()
      
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />
      )

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(mockOnPageChange).toHaveBeenCalledWith(3)
    })

    it('debe deshabilitar navegación cuando no hay páginas previas/siguientes', () => {
      const firstPagePagination: PaginationMeta = {
        ...mockPagination,
        page: 1,
        hasPrev: false
      }

      render(
        <DataPagination
          pagination={firstPagePagination}
          onPageChange={mockOnPageChange}
        />
      )

      // ✅ Verificar que los botones estén deshabilitados
      const prevButton = screen.getByText('Previous')
      const firstPageButton = screen.getByText('⇤')
      
      expect(prevButton.closest('button')).toHaveClass('pointer-events-none')
      expect(firstPageButton).toBeDisabled()
    })
  })

  describe('Selector de límite', () => {
    it('debe mostrar selector de límite cuando showLimitSelector es true', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
          onLimitChange={mockOnLimitChange}
          showLimitSelector={true}
        />
      )

      expect(screen.getByText('Mostrar:')).toBeInTheDocument()
      expect(screen.getByTestId('select')).toBeInTheDocument()
    })

    it('debe llamar onLimitChange al cambiar límite', async () => {
      const user = userEvent.setup()
      
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
          onLimitChange={mockOnLimitChange}
          showLimitSelector={true}
        />
      )

      const select = screen.getByTestId('select')
      await user.click(select)

      expect(mockOnLimitChange).toHaveBeenCalledWith(50)
    })

    it('no debe mostrar selector cuando showLimitSelector es false', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
          showLimitSelector={false}
        />
      )

      expect(screen.queryByText('Mostrar:')).not.toBeInTheDocument()
    })
  })

  describe('Salto a página específica', () => {
    it('debe mostrar input de salto cuando showPageJump es true y hay más de 10 páginas', () => {
      const manyPagesPagination: PaginationMeta = {
        ...mockPagination,
        totalPages: 15
      }

      render(
        <DataPagination
          pagination={manyPagesPagination}
          onPageChange={mockOnPageChange}
          showPageJump={true}
        />
      )

      expect(screen.getByText('Ir a página:')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('#')).toBeInTheDocument()
    })

    it('debe permitir saltar a página específica', async () => {
      const user = userEvent.setup()
      const manyPagesPagination: PaginationMeta = {
        ...mockPagination,
        totalPages: 15
      }

      render(
        <DataPagination
          pagination={manyPagesPagination}
          onPageChange={mockOnPageChange}
          showPageJump={true}
        />
      )

      const input = screen.getByPlaceholderText('#')
      const goButton = screen.getByText('Ir')

      await user.type(input, '7')
      await user.click(goButton)

      expect(mockOnPageChange).toHaveBeenCalledWith(7)
    })

    it('debe permitir saltar con tecla Enter', async () => {
      const user = userEvent.setup()
      const manyPagesPagination: PaginationMeta = {
        ...mockPagination,
        totalPages: 15
      }

      render(
        <DataPagination
          pagination={manyPagesPagination}
          onPageChange={mockOnPageChange}
          showPageJump={true}
        />
      )

      const input = screen.getByPlaceholderText('#')
      
      await user.type(input, '5')
      await user.keyboard('{Enter}')

      expect(mockOnPageChange).toHaveBeenCalledWith(5)
    })
  })

  describe('Información de registros', () => {
    it('debe mostrar información correcta de registros', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
          showItemsInfo={true}
        />
      )

      // ✅ Verificar cálculos correctos
      expect(screen.getByText('26')).toBeInTheDocument() // (2-1) * 25 + 1
      expect(screen.getByText('50')).toBeInTheDocument() // min(2 * 25, 100)
      expect(screen.getByText('100')).toBeInTheDocument() // total
    })

    it('debe usar itemsLabel personalizado', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
          itemsLabel="cotizaciones"
        />
      )

      expect(screen.getByText(/cotizaciones/)).toBeInTheDocument()
    })
  })

  describe('Accesibilidad', () => {
    it('debe tener etiquetas ARIA apropiadas', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />
      )

      // ✅ Verificar etiquetas ARIA
      expect(screen.getByLabelText('Primera página')).toBeInTheDocument()
      expect(screen.getByLabelText('Última página')).toBeInTheDocument()
    })

    it('debe marcar página actual correctamente', () => {
      render(
        <DataPagination
          pagination={mockPagination}
          onPageChange={mockOnPageChange}
        />
      )

      const currentPageButton = screen.getByRole('button', { name: /Ir a página 2/i })
      expect(currentPageButton).toHaveAttribute('data-active', 'true')
    })
  })
})

describe('usePagination Hook', () => {
  // 🎯 Componente de prueba para el hook
  const TestComponent: React.FC<{ initialPage?: number; initialLimit?: number }> = ({
    initialPage,
    initialLimit
  }) => {
    const {
      page,
      limit,
      handlePageChange,
      handleLimitChange,
      reset,
      getParams
    } = usePagination(initialPage, initialLimit)

    return (
      <div>
        <div data-testid="page">{page}</div>
        <div data-testid="limit">{limit}</div>
        <button onClick={() => handlePageChange(5)}>Change Page</button>
        <button onClick={() => handleLimitChange(50)}>Change Limit</button>
        <button onClick={reset}>Reset</button>
        <div data-testid="params">{JSON.stringify(getParams())}</div>
      </div>
    )
  }

  it('debe inicializar con valores por defecto', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('page')).toHaveTextContent('1')
    expect(screen.getByTestId('limit')).toHaveTextContent('25')
  })

  it('debe inicializar con valores personalizados', () => {
    render(<TestComponent initialPage={3} initialLimit={50} />)

    expect(screen.getByTestId('page')).toHaveTextContent('3')
    expect(screen.getByTestId('limit')).toHaveTextContent('50')
  })

  it('debe cambiar página correctamente', async () => {
    const user = userEvent.setup()
    render(<TestComponent />)

    await user.click(screen.getByText('Change Page'))

    expect(screen.getByTestId('page')).toHaveTextContent('5')
  })

  it('debe cambiar límite y resetear página', async () => {
    const user = userEvent.setup()
    render(<TestComponent initialPage={3} />)

    await user.click(screen.getByText('Change Limit'))

    expect(screen.getByTestId('limit')).toHaveTextContent('50')
    expect(screen.getByTestId('page')).toHaveTextContent('1') // Reset a página 1
  })

  it('debe resetear a página 1', async () => {
    const user = userEvent.setup()
    render(<TestComponent initialPage={5} />)

    await user.click(screen.getByText('Reset'))

    expect(screen.getByTestId('page')).toHaveTextContent('1')
  })

  it('debe generar parámetros correctos', () => {
    render(<TestComponent initialPage={2} initialLimit={50} />)

    const params = JSON.parse(screen.getByTestId('params').textContent || '{}')
    expect(params).toEqual({ page: 2, limit: 50 })
  })
})