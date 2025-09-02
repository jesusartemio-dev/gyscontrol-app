import { render } from '@testing-library/react'
import ExportData from './ExportData'
import { PedidoEquipo } from '@/types'

describe('ExportData', () => {
  const mockData: PedidoEquipo[] = [
    {
      id: '1',
      proyectoId: 'proj-1',
      responsableId: 'user-1',
      codigo: 'PED-001',
      numeroSecuencia: 1,
      estado: 'enviado',
      fechaPedido: '2024-01-15T10:00:00.000Z',
      fechaNecesaria: '2024-02-15T10:00:00.000Z',
      items: [],
    } as PedidoEquipo,
  ]

  const mockFilters = {
    estado: 'enviado',
    responsableId: 'user-1',
  }

  it('renders without crashing', () => {
    const { container } = render(
      <ExportData data={mockData} filters={mockFilters} />
    )
    
    expect(container).toBeInTheDocument()
  })

  it('renders with empty data', () => {
    const { container } = render(
      <ExportData data={[]} filters={mockFilters} />
    )
    
    expect(container).toBeInTheDocument()
  })

  it('renders with className prop', () => {
    const { container } = render(
      <ExportData data={mockData} filters={mockFilters} className="test-class" />
    )
    
    expect(container.firstChild).toHaveClass('test-class')
  })
})