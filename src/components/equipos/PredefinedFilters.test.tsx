import { render } from '@testing-library/react'
import PredefinedFilters from './PredefinedFilters'
import { defaultFilters } from './PedidoEquipoFilters'

describe('PredefinedFilters', () => {
  const mockOnApplyFilter = jest.fn()
  const mockCurrentFilters = { ...defaultFilters }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <PredefinedFilters 
        onApplyFilter={mockOnApplyFilter}
        currentFilters={mockCurrentFilters}
      />
    )
    
    expect(container).toBeInTheDocument()
  })

  it('renders with required props', () => {
    const { container } = render(
      <PredefinedFilters 
        onApplyFilter={mockOnApplyFilter}
        currentFilters={mockCurrentFilters}
      />
    )
    
    expect(container).toBeInTheDocument()
  })

  it('renders with additional props', () => {
    const { container } = render(
      <PredefinedFilters 
        onApplyFilter={mockOnApplyFilter}
        currentFilters={mockCurrentFilters}
        className="test-class" 
      />
    )
    
    expect(container).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('flex')
  })
})
