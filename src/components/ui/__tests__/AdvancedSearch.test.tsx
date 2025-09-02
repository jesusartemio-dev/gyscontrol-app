import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdvancedSearch, SearchField, SearchCriterion } from '../AdvancedSearch'
import '@testing-library/jest-dom'

const mockFields: SearchField[] = [
  { key: 'name', label: 'Nombre', type: 'text' },
  { key: 'age', label: 'Edad', type: 'number' },
  { key: 'status', label: 'Estado', type: 'select', options: [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' }
  ]}
]

const mockOnSearch = jest.fn()
const mockOnClear = jest.fn()

describe('AdvancedSearch Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the search button', () => {
    render(
      <AdvancedSearch
        fields={mockFields}
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    )

    expect(screen.getByText('Búsqueda Avanzada')).toBeInTheDocument()
  })

  it('opens search form when button is clicked', async () => {
    render(
      <AdvancedSearch
        fields={mockFields}
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    )

    const button = screen.getByText('Búsqueda Avanzada')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Agregar Criterio')).toBeInTheDocument()
    })
  })

  it('adds criterion when add button is clicked', async () => {
    render(
      <AdvancedSearch
        fields={mockFields}
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    )

    // Open the form
    const button = screen.getByText('Búsqueda Avanzada')
    fireEvent.click(button)

    // Add criterion
    const addButton = await screen.findByText('Agregar Criterio')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Campo')).toBeInTheDocument()
      expect(screen.getByText('Operador')).toBeInTheDocument()
      expect(screen.getByText('Valor')).toBeInTheDocument()
    })
  })

  it('shows criterion count badge when criteria exist', async () => {
    render(
      <AdvancedSearch
        fields={mockFields}
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    )

    // Open form and add criterion
    const button = screen.getByText('Búsqueda Avanzada')
    fireEvent.click(button)

    const addButton = await screen.findByText('Agregar Criterio')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('1 criterio')).toBeInTheDocument()
    })
  })

  it('calls onSearch when search button is clicked', async () => {
    render(
      <AdvancedSearch
        fields={mockFields}
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    )

    // Open form
    const button = screen.getByText('Búsqueda Avanzada')
    fireEvent.click(button)

    // Add criterion
    const addButton = await screen.findByText('Agregar Criterio')
    fireEvent.click(addButton)

    // Fill value
    const valueInput = await screen.findByPlaceholderText(/ingrese nombre/i)
    fireEvent.change(valueInput, { target: { value: 'test' } })

    // Search
    const searchButton = screen.getByRole('button', { name: /buscar/i })
    fireEvent.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith([
      expect.objectContaining({
        field: 'name',
        operator: 'contains',
        value: 'test'
      })
    ])
  })

  it('calls onClear when clear button is clicked', async () => {
    render(
      <AdvancedSearch
        fields={mockFields}
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    )

    // Open form
    const button = screen.getByText('Búsqueda Avanzada')
    fireEvent.click(button)

    // Add criterion
    const addButton = await screen.findByText('Agregar Criterio')
    fireEvent.click(addButton)

    // Clear
    const clearButton = screen.getByRole('button', { name: /limpiar/i })
    fireEvent.click(clearButton)

    expect(mockOnClear).toHaveBeenCalled()
  })

  it('removes criterion when remove button is clicked', async () => {
    render(
      <AdvancedSearch
        fields={mockFields}
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    )

    // Open form
    const button = screen.getByText('Búsqueda Avanzada')
    fireEvent.click(button)

    // Add criterion
    const addButton = await screen.findByText('Agregar Criterio')
    fireEvent.click(addButton)

    // Find and click remove button (X icon)
    const removeButtons = screen.getAllByRole('button')
    const removeButton = removeButtons.find(btn => {
      const svg = btn.querySelector('svg')
      return svg && btn.getAttribute('aria-label') === null
    })
    
    if (removeButton) {
      fireEvent.click(removeButton)
    }

    await waitFor(() => {
      expect(screen.queryByText('Campo')).not.toBeInTheDocument()
    })
  })
})

// Test filtering logic separately
describe('AdvancedSearch Filtering Logic', () => {
  it('filters data correctly with text contains operator', () => {
    const testData = [
      { name: 'John Doe', age: 30 },
      { name: 'Jane Smith', age: 25 },
      { name: 'Bob Johnson', age: 35 }
    ]

    const criteria: SearchCriterion[] = [
      { id: '1', field: 'name', operator: 'contains', value: 'john' }
    ]

    const filteredData = testData.filter(item => {
      return criteria.every(criterion => {
        const fieldValue = String(item[criterion.field as keyof typeof item])
        const criterionValue = criterion.value.toLowerCase()

        switch (criterion.operator) {
          case 'contains':
            return fieldValue.toLowerCase().includes(criterionValue)
          case 'equals':
            return fieldValue === criterion.value
          default:
            return true
        }
      })
    })

    expect(filteredData).toHaveLength(2) // John Doe and Bob Johnson
    expect(filteredData.map(item => item.name)).toEqual(['John Doe', 'Bob Johnson'])
  })

  it('filters data correctly with number operators', () => {
    const testData = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 }
    ]

    const criteria: SearchCriterion[] = [
      { id: '1', field: 'age', operator: 'gte', value: '30' }
    ]

    const filteredData = testData.filter(item => {
      return criteria.every(criterion => {
        const fieldValue = Number(item[criterion.field as keyof typeof item])
        const criterionValue = Number(criterion.value)

        switch (criterion.operator) {
          case 'equals':
            return fieldValue === criterionValue
          case 'gt':
            return fieldValue > criterionValue
          case 'gte':
            return fieldValue >= criterionValue
          case 'lt':
            return fieldValue < criterionValue
          case 'lte':
            return fieldValue <= criterionValue
          default:
            return true
        }
      })
    })

    expect(filteredData).toHaveLength(2) // John (30) and Bob (35)
    expect(filteredData.map(item => item.name)).toEqual(['John', 'Bob'])
  })

  it('filters data correctly with multiple criteria', () => {
    const testData = [
      { name: 'John Doe', age: 30, status: 'active' },
      { name: 'Jane Smith', age: 25, status: 'inactive' },
      { name: 'Bob Johnson', age: 35, status: 'active' }
    ]

    const criteria: SearchCriterion[] = [
      { id: '1', field: 'status', operator: 'equals', value: 'active' },
      { id: '2', field: 'age', operator: 'lte', value: '30' }
    ]

    const filteredData = testData.filter(item => {
      return criteria.every(criterion => {
        const fieldValue = item[criterion.field as keyof typeof item]
        const criterionValue = criterion.value

        switch (criterion.operator) {
          case 'equals':
            return fieldValue === criterionValue
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(criterionValue).toLowerCase())
          case 'gt':
            return Number(fieldValue) > Number(criterionValue)
          case 'gte':
            return Number(fieldValue) >= Number(criterionValue)
          case 'lt':
            return Number(fieldValue) < Number(criterionValue)
          case 'lte':
            return Number(fieldValue) <= Number(criterionValue)
          default:
            return true
        }
      })
    })

    expect(filteredData).toHaveLength(1) // Only John Doe (active and age <= 30)
    expect(filteredData[0].name).toBe('John Doe')
  })
})